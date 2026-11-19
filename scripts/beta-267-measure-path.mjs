// Local full-path timing for candidate B. No Shopify write.
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {ringCartLines} from '../app/workshop/beta-267-ring.mjs';
import {renderCustomerCart, renderCartDrawer} from '../app/workshop/beta-267-cart.mjs';
import {resolveCheckoutPreview} from '../app/workshop/beta-267-checkout-preview.mjs';

const outDir = new URL('../docs/handoffs/2026-11-19-grok-beta-267/', import.meta.url);
const {ledger, lineA, lineB, nord, sued} = ringCartLines();
const pageHtml = renderCustomerCart(ledger.lines(), {title:'Warenkorb'});
const drawerHtml = renderCartDrawer(ledger.lines());
const card = (line, png) => `<button type="button" class="card" data-design="${line.designName}" data-src="data:image/png;base64,${png.toString('base64')}"><img alt="${line.designName}" src="data:image/png;base64,${png.toString('base64')}" width="120"></button>`;
const appHtml = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ring lokal</title>
<style>body{margin:0;font:16px/1.4 system-ui;background:#f4f1ea;color:#1d2422}main{max-width:1100px;margin:auto;padding:16px}button{min-height:44px}img{max-width:100%;height:auto}.cards{display:flex;gap:12px;overflow:auto}.stage{max-width:280px}</style></head>
<body><main id="view"></main><script>
const nord=${JSON.stringify(nord.png.toString('base64'))};
const sued=${JSON.stringify(sued.png.toString('base64'))};
const mark=name=>performance.mark(name);
const view=document.querySelector('#view');
function product(){view.innerHTML='<h1>Klingelschild Ring Wired Pro (3. Gen)</h1><p>49,99 € · SKU FK-AV2A-16x28-1441 · Variante 57471227756924</p><img alt="Produkt" src="data:image/png;base64,'+nord+'" width="240"><p><button id="go" type="button">Jetzt personalisieren</button></p>';
 document.querySelector('#go').onclick=()=>{mark('editor-click');editor();};mark('product-ready');}
async function editor(){view.innerHTML='<h1>Gestaltung</h1><div class="cards"><button type="button" id="a">Strichdesign</button><button type="button" id="b">Klar & modern</button></div><img id="stage" class="stage" alt="Bühne"><p><button id="cart" type="button">In den Warenkorb</button></p>';
 const stage=document.querySelector('#stage');
 const show=async(src,name)=>{stage.src='data:image/png;base64,'+src;await stage.decode();mark(name);};
 document.querySelector('#a').onclick=()=>show(nord,'switch-strich');
 document.querySelector('#b').onclick=()=>show(sued,'switch-modern');
 document.querySelector('#cart').onclick=()=>{mark('cart-click');location.href='/cart';};
 await show(nord,'cards-ready');}
product();
</script></body></html>`;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const body = url.pathname === '/cart' ? pageHtml : url.pathname === '/drawer' ? drawerHtml : appHtml;
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store'});
  res.end(body);
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const port = server.address().port;
const chrome = spawn('google-chrome', ['--headless=new','--disable-gpu','--no-sandbox','--remote-debugging-port=9223','about:blank'], {stdio:'ignore'});
async function debuggerUrl(){
  for (let i = 0; i < 50; i++) {
    try { const response = await fetch('http://127.0.0.1:9223/json/version'); if (response.ok) return (await response.json()).webSocketDebuggerUrl; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Chrome nicht erreichbar');
}
const browser = new WebSocket(await debuggerUrl());
await new Promise(resolve => browser.addEventListener('open', resolve));
let nextId = 0; const pending = new Map();
browser.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, message => message.error ? reject(Error(JSON.stringify(message.error))) : resolve(message.result)); browser.send(JSON.stringify({id, method, params, sessionId})); });
async function sessionFor(width, height, throttle){
  const target = await send('Target.createTarget', {url:'about:blank'});
  const attached = await send('Target.attachToTarget', {targetId:target.targetId, flatten:true});
  const session = attached.sessionId;
  await send('Page.enable', {}, session);
  await send('Network.enable', {}, session);
  await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor:1, mobile:width < 700}, session);
  if (throttle) {
    await send('Emulation.setCPUThrottlingRate', {rate:4}, session);
    await send('Network.emulateNetworkConditions', {offline:false, latency:150, downloadThroughput:1.6 * 1024 * 1024 / 8, uploadThroughput:0.75 * 1024 * 1024 / 8}, session);
  }
  return {session, targetId:target.targetId};
}
async function readMarks(session){
  const value = await send('Runtime.evaluate', {expression:`JSON.stringify(performance.getEntriesByType('mark').map(mark=>({name:mark.name,start:mark.startTime})))`, returnByValue:true}, session);
  return JSON.parse(value.result.value);
}
async function waitFor(session, expression){
  for (let i = 0; i < 40; i++) {
    const value = await send('Runtime.evaluate', {expression, returnByValue:true}, session);
    if (value.result.value) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Warten abgebrochen: ' + expression);
}
async function runPath(profile, warm){
  const started = performance.now();
  await send('Page.navigate', {url:`http://127.0.0.1:${port}/`}, profile.session);
  await waitFor(profile.session, `Boolean(document.querySelector('#go'))`);
  await send('Runtime.evaluate', {expression:`document.querySelector('#go').click()`, returnByValue:true}, profile.session);
  await waitFor(profile.session, `Boolean(document.querySelector('#b'))`);
  await send('Runtime.evaluate', {expression:`document.querySelector('#b').click()`, returnByValue:true}, profile.session);
  await waitFor(profile.session, `performance.getEntriesByName('switch-modern').length>0`);
  await send('Runtime.evaluate', {expression:`document.querySelector('#cart').click()`, returnByValue:true}, profile.session);
  await waitFor(profile.session, `document.querySelectorAll('article img').length===2`);
  const decoded = await send('Runtime.evaluate', {expression:`(async()=>{const images=[...document.querySelectorAll('article img')];await Promise.all(images.map(image=>image.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return JSON.stringify({count:images.length,widths:images.map(image=>image.naturalWidth),texts:[...document.querySelectorAll('.text')].map(node=>node.textContent),edit:document.body.innerHTML.includes('Bearbeiten')});})()`, awaitPromise:true, returnByValue:true}, profile.session);
  const marks = await readMarks(profile.session);
  return {warm, elapsedMs:performance.now()-started, marks, decoded:JSON.parse(decoded.result.value)};
}
const runs = [];
for (const viewport of [{name:'pc', width:1365, height:900},{name:'mobile', width:390, height:844}]) {
  const profile = await sessionFor(viewport.width, viewport.height, false);
  for (let i = 0; i < 3; i++) runs.push({viewport:viewport.name, throttle:false, index:i+1, ...(await runPath(profile, i>0))});
  await send('Target.closeTarget', {targetId:profile.targetId});
}
const throttled = await sessionFor(390, 844, true);
for (let i = 0; i < 3; i++) runs.push({viewport:'mobile', throttle:true, index:i+1, ...(await runPath(throttled, i>0))});
async function shot(name, width, height, path){
  const profile = await sessionFor(width, height, false);
  await send('Page.navigate', {url:`http://127.0.0.1:${port}${path}`}, profile.session);
  await new Promise(resolve => setTimeout(resolve, 400));
  const image = await send('Page.captureScreenshot', {format:'png'}, profile.session);
  fs.writeFileSync(new URL(name, outDir), Buffer.from(image.data, 'base64'));
  await send('Target.closeTarget', {targetId:profile.targetId});
}
await shot('Ring-PC-Warenkorb.png', 1365, 900, '/cart');
await shot('Ring-Mobil-Warenkorb.png', 390, 844, '/cart');
await shot('Ring-PC-Drawer.png', 1365, 900, '/drawer');
await shot('Ring-Mobil-Drawer.png', 390, 844, '/drawer');
const brake = [];
for (let i = 0; i < 3; i++) {
  const image = () => new Promise(resolve => setTimeout(() => resolve('https://cdn.shopify.com/s/files/ring.png'), 2000));
  const fastStart = performance.now();
  await resolveCheckoutPreview({checkoutImage:image, source:'https://app.example/gestaltung/ring.png', hasSecuredPreview:true, previewFirst:true, budgetMs:0});
  const fastMs = performance.now() - fastStart;
  const slowStart = performance.now();
  await resolveCheckoutPreview({checkoutImage:image, source:'https://app.example/gestaltung/ring.png', hasSecuredPreview:true, previewFirst:false});
  brake.push({fastMs, slowMs:performance.now()-slowStart, unitCents:lineA.unitCents, revision:lineA.configuration.rev});
}
const report = {
  measuredAt: '2026-11-19',
  candidate: 'B local',
  conditions: 'Chrome headless, 1365x900 and 390x844. Primary series without network or CPU throttle, matching the protected candidate A note. A separate mobile series uses CPU 4x and Slow-4G (150 ms, 1.6/0.75 Mbit/s). Cold is the first navigation of a fresh target; warm is the next navigation in the same target. This is the local candidate, not the live shop and not the full R15 editor bundle.',
  price: {unitCents: lineA.unitCents, sku: 'FK-AV2A-16x28-1441', variantId: '57471227756924'},
  runs,
  brake,
  fiveSecondTarget: 'Ziel, in dieser lokalen Reihe nicht als Erfolg gewertet.'
};
fs.writeFileSync(new URL('ring-messwerte.json', outDir), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(runs.map(run => ({viewport:run.viewport, throttle:run.throttle, warm:run.warm, elapsedMs:Math.round(run.elapsedMs), decoded:run.decoded})), null, 2));
browser.close(); chrome.kill(); server.close();
