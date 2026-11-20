// Claude · 20.11.2026 · Stand 0a536870 ist live (seit 19:16 Uhr), Nachmessung: Wie lange braucht der echte Server für Design-Teile, die er noch nicht im Speicher hat? Nur lesend.
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const HANDLE=process.argv[2]||'familienschild-acryl-baum-12x8-personalisiert';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext({viewport:{width:1366,height:900},locale:'de-DE'});const page=await ctx.newPage();const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const abrufe=[];let t0=Date.now();
page.on('requestfinished',async r=>{const u=new URL(r.url());if(!/design-parts|shop-entry\/model|design-gallery(?!-preview)|\/start$/.test(u.pathname))return;try{const resp=await r.response(),t=r.timing(),z=await r.sizes();abrufe.push({weg:u.pathname.split('/').pop(),designs:u.searchParams.get('designs')?.split(',').length||null,status:resp.status(),startMs:Math.round(t.startTime-t0),wartenMs:Math.round(t.responseStart-t.requestStart),dauerMs:Math.round(t.responseEnd),kB:Math.round(z.responseBodySize/1024),server:(resp.headers()['server-timing']||'').slice(0,160)});}catch{}});
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
t0=Date.now();await page.goto('https://gravuru-design.myshopify.com/products/'+HANDLE,{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForSelector('a[data-gravuru-start]',{timeout:90000});const knopfMs=Date.now()-t0;await sleep(10000);
await page.click('a[data-gravuru-start]');const klick=Date.now()-t0;
const s0=Date.now();while(Date.now()-s0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready'))break;await sleep(100);}
const bereit=Date.now()-s0;await sleep(1000);
const f=()=>page.frames().filter(f=>{try{return new URL(f.url()).pathname==='/_merchant-acryl-editor.html'&&!f.isDetached();}catch{return false;}}).at(-1);
const WALK='const all=[];const walk=r=>{for(const e of r.querySelectorAll("*")){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const el=document.querySelector("gravuru-configurator");';
await f().evaluate(new Function(WALK+'all.filter(e=>e.matches("button,[role=tab]")).find(e=>(e.innerText||"").trim()==="Designs"&&e.getBoundingClientRect().width>4)?.click();'));
const t1=Date.now();const verlauf=[];
for(const sek of [0.1,0.5,1,2,4,8]){while(Date.now()-t1<sek*1000)await sleep(40);verlauf.push(await f().evaluate(new Function('sek',WALK+'const imgs=all.filter(e=>e.matches(".ux-product-choose img")),gez=all.filter(e=>e.matches(".ux-product-choose svg.ux-product-drawn"));return {sek,karten:imgs.length+gez.length,imGeraet:gez.length,vomServer:imgs.filter(i=>i.complete&&i.naturalWidth>0).length,offen:imgs.filter(i=>!(i.complete&&i.naturalWidth>0)).length,designs:el.uxSelectedProfile().designs.length};'),sek));if(verlauf.at(-1).offen===0&&sek>=1)break;}
await page.screenshot({path:'acryl/live-0a53-02s.png'});
const erste=abrufe.filter(a=>a.weg==='design-parts').map(a=>({...a}));
// Eine Gruppe, die der Server so noch nicht gesehen hat (Designs der vierten Seite, rückwärts): Rechenzeit ohne Speicher-Treffer.
const shop=page.frames().find(f=>{try{return /\/konfigurator\/shop\/?$/.test(new URL(f.url()).pathname);}catch{return false;}});
const neu=await shop.evaluate(async([nr,gruppen])=>{const g=window.GravuruShopEntry.designGallery;const seite=await g.load(nr,'all');const ids=seite.items.filter(i=>i.current).map(i=>i.designId).reverse();const out=[];const plan=gruppen?gruppen.split(',').map(g=>g.split('-').map(Number)).map(([a,b])=>['Gruppe '+a+'–'+b,ids.slice(a,b)]):[['neu',ids.slice(0,6)],['neu',ids.slice(6,7)],['neu',ids.slice(7,13)]];for(const [art,gruppe] of plan){const t=performance.now();const r=await g.loadDesigns(gruppe);out.push({art,designs:gruppe.length,geliefert:r?.designIds?.length||0,ms:Math.round(performance.now()-t)});}return out;},[Number(process.env.SEITE||3),process.env.GRUPPEN||'']);
await sleep(500);
console.log(JSON.stringify({knopfNachMs:knopfMs,editorBereitNachTippenMs:bereit,verlauf,ersteSeite:erste,ungeseheneGruppen:neu,danach:abrufe.filter(a=>a.weg==='design-parts').slice(erste.length),sonstige:abrufe.filter(a=>a.weg!=='design-parts')},null,1));
await browser.close();
