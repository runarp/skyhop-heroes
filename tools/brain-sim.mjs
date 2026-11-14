// Simulates kids answering Brain Boost puzzles to check the picker settles near the target
// success rate. Each simulated kid has a true skill; each puzzle's real difficulty is its
// level plus a random error (so the levels are deliberately imperfect), and a 1-in-4 guess
// floor applies because every question has about 4 choices.
// Run: node tools/brain-sim.mjs [kidsPerSkill]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SH = require(path.join(root, 'src/engine.js'));
const BR = require(path.join(root, 'src/brain.js'));
BR.useDatabase(JSON.parse(fs.readFileSync(path.join(root, 'src/bank.json'), 'utf8')));
const KIDS = +process.argv[2] || 40, Q = 200, sig = x => 1 / (1 + Math.exp(-x));
const itemErr = {};
const errFor = id => (itemErr[id] ??= (Math.random() + Math.random() + Math.random() - 1.5) * 1.2);
function run(trueLvl, target, learn) {
  const save = SH.newSave('Sim', 'bo'); BR.ensure(save); save.brain.target = target; BR.setLevel(save, 1); save.brain.n = 0;
  let skill = BR.beta(trueLvl) + Math.log(7 / 3), right = 0, n = 0, reach = null;
  for (let i = 0; i < Q; i++) {
    const q = BR.pick(save);
    const p = 0.25 + 0.75 * sig(skill - BR.beta(q.lvl) - errFor(q.id));
    const ok = Math.random() < p;
    BR.record(save, q, ok);
    if (i >= 30) { n++; right += ok; }
    if (reach === null && BR.level(save) >= Math.min(trueLvl, BR.maxLevel()) - 1) reach = i + 1;
    skill += learn;
  }
  return { rate: right / n, final: BR.levelReal(save), reach: reach ?? Q };
}
const pct = x => (100 * x).toFixed(0) + '%';
console.log(`Max level ${BR.maxLevel()}. ${KIDS} simulated kids per row, ${Q} puzzles each, success measured after the first 30.\n`);
for (const [target, learn] of [[0.7, 0], [0.7, 0.01], [0.8, 0], [0.6, 0]]) {
  console.log(`Target ${pct(target)}${learn ? ', kid keeps improving' : ''}`);
  console.log('  true level   right (after warm-up)   ends at level   puzzles to get close');
  for (const tl of [2, 4, 6, 8, 10, 12, 14]) {
    const rs = Array.from({ length: KIDS }, () => run(tl, target, learn));
    const avg = k => rs.reduce((s, r) => s + r[k], 0) / rs.length;
    const rates = rs.map(r => r.rate).sort((a, b) => a - b);
    console.log(`  ${String(tl).padStart(6)}       ${pct(avg('rate')).padStart(4)}  (middle 80%: ${pct(rates[Math.floor(KIDS * 0.1)])}–${pct(rates[Math.floor(KIDS * 0.9) - 1])})      ${avg('final').toFixed(1).padStart(5)}          ${avg('reach').toFixed(0).padStart(4)}`);
  }
}
