// Stress test: an in-page bot plays every stage of every city with every hero, pressing
// random buttons (moves, specials, block, bag, Brain Boost, re-rolls). Timers are
// shortened so hundreds of fights run in a minute. Fails on any script error.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const SH = require('../src/engine.js');
const file = 'file://' + path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'index.html');
const errors = [];

// 1) quiz answers must match an independent count of the picture shown with them
const BR = require('../src/brain.js');
BR.useDatabase(JSON.parse(require('fs').readFileSync(new URL('../src/bank.json', import.meta.url), 'utf8')));
for (const item of SH.BANK) { const r = BR.verifyItem(item); if (!r.ok) errors.push('database puzzle ' + item.id + ': ' + r.errors[0]); }
for (const t of SH.TEMPLATES) for (let i = 0; i < 400; i++) {
  const q = t.make();
  if (q.a < 0 || q.a >= q.choices.length || new Set(q.choices).size !== q.choices.length) errors.push('bad choices: ' + q.q);
  const ans = q.choices[q.a];
  if (q.viz && /^\d+$/.test(ans) && /How many|how many/.test(q.q)) {
    let n = 0;
    if (q.viz.t === 'faces') for (let f = 1; f <= q.viz.s; f++) n += q.viz.fn(f) ? 1 : 0;
    if (q.viz.t === 'grid') for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) n += q.viz.fn(a, b) ? 1 : 0;
    if (q.viz.t === 'coins') SH.enumFaces({ t: 'c', n: q.viz.n }).forEach(o => { n += q.viz.fn(o) ? 1 : 0; });
    if (String(n) !== ans) errors.push(`quiz mismatch: "${q.q}" answer ${ans} but picture shows ${n}`);
  }
}
console.log('quiz check done');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.addInitScript(() => { const st = window.setTimeout; window.setTimeout = (fn, ms, ...a) => st(fn, Math.min(ms || 0, 1), ...a); });
await page.goto(file);
await page.waitForSelector('.title');
const result = await page.evaluate(async () => {
  const tick = () => new Promise(r => setTimeout(r, 0));
  const stats = { fights: 0, wins: 0, losses: 0, timeouts: [], bad: [], seenActs: {} };
  async function bot() {
    for (let i = 0; i < 6000; i++) {
      await tick();
      const modal = document.querySelector('#modal.on');
      if (modal) {
        const city = modal.querySelector('[data-pick="city"]');
        if (city && Math.random() < 0.8) { city.click(); continue; }
        const picks = [...modal.querySelectorAll('[data-pick]')].filter(b => !b.closest('.quiz-a.done'));
        if (picks.length) picks[Math.floor(Math.random() * picks.length)].click();
        continue;
      }
      if (document.querySelector('.cityscreen')) return true;
      const deck = document.querySelector('#deck:not(.wait)');
      if (!deck) continue;
      const pk = deck.querySelectorAll('[data-pick]');
      if (pk.length) { pk[Math.random() < 0.7 ? 0 : 1].click(); continue; }
      const acts = [...deck.querySelectorAll('[data-act]:not([disabled])')];
      if (acts.length) { const a = acts[Math.floor(Math.random() * acts.length)]; stats.seenActs[a.dataset.act + (a.dataset.id ? ':' + a.dataset.id : '')] = 1; a.click(); }
    }
    return false;
  }
  const weapons = [null, 'w1', 'w2', 'w3', 'w4', 'w5', 'w6'], charms = ['c_beret', 'c_laurel', 'c_scarab', 'c_safari', 'c_lotus', 'c_abacus', 'c_surf', 'c_cap', 'c_mask', null];
  let n = 0;
  for (const hid of SH.HERO_ORDER) for (const city of SH.CITIES) for (let stage = 0; stage < 4; stage++) {
    const s = SH.newSave('Bot', hid); n++;
    s.heroes = SH.HERO_ORDER.slice(); s.lvl = SH.T.REC[city.tier] + (n % 3); s.coins = 50; s.city = city.id; s.prog[city.id] = stage; s.seen = { how: 1 };
    for (const c of SH.CITIES) if (c.tier < city.tier) { s.stars.push(c.id); s.prog[c.id] = 4; }
    s.items = { apple: 2, sandwich: 2, cake: 1, redie: 2, bubble: 2, bomb: 2, juice: 2 };
    s.gear = { w: weapons[city.tier], s: n % 2 ? 's1' : n % 5 === 0 ? 's2' : null, c: charms[n % charms.length] };
    s.brain = { mode: n % 5 ? 'auto' : 'off', right: 0, asked: 0 }; BR.ensure(s); BR.setLevel(s, 1 + (n % 12)); s.showOdds = n % 4 !== 0;
    UI.store.saves[0] = s; UI.store.settings.sound = false; UI.store.settings.fast = true; UI.ACT.play({ i: 0 });
    const w0 = s.wins, l0 = s.losses;
    UI.startBattle(SH.makeMob(city, stage));
    const ok = await bot(); stats.fights++;
    const S = UI.S;
    if (!ok) stats.timeouts.push(hid + '/' + city.id + '/' + stage);
    if (S.wins > w0) stats.wins++; if (S.losses > l0) stats.losses++;
    if (!(S.coins >= 0) || !Number.isInteger(S.coins) || !(S.lvl >= 1) || !Number.isInteger(S.xp) || S.xp < 0) stats.bad.push('save numbers ' + hid + '/' + city.id + ' ' + JSON.stringify({ c: S.coins, l: S.lvl, x: S.xp }));
    for (const k in S.items) if (!(S.items[k] >= 0) || S.items[k] > SH.MAXSTACK) stats.bad.push('item count ' + k + '=' + S.items[k]);
    UI.closeModal();
  }
  // every other screen once more, with a late-game save
  // the Brain Gym, end to end, at three levels
  for (const L of [1, 6, 12]) {
    BR.setLevel(UI.S, L); UI.S.gym = true; const c0 = UI.S.coins, a0 = UI.S.brain.asked;
    const done = UI.ACT.gym();
    for (let i = 0; i < 400 && document.querySelector('#modal.on'); i++) { await tick(); const p = [...document.querySelectorAll('#modal [data-pick]')].filter(b => !b.closest('.quiz-a.done') && b.dataset.pick !== 'no'); if (p.length) p[Math.floor(Math.random() * p.length)].click(); }
    await done;
    if (UI.S.brain.asked - a0 !== 5) stats.bad.push('Brain Gym asked ' + (UI.S.brain.asked - a0) + ' puzzles, not 5');
    if (UI.S.gym !== false) stats.bad.push('Brain Gym did not empty the coin jar');
  }
  UI.ACT.map(); for (const c of SH.CITIES) UI.ACT.pin({ id: c.id });
  UI.ACT.city(); UI.ACT.shop(); UI.ACT.team(); for (const t of ['bag', 'passport', 'heroes']) UI.ACT.tab({ t });
  UI.closeModal(); UI.ACT.settings(); UI.closeModal();
  return stats;
});
await browser.close();
console.log(JSON.stringify({ fights: result.fights, wins: result.wins, losses: result.losses, timeouts: result.timeouts, bad: result.bad }));
console.log('buttons exercised:', Object.keys(result.seenActs).sort().join(' '));
if (result.timeouts.length) errors.push('fights that never ended: ' + result.timeouts.join(', '));
result.bad.forEach(b => errors.push(b));
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].slice(0, 25).join('\n') : 'NO ERRORS');
process.exit(errors.length ? 1 : 0);
