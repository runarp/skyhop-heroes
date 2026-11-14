// Builds dist/: index.html (installable offline web app), sw.js, manifest, and
// artifact.html (the same game as a page fragment for claude.ai Artifacts).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const root = path.dirname(fileURLToPath(import.meta.url));
const rd = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const b64 = f => fs.readFileSync(path.join(root, 'src/fonts', f)).toString('base64');
const fontCss = [500, 700].map(w => `@font-face{font-family:'Fredoka';font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${b64(`fredoka-latin-${w}-normal.woff2`)}) format('woff2')}`).join('\n');
const css = fontCss + '\n' + rd('style.css');
const scripts = ['engine.js', 'art.js', 'art2.js', 'ui.js', 'battle.js'];
for (const f of scripts) if (/<\/script/i.test(rd(f))) throw new Error(f + ' contains a closing script tag');
const js = scripts.map(f => `<script>\n${rd(f)}\n</script>`).join('\n');
const body = `<div id="app"></div>\n<div id="modal"></div>\n<div id="toast" aria-live="polite"></div>`;
const boot = `<script>UI.boot();</script>`;
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'src/icons'))) fs.copyFileSync(path.join(root, 'src/icons', f), path.join(dist, f));
fs.writeFileSync(path.join(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

const artifact = `<title>Skyhop Heroes</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n${css}\n</style>\n${body}\n${js}\n${boot}\n`;
fs.writeFileSync(path.join(dist, 'artifact.html'), artifact);

const pwa = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Skyhop Heroes">
<meta name="theme-color" content="#6ec6ff">
<meta name="robots" content="noindex, nofollow">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/png" href="icon-192.png">
<title>Skyhop Heroes</title>
<style>
html{box-sizing:border-box;background:#6ec6ff;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}
[hidden]{display:none!important}
${css}
</style>
</head>
<body>
${body}
${js}
${boot}
<script>
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dist, 'index.html'), pwa);
const hash = crypto.createHash('sha256').update(pwa).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(dist, 'sw.js'), `// Skyhop Heroes offline cache. A new build changes the cache name, which refreshes every file.
const CACHE = 'skyhop-heroes-${hash}';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit || caches.match('index.html'));
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
});
`);
fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify({
  name: 'Skyhop Heroes', short_name: 'Skyhop', description: 'A dice-and-brains fighter RPG around the world.',
  start_url: './', scope: './', display: 'standalone', orientation: 'any', background_color: '#6ec6ff', theme_color: '#6ec6ff',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }]
}, null, 2));
console.log('built: index.html', (pwa.length / 1024).toFixed(0) + ' KB, artifact.html', (artifact.length / 1024).toFixed(0) + ' KB, cache', hash);
