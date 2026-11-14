/* Skyhop Heroes — all artwork is generated SVG so the game needs no image files. */
(function (root) {
'use strict';
var ART = {};
var INK = '#2a1f3d';
var OUT = ' stroke="' + INK + '" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
var OUT3 = ' stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';

function shade(hex, f) {
  var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
ART.shade = shade;
function svg(vb, body, cls, par) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"' + (cls ? ' class="' + cls + '"' : '') + (par ? ' preserveAspectRatio="' + par + '"' : '') + ' aria-hidden="true" focusable="false">' + body + '</svg>';
}
function P(d, fill, x) { return '<path d="' + d + '" fill="' + fill + '"' + OUT + (x || '') + '/>'; }
function N(d, fill, op) { return '<path d="' + d + '" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '') + '/>'; }
function E(cx, cy, rx, ry, fill, x) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' + OUT + (x || '') + '/>'; }
function NE(cx, cy, rx, ry, fill, op) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '') + '/>'; }
function R(x, y, w, h, r, fill, ex) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="' + fill + '"' + OUT + (ex || '') + '/>'; }
function NR(x, y, w, h, r, fill, op) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '') + '/>'; }
function L(d, w, col) { return '<path d="' + d + '" fill="none" stroke="' + (col || INK) + '" stroke-width="' + (w || 5) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
function limb(d, col, w) { w = w || 13; return L(d, w + 9, INK) + L(d, w, col); }
function shadow(cx, cy, rx) { return NE(cx, cy, rx, rx * 0.16, '#000', 0.16); }
function G(tf, body) { return '<g transform="' + tf + '">' + body + '</g>'; }
function flip(body) { return G('translate(200,0) scale(-1,1)', body); }

/* ------------------------------------------------------------------ faces */
function cuteEyes(x1, x2, y, rx, ry) {
  var o = '';
  [x1, x2].forEach(function (x) {
    o += NE(x, y, rx, ry, INK) + NE(x + rx * 0.3, y - ry * 0.35, rx * 0.38, rx * 0.38, '#fff') + NE(x - rx * 0.35, y + ry * 0.4, rx * 0.18, rx * 0.18, '#fff', 0.8);
  });
  o += L('M' + (x1 - rx - 5) + ' ' + (y - ry - 7) + ' Q' + x1 + ' ' + (y - ry - 12) + ' ' + (x1 + rx + 3) + ' ' + (y - ry - 5), 4);
  o += L('M' + (x2 + rx + 5) + ' ' + (y - ry - 7) + ' Q' + x2 + ' ' + (y - ry - 12) + ' ' + (x2 - rx - 3) + ' ' + (y - ry - 5), 4);
  return o;
}
function meanEyes(x1, x2, y, r, glow) {
  var o = '';
  [x1, x2].forEach(function (x, i) {
    var s = i === 0 ? 1 : -1;
    o += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + r + '" ry="' + (r * 1.12) + '" fill="' + (glow || '#fff') + '"' + OUT3 + '/>';
    o += NE(x + s * r * 0.2, y + r * 0.2, r * 0.46, r * 0.5, INK) + NE(x + s * r * 0.2 - r * 0.14, y + r * 0.02, r * 0.16, r * 0.16, '#fff');
    o += L('M' + (x - s * r * 1.5) + ' ' + (y - r * 1.7) + ' L' + (x + s * r * 1.15) + ' ' + (y - r * 0.6), 5.5);
  });
  return o;
}
function cheeks(x1, x2, y, r) { return NE(x1, y, r, r * 0.62, '#ff7a8a', 0.45) + NE(x2, y, r, r * 0.62, '#ff7a8a', 0.45); }
function fangMouth(cx, cy, w, h) {
  var d = 'M' + (cx - w) + ' ' + cy + ' Q' + cx + ' ' + (cy + h * 2) + ' ' + (cx + w) + ' ' + cy + ' Q' + cx + ' ' + (cy + h * 0.5) + ' ' + (cx - w) + ' ' + cy + 'Z';
  return '<path d="' + d + '" fill="#7a2233"' + OUT3 + '/>' +
    N('M' + (cx - w * 0.62) + ' ' + (cy + h * 0.32) + ' l' + (w * 0.2) + ' ' + (h * 0.6) + ' l' + (w * 0.2) + ' ' + (-h * 0.48) + 'Z', '#fff') +
    N('M' + (cx + w * 0.62) + ' ' + (cy + h * 0.32) + ' l' + (-w * 0.2) + ' ' + (h * 0.6) + ' l' + (-w * 0.2) + ' ' + (-h * 0.48) + 'Z', '#fff');
}
function smile(cx, cy, w) { return L('M' + (cx - w) + ' ' + cy + ' Q' + cx + ' ' + (cy + w * 0.9) + ' ' + (cx + w) + ' ' + cy, 4); }

/* ------------------------------------------------------------------- hats */
/* Drawn around (0,0) = top-centre of a head 96 wide; placed with hat(). */
var HATS = {
  crown: function () {
    return P('M-32 6 L-38 -26 L-18 -10 L0 -34 L18 -10 L38 -26 L32 6 Q0 -4 -32 6Z', '#ffd23f') + NE(0, -30, 5, 5, '#ff5a7a') + NE(-36, -24, 4, 4, '#4ad0ff') + NE(36, -24, 4, 4, '#4ad0ff') + NE(0, -6, 6, 5, '#ff5a7a') + N('M-26 0 Q0 -8 26 0 L24 -6 Q0 -14 -24 -6Z', '#fff', 0.5);
  },
  headband: function (c) {
    c = c || '#e8453c';
    return P('M50 20 L74 10 L70 26 Z', c) + P('M50 26 L72 38 L58 44 Z', c) + P('M-47 22 Q0 0 47 22 L47 33 Q0 11 -47 33Z', c) + N('M-40 20 Q0 4 40 20 L40 23 Q0 8 -40 23Z', '#fff', 0.35);
  },
  wizard: function () {
    return P('M-36 10 L4 -76 Q8 -82 12 -74 L36 10 Q0 -2 -36 10Z', '#5b45c4') + E(0, 12, 52, 11, '#4a37a8') + N('M4 -70 L10 -40 L-8 -30Z', '#fff', 0.18) +
      N('M-8 -20 l4 -9 l4 9 l9 1 l-7 6 l2 9 l-8 -5 l-8 5 l2 -9 l-7 -6Z', '#ffd23f') + NE(14, -44, 4, 4, '#ffd23f') + NE(-18, 0, 3, 3, '#ffd23f');
  },
  pirate: function () {
    return P('M-56 10 Q-46 -22 -18 -22 Q0 -44 18 -22 Q46 -22 56 10 Q0 -8 -56 10Z', '#2f2b40') + L('M-50 6 Q0 -12 50 6', 4, '#ffd23f') + E(0, -18, 9, 9, '#ffd23f') + NE(-2, -20, 3, 3, '#fff', 0.7);
  },
  goggles: function () {
    return L('M-47 28 Q0 12 47 28', 9, INK) + L('M-47 28 Q0 12 47 28', 4, '#8a5a2b') + E(-19, 22, 15, 14, '#7fe3ff') + E(19, 22, 15, 14, '#7fe3ff') + NE(-23, 17, 5, 4, '#fff', 0.8) + NE(15, 17, 5, 4, '#fff', 0.8) + L('M-4 22 L4 22', 5);
  },
  chef: function () {
    return P('M-30 8 L-30 -14 Q-54 -22 -42 -46 Q-32 -64 -8 -54 Q6 -74 26 -56 Q50 -56 46 -30 Q48 -18 30 -14 L30 8 Q0 -2 -30 8Z', '#ffffff') + L('M-12 -16 L-12 -40 M10 -16 L10 -44', 3.5, '#d6d9e6') + N('M-30 2 Q0 -8 30 2 L30 8 Q0 -2 -30 8Z', '#d6d9e6');
  },
  helmet: function () {
    return P('M-8 -20 Q0 -58 34 -44 Q12 -38 10 -18Z', '#e8453c') + P('M-48 30 Q-52 -18 0 -20 Q52 -18 48 30 L30 30 L30 12 L-30 12 L-30 30Z', '#d9a441') + N('M-40 6 Q-38 -12 -12 -14 Q-32 -6 -34 8Z', '#fff', 0.4) + L('M0 -18 L0 12', 4);
  },
  fedora: function () {
    return P('M-32 6 Q-36 -32 -12 -32 Q0 -24 12 -32 Q36 -32 32 6Z', '#3d3a52') + E(0, 8, 58, 10, '#3d3a52') + N('M-32 -4 L32 -4 L32 4 L-32 4Z', '#e8453c');
  },
  topknot: function () { return E(0, -8, 13, 13, '#2a1f3d') + L('M-10 4 L10 4', 6, '#e8453c'); },
  turban: function () {
    return P('M-46 22 Q-54 -20 0 -24 Q54 -20 46 22 Q0 4 -46 22Z', '#d94f70') + L('M-40 8 Q0 -14 40 8 M-44 16 Q-10 -2 30 -18', 3.5, shade('#d94f70', -0.25)) + P('M-4 -24 Q-10 -56 6 -62 Q16 -44 6 -24Z', '#ffd23f') + E(0, -10, 8, 9, '#4ad0ff');
  },
  feathers: function () {
    var o = '', cols = ['#ff5a7a', '#ffd23f', '#3ddc84', '#4ad0ff', '#b06cff'], i;
    for (i = 0; i < 5; i++) o += G('rotate(' + (-50 + i * 25) + ' 0 10)', P('M-9 4 Q-14 -40 0 -64 Q14 -40 9 4Z', cols[i]) + L('M0 0 L0 -50', 3, shade(cols[i], -0.3)));
    return o + P('M-40 18 Q0 0 40 18 L40 28 Q0 10 -40 28Z', '#ffd23f');
  },
  beret: function () { return P('M-44 10 Q-52 -22 -6 -26 Q50 -28 44 8 Q0 -4 -44 10Z', '#c0392b') + L('M0 -26 L4 -36', 5) + N('M-34 -4 Q-30 -18 -8 -20 Q-26 -12 -28 -2Z', '#fff', 0.3); },
  viking: function () {
    return P('M-40 -2 Q-70 -14 -62 -44 Q-48 -26 -34 -18Z', '#fff3d6') + P('M40 -2 Q70 -14 62 -44 Q48 -26 34 -18Z', '#fff3d6') + P('M-46 20 Q-48 -24 0 -26 Q48 -24 46 20 Q0 4 -46 20Z', '#9aa3b5') + L('M0 -26 L0 10', 4) + NE(-18, -2, 3, 3, INK) + NE(18, -2, 3, 3, INK);
  },
  pharaoh: function () {
    return P('M-58 60 L-50 -4 Q-40 -30 0 -30 Q40 -30 50 -4 L58 60 L38 60 L36 20 Q0 2 -36 20 L-38 60Z', '#ffd23f') + L('M-50 8 L-34 14 M-52 24 L-36 28 M-54 40 L-38 42 M50 8 L34 14 M52 24 L36 28 M54 40 L38 42 M-30 -18 L-26 4 M30 -18 L26 4 M0 -30 L0 0', 4, '#2f6fd0') + P('M-5 -28 Q-10 -50 4 -52 Q10 -42 4 -28Z', '#3ddc84');
  }
};
function hat(name, cx, cy, k, arg) { return HATS[name] ? G('translate(' + cx + ',' + cy + ') scale(' + (k || 1) + ')', HATS[name](arg)) : ''; }

/* ------------------------------------------------- chibi (heroes + beasts) */
function chibi(o) {
  var f = o.fur, f2 = o.fur2, fd = shade(f, -0.22), arm = o.arm || f, out = shadow(100, 190, 54);
  if (o.cape) out += P('M70 112 Q40 150 46 184 Q100 170 154 184 Q160 150 130 112Z', o.cape);
  if (o.mane) {
    var mm = '', i;
    for (i = 0; i < 14; i++) mm += G('rotate(' + (i * 360 / 14) + ' 100 70)', P('M84 24 Q100 -6 116 24Z', o.mane));
    out += mm + E(100, 70, 58, 54, o.mane);
  }
  if (o.tail === 'bushy') out += P('M126 148 Q182 158 176 106 Q172 86 156 98 Q164 128 124 132Z', f) + N('M174 108 Q171 90 158 99 Q162 108 160 118Z', '#fff');
  if (o.tail === 'thin') out += limb('M128 160 Q168 164 164 130 Q162 116 172 110', o.tailCol || f, 6);
  /* legs + feet */
  out += R(76, 154, 19, 32, 8, o.leg || f) + R(105, 154, 19, 32, 8, o.leg || f);
  out += E(84, 187, 15, 7.5, o.foot || fd) + E(116, 187, 15, 7.5, o.foot || fd);
  /* body */
  out += P('M70 128 Q70 104 100 104 Q130 104 130 128 L133 158 Q133 175 100 175 Q67 175 67 158Z', o.body || f);
  if (o.belly !== false) out += NE(100, 144, 20, 19, f2);
  if (o.stripes) out += L('M70 126 L82 132 M69 142 L80 146 M130 126 L118 132 M131 142 L120 146', 5, o.stripes);
  if (o.outfit) out += P('M67.5 150 L132.5 150 L133 158 Q133 175 100 175 Q67 175 67 158Z', o.outfit) + N('M68 150 L132 150 L132 156 L68 156Z', shade(o.outfit, -0.25));
  if (o.shirt) out += P('M70 128 Q70 104 100 104 Q130 104 130 128 L131 144 L69 144Z', o.shirt) + (o.shirtStripes ? L('M71 118 L129 118 M70 130 L130 130', 5, o.shirtStripes) : '');
  if (o.badge) out += E(100, 132, 9, 9, o.badge);
  /* arms up in a fighting pose */
  out += limb('M73 124 Q50 140 50 116', arm) + limb('M127 124 Q150 140 150 116', arm);
  if (o.propBack) out += o.propBack;
  var gl = o.gloves;
  if (gl) {
    out += E(49, 110, 15, 14, gl) + NE(44, 105, 5, 4, '#fff', 0.55) + E(151, 110, 15, 14, gl) + NE(146, 105, 5, 4, '#fff', 0.55);
  } else {
    out += E(49, 111, 11, 10.5, o.hand || arm) + E(151, 111, 11, 10.5, o.hand || arm);
  }
  /* ears */
  var ei = o.earIn || f2;
  if (o.ears === 'round') out += E(62, 36, 17, 17, f) + NE(62, 37, 8.5, 8.5, ei) + E(138, 36, 17, 17, f) + NE(138, 37, 8.5, 8.5, ei);
  if (o.ears === 'pointy') out += P('M58 56 L50 8 L90 32Z', f) + N('M62 44 L57 22 L76 33Z', ei) + P('M142 56 L150 8 L110 32Z', f) + N('M138 44 L143 22 L124 33Z', ei);
  if (o.ears === 'tuft') out += P('M62 44 L58 14 L84 30Z', f) + P('M138 44 L142 14 L116 30Z', f);
  if (o.ears === 'big') out += E(50, 58, 20, 21, f) + NE(50, 59, 11, 12, ei) + E(150, 58, 20, 21, f) + NE(150, 59, 11, 12, ei);
  if (o.ears === 'troll') out += P('M58 62 L24 46 L56 82Z', f) + P('M142 62 L176 46 L144 82Z', f);
  if (o.crest) out += P('M88 30 Q84 4 100 10 Q104 -4 114 12 Q128 8 120 34Z', o.crest);
  /* head */
  out += E(100, 68, 48, 43, f);
  out += N('M60 52 Q66 32 92 28 Q70 38 66 58Z', '#fff', 0.22);
  if (o.stripes) out += L('M100 27 L100 40 M84 30 L88 41 M116 30 L112 41 M54 62 L66 66 M55 76 L66 77 M146 62 L134 66 M145 76 L134 77', 5, o.stripes);
  if (o.spots) out += NE(70, 44, 5, 4, o.spots) + NE(128, 42, 5, 4, o.spots) + NE(100, 34, 5, 4, o.spots) + NE(60, 70, 4, 5, o.spots) + NE(141, 70, 4, 5, o.spots) + NE(78, 122, 4, 4, o.spots) + NE(122, 122, 4, 4, o.spots);
  var ey = o.eyeY || 64;
  if (o.facePatch) out += NE(100, 76, 36, 30, f2) + NE(84, 62, 17, 17, f2) + NE(116, 62, 17, 17, f2);
  if (o.eyeRing) out += E(81, ey, 17, 17, o.eyeRing) + E(119, ey, 17, 17, o.eyeRing);
  if (o.snout === 'muzzle') out += NE(100, 84, 24, 17, f2);
  if (o.maskBand) out += N('M53 56 Q100 44 147 56 L148 78 Q100 68 52 78Z', o.maskBand);
  /* eyes */
  out += o.mean ? meanEyes(81, 119, ey, 10.5, o.glow) : cuteEyes(82, 118, ey, 6.8, 8.6);
  if (!o.mean) out += cheeks(66, 134, 82, 8);
  /* nose + mouth */
  if (o.snout === 'muzzle') {
    out += NE(100, 78, 7.5, 5.5, o.nose || INK) + NE(98, 76.5, 2.2, 1.6, '#fff', 0.6);
    out += o.mean ? fangMouth(100, 87, 13, 5) : smile(100, 87, 8);
    if (o.buck) out += '<rect x="95" y="88" width="10" height="9" rx="2" fill="#fff"' + OUT3 + '/>' + L('M100 88 L100 97', 2.5);
    if (o.whiskers) out += L('M72 82 L52 78 M72 88 L52 92 M128 82 L148 78 M128 88 L148 92', 3);
  } else if (o.snout === 'beak') {
    out += P('M89 76 Q100 68 111 76 Q106 92 100 96 Q94 92 89 76Z', o.beak || '#f6a623') + L('M92 81 Q100 85 108 81', 3);
  } else if (o.snout === 'hook') {
    out += P('M84 70 Q100 58 116 70 Q118 92 100 104 Q98 92 90 88 Q84 80 84 70Z', o.beak || '#ffd23f') + N('M100 104 Q98 92 90 88 Q100 90 108 84 Q108 96 100 104Z', '#3a2a2a');
  } else if (o.snout === 'troll') {
    out += E(100, 80, 13, 12, shade(f, -0.12)) + NE(96, 76, 4, 3, '#fff', 0.35);
    out += '<path d="M78 96 Q100 106 122 96" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>';
    out += P('M82 98 L85 86 L90 99Z', '#fff8e7') + P('M118 98 L115 86 L110 99Z', '#fff8e7');
    if (o.beard) out += P('M70 96 Q72 132 100 138 Q128 132 130 96 Q116 108 100 108 Q84 108 70 96Z', o.beard);
    if (o.stache) out += P('M100 92 Q82 84 66 98 Q84 104 100 96 Q116 104 134 98 Q118 84 100 92Z', o.stache);
  }
  if (o.monocle) out += '<circle cx="119" cy="' + ey + '" r="15" fill="#bfefff" fill-opacity=".35" stroke="#ffd23f" stroke-width="4"/>' + L('M131 73 Q138 96 132 112', 2.5, '#ffd23f');
  if (o.hat) out += hat(o.hat, 100, 26, o.hatK || 1, o.hatArg);
  if (o.prop) out += o.prop;
  return out;
}

var PROP = {
  wand: L('M151 110 L168 62', 9, INK) + L('M151 110 L168 62', 4, '#b98a55') + P('M170 38 l6 14 l15 2 l-11 10 l3 15 l-13 -8 l-13 8 l3 -15 l-11 -10 l15 -2Z', '#ffd23f'),
  spoon: L('M151 112 L166 64', 10, INK) + L('M151 112 L166 64', 5, '#c99a62') + E(169, 50, 12, 16, '#d9ac74', ' transform="rotate(16 169 50)"'),
  wrench: L('M151 112 L164 66', 11, INK) + L('M151 112 L164 66', 6, '#9aa3b5') + P('M154 62 Q150 44 166 40 L164 52 L174 54 L178 44 Q188 58 174 68Z', '#9aa3b5'),
  club: L('M151 112 L170 60', 12, INK) + P('M160 70 Q150 40 172 28 Q194 30 190 56 Q186 72 172 76Z', '#a8743f') + NE(170, 42, 4, 4, '#7a4f25') + NE(180, 56, 3, 3, '#7a4f25'),
  spear: L('M151 126 L160 30', 9, INK) + L('M151 126 L160 30', 4, '#9a6b3c') + P('M152 34 L162 6 L170 36Z', '#c9ced9'),
  bag: P('M150 96 Q134 96 136 116 Q138 132 152 132 Q168 132 168 114 Q168 96 150 96Z', '#c9a063') + L('M144 98 L158 98', 4) + '<text x="152" y="122" font-size="18" font-weight="700" text-anchor="middle" fill="' + INK + '">$</text>',
  baguette: L('M150 126 L176 58', 20, INK) + L('M150 126 L176 58', 12, '#e0a85a') + L('M158 108 L164 104 M163 94 L169 90 M168 80 L174 76', 3, '#a8742f')
};

var HERO_ART = {
  bo:   { fur: '#b9773f', fur2: '#f4d6a8', ears: 'round', snout: 'muzzle', outfit: '#3a7bd5', gloves: '#e8453c', hat: 'headband' },
  zip:  { fur: '#f28c38', fur2: '#fff4e2', ears: 'pointy', earIn: '#4a2f2a', snout: 'muzzle', tail: 'bushy', outfit: '#3b3f6b', gloves: '#22b8a6', hat: 'headband', hatArg: '#2f6fd0', foot: '#4a2f2a' },
  luna: { fur: '#8f7bd6', fur2: '#f1eaff', ears: 'tuft', snout: 'beak', eyeRing: '#f1eaff', arm: '#6e59b8', hat: 'wizard', prop: PROP.wand, foot: '#f6a623', leg: '#f6a623' },
  coco: { fur: '#e8443a', fur2: '#fff2d6', snout: 'hook', facePatch: true, crest: '#ffd23f', arm: '#2f7fe0', hand: '#ffd23f', hat: 'pirate', outfit: '#2f2b40', foot: '#f6a623', leg: '#f6a623', belly: false },
  pip:  { fur: '#343b5c', fur2: '#ffffff', snout: 'beak', facePatch: true, hat: 'goggles', prop: PROP.wrench, foot: '#f6a623', leg: '#f6a623', badge: '#ffd23f' },
  mika: { fur: '#a5683a', fur2: '#f5d7ab', ears: 'big', snout: 'muzzle', facePatch: true, tail: 'thin', hat: 'chef', outfit: '#e8453c', prop: PROP.spoon }
};
var CHARBOX = '-22 -44 244 244';
ART.hero = function (id, cls) { return svg(CHARBOX, chibi(HERO_ART[id]), 'char ' + (cls || ''), 'xMidYMax meet'); };

/* -------------------------------------------------------------- mob bodies */
function blob(c1, c2, v) {
  var d = shade(c1, -0.22), o = shadow(100, 188, 62);
  if (v === 'fog') o += NE(40, 150, 26, 18, c2, 0.7) + NE(164, 146, 24, 16, c2, 0.7) + NE(56, 92, 20, 14, c2, 0.6);
  if (v === 'toad') o += E(64, 78, 22, 20, c1) + E(136, 78, 22, 20, c1);
  if (v === 'meatball') o += P('M30 132 Q30 62 100 62 Q170 62 170 132 Q170 188 100 188 Q30 188 30 132Z', c1);
  else o += P('M32 166 Q24 84 100 64 Q176 84 168 166 Q168 188 100 188 Q32 188 32 166Z', c1);
  o += N('M50 150 Q46 100 92 80 Q62 104 62 152Z', '#fff', 0.32) + N('M46 172 Q100 198 154 172 Q150 186 100 186 Q50 186 46 172Z', d, 0.55);
  if (v === 'cheese') o += NE(60, 150, 9, 7, d) + NE(140, 158, 11, 8, d) + NE(128, 96, 7, 6, d) + NE(84, 170, 5, 4, d) + L('M70 54 Q62 42 72 32 M100 48 Q92 34 104 22 M130 54 Q124 42 134 32', 4, '#8bc34a');
  if (v === 'meatball') {
    o += L('M52 84 Q70 50 100 62 Q128 46 150 84 M66 74 Q84 56 102 76 Q118 54 138 74', 8, INK) + L('M52 84 Q70 50 100 62 Q128 46 150 84 M66 74 Q84 56 102 76 Q118 54 138 74', 4, '#ffe08a');
    o += P('M62 96 Q60 70 100 68 Q140 70 138 96 Q128 86 118 100 Q108 84 98 102 Q88 86 78 100 Q70 88 62 96Z', '#d63a2a');
    o += NE(60, 150, 6, 5, d) + NE(146, 140, 7, 6, d) + NE(120, 170, 5, 4, d);
  }
  if (v === 'toad') {
    o += meanEyes(64, 136, 76, 11) + L('M54 124 Q100 150 146 124', 5) + NE(100, 158, 30, 16, c2) + R(40, 168, 120, 14, 6, '#3d3a52') + hat('topknot', 100, 62, 1);
    return o;
  }
  o += meanEyes(76, 124, 118, 13) + fangMouth(100, 142, 20, 7);
  return o;
}

function bird(c1, c2, v) {
  var d = shade(c1, -0.2), o = shadow(100, 190, 50), i;
  if (v === 'peacock') {
    for (i = 0; i < 7; i++) o += G('rotate(' + (-66 + i * 22) + ' 100 130)', P('M88 110 Q78 40 100 14 Q122 40 112 110Z', i % 2 ? '#2bb673' : '#1f9aa8') + E(100, 40, 9, 12, '#ffd23f') + NE(100, 42, 4.5, 6, '#2f6fd0'));
  }
  o += L('M84 166 L84 186 M74 188 L94 188 M116 166 L116 186 M106 188 L126 188', 5.5, '#f6a623');
  o += P('M96 66 Q94 44 106 56 Q114 42 116 64Z', c1);
  o += E(100, 118, 55, 53, c1) + NE(100, 136, 34, 30, c2) + N('M56 100 Q62 76 88 70 Q68 84 64 106Z', '#fff', 0.3);
  o += P('M48 104 Q20 130 42 154 Q60 142 58 112Z', d) + P('M152 104 Q180 130 158 154 Q140 142 142 112Z', d);
  if (v === 'stone') o += L('M70 150 L82 138 L78 126 M128 82 L120 92 L128 100 M110 158 L118 150', 3, shade(c1, -0.35));
  if (v === 'toucan') o += P('M88 100 Q150 86 158 116 Q150 140 92 128Z', '#ff9f1c') + N('M140 100 Q158 106 156 120 Q150 132 136 132Z', '#2a1f3d') + L('M92 116 Q124 118 152 116', 3) + NE(110, 104, 10, 4, '#fff', 0.5);
  else o += P('M84 112 L116 112 L100 132Z', '#f6a623') + L('M88 118 L112 118', 3);
  o += meanEyes(79, 121, 96, 11.5);
  if (v === 'don') o += hat('fedora', 100, 68, 0.95) + P('M94 134 L106 134 L110 162 L100 170 L90 162Z', '#e8453c');
  if (v === 'peacock') o += L('M100 66 L92 46 M100 66 L100 42 M100 66 L108 46', 3.5) + NE(92, 44, 4, 4, '#2f6fd0') + NE(100, 40, 4, 4, '#2f6fd0') + NE(108, 44, 4, 4, '#2f6fd0');
  return o;
}

function bat(c1, c2, v) {
  var d = shade(c1, -0.25), o = shadow(100, 192, 40);
  var wing = 'M96 112 Q58 54 8 70 Q28 88 22 112 Q42 102 48 126 Q64 112 76 138Z';
  o += P(wing, d) + flip(P(wing, d)) + L('M90 112 Q60 84 22 112 M90 114 Q66 100 48 126', 3, shade(c1, -0.45)) + flip(L('M90 112 Q60 84 22 112 M90 114 Q66 100 48 126', 3, shade(c1, -0.45)));
  o += P('M78 88 L68 52 L96 76Z', c1) + P('M122 88 L132 52 L104 76Z', c1) + N('M80 80 L75 64 L88 76Z', c2) + N('M120 80 L125 64 L112 76Z', c2);
  if (v === 'stone') o += P('M84 74 L78 50 L92 66Z', '#fff3d6') + P('M116 74 L122 50 L108 66Z', '#fff3d6');
  o += E(100, 122, 36, 40, c1) + NE(100, 136, 20, 20, c2) + N('M72 112 Q74 92 92 86 Q80 98 78 116Z', '#fff', 0.28);
  o += L('M88 160 L86 172 M112 160 L114 172', 5.5);
  o += meanEyes(87, 113, 110, 9.5) + fangMouth(100, 128, 11, 6);
  if (v === 'stone') o += L('M70 138 L78 130 L74 122 M124 146 L118 138', 3, shade(c1, -0.4));
  return o;
}

function crab(c1, c2, v) {
  var d = shade(c1, -0.22), o = shadow(100, 188, 66);
  if (v === 'scorpion') o += E(152, 128, 15, 15, c1) + E(166, 102, 13, 13, c1) + E(162, 74, 12, 12, c1) + E(146, 54, 11, 11, c1) + P('M140 52 Q118 44 122 22 Q134 34 148 40Z', d);
  o += L('M52 150 L26 164 L22 182 M60 160 L40 176 L40 188 M148 150 L174 164 L178 182 M140 160 L160 176 L160 188', 12, INK) + L('M52 150 L26 164 L22 182 M60 160 L40 176 L40 188 M148 150 L174 164 L178 182 M140 160 L160 176 L160 188', 5.5, d);
  o += limb('M58 132 Q34 124 36 100', c1, 11) + limb('M142 132 Q166 124 164 100', c1, 11);
  var claw = P('M16 84 Q14 58 38 58 Q58 60 58 82 L42 80 L56 94 Q46 108 28 104 Q16 98 16 84Z', c1) + NE(28, 70, 6, 4, '#fff', 0.4);
  o += claw + flip(claw);
  o += L('M82 112 L80 92 M118 112 L120 92', 6);
  o += E(100, 140, 60, 38, c1) + NE(100, 154, 38, 18, c2) + N('M52 132 Q58 112 86 106 Q66 118 60 138Z', '#fff', 0.3);
  if (v === 'beetle') o += P('M90 110 Q96 52 128 54 Q112 70 112 110Z', d) + L('M100 108 L100 176', 4, shade(c1, -0.4));
  o += meanEyes(80, 120, 88, 10.5) + fangMouth(100, 150, 16, 6);
  if (v === 'king') o += hat('crown', 100, 68, 0.8);
  return o;
}

function ghost(c1, c2, v) {
  var d = shade(c1, -0.2), o = shadow(100, 192, 40);
  if (v === 'cloud') {
    o += P('M96 138 L82 166 L98 164 L88 190 L120 154 L104 156 L114 138Z', '#ffd23f');
    o += P('M40 142 Q16 142 20 116 Q22 96 46 96 Q48 66 82 66 Q102 46 128 64 Q156 56 162 88 Q188 92 182 122 Q180 142 156 142Z', c1) + N('M46 96 Q48 66 82 66 Q62 76 60 100Z', '#fff', 0.25) + N('M40 142 Q100 132 156 142 Q150 128 100 126 Q52 126 40 142Z', d, 0.5);
    return o + meanEyes(80, 122, 104, 12, '#ffe98a') + fangMouth(100, 124, 14, 5);
  }
  o += P('M48 124 Q24 118 26 138 Q38 144 48 136Z', c1) + P('M152 124 Q176 118 174 138 Q162 144 152 136Z', c1);
  o += P('M48 172 L48 104 Q48 50 100 50 Q152 50 152 104 L152 172 Q140 186 128 172 Q114 188 100 172 Q86 188 72 172 Q60 186 48 172Z', c1);
  o += N('M58 110 Q58 68 92 60 Q70 76 68 114Z', '#fff', 0.35);
  if (v === 'mummy') o += L('M50 84 Q100 96 150 82 M48 128 Q100 116 152 130 M50 152 Q100 164 150 150 M60 64 Q100 54 140 66', 3.5, shade(c1, -0.3)) + P('M150 138 Q172 150 166 172 Q158 162 150 156Z', c1);
  if (v === 'lantern') {
    o += L('M72 56 Q62 110 72 170 M100 50 L100 172 M128 56 Q138 110 128 170', 3.5, shade(c1, -0.3));
    o += R(70, 40, 60, 14, 5, '#ffd23f') + L('M100 40 L100 26', 5) + L('M100 176 L100 194', 4, '#ffd23f') + NE(100, 110, 26, 34, c2, 0.35);
  }
  o += meanEyes(81, 119, 102, 12, v === 'lantern' ? '#fff2a8' : null);
  o += '<ellipse cx="100" cy="132" rx="11" ry="13" fill="#3a2440"' + OUT3 + '/>';
  return o;
}

function snake(c1, c2, v) {
  var d = shade(c1, -0.22), o = shadow(100, 190, 64);
  o += P('M150 172 Q182 168 176 142 Q166 154 148 158Z', c1);
  o += E(100, 170, 58, 20, c1) + NE(100, 174, 40, 9, c2, 0.8) + E(100, 150, 44, 18, c1) + NE(100, 153, 28, 8, c2, 0.8);
  if (v === 'dragon') o += P('M74 132 L62 118 L80 120 L72 102 L88 108Z', '#ffd23f') + P('M126 132 L138 118 L120 120 L128 102 L112 108Z', '#ffd23f');
  o += P('M82 152 Q74 112 84 84 L116 84 Q126 112 118 152Z', c1) + N('M91 150 Q86 114 93 90 L107 90 Q114 114 109 150Z', c2) + L('M90 108 L110 108 M89 122 L111 122 M90 136 L110 136', 3, shade(c2, -0.25));
  if (v !== 'dragon') {
    o += P('M100 34 Q56 40 54 82 Q58 112 84 120 L116 120 Q142 112 146 82 Q144 40 100 34Z', v === 'pharaoh' ? c2 : c1);
    o += v === 'pharaoh' ? L('M62 62 L78 70 M58 82 L76 86 M64 102 L80 100 M138 62 L122 70 M142 82 L124 86 M136 102 L120 100', 5, '#2f6fd0') : NE(100, 98, 16, 14, c2, 0.85);
  } else {
    o += L('M82 44 Q66 30 70 12 M76 28 L62 24 M118 44 Q134 30 130 12 M124 28 L138 24', 10, INK) + L('M82 44 Q66 30 70 12 M76 28 L62 24 M118 44 Q134 30 130 12 M124 28 L138 24', 5, '#ffd23f');
    o += P('M68 62 Q52 56 46 70 Q56 76 68 74Z', '#ff8a5c') + P('M132 62 Q148 56 154 70 Q144 76 132 74Z', '#ff8a5c');
  }
  o += E(100, 68, 32, 28, c1) + N('M76 60 Q80 46 96 42 Q84 52 82 64Z', '#fff', 0.3);
  if (v === 'dragon') o += E(100, 82, 20, 13, shade(c1, 0.25)) + NE(93, 80, 3, 2.5, INK) + NE(107, 80, 3, 2.5, INK) + L('M82 84 Q56 86 46 104 M118 84 Q144 86 154 104', 3.5, '#ffd23f');
  o += meanEyes(87, 113, 62, 9);
  if (v !== 'dragon') o += L('M100 84 L100 100 L93 110 M100 100 L107 110', 4, '#e8453c') + L('M90 82 Q100 88 110 82', 4);
  else o += fangMouth(100, 90, 12, 4);
  if (v === 'pharaoh') o += P('M94 42 Q90 22 102 18 Q110 28 106 42Z', '#e8453c') + NE(100, 30, 3, 3, '#ffd23f');
  return o;
}

function robot(c1, c2, v) {
  var d = shade(c1, -0.22), lt = shade(c1, 0.35), o = shadow(100, 192, 56);
  if (v === 'clock') o += L('M140 128 L164 128', 9, INK) + L('M140 128 L164 128', 4, '#9aa3b5') + E(170, 118, 10, 10, '#ffd23f') + E(170, 138, 10, 10, '#ffd23f');
  o += R(70, 156, 22, 28, 5, d) + R(108, 156, 22, 28, 5, d) + R(62, 178, 34, 13, 5, c2) + R(104, 178, 34, 13, 5, c2);
  o += limb('M62 114 Q36 120 38 146', '#9aa3b5', 11) + E(38, 150, 13, 12, c2);
  if (v === 'samurai') o += L('M162 120 L176 30', 9, INK) + L('M162 120 L176 30', 4, '#e6ebf5') + L('M152 112 L172 116', 9, INK) + L('M152 112 L172 116', 4, '#ffd23f');
  o += limb('M138 114 Q164 118 162 138', '#9aa3b5', 11) + E(162, 124, 13, 12, c2);
  o += R(58, 98, 84, 64, 13, c1) + N('M66 106 Q68 100 78 100 L78 150 L66 150Z', '#fff', 0.25);
  if (v === 'clock') {
    o += E(100, 130, 24, 24, '#fff8e7') + L('M100 130 L100 114 M100 130 L112 136', 4.5) + NE(100, 130, 3, 3, '#e8453c') + L('M100 109 L100 112 M100 148 L100 151 M79 130 L82 130 M118 130 L121 130', 3);
  } else if (v === 'taxi') {
    o += N('M60 124 L140 124 L140 138 L60 138Z', INK) + N('M64 124 h10 v7 h-10Z M84 124 h10 v7 h-10Z M104 124 h10 v7 h-10Z M124 124 h10 v7 h-10Z M74 131 h10 v7 h-10Z M94 131 h10 v7 h-10Z M114 131 h10 v7 h-10Z', '#fff') + E(82, 110, 8, 6, '#fff8c4') + E(118, 110, 8, 6, '#fff8c4');
  } else {
    o += R(70, 108, 60, 14, 4, d) + R(70, 128, 60, 14, 4, d) + R(70, 148, 60, 8, 3, d) + P('M52 100 Q40 96 38 112 L60 112Z', lt) + P('M148 100 Q160 96 162 112 L140 112Z', lt);
  }
  o += R(62, 40, 76, 54, 15, c1) + N('M70 48 Q72 44 82 44 L82 84 L70 84Z', '#fff', 0.25);
  o += R(72, 56, 56, 24, 9, '#2a1f3d') + N('M80 62 L94 67 L94 74 L80 74Z', '#ff5a5a') + N('M120 62 L106 67 L106 74 L120 74Z', '#ff5a5a');
  o += L('M88 86 L112 86', 4) + NE(64, 68, 5, 7, c2) + NE(136, 68, 5, 7, c2);
  if (v === 'samurai') o += P('M100 40 L78 4 Q100 18 122 4Z', '#ffd23f') + P('M56 50 Q54 26 100 26 Q146 26 144 50 Q100 34 56 50Z', d);
  else if (v === 'taxi') o += R(80, 24, 40, 16, 5, '#fff8c4') + '<text x="100" y="37" font-size="13" font-weight="700" text-anchor="middle" fill="' + INK + '">TAXI</text>';
  else o += L('M100 40 L100 24', 5) + E(100, 18, 8, 8, '#ff5a5a');
  return o;
}

function shark(c1, c2) {
  var d = shade(c1, -0.22), o = shadow(100, 192, 52);
  o += P('M72 172 Q38 194 26 166 Q50 168 62 148Z', d) + P('M128 172 Q162 194 174 166 Q150 168 138 148Z', d);
  o += P('M54 112 Q22 122 26 150 Q46 142 60 134Z', d) + P('M146 112 Q178 122 174 150 Q154 142 140 134Z', d);
  o += P('M100 28 Q152 62 148 132 Q146 178 100 186 Q54 178 52 132 Q48 62 100 28Z', c1);
  o += N('M100 76 Q134 94 132 136 Q130 170 100 178 Q70 170 68 136 Q66 94 100 76Z', c2) + N('M66 96 Q68 62 92 44 Q76 70 74 104Z', '#fff', 0.3);
  o += L('M64 118 L70 118 M64 126 L70 126 M136 118 L130 118 M136 126 L130 126', 3.5, d);
  o += '<path d="M66 110 Q100 158 134 110 Q100 124 66 110Z" fill="#7a2233"' + OUT + '/>';
  o += N('M72 114 l5 10 l5 -8 l5 11 l6 -10 l7 11 l7 -11 l6 10 l5 -11 l5 8 l5 -10 Q100 126 72 114Z', '#fff');
  o += meanEyes(82, 118, 84, 10) + hat('pirate', 100, 44, 0.8);
  return o;
}

function beast(m) {
  var c1 = m.c[0], c2 = m.c[1], v = m.v, o;
  switch (m.sp) {
    case 'blob': return blob(c1, c2, v);
    case 'bird': return bird(c1, c2, v);
    case 'bat': return bat(c1, c2, v);
    case 'crab': return crab(c1, c2, v);
    case 'ghost': return ghost(c1, c2, v);
    case 'snake': return snake(c1, c2, v);
    case 'robot': return robot(c1, c2, v);
    case 'shark': return shark(c1, c2);
    case 'rat':
      o = { fur: c1, fur2: c2, ears: 'big', earIn: '#f5a3b5', snout: 'muzzle', nose: '#f27a94', buck: true, whiskers: true, tail: 'thin', tailCol: '#f5a3b5', mean: true };
      if (v === 'bandit') { o.maskBand = '#2a1f3d'; o.shirt = '#fff'; o.shirtStripes = '#2a1f3d'; o.hat = 'beret'; o.prop = PROP.baguette; }
      else if (v === 'glad') { o.hat = 'helmet'; o.outfit = '#b0392b'; o.prop = PROP.spear; }
      else { o.outfit = '#4a4e69'; o.prop = PROP.bag; }
      return chibi(o);
    case 'cat':
      o = { fur: c1, fur2: c2, ears: 'pointy', earIn: '#f5a3b5', snout: 'muzzle', nose: '#f27a94', whiskers: true, tail: 'thin', mean: true };
      if (v === 'lion') { o.mane = '#a85a1c'; o.hat = 'crown'; o.hatK = 0.85; o.ears = 'round'; }
      if (v === 'tiger') { o.stripes = '#3a2418'; o.hat = 'turban'; o.hatK = 0.9; }
      if (v === 'ninja') { o.maskBand = '#1c1830'; o.hat = 'headband'; o.hatArg = '#e8453c'; o.outfit = '#1c1830'; o.glow = '#fff2a8'; }
      if (v === 'jaguar') { o.spots = '#5a3414'; o.hat = 'feathers'; o.hatK = 0.9; }
      return chibi(o);
    case 'monkey':
      return chibi({ fur: c1, fur2: c2, ears: 'big', snout: 'muzzle', facePatch: true, tail: 'thin', mean: true, prop: PROP.bag });
    case 'troll':
      o = { fur: c1, fur2: c2, ears: 'troll', snout: 'troll', mean: true, belly: false, outfit: '#7a5a3a', prop: PROP.club };
      if (v === 'king') { o.hat = 'viking'; o.beard = '#f3f0e6'; }
      if (v === 'terra') { o.hat = 'topknot'; o.prop = PROP.spear; o.outfit = shade(c1, -0.25); o.shirt = shade(c1, -0.12); o.shirtStripes = shade(c1, -0.35); }
      if (v === 'goon') { o.badge = '#ffd23f'; o.outfit = '#3d3a52'; }
      if (v === 'baron') { o.hat = 'crown'; o.cape = '#c0392b'; o.stache = '#3d3a52'; o.monocle = true; o.outfit = '#2f2b40'; o.shirt = '#3d3a52'; o.badge = '#ffd23f'; o.prop = PROP.wand; }
      return chibi(o);
  }
  return blob(c1, c2, '');
}
ART.mob = function (m, cls) { return svg(CHARBOX, beast(m), 'char ' + (cls || ''), 'xMidYMax meet'); };

ART._ = { svg: svg, P: P, N: N, E: E, NE: NE, R: R, NR: NR, L: L, G: G, INK: INK, OUT: OUT, OUT3: OUT3, shade: shade, chibi: chibi };
root.ART = ART;
})(typeof globalThis !== 'undefined' ? globalThis : this);
