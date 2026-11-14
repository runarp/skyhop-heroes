// End-to-end smoke test: plays through London in a headless browser, checks for errors,
// verifies offline start, and saves screenshots. Run: node tools/smoke.mjs [outDir]
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const out = process.argv[2] || path.join(root, '..', 'shots');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let f = decodeURIComponent(req.url.split('?')[0]); if (f === '/') f = '/index.html';
  const p = path.join(root, f);
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(fs.readFileSync(p));
}).listen(0);
const port = server.address().port, url = `http://localhost:${port}/`;
const errors = [];
const browser = await chromium.launch();

async function open(viewport, name) {
  const ctx = await browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`); });
  await page.goto(url);
  await page.waitForSelector('.title');
  return { ctx, page };
}
const shot = (page, n) => page.screenshot({ path: path.join(out, n + '.png') });
const tap = async (page, sel) => { await page.locator(sel).first().click({ force: true }); };

async function playBattle(page, tag, wantShots) {
  let took = {}, guard = 0;
  while (guard++ < 900) {
    if (await page.locator('.cityscreen').count() && !(await page.locator('#modal.on').count())) return true;
    if (await page.locator('#modal.on').count()) {
      if (wantShots && await page.locator('.quiz-q').count() && !took.quiz) { took.quiz = 1; await shot(page, tag + '-quiz'); }
      const again = page.locator('#modal [data-pick="again"]');
      if (await again.count()) { await again.click({ force: true }); continue; }
      const pick = page.locator('#modal [data-pick]:not(.right):not(.wrong)');
      const n = await pick.count();
      if (n) {
        if (wantShots && await page.locator('#quiz-why .why').count() && !took.why) { took.why = 1; await shot(page, tag + '-quiz-answer'); }
        if (wantShots && await page.locator('.bigstar').count() && !took.star) { took.star = 1; await shot(page, tag + '-star'); }
        await pick.nth(await page.locator('#quiz-why .why').count() ? n - 1 : 0).click({ force: true }).catch(() => {});
      }
      await page.waitForTimeout(60); continue;
    }
    const deck = page.locator('#deck:not(.wait)');
    if (!(await deck.count())) { await page.waitForTimeout(80); continue; }
    if (await page.locator('#deck [data-pick="y"]').count()) { if (wantShots && !took.reroll) { took.reroll = 1; await shot(page, tag + '-reroll'); } await page.locator('#deck [data-pick="y"]').click({ force: true }); continue; }
    if (wantShots && !took.turn && guard > 3) { took.turn = 1; await shot(page, tag + '-turn'); }
    const big = await page.locator('#intent.big').count();
    const brain = page.locator('.ubtn.brain.ready');
    if (await brain.count() && Math.random() < 0.8) { await brain.click({ force: true }); continue; }
    if (big) { await tap(page, '[data-act="bBlock"]'); await page.waitForTimeout(350); if (wantShots && !took.clash) { took.clash = 1; await page.waitForTimeout(900); await shot(page, tag + '-clash'); } continue; }
    const sp = page.locator('.move.special:not([disabled])');
    if (await sp.count()) { await sp.click({ force: true }); continue; }
    const moves = page.locator('.move:not(.special)');
    await moves.nth(Math.random() < 0.6 ? 1 : Math.floor(Math.random() * 3)).click({ force: true });
    await page.waitForTimeout(120);
  }
  return false;
}

// ---------- iPad landscape: full London run
{
  const { ctx, page } = await open({ width: 1180, height: 820 }, 'ipad-land');
  await shot(page, '01-title');
  await tap(page, '[data-act="newGame"]');
  await page.fill('#ng-name', 'Tester');
  await tap(page, '[data-act="ngHero"][data-id="zip"]');
  await shot(page, '02-newgame');
  await tap(page, '[data-act="startGame"]');
  for (let i = 0; i < 3; i++) { if (i === 0) await shot(page, '03-intro'); await tap(page, '#modal [data-pick]'); }
  await page.waitForSelector('.cityscreen');
  await page.evaluate(() => { UI.store.settings.fast = true; });
  await shot(page, '04-city');
  for (let stage = 0; stage < 4; stage++) {
    await tap(page, `.stage[data-i="${stage}"]`);
    if (stage === 0 || stage === 3) await shot(page, `05-scout-${stage}`);
    await tap(page, '[data-act="fight"]');
    if (stage === 0) { for (let i = 0; i < 5; i++) { if (i === 0) await shot(page, '06-howto'); await tap(page, '#modal [data-pick]'); } }
    const ok = await playBattle(page, `07-battle-${stage}`, stage === 0 || stage === 3);
    if (!ok) errors.push('battle did not finish, stage ' + stage);
    const st = await page.evaluate(() => ({ lvl: UI.S.lvl, coins: UI.S.coins, prog: UI.S.prog, stars: UI.S.stars, heroes: UI.S.heroes, wins: UI.S.wins, losses: UI.S.losses }));
    console.log('after stage', stage, JSON.stringify(st));
  }
  await shot(page, '08-city-done');
  await tap(page, '[data-act="shop"]'); await shot(page, '09-shop');
  const buy = page.locator('[data-act="buyGear"]:not([disabled])'); if (await buy.count()) await buy.first().click({ force: true });
  const buyI = page.locator('[data-act="buyItem"]:not([disabled])'); if (await buyI.count()) await buyI.first().click({ force: true });
  await tap(page, '[data-act="closeModal"]');
  await tap(page, '[data-act="team"]'); await shot(page, '10-team-heroes');
  await tap(page, '[data-act="tab"][data-t="bag"]'); await shot(page, '11-team-bag');
  await tap(page, '[data-act="tab"][data-t="passport"]'); await shot(page, '12-team-passport');
  await tap(page, '[data-act="closeTeam"]');
  await tap(page, '[data-act="derby"]'); await shot(page, '13-derby');
  await tap(page, '[data-act="derbyGo"]');
  await page.waitForSelector('[data-act="closeDerby"]', { timeout: 60000 }); await shot(page, '14-derby-done');
  await tap(page, '[data-act="closeDerby"]');
  await tap(page, '[data-act="settings"]'); await shot(page, '15-settings'); await tap(page, '[data-act="closeSettings"]');
  // Brain Gym: five puzzles, screenshots of the first question, its explanation and the summary
  await tap(page, '[data-act="gym"]'); await shot(page, '15b-gym-intro'); await tap(page, '#modal [data-pick="go"]');
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector('.quiz-q');
    if (i === 0) await shot(page, '15c-gym-question');
    await tap(page, '#quiz-a [data-pick]');
    await page.waitForSelector('#quiz-why .why');
    if (i === 0) await shot(page, '15d-gym-why');
    await tap(page, '#modal [data-pick="ok"]');
  }
  await page.waitForSelector('#modal [data-pick="ok"]'); await shot(page, '15e-gym-done'); await tap(page, '#modal [data-pick="ok"]');
  await tap(page, '[data-act="settings"]'); await shot(page, '15f-settings-report'); await tap(page, '[data-act="closeSettings"]');
  await tap(page, '[data-act="map"]'); await shot(page, '16-map');
  await tap(page, '.pin[data-id="tokyo"]'); await shot(page, '17-map-locked');
  await tap(page, '.pin[data-id="paris"]');
  await tap(page, '[data-act="fly"]'); await page.waitForTimeout(450); await shot(page, '18-flying');
  await page.waitForSelector('.cityscreen', { timeout: 15000 }); await shot(page, '19-paris');
  const st = await page.evaluate(() => ({ city: UI.S.city, km: UI.S.km, saved: JSON.parse(localStorage.getItem('skyhop-heroes.v1')).saves[0].city }));
  console.log('travel', JSON.stringify(st));
  if (st.city !== 'paris' || st.saved !== 'paris') errors.push('travel/save failed');
  // offline: wait for the service worker, cut the network, reload
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(800);
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector('.title', { timeout: 8000 });
  const off = await page.evaluate(() => ({ name: document.querySelector('.slot-info b') && document.querySelector('.slot-info b').textContent, ctl: !!navigator.serviceWorker.controller }));
  console.log('offline reload', JSON.stringify(off));
  if (off.name !== 'Tester') errors.push('offline reload did not restore the save');
  await shot(page, '20-offline-title');
  await ctx.close();
}
// ---------- other sizes: layout shots of city, battle, map
for (const [name, vp] of [['ipad-port', { width: 820, height: 1180 }], ['phone', { width: 390, height: 844 }], ['phone-land', { width: 844, height: 390 }], ['ipad-mini', { width: 1024, height: 700 }]]) {
  const { ctx, page } = await open(vp, name);
  await page.evaluate(() => {
    const s = SH.newSave('Mia', 'luna'); s.heroes = ['luna', 'bo', 'coco', 'pip']; s.lvl = 6; s.coins = 240; s.stars = ['london', 'paris', 'oslo']; s.prog = { london: 4, paris: 4, oslo: 4, rome: 2 }; s.city = 'rome'; s.seen = { how: 1 };
    s.items = { apple: 2, sandwich: 2, redie: 2, bubble: 1, bomb: 1 }; s.owned = ['w1', 'w2', 's1', 'c_beret']; s.gear = { w: 'w2', s: 's1', c: 'c_beret' };
    UI.store.saves[0] = s; UI.store.settings.fast = true; UI.ACT.play({ i: 0 });
  });
  await page.waitForSelector('.cityscreen'); await shot(page, `${name}-city`);
  await tap(page, '.stage[data-i="2"]'); await shot(page, `${name}-scout`);
  await tap(page, '[data-act="fight"]'); await page.waitForSelector('#deck:not(.wait)'); await page.waitForTimeout(200); await shot(page, `${name}-battle`);
  await tap(page, '.move.strong'); await page.waitForTimeout(700); await shot(page, `${name}-battle-roll`);
  for (let i = 0; i < 200; i++) {
    if (await page.locator('#deck:not(.wait) [data-pick="n"]').count()) { await shot(page, `${name}-reroll`); await tap(page, '#deck [data-pick="n"]'); }
    else if (await page.locator('#deck:not(.wait) .moves').count()) break;
    await page.waitForTimeout(100);
  }
  if (await page.locator('.ubtn.brain.ready').count()) { await tap(page, '.ubtn.brain.ready'); await shot(page, `${name}-quiz`); await tap(page, '#modal [data-pick]'); await shot(page, `${name}-quiz-why`); await tap(page, '#modal [data-pick="ok"]'); }
  if (await page.locator('[data-act="bBag"]:not([disabled])').count()) { await tap(page, '[data-act="bBag"]'); await shot(page, `${name}-bag`); await tap(page, '[data-act="bBack"]'); }
  await tap(page, '[data-act="bMenu"]'); await tap(page, '[data-act="runAway"]');
  await page.waitForSelector('.cityscreen'); await tap(page, '[data-act="map"]'); await page.waitForTimeout(200); await shot(page, `${name}-map`);
  await tap(page, '[data-act="city"]'); await tap(page, '[data-act="team"]'); await shot(page, `${name}-team`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  if (overflow) errors.push(name + ': page scrolls sideways');
  await ctx.close();
}
await browser.close(); server.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
process.exit(errors.length ? 1 : 0);
