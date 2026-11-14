/* Skyhop Heroes — rules engine. Pure logic, no DOM, so the same file runs in the
   browser and in the Node balance simulator (tools/sim.mjs). */
(function (root) {
'use strict';
var SH = {};

SH.MAXSTARS = 5;
SH.MAXLVL = 20;
/* Per-tier baselines. Tier 0 = London … tier 6 = Sky Fortress. */
SH.T = {
  HP:   [10, 24, 36, 48, 60, 70, 78],
  DMG:  [2, 4, 6, 8, 10, 12, 14],
  XP:   [10, 15, 20, 25, 30, 35, 40],
  COIN: [6, 10, 14, 18, 24, 30, 36],
  REC:  [1, 3, 5, 8, 10, 12, 14]
};
SH.rand = Math.random;
function ri(n) { return 1 + Math.floor(SH.rand() * n); }
function pick(a) { return a[Math.floor(SH.rand() * a.length)]; }
function shuffle(a) {
  a = a.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(SH.rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
function amax(a) { return Math.max.apply(null, a); }
SH.util = { ri: ri, pick: pick, shuffle: shuffle, sum: sum, max: amax };

SH.powerForLevel = function (L) { return 1 + Math.floor((L - 1) / 2); };
SH.xpNeed = function (L) { return 15 * L + 5; };

/* ------------------------------------------------------------------ heroes */
function D(s, n) { return { t: 'd', s: s, n: n }; }
function C(n) { return { t: 'c', n: n }; }

SH.HEROES = {
  bo: { id: 'bo', name: 'Bo', animal: 'Bear', title: 'The Big Bonker', hp: 14, starter: true,
    passive: { name: 'Thick Fur', text: 'Every hit hurts Bo a bit less.' },
    tip: 'Tough and simple. Great for a first trip.',
    moves: [
      { id: 'jab',  name: 'Paw Jab',    kind: 'safe',   roll: D(6, 1), rule: 'need', need: 2, m: 1 },
      { id: 'bump', name: 'Belly Bump', kind: 'strong', roll: D(6, 1), rule: 'need', need: 4, m: 2 },
      { id: 'slam', name: 'Mega Slam',  kind: 'wild',   roll: D(6, 1), rule: 'need', need: 6, m: 5, noGuard: true }
    ],
    special: { id: 'hug', name: 'Bear Hug', kind: 'special', roll: null, rule: 'sure', m: 2, heal: 0.25 } },

  zip: { id: 'zip', name: 'Zip', animal: 'Fox', title: 'The Quick One', hp: 10, starter: true,
    passive: { name: 'Quick Feet', text: 'Rolls an extra dodge die.' },
    tip: 'Rolls lots of dice. Hard to hit.',
    moves: [
      { id: 'kick', name: 'Quick Kick',    kind: 'safe',   roll: D(6, 2), rule: 'best', need: 3, m: 1 },
      { id: 'twin', name: 'Twin Strike',   kind: 'strong', roll: D(6, 2), rule: 'each', need: 4, m: 1 },
      { id: 'dbl',  name: 'Lucky Doubles', kind: 'wild',   roll: D(6, 2), rule: 'doubles', need: 0, m: 5, noGuard: true }
    ],
    special: { id: 'whirl', name: 'Whirlwind', kind: 'special', roll: D(6, 3), rule: 'each', need: 3, m: 1, noGuard: true } },

  luna: { id: 'luna', name: 'Luna', animal: 'Owl', title: 'The Star Wizard', hp: 11, starter: true,
    passive: { name: 'Stargazer', text: 'Starts every fight with 2 stars.' },
    tip: 'Adds two dice together. Seven is her friend.',
    moves: [
      { id: 'spark', name: 'Spark',       kind: 'safe',   roll: D(6, 1), rule: 'need', need: 2, m: 1 },
      { id: 'seven', name: 'Seven Spell', kind: 'strong', roll: D(6, 2), rule: 'sum', need: 7, m: 2 },
      { id: 'comet', name: 'Comet Crash', kind: 'wild',   roll: D(6, 2), rule: 'sum', need: 10, m: 5, noGuard: true }
    ],
    special: { id: 'storm', name: 'Star Storm', kind: 'special', roll: D(6, 2), rule: 'maxmult', m: 0 } },

  coco: { id: 'coco', name: 'Coco', animal: 'Parrot', title: 'The Coin Captain', hp: 12,
    passive: { name: 'Treasure Nose', text: 'Finds extra coins. Coin flips cannot be dodged.' },
    tip: 'Flips coins. Best against slippery mobs.',
    moves: [
      { id: 'peck',  name: 'Peck',         kind: 'safe',   roll: D(6, 1), rule: 'need', need: 2, m: 1 },
      { id: 'toss',  name: 'Coin Toss',    kind: 'strong', roll: C(2), rule: 'heads', need: 0, m: 1, noGuard: true },
      { id: 'allin', name: 'All Aboard!',  kind: 'wild',   roll: C(3), rule: 'allsame', need: 0, m: 4, noGuard: true }
    ],
    special: { id: 'cannon', name: 'Cannonball', kind: 'special', roll: null, rule: 'sure', m: 3 } },

  pip: { id: 'pip', name: 'Pip', animal: 'Penguin', title: 'The Inventor', hp: 11,
    passive: { name: 'Clever Clogs', text: 'Brain Boost comes back one round sooner.' },
    tip: 'Uses strange dice with 8 and 12 sides.',
    moves: [
      { id: 'zap',   name: 'Zap',          kind: 'safe',   roll: D(6, 1),  rule: 'need', need: 2, m: 1 },
      { id: 'gizmo', name: 'Gizmo Blast',  kind: 'strong', roll: D(8, 1),  rule: 'need', need: 5, m: 2 },
      { id: 'mega',  name: 'Mega Machine', kind: 'wild',   roll: D(12, 1), rule: 'need', need: 10, m: 4, noGuard: true }
    ],
    special: { id: 'robo', name: 'Robo-Punch', kind: 'special', roll: D(8, 1), rule: 'facemult', m: 0 } },

  mika: { id: 'mika', name: 'Mika', animal: 'Monkey', title: 'The Snack Chef', hp: 12,
    passive: { name: 'Snack Master', text: 'Snacks heal double. Spicy mobs cannot heal.' },
    tip: 'Spicy food keeps hurting. Banana peels stop attacks.',
    moves: [
      { id: 'spoon',  name: 'Spoon Bonk',  kind: 'safe',   roll: D(6, 1), rule: 'need', need: 2, m: 1 },
      { id: 'pepper', name: 'Pepper Toss', kind: 'strong', roll: D(6, 1), rule: 'need', need: 3, m: 1, burn: 2 },
      { id: 'peel',   name: 'Banana Peel', kind: 'strong', roll: D(6, 1), rule: 'need', need: 4, m: 1, stun: 1 }
    ],
    special: { id: 'feast', name: 'Big Feast', kind: 'special', roll: null, rule: 'heal', m: 0, heal: 0.5 } }
};
SH.HERO_ORDER = ['bo', 'zip', 'luna', 'coco', 'pip', 'mika'];

/* ------------------------------------------------------------------- items */
SH.ITEMS = {
  apple:    { name: 'Apple',         icon: '🍎', price: 4,  heal: 6,   text: 'Heal 6 hearts' },
  sandwich: { name: 'Sandwich',      icon: '🥪', price: 10, heal: 15,  text: 'Heal 15 hearts' },
  cake:     { name: 'Party Cake',    icon: '🍰', price: 28, heal: 999, text: 'Heal ALL hearts' },
  redie:    { name: 'Lucky Die',     icon: '🎲', price: 10, passive: true, text: 'Roll again after a bad roll' },
  bubble:   { name: 'Bubble Shield', icon: '🔮', price: 12, text: 'Pops the next hit on you' },
  bomb:     { name: 'Bonk Bomb',     icon: '💣', price: 14, text: 'Sure hit. No roll needed' },
  juice:    { name: 'Star Juice',    icon: '🧃', price: 16, text: 'Gives 3 stars' }
};
SH.ITEM_ORDER = ['apple', 'sandwich', 'cake', 'redie', 'bubble', 'bomb', 'juice'];
SH.MAXSTACK = 9;
var TIER_ITEMS = [
  ['apple', 'redie'],
  ['apple', 'sandwich', 'redie', 'bubble'],
  ['apple', 'sandwich', 'redie', 'bubble', 'bomb', 'juice'],
  ['sandwich', 'cake', 'redie', 'bubble', 'bomb', 'juice']
];

SH.GEAR = {
  w1: { slot: 'w', name: 'Brolly Bonker',     icon: '☂️', pow: 1, price: 15,  text: '+1 Power' },
  w2: { slot: 'w', name: 'Iron Mitts',        icon: '🥊', pow: 2, price: 45,  text: '+2 Power' },
  w3: { slot: 'w', name: 'Thunder Gloves',    icon: '⚡', pow: 3, price: 95,  text: '+3 Power' },
  w4: { slot: 'w', name: 'Rocket Fists',      icon: '🚀', pow: 4, price: 160, text: '+4 Power' },
  w5: { slot: 'w', name: 'Dragon Gloves',     icon: '🐉', pow: 5, price: 250, text: '+5 Power' },
  w6: { slot: 'w', name: 'Galaxy Gauntlets',  icon: '🌌', pow: 6, price: 360, text: '+6 Power' },
  s1: { slot: 's', name: 'Snow Boots',        icon: '🥾', dodge: 1, price: 60,  text: '+1 on every dodge roll' },
  s2: { slot: 's', name: 'Ninja Slippers',    icon: '👟', dodge: 2, price: 240, text: '+2 on every dodge roll' },
  c_beret:  { slot: 'c', name: 'Lucky Beret',   icon: '🍀', price: 50,  text: '1 free re-roll in every fight' },
  c_laurel: { slot: 'c', name: 'Laurel Crown',  icon: '🌿', price: 90,  text: 'Start every fight with 2 extra stars' },
  c_scarab: { slot: 'c', name: 'Scarab Amulet', icon: '🐞', price: 90,  hp: 6, text: '+6 hearts' },
  c_safari: { slot: 'c', name: 'Safari Hat',    icon: '👒', price: 130, text: 'Win half again as many coins' },
  c_lotus:  { slot: 'c', name: 'Lotus Charm',   icon: '🌸', price: 150, text: 'Heal 3 hearts every round' },
  c_abacus: { slot: 'c', name: 'Jade Abacus',   icon: '🧮', price: 200, text: 'Brain Boost comes back faster' },
  c_surf:   { slot: 'c', name: 'Surf Shield',   icon: '🏄', price: 260, text: 'Block rolls one more dodge die' },
  c_cap:    { slot: 'c', name: 'Big Apple Cap', icon: '🧢', price: 260, text: 'Top rolls give 2 stars, not 1' },
  c_mask:   { slot: 'c', name: 'Carnival Mask', icon: '🎭', price: 300, text: '2 free re-rolls in every fight' }
};
SH.SLOT_NAMES = { w: 'Bonker', s: 'Shoes', c: 'Charm' };

/* -------------------------------------------------------------------- mobs */
/* hpM/dmM multiply the tier baseline. pat: a=attack c=wind-up A=big attack g=hide h=rest. */
var MOBS = {
  pigeon:   { name: 'Pigeon Pest',      sp: 'bird',  c: ['#9db0c8', '#e8eef6'], hpM: 0.75, ad: 1, dmM: 1, pat: 'a', blurb: 'Steals chips. Not very tough.' },
  fogblob:  { name: 'Fog Blob',         sp: 'blob',  c: ['#a9b8cf', '#e3eaf5'], v: 'fog', hpM: 1, ad: 1, dmM: 1, pat: 'aag', blurb: 'Hides in the fog now and then.' },
  ticktock: { name: 'Sir Tick-Tock',    sp: 'robot', c: ['#dba43f', '#8a5a1c'], v: 'clock', boss: true, hpM: 2.4, ad: 2, dmM: 1, pat: 'aacA', blurb: 'Winds up… then BONG!' },

  rat:      { name: 'Baguette Bandit',  sp: 'rat',   c: ['#9a8f8a', '#f1d9c5'], v: 'bandit', hpM: 0.9, ad: 2, dmM: 0.7, thief: 1, pat: 'a', blurb: 'Grabs your coins and runs.' },
  cheese:   { name: 'Stinky Cheese',    sp: 'blob',  c: ['#f4c542', '#fff0a6'], v: 'cheese', hpM: 1.1, ad: 1, dmM: 1, regen: 2, pat: 'a', blurb: 'Oozes back together every round.' },
  gus:      { name: 'Gargoyle Gus',     sp: 'bat',   c: ['#8d93a6', '#c9cedb'], v: 'stone', boss: true, hpM: 2.2, ad: 2, dmM: 1, guard: 1, pat: 'aacAg', blurb: 'Flaps about. Hard to hit.' },

  frostbat: { name: 'Frost Bat',        sp: 'bat',   c: ['#7fc8ee', '#e3f6ff'], hpM: 0.8, ad: 2, dmM: 0.7, guard: 1, pat: 'a', blurb: 'Zig-zags through the snow.' },
  troll:    { name: 'Rock Troll',       sp: 'troll', c: ['#8fa58a', '#c9d8c0'], hpM: 1.2, ad: 1, dmM: 1.3, shell: 1, pat: 'aacA', blurb: 'Slow, but his club is heavy.' },
  trym:     { name: 'Troll King Trym',  sp: 'troll', c: ['#6f9c7a', '#bfe0c2'], v: 'king', boss: true, hpM: 2.5, ad: 2, dmM: 1, shell: 1, pat: 'acAa', blurb: 'Stole the northern lights.' },

  gladrat:  { name: 'Gladiator Rat',    sp: 'rat',   c: ['#b08968', '#f3dcc0'], v: 'glad', hpM: 1, ad: 2, dmM: 1, shell: 2, pat: 'aag', blurb: 'His helmet soaks up small hits.' },
  marble:   { name: 'Marble Pigeon',    sp: 'bird',  c: ['#d9d6cf', '#f7f5ee'], v: 'stone', hpM: 1.1, ad: 1, dmM: 1.25, shell: 3, pat: 'a', blurb: 'Made of stone. Hit it HARD.' },
  meatball: { name: 'Mega Meatball',    sp: 'blob',  c: ['#a85a3a', '#e08a5c'], v: 'meatball', boss: true, hpM: 2.6, ad: 2, dmM: 1, enrage: 1, pat: 'aacA', blurb: 'Rolls over everything. Gets angry.' },

  scorpion: { name: 'Sand Scorpion',    sp: 'crab',  c: ['#e0b060', '#f7dfa0'], v: 'scorpion', hpM: 0.9, ad: 2, dmM: 1, spiky: 2, pat: 'a', blurb: 'Prickly! Hitting it hurts you too.' },
  mummy:    { name: 'Mini Mummy',       sp: 'ghost', c: ['#eadfc4', '#fff8e4'], v: 'mummy', hpM: 1, ad: 1, dmM: 1.25, guard: 1, pat: 'aah', blurb: 'Wraps itself back up to heal.' },
  cleo:     { name: 'Queen Cleo-Cobra', sp: 'snake', c: ['#2fae9a', '#f6d04d'], v: 'pharaoh', boss: true, hpM: 2.2, ad: 3, dmM: 0.75, guard: 1, pat: 'aagacA', blurb: 'Sways and strikes fast.' },

  monkey:   { name: 'Cheeky Monkey',    sp: 'monkey', c: ['#a8703f', '#f0cfa0'], hpM: 0.9, ad: 2, dmM: 0.8, guard: 1, thief: 1, pat: 'a', blurb: 'Swings about and pinches coins.' },
  beetle:   { name: 'Rhino Beetle',     sp: 'crab',  c: ['#3b5b8c', '#7fa3d9'], v: 'beetle', hpM: 1.2, ad: 1, dmM: 1.4, shell: 3, pat: 'acA', blurb: 'Armour plated. Charges with its horn.' },
  roar:     { name: 'King Roar',        sp: 'cat',   c: ['#e8a63c', '#fbe3a8'], v: 'lion', boss: true, hpM: 2.4, ad: 2, dmM: 1, enrage: 1, pat: 'aacA', blurb: 'Loud. Gets louder when hurt.' },

  cobra:    { name: 'Dancing Cobra',    sp: 'snake', c: ['#5fb04b', '#d9f08a'], hpM: 0.9, ad: 2, dmM: 1, guard: 1, pat: 'aag', blurb: 'Never stays still.' },
  peacock:  { name: 'Proud Peacock',    sp: 'bird',  c: ['#1f9aa8', '#7fe0d0'], v: 'peacock', hpM: 1.1, ad: 2, dmM: 0.8, regen: 3, pat: 'aah', blurb: 'Stops to fix its feathers.' },
  stripes:  { name: 'Maharaja Stripes', sp: 'cat',   c: ['#f08a2c', '#ffe1b0'], v: 'tiger', boss: true, hpM: 2.2, ad: 3, dmM: 1, guard: 1, pat: 'agacA', blurb: 'Prowls, then pounces.' },

  ninja:    { name: 'Ninja Cat',        sp: 'cat',   c: ['#3a3550', '#8d86a8'], v: 'ninja', hpM: 0.8, ad: 2, dmM: 1, guard: 2, pat: 'a', blurb: 'Almost impossible to hit. Almost.' },
  sumo:     { name: 'Sumo Toad',        sp: 'blob',  c: ['#6fb04a', '#c9ec9a'], v: 'toad', hpM: 1.4, ad: 1, dmM: 1.5, shell: 2, pat: 'acA', blurb: 'Huge belly flop coming up.' },
  shogun:   { name: 'Shogun Bot',       sp: 'robot', c: ['#c8433c', '#5a2320'], v: 'samurai', boss: true, hpM: 2.3, ad: 3, dmM: 1, shell: 3, pat: 'aagcA', blurb: 'Steel armour. Small hits bounce off.' },

  lantern:  { name: 'Lantern Ghost',    sp: 'ghost', c: ['#e2483a', '#ffb347'], v: 'lantern', hpM: 0.9, ad: 2, dmM: 1, guard: 1, spiky: 3, pat: 'a', blurb: 'Hot to touch!' },
  terra:    { name: 'Clay Guard',       sp: 'troll', c: ['#c07a4f', '#e8b48c'], v: 'terra', hpM: 1.3, ad: 2, dmM: 1, shell: 4, pat: 'aag', blurb: 'Baked hard. Needs a big bonk.' },
  dragon:   { name: 'Jade Dragon Long', sp: 'snake', c: ['#2fa56b', '#b9f0c8'], v: 'dragon', boss: true, hpM: 2.3, ad: 3, dmM: 1, regen: 4, pat: 'aacA', blurb: 'Heals fast. Do not dawdle.' },

  surfcrab: { name: 'Surf Crab',        sp: 'crab',  c: ['#ff7a59', '#ffc2a8'], hpM: 1, ad: 2, dmM: 1, shell: 4, spiky: 3, pat: 'a', blurb: 'Hard shell AND prickly.' },
  dropbat:  { name: 'Drop Bat',         sp: 'bat',   c: ['#8a6a55', '#d9c2a8'], hpM: 0.9, ad: 3, dmM: 0.9, guard: 1, pat: 'cA', blurb: 'Climbs up… then drops on you.' },
  chomp:    { name: 'Captain Chomp',    sp: 'shark', c: ['#5f8fb8', '#e6f1fa'], boss: true, hpM: 2.4, ad: 3, dmM: 1, enrage: 1, pat: 'aacA', blurb: 'All teeth. Worse when angry.' },

  subrat:   { name: 'Subway Rat',       sp: 'rat',   c: ['#6f6a78', '#d8cfd8'], hpM: 1, ad: 2, dmM: 1, thief: 1, pat: 'a', blurb: 'Big-city pickpocket.' },
  taxibot:  { name: 'Taxi Bot',         sp: 'robot', c: ['#f6c62e', '#4a3b10'], v: 'taxi', hpM: 1.2, ad: 2, dmM: 1.1, shell: 3, pat: 'acA', blurb: 'Revs up, then zooms at you.' },
  pigeoni:  { name: 'Don Pigeoni',      sp: 'bird',  c: ['#6d7a92', '#cfd8e6'], v: 'don', boss: true, hpM: 2.3, ad: 3, dmM: 1, guard: 1, thief: 1, pat: 'aagacA', blurb: 'Boss of all the pigeons.' },

  toucan:   { name: 'Samba Toucan',     sp: 'bird',  c: ['#2b2b3a', '#fff3c4'], v: 'toucan', hpM: 0.9, ad: 2, dmM: 1, guard: 1, pat: 'aag', blurb: 'Dances out of the way.' },
  jaguar:   { name: 'Carnival Jaguar',  sp: 'cat',   c: ['#f2b632', '#fff0c0'], v: 'jaguar', hpM: 1.1, ad: 3, dmM: 1, pat: 'a', blurb: 'Fast claws. Rolls three dice.' },
  crabking: { name: 'Crab King Samba',  sp: 'crab',  c: ['#9a4fd0', '#e0b8ff'], v: 'king', boss: true, hpM: 2.3, ad: 2, dmM: 1.1, shell: 4, spiky: 3, pat: 'acAg', blurb: 'Shell, spikes and a crown.' },

  goon:     { name: 'Grumble Goon',     sp: 'troll', c: ['#8a6fc0', '#d3c2f2'], v: 'goon', hpM: 1, ad: 2, dmM: 1, pat: 'aacA', blurb: 'Works for the Baron.' },
  cloud:    { name: 'Thunder Cloud',    sp: 'ghost', c: ['#5a5f7a', '#b6bcd6'], v: 'cloud', hpM: 1, ad: 2, dmM: 1, guard: 1, spiky: 4, pat: 'a', blurb: 'Zaps you when you touch it.' },
  baron:    { name: 'Baron Grumble',    sp: 'troll', c: ['#7a55b8', '#d6c4f5'], v: 'baron', boss: true, hpM: 2.8, ad: 3, dmM: 1.1, shell: 3, enrage: 1, pat: 'aagcAh', blurb: 'He took all the sparkle.' }
};
SH.MOBS = MOBS;

/* ------------------------------------------------------------------ cities */
SH.CITIES = [
  { id: 'london', name: 'London', country: 'United Kingdom', flag: '🇬🇧', lon: -0.1, lat: 51.5, tier: 0, need: 0,
    land: 'Big Ben', mobs: ['pigeon', 'fogblob'], boss: 'ticktock', gear: ['w1'], joins: null, pin: [-46, -40],
    fact: 'Big Ben is really the name of the giant bell inside the clock tower.' },
  { id: 'paris', name: 'Paris', country: 'France', flag: '🇫🇷', lon: 2.35, lat: 48.85, tier: 1, need: 1,
    land: 'the Eiffel Tower', mobs: ['rat', 'cheese'], boss: 'gus', gear: ['w2', 'c_beret'], joins: 'coco', pin: [-52, 34],
    fact: 'On hot summer days the Eiffel Tower grows about 15 cm taller, because metal swells in the heat.' },
  { id: 'oslo', name: 'Oslo', country: 'Norway', flag: '🇳🇴', lon: 10.75, lat: 59.9, tier: 1, need: 1,
    land: 'the Northern Lights', mobs: ['frostbat', 'troll'], boss: 'trym', gear: ['w2', 's1'], joins: 'pip', pin: [46, -16],
    fact: 'In the middle of summer the sun stays up in Oslo for almost 19 hours a day.' },
  { id: 'rome', name: 'Rome', country: 'Italy', flag: '🇮🇹', lon: 12.5, lat: 41.9, tier: 2, need: 2,
    land: 'the Colosseum', mobs: ['gladrat', 'marble'], boss: 'meatball', gear: ['w3', 'c_laurel'], joins: 'starter', pin: [18, 42],
    fact: 'The Colosseum had room for about 50,000 people. That is as many as a big football stadium.' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', flag: '🇪🇬', lon: 31.2, lat: 30.0, tier: 2, need: 2,
    land: 'the Pyramids', mobs: ['scorpion', 'mummy'], boss: 'cleo', gear: ['w3', 'c_scarab'], joins: 'starter', pin: [44, 6],
    fact: 'The Great Pyramid was the tallest building on Earth for about 3,800 years.' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', flag: '🇰🇪', lon: 36.8, lat: -1.3, tier: 3, need: 4,
    land: 'the Savanna Sun', mobs: ['monkey', 'beetle'], boss: 'roar', gear: ['w4', 'c_safari'], joins: 'mika', pin: [44, 14],
    fact: 'Nairobi has a wild animal park right beside the city. You can see giraffes with skyscrapers behind them.' },
  { id: 'agra', name: 'Agra', country: 'India', flag: '🇮🇳', lon: 78.0, lat: 27.2, tier: 3, need: 4,
    land: 'the Taj Mahal', mobs: ['cobra', 'peacock'], boss: 'stripes', gear: ['w4', 'c_lotus'], joins: null, pin: [0, 46],
    fact: 'About 20,000 workers spent around 20 years building the Taj Mahal.' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', flag: '🇯🇵', lon: 139.7, lat: 35.7, tier: 4, need: 6,
    land: 'Mount Fuji', mobs: ['ninja', 'sumo'], boss: 'shogun', gear: ['w5', 's2'], joins: null, pin: [40, -34],
    fact: 'Greater Tokyo is the biggest city area in the world. About 37 million people live there.' },
  { id: 'beijing', name: 'Beijing', country: 'China', flag: '🇨🇳', lon: 116.4, lat: 39.9, tier: 4, need: 6,
    land: 'the Great Wall', mobs: ['lantern', 'terra'], boss: 'dragon', gear: ['w5', 'c_abacus'], joins: null, pin: [-30, -42],
    fact: 'All the parts of the Great Wall add up to more than 21,000 km. That is over halfway round the Earth.' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', flag: '🇦🇺', lon: 151.2, lat: -33.9, tier: 5, need: 8,
    land: 'the Opera House', mobs: ['surfcrab', 'dropbat'], boss: 'chomp', gear: ['w6', 'c_surf'], joins: null, pin: [-58, 6],
    fact: 'The roof of the Sydney Opera House is covered with more than one million tiles.' },
  { id: 'newyork', name: 'New York', country: 'United States', flag: '🇺🇸', lon: -74.0, lat: 40.7, tier: 5, need: 8,
    land: 'the Statue of Liberty', mobs: ['subrat', 'taxibot'], boss: 'pigeoni', gear: ['w6', 'c_cap'], joins: null, pin: [-40, -40],
    fact: 'The Statue of Liberty was a present from France. It crossed the sea in 350 pieces.' },
  { id: 'rio', name: 'Rio', country: 'Brazil', flag: '🇧🇷', lon: -43.2, lat: -22.9, tier: 5, need: 8,
    land: 'Sugarloaf Mountain', mobs: ['toucan', 'jaguar'], boss: 'crabking', gear: ['w6', 'c_mask'], joins: null, pin: [44, 30],
    fact: 'The giant statue above Rio has arms that stretch 28 metres from fingertip to fingertip.' },
  { id: 'sky', name: 'Sky Fortress', country: 'Above the clouds', flag: '🏰', lon: -34, lat: 44, tier: 6, need: 10,
    land: 'all the Wonder Stars', mobs: ['goon', 'cloud'], boss: 'baron', gear: [], joins: null, pin: [0, -46], final: true,
    fact: 'A fluffy white cloud can weigh as much as 100 elephants. It floats because it is spread out so thinly.' }
];
SH.cityById = function (id) { for (var i = 0; i < SH.CITIES.length; i++) if (SH.CITIES[i].id === id) return SH.CITIES[i]; return null; };
SH.shopItems = function (city) { return TIER_ITEMS[Math.min(3, city.tier)]; };

/* Great-circle distance in km (haversine, mean Earth radius 6371 km). */
SH.distanceKm = function (a, b) {
  var R = 6371, toR = Math.PI / 180;
  var dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
  var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(s))));
};

/* Build a concrete mob for a city stage. stage 0,1 = regular, 2 = big version, 3 = boss. */
SH.makeMob = function (city, stage) {
  var t = city.tier, id, big = false;
  if (stage >= 3) id = city.boss;
  else if (stage === 2) { id = city.mobs[0]; big = true; }
  else id = city.mobs[stage];
  var d = MOBS[id];
  var hp = Math.max(4, Math.round(SH.T.HP[t] * d.hpM * (big ? 1.3 : 1)));
  var dmg = Math.max(1, Math.round(SH.T.DMG[t] * d.dmM));
  var boss = !!d.boss;
  return {
    id: id, name: (big ? 'Big ' : '') + d.name, sp: d.sp, c: d.c, v: d.v || '', boss: boss, big: big, tier: t, city: city.id, stage: stage,
    hp: hp, ad: d.ad + (big && d.ad < 2 ? 1 : 0), dmg: dmg, guard: d.guard || 0, shell: d.shell || 0, spiky: d.spiky || 0,
    regen: d.regen || 0, thief: d.thief ? 3 * (t + 1) : 0, enrage: !!d.enrage, pat: d.pat, blurb: d.blurb,
    coins: Math.round(SH.T.COIN[t] * (boss ? 4 : big ? 1.3 : 1)), xp: Math.round(SH.T.XP[t] * (boss ? 3 : big ? 1.2 : 1))
  };
};

SH.traitChips = function (mob) {
  var out = [];
  if (mob.guard) out.push({ k: 'slip', icon: '💨', name: mob.guard > 1 ? 'Super slippery' : 'Slippery', text: 'You need ' + mob.guard + ' more on most rolls.' });
  if (mob.shell) out.push({ k: 'shell', icon: '🛡️', name: 'Tough ' + mob.shell, text: 'Every hit does ' + mob.shell + ' less. Use BIG hits.' });
  if (mob.spiky) out.push({ k: 'spiky', icon: '🌵', name: 'Prickly ' + mob.spiky, text: 'Each hit you land costs you ' + mob.spiky + '.' });
  if (mob.regen) out.push({ k: 'regen', icon: '💚', name: 'Heals ' + mob.regen, text: 'Gets ' + mob.regen + ' hearts back every round.' });
  if (mob.thief) out.push({ k: 'thief', icon: '💰', name: 'Thief', text: 'Steals coins when it hits. Win to get them back.' });
  if (mob.enrage) out.push({ k: 'rage', icon: '😡', name: 'Gets angry', text: 'Hits harder when its hearts are half gone.' });
  return out;
};

/* ------------------------------------------------------------- dice & odds */
SH.rollFaces = function (roll) {
  var out = [], i;
  if (!roll) return out;
  for (i = 0; i < roll.n; i++) out.push(roll.t === 'c' ? (SH.rand() < 0.5 ? 1 : 0) : ri(roll.s));
  return out;
};
SH.enumFaces = function (roll) {
  var out = [[]], sides = roll.t === 'c' ? 2 : roll.s, i, j, k, next;
  for (i = 0; i < roll.n; i++) {
    next = [];
    for (j = 0; j < out.length; j++) for (k = 1; k <= sides; k++) next.push(out[j].concat(roll.t === 'c' ? 2 - k : k));
    out = next;
  }
  return out;
};
SH.hitsOf = function (move, faces, need) {
  var i, n = 0;
  switch (move.rule) {
    case 'need': return faces[0] >= need ? 1 : 0;
    case 'best': return amax(faces) >= need ? 1 : 0;
    case 'each': for (i = 0; i < faces.length; i++) if (faces[i] >= need) n++; return n;
    case 'sum': return sum(faces) >= need ? 1 : 0;
    case 'doubles':
    case 'allsame': for (i = 1; i < faces.length; i++) if (faces[i] !== faces[0]) return 0; return 1;
    case 'heads': return sum(faces);
    case 'sure': case 'maxmult': case 'facemult': return 1;
    default: return 0;
  }
};
/* Exact odds by counting every way the dice can land. null = no roll to miss. */
SH.odds = function (move, need) {
  if (!move.roll || move.rule === 'sure' || move.rule === 'maxmult' || move.rule === 'facemult' || move.rule === 'heal') return null;
  var all = SH.enumFaces(move.roll), cells = [], win = 0, dist = {}, i, h;
  for (i = 0; i < all.length; i++) {
    h = SH.hitsOf(move, all[i], need);
    cells.push(h); if (h > 0) win++; dist[h] = (dist[h] || 0) + 1;
  }
  return { total: all.length, win: win, cells: cells, dist: dist, p: win / all.length };
};
SH.chanceWord = function (p) {
  if (p >= 0.999) return 'Sure thing';
  if (p >= 0.8) return 'Almost sure';
  if (p >= 0.6) return 'Good chance';
  if (p >= 0.4) return 'Coin flip';
  if (p >= 0.2) return 'Risky';
  if (p > 0) return 'Long shot';
  return 'No chance';
};
SH.needCap = function (move) {
  if (move.rule === 'sum') return move.roll.s * move.roll.n;
  return move.roll && move.roll.t === 'd' ? move.roll.s : 0;
};
SH.ruleText = function (move, need, u) {
  var s = move.roll && move.roll.s;
  switch (move.rule) {
    case 'need': return (s !== 6 ? s + '-sided die. ' : '') + (need >= s ? 'Roll a ' + s : 'Roll ' + need + ' or more');
    case 'best': return '2 dice, keep the best. ' + (need >= 6 ? 'Need a 6' : 'Need ' + need + ' or more');
    case 'each': return move.roll.n + ' dice. Each ' + (need >= 6 ? '6' : need + ' or more') + ' is a hit';
    case 'sum': return 'Add 2 dice. Need ' + need + ' or more';
    case 'doubles': return 'Roll doubles';
    case 'heads': return 'Flip ' + move.roll.n + ' coins. Each heads is a hit';
    case 'allsame': return 'Flip 3 coins. All the same wins';
    case 'sure': return 'Always hits' + (move.heal ? ' and heals you' : '');
    case 'maxmult': return 'Roll 2 dice. Bigger one × ' + SH.multFor(u);
    case 'facemult': return '8-sided die. Your roll × ' + SH.multFor(u);
    case 'heal': return 'Get half your hearts back';
    default: return '';
  }
};

/* -------------------------------------------------------------- hero stats */
SH.heroStats = function (save, heroId) {
  var id = heroId || save.hero, h = SH.HEROES[id], g = save.gear || {}, G = SH.GEAR;
  var w = g.w ? G[g.w] : null, s = g.s ? G[g.s] : null, c = g.c ? G[g.c] : null;
  var power = SH.powerForLevel(save.lvl) + (w ? w.pow : 0);
  return {
    id: id, power: power, u: power + 1,
    maxHp: h.hp + 3 * (save.lvl - 1) + (c && c.hp ? c.hp : 0),
    dodge: s ? s.dodge : 0, defDice: 1 + (id === 'zip' ? 1 : 0), charm: g.c || null
  };
};
SH.moveDamage = function (move, u) { return Math.max(1, Math.round(move.m * u)); };
SH.multFor = function (u) { return Math.max(1, Math.floor(u / 2)); };

/* ------------------------------------------------------------------ battle */
SH.newBattle = function (save, mob) {
  var st = SH.heroStats(save), c = st.charm;
  return {
    save: save, tier: mob.tier, round: 1,
    hero: { id: st.id, hp: st.maxHp, maxHp: st.maxHp, u: st.u, power: st.power, dodge: st.dodge, defDice: st.defDice, charm: c,
      stars: Math.min(SH.MAXSTARS, (st.id === 'luna' ? 2 : 0) + (c === 'c_laurel' ? 2 : 0)),
      freeRerolls: c === 'c_beret' ? 1 : c === 'c_mask' ? 2 : 0,
      boost: false, boostCd: 0, block: false, bubble: false, itemUsed: false, stolen: 0 },
    mob: { def: mob, hp: mob.hp, maxHp: mob.hp, guard: mob.guard, shell: mob.shell, spiky: mob.spiky, regen: mob.regen, thief: mob.thief,
      ad: mob.ad, dmg: mob.dmg, pat: mob.pat, pi: 0, burn: 0, burnDmg: 0, stun: 0, angry: false }
  };
};
SH.intent = function (b) {
  var m = b.mob, ch = m.pat.charAt(m.pi % m.pat.length), dmg = m.dmg;
  if (ch === 'A') dmg = m.dmg * 2;
  if (m.angry) dmg = Math.round(dmg * 1.25);
  return { t: ch, dmg: dmg, ad: Math.min(4, m.ad + (m.angry ? 1 : 0)), heal: Math.max(1, Math.round(m.maxHp * 0.08)) };
};
SH.guardNow = function (b) { return b.mob.guard + (SH.intent(b).t === 'g' ? 1 : 0); };
SH.needFor = function (b, move) {
  if (!move.roll || !move.need) return move.need || 0;
  if (move.noGuard) return move.need;
  return Math.min(SH.needCap(move), move.need + SH.guardNow(b));
};
SH.boostCooldown = function (b) {
  var n = 4;
  if (b.hero.id === 'pip') n--;
  if (b.hero.charm === 'c_abacus') n--;
  return Math.max(1, n);
};
SH.addStars = function (b, n) { b.hero.stars = Math.max(0, Math.min(SH.MAXSTARS, b.hero.stars + n)); };
SH.topFaces = function (b, roll, faces) {
  var n = 0, i;
  if (!roll || !faces.length) return 0;
  if (roll.t === 'c') n = sum(faces) === faces.length ? 1 : 0;
  else for (i = 0; i < faces.length; i++) if (faces[i] === roll.s) n++;
  return n * (b.hero.charm === 'c_cap' ? 2 : 1);
};
SH.dmgEach = function (b, move, faces) {
  var u = b.hero.u;
  if (move.rule === 'maxmult') return amax(faces) * SH.multFor(u);
  if (move.rule === 'facemult') return faces[0] * SH.multFor(u);
  return SH.moveDamage(move, u);
};
SH.checkAngry = function (b) {
  var m = b.mob;
  if (m.def.enrage && !m.angry && m.hp > 0 && m.hp <= m.maxHp / 2) { m.angry = true; return true; }
  return false;
};
/* Hero attack with already-rolled faces. Mutates b and returns what happened. */
SH.heroAttack = function (b, move, faces) {
  var h = b.hero, m = b.mob, need = SH.needFor(b, move), i, d;
  var r = { need: need, hits: 0, per: [], dmg: 0, spiky: 0, heal: 0, stars: 0, boost: false, burn: false, stun: false, angry: false };
  r.stars = SH.topFaces(b, move.roll, faces);
  SH.addStars(b, r.stars);
  if (move.rule === 'heal') {
    r.heal = Math.min(h.maxHp - h.hp, Math.round(h.maxHp * move.heal)); h.hp += r.heal; return r;
  }
  r.hits = SH.hitsOf(move, faces, need);
  if (h.boost) { r.boost = true; h.boost = false; }
  if (r.hits > 0) {
    var each = SH.dmgEach(b, move, faces) * (r.boost ? 2 : 1);
    for (i = 0; i < r.hits; i++) { d = Math.max(1, each - m.shell); r.per.push(d); r.dmg += d; }
    m.hp = Math.max(0, m.hp - r.dmg);
    if (m.spiky) { r.spiky = Math.min(h.hp - 1, m.spiky * r.hits); if (r.spiky < 0) r.spiky = 0; h.hp -= r.spiky; }
    if (move.burn && m.hp > 0) { m.burn = move.burn; m.burnDmg = h.u; r.burn = true; }
    if (move.stun && m.hp > 0) { m.stun = 1; r.stun = true; }
    if (move.heal) { r.heal = Math.min(h.maxHp - h.hp, Math.round(h.maxHp * move.heal)); h.hp += r.heal; }
    r.angry = SH.checkAngry(b);
  }
  return r;
};
SH.useItem = function (b, id) {
  var h = b.hero, m = b.mob, it = SH.ITEMS[id], r = { id: id, heal: 0, dmg: 0, stars: 0, angry: false };
  if (it.heal) { r.heal = Math.min(h.maxHp - h.hp, it.heal * (h.id === 'mika' ? 2 : 1)); h.hp += r.heal; }
  else if (id === 'bubble') h.bubble = true;
  else if (id === 'bomb') { r.dmg = Math.max(1, 2 * h.u - m.shell); m.hp = Math.max(0, m.hp - r.dmg); r.angry = SH.checkAngry(b); }
  else if (id === 'juice') { r.stars = Math.min(3, SH.MAXSTARS - h.stars); SH.addStars(b, 3); }
  h.itemUsed = true;
  return r;
};
SH.mobTick = function (b) {
  var m = b.mob, r = { burn: 0, stunned: false, angry: false };
  if (m.burn > 0) { r.burn = Math.min(m.hp, m.burnDmg); m.hp -= r.burn; m.burn--; r.angry = SH.checkAngry(b); }
  if (m.stun > 0) { r.stunned = true; m.stun--; }
  return r;
};
SH.defDiceCount = function (b) {
  var h = b.hero;
  return h.defDice + (h.block ? 1 + (h.charm === 'c_surf' ? 1 : 0) : 0);
};
/* Risk-style clash: mob's best die against yours. Ties go to the defender (you). */
SH.dodgeNeed = function (b, mobFaces) { return amax(mobFaces) - b.hero.dodge; };
SH.resolveMobAttack = function (b, mobFaces, heroFaces) {
  var it = SH.intent(b), h = b.hero, m = b.mob;
  var mb = amax(mobFaces), hb = heroFaces.length ? amax(heroFaces) + h.dodge : 99;
  var r = { hit: mb > hb, mb: mb, hb: hb, dmg: 0, bubble: false, stolen: 0, stars: 0 };
  r.stars = SH.topFaces(b, { t: 'd', s: 6 }, heroFaces); SH.addStars(b, r.stars);
  if (r.hit) {
    if (h.bubble) { h.bubble = false; r.bubble = true; }
    else {
      var d = it.dmg;
      if (h.block) d = Math.floor(d / 2);
      if (h.id === 'bo') d -= Math.max(1, Math.floor(d / 4));
      d = Math.max(1, d);
      r.dmg = Math.min(h.hp, d); h.hp -= r.dmg;
      if (m.thief && b.save.coins > 0) { r.stolen = Math.min(b.save.coins, m.thief); b.save.coins -= r.stolen; h.stolen += r.stolen; }
    }
  }
  return r;
};
SH.mobRest = function (b) {
  var m = b.mob, n = m.burn > 0 ? 0 : Math.min(m.maxHp - m.hp, SH.intent(b).heal); m.hp += n; return n;
};
SH.endRound = function (b) {
  var m = b.mob, h = b.hero, r = { regen: 0, lotus: 0 };
  if (m.regen && m.burn <= 0 && m.hp > 0 && m.hp < m.maxHp) { r.regen = Math.min(m.maxHp - m.hp, m.regen); m.hp += r.regen; }
  m.pi++; b.round++;
  h.block = false; h.itemUsed = false;
  if (h.boostCd > 0) h.boostCd--;
  if (h.charm === 'c_lotus' && h.hp > 0 && h.hp < h.maxHp) { r.lotus = Math.min(3, h.maxHp - h.hp); h.hp += r.lotus; }
  return r;
};

/* ----------------------------------------------------------------- rewards */
SH.newSave = function (name, heroId) {
  return { v: 1, name: name, hero: heroId, heroes: [heroId], lvl: 1, xp: 0, coins: 10,
    items: { apple: 2, redie: 1 }, gear: { w: null, s: null, c: null }, owned: [],
    city: 'london', prog: {}, stars: [], km: 0, flights: 0, wins: 0, losses: 0,
    brain: { mode: 'auto', lvl: 0, streak: 0, right: 0, asked: 0 }, showOdds: true, seen: {}, done: false };
};
SH.addXp = function (save, xp) {
  var ups = 0;
  save.xp += xp;
  while (save.lvl < SH.MAXLVL && save.xp >= SH.xpNeed(save.lvl)) { save.xp -= SH.xpNeed(save.lvl); save.lvl++; ups++; }
  if (save.lvl >= SH.MAXLVL) save.xp = 0;
  return ups;
};
SH.dropFor = function (mob) {
  if (mob.boss) return mob.tier >= 3 ? 'cake' : 'sandwich';
  if (SH.rand() > 0.35) return null;
  var pool = mob.tier === 0 ? ['apple', 'apple', 'redie'] : mob.tier <= 2 ? ['apple', 'sandwich', 'redie', 'bubble'] : ['sandwich', 'sandwich', 'redie', 'bubble', 'bomb', 'juice'];
  return pick(pool);
};
SH.giveItem = function (save, id, n) {
  save.items[id] = Math.min(SH.MAXSTACK, (save.items[id] || 0) + (n || 1));
};
/* Apply a win. Returns a summary for the victory screen. */
SH.winBattle = function (b) {
  var s = b.save, mob = b.mob.def, mult = 1;
  if (b.hero.id === 'coco') mult += 0.25;
  if (b.hero.charm === 'c_safari') mult += 0.5;
  var r = { coins: Math.round(mob.coins * mult), back: b.hero.stolen, xp: mob.xp, ups: 0, drop: SH.dropFor(mob),
    lvlFrom: s.lvl, star: false, joined: null, firstClear: false, unlocked: [] };
  s.coins += r.coins + r.back;
  r.ups = SH.addXp(s, r.xp);
  if (r.drop) SH.giveItem(s, r.drop, 1);
  s.wins++;
  var city = SH.cityById(mob.city), before = s.stars.length;
  var prog = s.prog[city.id] || 0;
  if (mob.stage === prog && prog < 4) { s.prog[city.id] = prog + 1; r.firstClear = true; }
  if (mob.boss && s.stars.indexOf(city.id) < 0) {
    s.stars.push(city.id); r.star = true;
    r.joined = SH.joinHero(s, city);
    SH.CITIES.forEach(function (c) { if (c.need > before && c.need <= s.stars.length) r.unlocked.push(c.id); });
    if (city.final) s.done = true;
  }
  return r;
};
SH.joinHero = function (save, city) {
  var id = city.joins, i;
  if (!id) return null;
  if (id === 'starter') {
    id = null;
    for (i = 0; i < SH.HERO_ORDER.length; i++) {
      var h = SH.HEROES[SH.HERO_ORDER[i]];
      if (h.starter && save.heroes.indexOf(h.id) < 0) { id = h.id; break; }
    }
  }
  if (!id || save.heroes.indexOf(id) >= 0) return null;
  save.heroes.push(id);
  return id;
};
SH.loseBattle = function (b) {
  var s = b.save, r = { xp: Math.round(b.mob.def.xp / 3), ups: 0, lost: b.hero.stolen };
  r.ups = SH.addXp(s, r.xp); s.losses++;
  return r;
};
SH.cityUnlocked = function (save, city) { return save.stars.length >= city.need; };
SH.dangerWord = function (save, tier) {
  var d = save.lvl - SH.T.REC[tier];
  if (d >= 2) return { w: 'Easy', k: 'easy' };
  if (d >= 0) return { w: 'Fair fight', k: 'fair' };
  if (d >= -2) return { w: 'Tough', k: 'tough' };
  return { w: 'Scary!', k: 'scary' };
};

/* ------------------------------------------------------- Brain Boost quiz */
function numChoices(ans, pool) {
  var out = [ans], cands = shuffle(pool.filter(function (x) { return x !== ans; })), i = 0;
  while (out.length < 4 && i < cands.length) { if (out.indexOf(cands[i]) < 0) out.push(cands[i]); i++; }
  out.sort(function (a, b) { return a - b; });
  return { choices: out.map(String), a: out.indexOf(ans) };
}
function strChoices(list, ans) { return { choices: list, a: list.indexOf(ans) }; }
function waysToSum(s) { return 6 - Math.abs(7 - s); }
function Q(text, c, why, viz) { return { q: text, choices: c.choices, a: c.a, why: why, viz: viz || null }; }

var QUIZ = [
  /* ---- level 0: one die, one coin ---- */
  [
    function () { var n = 2 + Math.floor(SH.rand() * 5);
      return Q('You need ' + n + ' or more on one die. How many of its 6 faces will do?', numChoices(7 - n, [1, 2, 3, 4, 5, 6]),
        (7 - n) + ' of the 6 faces are ' + n + ' or more.', { t: 'faces', s: 6, fn: function (f) { return f >= n; } }); },
    function () { var m = 2 + Math.floor(SH.rand() * 5);
      return Q('The mob rolls a ' + m + '. You dodge if you roll the same or more. How many faces dodge?', numChoices(7 - m, [1, 2, 3, 4, 5, 6]),
        'Ties are yours, so ' + m + ' counts. That makes ' + (7 - m) + ' faces.', { t: 'faces', s: 6, fn: function (f) { return f >= m; } }); },
    function () { var n = 2 + Math.floor(SH.rand() * 5);
      return Q('How many faces of a die are smaller than ' + n + '?', numChoices(n - 1, [0, 1, 2, 3, 4, 5, 6]),
        'Count them: ' + (n - 1) + ' faces are smaller than ' + n + '.', { t: 'faces', s: 6, fn: function (f) { return f < n; } }); },
    function () { var a = 2 + Math.floor(SH.rand() * 2), b = a + 1 + Math.floor(SH.rand() * 2);
      return Q('Which happens more often with one die?', strChoices(['Rolling ' + a + ' or more', 'Rolling ' + b + ' or more', 'Just the same'], 'Rolling ' + a + ' or more'),
        (7 - a) + ' faces are ' + a + ' or more. Only ' + (7 - b) + ' are ' + b + ' or more.', { t: 'faces', s: 6, fn: function (f) { return f >= a; } }); },
    function () {
      return Q('What is the chance of rolling a 6 with one die?', strChoices(['1 in 2', '1 in 3', '1 in 6', '6 in 6'], '1 in 6'),
        'A die has 6 faces and only one of them is a 6.', { t: 'faces', s: 6, fn: function (f) { return f === 6; } }); },
    function () {
      return Q('You flip one coin. What is the chance of heads?', strChoices(['1 in 2', '1 in 4', '1 in 6', '2 in 2'], '1 in 2'),
        'A coin has 2 sides. One of them is heads.', { t: 'coins', n: 1, fn: function (c) { return c[0] === 1; } }); },
    function () {
      return Q('How many faces of a die show an even number?', numChoices(3, [1, 2, 3, 4, 5, 6]),
        '2, 4 and 6 are even. That is 3 of the 6 faces, the same as a coin flip.', { t: 'faces', s: 6, fn: function (f) { return f % 2 === 0; } }); }
  ],
  /* ---- level 1: two dice, two coins, odd dice ---- */
  [
    function () { var s = pick([3, 4, 5, 6, 7, 8, 9, 10, 11]), w = waysToSum(s);
      return Q('Add two dice together. How many ways can you make ' + s + '?', numChoices(w, [1, 2, 3, 4, 5, 6]),
        'There are ' + w + ' ways to make ' + s + '. Count the lit squares.', { t: 'grid', fn: function (a, b) { return a + b === s; } }); },
    function () { var o = shuffle([2, 3, 4, 5, 9, 10, 11, 12]).slice(0, 2).concat(7).sort(function (a, b) { return a - b; });
      return Q('Add two dice together. Which total comes up most often?', strChoices(o.map(String), '7'),
        '7 can be made 6 ways. No other total has that many.', { t: 'grid', fn: function (a, b) { return a + b === 7; } }); },
    function () { var p = pick([[4, 8], [5, 6], [3, 9], [6, 8], [5, 9], [4, 10], [6, 9]]), wa = waysToSum(p[0]), wb = waysToSum(p[1]);
      var ans = wa > wb ? 'Total ' + p[0] : wb > wa ? 'Total ' + p[1] : 'Just the same';
      return Q('Add two dice together. Which total is more likely?', strChoices(['Total ' + p[0], 'Total ' + p[1], 'Just the same'], ans),
        p[0] + ' can be made ' + wa + ' ways. ' + p[1] + ' can be made ' + wb + ' ways.', { t: 'grid', fn: function (a, b) { return a + b === p[0] || a + b === p[1]; } }); },
    function () {
      return Q('You flip 2 coins. How many different ways can they land?', numChoices(4, [2, 3, 4, 6, 8]),
        'Heads-heads, heads-tails, tails-heads, tails-tails. That is 4.', { t: 'coins', n: 2, fn: function () { return true; } }); },
    function () {
      return Q('You flip 2 coins. In how many of the 4 ways do you get exactly ONE heads?', numChoices(2, [0, 1, 2, 3, 4]),
        'Heads-tails and tails-heads. Two ways, so it is the most likely result.', { t: 'coins', n: 2, fn: function (c) { return c[0] + c[1] === 1; } }); },
    function () { var n = 3 + Math.floor(SH.rand() * 5);
      return Q('Pip has a die with 8 sides. He needs ' + n + ' or more. How many faces will do?', numChoices(9 - n, [1, 2, 3, 4, 5, 6, 7]),
        'From ' + n + ' up to 8 there are ' + (9 - n) + ' faces.', { t: 'faces', s: 8, fn: function (f) { return f >= n; } }); },
    function () {
      return Q('Two dice can land 36 ways. How many of those are doubles?', numChoices(6, [2, 6, 11, 12, 18]),
        '1-1, 2-2, 3-3, 4-4, 5-5 and 6-6. Six ways, a line across the grid.', { t: 'grid', fn: function (a, b) { return a === b; } }); },
    function () {
      return Q('You roll two dice. How many ways can they land altogether?', numChoices(36, [6, 12, 24, 36]),
        '6 ways for the first die, times 6 for the second. 6 × 6 = 36.', { t: 'grid', fn: function () { return true; } }); },
    function () {
      return Q('You roll 2 dice and want at least ONE 6. How many of the 36 squares have a 6 in them?', numChoices(11, [6, 11, 12, 18]),
        'Not 12! The square 6-6 only counts once. So 11.', { t: 'grid', fn: function (a, b) { return a === 6 || b === 6; } }); }
  ],
  /* ---- level 2: counting bigger sets, smart picks ---- */
  [
    function () { var n = pick([3, 4, 5]), w = 36 - (n - 1) * (n - 1);
      return Q('Roll 2 dice and keep the best one. You need ' + n + ' or more. How many of the 36 squares win?', numChoices(w, [w, (7 - n) * 6, (7 - n) * (7 - n), 36 - (7 - n) * (7 - n), w - 4, w + 3].filter(function (x) { return x > 0 && x <= 36; })),
        'Trick: count the losers. Both dice below ' + n + ' is ' + (n - 1) + ' × ' + (n - 1) + ' = ' + ((n - 1) * (n - 1)) + '. Then 36 − ' + ((n - 1) * (n - 1)) + ' = ' + w + '.',
        { t: 'grid', fn: function (a, b) { return Math.max(a, b) >= n; } }); },
    function () { var t = pick([8, 9, 10, 11]), w = 0, a, b; for (a = 1; a <= 6; a++) for (b = 1; b <= 6; b++) if (a + b >= t) w++;
      return Q('Add two dice. How many of the 36 ways give ' + t + ' or more?', numChoices(w, [3, 6, 10, 15, 21, 12]),
        'They sit in the corner of the grid. Count them: ' + w + '.', { t: 'grid', fn: function (x, y) { return x + y >= t; } }); },
    function () { var x = pick([2, 3, 4]), hp = pick([1, x]);
      return Q('Jab hits 5 times in 6 for ' + x + ' damage. Smash hits 3 times in 6 for ' + (2 * x) + '. The mob has ' + hp + (hp === 1 ? ' heart' : ' hearts') + ' left. Which is smarter?',
        strChoices(['Jab', 'Smash', 'No difference'], 'Jab'),
        'Both would finish it. Jab lands more often, so Jab is the smart pick.', null); },
    function () { var x = pick([2, 3, 4]);
      return Q('Jab hits 5 times in 6 for ' + x + ' damage. Smash hits 3 times in 6 for ' + (2 * x) + '. The mob has ' + (2 * x) + ' hearts left. Which can finish it THIS turn?',
        strChoices(['Jab', 'Smash', 'Both'], 'Smash'),
        'Jab cannot do ' + (2 * x) + ' in one go. Only Smash can, half of the time.', null); },
    function () {
      return Q('You flip 3 coins. How many different ways can they land?', numChoices(8, [3, 6, 8, 9]),
        '2 × 2 × 2 = 8 ways.', { t: 'coins', n: 3, fn: function () { return true; } }); },
    function () {
      return Q('You flip 3 coins. In how many of the 8 ways are all three the same?', numChoices(2, [1, 2, 3, 4]),
        'All heads or all tails. 2 of 8, which is 1 in 4.', { t: 'coins', n: 3, fn: function (c) { return c[0] === c[1] && c[1] === c[2]; } }); },
    function () { var p = pick([[12, 2], [30, 5], [60, 10], [600, 100]]);
      return Q('You roll one die ' + p[0] + ' times. About how many 6s should you expect?', numChoices(p[1], [p[1], p[0] / 2, p[0] / 3, p[0] / 12, p[0]].map(Math.round)),
        'One roll in every 6 is a 6. ' + p[0] + ' ÷ 6 = ' + p[1] + '.', null); },
    function () {
      return Q('You and a mob each roll one die. Ties are yours. In how many of the 36 squares does the mob roll HIGHER?', numChoices(15, [6, 15, 18, 21]),
        '6 squares are ties. The other 30 split in half: 15 for the mob, 15 for you.', { t: 'grid', fn: function (a, b) { return b > a; } }); },
    function () {
      return Q('Wow, you rolled a 6 three times in a row! What is the chance your NEXT roll is a 6?', strChoices(['Less than 1 in 6', 'Still 1 in 6', 'More than 1 in 6'], 'Still 1 in 6'),
        'Dice have no memory. Every roll starts fresh.', { t: 'faces', s: 6, fn: function (f) { return f === 6; } }); },
    function () {
      return Q('Pip has a die with 12 sides. He needs 10 or more. What is his chance?', strChoices(['1 in 2', '1 in 3', '1 in 4', '1 in 12'], '1 in 4'),
        '10, 11 and 12 will do. 3 of 12 is the same as 1 in 4.', { t: 'faces', s: 12, fn: function (f) { return f >= 10; } }); }
  ]
];
SH.QUIZ_LEVELS = QUIZ.length;
SH.quizLevel = function (save, tier) {
  var m = save.brain.mode;
  if (m === 'easy') return 0;
  if (m === 'medium') return 1;
  if (m === 'hard') return 2;
  return Math.max(0, Math.min(2, save.brain.lvl));
};
SH.makeQuestion = function (save, tier) {
  var lvl = SH.quizLevel(save, tier), pool = QUIZ[lvl];
  if (lvl > 0 && SH.rand() < 0.25) pool = QUIZ[lvl - 1];
  var last = save.brain.last, q, tries = 0;
  do { var i = Math.floor(SH.rand() * pool.length); q = pool[i](); q.key = pool === QUIZ[lvl] ? lvl + ':' + i : (lvl - 1) + ':' + i; tries++; } while (q.key === last && tries < 6);
  save.brain.last = q.key;
  return q;
};
/* Auto mode follows the child: 3 right in a row steps up, 2 wrong in a row steps down. */
SH.answerQuestion = function (save, correct) {
  var br = save.brain;
  br.asked++;
  if (correct) { br.right++; br.streak = br.streak > 0 ? br.streak + 1 : 1; }
  else br.streak = br.streak < 0 ? br.streak - 1 : -1;
  if (br.mode === 'auto') {
    if (br.streak >= 3 && br.lvl < 2) { br.lvl++; br.streak = 0; }
    else if (br.streak <= -2 && br.lvl > 0) { br.lvl--; br.streak = 0; }
  }
};

/* ------------------------------------------------------------- Dice Derby */
SH.derbyStep = function () { var a = ri(6), b = ri(6); return { a: a, b: b, s: a + b }; };
SH.DERBY_GOAL = 6;

root.SH = SH;
if (typeof module !== 'undefined' && module.exports) module.exports = SH;
})(typeof globalThis !== 'undefined' ? globalThis : this);
