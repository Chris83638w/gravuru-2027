// Ladebudget des Kundeneditors: Bytes und Zeit bis zur ersten Bedienbarkeit bei gedrosseltem Netz.
// Lokaler Prüfstand, keine Live-Systeme. Aufruf:
//   node app/configurator/variant-m/server.mjs --port=8981   (separates Terminal)
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/check-load-budget.mjs http://127.0.0.1:8981 [--max-bytes=2000000] [--max-ms=3000] [--json=<datei>]
// Bedienbar = im shadowRoot von gravuru-configurator ist `.scene [data-object]` vorhanden.
// Danach: Ladefolge im Hintergrund (Bilder → Schriften → Motive, keine Doppelabrufe) bis zum Ende der Warteschlange.
// Zusätzlich je Profil ein Vergleichslauf mit Einzelmodulen (`module=einzeln`), der auch die Vollständigkeit des Bündels prüft.
// Netz: je Profil (Standard 50 Mbit/s bei 30 ms und 20 Mbit/s bei 150 ms Latenz, `--net=<ms>:<Mbit>`), CDP Network.emulateNetworkConditions, Cache aus.
// Gezählt werden alle bis dahin abgeschlossenen Antworten (encodedDataLength laut CDP) von Seite und iframe.
// Schlägt fehl (Exit 1), wenn ein Profil mehr als 2 MB oder mehr als 3 s braucht.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const args=process.argv.slice(2);
const base=(args.find(a=>!a.startsWith('--'))||'http://127.0.0.1:8981').replace(/\/$/,'');
const option=(name,fallback)=>{const v=args.find(a=>a.startsWith('--'+name+'='));return v?v.slice(name.length+3):fallback;};
const maxBytes=Number(option('max-bytes',2_000_000)),maxMs=Number(option('max-ms',3000)),runs=Number(option('runs',1));
const playwright=(()=>{for(const candidate of ['playwright','/opt/npm-tools/node_modules/playwright/index.js']){try{return require(candidate);}catch{}}throw Error('Playwright nicht gefunden.');})();
const executablePath=['/opt/pw-browsers/chromium'].find(p=>fs.existsSync(p));
// Netzprofile: `--net=30:50` (ms Latenz : Mbit/s), mehrfach möglich; Standard beide Profile 30 ms/50 Mbit und 150 ms/20 Mbit.
const nets=(args.filter(a=>a.startsWith('--net=')).map(a=>a.slice(6)).length?args.filter(a=>a.startsWith('--net=')).map(a=>a.slice(6)):['30:50','150:20']).map(v=>{const [l,m]=v.split(':').map(Number);if(!(l>=0&&m>0))throw Error('Ungültiges Netzprofil: '+v);return {latencyMs:l,megabit:m};});

async function measure(browser,{latencyMs,megabit},query=''){
  const context=await browser.newContext({viewport:{width:1280,height:900},locale:'de-DE'});
  const page=await context.newPage();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:latencyMs,downloadThroughput:megabit*1e6/8,uploadThroughput:megabit*1e6/8});
  // Der Editor läuft im gleichortigen iframe; Chromium führt ihn im selben Renderer, die CDP-Sitzung sieht dessen Anfragen.
  const requests=new Map(),done=[];
  // blob:/data: (gebündelte Module, eingebettete Bilder) sind lokal und keine Netzanfragen; gezählt wird nur das Netz.
  let local=0;
  cdp.on('Network.requestWillBeSent',e=>{if(/^(blob|data):/.test(e.request.url)){local++;return;}requests.set(e.requestId,{url:e.request.url,start:e.timestamp});});
  cdp.on('Network.loadingFinished',e=>{const r=requests.get(e.requestId);if(r)done.push({url:r.url,bytes:e.encodedDataLength,end:e.timestamp});});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const started=Date.now();
  await page.goto(base+'/?model=acryl'+query);
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
  // Ladefolge im Hintergrund (preload-queue.mjs): bis die Warteschlange fertig ist, dann Reihenfolge und Doppelabrufe.
  let preload=null;
  if(!query){
    await frame.waitForFunction(()=>(document.querySelector('gravuru-configurator')?.uxPreloadLog||[]).some(e=>e.type==='idle'),null,{timeout:120000,polling:100}).catch(()=>{});
    const log=await frame.evaluate(()=>document.querySelector('gravuru-configurator')?.uxPreloadLog||[]);
    const kind=u=>/\/acrylic-assets\/base-/.test(u)?'images':/\/_runtime\/lazy\/schriften\//.test(u)?'fonts':/\/_runtime\/lazy\/motive-alle\.json$/.test(u)?'motifs':null;
    const after=done.slice(snapshot.length).map(r=>({path:new URL(r.url).pathname,end:r.end})).filter(r=>kind(r.path));
    const first=k=>Math.min(...after.filter(r=>kind(r.path)===k).map(r=>r.end));
    const counts={};for(const r of done)counts[new URL(r.url).pathname]=(counts[new URL(r.url).pathname]||0)+1;
    preload={tasks:log.filter(e=>e.type==='start').map(e=>e.key+':'+e.mode),order:['images','fonts','motifs'].filter(k=>Number.isFinite(first(k))).sort((a,b)=>first(a)-first(b)),files:after.length,bytes:done.slice(snapshot.length).filter(r=>kind(new URL(r.url).pathname)).reduce((n,r)=>n+r.bytes,0),duplicates:Object.entries(counts).filter(([p,n])=>n>1&&kind(p)).map(([p,n])=>p+' ×'+n),otherRepeats:Object.entries(counts).filter(([p,n])=>n>1&&!kind(p)).map(([p,n])=>p+' ×'+n),finished:log.some(e=>e.type==='idle')};
  }
  const modules=[...new Set(done.map(r=>new URL(r.url)).filter(u=>u.protocol.startsWith('http')&&u.pathname.endsWith('.mjs')&&!u.pathname.startsWith('/_bundle/')).map(u=>u.pathname))].sort();
  await context.close();
  const total=snapshot.reduce((s,r)=>s+r.bytes,0);
  const byUrl=snapshot.map(r=>({path:new URL(r.url).pathname,bytes:r.bytes})).sort((a,b)=>b.bytes-a.bytes);
  return {readyMs,bytes:total,ui:{readyMs:uiMs,bytes:uiBytes},requests:snapshot.length,localRequests:local,largest:byUrl.slice(0,12),afterReady:later.map(r=>({path:new URL(r.url).pathname,bytes:r.bytes})),modules,preload,errors};
}

const browser=await playwright.chromium.launch({executablePath});
const fmt=n=>(n/1e6).toFixed(2)+' MB';
const reports=[];
// Vergleich: derselbe Lauf mit Einzelmodulen (`module=einzeln`, bisheriger Ladeweg). Prüft zugleich, dass
// jedes dabei geladene Modul im Bündel steckt. Abschalten mit --ohne-vergleich.
const compare=!args.includes('--ohne-vergleich');
const comparisons=[];
async function bundleModules(){
  const editor=await (await fetch(base+'/editor.html')).text(),href=editor.match(/<link rel="modulepreload" href="([^"]+)"/)?.[1];
  if(!href)return null;
  const text=await (await fetch(base+href)).text();
  return {href,urls:JSON.parse(text.match(/^const MODULES=(.*);$/m)[1]).map(m=>m.url)};
}
try{
  const bundled=await bundleModules();
  for(const net of nets){
    if(compare){const single=await measure(browser,net,'&module=einzeln');comparisons.push({network:`${net.megabit} Mbit/s, ${net.latencyMs} ms`,readyMs:single.readyMs,uiReadyMs:single.ui.readyMs,bytes:single.bytes,requests:single.requests,modules:single.modules.length,missingInBundle:bundled?single.modules.filter(m=>!bundled.urls.includes(m)):null,errors:single.errors});}
    const all=[];for(let i=0;i<runs;i++)all.push(await measure(browser,net));
    // Bei mehreren Läufen zählt der Median der Zeit; Bytes sind je Lauf gleich.
    all.sort((a,b)=>a.readyMs-b.readyMs);const result=all[Math.floor(all.length/2)];result.allReadyMs=all.map(r=>r.readyMs);
    const preloadOk=!result.preload||(result.preload.finished&&!result.preload.duplicates.length&&result.preload.order.join()==='images,fonts,motifs');
    const ok=result.bytes<=maxBytes&&result.readyMs<=maxMs&&!result.errors.length&&preloadOk;
    reports.push({base,network:`${net.megabit} Mbit/s, ${net.latencyMs} ms`,budget:{maxBytes,maxMs},...result,ok});
  }
}finally{await browser.close();}
for(const result of reports){
  console.log(`== Netz ${result.network}`);
  console.log(`Bedienbar nach ${result.readyMs} ms, ${fmt(result.bytes)} in ${result.requests} Netzanfragen (Budget ${fmt(maxBytes)}, ${maxMs} ms; lokal blob:/data: ${result.localRequests})`);
  console.log(`Oberfläche vollständig (UX + Szenenbild) nach ${result.ui.readyMs} ms, ${fmt(result.ui.bytes)} (Zusatzangabe)`);
  for(const r of result.largest)console.log('  '+String(r.bytes).padStart(9)+'  '+r.path);
  if(result.afterReady.length)console.log(`Danach nachgeladen: ${result.afterReady.length} Dateien, ${fmt(result.afterReady.reduce((s,r)=>s+r.bytes,0))}`);
  if(result.preload)console.log(`Hintergrund (Warteschlange): ${result.preload.order.join(' → ')||'—'} · ${result.preload.files} Dateien, ${fmt(result.preload.bytes)} · Doppelabrufe: ${result.preload.duplicates.length?result.preload.duplicates.join(', '):'keine'}${result.preload.finished?'':' · NICHT FERTIG'}`);
  if(result.preload?.otherRepeats.length)console.log(`  (außerhalb der Warteschlange erneut abgerufen, Cache im Prüfstand aus: ${result.preload.otherRepeats.join(', ')})`);
  if(result.errors.length)console.log('Seitenfehler: '+result.errors.join(' | '));
  console.log(result.ok?'PASS':'FEHLER: Ladebudget oder Ladefolge verletzt');
}
for(const c of comparisons){
  console.log(`== Vergleich Einzelmodule (bisheriger Ladeweg), Netz ${c.network}`);
  console.log(`Bedienbar nach ${c.readyMs} ms, Oberfläche vollständig nach ${c.uiReadyMs} ms, ${c.requests} Netzanfragen bis bedienbar, ${c.modules} Einzelmodule geladen`);
  console.log(c.missingInBundle===null?'Bündel nicht gefunden (Einzelmodule aktiv?)':c.missingInBundle.length?'FEHLER: nicht im Bündel: '+c.missingInBundle.join(', '):'Alle geladenen Einzelmodule sind im Bündel enthalten.');
}
const ok=reports.every(r=>r.ok)&&comparisons.every(c=>c.missingInBundle?.length===0&&!c.errors.length);
if(option('json'))fs.writeFileSync(option('json'),JSON.stringify({profiles:reports,comparisonSingleModules:comparisons,ok},null,2));
process.exit(ok?0:1);
