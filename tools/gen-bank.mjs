// Asks Claude to write new Brain puzzles, checks every one with the game's own engine,
// and adds the ones that pass to the question database (src/bank.json).
//
//   node tools/gen-bank.mjs                    20 puzzles just above the current top level
//   node tools/gen-bank.mjs --count 30 --levels 6-12
//   node tools/gen-bank.mjs --fixture f.json   use saved model output instead of calling the API
//   node tools/gen-bank.mjs --dry              show what would be added, change nothing
//
// Needs OPENROUTER_API_KEY (a GitHub secret in the scheduled workflow). Nothing here runs in the
// kids' game: the game only reads the database file, which works offline.
import Anthropic from '@anthropic-ai/sdk';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SH = require(path.join(root, 'src/engine.js'));
const BR = require(path.join(root, 'src/brain.js'));
const BANK = path.join(root, 'src/bank.json');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i < 0 ? dflt : argv[i + 1]; };
const flag = name => argv.includes('--' + name);
const MODEL = opt('model', 'anthropic/claude-opus-5.5');
const COUNT = Math.max(1, Math.min(40, parseInt(opt('count', '20'), 10) || 20));
const FIXTURE = opt('fixture', null);
const DRY = flag('dry');
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

const db = JSON.parse(fs.readFileSync(BANK, 'utf8'));
BR.useDatabase(db);
const top = BR.maxLevel();
let [LO, HI] = (opt('levels', '') || `${Math.max(1, top - 2)}-${Math.min(15, top + 2)}`).split('-').map(Number);
if (!(LO >= 1 && HI <= 15 && LO <= HI)) { console.error('--levels must look like 8-13, between 1 and 15.'); process.exit(1); }

/* ---------------------------------------------------------------- schema */
const S = { type: 'string' }, I = { type: 'integer' };
const orNull = t => ({ anyOf: [t, { type: 'null' }] });
const obj = (props) => ({ type: 'object', additionalProperties: false, required: Object.keys(props), properties: props });
const ITEM = obj({
  lvl: I, skill: S, q: S,
  params: { type: 'array', items: obj({ name: S, values: { type: 'array', items: I } }) },
  space: { type: 'array', items: obj({
    name: S, n: I, kind: { type: 'string', enum: ['die', 'coin', 'faces', 'bag'] }, sides: orNull(I),
    faces: orNull({ type: 'array', items: S }),
    bag: orNull({ type: 'array', items: obj({ color: S, count: I }) }),
  }) },
  ask: obj({
    type: { type: 'string', enum: ['count', 'total', 'chance', 'given', 'compare', 'expect', 'value', 'best', 'deal'] },
    event: orNull(S), given: orNull(S), a: orNull(S), b: orNull(S), labels: orNull({ type: 'array', items: S }),
    trials: { anyOf: [I, S, { type: 'null' }] }, simplify: { type: 'boolean' },
    moves: orNull({ type: 'array', items: obj({ label: S, dmg: S }) }), metric: orNull({ type: 'string', enum: ['ev', 'finish'] }),
    hp: { anyOf: [I, S, { type: 'null' }] }, cost: { anyOf: [{ type: 'number' }, S, { type: 'null' }] }, win: orNull(S), expr: orNull(S),
  }),
  traps: { type: 'array', items: S }, why: S,
  checks: { type: 'array', items: obj({ params: { type: 'array', items: obj({ name: S, value: I }) }, answer: S }) },
});
const SCHEMA = obj({ items: { type: 'array', items: ITEM } });

/* ------------------------------------------------- database <-> model shape */
function toModel(it) {
  const a = it.ask, nul = v => (v === undefined ? null : v);
  return {
    lvl: it.lvl, skill: it.skill, q: it.q,
    params: Object.entries(it.params || {}).map(([name, values]) => ({ name, values })),
    space: it.space.map(g => ({ name: g.name, n: g.n, kind: g.kind, sides: nul(g.sides), faces: nul(g.faces), bag: nul(g.bag) })),
    ask: { type: a.type, event: nul(a.event), given: nul(a.given), a: nul(a.a), b: nul(a.b), labels: nul(a.labels), trials: nul(a.trials), simplify: !!a.simplify,
      moves: nul(a.moves), metric: nul(a.metric), hp: nul(a.hp), cost: nul(a.cost), win: nul(a.win), expr: nul(a.expr) },
    traps: it.traps || [], why: it.why,
    checks: (it.checks || []).map(c => ({ params: Object.entries(c.params || {}).map(([name, value]) => ({ name, value })), answer: c.answer })),
  };
}
function fromModel(x, id, src) {
  const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== false));
  const it = { id, lvl: x.lvl, skill: String(x.skill || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 24), q: String(x.q || '').trim() };
  if (Array.isArray(x.params) && x.params.length) it.params = Object.fromEntries(x.params.map(p => [p.name, p.values]));
  it.space = (x.space || []).map(clean);
  it.ask = clean(x.ask || {});
  if (Array.isArray(x.traps) && x.traps.length) it.traps = x.traps.slice(0, 3);
  it.why = String(x.why || '').trim();
  it.checks = (x.checks || []).map(c => ({ params: Object.fromEntries((c.params || []).map(p => [p.name, p.value])), answer: String(c.answer) }));
  it.src = src;
  return it;
}

/* ---------------------------------------------------------------- prompt */
const SYSTEM = `You write probability puzzles for Skyhop Heroes, a dice-battle adventure game for clever children aged 7 to 10.
Heroes: Bo the bear, Zip the fox, Luna the owl, Coco the parrot, Pip the penguin (he likes odd dice) and Mika the monkey (she cooks).
Players fight cartoon mobs by rolling dice, fly between real cities (London, Paris, Oslo, Rome, Cairo, Nairobi, Agra, Tokyo, Beijing, Sydney, New York, Rio) and win coins.

Every puzzle is written in a small puzzle language. A program then lists every equally likely outcome and works out the answer itself, so the maths is always exact. It also compares your "checks" with its own answer. If they differ, it decides the words and the maths disagree and throws the puzzle away, so state what you really expect.

SPACE: 1 to 4 groups. Each group has a name (letters and digits, like d, a, b, mob, you), n (1 to 4 items) and a kind:
- "die": sides is one of 2, 3, 4, 6, 8, 10, 12, 20. Faces are 1 to sides.
- "coin": faces "H" and "T".
- "faces": a custom die or a spinner with 2 to 12 equal faces, given as strings, for example ["red","red","blue"] or ["1","1","2","6"]. Strings that are whole numbers become numbers.
- "bag": marbles drawn one after another WITHOUT putting them back. bag lists {color, count}; n is how many are drawn. Not allowed with "count" or "total".
In expressions a group with n = 1 is one value; a group with n > 1 is a list. Unused fields are null.

EXPRESSIONS: numbers, 'text' in single quotes, setting names, group names; + - * / %; == != < <= > >=; and, or, not; brackets; condition ? x : y.
Functions: sum(list) max(list) min(list) count(list, x) has(list, x) same(list) distinct(list) at(list, i) (positions start at 1) heads(list) tails(list) even(x) odd(x) prime(x) abs(x).
A test must give true or false. Compare lists through a function: sum(d) == 7, not d == 7.

ASK (fields a type does not use are null; simplify is false unless stated):
- count: event. How many outcomes make the test true. Answer: a whole number like "6".
- total: How many outcomes there are.
- chance: event. Answer "a in b", where b is the number of outcomes. With simplify true it is in lowest terms; then the question must say "Give the simplest answer."
- given: given, event. The chance of event among only the outcomes where given is true: "a in b", with b the number of given outcomes.
- compare: a, b, labels [first, second, same]. Which test is true in more outcomes. The answer is one of the labels.
- expect: event, trials (a number or a setting name). About how many times in that many tries. trials × chance must be a whole number.
- value: expr. The average of a number over all outcomes. It must be whole or end in .25, .5 or .75.
- best: moves [{label, dmg}] (2 or 3 moves, dmg is an expression for damage), metric "ev" (biggest average damage) or "finish" (most likely to do at least hp damage), hp. A tie answers "Just the same".
- deal: cost (coins per go), win (expression for coins won). Answer "Good deal", "Bad deal" or "It is fair", comparing average winnings with the cost.

SETTINGS (params): optional lists of whole numbers, for example {name: "t", values: [5, 6, 8]}. One value is picked each time the puzzle appears. Use {t} in the text and t in expressions. At most 12 combinations of settings.
TEXT: q is the question, at most 240 characters. why explains the answer in one or two short sentences, at most 300 characters. Placeholders you may use in q and why: any setting, {answer}, {fav} (outcomes that pass), {total} (all outcomes), {given}, {a_fav} and {b_fav} (the two compare counts), {detail} (an automatic summary for best and deal) and {ev}.
TRAPS: up to 3 tempting wrong answers in the same format ("11", "1 in 6"), taken from real mistakes such as counting 6-6 twice, forgetting a marble is not put back, or adding chances that overlap.
CHECKS: one entry for every combination of settings (one entry with empty params if there are none), with the exact answer you expect.

STYLE: plain, friendly British English for a bright 7-year-old. Short sentences and everyday words. Explain any word a child might not know. Use the heroes, mobs, cities and coins. Cartoon bonks are fine; nothing scary, sad, rude or about real money, betting on real games, food allergies or real people alive today. Metric units only. Each puzzle should teach one idea and the why should leave the child able to solve the next one.`;

const LADDER = `Difficulty ladder (lvl):
1-2: one die or one coin; count faces that pass a simple test.
3-4: odd dice (4, 8, 12 sides), spinners, two coins, a first "a in b" chance.
5-6: two dice (the 36-square grid), simplest-form chances, expected counts, one marble from a bag, comparing two simple chances.
7-8: three or four coins, "at least one" by counting what does NOT happen, averages, multiplying, strategy by average damage.
9-10: three dice, two marbles without putting back, fair deals, "finish it this turn" strategy, given information, best-of-two-dice dodges.
11-12: famous surprises (Galileo's 9 against 10 with three dice, de Méré's four dice), dice that beat each other in a circle, tricky given information, comparing different experiments.
13-15: multi-step reasoning for very strong players: combining two experiments, expected value over several rounds, choosing the best plan when the obvious one is wrong. Keep the numbers countable.`;

function userPrompt() {
  const lv = {}, sk = {};
  db.items.forEach(it => { lv[it.lvl] = (lv[it.lvl] || 0) + 1; sk[it.skill] = (sk[it.skill] || 0) + 1; });
  const examples = db.items.filter((it, i) => ['s-given-first', 's-jab-or-smash', 's-bag-two-red', 's-galileo', 's-fair-two-dice'].includes(it.id) || i === 0).map(toModel);
  const levels = []; for (let l = LO; l <= HI; l++) levels.push(`${l} (has ${lv[l] || 0})`);
  return `${LADDER}

Write ${COUNT} NEW puzzles at levels ${LO} to ${HI}, with at least one at every level and more at the levels that have fewest puzzles: ${levels.join(', ')}.
Skills the database already has (tag: count): ${Object.entries(sk).sort((a, b) => a[1] - b[1]).map(([k, v]) => `${k}: ${v}`).join(', ')}. Favour new ideas and the rarer tags. Use short lowercase skill tags.

Do not repeat or lightly reword these existing questions:
${db.items.map(it => '- ' + it.q).join('\n')}

Five example puzzles in the exact output format:
${JSON.stringify(examples, null, 1)}`;
}

/* ------------------------------------------------------------- the model */
let client = null;
async function askClaude(system, user) {
  if (!OPENROUTER_KEY) throw new Error('No API key found. Set OPENROUTER_API_KEY, or in GitHub add it under Settings → Secrets and variables → Actions.');
  client ??= new Anthropic({
    apiKey: OPENROUTER_KEY,
    baseURL: 'https://openrouter.ai/api',
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/runarp/skyhop-heroes',
      'X-Title': 'Skyhop Heroes brain puzzles',
    },
  });
  // OpenRouter rejects this SCHEMA as a constrained-decoding grammar (too large). Ask for
  // JSON in the prompt instead; sift() + BR.verifyItem still drop anything that does not fit.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    output_config: { effort: 'high' },
    system: system + '\n\nRespond with one JSON object only, no markdown fences, matching this shape:\n' + JSON.stringify(SCHEMA),
    messages: [{ role: 'user', content: user }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('Claude declined this request (' + (msg.stop_details?.category || 'no category') + ').');
  if (msg.stop_reason === 'max_tokens') throw new Error('The answer was cut off. Ask for fewer puzzles with --count.');
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
  console.log(`  ${msg.model}: ${msg.usage.input_tokens} tokens in, ${msg.usage.output_tokens} out.`);
  const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = jsonText.indexOf('{'), end = jsonText.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Model reply was not JSON.');
  return JSON.parse(jsonText.slice(start, end + 1)).items || [];
}

/* ------------------------------------------------------------ check & add */
const day = new Date().toISOString().slice(0, 10);
const keyOf = it => String(it.q).toLowerCase().replace(/\d+/g, '#').replace(/[^a-z#]+/g, ' ').trim();
const specOf = it => JSON.stringify([it.space, it.ask]);
const knownText = new Set(db.items.map(keyOf)), knownSpec = new Set(db.items.map(specOf));
const ids = new Set(db.items.map(it => it.id));
let seq = 0;
function nextId() { let id; do { id = `g${day.replace(/-/g, '')}-${++seq}`; } while (ids.has(id)); ids.add(id); return id; }

function sift(raw, src) {
  const ok = [], bad = [];
  for (const x of raw) {
    const it = fromModel(x, nextId(), src);
    const errs = [];
    if (!(it.lvl >= LO && it.lvl <= HI)) errs.push(`level ${it.lvl} is outside ${LO}-${HI}`);
    if (!/\?\s*$/.test(it.q) && !/\?/.test(it.q)) errs.push('the question needs a question mark');
    if (knownText.has(keyOf(it))) errs.push('repeats an existing question');
    if (knownSpec.has(specOf(it))) errs.push('same dice and question as an existing puzzle');
    const r = BR.verifyItem(it);
    errs.push(...r.errors);
    if (errs.length) bad.push({ x, it, errs });
    else { ok.push(it); knownText.add(keyOf(it)); knownSpec.add(specOf(it)); }
  }
  return { ok, bad };
}

async function main() {
  console.log(`Database v${db.version}: ${db.items.length} puzzles, top level ${top}. Asking for ${COUNT} at levels ${LO}-${HI}${FIXTURE ? ' (from ' + FIXTURE + ')' : ' from ' + MODEL}.`);
  let raw;
  if (FIXTURE) raw = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).items;
  else raw = await askClaude(SYSTEM, userPrompt());
  let { ok, bad } = sift(raw, FIXTURE ? 'fixture' : MODEL);

  if (bad.length && !FIXTURE && !flag('no-repair')) {
    console.log(`  ${bad.length} failed the checks; asking Claude to fix them once.`);
    const fix = `${LADDER}\n\nThese puzzles failed the automatic checks. Fix each one, keeping its idea and level, or replace it with a different puzzle at the same level. The checker's notes are under each.\n\n` +
      bad.map((b, i) => `Puzzle ${i + 1}:\n${JSON.stringify(b.x)}\nProblems:\n- ${b.errs.slice(0, 5).join('\n- ')}`).join('\n\n');
    const again = sift(await askClaude(SYSTEM, fix), MODEL);
    ok = ok.concat(again.ok);
    bad = again.bad;
  }

  for (const b of bad) console.log(`  ✗ dropped "${String(b.it.q).slice(0, 70)}…"\n      ${b.errs.slice(0, 3).join('\n      ')}`);
  for (const it of ok) console.log(`  ✓ L${it.lvl} ${it.skill}: ${it.q.slice(0, 90)}`);
  if (!ok.length) { console.log('No puzzles passed, so the database is unchanged.'); process.exit(2); }
  if (DRY) { console.log(`Dry run: ${ok.length} puzzles would be added.`); return; }

  const items = db.items.concat(ok);
  fs.writeFileSync(BANK, `{"version": ${db.version + 1}, "updated": "${day}", "items": [\n` + items.map(it => '  ' + JSON.stringify(it)).join(',\n') + '\n]}\n');
  BR.useDatabase(JSON.parse(fs.readFileSync(BANK, 'utf8')));
  console.log(`Added ${ok.length} puzzles. Database v${db.version + 1} now has ${items.length}, top level ${BR.maxLevel()}.`);
}

main().catch(err => {
  if (err instanceof Anthropic.AuthenticationError) console.error('The API key was refused. Set OPENROUTER_API_KEY to a valid key.');
  else if (err instanceof Anthropic.RateLimitError) console.error('Rate limited by the API. Try again in a few minutes.');
  else if (err instanceof Anthropic.APIConnectionError) console.error('Could not reach the API: ' + err.message);
  else if (err instanceof Anthropic.APIError) console.error(`API error ${err.status}: ${err.message}`);
  else console.error(err.message || err);
  process.exit(1);
});
