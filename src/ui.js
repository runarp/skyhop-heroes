/* Skyhop Heroes — screens: title, new game, city, world map, shop, team, settings. */
(function () {
'use strict';
var SH = window.SH, ART = window.ART;
var $ = function (s, el) { return (el || document).querySelector(s); };
var app = $('#app'), modalEl = $('#modal'), toastEl = $('#toast');
var KEY = 'skyhop-heroes.v1';
var UI = window.UI = { S: null, slot: -1, store: { saves: [null, null, null], settings: { sound: true, fast: false } }, ACT: {} };
var ACT = UI.ACT;

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function T(ms) { return UI.store.settings.fast ? Math.round(ms * 0.5) : ms; }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function ico(n, c) { return ART.icon(n, c); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------------------------------------------------------------- storage */
function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (!raw) return;
    var d = JSON.parse(raw);
    if (d && d.saves) {
      UI.store.saves = [d.saves[0] || null, d.saves[1] || null, d.saves[2] || null];
      if (d.settings) { UI.store.settings.sound = d.settings.sound !== false; UI.store.settings.fast = !!d.settings.fast; }
    }
  } catch (e) { /* storage blocked: the game still runs, it just cannot remember */ }
}
function persist() {
  if (UI.slot >= 0) UI.store.saves[UI.slot] = UI.S;
  try { localStorage.setItem(KEY, JSON.stringify({ v: 1, saves: UI.store.saves, settings: UI.store.settings })); } catch (e) { /* ignore */ }
}
function fixSave(s) {
  var blank = SH.newSave(s.name || 'Player', s.hero || 'bo'), k;
  for (k in blank) if (s[k] === undefined || s[k] === null && k !== 'gear') s[k] = blank[k];
  if (!s.gear) s.gear = { w: null, s: null, c: null };
  if (!s.brain) s.brain = blank.brain;
  if (!SH.cityById(s.city)) s.city = 'london';
  if (s.heroes.indexOf(s.hero) < 0) s.hero = s.heroes[0];
  return s;
}

/* ------------------------------------------------------------------ sound */
var AC = null;
function ac() {
  if (!UI.store.settings.sound) return null;
  try {
    if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); }
    if (AC.state === 'suspended') AC.resume();
  } catch (e) { return null; }
  return AC;
}
function tone(f, d, type, vol, at, to) {
  var a = ac(); if (!a) return;
  try {
    var t = a.currentTime + (at || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.03);
  } catch (e) { /* ignore */ }
}
var SFX = {
  tap: function () { tone(520, 0.05, 'triangle', 0.06); },
  roll: function () { for (var i = 0; i < 6; i++) tone(180 + Math.random() * 260, 0.035, 'square', 0.035, i * 0.07); },
  hit: function () { tone(190, 0.16, 'square', 0.13, 0, 70); tone(90, 0.2, 'sine', 0.16, 0.02, 50); },
  big: function () { tone(240, 0.22, 'sawtooth', 0.14, 0, 60); tone(70, 0.3, 'sine', 0.2, 0.03, 40); },
  miss: function () { tone(620, 0.16, 'sine', 0.06, 0, 240); },
  hurt: function () { tone(300, 0.2, 'sawtooth', 0.1, 0, 110); },
  dodge: function () { tone(440, 0.09, 'triangle', 0.08, 0, 760); },
  star: function () { tone(880, 0.09, 'triangle', 0.1); tone(1320, 0.14, 'triangle', 0.1, 0.08); },
  coin: function () { tone(988, 0.07, 'square', 0.06); tone(1319, 0.16, 'square', 0.06, 0.07); },
  heal: function () { tone(523, 0.1, 'sine', 0.1); tone(659, 0.1, 'sine', 0.1, 0.09); tone(784, 0.16, 'sine', 0.1, 0.18); },
  good: function () { tone(659, 0.1, 'triangle', 0.11); tone(784, 0.1, 'triangle', 0.11, 0.1); tone(1047, 0.2, 'triangle', 0.11, 0.2); },
  bad: function () { tone(330, 0.16, 'triangle', 0.09); tone(262, 0.24, 'triangle', 0.09, 0.15); },
  win: function () { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, 0.16, 'triangle', 0.12, i * 0.12); }); },
  lose: function () { [392, 349, 311, 262].forEach(function (f, i) { tone(f, 0.24, 'triangle', 0.1, i * 0.2); }); },
  fly: function () { tone(160, 1.1, 'sawtooth', 0.05, 0, 420); },
  level: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.14, 'square', 0.07, i * 0.09); }); }
};
function sfx(n) { if (SFX[n]) SFX[n](); }

/* ----------------------------------------------------------- modal, toast */
function openModal(html, cls) {
  modalEl.innerHTML = '<div class="modal-back"><div class="modal-card ' + (cls || '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
  modalEl.classList.add('on');
  return modalEl.firstChild;
}
function closeModal() { modalEl.classList.remove('on'); modalEl.innerHTML = ''; }
function waitPick(root) {
  return new Promise(function (res) {
    function h(e) {
      var p = e.target.closest('[data-pick]');
      if (!p || !root.contains(p)) return;
      root.removeEventListener('click', h); sfx('tap'); res(p.getAttribute('data-pick'));
    }
    root.addEventListener('click', h);
  });
}
function modalPick(html, cls) { var root = openModal(html, cls); return waitPick(root).then(function (v) { closeModal(); return v; }); }
function toast(html) { toastEl.innerHTML = '<div>' + html + '</div>'; }
function confetti() {
  var cols = ['#ffd23f', '#ff6b7d', '#3fd086', '#6ec6ff', '#9d86ff'], i, d;
  for (i = 0; i < 36; i++) {
    d = document.createElement('i'); d.className = 'confetti';
    d.style.left = Math.random() * 100 + '%'; d.style.background = cols[i % cols.length];
    d.style.animationDelay = Math.random() * 0.6 + 's'; d.style.animationDuration = 1.8 + Math.random() * 1.2 + 's';
    document.body.appendChild(d);
    (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3600); })(d);
  }
}

/* ------------------------------------------------------- shared fragments */
function coinChip() { return '<span class="chip" title="Coins">' + ico('coin') + '<b>' + fmt(UI.S.coins) + '</b></span>'; }
function starChip() { return '<span class="chip" title="Wonder Stars">' + ico('star') + '<b>' + UI.S.stars.length + '/' + SH.CITIES.length + '</b></span>'; }
function oddsViz(o, big) {
  if (!o) return '';
  if (o.total > 36) {
    var keys = Object.keys(o.dist).map(Number).sort(function (a, b) { return b - a; });
    return '<span class="odds strip">' + keys.map(function (k) { return '<i class="h' + Math.min(3, k) + '" style="width:' + (100 * o.dist[k] / o.total) + '%"></i>'; }).join('') + '</span>';
  }
  var cols = o.total === 36 ? 6 : o.total === 12 ? 6 : o.total === 8 ? 4 : o.total;
  var sz = big ? (o.total === 36 ? 24 : 34) : (o.total === 36 ? 6 : o.total >= 8 ? 9 : 12);
  return '<span class="odds' + (big ? ' big' : '') + '" style="grid-template-columns:repeat(' + cols + ',' + sz + 'px);grid-auto-rows:' + sz + 'px">' +
    o.cells.map(function (h) { return '<i class="h' + Math.min(3, h) + '"></i>'; }).join('') + '</span>';
}
function chanceHTML(o) { return o ? '<span class="mv-chance">' + o.win + ' in ' + o.total + '<small>' + SH.chanceWord(o.p) + '</small></span>' : '<span class="mv-chance">No roll<small>Sure thing</small></span>'; }
/* A move card. ctx = { need, u, shell, boost, stars, live } */
function moveCard(mv, key, ctx) {
  var o = SH.odds(mv, ctx.need), u = ctx.u, k = ctx.boost ? 2 : 1, sh = ctx.shell || 0, dmg = '', extra = '';
  var one = Math.max(1, SH.moveDamage(mv, u) * k - sh), m = SH.multFor(u) * k;
  if (mv.rule === 'heal') dmg = '<span class="mv-dmg">+' + ico('heart') + '</span>';
  else if (mv.rule === 'maxmult') dmg = '<span class="mv-dmg' + (ctx.boost ? ' x2' : '') + '">' + Math.max(1, m - sh) + '–' + Math.max(1, 6 * m - sh) + '</span>';
  else if (mv.rule === 'facemult') dmg = '<span class="mv-dmg' + (ctx.boost ? ' x2' : '') + '">' + Math.max(1, m - sh) + '–' + Math.max(1, 8 * m - sh) + '</span>';
  else dmg = '<span class="mv-dmg' + (ctx.boost ? ' x2' : '') + '">' + one + (mv.rule === 'each' || mv.rule === 'heads' ? ' each' : '') + '</span>';
  if (mv.burn) extra = ' Then it burns ' + u + ' for 2 rounds.';
  if (mv.stun) extra = ' The mob slips and misses its turn.';
  var dis = ctx.live && mv.kind === 'special' && ctx.stars < 3;
  var kind = { safe: 'Safe', strong: 'Strong', wild: 'Wild', special: 'Special · 3 stars' }[mv.kind];
  var odds = UI.S.showOdds || !ctx.live ? oddsViz(o) + chanceHTML(o) : '<span class="mv-chance">' + (o ? 'What are the chances?' : 'No roll') + '</span>';
  return '<button class="move ' + mv.kind + '"' + (ctx.live ? ' data-act="bMove" data-i="' + key + '"' : ' tabindex="-1"') + (dis ? ' disabled' : '') + '>' +
    '<span class="mv-top"><span><span class="mv-kind">' + kind + '</span><br><span class="mv-name">' + mv.name + '</span></span>' + dmg + '</span>' +
    '<span class="mv-rule">' + SH.ruleText(mv, ctx.need, u) + '.' + extra + '</span><span class="mv-odds">' + odds + '</span></button>';
}
function traitList(mob) {
  var t = SH.traitChips(mob);
  if (!t.length) return '<div class="trait"><span class="emo">🙂</span><span><b>No tricks.</b> Just bonk it.</span></div>';
  return t.map(function (x) { return '<div class="trait"><span class="emo">' + x.icon + '</span><span><b>' + x.name + '.</b> ' + x.text + '</span></div>'; }).join('');
}
function traitTags(mob) { return SH.traitChips(mob).map(function (x) { return '<span class="tag ' + x.k + '">' + x.icon + ' ' + x.name + '</span>'; }).join(''); }

/* ------------------------------------------------------------------ title */
function showTitle() {
  UI.S = null; UI.slot = -1; closeModal();
  var slots = UI.store.saves.map(function (s, i) {
    if (!s) return '<button class="slot empty" data-act="newGame" data-i="' + i + '">+ New game</button>';
    var c = SH.cityById(s.city) || SH.CITIES[0];
    return '<div class="slot"><button class="slot-main" data-act="play" data-i="' + i + '" aria-label="Play as ' + esc(s.name) + '"></button>' + ART.hero(s.hero) +
      '<div class="slot-info"><b>' + esc(s.name) + '</b><span class="small">Level ' + s.lvl + ' · ' + s.stars.length + ' stars<br>' + c.flag + ' ' + c.name + '</span></div>' +
      '<button class="slot-del" data-act="delSave" data-i="' + i + '" aria-label="Delete this game">✕</button></div>';
  }).join('');
  app.innerHTML = '<div class="screen title"><div class="title-inner">' +
    '<div class="logo"><div class="plane">' + ART.plane() + '</div><h1>Skyhop<br><span>Heroes</span></h1><p>Roll the dice. Use your brain. Win back the Wonder Stars!</p></div>' +
    '<div class="title-heroes">' + ART.hero('zip') + ART.hero('bo') + ART.hero('luna') + '</div>' +
    '<div class="slots">' + slots + '</div>' +
    '<div class="title-foot"><button class="btn ghost" data-act="howto">How to play</button><button class="btn ghost" data-act="sound">' + (UI.store.settings.sound ? '🔊 Sound on' : '🔇 Sound off') + '</button></div>' +
    '</div></div>';
}
ACT.sound = function () { UI.store.settings.sound = !UI.store.settings.sound; persist(); sfx('good'); if (!UI.S) showTitle(); };
ACT.play = function (d) {
  var s = UI.store.saves[+d.i]; if (!s) return;
  UI.slot = +d.i; UI.S = fixSave(s); persist(); showCity();
};
ACT.delSave = function (d) {
  var s = UI.store.saves[+d.i]; if (!s) return;
  modalPick('<h2>Delete this game?</h2><p><b>' + esc(s.name) + '</b>, level ' + s.lvl + ', ' + s.stars.length + ' stars. This cannot be undone.</p>' +
    '<div class="m-row"><button class="btn ghost" data-pick="no">Keep it</button><button class="btn red" data-pick="yes">Delete</button></div>').then(function (v) {
    if (v === 'yes') { UI.store.saves[+d.i] = null; persist(); showTitle(); }
  });
};

/* --------------------------------------------------------------- new game */
var ng = { slot: 0, hero: 'bo' };
function heroCard(id, on, extra) {
  var h = SH.HEROES[id];
  return '<button class="hcard' + (on ? ' on' : '') + '" data-act="ngHero" data-id="' + id + '">' + ART.hero(id) + '<h3>' + h.name + ' the ' + h.animal + '</h3>' +
    '<span class="soft small"><b>' + h.title + '</b></span><span class="tag">' + ico('heart') + ' ' + h.hp + ' hearts</span>' +
    '<span class="pass"><b>' + h.passive.name + ':</b> ' + h.passive.text + '</span><span class="small">' + h.tip + '</span>' + (extra || '') + '</button>';
}
ACT.newGame = function (d) { ng.slot = +d.i; ng.hero = 'bo'; ng.name = 'Player ' + (ng.slot + 1); showNewGame(); };
function showNewGame() {
  var cur = $('#ng-name'); if (cur) ng.name = cur.value;
  app.innerHTML = '<div class="screen newgame"><header class="bar"><button class="iconbtn" data-act="title" aria-label="Back">' + ico('back') + '</button><div class="plate-title"><h2>New game</h2></div></header>' +
    '<div class="ng-body"><label class="field" for="ng-name">Your name<input id="ng-name" maxlength="12" autocomplete="off" autocapitalize="words" spellcheck="false" value="' + esc(ng.name) + '"></label>' +
    '<h3>Pick your first hero</h3><div class="hero-pick">' + ['bo', 'zip', 'luna'].map(function (id) { return heroCard(id, id === ng.hero); }).join('') + '</div>' +
    '<p class="small soft">More heroes join you as you win Wonder Stars.</p>' +
    '<div class="m-row"><button class="btn big green" data-act="startGame">Start the adventure</button></div></div></div>';
}
ACT.title = function () { showTitle(); };
ACT.ngHero = function (d) { ng.hero = d.id; showNewGame(); };
ACT.startGame = function () {
  var name = ($('#ng-name').value || '').trim().slice(0, 12) || 'Player ' + (ng.slot + 1);
  UI.slot = ng.slot; UI.S = SH.newSave(name, ng.hero); persist();
  intro();
};
function intro() {
  var baron = SH.makeMob(SH.cityById('sky'), 3), h = SH.HEROES[UI.S.hero];
  var pages = [
    '<div class="m-art">' + ART.mob(baron) + '</div><h2>Oh no!</h2><p>Grumpy <b>Baron Grumble</b> has stolen the sparkle from the wonders of the world. Big Ben has lost its BONG. The pyramids look dull. Even the northern lights have gone out.</p>',
    '<div class="m-art scene">' + ART.scene('london') + '</div><h2>12 cities need you</h2><p>The Baron’s <b>Grumble Gang</b> is guarding a <b>Wonder Star</b> in every city. Win 3 fights, then beat the boss, and the star is yours.</p>',
    '<div class="m-art">' + ART.hero(UI.S.hero) + '</div><h2>Go, ' + esc(UI.S.name) + '!</h2><p>You and <b>' + h.name + '</b> start in London. Fights are won with dice and with <b>brains</b>: look at your chances, then choose.</p>'
  ];
  (function step(i) {
    modalPick(pages[i] + '<div class="m-row"><button class="btn big green" data-pick="ok">' + (i < pages.length - 1 ? 'Next' : 'Let’s go!') + '</button></div>').then(function () {
      if (i < pages.length - 1) step(i + 1); else showCity();
    });
  })(0);
}

/* ------------------------------------------------------------------- city */
function stageCard(city, i, prog) {
  var mob = SH.makeMob(city, i), state = prog > i ? 'done' : prog === i ? 'next' : 'locked';
  var badge = state === 'done' ? ico('check') : state === 'locked' ? ico('lock') : '';
  return '<button class="stage ' + state + (i === 3 ? ' boss' : '') + '" data-act="scout" data-i="' + i + '">' + (badge ? '<span class="st-badge">' + badge + '</span>' : '') +
    '<span class="st-n">' + (i === 3 ? 'Boss' : 'Fight ' + (i + 1)) + '</span>' + ART.mob(mob) + '<span class="st-name">' + (state === 'locked' ? '???' : mob.name) + '</span></button>';
}
function showCity() {
  var S = UI.S, city = SH.cityById(S.city), prog = S.prog[city.id] || 0, st = SH.heroStats(S), h = SH.HEROES[S.hero], boss = SH.makeMob(city, 3);
  var quest;
  if (prog >= 4) quest = '<b>' + cap(city.land) + (city.final ? ' are safe!' : ' sparkles again!') + '</b> You can still fight here for coins.<b class="fact">Did you know?</b>' + city.fact;
  else if (prog === 3) quest = '<b>' + boss.name + '</b> is guarding the Wonder Star. Peek at the boss before you fight!';
  else if (city.final) quest = 'Baron Grumble keeps all the stolen sparkle up here. Win <b>' + (3 - prog) + '</b> more ' + (3 - prog === 1 ? 'fight' : 'fights') + ' to reach him.';
  else quest = 'The Grumble Gang took the sparkle from <b>' + city.land + '</b>. Win <b>' + (3 - prog) + '</b> more ' + (3 - prog === 1 ? 'fight' : 'fights') + ' to reach the boss.';
  var stages = ''; for (var i = 0; i < 4; i++) stages += stageCard(city, i, prog);
  app.innerHTML = '<div class="screen cityscreen"><div class="city-top"><div class="city-bg">' + ART.scene(city.id) + '</div>' +
    '<header class="bar"><button class="iconbtn" data-act="settings" aria-label="Settings">' + ico('gear') + '</button>' +
    '<div class="plate-title"><h2>' + city.flag + ' ' + city.name + '</h2><small>' + city.country + '</small></div><span class="grow"></span>' + coinChip() + starChip() + '</header>' +
    '<div class="city-mid"><div class="city-hero">' + ART.hero(S.hero) + '</div><div class="bubble"><b>' + h.name + '</b> · Level ' + S.lvl + ' · ' + ico('heart') + ' ' + st.maxHp + ' · ' + ico('power') + ' ' + st.power + '<br>' + quest + '</div></div></div>' +
    '<div class="deck"><div class="stages">' + stages + '</div><div class="city-nav">' +
    '<button class="btn blue" data-act="shop">' + ico('shop') + 'Shop</button><button class="btn ghost" data-act="team">' + ico('bag') + 'Team</button>' +
    '<button class="btn grape" data-act="derby">' + ico('dice') + 'Dice Derby</button><button class="btn green" data-act="map">' + ico('plane') + 'World map</button></div></div></div>';
}
ACT.city = function () { showCity(); };
ACT.scout = function (d) {
  var S = UI.S, city = SH.cityById(S.city), i = +d.i, prog = S.prog[city.id] || 0;
  if (i > prog) { toast(i === 3 ? 'Win the 3 fights first. Then the boss comes out.' : 'Win the fight before this one first.'); return; }
  scoutModal(city, i);
};
function scoutModal(city, i) {
  var S = UI.S, mob = SH.makeMob(city, i), dg = SH.dangerWord(S, city.tier);
  var heads = S.heroes.map(function (id) { return '<button class="headbtn' + (id === S.hero ? ' on' : '') + '" data-act="scoutHero" data-id="' + id + '" data-i="' + i + '" aria-label="' + SH.HEROES[id].name + '">' + ART.hero(id) + '</button>'; }).join('');
  openModal('<div class="m-head"><h2 class="grow">' + mob.name + '</h2><span class="tag ' + dg.k + '">' + dg.w + '</span></div>' +
    '<div class="m-art">' + ART.mob(mob) + '</div><p class="center">' + mob.blurb + '</p>' +
    '<div class="kv"><div><small>Hearts</small><b>' + mob.hp + '</b></div><div><small>Hits for</small><b>' + mob.dmg + '</b></div><div><small>Attack dice</small><b>' + mob.ad + '</b></div><div><small>You win</small><b>' + mob.coins + ' coins</b></div></div>' +
    '<div class="traits">' + traitList(mob) + '</div>' +
    (S.heroes.length > 1 ? '<div><h3>Who should fight?</h3><div class="heads">' + heads + '</div><p class="small soft">' + SH.HEROES[S.hero].name + ': ' + SH.HEROES[S.hero].tip + '</p></div>' : '') +
    '<div class="m-row"><button class="btn ghost" data-act="closeModal">Not yet</button><button class="btn big red" data-act="fight" data-i="' + i + '">' + ico('sword') + 'Fight!</button></div>');
}
ACT.scoutHero = function (d) { UI.S.hero = d.id; persist(); showCity(); scoutModal(SH.cityById(UI.S.city), +d.i); };
ACT.closeModal = function () { closeModal(); };
ACT.fight = function (d) { closeModal(); UI.startBattle(SH.makeMob(SH.cityById(UI.S.city), +d.i)); };

/* -------------------------------------------------------------- world map */
var mapSel = null, flying = false;
function pinPos(c) { var p = ART.project(c.lon, c.lat); return [p[0] + c.pin[0], p[1] + c.pin[1]]; }
function showMap() {
  var S = UI.S, pins = '', routes = '';
  if (!mapSel || !SH.cityById(mapSel)) mapSel = S.city;
  SH.CITIES.forEach(function (c) {
    var p = ART.project(c.lon, c.lat), q = pinPos(c), open = SH.cityUnlocked(S, c), done = S.stars.indexOf(c.id) >= 0, here = c.id === S.city;
    var cls = here ? 'here' : !open ? 'locked' : done ? 'done' : 'open';
    var dot = here ? ART.hero(S.hero) : !open ? ico('lock') : done ? ico('star') : c.flag;
    routes += '<path d="M' + p[0] + ' ' + p[1] + ' L' + q[0] + ' ' + q[1] + '" stroke="#2a1f3d" stroke-width="2.5" fill="none"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="' + (open ? '#ffd23f' : '#cfc8dd') + '" stroke="#2a1f3d" stroke-width="2.5"/>';
    pins += '<button class="pin ' + cls + (c.id === mapSel ? ' sel' : '') + '" data-act="pin" data-id="' + c.id + '" style="left:' + (q[0] / 10) + '%;top:' + (q[1] / 4.8) + '%"><span class="pin-dot">' + dot + '</span><span class="pin-name">' + c.name + '</span></button>';
  });
  app.innerHTML = '<div class="screen mapscreen"><header class="bar"><button class="iconbtn" data-act="city" aria-label="Back to the city">' + ico('back') + '</button>' +
    '<div class="plate-title"><h2>World map</h2><small>Tap a city, then fly</small></div><span class="grow"></span>' + starChip() + '<span class="chip">' + ico('plane') + '<b>' + fmt(S.km) + ' km</b></span></header>' +
    '<div class="map-wrap" id="map-wrap"><div class="map-box" id="map-box">' + ART.worldMap() + '<svg class="routes" id="routes" viewBox="0 0 1000 480" preserveAspectRatio="none">' + routes + '</svg>' + pins + '</div></div>' +
    '<div class="deck"><div class="map-card" id="map-card"></div></div></div>';
  renderMapCard(); layoutMap(true);
}
function layoutMap(center) {
  var wrap = $('#map-wrap'), box = $('#map-box'); if (!wrap || !box) return;
  var cs = getComputedStyle(wrap), aw = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ah = wrap.clientHeight - 20;
  var w = Math.max(600, Math.min(aw, ah / 0.48));
  box.style.width = w + 'px'; box.style.height = w * 0.48 + 'px';
  if (center && w > aw) { var q = pinPos(SH.cityById(UI.S.city)); wrap.scrollLeft = q[0] / 1000 * w - wrap.clientWidth / 2; }
}
function renderMapCard() {
  var S = UI.S, c = SH.cityById(mapSel), here = SH.cityById(S.city), open = SH.cityUnlocked(S, c), done = S.stars.indexOf(c.id) >= 0, prog = S.prog[c.id] || 0;
  var dg = SH.dangerWord(S, c.tier), line, btn;
  if (!open) line = ico('lock') + ' Needs <b>' + c.need + ' Wonder Stars</b>. You have ' + S.stars.length + '.';
  else if (done) line = ico('star') + ' Wonder Star won! ' + cap(c.land) + (c.final ? ' are safe.' : ' sparkles again.');
  else line = 'Fights won: <b>' + prog + ' of 4</b>. ' + (c.final ? 'Baron Grumble’s castle. The last big fight.' : 'The gang took the sparkle from ' + c.land + '.');
  if (c.id === S.city) btn = '<button class="btn green" data-act="city">Go to the city</button>';
  else if (open) btn = '<button class="btn big green" data-act="fly">' + ico('plane') + 'Fly here</button>';
  else btn = '<button class="btn" disabled>' + ico('lock') + 'Locked</button>';
  $('#map-card').innerHTML = '<div class="stamp' + (done ? '' : ' off') + '">' + ART.stamp(c.id) + '</div><div class="grow"><h3>' + c.flag + ' ' + c.name + ' <span class="soft small">' + c.country + '</span></h3>' +
    '<p class="small">' + line + '</p><p class="small">' + (open ? '<span class="tag ' + dg.k + '">' + dg.w + '</span> ' : '') +
    (c.id !== S.city ? '<span class="tag">' + ico('plane') + ' ' + fmt(SH.distanceKm(here, c)) + ' km from ' + here.name + '</span>' : '<span class="tag">You are here</span>') + '</p></div><div class="mc-btn">' + btn + '</div>';
}
ACT.map = function () { mapSel = UI.S.city; showMap(); };
ACT.pin = function (d) {
  if (flying) return;
  mapSel = d.id;
  [].forEach.call(document.querySelectorAll('.pin'), function (p) { p.classList.toggle('sel', p.getAttribute('data-id') === mapSel); });
  renderMapCard();
};
ACT.fly = function () {
  var S = UI.S, from = SH.cityById(S.city), to = SH.cityById(mapSel);
  if (flying || !to || to.id === S.city || !SH.cityUnlocked(S, to)) return;
  flying = true; sfx('fly');
  var a = ART.project(from.lon, from.lat), b = ART.project(to.lon, to.lat), km = SH.distanceKm(from, to);
  var len = Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]));
  var cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2 - Math.min(130, 24 + len * 0.28);
  $('#routes').insertAdjacentHTML('beforeend', '<path d="M' + a[0] + ' ' + a[1] + ' Q' + cx + ' ' + cy + ' ' + b[0] + ' ' + b[1] + '" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="1 12" stroke-linecap="round"/>');
  var plane = document.createElement('div'); plane.className = 'fly-plane'; plane.innerHTML = ART.plane(); $('#map-box').appendChild(plane);
  $('#map-card').innerHTML = '<div class="grow center"><h3>' + from.name + ' → ' + to.name + '</h3><p>' + ico('plane') + ' <b>' + fmt(km) + ' km</b> through the sky…</p></div>';
  var dur = T(1000 + Math.min(1700, km / 6)), t0 = null;
  function frame(now) {
    if (t0 === null) t0 = now;
    var t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, u = 1 - e;
    var x = u * u * a[0] + 2 * u * e * cx + e * e * b[0], y = u * u * a[1] + 2 * u * e * cy + e * e * b[1];
    var dx = 2 * u * (cx - a[0]) + 2 * e * (b[0] - cx), dy = 2 * u * (cy - a[1]) + 2 * e * (b[1] - cy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    plane.style.left = x / 10 + '%'; plane.style.top = y / 4.8 + '%';
    plane.style.transform = 'rotate(' + ang + 'deg)' + (dx < 0 ? ' scaleY(-1)' : '');
    if (t < 1) requestAnimationFrame(frame);
    else { S.city = to.id; S.km += km; S.flights++; persist(); flying = false; showCity(); toast('Welcome to ' + to.name + '! You flew ' + fmt(km) + ' km.'); }
  }
  requestAnimationFrame(frame);
};

/* ------------------------------------------------------------------- shop */
function shopHTML() {
  var S = UI.S, city = SH.cityById(S.city), rows = '';
  city.gear.forEach(function (id) {
    var g = SH.GEAR[id], own = S.owned.indexOf(id) >= 0;
    rows += '<div class="row"><span class="emo">' + g.icon + '</span><span class="grow"><b>' + g.name + '</b> <span class="tag">' + SH.SLOT_NAMES[g.slot] + '</span><small>' + g.text + '</small></span>' +
      (own ? '<span class="tag easy">' + ico('check') + ' Yours</span>' : '<button class="btn sm" data-act="buyGear" data-id="' + id + '"' + (S.coins < g.price ? ' disabled' : '') + '>' + ico('coin') + g.price + '</button>') + '</div>';
  });
  SH.shopItems(city).forEach(function (id) {
    var it = SH.ITEMS[id], n = S.items[id] || 0;
    rows += '<div class="row"><span class="emo">' + it.icon + '</span><span class="grow"><b>' + it.name + '</b> <span class="soft small">you have ' + n + '</span><small>' + it.text + '</small></span>' +
      '<button class="btn sm" data-act="buyItem" data-id="' + id + '"' + (S.coins < it.price || n >= SH.MAXSTACK ? ' disabled' : '') + '>' + ico('coin') + it.price + '</button></div>';
  });
  return '<div class="m-head">' + ico('shop') + '<h2 class="grow">' + city.name + ' shop</h2>' + coinChip() + '</div><div class="list">' + rows + '</div>' +
    '<div class="m-row"><button class="btn ghost" data-act="closeModal">Done</button></div>';
}
ACT.shop = function () { openModal(shopHTML()); };
function refreshShop() { var card = $('.modal-card'), y = card ? card.scrollTop : 0; openModal(shopHTML()); card = $('.modal-card'); card.style.animation = 'none'; card.scrollTop = y; if ($('.cityscreen')) refreshCityBar(); }
function refreshCityBar() { var bar = $('.cityscreen .bar'); if (!bar) return; var chips = bar.querySelectorAll('.chip'); if (chips[0]) chips[0].outerHTML = coinChip(); }
ACT.buyItem = function (d) {
  var S = UI.S, it = SH.ITEMS[d.id];
  if (S.coins < it.price || (S.items[d.id] || 0) >= SH.MAXSTACK) return;
  S.coins -= it.price; SH.giveItem(S, d.id, 1); persist(); sfx('coin'); refreshShop();
};
ACT.buyGear = function (d) {
  var S = UI.S, g = SH.GEAR[d.id], cur = S.gear[g.slot] ? SH.GEAR[S.gear[g.slot]] : null;
  if (S.coins < g.price || S.owned.indexOf(d.id) >= 0) return;
  S.coins -= g.price; S.owned.push(d.id);
  if (!cur || (g.pow || 0) > (cur.pow || 0) || (g.dodge || 0) > (cur.dodge || 0)) S.gear[g.slot] = d.id;
  persist(); sfx('coin'); refreshShop(); showCityKeepModal();
  toast(g.icon + ' ' + g.name + (S.gear[g.slot] === d.id ? ' is on!' : ' is in your bag.'));
};
function showCityKeepModal() { var html = modalEl.innerHTML, on = modalEl.classList.contains('on'), y = $('.modal-card') ? $('.modal-card').scrollTop : 0; showCity(); if (on) { modalEl.innerHTML = html; modalEl.classList.add('on'); $('.modal-card').style.animation = 'none'; $('.modal-card').scrollTop = y; } }

/* ------------------------------------------------------------------- team */
var teamTab = 'heroes';
function joinText(id) {
  var out = [];
  SH.CITIES.forEach(function (c) { if (c.joins === id || (c.joins === 'starter' && SH.HEROES[id].starter)) out.push(c.name); });
  return out.length ? 'Joins when you win the star in ' + out.join(' or ') : '';
}
function teamHTML() {
  var S = UI.S, body = '';
  if (teamTab === 'heroes') {
    body = '<div class="hero-pick">' + SH.HERO_ORDER.map(function (id) {
      var own = S.heroes.indexOf(id) >= 0, h = SH.HEROES[id], st = SH.heroStats(S, id);
      if (!own) return '<div class="hcard locked">' + ART.hero(id) + '<h3>???</h3><span class="small">' + ico('lock') + ' ' + joinText(id) + '</span></div>';
      return '<button class="hcard' + (id === S.hero ? ' on' : '') + '" data-act="pickHero" data-id="' + id + '">' + ART.hero(id) + '<h3>' + h.name + ' the ' + h.animal + '</h3>' +
        '<span class="tag">' + ico('heart') + ' ' + st.maxHp + ' hearts</span><span class="pass"><b>' + h.passive.name + ':</b> ' + h.passive.text + '</span>' +
        '<span class="small">' + (id === S.hero ? '<b>Fighting now</b>' : 'Tap to choose') + '</span></button>';
    }).join('') + '</div>';
    var h = SH.HEROES[S.hero], st = SH.heroStats(S);
    body += '<h3>' + h.name + '’s moves <span class="soft small">Level ' + S.lvl + ' · Power ' + st.power + '</span></h3><div class="mvlist">' +
      h.moves.concat([h.special]).map(function (mv) { return moveCard(mv, '', { need: mv.need || 0, u: st.u, live: false }); }).join('') + '</div>' +
      '<p class="small soft">Green squares are the rolls that hit. Grey squares miss. Count them to see your chance.</p>';
  } else if (teamTab === 'bag') {
    ['w', 's', 'c'].forEach(function (slot) {
      var mine = S.owned.filter(function (id) { return SH.GEAR[id].slot === slot; });
      body += '<h3>' + SH.SLOT_NAMES[slot] + '</h3><div class="list">' + (mine.length ? mine.map(function (id) {
        var g = SH.GEAR[id], on = S.gear[slot] === id;
        return '<div class="row' + (on ? ' on' : '') + '"><span class="emo">' + g.icon + '</span><span class="grow"><b>' + g.name + '</b><small>' + g.text + '</small></span>' +
          '<button class="btn sm ' + (on ? 'ghost' : 'green') + '" data-act="equip" data-id="' + id + '">' + (on ? 'Take off' : 'Wear') + '</button></div>';
      }).join('') : '<p class="small soft">Nothing yet. Shops sell these.</p>') + '</div>';
    });
    var items = SH.ITEM_ORDER.filter(function (id) { return (S.items[id] || 0) > 0; });
    body += '<h3>Snacks and gadgets</h3><div class="list">' + (items.length ? items.map(function (id) {
      var it = SH.ITEMS[id];
      return '<div class="row"><span class="emo">' + it.icon + '</span><span class="grow"><b>' + it.name + ' × ' + S.items[id] + '</b><small>' + it.text + '</small></span></div>';
    }).join('') : '<p class="small soft">Your bag is empty.</p>') + '</div><p class="small soft">You use these during a fight. One item each round, and it does not cost your turn.</p>';
  } else {
    body = '<div class="kv"><div><small>Wonder Stars</small><b>' + S.stars.length + ' / ' + SH.CITIES.length + '</b></div><div><small>Flown</small><b>' + fmt(S.km) + ' km</b></div>' +
      '<div><small>Fights won</small><b>' + S.wins + '</b></div><div><small>Brain Boosts</small><b>' + S.brain.right + ' / ' + S.brain.asked + '</b></div></div>' +
      '<div class="stamps">' + SH.CITIES.map(function (c) {
        var done = S.stars.indexOf(c.id) >= 0;
        return '<div class="stampcell"><div class="stamp' + (done ? '' : ' off') + '">' + ART.stamp(c.id) + '</div>' + c.name + '</div>';
      }).join('') + '</div><p class="small soft">A stamp turns bright when you win that city’s Wonder Star. Round the world once is about 40,000 km.</p>';
  }
  return '<div class="m-head">' + ico('bag') + '<h2 class="grow">' + esc(S.name) + '’s team</h2>' + coinChip() + '</div>' +
    '<div class="tabs"><button class="tab' + (teamTab === 'heroes' ? ' on' : '') + '" data-act="tab" data-t="heroes">Heroes</button><button class="tab' + (teamTab === 'bag' ? ' on' : '') + '" data-act="tab" data-t="bag">Bag</button><button class="tab' + (teamTab === 'passport' ? ' on' : '') + '" data-act="tab" data-t="passport">Passport</button></div>' +
    body + '<div class="m-row"><button class="btn ghost" data-act="closeTeam">Done</button></div>';
}
function refreshTeam() { openModal(teamHTML(), 'wide'); $('.modal-card').style.animation = 'none'; }
ACT.team = function () { teamTab = 'heroes'; openModal(teamHTML(), 'wide'); };
ACT.tab = function (d) { teamTab = d.t; refreshTeam(); };
ACT.pickHero = function (d) { UI.S.hero = d.id; persist(); refreshTeam(); };
ACT.equip = function (d) { var S = UI.S, g = SH.GEAR[d.id]; S.gear[g.slot] = S.gear[g.slot] === d.id ? null : d.id; persist(); refreshTeam(); };
ACT.closeTeam = function () { closeModal(); showCity(); };

/* --------------------------------------------------------------- settings */
function seg(act, cur, opts) {
  return '<div class="seg">' + opts.map(function (o) { return '<button data-act="' + act + '" data-v="' + o[0] + '"' + (String(cur) === String(o[0]) ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div>';
}
function settingsHTML(inBattle) {
  var S = UI.S, st = UI.store.settings, lv = ['Easy', 'Medium', 'Hard'][SH.quizLevel(S, 0)];
  return '<div class="m-head">' + ico('gear') + '<h2>Settings</h2></div>' +
    '<div class="setrow"><b>Sound</b>' + seg('setSound', st.sound ? 1 : 0, [[1, 'On'], [0, 'Off']]) + '</div>' +
    '<div class="setrow"><b>Dice speed</b>' + seg('setFast', st.fast ? 1 : 0, [[0, 'Normal'], [1, 'Fast']]) + '</div>' +
    '<div class="setrow"><b>Brain Boost questions</b>' + seg('setBrain', S.brain.mode, [['auto', 'Auto'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'], ['off', 'Off']]) +
    '<span class="small soft">' + (S.brain.mode === 'auto' ? 'Auto follows the player. Three right in a row makes them harder, two wrong makes them easier. Now: ' + lv + '.' : S.brain.mode === 'off' ? 'No questions. The Brain Boost button is hidden.' : 'Always ' + lv.toLowerCase() + ' questions.') + '</span></div>' +
    '<div class="setrow"><b>Show the chances on every move</b>' + seg('setOdds', S.showOdds ? 1 : 0, [[1, 'Show'], [0, 'Hide']]) +
    '<span class="small soft">Hide them once counting faces is easy. Then the player has to work the chances out.</span></div>' +
    '<div class="m-row">' + (inBattle ? '<button class="btn red" data-act="runAway">Run away</button>' : '<button class="btn ghost" data-act="howto">How to play</button><button class="btn ghost" data-act="quit">Save and quit</button>') +
    '<button class="btn green" data-act="closeSettings">Done</button></div>';
}
var settingsInBattle = false;
ACT.settings = function () { settingsInBattle = false; openModal(settingsHTML(false)); };
UI.battleSettings = function () { settingsInBattle = true; openModal(settingsHTML(true)); };
function refreshSettings() { openModal(settingsHTML(settingsInBattle)); $('.modal-card').style.animation = 'none'; }
ACT.setSound = function (d) { UI.store.settings.sound = d.v === '1'; persist(); refreshSettings(); };
ACT.setFast = function (d) { UI.store.settings.fast = d.v === '1'; persist(); refreshSettings(); };
ACT.setBrain = function (d) { UI.S.brain.mode = d.v; UI.S.brain.streak = 0; persist(); refreshSettings(); };
ACT.setOdds = function (d) { UI.S.showOdds = d.v === '1'; persist(); refreshSettings(); };
ACT.closeSettings = function () { closeModal(); if (settingsInBattle && UI.battleRefresh) UI.battleRefresh(); };
ACT.quit = function () { persist(); showTitle(); };

var HOWTO = [
  ['Pick a move', 'Every move shows its chance. <b>Green squares</b> are rolls that hit. <b>Grey squares</b> miss. More green means a safer move.'],
  ['Safe, Strong or Wild?', '<b>Safe</b> moves hit often but softly. <b>Strong</b> moves hit harder but miss more. <b>Wild</b> moves are long shots with a giant bonk.'],
  ['Watch the mob', 'The bubble over the mob shows what it will do next. If a <b>BIG attack</b> is coming, press <b>Block</b>. You take half damage and roll an extra dodge die.'],
  ['Dodge!', 'When the mob attacks, you both roll. Roll <b>the same or higher</b> and you dodge. Ties are yours.'],
  ['Stars and brains', 'Rolling the top number on a die gives you a <b>star</b>. Blocking gives one too. Three stars power your <b>Special</b>. Answer a <b>Brain Boost</b> question and your next attack hits double.']
];
function howto(i, done) {
  var p = HOWTO[i];
  modalPick('<div class="m-head">' + ico('dice') + '<h2>' + p[0] + '</h2></div><p style="font-size:19px">' + p[1] + '</p><p class="small soft center">' + (i + 1) + ' of ' + HOWTO.length + '</p>' +
    '<div class="m-row"><button class="btn big green" data-pick="ok">' + (i < HOWTO.length - 1 ? 'Next' : 'Got it!') + '</button></div>').then(function () {
    if (i < HOWTO.length - 1) howto(i + 1, done); else if (done) done();
  });
}
UI.howto = howto;
ACT.howto = function () { howto(0, null); };

/* ------------------------------------------------------------------ wiring */
document.addEventListener('click', function (e) {
  var a = e.target.closest ? e.target.closest('[data-act]') : null;
  if (!a || a.disabled) return;
  var fn = ACT[a.getAttribute('data-act')];
  if (fn) { sfx('tap'); fn(a.dataset, a); }
});
document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
window.addEventListener('resize', function () { layoutMap(false); });

UI.$ = $; UI.sleep = sleep; UI.T = T; UI.esc = esc; UI.fmt = fmt; UI.ico = ico; UI.sfx = sfx; UI.persist = persist; UI.toast = toast; UI.confetti = confetti;
UI.openModal = openModal; UI.closeModal = closeModal; UI.modalPick = modalPick; UI.waitPick = waitPick; UI.moveCard = moveCard; UI.oddsViz = oddsViz;
UI.traitTags = traitTags; UI.showCity = showCity; UI.showTitle = showTitle; UI.app = app; UI.cap = cap;
UI.boot = function () { load(); showTitle(); };
})();
