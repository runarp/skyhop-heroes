/* Skyhop Heroes — Brain engine.
   1) Adaptive picker: keeps each player near a target success rate (default 70%) with an
      Elo / Rasch rating, the method adaptive maths-practice apps use.
   2) Puzzle language: each database puzzle names its dice, coins, spinners or marbles and
      what to work out. The engine lists every equally likely outcome and counts them itself,
      so an answer key cannot be wrong, whoever wrote the puzzle. No eval(), no code from data. */
(function (root) {
'use strict';
var SH = root.SH, BR = {};
var U = SH.util;

/* ======================================================= expression language */
var FN = {}, ARITY = {};
function show(x) { return Array.isArray(x) ? '[' + x.join(', ') + ']' : String(x); }
function vec(x) { return Array.isArray(x) ? x : [x]; }
function num(x) { if (typeof x !== 'number' || !isFinite(x)) throw new Error('expected a number but got ' + show(x)); return x; }
function bool(x) { if (typeof x !== 'boolean') throw new Error('expected true or false but got ' + show(x)); return x; }
function scal(x) { if (Array.isArray(x)) throw new Error('expected one value but got a list ' + show(x) + ' (use sum, max, count, at…)'); return x; }
function def(name, n, f) { FN[name] = f; ARITY[name] = n; }
def('sum', 1, function (v) { return vec(v).reduce(function (s, x) { return s + num(x); }, 0); });
def('max', 1, function (v) { return Math.max.apply(null, vec(v).map(num)); });
def('min', 1, function (v) { return Math.min.apply(null, vec(v).map(num)); });
def('count', 2, function (v, x) { scal(x); return vec(v).filter(function (y) { return y === x; }).length; });
def('has', 2, function (v, x) { scal(x); return vec(v).indexOf(x) >= 0; });
def('same', 1, function (v) { v = vec(v); return v.every(function (y) { return y === v[0]; }); });
def('distinct', 1, function (v) { var s = []; vec(v).forEach(function (y) { if (s.indexOf(y) < 0) s.push(y); }); return s.length; });
def('at', 2, function (v, i) { v = vec(v); num(i); if (i < 1 || i > v.length || i % 1) throw new Error('at(): there is no position ' + i); return v[i - 1]; });
def('heads', 1, function (v) { return FN.count(v, 'H'); });
def('tails', 1, function (v) { return FN.count(v, 'T'); });
def('even', 1, function (x) { return num(scal(x)) % 2 === 0; });
def('odd', 1, function (x) { return Math.abs(num(scal(x)) % 2) === 1; });
def('prime', 1, function (x) { x = num(scal(x)); if (x < 2 || x % 1) return false; for (var i = 2; i * i <= x; i++) if (x % i === 0) return false; return true; });
def('abs', 1, function (x) { return Math.abs(num(scal(x))); });
var RESERVED = { and: 1, or: 1, not: 1, true: 1, false: 1, answer: 1, fav: 1, total: 1, given: 1, a_fav: 1, b_fav: 1, detail: 1, ev: 1 };

function tokenize(src) {
  var toks = [], i = 0, s = String(src), m, re = /\s*(?:(\d+(?:\.\d+)?)|'([^']*)'|"([^"]*)"|([A-Za-z_][A-Za-z0-9_]*)|(==|!=|<=|>=|&&|\|\||[-+*\/%<>!(),?:]))/y;
  while (i < s.length) {
    re.lastIndex = i; m = re.exec(s);
    if (!m) { if (/^\s*$/.test(s.slice(i))) break; throw new Error('cannot read "' + s.slice(i, i + 14).trim() + '"'); }
    i = re.lastIndex;
    if (m[1] !== undefined) toks.push({ t: 'num', v: parseFloat(m[1]) });
    else if (m[2] !== undefined || m[3] !== undefined) toks.push({ t: 'str', v: m[2] !== undefined ? m[2] : m[3] });
    else if (m[4] !== undefined) {
      var w = m[4];
      if (w === 'and') toks.push({ t: 'op', v: '&&' }); else if (w === 'or') toks.push({ t: 'op', v: '||' }); else if (w === 'not') toks.push({ t: 'op', v: '!' });
      else if (w === 'true' || w === 'false') toks.push({ t: 'lit', v: w === 'true' }); else toks.push({ t: 'id', v: w });
    } else toks.push({ t: 'op', v: m[5] });
  }
  return toks;
}
var BIN = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };
function parse(src) {
  var toks = tokenize(src), p = 0;
  function peekOp(v) { var t = toks[p]; return t && t.t === 'op' && t.v === v; }
  function eat(v) { if (!peekOp(v)) throw new Error('expected "' + v + '"'); p++; }
  function primary() {
    var t = toks[p++];
    if (!t) throw new Error('the expression ends too early');
    if (t.t === 'num' || t.t === 'str' || t.t === 'lit') return { k: 'lit', v: t.v };
    if (t.t === 'op' && t.v === '(') { var e = ternary(); eat(')'); return e; }
    if (t.t === 'op' && (t.v === '-' || t.v === '!')) return { k: 'un', op: t.v, a: primary() };
    if (t.t === 'id') {
      if (peekOp('(')) {
        p++; var args = [];
        if (!peekOp(')')) { args.push(ternary()); while (peekOp(',')) { p++; args.push(ternary()); } }
        eat(')');
        if (!FN[t.v]) throw new Error('unknown function ' + t.v + '()');
        if (args.length !== ARITY[t.v]) throw new Error(t.v + '() takes ' + ARITY[t.v] + ' value' + (ARITY[t.v] > 1 ? 's' : ''));
        return { k: 'call', f: t.v, args: args };
      }
      return { k: 'var', n: t.v };
    }
    throw new Error('unexpected "' + t.v + '"');
  }
  function binary(min) {
    var left = primary();
    for (;;) {
      var t = toks[p];
      if (!t || t.t !== 'op' || !BIN[t.v] || BIN[t.v] < min) return left;
      p++;
      left = { k: 'bin', op: t.v, a: left, b: binary(BIN[t.v] + 1) };
    }
  }
  function ternary() {
    var c = binary(1);
    if (peekOp('?')) { p++; var a = ternary(); eat(':'); return { k: 'tern', c: c, a: a, b: ternary() }; }
    return c;
  }
  var ast = ternary();
  if (p !== toks.length) throw new Error('extra text near "' + toks[p].v + '"');
  return ast;
}
function same(a, b) {
  if (typeof a !== typeof b) throw new Error('cannot compare ' + show(a) + ' with ' + show(b));
  return a === b;
}
function compile(ast) {
  var a, b, c;
  switch (ast.k) {
    case 'lit': return function () { return ast.v; };
    case 'var': return function (e) { if (!Object.prototype.hasOwnProperty.call(e, ast.n)) throw new Error('unknown name "' + ast.n + '"'); return e[ast.n]; };
    case 'un': a = compile(ast.a); return ast.op === '-' ? function (e) { return -num(scal(a(e))); } : function (e) { return !bool(a(e)); };
    case 'tern': c = compile(ast.c); a = compile(ast.a); b = compile(ast.b); return function (e) { return bool(c(e)) ? a(e) : b(e); };
    case 'call':
      var f = FN[ast.f], args = ast.args.map(compile);
      return function (e) { return f.apply(null, args.map(function (g) { return g(e); })); };
    case 'bin':
      a = compile(ast.a); b = compile(ast.b);
      switch (ast.op) {
        case '&&': return function (e) { return bool(a(e)) && bool(b(e)); };
        case '||': return function (e) { return bool(a(e)) || bool(b(e)); };
        case '==': return function (e) { return same(scal(a(e)), scal(b(e))); };
        case '!=': return function (e) { return !same(scal(a(e)), scal(b(e))); };
        case '<': return function (e) { return num(scal(a(e))) < num(scal(b(e))); };
        case '<=': return function (e) { return num(scal(a(e))) <= num(scal(b(e))); };
        case '>': return function (e) { return num(scal(a(e))) > num(scal(b(e))); };
        case '>=': return function (e) { return num(scal(a(e))) >= num(scal(b(e))); };
        case '+': return function (e) { return num(scal(a(e))) + num(scal(b(e))); };
        case '-': return function (e) { return num(scal(a(e))) - num(scal(b(e))); };
        case '*': return function (e) { return num(scal(a(e))) * num(scal(b(e))); };
        case '/': return function (e) { var y = num(scal(b(e))); if (!y) throw new Error('division by 0'); return num(scal(a(e))) / y; };
        case '%': return function (e) { var y = num(scal(b(e))); if (!y) throw new Error('% by 0'); return num(scal(a(e))) % y; };
      }
  }
  throw new Error('bad expression');
}
var EXPR = {};
function expr(src) {
  if (typeof src !== 'string' || !src.trim()) throw new Error('missing expression');
  if (!EXPR[src]) EXPR[src] = compile(parse(src));
  return EXPR[src];
}
BR.expr = expr;

/* ============================================================ sample spaces */
var SIDES = [2, 3, 4, 6, 8, 10, 12, 20], MAXOUT = 20000;
function face(f) { if (typeof f === 'number') return f; var s = String(f).trim(); return /^-?\d+$/.test(s) ? parseInt(s, 10) : s; }
function pval(v, P, what) {
  if (typeof v === 'string') { if (!(v in P)) throw new Error(what + ' names an unknown setting "' + v + '"'); return P[v]; }
  return v;
}
function groups(it, P) {
  var seen = {};
  return it.space.map(function (g) {
    var name = g.name, n = g.n, faces = null, marbles = null, size;
    if (typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) throw new Error('bad group name "' + name + '"');
    if (FN[name] || RESERVED[name] || name in P || seen[name]) throw new Error('group name "' + name + '" is already used');
    seen[name] = 1;
    if (!(n >= 1 && n <= 4 && n % 1 === 0)) throw new Error(name + ': n must be 1 to 4');
    if (g.kind === 'die') { if (SIDES.indexOf(g.sides) < 0) throw new Error(name + ': a die needs sides ' + SIDES.join('/')); faces = []; for (var i = 1; i <= g.sides; i++) faces.push(i); }
    else if (g.kind === 'coin') faces = ['H', 'T'];
    else if (g.kind === 'faces') { if (!Array.isArray(g.faces) || g.faces.length < 2 || g.faces.length > 12) throw new Error(name + ': faces needs 2 to 12 entries'); faces = g.faces.map(face); }
    else if (g.kind === 'bag') {
      if (!Array.isArray(g.bag) || !g.bag.length) throw new Error(name + ': a bag needs marbles');
      marbles = [];
      g.bag.forEach(function (b) {
        var cnt = pval(b.count, P, name);
        if (!(cnt >= 1 && cnt <= 12 && cnt % 1 === 0)) throw new Error(name + ': marble counts must be 1 to 12');
        for (var k = 0; k < cnt; k++) marbles.push(String(b.color));
      });
      if (marbles.length > 15 || n > marbles.length) throw new Error(name + ': too many marbles or draws');
    } else throw new Error(name + ': unknown kind "' + g.kind + '"');
    if (marbles) { size = 1; for (var j = 0; j < n; j++) size *= marbles.length - j; } else size = Math.pow(faces.length, n);
    return { name: name, n: n, kind: g.kind, faces: faces, marbles: marbles, size: size };
  });
}
function groupOuts(G) {
  var res = [];
  if (G.marbles) {
    (function rec(pre, used) {
      if (pre.length === G.n) { res.push(pre.slice()); return; }
      for (var i = 0; i < G.marbles.length; i++) if (!used[i]) { used[i] = 1; pre.push(G.marbles[i]); rec(pre, used); pre.pop(); used[i] = 0; }
    })([], {});
  } else {
    res = [[]];
    for (var k = 0; k < G.n; k++) {
      var next = [];
      res.forEach(function (r) { G.faces.forEach(function (f) { next.push(r.concat([f])); }); });
      res = next;
    }
  }
  return res.map(function (r) { return G.n === 1 ? r[0] : r; });
}
function enumerate(gs, P) {
  var total = 1;
  gs.forEach(function (G) { total *= G.size; });
  if (total > MAXOUT) throw new Error('too many outcomes (' + total + ')');
  var outs = [{}];
  gs.forEach(function (G) {
    var go = groupOuts(G), next = [];
    outs.forEach(function (o) { go.forEach(function (v) { var e = {}, k; for (k in o) e[k] = o[k]; e[G.name] = v; next.push(e); }); });
    outs = next;
  });
  outs.forEach(function (e) { for (var k in P) e[k] = P[k]; });
  return outs;
}
function test(f, e) { var v = f(e); if (typeof v !== 'boolean') throw new Error('a test must be true or false, but gave ' + show(v)); return v; }
function countIf(outs, f) { var c = 0; for (var i = 0; i < outs.length; i++) if (test(f, outs[i])) c++; return c; }
function sumOf(outs, f) { var s = 0; for (var i = 0; i < outs.length; i++) s += num(scal(f(outs[i]))); return s; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
function reduce(f) { var g = gcd(f.n, f.d) || 1; return { n: f.n / g, d: f.d / g }; }
function fracText(f) { return f.n + ' in ' + f.d; }
function sameFrac(a, b) { return a.n * b.d === b.n * a.d; }
function parseFrac(s) { var m = /^\s*(\d+)\s+in\s+(\d+)\s*$/.exec(String(s)); return m && +m[2] > 0 ? { n: +m[1], d: +m[2] } : null; }
function near(x, y) { return Math.abs(x - y) < 1e-9; }
function fmtAvg(x) { if (near(x, Math.round(x))) return String(Math.round(x)); var r = Math.round(x * 10) / 10; return near(x, r) ? String(r) : 'about ' + r; }
function fmtQuarter(x) { return String(Math.round(x * 100) / 100); }
function fill(s, vars) { return String(s).replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, function (m, k) { return vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m; }); }
var DEAL = ['Good deal', 'Bad deal', 'It is fair'];

/* ==================================================================== solve */
function solve(it, P) {
  var gs = groups(it, P), outs = enumerate(gs, P), N = outs.length, a = it.ask, r = { total: N, cap: null };
  function frac(n, d) { var f = { n: n, d: d }; if (a.simplify) f = reduce(f); r.kind = 'frac'; r.num = f.n; r.den = f.d; r.simple = !!a.simplify; r.display = fracText(f); }
  var c, g, i;
  switch (a.type) {
    case 'count': if (gs.some(function (G) { return G.marbles; })) throw new Error('count questions cannot use a bag (use chance)');
      c = countIf(outs, expr(a.event)); r.kind = 'int'; r.value = r.fav = c; r.cap = N; break;
    case 'total': if (gs.some(function (G) { return G.marbles; })) throw new Error('total questions cannot use a bag');
      r.kind = 'int'; r.value = N; r.cap = N * 4; break;
    case 'chance': c = countIf(outs, expr(a.event)); r.fav = c; frac(c, N); break;
    case 'given':
      var gf = expr(a.given), ef = expr(a.event);
      g = countIf(outs, gf);
      if (!g) throw new Error('the "given" test never happens');
      c = 0; for (i = 0; i < N; i++) if (test(gf, outs[i]) && test(ef, outs[i])) c++;
      r.fav = c; r.given = g; frac(c, g); break;
    case 'compare':
      if (!Array.isArray(a.labels) || a.labels.length !== 3) throw new Error('compare needs 3 labels: first, second, same');
      var A = countIf(outs, expr(a.a)), Bc = countIf(outs, expr(a.b)), L = a.labels.map(function (s) { return fill(s, P); });
      r.kind = 'label'; r.labels = L; r.a_fav = A; r.b_fav = Bc; r.label = A > Bc ? L[0] : Bc > A ? L[1] : L[2]; break;
    case 'expect':
      var T = pval(a.trials, P, 'trials');
      if (!(T >= 1 && T % 1 === 0)) throw new Error('trials must be a whole number');
      c = countIf(outs, expr(a.event));
      if ((T * c) % N) throw new Error('the expected count ' + (T * c / N) + ' is not a whole number; pick trials that divide evenly');
      r.kind = 'int'; r.value = T * c / N; r.fav = c; r.cap = T; break;
    case 'value':
      var s = sumOf(outs, expr(a.expr));
      r.kind = 'dec'; r.value = s / N;
      if (!near(r.value * 4, Math.round(r.value * 4))) throw new Error('the average ' + r.value + ' must be a whole number or end in .25, .5 or .75');
      break;
    case 'best':
      if (!Array.isArray(a.moves) || a.moves.length < 2 || a.moves.length > 3) throw new Error('best needs 2 or 3 moves');
      var metric = a.metric === 'finish' ? 'finish' : 'ev', hp = metric === 'finish' ? pval(a.hp, P, 'hp') : 0;
      if (metric === 'finish' && !(hp >= 1)) throw new Error('finish needs hp');
      var scores = a.moves.map(function (m) {
        var f = expr(m.dmg);
        if (metric === 'ev') return sumOf(outs, f);
        var k = 0; for (var j = 0; j < N; j++) if (num(scal(f(outs[j]))) >= hp) k++;
        return k;
      });
      var best = Math.max.apply(null, scores), winners = scores.filter(function (x) { return near(x, best); }).length;
      r.kind = 'label'; r.labels = a.moves.map(function (m) { return fill(m.label, P); }).concat([a.tie ? fill(a.tie, P) : 'Just the same']);
      r.label = winners > 1 ? r.labels[r.labels.length - 1] : r.labels[scores.indexOf(best)];
      r.detail = a.moves.map(function (m, j) {
        return fill(m.label, P) + ': ' + (metric === 'ev' ? fmtAvg(scores[j] / N) + ' on average' : fracText(reduce({ n: scores[j], d: N })));
      }).join('. ') + '.';
      break;
    case 'deal':
      var cost = pval(a.cost, P, 'cost'), w = sumOf(outs, expr(a.win));
      if (!(cost >= 0)) throw new Error('deal needs a cost');
      r.kind = 'label'; r.labels = DEAL.slice(); r.ev = fmtAvg(w / N);
      r.label = near(w, cost * N) ? DEAL[2] : w > cost * N ? DEAL[0] : DEAL[1];
      r.detail = 'On average you win ' + r.ev + ' coins a go, and each go costs ' + cost + '.';
      break;
    default: throw new Error('unknown question type "' + a.type + '"');
  }
  if (r.kind === 'int') r.display = String(r.value);
  if (r.kind === 'dec') r.display = fmtQuarter(r.value);
  if (r.kind === 'label') r.display = r.label;
  return r;
}

/* =============================================================== choices */
function makeChoices(sol, traps) {
  var picks = [], i;
  if (sol.kind === 'label') return { choices: sol.labels.slice(), a: sol.labels.indexOf(sol.label) };
  if (sol.kind === 'int' || sol.kind === 'dec') {
    var ans = sol.value, isInt = sol.kind === 'int';
    var ok = function (x) {
      return typeof x === 'number' && isFinite(x) && x >= 0 && (isInt ? x % 1 === 0 : near(x * 4, Math.round(x * 4))) && !near(x, ans) &&
        (sol.cap === null || sol.cap === undefined || x <= sol.cap) && picks.every(function (p) { return !near(p, x); });
    };
    traps.forEach(function (t) { var x = parseFloat(t); if (picks.length < 2 && /^\s*\d+(\.\d+)?\s*$/.test(t) && ok(x)) picks.push(x); });
    var step = isInt ? Math.max(1, Math.round(ans * 0.25)) : 0.5;
    U.shuffle([ans + step, ans - step, ans + 2 * step, ans - 2 * step, ans * 2, isInt ? Math.round(ans / 2) : ans / 2, sol.total && isInt ? sol.total - ans : NaN, ans + 1, ans - 1])
      .forEach(function (x) { if (picks.length < 3 && ok(x)) picks.push(x); });
    for (i = 1; picks.length < 3 && i < 60; i++) [ans + i, ans - i, ans + i * step].forEach(function (x) { if (picks.length < 3 && ok(x)) picks.push(x); });
    var all = picks.concat([ans]).sort(function (x, y) { return x - y; });
    return { choices: all.map(function (x) { return isInt ? String(x) : fmtQuarter(x); }), a: all.indexOf(ans) };
  }
  var A = { n: sol.num, d: sol.den };
  var okF = function (f) {
    return f && f.d > 0 && f.n > 0 && f.n < f.d && !sameFrac(f, A) && (!sol.simple || gcd(f.n, f.d) === 1) && picks.every(function (p) { return !sameFrac(p, f); });
  };
  traps.forEach(function (t) { var f = parseFrac(t); if (picks.length < 2 && okF(f)) picks.push(f); });
  var st = Math.max(1, Math.round(A.n * 0.3)), cand;
  if (sol.simple) cand = [[A.n, A.d + 1], [A.n + 1, A.d + 1], [1, A.d * 2], [A.d - A.n, A.d], [1, A.d + 2], [A.n + 1, A.d], [Math.max(1, A.n - 1), A.d], [A.n, A.d * 2]];
  else cand = [[A.n + st, A.d], [A.n - st, A.d], [A.d - A.n, A.d], [A.n + 2 * st, A.d], [A.n * 2, A.d], [A.n - 2 * st, A.d]];
  U.shuffle(cand).forEach(function (c) { var f = { n: c[0], d: c[1] }; if (sol.simple) f = reduce(f); if (picks.length < 3 && okF(f)) picks.push(f); });
  for (i = 1; picks.length < 3 && i < 60; i++) [[A.n + i, A.d], [A.n - i, A.d], [1, A.d + i]].forEach(function (c) {
    var f = { n: c[0], d: c[1] }; if (sol.simple) f = reduce(f); if (picks.length < 3 && okF(f)) picks.push(f);
  });
  var allF = picks.concat([A]).sort(function (x, y) { return x.n / x.d - y.n / y.d; });
  return { choices: allF.map(fracText), a: allF.indexOf(A) };
}

/* ================================================================ pictures */
function flat(e, gs) { var o = []; gs.forEach(function (G) { o = o.concat(vec(e[G.name])); }); return o; }
function vizFor(it, P) {
  var a = it.ask;
  if (['count', 'chance', 'given', 'expect'].indexOf(a.type) < 0) return null;
  var gs = groups(it, P), dice = 0;
  if (gs.some(function (G) { return G.marbles; })) return null;
  gs.forEach(function (G) { dice += G.n; });
  var outs = enumerate(gs, P), ef = expr(a.event), gf = a.type === 'given' ? expr(a.given) : null;
  var mask = outs.map(function (e) { var g = gf ? test(gf, e) : true; return g ? (test(ef, e) ? 2 : 1) : 0; });
  if (!gf) mask = mask.map(function (m) { return m === 2 ? 2 : 0; });
  if (gs.every(function (G) { return G.kind === 'coin'; })) return dice <= 4 ? { t: 'coinlist', outs: outs.map(function (e) { return flat(e, gs); }), mask: mask } : null;
  if (gs.some(function (G) { return G.kind === 'coin'; })) return null;
  if (dice === 1) return { t: 'facelist', faces: gs[0].faces, mask: mask };
  if (dice === 2) {
    var fa = gs[0].faces, fb = gs.length > 1 ? gs[1].faces : gs[0].faces;
    if (fa.length <= 8 && fb.length <= 8) return { t: 'grid2', rows: fa, cols: fb, mask: mask };
  }
  return null;
}

/* ============================================================ the database */
function toMap(x) {
  if (!x) return {};
  if (Array.isArray(x)) { var m = {}; x.forEach(function (p) { m[p.name] = p.values !== undefined ? p.values : p.value; }); return m; }
  return x;
}
var NORM = {};
function norm(raw) {
  if (raw.id && NORM[raw.id] && NORM[raw.id].raw === raw) return NORM[raw.id].it;
  var it = {
    id: raw.id, lvl: raw.lvl, skill: raw.skill, q: raw.q, why: raw.why, traps: raw.traps || [],
    params: toMap(raw.params), space: raw.space || [], ask: raw.ask || {},
    checks: (raw.checks || []).map(function (c) { return { params: toMap(c.params), answer: c.answer }; })
  };
  if (raw.id) NORM[raw.id] = { raw: raw, it: it };
  return it;
}
function combos(params) {
  var keys = Object.keys(params), out = [{}];
  keys.forEach(function (k) {
    var vals = params[k], next = [], uniq = [];
    if (!Array.isArray(vals) || !vals.length) throw new Error('setting "' + k + '" needs a list of values');
    vals.forEach(function (v) { if (uniq.indexOf(v) < 0) uniq.push(v); });
    out.forEach(function (o) { uniq.forEach(function (v) { var c = {}, q; for (q in o) c[q] = o[q]; c[k] = v; next.push(c); }); });
    out = next;
  });
  return out;
}
function pickParams(it) { var P = {}; for (var k in it.params) P[k] = U.pick(it.params[k]); return P; }

/* Turn a database puzzle into a question card: { q, choices, a, why, viz, id, lvl, skill } */
BR.instantiate = function (raw, P) {
  var it = norm(raw);
  P = P || pickParams(it);
  var sol = solve(it, P), vars = {}, k;
  for (k in P) vars[k] = P[k];
  ['fav', 'total', 'given', 'a_fav', 'b_fav', 'detail', 'ev'].forEach(function (x) { if (sol[x] !== undefined) vars[x] = sol[x]; });
  vars.answer = sol.display;
  var ch = makeChoices(sol, it.traps.map(function (t) { return fill(t, vars); }));
  return { id: it.id, lvl: it.lvl, skill: it.skill, q: fill(it.q, vars), choices: ch.choices, a: ch.a, why: fill(it.why, vars), viz: vizFor(it, P), answer: sol.display, params: P };
};
BR.solve = function (raw, P) { return solve(norm(raw), P || {}); };

function answerMatches(sol, s) {
  s = String(s).trim();
  if (sol.kind === 'label') return s.toLowerCase() === sol.label.toLowerCase();
  if (sol.kind === 'frac') { var f = parseFrac(s); return !!f && sameFrac(f, { n: sol.num, d: sol.den }); }
  return /^-?\d+(\.\d+)?$/.test(s) && near(parseFloat(s), sol.value);
}
/* Checks one database puzzle completely: every setting, the answer key, the choices, the wording. */
BR.verifyItem = function (raw) {
  var errs = [], it, cs = [];
  try { it = norm(raw); } catch (e) { return { ok: false, errors: [e.message], combos: 0 }; }
  var need = function (c, msg) { if (!c) errs.push(msg); };
  need(typeof it.id === 'string' && /^[a-z0-9][a-z0-9-]{2,40}$/.test(it.id), 'id must be 3-41 lowercase letters, digits or dashes');
  need(it.lvl >= 1 && it.lvl <= 15 && it.lvl % 1 === 0, 'lvl must be a whole number from 1 to 15');
  need(typeof it.skill === 'string' && /^[a-z0-9-]{2,24}$/.test(it.skill), 'skill must be a short lowercase tag');
  need(typeof it.q === 'string' && it.q.length >= 10, 'q is missing');
  need(typeof it.why === 'string' && it.why.length >= 10, 'why is missing');
  need(Array.isArray(it.space) && it.space.length >= 1 && it.space.length <= 4, 'space needs 1 to 4 groups');
  if (errs.length) return { ok: false, errors: errs, combos: 0 };
  try { cs = combos(it.params); } catch (e) { return { ok: false, errors: [e.message], combos: 0 }; }
  if (cs.length > 60) return { ok: false, errors: ['too many setting combinations (' + cs.length + ')'], combos: cs.length };
  var sols = [];
  cs.forEach(function (P) {
    var tag = Object.keys(P).length ? '[' + Object.keys(P).map(function (k) { return k + '=' + P[k]; }).join(', ') + '] ' : '';
    try {
      var sol = solve(it, P);
      sols.push({ P: P, sol: sol });
      for (var rep = 0; rep < 4; rep++) {
        var q = BR.instantiate(raw, P);
        var n = q.choices.length;
        if (sol.kind === 'label') { if (n < 2 || n > 4) throw new Error('needs 2 to 4 answer choices'); }
        else if (n !== 4) throw new Error('could only make ' + n + ' answer choices');
        if (q.a < 0 || q.choices[q.a] !== sol.display) throw new Error('the right answer is not among the choices');
        q.choices.forEach(function (c, i) {
          if (q.choices.indexOf(c) !== i) throw new Error('two choices are the same: ' + c);
          if (i !== q.a && answerMatches(sol, c)) throw new Error('choice "' + c + '" is also right');
        });
        [q.q, q.why].concat(q.choices).forEach(function (s) { var m = /\{[A-Za-z_][A-Za-z0-9_]*\}/.exec(s); if (m) throw new Error('unknown placeholder ' + m[0]); });
        if (q.q.length > 280) throw new Error('question is too long (' + q.q.length + ' characters, max 280)');
        if (q.why.length > 360) throw new Error('explanation is too long (' + q.why.length + ' characters, max 360)');
        q.choices.forEach(function (c) { if (c.length > 40) throw new Error('choice "' + c + '" is too long'); });
      }
    } catch (e) { errs.push(tag + e.message); }
  });
  /* The author's own expected answers. A mismatch means the words and the maths disagree. */
  var want = Math.min(cs.length, 12);
  if (it.checks.length < want) errs.push('needs a check (expected answer) for ' + (cs.length <= 12 ? 'every setting combination' : 'at least 12 combinations') + '; has ' + it.checks.length);
  it.checks.forEach(function (c) {
    var hit = sols.filter(function (s) { return Object.keys(s.P).every(function (k) { return s.P[k] === c.params[k]; }) && Object.keys(c.params).length === Object.keys(s.P).length; })[0];
    if (!hit) { errs.push('check ' + JSON.stringify(c.params) + ' does not match any setting combination'); return; }
    if (!answerMatches(hit.sol, c.answer)) errs.push('check ' + JSON.stringify(c.params) + ': the author expected "' + c.answer + '" but the dice say "' + hit.sol.display + '"');
  });
  return { ok: !errs.length, errors: errs, combos: cs.length };
};

/* Installs a database (bundled or downloaded). Returns how many puzzles it holds. */
BR.useDatabase = function (db) {
  if (!db || !Array.isArray(db.items)) return 0;
  SH.BANK = db.items; BR.dbVersion = db.version || 0; BR.dbUpdated = db.updated || ''; POOL = null; BAD = {};
  return db.items.length;
};

/* ============================================================ adaptive picker */
BR.TARGETS = [0.6, 0.7, 0.8];
BR.STEP = 0.5;                       /* rating points (logits) between neighbouring levels */
function logit(p) { return Math.log(p / (1 - p)); }
function sig(x) { return 1 / (1 + Math.exp(-x)); }
BR.beta = function (L) { return BR.STEP * (L - 1); };
var POOL = null, BAD = {};
function pool() {
  if (!POOL) POOL = SH.TEMPLATES.concat((SH.BANK || []).filter(function (b) { return b && b.id && b.lvl >= 1; }));
  return POOL;
}
BR.maxLevel = function () { return pool().reduce(function (m, e) { return Math.max(m, e.lvl); }, 1); };
BR.countByLevel = function () { var c = {}; pool().forEach(function (e) { c[e.lvl] = (c[e.lvl] || 0) + 1; }); return c; };

BR.ensure = function (save) {
  var br = save.brain || (save.brain = {});
  if (typeof br.theta !== 'number' || !isFinite(br.theta)) {
    var start = br.mode === 'hard' || br.lvl === 2 ? 7 : br.mode === 'medium' || br.lvl === 1 ? 4 : 1;
    br.mode = br.mode === 'off' ? 'off' : 'auto';
    br.target = 0.7; br.theta = BR.beta(start) + logit(0.7); br.n = 0;
    br.right = br.right || 0; br.asked = br.asked || 0; br.hist = []; br.seen = {}; br.recent = [];
    delete br.lvl; delete br.streak; delete br.last;
  }
  if (BR.TARGETS.indexOf(br.target) < 0) br.target = 0.7;
  if (!br.hist) br.hist = []; if (!br.seen) br.seen = {}; if (!br.recent) br.recent = [];
  return br;
};
/* The level whose puzzles this player should get right `target` of the time. */
BR.levelReal = function (save) { var br = BR.ensure(save); return 1 + (br.theta - logit(br.target)) / BR.STEP; };
BR.level = function (save) { return Math.max(1, Math.min(BR.maxLevel(), Math.round(BR.levelReal(save)))); };
BR.setLevel = function (save, L) {
  var br = BR.ensure(save);
  L = Math.max(1, Math.min(BR.maxLevel(), L));
  br.theta = BR.beta(L) + logit(br.target); br.n = Math.max(br.n, 6);
};
BR.recentRate = function (save, n) {
  var h = BR.ensure(save).hist.slice(-(n || 20)), r = 0;
  h.forEach(function (x) { r += x.ok; });
  return { right: r, n: h.length };
};

/* Pick the level first (a bell curve around the target level), then a puzzle within it.
   Choosing the level first stops a level with many puzzles from pulling the player towards it. */
BR.pick = function (save) {
  var br = BR.ensure(save), tl = Math.max(1, Math.min(BR.maxLevel(), BR.levelReal(save))), byL = {};
  pool().forEach(function (e) {
    if (BAD[e.id]) return;
    var w = 1, last = br.seen[e.id];
    if (last !== undefined) {
      var ago = br.asked - last;
      w = ago < 3 ? 0.01 : e.tpl ? (ago < 8 ? 0.3 : 1) : (ago < 40 ? 0.05 : ago < 120 ? 0.4 : 1);
    }
    if (br.recent.indexOf(e.skill) >= 0) w *= 0.35;
    var L = byL[e.lvl] || (byL[e.lvl] = { items: [], sum: 0 });
    L.items.push([e, w]); L.sum += w;
  });
  function draw(list) {
    var tot = 0, i; for (i = 0; i < list.length; i++) tot += list[i][1];
    var x = SH.rand() * tot;
    for (i = 0; i < list.length; i++) { x -= list[i][1]; if (x <= 0) return list[i][0]; }
    return list[list.length - 1][0];
  }
  for (var tries = 0; tries < 8; tries++) {
    var levels = Object.keys(byL).map(Number).map(function (L) { return [L, Math.exp(-(L - tl) * (L - tl) / 0.8) * Math.min(1, byL[L].sum)]; })
      .filter(function (x) { return x[1] > 1e-9; });
    if (!levels.length) break;
    var Lsel = draw(levels), e = draw(byL[Lsel].items);
    try {
      var q;
      if (e.tpl) { q = e.make(); q.id = e.id; q.lvl = e.lvl; q.skill = e.skill; }
      else q = BR.instantiate(e);
      return q;
    } catch (err) {
      BAD[e.id] = 1;
      byL[Lsel].items = byL[Lsel].items.filter(function (x) { return x[0] !== e; });
      byL[Lsel].sum = byL[Lsel].items.reduce(function (s, x) { return s + x[1]; }, 0);
      if (!byL[Lsel].items.length) delete byL[Lsel];
      if (root.console) console.warn('Skipping puzzle ' + e.id + ': ' + err.message);
    }
  }
  var t = SH.TEMPLATES[0], q0 = t.make(); q0.id = t.id; q0.lvl = t.lvl; q0.skill = t.skill;
  return q0;
};

/* Update the rating after an answer. Correct answers raise it, wrong ones lower it, by how
   surprising the result was. It settles where the player gets `target` of the puzzles right. */
BR.record = function (save, q, ok) {
  var br = BR.ensure(save), before = BR.level(save);
  var P = sig(br.theta - BR.beta(q.lvl)), K = Math.max(0.3, 1 / (1 + br.n / 6));
  br.theta += K * ((ok ? 1 : 0) - P);
  var lo = BR.beta(1) + logit(br.target) - 1, hi = BR.beta(BR.maxLevel()) + logit(br.target) + 1.5;
  br.theta = Math.max(lo, Math.min(hi, br.theta));
  br.n++; br.asked++; if (ok) br.right++;
  br.hist.push({ l: q.lvl, ok: ok ? 1 : 0 }); if (br.hist.length > 40) br.hist.shift();
  br.seen[q.id] = br.asked;
  br.recent = [q.skill].concat(br.recent).slice(0, 2);
  var keys = Object.keys(br.seen);
  if (keys.length > 400) keys.forEach(function (k) { if (br.asked - br.seen[k] > 300) delete br.seen[k]; });
  return { before: before, after: BR.level(save), ceiling: br.theta >= hi - 1e-9 };
};

SH.BR = BR;
root.BR = BR;
if (typeof module !== 'undefined' && module.exports) module.exports = BR;
})(typeof globalThis !== 'undefined' ? globalThis : this);
