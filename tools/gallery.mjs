// Renders a contact sheet of all character art for visual review.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2] || 'gallery.png';
const what = process.argv[3] || 'chars';
const engine = fs.readFileSync(new URL('../src/engine.js', import.meta.url), 'utf8');
const art = fs.readFileSync(new URL('../src/art.js', import.meta.url), 'utf8') + ';' + fs.readFileSync(new URL('../src/art2.js', import.meta.url), 'utf8');
const html = `<html><body style="margin:0;background:#bfe6ff;font-family:sans-serif"><div id="g" style="display:flex;flex-wrap:wrap;gap:6px;padding:10px"></div>
<script>${engine}</script><script>${art}</script><script>
const g=document.getElementById('g');
function card(svg,label,w){const d=document.createElement('div');d.style.cssText='width:'+(w||150)+'px;text-align:center;font-size:11px;background:#ffffff88;border-radius:8px';d.innerHTML=svg+'<div>'+label+'</div>';g.appendChild(d);}
if('${what}'==='chars'){
 SH.HERO_ORDER.forEach(id=>card(ART.hero(id),id));
 SH.CITIES.forEach(c=>{[0,1,3].forEach(s=>{const m=SH.makeMob(c,s);card(ART.mob(m),m.name);});});
} else if('${what}'==='scenes'){
 SH.CITIES.forEach(c=>card(ART.scene(c.id),c.name,400));
} else if('${what}'==='map'){
 card(ART.worldMap(),'map',1180);
} else { ['d6','d8','d12','c'].forEach(t=>{for(let v=(t==='c'?0:1);v<=(t==='c'?1:t==='d6'?6:t==='d8'?8:12);v++)card(ART.die(t==='c'?'c':+t.slice(1),v),t+':'+v,70);}); Object.keys(ART.ICONS||{}).forEach(k=>card(ART.icon(k),k,60)); card(ART.plane(),'plane',120);}
</script></body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true });
if (errs.length) console.log('ERRORS:', errs.join('\n'));
await b.close();
