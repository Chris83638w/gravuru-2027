// Claude · 20.11.2026 · Auftrag #265, Punkt „Vorab-Start verkürzen“: Was lädt die Produktseite vor dem Antippen, in welcher Reihenfolge, wie lange wartet jeder Abruf auf den Server? Nur lesend.
// Aufruf: node vorab/vorab.mjs <handle>   (MOBIL=1 für Handybreite, WARTEN=<s> bis zum Antippen, GALERIE=1 für Einzelabrufe der Designliste danach)
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const HANDLE=process.argv[2]||'familienschild-acryl-baum-12x8-personalisiert',MOBIL=process.env.MOBIL==='1',WARTEN=Number(process.env.WARTEN||25);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext(MOBIL?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE',userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'}:{viewport:{width:1366,height:900},locale:'de-DE'});
const page=await ctx.newPage();const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const abrufe=[];let t0=Date.now();
const eigen=u=>u.hostname==='app-2027.gravuru-designwerkstatt.de'||u.pathname.startsWith('/apps/konfigurator');
const kurz=u=>{const p=u.pathname.replace(/^\/apps\/konfigurator/,'[proxy]').replace(/[a-f0-9]{16,}/g,'#');return p.length>58?'…'+p.slice(-56):p;};
page.on('requestfinished',async r=>{let u;try{u=new URL(r.url());}catch{return;}if(!eigen(u))return;try{const resp=await r.response(),t=r.timing(),z=await r.sizes();let roh=null;if(/shop-entry\/(model|design-parts|design-gallery)/.test(u.pathname)||/_merchant-acryl-editor\.html/.test(u.pathname)){try{roh=Math.round((await resp.body()).length/1024);}catch{}}abrufe.push({weg:kurz(u),rohkB:roh,art:r.resourceType(),status:resp.status(),startMs:Math.round(t.startTime-t0),verbindenMs:Math.max(0,Math.round(t.connectEnd)),wartenMs:Math.round(t.responseStart-t.requestStart),endeMs:Math.round(t.startTime-t0+t.responseEnd),kB:Math.round(z.responseBodySize/102.4)/10,speicher:resp.fromServiceWorker()?'sw':(resp.headers()['x-cache']||''),server:(resp.headers()['server-timing']||'').slice(0,200),kodierung:resp.headers()['content-encoding']||'',cache:(resp.headers()['cache-control']||'').slice(0,60),via:(resp.headers()['server']||'')+'|'+(resp.headers()['x-powered-by']||''),protokoll:(await resp.serverAddr().catch(()=>null))?.ipAddress?'':'' ,http:await r.response().then(x=>x.request().timing().secureConnectionStart>=0?'neu':'offen').catch(()=>'')});}catch{}});
// ERSATZ=1: nur in meinem Browser die zwei Browser-Änderungen des neuen Stands (frühere Verbindungen); der Server bleibt der echte.
const ersatz={embed:false,seite:false};
if(process.env.ERSATZ==='1'){const fs=await import('node:fs');const QUELLE=process.env.QUELLE||'/home/claude/work/prioD';
 await page.route('**/apps/konfigurator/shop-embed.mjs*',async route=>{const r=await route.fetch();ersatz.embed=true;return route.fulfill({response:r,body:fs.readFileSync(QUELLE+'/app/workshop/ui/shop-embed.mjs','utf8').replaceAll('__EDITOR_ORIGIN__','https://app-2027.gravuru-designwerkstatt.de').replaceAll('__PROXY_PATH__','/apps/konfigurator')});});
}
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push([t,Date.now()]);},true);});
t0=Date.now();await page.goto('https://gravuru-design.myshopify.com/products/'+HANDLE,{waitUntil:'domcontentloaded',timeout:120000});
const domMs=Date.now()-t0;await page.waitForSelector('a[data-gravuru-start]',{timeout:90000});const knopfMs=Date.now()-t0;
// Vorab-Start beobachten, ohne anzutippen: Wann kommt die letzte Nachricht / der letzte Abruf?
while(Date.now()-t0<WARTEN*1000)await sleep(200);
const meldungenVor=(await page.evaluate(()=>window.__gv||[])).map(([t,at])=>[t,at-t0]);
const vor=abrufe.map(a=>({...a})).sort((a,b)=>a.startMs-b.startMs);
const ruheNachMs=Math.max(0,...vor.map(a=>a.endeMs));
await page.click('a[data-gravuru-start]');const klick=Date.now();
while(Date.now()-klick<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.some(([t,at])=>t==='gravuru-shop-editor-ready'))break;await sleep(50);}
const bereit=Date.now()-klick;await sleep(1500);
const nach=abrufe.slice(vor.length).map(a=>({...a})).sort((a,b)=>a.startMs-b.startMs);
let einzeln=null;
if(process.env.GALERIE==='1'){
 const shop=page.frames().find(f=>{try{return /\/konfigurator\/shop\/?$/.test(new URL(f.url()).pathname);}catch{return false;}});
 const zahl=abrufe.length;
 einzeln=await shop.evaluate(async()=>{const g=window.GravuruShopEntry.designGallery,out=[];for(const [nr,thema] of [[0,'preferred'],[0,'preferred'],[0,'preferred'],[1,'preferred'],[0,'all'],[0,'preferred']]){const t=performance.now();const r=await g.load(nr,thema);out.push({seite:nr,thema,karten:r?.items?.length||0,gesamt:r?.total??null,ms:Math.round(performance.now()-t)});await new Promise(r=>setTimeout(r,400));}return out;});
 await sleep(500);einzeln=einzeln.map((e,i)=>({...e,wartenMs:abrufe.slice(zahl).filter(a=>/design-gallery$/.test(a.weg))[i]?.wartenMs??null,kB:abrufe.slice(zahl).filter(a=>/design-gallery$/.test(a.weg))[i]?.kB??null}));
}
console.log(JSON.stringify({ersatz,produkt:HANDLE,ansicht:MOBIL?'Handy 393':'PC 1366',uhr:new Date().toISOString(),seiteDomMs:domMs,knopfDaMs:knopfMs,vorabRuheNachMs:ruheNachMs,vorabAbrufe:vor.length,vorabkB:Math.round(vor.reduce((s,a)=>s+a.kB,0)),antippenBisBereitMs:bereit,meldungenVor,vor,nach,einzeln},null,1));
await browser.close();
