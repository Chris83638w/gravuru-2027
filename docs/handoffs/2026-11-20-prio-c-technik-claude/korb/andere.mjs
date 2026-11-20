// Claude · 20.11.2026 · Designkarten bei den anderen Produkten im echten Shop. Nur lesend.
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const HANDLE=process.argv[2],NAME=process.argv[3],WARTEN=Number(process.argv[4]||8000);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext({viewport:{width:1366,height:900},locale:'de-DE'});const page=await ctx.newPage();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let t0=null;const anfragen=[],fehler=[];
page.on('requestfinished',async r=>{const u=r.url();if(t0===null||!/vorschauen\/|design-gallery|design-parts|gallery-preview/.test(u))return;try{const resp=await r.response();anfragen.push({art:/gallery-preview/.test(u)?'Vorschau-Server':/vorschauen\//.test(u)?'Vorschau-Datei':/design-parts/.test(u)?'Design-Teile':'Designliste',status:resp?.status(),endeMs:Date.now()-t0});}catch{}});
page.on('pageerror',e=>fehler.push('Seitenfehler: '+String(e.message).slice(0,160)));
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
await page.goto('https://gravuru-design.myshopify.com/products/'+HANDLE,{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForSelector('a[data-gravuru-start]',{timeout:90000});await sleep(WARTEN);
await page.click('a[data-gravuru-start]');
const s0=Date.now();while(Date.now()-s0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready'))break;await sleep(100);}
const bereit=Date.now()-s0;await sleep(1500);
const f=page.frames().filter(f=>{try{return new URL(f.url()).pathname==='/_merchant-acryl-editor.html'&&!f.isDetached();}catch{return false;}}).at(-1);
const zustand=()=>f.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);
 const panel=all.find(e=>e.id==='ux-panel-design');const inPanel=panel?all.filter(e=>panel.contains(e)||e.getRootNode()===panel.getRootNode()&&panel.contains(e)):[];
 const sichtbar=e=>{const b=e.getBoundingClientRect();return b.width>20&&b.height>20;};
 const produktKarten=all.filter(e=>e.matches('.ux-product-choose'));
 const imgs=all.filter(e=>e.matches('.ux-product-choose img')),gez=all.filter(e=>e.matches('.ux-product-choose svg.ux-product-drawn'));
 const eigene=all.filter(e=>e.matches('#ux-panel-design button svg, #ux-panel-design .design svg, #ux-panel-design [data-design] svg')&&sichtbar(e));
 const ladeText=all.filter(e=>e.children.length===0&&/Vorschau wird geladen/.test(e.textContent||'')&&sichtbar(e)).length;
 return {produktKarten:produktKarten.length,vomServerGeladen:imgs.filter(i=>i.complete&&i.naturalWidth>0).length,vomServerOffen:imgs.filter(i=>!(i.complete&&i.naturalWidth>0)).length,imGeraetGezeichnet:gez.length,eigeneKartenMitBild:eigene.length,ladeText,nativeSuche:!!all.find(e=>e.matches('.ux-native-designs, .ux-design-search'))};});
const klick=await f.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const b=all.filter(e=>e.matches('button,[role=tab]')).find(e=>(e.innerText||'').trim()==='Designs'&&e.getBoundingClientRect().width>4);b?.click();return !!b;});
t0=Date.now();const verlauf=[];
for(const sek of [0.2,1,2,5,10]){while(Date.now()-t0<sek*1000)await sleep(50);verlauf.push({sek,...await zustand()});if(sek===0.2||sek===2||sek===10)await page.screenshot({path:'korb/andere-'+NAME+'-'+String(sek).replace('.','')+'s.png'});}
console.log(JSON.stringify({produkt:HANDLE,designsKnopf:klick,bereitNachMs:bereit,verlauf,fehler}));
const nachArt={};for(const a of anfragen)(nachArt[a.art]??=[]).push(a);
for(const [art,l] of Object.entries(nachArt))console.log(' ',art,'| Anzahl',l.length,'| Status',[...new Set(l.map(a=>a.status))].join(','),'| fertig bei ms',l.map(a=>a.endeMs).slice(0,30).join(','));
await browser.close();
