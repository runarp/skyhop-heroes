// Checks the offline install works when served from a subfolder, as GitHub Pages does.
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PRE = '/skyhop-heroes/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/skyhop-heroes') { res.writeHead(301, { location: PRE }); return res.end(); }
  if (!u.startsWith(PRE)) { res.writeHead(404); return res.end(); }
  u = u.slice(PRE.length) || 'index.html';
  const p = path.join(dist, u);
  if (!p.startsWith(dist) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(fs.readFileSync(p));
}).listen(0);
const url = `http://localhost:${server.address().port}${PRE}`;
const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(url); await p.waitForSelector('.title');
const info = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return { scope: r.scope, manifest: document.querySelector('link[rel=manifest]').href }; });
const man = await (await p.request.get(info.manifest)).json();
await p.evaluate(() => { UI.ACT.newGame({ i: 0 }); document.getElementById('ng-name').value = 'Sub'; UI.ACT.startGame(); });
await p.waitForTimeout(1200);
await ctx.setOffline(true); await p.reload(); await p.waitForSelector('.title', { timeout: 8000 });
const name = await p.evaluate(() => document.querySelector('.slot-info b') && document.querySelector('.slot-info b').textContent);
console.log(JSON.stringify({ scope: info.scope, start_url: man.start_url, icons: man.icons.map(i => i.src), offlineReloadSave: name, errors: errs }));
await b.close(); server.close();
process.exit(name === 'Sub' && !errs.length ? 0 : 1);
