// Ladebudget des Kundeneditors: Bytes und Zeit bis zur ersten Bedienbarkeit bei gedrosseltem Netz.
// Lokaler Prüfstand, keine Live-Systeme. Aufruf:
//   node app/configurator/variant-m/server.mjs --port=8981   (separates Terminal)
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/check-load-budget.mjs http://127.0.0.1:8981 [--max-bytes=2000000] [--max-ms=3000] [--json=<datei>]
// Bedienbar = im shadowRoot von gravuru-configurator ist `.scene [data-object]` vorhanden.
// Netz: 50 Mbit/s, 30 ms Latenz (CDP Network.emulateNetworkConditions), Cache aus.
// Gezählt werden alle bis dahin abgeschlossenen Antworten (encodedDataLength laut CDP) von Seite und iframe.
// Schlägt fehl (Exit 1) bei mehr als 2 MB oder mehr als 3 s.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const args=process.argv.slice(2);
const base=(args.find(a=>!a.startsWith('--'))||'http://127.0.0.1:8981').replace(/\/$/,'');
const option=(name,fallback)=>{const v=args.find(a=>a.startsWith('--'+name+'='));return v?v.slice(name.length+3):fallback;};
const maxBytes=Number(option('max-bytes',2_000_000)),maxMs=Number(option('max-ms',3000)),runs=Number(option('runs',1));
const playwright=(()=>{for(const candidate of ['playwright','/opt/npm-tools/node_modules/playwright/index.js']){try{return require(candidate);}catch{}}throw Error('Playwright nicht gefunden.');})();
const executablePath=['/opt/pw-browsers/chromium'].find(p=>fs.existsSync(p));
const megabit=50,latencyMs=30;

async function measure(browser){
  const context=await browser.newContext({viewport:{width:1280,height:900},locale:'de-DE'});
  const page=await context.newPage();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:latencyMs,downloadThroughput:megabit*1e6/8,uploadThroughput:megabit*1e6/8});
  // Der Editor läuft im gleichortigen iframe; Chromium führt ihn im selben Renderer, die CDP-Sitzung sieht dessen Anfragen.
  const requests=new Map(),done=[];
  cdp.on('Network.requestWillBeSent',e=>requests.set(e.requestId,{url:e.request.url,start:e.timestamp}));
  cdp.on('Network.loadingFinished',e=>{const r=requests.get(e.requestId);if(r)done.push({url:r.url,bytes:e.encodedDataLength,end:e.timestamp});});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const started=Date.now();
  await page.goto(base+'/?model=acryl');
  const frame=await (await page.waitForSelector('#editor iframe',{timeout:30000})).contentFrame();
  await frame.waitForFunction(()=>!!document.querySelector('gravuru-configurator')?.shadowRoot?.querySelector('.scene [data-object]'),null,{timeout:60000,polling:20});
  const readyMs=Date.now()-started;
  const snapshot=[...done];
  // Zusatzangabe: Kundenoberfläche vollständig (UX installiert, Szenenbild dekodiert).
  await frame.waitForFunction(()=>{const el=document.querySelector('gravuru-configurator'),img=el?.shadowRoot?.querySelector('.acryl-backdrop');return el?.dataset.uxNeutral==='true'&&(!img||img.complete&&img.naturalWidth>0);},null,{timeout:60000,polling:20});
  const uiMs=Date.now()-started,uiBytes=done.reduce((s,r)=>s+r.bytes,0);
  // Nach der Bedienbarkeit nachgeladene Dateien gesondert ausweisen (Leerlauf abwarten).
  await page.waitForTimeout(2500);
  const later=done.slice(snapshot.length);
  await context.close();
  const total=snapshot.reduce((s,r)=>s+r.bytes,0);
  const byUrl=snapshot.map(r=>({path:new URL(r.url).pathname,bytes:r.bytes})).sort((a,b)=>b.bytes-a.bytes);
  return {readyMs,bytes:total,ui:{readyMs:uiMs,bytes:uiBytes},requests:snapshot.length,largest:byUrl.slice(0,12),afterReady:later.map(r=>({path:new URL(r.url).pathname,bytes:r.bytes})),errors};
}

const browser=await playwright.chromium.launch({executablePath});
let result;
try{
  const all=[];for(let i=0;i<runs;i++)all.push(await measure(browser));
  // Bei mehreren Läufen zählt der Median der Zeit; Bytes sind je Lauf gleich.
  all.sort((a,b)=>a.readyMs-b.readyMs);result=all[Math.floor(all.length/2)];result.allReadyMs=all.map(r=>r.readyMs);
}finally{await browser.close();}
const fmt=n=>(n/1e6).toFixed(2)+' MB';
const ok=result.bytes<=maxBytes&&result.readyMs<=maxMs&&!result.errors.length;
const report={base,network:`${megabit} Mbit/s, ${latencyMs} ms`,budget:{maxBytes,maxMs},...result,ok};
if(option('json'))fs.writeFileSync(option('json'),JSON.stringify(report,null,2));
console.log(`Bedienbar nach ${result.readyMs} ms, ${fmt(result.bytes)} in ${result.requests} Anfragen (Budget ${fmt(maxBytes)}, ${maxMs} ms)`);
console.log(`Oberfläche vollständig (UX + Szenenbild) nach ${result.ui.readyMs} ms, ${fmt(result.ui.bytes)} (Zusatzangabe)`);
for(const r of result.largest)console.log('  '+String(r.bytes).padStart(9)+'  '+r.path);
if(result.afterReady.length)console.log(`Danach nachgeladen: ${result.afterReady.length} Dateien, ${fmt(result.afterReady.reduce((s,r)=>s+r.bytes,0))}`);
if(result.errors.length)console.log('Seitenfehler: '+result.errors.join(' | '));
console.log(ok?'PASS':'FEHLER: Ladebudget überschritten');
process.exit(ok?0:1);
