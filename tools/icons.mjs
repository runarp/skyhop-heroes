// Renders the home-screen icons from the game's own artwork.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const html = `<html><body style="margin:0"><div id="i" style="width:512px;height:512px;position:relative;overflow:hidden;background:linear-gradient(#7fd0ff,#2f8fd6)"></div>
<script>${src('engine.js')}</script><script>${src('art.js')}</script><script>${src('art2.js')}</script><script>
const i=document.getElementById('i');
i.innerHTML='<div style="position:absolute;left:-40px;right:-40px;bottom:-150px;height:300px;border-radius:50%;background:#8ed46c;border:14px solid #2a1f3d"></div>'
 +'<div style="position:absolute;left:26px;top:30px;width:190px;transform:rotate(-14deg)">'+ART.plane()+'</div>'
 +'<div style="position:absolute;left:66px;top:74px;width:400px;height:400px">'+ART.hero('zip')+'</div>'
 +'<div style="position:absolute;right:30px;top:44px;width:120px;height:120px;transform:rotate(12deg)">'+ART.die(6,5)+'</div>';
</script></body></html>`;
const b = await chromium.launch();
for (const s of [512, 192, 180]) {
  const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: s / 512 });
  await p.setContent(html);
  await p.screenshot({ path: path.join(root, 'src/icons', `icon-${s}.png`), clip: { x: 0, y: 0, width: 512, height: 512 } });
  await p.close();
}
await b.close();
console.log('icons ok');
