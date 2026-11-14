// Monte-Carlo balance check: plays every city stage with every hero using a sensible
// (not perfect) policy and prints win rates. Run: node tools/sim.mjs [N]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SH = require('../src/engine.js');
const N = +process.argv[2] || 3000;
const KID = process.argv[3] === 'kid';
if (process.env.T) Object.assign(SH.T, JSON.parse(process.env.T));

function evMove(b, move) {
  const need = SH.needFor(b, move), u = b.hero.u, shell = b.mob.shell, boost = b.hero.boost ? 2 : 1;
  if (move.rule === 'heal') return { ev: 0, pKill: 0 };
  let each, o = SH.odds(move, need), ev = 0, pKill = 0;
  if (!o) {
    if (move.rule === 'sure') { each = Math.max(1, SH.moveDamage(move, u) * boost - shell); return { ev: each, pKill: each >= b.mob.hp ? 1 : 0 }; }
    const all = SH.enumFaces(move.roll);
    for (const f of all) { const d = Math.max(1, SH.dmgEach(b, move, f) * boost - shell); ev += d / all.length; if (d >= b.mob.hp) pKill += 1 / all.length; }
    return { ev, pKill };
  }
  each = Math.max(1, SH.moveDamage(move, u) * boost - shell);
  for (const h in o.dist) { const d = each * h; ev += d * o.dist[h] / o.total; if (h > 0 && d >= b.mob.hp) pKill += o.dist[h] / o.total; }
  if (move.burn && b.mob.burn === 0) ev += (o.win / o.total) * 2 * u;
  if (move.stun) ev += (o.win / o.total) * 0.4 * SH.intent(b).dmg;
  ev -= b.mob.spiky * (ev / each) * 0.5;
  return { ev, pKill };
}

function simBattle(save, mob, opt) {
  const b = SH.newBattle(save, mob), H = SH.HEROES[b.hero.id];
  const items = Object.assign({}, opt.items);
  let rerolls = items.redie || 0;
  const tryReroll = () => { if (b.hero.freeRerolls > 0) { b.hero.freeRerolls--; return true; } if (rerolls > 0) { rerolls--; return true; } return false; };
  for (let guard = 0; guard < 200; guard++) {
    const it = SH.intent(b), h = b.hero;
    if (opt.brain > 0 && h.boostCd === 0 && !h.boost) {
      h.boostCd = SH.boostCooldown(b);
      if (Math.random() < opt.brain) { h.boost = true; SH.addStars(b, 1); }
    }
    if (h.hp < h.maxHp * 0.4 && !h.itemUsed) {
      for (const id of ['cake', 'sandwich', 'apple']) if (items[id] > 0) { items[id]--; SH.useItem(b, id); break; }
    }
    const cand = H.moves.map(m => ({ m, ...evMove(b, m) }));
    if (h.stars >= 3 && H.special.rule !== 'heal') cand.push({ m: H.special, ...evMove(b, H.special), special: true });
    cand.sort((x, y) => (y.pKill - x.pKill) || (y.ev - x.ev));
    let best = cand[0];
    if (best.pKill < 0.5) best = cand.slice().sort((x, y) => y.ev - x.ev)[0];
    const sp = cand.find(c => c.special);
    if (sp && best.pKill < 0.5 && sp.ev >= best.ev * 0.9) best = sp;
    const scary = it.t === 'A' || ((it.t === 'a') && it.dmg >= h.hp);
    let action = 'attack';
    if (KID && Math.random() < 0.4) best = cand[Math.floor(Math.random() * cand.length)];
    if (scary && best.pKill < 0.6 && (!KID || it.t === 'A' && Math.random() < 0.7)) action = 'block';
    if (h.stars >= 3 && H.special.rule === 'heal' && h.hp < h.maxHp * 0.5 && !scary) { action = 'special'; best = { m: H.special }; }
    if (action === 'block') { h.block = true; SH.addStars(b, 1); }
    else {
      if (best.special || action === 'special') h.stars -= 3;
      let faces = SH.rollFaces(best.m.roll);
      if (best.m.roll && SH.hitsOf(best.m, faces, SH.needFor(b, best.m)) === 0 && best.m.kind !== 'wild' && tryReroll()) faces = SH.rollFaces(best.m.roll);
      SH.heroAttack(b, best.m, faces);
    }
    if (b.mob.hp <= 0) return { win: true, rounds: b.round, hp: h.hp / h.maxHp };
    const tick = SH.mobTick(b);
    if (b.mob.hp <= 0) return { win: true, rounds: b.round, hp: h.hp / h.maxHp };
    if (!tick.stunned) {
      if (it.t === 'a' || it.t === 'A') {
        const mf = SH.rollFaces({ t: 'd', s: 6, n: SH.intent(b).ad });
        let hf = SH.rollFaces({ t: 'd', s: 6, n: SH.defDiceCount(b) });
        if (Math.max(...mf) > Math.max(...hf) + h.dodge && SH.intent(b).dmg >= h.hp * 0.3 && tryReroll()) hf = SH.rollFaces({ t: 'd', s: 6, n: SH.defDiceCount(b) });
        SH.resolveMobAttack(b, mf, hf);
      } else if (it.t === 'h') SH.mobRest(b);
    }
    if (h.hp <= 0) return { win: false, rounds: b.round, hp: 0 };
    SH.endRound(b);
  }
  return { win: false, rounds: 200, hp: 0 };
}

// Expected state on arriving at each tier (min-path player) and at its boss.
const PLAN = [
  { lvl: 1, w: null, bossLvl: 2, bossW: 'w1', items: { apple: 2, redie: 1 } },
  { lvl: 3, w: 'w1', bossLvl: 4, bossW: 'w2', items: { apple: 2, sandwich: 1, redie: 1 } },
  { lvl: 5, w: 'w2', bossLvl: 6, bossW: 'w3', items: { sandwich: 2, redie: 1 } },
  { lvl: 7, w: 'w3', bossLvl: 8, bossW: 'w4', items: { sandwich: 2, redie: 1 } },
  { lvl: 9, w: 'w4', bossLvl: 10, bossW: 'w5', items: { sandwich: 2, cake: 1, redie: 1 } },
  { lvl: 11, w: 'w5', bossLvl: 12, bossW: 'w6', items: { sandwich: 2, cake: 1, redie: 2 } },
  { lvl: 13, w: 'w6', bossLvl: 14, bossW: 'w6', items: { sandwich: 2, cake: 2, redie: 2 } }
];
const heroes = SH.HERO_ORDER;
const pct = x => (100 * x).toFixed(0).padStart(3) + '%';
console.log('Win % by hero (rounds). brain=0.7 means 70% of Brain Boosts answered right.\n');
console.log('stage'.padEnd(34) + heroes.map(h => h.padStart(14)).join(''));
for (const city of SH.CITIES) {
  for (let stage = 0; stage < 4; stage++) {
    const p = PLAN[city.tier], boss = stage === 3;
    const mob = SH.makeMob(city, stage);
    let line = (city.name + ' ' + (boss ? 'BOSS ' : 's' + (stage + 1) + ' ') + mob.name).slice(0, 33).padEnd(34);
    for (const hid of heroes) {
      let w = 0, r = 0, hp = 0;
      for (let i = 0; i < N; i++) {
        const save = SH.newSave('sim', hid);
        save.lvl = boss ? p.bossLvl : p.lvl; save.gear.w = boss ? p.bossW : p.w; save.coins = 100;
        const res = simBattle(save, mob, { items: KID ? { apple: p.items.apple || 0, sandwich: p.items.sandwich ? 1 : 0, redie: 1 } : p.items, brain: KID ? 0.5 : 0.7 });
        if (res.win) { w++; hp += res.hp; } r += res.rounds;
      }
      line += (pct(w / N) + ' ' + (r / N).toFixed(1) + ' ' + Math.round(100 * hp / Math.max(1, w))).padStart(14);
    }
    console.log(line);
  }
}
