// Checks every puzzle in the question database: the maths, the answer choices, the wording,
// and that the author's expected answers match what the dice really do.
// Run: node tools/verify-bank.mjs [path/to/bank.json]   (exits 1 if anything is wrong)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SH = require(path.join(root, 'src/engine.js'));
const BR = require(path.join(root, 'src/brain.js'));
const file = process.argv[2] || path.join(root, 'src/bank.json');
const db = JSON.parse(fs.readFileSync(file, 'utf8'));
let bad = 0;
const ids = new Set(), byLvl = {}, bySkill = {};
if (!Number.isInteger(db.version) || !Array.isArray(db.items)) { console.log('The database needs a whole-number "version" and an "items" list.'); process.exit(1); }
for (const it of db.items) {
  const r = BR.verifyItem(it);
  if (ids.has(it.id)) { r.ok = false; r.errors.push('duplicate id'); }
  ids.add(it.id);
  if (!r.ok) { bad++; console.log(`✗ ${it.id}\n  - ` + r.errors.slice(0, 6).join('\n  - ')); }
  byLvl[it.lvl] = (byLvl[it.lvl] || 0) + 1; bySkill[it.skill] = (bySkill[it.skill] || 0) + 1;
}
const tl = {}; SH.TEMPLATES.forEach(t => { tl[t.lvl] = (tl[t.lvl] || 0) + 1; });
console.log(`${db.items.length - bad} of ${db.items.length} database puzzles verified (version ${db.version}).`);
console.log('Puzzles per level (database + built-in):', Object.keys({ ...byLvl, ...tl }).map(Number).sort((a, b) => a - b).map(l => `${l}:${byLvl[l] || 0}+${tl[l] || 0}`).join('  '));
console.log('Skills:', Object.entries(bySkill).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
process.exit(bad ? 1 : 0);
