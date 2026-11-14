/* Skyhop Heroes — the fight screen, Brain Boost quiz, rewards and the Dice Derby. */
(function () {
'use strict';
var SH = window.SH, ART = window.ART, UI = window.UI, ACT = UI.ACT, $ = UI.$, sleep = UI.sleep, T = UI.T, ico = UI.ico, sfx = UI.sfx;
var B = null;

function say(html) { var m = $('#b-msg'); if (!m) return; m.innerHTML = html; m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); }
function fx(side, cls, ms) {
  var el = $('#art-' + side); if (!el) return sleep(0);
  el.classList.add(cls);
  return sleep(ms).then(function () { el.classList.remove(cls); });
}
function floatText(side, text, cls) {
  var el = $('#art-' + side); if (!el) return;
  var d = document.createElement('div'); d.className = 'float ' + (cls || ''); d.textContent = text; el.appendChild(d);
  setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 1050);
}
function setHp(side, hp, max) {
  var el = $('#hp-' + side); if (!el) return;
  el.firstChild.style.width = Math.max(0, 100 * hp / max) + '%';
  el.lastChild.innerHTML = ico('heart') + hp + ' / ' + max;
  if (side === 'hero') el.classList.toggle('low', hp <= max * 0.35);
}
function setVs(t) { var el = $('#tray-vs'); if (el) el.textContent = t; }
function clearTray() { var a = $('#tray-mob'), b = $('#tray-hero'); if (a) a.innerHTML = ''; if (b) b.innerHTML = ''; setVs(''); }

function intentInfo() {
  var b = B.b, it = SH.intent(b), dice = '', i;
  for (i = 0; i < it.ad; i++) dice += ico('dice', 'mini');
  if (b.mob.stun) return { cls: 'warn', html: '<small>This turn</small>Slipped! No attack' };
  switch (it.t) {
    case 'A': return { cls: 'big', html: '<small>This turn</small>BIG attack ' + it.dmg + ' ' + dice };
    case 'c': return { cls: 'warn', html: '<small>This turn</small>Winding up…' };
    case 'g': return { cls: '', html: '<small>This turn</small>Hiding. Harder to hit' };
    case 'h': return { cls: '', html: '<small>This turn</small>Resting, +' + it.heal + ' hearts' };
    default: return { cls: '', html: '<small>This turn</small>Attack ' + it.dmg + ' ' + dice };
  }
}
function update() {
  if (!B) return;
  var b = B.b, h = b.hero, m = b.mob, s = '', i, ch = '', it;
  setHp('hero', h.hp, h.maxHp); setHp('mob', m.hp, m.maxHp);
  for (i = 0; i < SH.MAXSTARS; i++) s += ico(i < h.stars ? 'star' : 'star0');
  s += '<small>' + (h.stars >= 3 ? 'Special ready!' : (3 - h.stars) + ' more for Special') + '</small>';
  $('#stars').innerHTML = s;
  if (h.boost) ch += '<span class="tag fx">🧠 Next attack ×2</span>';
  if (h.block) ch += '<span class="tag slip">🛡️ Blocking</span>';
  if (h.bubble) ch += '<span class="tag slip">🔮 Bubble</span>';
  if (h.freeRerolls) ch += '<span class="tag fx">🍀 ' + h.freeRerolls + ' free re-roll' + (h.freeRerolls > 1 ? 's' : '') + '</span>';
  $('#chips-hero').innerHTML = ch;
  ch = UI.traitTags(B.mob);
  if (m.angry) ch += '<span class="tag rage">😡 ANGRY</span>';
  if (m.burn) ch += '<span class="tag fx">🌶️ Burning ' + m.burn + '</span>';
  $('#chips-mob').innerHTML = ch;
  it = intentInfo();
  $('#intent').className = 'intent ' + it.cls; $('#intent').innerHTML = it.html;
  $('#b-round').textContent = b.round; $('#b-coins').textContent = UI.fmt(UI.S.coins);
  $('#art-hero').classList.toggle('block', !!h.block); $('#art-hero').classList.toggle('bubbled', !!h.bubble);
}
function hint(key, text) { var S = UI.S; if (S.seen[key]) return; S.seen[key] = 1; UI.persist(); UI.toast(text); }

UI.startBattle = function (mob) {
  var S = UI.S, city = SH.cityById(mob.city), h = SH.HEROES[S.hero];
  B = { b: SH.newBattle(S, mob), mob: mob, busy: true, city: city, bigHit: false };
  UI.app.innerHTML = '<div class="screen battle"><div class="b-stage"><div class="b-bg">' + ART.scene(city.id) + '</div>' +
    '<div class="b-top"><button class="iconbtn" data-act="bMenu" aria-label="Menu">' + ico('gear') + '</button><span class="chip">Round&nbsp;<b id="b-round">1</b></span><span class="grow"></span><span class="chip">' + ico('coin') + '<b id="b-coins"></b></span></div>' +
    '<div class="b-msg" id="b-msg" aria-live="polite"></div><div class="b-field">' +
    '<div class="fighter hero"><div class="plate"><div class="plate-name"><b>' + h.name + '</b><span>Level ' + S.lvl + '</span></div><div class="hpbar" id="hp-hero"><i></i><span></span></div><div class="starsrow" id="stars"></div><div class="chips" id="chips-hero"></div></div><div class="art idle" id="art-hero">' + ART.hero(S.hero) + '</div></div>' +
    '<div class="tray"><div class="tray-row" id="tray-mob"></div><div class="tray-vs" id="tray-vs"></div><div class="tray-row" id="tray-hero"></div></div>' +
    '<div class="fighter mob"><div class="plate"><div class="plate-name"><b>' + mob.name + '</b>' + (mob.boss ? '<span>Boss</span>' : '') + '</div><div class="hpbar red" id="hp-mob"><i></i><span></span></div><div class="chips" id="chips-mob"></div></div><div class="intent" id="intent"></div><div class="art idle" id="art-mob">' + ART.mob(mob) + '</div></div>' +
    '</div></div><div class="deck b-actions wait" id="deck"></div></div>';
  update(); renderActions(); $('#deck').classList.add('wait');
  say('<b>' + mob.name + '</b> blocks the way!');
  var go = function () { sleep(T(800)).then(beginRound); };
  if (!S.seen.how) { S.seen.how = 1; UI.persist(); UI.howto(0, go); } else go();
};

function beginRound() {
  if (!B) return;
  var b = B.b, it = SH.intent(b), m = B.mob.name;
  clearTray(); update(); renderActions(); B.busy = false;
  if (it.t === 'c') say('<b>' + m + '</b> is winding up. No attack this turn, but a BIG one is next!');
  else if (it.t === 'A') say('BIG attack coming! <b>Block</b> halves it.');
  else if (it.t === 'g') say('<b>' + m + '</b> is hiding. It is harder to hit this turn.');
  else if (it.t === 'h') say('<b>' + m + '</b> wants a rest. Hit it now!');
  else say('Your turn. Pick a move!');
  if (it.t === 'A') hint('big', '💡 Block halves a BIG attack and adds a dodge die.');
  else if (b.hero.stars >= 3) hint('sp', '💡 3 stars! Your Special move is ready.');
  else if (b.mob.guard && b.round === 1) hint('slip', '💡 Slippery mob. Most moves need a higher roll. Check the chances!');
  else if (b.mob.shell && b.round === 1) hint('shell', '💡 Tough mob. Every hit loses some damage, so big hits work best.');
}
UI.battleRefresh = function () { if (B && !B.busy) renderActions(); };

function renderActions() {
  var b = B.b, H = SH.HEROES[b.hero.id], S = UI.S, deck = $('#deck'), h = b.hero;
  function ctx(mv) { return { need: SH.needFor(b, mv), u: h.u, shell: b.mob.shell, boost: h.boost && mv.rule !== 'heal', stars: h.stars, live: true }; }
  var cards = H.moves.map(function (mv, i) { return UI.moveCard(mv, i, ctx(mv)); }).join('') + UI.moveCard(H.special, 's', ctx(H.special));
  var n = 0; ['apple', 'sandwich', 'cake', 'bubble', 'bomb', 'juice'].forEach(function (id) { n += S.items[id] || 0; });
  var cd = h.boostCd, brain = '';
  if (S.brain.mode !== 'off') {
    brain = '<button class="ubtn brain' + (cd === 0 && !h.boost ? ' ready' : '') + '" data-act="bBrain"' + (cd > 0 || h.boost ? ' disabled' : '') + '>' + ico('brain') +
      '<span><b>Brain Boost</b><small>' + (h.boost ? 'On! Next attack ×2' : cd > 0 ? 'Back in ' + cd + (cd === 1 ? ' round' : ' rounds') : 'Answer for a double hit') + '</small></span></button>';
  }
  deck.innerHTML = '<div class="moves">' + cards + '</div><div class="utils">' +
    '<button class="ubtn block" data-act="bBlock">' + ico('shield') + '<span><b>Block</b><small>Half damage, +1 star</small></span></button>' +
    '<button class="ubtn bagb" data-act="bBag"' + (n && !h.itemUsed ? '' : ' disabled') + '>' + ico('bag') + '<span><b>Bag</b><small>' + (h.itemUsed ? 'Used this round' : n + ' to use') + '</small></span></button>' + brain + '</div>';
  deck.classList.remove('wait');
}

/* ------------------------------------------------------------------- dice */
function dieEl(sides, v, side) { var d = document.createElement('div'); d.className = 'die ' + side; d.innerHTML = ART.die(sides, v); return d; }
async function rollAnim(side, roll, faces) {
  var row = $('#tray-' + side), sides = roll.t === 'c' ? 'c' : roll.s, els = [], i, k, n = UI.store.settings.fast ? 4 : 8;
  if (!row) return els;
  row.innerHTML = '';
  for (i = 0; i < faces.length; i++) { els.push(dieEl(sides, 1, side)); els[i].classList.add('rolling'); row.appendChild(els[i]); }
  sfx('roll');
  for (k = 0; k < n; k++) {
    for (i = 0; i < els.length; i++) els[i].innerHTML = ART.die(sides, sides === 'c' ? (Math.random() < 0.5 ? 1 : 0) : 1 + Math.floor(Math.random() * sides));
    await sleep(75);
  }
  for (i = 0; i < els.length; i++) { els[i].classList.remove('rolling'); els[i].innerHTML = ART.die(sides, faces[i]); els[i].classList.add('landed'); }
  await sleep(T(280));
  return els;
}
function markAttack(els, mv, faces, need) {
  var hits = SH.hitsOf(mv, faces, need), best = faces.indexOf(Math.max.apply(null, faces));
  els.forEach(function (e, i) {
    var good;
    if (mv.rule === 'each') good = faces[i] >= need;
    else if (mv.rule === 'heads') good = faces[i] === 1;
    else if (mv.rule === 'best' || mv.rule === 'maxmult') good = hits > 0 && i === best;
    else good = hits > 0;
    e.classList.add(good ? 'good' : 'bad');
  });
  if (mv.rule === 'sum') setVs('Total ' + SH.util.sum(faces));
  else if (mv.rule === 'heads') setVs(SH.util.sum(faces) + ' heads');
  else setVs('');
}
function rerolls() { return B.b.hero.freeRerolls + (UI.S.items.redie || 0); }
function spendReroll() { var h = B.b.hero; if (h.freeRerolls > 0) h.freeRerolls--; else { UI.S.items.redie--; UI.persist(); } }
async function askReroll(title, chance) {
  var deck = $('#deck'), h = B.b.hero, have = h.freeRerolls ? h.freeRerolls + ' free re-roll' + (h.freeRerolls > 1 ? 's' : '') + ' left' : 'You have ' + UI.S.items.redie + ' Lucky ' + (UI.S.items.redie > 1 ? 'Dice' : 'Die');
  deck.innerHTML = '<div class="subpanel"><h3>' + title + '</h3><div class="sub-row"><button class="btn green" data-pick="y">🎲 Roll again</button><button class="btn ghost" data-pick="n">Keep it</button>' +
    '<span class="small">' + chance + '<br><span class="soft">' + have + '</span></span></div></div>';
  deck.classList.remove('wait');
  var v = await UI.waitPick(deck);
  renderActions(); deck.classList.add('wait');
  return v === 'y';
}

/* ------------------------------------------------------------ hero's turn */
ACT.bMove = function (d) {
  if (!B || B.busy) return;
  var b = B.b, H = SH.HEROES[b.hero.id], mv = d.i === 's' ? H.special : H.moves[+d.i];
  if (!mv) return;
  if (mv.kind === 'special') { if (b.hero.stars < 3) return; b.hero.stars -= 3; }
  heroTurn(mv);
};
async function heroTurn(mv) {
  var b = B.b, name = SH.HEROES[b.hero.id].name, need = SH.needFor(b, mv), faces = [], els, deck = $('#deck'), i;
  B.busy = true; deck.classList.add('wait'); update(); clearTray();
  say('<b>' + name + '</b> uses <b>' + mv.name + '</b>!');
  if (mv.roll) {
    faces = SH.rollFaces(mv.roll); els = await rollAnim('hero', mv.roll, faces); markAttack(els, mv, faces, need);
    if (SH.hitsOf(mv, faces, need) === 0 && rerolls() > 0) {
      var o = SH.odds(mv, need);
      sfx('miss'); say('That roll misses.');
      if (await askReroll('Missed! Use a re-roll?', UI.S.showOdds && o ? '<b>' + o.win + ' in ' + o.total + '</b> rolls hit.' : 'What are your chances?')) {
        spendReroll(); update(); faces = SH.rollFaces(mv.roll); els = await rollAnim('hero', mv.roll, faces); markAttack(els, mv, faces, need);
      }
    }
  } else await sleep(T(350));
  if (!B) return;
  var r = SH.heroAttack(b, mv, faces);
  if (r.stars) { sfx('star'); floatText('hero', '+' + r.stars + ' ★', 'star'); }
  if (mv.rule === 'heal') {
    sfx('heal'); floatText('hero', '+' + r.heal, 'heal'); say('Yum! <b>+' + r.heal + '</b> hearts.'); update(); await sleep(T(900));
  } else if (r.hits > 0) {
    fx('hero', 'lunge-r', 380); await sleep(160);
    sfx(r.dmg >= b.mob.maxHp * 0.3 ? 'big' : 'hit'); fx('mob', 'shake', 400);
    for (i = 0; i < r.per.length; i++) { floatText('mob', '−' + r.per[i], 'dmg'); if (i < r.per.length - 1) await sleep(190); }
    var msg = (r.boost ? 'BRAIN BOOST! ' : '') + (r.hits > 1 ? r.hits + ' hits! ' : mv.kind === 'wild' ? 'WOW! ' : 'Hit! ') + '<b>−' + r.dmg + '</b>';
    if (r.burn) msg += ' It is burning!';
    if (r.stun) msg += ' It slipped!';
    if (r.heal) msg += ' You heal ' + r.heal + '.';
    say(msg); update(); await sleep(T(850));
    if (r.spiky) { sfx('hurt'); fx('hero', 'shake', 400); floatText('hero', '−' + r.spiky, 'dmg'); say('Ouch, prickly! You lose <b>' + r.spiky + '</b>.'); update(); await sleep(T(800)); }
    if (r.angry && b.mob.hp > 0) { say('<b>' + B.mob.name + '</b> is ANGRY now. It hits harder!'); fx('mob', 'charge', 600); update(); await sleep(T(950)); }
  } else {
    sfx('miss'); fx('hero', 'lunge-r', 380); fx('mob', 'dodge-r', 450); floatText('mob', 'Miss!', 'miss');
    say(r.boost ? 'Missed! The Brain Boost is used up.' : 'Missed!'); update(); await sleep(T(800));
  }
  if (!B) return;
  if (b.mob.hp <= 0) return victory();
  return mobTurn();
}
ACT.bBlock = async function () {
  if (!B || B.busy) return;
  var b = B.b; B.busy = true; $('#deck').classList.add('wait'); clearTray();
  b.hero.block = true; SH.addStars(b, 1); sfx('star'); floatText('hero', '+1 ★', 'star');
  say('Shield up! Half damage and an extra dodge die.'); update(); await sleep(T(750));
  if (B) mobTurn();
};
ACT.bBag = function () {
  if (!B || B.busy || B.b.hero.itemUsed) return;
  var S = UI.S, list = ['apple', 'sandwich', 'cake', 'bubble', 'bomb', 'juice'].filter(function (id) { return (S.items[id] || 0) > 0; });
  $('#deck').innerHTML = '<div class="subpanel"><h3>Bag <span class="soft small">An item does not cost your turn. One each round.</span></h3><div class="sub-row">' + list.map(function (id) {
    var it = SH.ITEMS[id];
    return '<button class="itembtn" data-act="bItem" data-id="' + id + '"><span class="emo">' + it.icon + '</span><span><b>' + it.name + ' × ' + S.items[id] + '</b><small>' + it.text + '</small></span></button>';
  }).join('') + '<button class="btn ghost" data-act="bBack">Back</button></div></div>';
};
ACT.bBack = function () { if (B && !B.busy) renderActions(); };
ACT.bItem = async function (d) {
  if (!B || B.busy) return;
  var b = B.b, S = UI.S, id = d.id, it = SH.ITEMS[id];
  if (!(S.items[id] > 0) || b.hero.itemUsed || !it || it.passive) return;
  B.busy = true; $('#deck').classList.add('wait');
  S.items[id]--; var r = SH.useItem(b, id); UI.persist();
  if (it.heal) { sfx('heal'); floatText('hero', '+' + r.heal, 'heal'); say(it.icon + ' Yum! <b>+' + r.heal + '</b> hearts.'); }
  else if (id === 'bubble') { sfx('star'); say('🔮 Bubble Shield is on. It pops the next hit.'); }
  else if (id === 'bomb') { sfx('big'); fx('mob', 'shake', 400); floatText('mob', '−' + r.dmg, 'dmg'); say('💣 BOOM! <b>−' + r.dmg + '</b>'); }
  else if (id === 'juice') { sfx('star'); floatText('hero', '+' + r.stars + ' ★', 'star'); say('🧃 Star Juice! +' + r.stars + ' stars.'); }
  update(); await sleep(T(750));
  if (!B) return;
  if (b.mob.hp <= 0) return victory();
  renderActions(); B.busy = false;
};
ACT.bMenu = function () { if (B && !B.busy) UI.battleSettings(); };
ACT.runAway = function () { UI.closeModal(); if (!B) return; B = null; UI.showCity(); UI.toast('You ran away. No prize this time.'); };

/* ------------------------------------------------------------- mob's turn */
async function mobTurn() {
  var b = B.b, m = B.mob, it = SH.intent(b), tick = SH.mobTick(b), h = b.hero;
  if (tick.burn) {
    sfx('hit'); fx('mob', 'shake', 400); floatText('mob', '−' + tick.burn, 'dmg'); say('🌶️ Spicy! <b>−' + tick.burn + '</b>'); update(); await sleep(T(750));
    if (!B) return;
    if (b.mob.hp <= 0) return victory();
    if (tick.angry) { say('<b>' + m.name + '</b> is ANGRY now. It hits harder!'); await sleep(T(850)); it = SH.intent(b); }
  }
  if (tick.stunned) { say('<b>' + m.name + '</b> slipped on the peel and misses its turn!'); fx('mob', 'dodge-r', 450); await sleep(T(950)); }
  else if (it.t === 'a' || it.t === 'A') {
    var roll = { t: 'd', s: 6, n: it.ad }, mf = SH.rollFaces(roll), k = SH.defDiceCount(b), droll = { t: 'd', s: 6, n: k };
    say('<b>' + m.name + '</b> ' + (it.t === 'A' ? 'lets loose its BIG attack!' : 'attacks!'));
    clearTray();
    var mels = await rollAnim('mob', roll, mf), mb = Math.max.apply(null, mf), bi = mf.indexOf(mb), need = SH.dodgeNeed(b, mf);
    mels.forEach(function (e, i) { e.classList.add(i === bi ? 'good' : 'bad'); });
    say(need <= 1 ? 'It rolled ' + mb + '. Any roll dodges that!' : 'It rolled <b>' + mb + '</b>. Roll <b>' + need + (need >= 6 ? '' : ' or more') + '</b> to dodge!' + (h.dodge ? ' (shoes: +' + h.dodge + ')' : ''));
    setVs('Dodge: ' + (need <= 1 ? 'any' : need >= 6 ? '6' : need + '+'));
    await sleep(T(500));
    var hf = SH.rollFaces(droll), hels = await rollAnim('hero', droll, hf);
    function markDodge() { var hb = Math.max.apply(null, hf), hi = hf.indexOf(hb), ok = hb + h.dodge >= mb; hels.forEach(function (e, i) { e.classList.add(i === hi && ok ? 'good' : 'bad'); }); return ok; }
    if (!markDodge() && !h.bubble && rerolls() > 0) {
      var tot = Math.pow(6, k), win = tot - Math.pow(Math.max(0, need - 1), k);
      sfx('miss');
      if (await askReroll('That will not dodge! Use a re-roll?', UI.S.showOdds ? '<b>' + win + ' in ' + tot + '</b> rolls dodge.' : 'What are your chances?')) {
        spendReroll(); update(); hf = SH.rollFaces(droll); hels = await rollAnim('hero', droll, hf); markDodge();
      }
    }
    if (!B) return;
    var r = SH.resolveMobAttack(b, mf, hf);
    if (r.stars) { sfx('star'); floatText('hero', '+' + r.stars + ' ★', 'star'); }
    if (!r.hit) { sfx('dodge'); fx('mob', 'lunge-l', 380); fx('hero', 'dodge-l', 450); floatText('hero', 'Dodged!', 'miss'); say('Dodged! ' + (r.hb === r.mb ? 'A tie goes to you.' : 'Nice roll.')); }
    else if (r.bubble) { sfx('dodge'); fx('mob', 'lunge-l', 380); floatText('hero', 'Pop!', 'miss'); say('🔮 Pop! The bubble took the hit.'); }
    else {
      fx('mob', 'lunge-l', 380); await sleep(160); sfx('hurt'); fx('hero', 'shake', 400); floatText('hero', '−' + r.dmg, 'dmg');
      if (it.t === 'A' && !h.block) B.bigHit = true;
      say('Ouch! <b>−' + r.dmg + '</b>' + (h.block ? ' (blocked half)' : '') + (r.stolen ? ' and it stole ' + r.stolen + ' coins!' : ''));
    }
    update(); await sleep(T(900));
  } else if (it.t === 'c') { say('<b>' + m.name + '</b> winds up… <b>BIG attack next turn!</b>'); fx('mob', 'charge', 600); await sleep(T(1000)); }
  else if (it.t === 'g') { say('<b>' + m.name + '</b> stays hidden.'); await sleep(T(800)); }
  else if (it.t === 'h') {
    var n = SH.mobRest(b);
    if (n) { sfx('heal'); floatText('mob', '+' + n, 'heal'); say('<b>' + m.name + '</b> rests. +' + n + ' hearts.'); } else say('<b>' + m.name + '</b> cannot rest right now.');
    update(); await sleep(T(850));
  }
  if (!B) return;
  if (h.hp <= 0) return defeat();
  var e = SH.endRound(b);
  if (e.regen) floatText('mob', '+' + e.regen, 'heal');
  if (e.lotus) floatText('hero', '+' + e.lotus, 'heal');
  beginRound();
}

/* ------------------------------------------------------------ Brain Boost */
var COLORS = { red: '#ff5a5a', blue: '#4aa8ff', green: '#3fd086', gold: '#ffd23f', yellow: '#ffe14d', purple: '#9d86ff', orange: '#ff9a3c', pink: '#ff9ec4', white: '#ffffff', black: '#5d5176', brown: '#b07a45', grey: '#c9cfe0', gray: '#c9cfe0', silver: '#dfe3ee' };
function faceChip(f, cls) {
  if (typeof f === 'number' && f >= 0 && f <= 20 && f % 1 === 0) return '<span class="die hero ' + cls + '">' + ART.die(f >= 1 && f <= 6 ? 6 : f <= 8 ? 8 : 12, f) + '</span>';
  return '<span class="chipface ' + cls + '" style="background:' + (COLORS[String(f).toLowerCase()] || '#e9e4f2') + '">' + UI.esc(String(f)) + '</span>';
}
function shortFace(f) { return typeof f === 'number' ? f : UI.esc(String(f).slice(0, 3)); }
function maskCls(m) { return m === 2 ? 'good' : m === 1 ? 'mid' : 'off'; }
function vizHTML(v) {
  var out = '', i, a, c;
  if (!v) return '';
  if (v.t === 'facelist') return '<div class="facerow">' + v.faces.map(function (f, k) { return faceChip(f, maskCls(v.mask[k])); }).join('') + '</div>';
  if (v.t === 'grid2') {
    var cols = v.cols.length, given = v.mask.indexOf(1) >= 0;
    v.rows.forEach(function (r, x) { v.cols.forEach(function (col, y) { var m = v.mask[x * cols + y]; out += '<i class="' + (m === 2 ? 'h1' : m === 1 ? 'hg' : '') + '">' + shortFace(r) + '·' + shortFace(col) + '</i>'; }); });
    return '<span class="odds big" style="grid-template-columns:repeat(' + cols + ',' + (cols > 6 ? 31 : 34) + 'px);grid-auto-rows:26px">' + out + '</span>' +
      '<span class="small soft">Each square is one way the two can land.' + (given ? ' Yellow squares fit what you were told, but miss.' : '') + '</span>';
  }
  if (v.t === 'coinlist') {
    v.outs.forEach(function (o, k) { out += '<span class="pair ' + (v.mask[k] === 2 ? 'on' : v.mask[k] === 1 ? 'mid' : 'off') + (o.length > 3 ? ' four' : '') + '">' + o.map(function (x) { return '<span class="die">' + ART.die('c', x === 'H' ? 1 : 0) + '</span>'; }).join('') + '</span>'; });
    return '<div class="facerow coins">' + out + '</div>';
  }
  if (v.t === 'faces') {
    for (i = 1; i <= v.s; i++) out += '<span class="die hero' + (v.fn(i) ? ' good' : ' off') + '">' + ART.die(v.s, i) + '</span>';
    return '<div class="facerow">' + out + '</div>';
  }
  if (v.t === 'grid') {
    for (a = 1; a <= 6; a++) for (c = 1; c <= 6; c++) out += '<i class="' + (v.fn(a, c) ? 'h1' : '') + '">' + a + '·' + c + '</i>';
    return '<span class="odds big" style="grid-template-columns:repeat(6,34px);grid-auto-rows:28px">' + out + '</span><span class="small soft">Each square is one way two dice can land.</span>';
  }
  if (v.t === 'coins') {
    SH.enumFaces({ t: 'c', n: v.n }).forEach(function (o) {
      out += '<span class="pair ' + (v.fn(o) ? 'on' : 'off') + '">' + o.map(function (x) { return '<span class="die">' + ART.die('c', x) + '</span>'; }).join('') + '</span>';
    });
    return '<div class="facerow coins">' + out + '</div>';
  }
  return '';
}
async function askQuestion(q, opts) {
  opts = opts || {};
  var esc = UI.esc;
  var root = UI.openModal('<div class="m-head">' + ico('brain') + '<h2 class="grow">' + (opts.title || 'Brain Boost') + '</h2>' + (opts.step ? '<span class="tag">' + opts.step + '</span>' : '') +
    '<span class="tag fx">Level ' + q.lvl + '</span></div><p class="quiz-q">' + esc(q.q) + '</p><div class="quiz-a" id="quiz-a">' +
    q.choices.map(function (c, i) { return '<button class="btn" data-pick="' + i + '">' + esc(c) + '</button>'; }).join('') + '</div><div id="quiz-why"></div>');
  var v = +(await UI.waitPick(root)), ok = v === q.a, btns = root.querySelectorAll('#quiz-a .btn');
  $('#quiz-a').classList.add('done'); btns[q.a].classList.add('right'); if (!ok && btns[v]) btns[v].classList.add('wrong');
  sfx(ok ? 'good' : 'bad');
  $('#quiz-why').innerHTML = '<div class="why"><span><b>' + (ok ? 'Yes! ' : 'Not quite. ') + '</b>' + esc(q.why) + '</span>' + vizHTML(q.viz) + '</div>' +
    '<div class="m-row" style="margin-top:12px"><button class="btn big green" data-pick="ok">' + (ok ? opts.okRight || 'Double hit!' : opts.okWrong || 'OK') + '</button></div>';
  var card = root.querySelector('.modal-card'); if (card) card.scrollTop = card.scrollHeight;
  await UI.waitPick(root);
  UI.closeModal();
  return ok;
}
UI.askQuestion = askQuestion;
ACT.bBrain = async function () {
  if (!B || B.busy) return;
  var b = B.b, S = UI.S;
  if (b.hero.boostCd > 0 || b.hero.boost || S.brain.mode === 'off') return;
  B.busy = true;
  var q = BR.pick(S), ok = await askQuestion(q);
  if (!B) return;
  var rec = BR.record(S, q, ok); b.hero.boostCd = SH.boostCooldown(b);
  if (rec.after > rec.before) UI.toast('Brain level ' + rec.after + '! The puzzles get trickier.');
  if (ok) { b.hero.boost = true; SH.addStars(b, 1); floatText('hero', '×2', 'star'); say('Brain Boost! Your next attack hits <b>double</b>. +1 star.'); }
  else say('Good try! Brain Boost comes back in ' + b.hero.boostCd + ' rounds.');
  UI.persist(); update(); renderActions(); B.busy = false;
};

/* -------------------------------------------------------- win and lose */
async function victory() {
  var b = B.b, mob = B.mob, S = UI.S, city = B.city, art = $('#art-mob');
  if (art) art.classList.remove('idle');
  sfx('win'); fx('mob', 'ko', 700); say('<b>' + mob.name + '</b> is bonked!'); $('#art-hero').classList.add('cheer');
  await sleep(T(1000));
  var r = SH.winBattle(b); UI.persist(); B = null;
  var pw = SH.powerForLevel(S.lvl) - SH.powerForLevel(r.lvlFrom);
  if (r.ups) sfx('level');
  await UI.modalPick('<h2 class="center">' + (mob.boss ? 'Boss bonked!' : 'You win!') + '</h2><div class="m-art">' + ART.hero(S.hero) + '</div><div class="reward">' +
    '<span class="chip">' + ico('coin') + '+' + r.coins + '</span><span class="chip">' + ico('bolt') + '+' + r.xp + ' XP</span>' +
    (r.back ? '<span class="chip">' + ico('coin') + r.back + ' back</span>' : '') + (r.drop ? '<span class="chip">' + SH.ITEMS[r.drop].icon + ' ' + SH.ITEMS[r.drop].name + '</span>' : '') + '</div>' +
    (r.ups ? '<div class="why"><b style="font-size:23px">Level up! Level ' + S.lvl + '</b><span>+' + 3 * r.ups + ' hearts' + (pw ? ' and +' + pw + ' Power' : '') + '</span></div>' : '') +
    '<div><div class="xpbar"><i style="width:' + Math.round(100 * S.xp / SH.xpNeed(S.lvl)) + '%"></i></div><p class="small soft center">Level ' + S.lvl + ' · ' + S.xp + ' of ' + SH.xpNeed(S.lvl) + ' XP</p></div>' +
    '<div class="m-row"><button class="btn big green" data-pick="ok">' + (r.star ? 'Get the star!' : 'Hooray!') + '</button></div>');
  if (r.star) {
    sfx('good'); UI.confetti();
    var names = r.unlocked.map(function (id) { return SH.cityById(id).name; });
    await UI.modalPick('<div class="bigstar">' + ico('star') + '</div><h2 class="center">Wonder Star!</h2><div class="m-art scene">' + ART.scene(city.id) + '</div>' +
      '<p class="center"><b>' + UI.cap(city.land) + '</b> ' + (city.final ? 'are safe again.' : 'sparkles again.') + ' You have <b>' + S.stars.length + '</b> of ' + SH.CITIES.length + ' stars.</p>' +
      '<div class="why"><b>Did you know?</b><span>' + city.fact + '</span></div>' +
      (names.length ? '<p class="center">' + ico('plane') + ' <b>New ' + (names.length > 1 ? 'flights' : 'flight') + ':</b> ' + names.join(', ') + '</p>' : '') +
      '<div class="m-row"><button class="btn big green" data-pick="ok">Brilliant!</button></div>');
    if (r.joined) {
      var j = SH.HEROES[r.joined];
      sfx('level');
      await UI.modalPick('<h2 class="center">' + j.name + ' joins your team!</h2><div class="m-art">' + ART.hero(r.joined) + '</div><p class="center"><b>' + j.name + ' the ' + j.animal + '</b>, ' + j.title.toLowerCase() + '. ' + j.tip + '</p>' +
        '<div class="why"><b>' + j.passive.name + '</b><span>' + j.passive.text + '</span></div><p class="small soft center">Swap heroes in Team, or when you peek at a mob.</p>' +
        '<div class="m-row"><button class="btn big green" data-pick="ok">Welcome, ' + j.name + '!</button></div>');
    }
    if (city.final) {
      UI.confetti();
      await UI.modalPick('<h2 class="center">You saved the Wonder Stars!</h2><div class="m-art">' + ART.mob(mob) + '</div>' +
        '<p class="center">“I only wanted a bit of sparkle too,” sniffs Baron Grumble. So you give him one small star of his own. He is a little less grumpy now.</p>' +
        '<div class="kv"><div><small>Stars</small><b>' + S.stars.length + ' / ' + SH.CITIES.length + '</b></div><div><small>Flown</small><b>' + UI.fmt(S.km) + ' km</b></div><div><small>Fights won</small><b>' + S.wins + '</b></div><div><small>Brain Boosts</small><b>' + S.brain.right + '</b></div></div>' +
        '<p class="small soft center">You can keep playing. Any cities left to win?</p><div class="m-row"><button class="btn big green" data-pick="ok">The end… for now</button></div>');
    }
  }
  UI.showCity();
}
function tipFor(mob, bigHit) {
  if (bigHit) return 'Watch the bubble over the mob. When it says BIG attack, press Block before it hits.';
  if (mob.shell) return 'It is tough, so every hit loses ' + mob.shell + ' damage. One big hit beats two small ones.';
  if (mob.guard) return 'It is slippery. Wild moves, coin flips and Specials are not slowed down by that.';
  if (mob.spiky) return 'It is prickly. Each hit you land hurts you, so use fewer, bigger hits.';
  if (mob.regen) return 'It heals every round. Hit hard and fast. Mika’s Pepper Toss stops the healing.';
  return 'Buy snacks in the shop and eat one when your hearts get low. Fighting again also makes you stronger.';
}
async function defeat() {
  var mob = B.mob, S = UI.S, bigHit = B.bigHit, art = $('#art-hero');
  if (art) art.classList.remove('idle');
  sfx('lose'); fx('hero', 'ko', 700); say('<b>' + SH.HEROES[S.hero].name + '</b> is bonked!');
  await sleep(T(1000));
  var r = SH.loseBattle(B.b); UI.persist(); B = null;
  var v = await UI.modalPick('<h2 class="center">Bonked!</h2><div class="m-art">' + ART.mob(mob) + '</div>' +
    '<p class="center"><b>' + mob.name + '</b> won this time. You still get <b>+' + r.xp + ' XP</b> for trying' + (r.lost ? ', but it kept ' + r.lost + ' of your coins' : '') + '.</p>' +
    (r.ups ? '<div class="why"><b style="font-size:21px">Level up! Level ' + S.lvl + '</b><span>You are stronger now.</span></div>' : '') +
    '<div class="why"><b>Tip</b><span>' + tipFor(mob, bigHit) + '</span></div>' +
    '<div class="m-row"><button class="btn ghost" data-pick="city">Back to the city</button><button class="btn big green" data-pick="again">Try again</button></div>');
  if (v === 'again') UI.startBattle(SH.makeMob(SH.cityById(mob.city), mob.stage)); else UI.showCity();
}

/* ------------------------------------------------------------- Dice Derby */
var derby = null;
function ways(n) { return 6 - Math.abs(7 - n); }
function derbyHTML() {
  var S = UI.S, d = derby, lanes = '', n;
  for (n = 2; n <= 12; n++) {
    lanes += '<div class="lane' + (d.winner === n ? ' win' : '') + '"><button class="lane-n' + (d.pick === n ? ' on' : '') + '" data-act="derbyPick" data-n="' + n + '"' + (d.state !== 'pick' ? ' disabled' : '') + '>' + n + '</button>' +
      '<div class="lane-track"><i id="lane-' + n + '" style="width:' + (100 * d.pos[n] / SH.DERBY_GOAL) + '%"></i></div><span class="lane-w">' + (d.state === 'done' ? ways(n) + (ways(n) === 1 ? ' way' : ' ways') : '') + '</span></div>';
  }
  var top = '', foot = '';
  if (d.state === 'pick') {
    top = '<p>Eleven planes race. Two dice are rolled and <b>added up</b>. The plane with that number flies one step. First to ' + SH.DERBY_GOAL + ' steps wins. <b>Which plane will you back?</b></p>';
    foot = '<button class="btn ghost" data-act="closeDerby">Close</button><button class="btn big green" data-act="derbyGo"' + (d.fee > S.coins ? ' disabled' : '') + '>Race! ' + (d.fee ? ico('coin') + d.fee : 'Free') + '</button>';
  } else if (d.state === 'done') {
    var won = d.winner === d.pick;
    top = '<div class="why"><b style="font-size:21px">Plane ' + d.winner + ' wins!' + (won ? ' You get ' + d.prize + ' coins!' : '') + '</b><span>' +
      (d.winner === 7 ? 'There are 6 ways to roll a 7. That is more than any other number.' : 'Lucky plane! ' + d.winner + ' can only be rolled ' + ways(d.winner) + (ways(d.winner) === 1 ? ' way' : ' ways') + '. A 7 can be rolled 6 ways.') + '</span></div>';
    foot = '<button class="btn ghost" data-act="closeDerby">Done</button><button class="btn green" data-act="derby">Race again</button>';
  } else top = '<p class="center">Go, plane <b>' + d.pick + '</b>!</p>';
  return '<div class="m-head">' + ico('dice') + '<h2 class="grow">Dice Derby</h2><span class="chip">' + ico('coin') + '<b>' + UI.fmt(S.coins) + '</b></span></div>' + top +
    '<div class="derby-dice" id="derby-dice">' + (d.last ? '<span class="die hero">' + ART.die(6, d.last.a) + '</span>+<span class="die hero">' + ART.die(6, d.last.b) + '</span>= ' + d.last.s : d.state === 'pick' ? 'You back plane ' + d.pick + '. Win ' + d.prize + ' coins.' : '') + '</div>' +
    '<div class="derby">' + lanes + '</div><div class="m-row">' + foot + '</div>';
}
function renderDerby(keep) { var c = $('.modal-card'), y = c ? c.scrollTop : 0; UI.openModal(derbyHTML()); c = $('.modal-card'); if (keep) { c.style.animation = 'none'; c.scrollTop = y; } }
ACT.derby = function () {
  var S = UI.S, city = SH.cityById(S.city), fee = S.seen.derby ? 3 + 2 * city.tier : 0, n;
  derby = { state: 'pick', pick: derby && derby.pick ? derby.pick : 7, pos: {}, fee: fee, prize: 4 * (3 + 2 * city.tier), winner: 0, last: null };
  for (n = 2; n <= 12; n++) derby.pos[n] = 0;
  renderDerby(false);
};
ACT.derbyPick = function (d) { if (derby && derby.state === 'pick') { derby.pick = +d.n; renderDerby(true); } };
ACT.closeDerby = function () { derby = null; UI.closeModal(); UI.showCity(); };
ACT.derbyGo = async function () {
  var S = UI.S, d = derby;
  if (!d || d.state !== 'pick' || d.fee > S.coins) return;
  S.coins -= d.fee; S.seen.derby = 1; d.state = 'run'; UI.persist(); renderDerby(true);
  await sleep(T(500));
  while (derby === d && !d.winner) {
    d.last = SH.derbyStep(); d.pos[d.last.s]++;
    var dd = $('#derby-dice'), lane = $('#lane-' + d.last.s);
    if (!dd || !lane) return;
    dd.innerHTML = '<span class="die hero landed">' + ART.die(6, d.last.a) + '</span>+<span class="die hero landed">' + ART.die(6, d.last.b) + '</span>= ' + d.last.s;
    lane.style.width = 100 * d.pos[d.last.s] / SH.DERBY_GOAL + '%';
    sfx('tap');
    if (d.pos[d.last.s] >= SH.DERBY_GOAL) d.winner = d.last.s;
    await sleep(T(430));
  }
  if (derby !== d) return;
  d.state = 'done';
  if (d.winner === d.pick) { S.coins += d.prize; sfx('win'); UI.confetti(); } else sfx('bad');
  UI.persist(); renderDerby(true);
};
})();
