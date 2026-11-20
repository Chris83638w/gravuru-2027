// Claude · 20.11.2026 · Wie schnell erscheinen die Vorschaubilder der Designkarten im echten Shop? Nur lesend.
import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const WARTEN=Number(process.argv[2]||6000);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext({viewport:{width:1366,height:900},locale:'de-DE'});const page=await ctx.newPage();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let t0=null;const anfragen=[],fehler=[];
const ALT=process.env.ALT_PAKET,NEU=process.env.NEU_PAKET,ersatz={};
if(NEU){const {pathToFileURL}=await import('node:url');const {acrylAssetText}=await import(pathToFileURL('/home/claude/work/prioC/app/workshop/acryl-employee-host.mjs'));
 await page.route('**/_merchant-acryl-editor.html*',async route=>{let r,body='';for(let i=0;i<4&&!body.includes(ALT);i++){r=await route.fetch();body=await r.text();if(!body.includes(ALT))await new Promise(x=>setTimeout(x,1000));}if(!body.includes(ALT)){fehler.push('Editor-Seite nennt das erwartete Paket nicht');return route.fulfill({response:r});}ersatz.seite=true;return route.fulfill({response:r,body:body.split(ALT).join(NEU)});});
 await page.route('**/_acryl-bundle/'+NEU+'.mjs*',route=>{ersatz.paket=true;return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:acrylAssetText(fs.readFileSync(process.env.BAU_NEU+'/bundle/'+NEU+'.mjs','utf8'),'/_bundle/'+NEU+'.mjs')});});}

page.on('requestfinished',async r=>{const u=r.url();if(t0===null||!/vorschauen\/|design-gallery|design-parts|lazy\/schriften|shop\/schriften/.test(u))return;try{const resp=await r.response(),z=await r.sizes(),t=r.timing();anfragen.push({art:/vorschauen\//.test(u)?'Vorschau-Datei':/gallery-preview/.test(u)?'Vorschau-Server':/design-gallery/.test(u)?'Designliste':/design-parts/.test(u)?'Design-Teile':'Schrift',m:r.method(),status:resp.status(),endeMs:Date.now()-t0,dauerMs:Math.round(t.responseEnd),wartenMs:Math.round(t.responseStart-t.requestStart),kb:Math.round(z.responseBodySize/102.4)/10});}catch{}});
page.on('requestfailed',r=>{if(t0!==null&&/vorschauen\/|design-gallery/.test(r.url()))fehler.push((Date.now()-t0)+' ms '+new URL(r.url()).pathname.slice(-30)+' '+(r.failure()?.errorText||''));});
page.on('console',m=>{if(m.type()==='error'&&!/accessibility|shop\.app|favicon/.test(m.text()))fehler.push('Konsole: '+m.text().slice(0,140));});
page.on('pageerror',e=>fehler.push('Seitenfehler: '+String(e.message).slice(0,160)));
page.on('response',r=>{if(r.status()>=400){const u=new URL(r.url());fehler.push('HTTP '+r.status()+' '+r.request().method()+' '+u.hostname+u.pathname.slice(0,70));}});
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
await page.goto('https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen',{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForSelector('a[data-gravuru-start]',{timeout:90000});await sleep(WARTEN);
await page.click('a[data-gravuru-start]');
const s0=Date.now();while(Date.now()-s0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready'))break;await sleep(100);}
const bereit=Date.now()-s0;await sleep(1500);
const f=page.frames().filter(f=>{try{return new URL(f.url()).pathname==='/_merchant-acryl-editor.html'&&!f.isDetached();}catch{return false;}}).at(-1);
const zustand=()=>f.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const imgs=all.filter(e=>e.matches('.ux-product-choose img')),gez=all.filter(e=>e.matches('.ux-product-choose svg.ux-product-drawn'));return {karten:imgs.length+gez.length,imGeraetGezeichnet:gez.length,geladen:gez.length+imgs.filter(i=>i.src&&i.complete&&i.naturalWidth>0).length,mitQuelle:imgs.filter(i=>!!i.src).length,alt:[...new Set(imgs.map(i=>i.alt))].slice(0,4),designsImGeraet:(document.querySelector('gravuru-configurator').uxSelectedProfile?.().designs||[]).length};});
await f.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const b=all.filter(e=>e.matches('button,[role=tab]')).find(e=>(e.innerText||'').trim()==='Designs'&&e.getBoundingClientRect().width>4);b?.click();});
t0=Date.now();const verlauf=[];
for(const sek of [0.2,0.5,1,2,3,5,8,12]){while(Date.now()-t0<sek*1000)await sleep(50);const z=await zustand();verlauf.push({sek,...z});if(sek===1)await page.screenshot({path:'korb/vorschau-1s'+(NEU?'-neu':'')+'.png'});if(sek===5)await page.screenshot({path:'korb/vorschau-5s'+(NEU?'-neu':'')+'.png'});if(z.karten>0&&z.geladen===z.karten&&sek>=5)break;}
// einmal ganz nach unten rollen, falls nur sichtbare Karten laden
await f.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const k=all.filter(e=>e.matches('.ux-product-choose'));k.at(-1)?.scrollIntoView();});await sleep(6000);
const amEnde=await zustand();await page.screenshot({path:'korb/vorschau-ende'+(NEU?'-neu':'')+'.png'});
console.log(JSON.stringify({ersatz,wartenVorTippenMs:WARTEN,bereitNachMs:bereit,verlauf,nachRollen:amEnde,fehler},null,0));
const nachArt={};for(const a of anfragen){(nachArt[a.art]??=[]).push(a);}
for(const [art,l] of Object.entries(nachArt))console.log(art,'| Anzahl',l.length,'| Status',[...new Set(l.map(a=>a.m+' '+a.status))].join(','),'| Summe kB',Math.round(l.reduce((s,a)=>s+a.kb,0)),'| Dauer ms',l.map(a=>a.dauerMs).slice(0,24).join(','),'| fertig bei ms',l.map(a=>a.endeMs).slice(0,24).join(','));
await browser.close();
