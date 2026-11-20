// Claude · 20.11.2026 · Acryl-Schild 12 × 8 cm: Designkarten und Wechsel mit dem neuen Stand, am echten Shop, nur lesend.
// Ersetzt wird nur in meinem Browser (acryl/nachbau.mjs). Zwei Durchgänge: der erste füllt den Nachbau (erste und zweite
// Seite, eine Suche), der zweite misst; dort antwortet der Nachbau nach VERZUG ms wie ein Server mit warmem Speicher.
import {createRequire} from 'node:module';
import {nachbau} from './nachbau.mjs';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const HANDLE=process.argv[2]||'familienschild-acryl-baum-12x8-personalisiert',WARTEN=Number(process.argv[3]||10000),NAME=process.argv[4]||'acryl';
const VERZUG=Number(process.env.VERZUG||450),MOBIL=process.env.MOBIL==='1',SUCHE=process.env.SUCHE||'Haus',OHNE=process.env.OHNE_ERSATZ==='1';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext(MOBIL?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}:{viewport:{width:1366,height:900},locale:'de-DE'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const fertig=new Map();const res={ersatz:{},fehler:[]};
const zaehler={wechselServer:0,modelle:0,teile:0,vorschauServer:0,editoren:0};let messen=false;
const WALK='const all=[];const walk=r=>{for(const e of r.querySelectorAll("*")){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const el=document.querySelector("gravuru-configurator");';
async function durchgang(nr,warten=WARTEN,nurKarten=false){
 const page=await ctx.newPage();
 page.on('pageerror',e=>res.fehler.push('D'+nr+' Seitenfehler: '+String(e.message).slice(0,160)));
 const schrift={anzahl:0,kB:0};page.on('requestfinished',async r=>{if(nr<2||!/\/lazy\/schriften\/|\/konfigurator\/shop\/schriften\//.test(r.url()))return;try{const z=await r.sizes();if(z.responseBodySize>0){schrift.anzahl++;schrift.kB+=z.responseBodySize/1024;}}catch{}});
 page.on('console',m=>{if(m.type()==='error'&&!/favicon|ERR_BLOCKED|Failed to load resource|accessibility|shop\.app/.test(m.text()))res.fehler.push('D'+nr+' Konsole: '+m.text().slice(0,160));});
 page.on('request',r=>{if(!messen)return;const u=r.url();if(/\/api\/shop-entry\/design-switch/.test(u)&&r.method()==='POST')zaehler.wechselServer++;if(/\/api\/shop-entry\/model\?design=/.test(u)&&!r.headers()['x-claude-nachbau'])zaehler.modelle++;if(/\/api\/shop-entry\/design-parts/.test(u))zaehler.teile++;if(/gallery-preview/.test(u))zaehler.vorschauServer++;if(/_merchant-acryl-editor\.html/.test(u))zaehler.editoren++;});
 if(!OHNE)await nachbau(ctx,page,res,{fertig,verzug:()=>messen?VERZUG:0});
 await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
 await page.goto('https://gravuru-design.myshopify.com/products/'+HANDLE,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForSelector('a[data-gravuru-start]',{timeout:90000});await sleep(nr===1?4000:warten);
 if(nr>=2)messen=true;
 await page.click('a[data-gravuru-start]');
 const s0=Date.now();while(Date.now()-s0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready'))break;await sleep(100);}
 const bereit=Date.now()-s0;
 const f=()=>page.frames().filter(f=>{try{return new URL(f.url()).pathname==='/_merchant-acryl-editor.html'&&!f.isDetached();}catch{return false;}}).at(-1);
 const zustand=()=>f().evaluate(new Function(WALK+'const imgs=all.filter(e=>e.matches(".ux-product-choose img")),gez=all.filter(e=>e.matches(".ux-product-choose svg.ux-product-drawn"));const sichtbar=e=>{const b=e.getBoundingClientRect();return b.width>10&&b.bottom>0&&b.top<innerHeight;};return {karten:imgs.length+gez.length,imGeraet:gez.length,vomServer:imgs.filter(i=>i.complete&&i.naturalWidth>0).length,offen:imgs.filter(i=>!(i.complete&&i.naturalWidth>0)).length,sichtbarOffen:imgs.filter(i=>!(i.complete&&i.naturalWidth>0)&&sichtbar(i)).length,designsImGeraet:el.uxSelectedProfile().designs.length,schriften:Object.keys(el.fontData||{}).length,vorladen:(el.uxDesignPreloadLog||[]).map(x=>x.designs+":"+x.ms).join(" "),designId:el.state.designId,status:(all.find(e=>e.matches(".ux-product-status"))?.textContent||"").trim()};'));
 const kurz=z=>({karten:z.karten,imGeraet:z.imGeraet,vomServer:z.vomServer,offen:z.offen,sichtbarOffen:z.sichtbarOffen,designsImGeraet:z.designsImGeraet});
 const oeffnen=()=>f().evaluate(new Function(WALK+'const b=all.filter(e=>e.matches("button,[role=tab]")).find(e=>(e.innerText||"").trim()==="Designs"&&e.getBoundingClientRect().width>4);b?.click();return !!b;'));
 const mehr=()=>f().evaluate(new Function(WALK+'const b=all.find(e=>e.matches(".ux-product-more")&&!e.hidden);b?.scrollIntoView();b?.click();return !!b;'));
 const suchen=text=>f().evaluate(new Function('text',WALK+'const i=all.find(e=>e.matches(".ux-product-designs input[type=search], .ux-product-designs input"));if(!i)return false;i.scrollIntoView();i.focus();i.value=text;i.dispatchEvent(new Event("input",{bubbles:true}));return true;'),text);
 const sync=()=>f().evaluate(new Function(WALK+'const o=el.state.objects.find(o=>o.type==="text");if(!o)return null;const alt=o.text,zeiten=[];for(let i=0;i<6;i++){const t=performance.now();o.text="Familie Test"+i;el.sync();zeiten.push(Math.round(performance.now()-t));}o.text=alt;el.sync();return {designs:el.uxSelectedProfile().designs.length,syncMs:zeiten};'));
 const bisRuhig=async(soll,max=180)=>{let z;for(let i=0;i<max;i++){await sleep(1000);z=await zustand();if(soll(z))break;}return z;};
 if(nr===1){
  await sleep(1500);res.syncNurStartdesign=await sync();await oeffnen();
  const a=await bisRuhig(z=>z.designsImGeraet>=38);await mehr();const b=await bisRuhig(z=>z.designsImGeraet>=76);
  await suchen(SUCHE);await sleep(2500);const c=await bisRuhig(z=>z.karten>0&&z.offen===0,90);
  res.fuellen={ersteSeite:kurz(a),zweiteSeite:kurz(b),suche:{...kurz(c),status:c.status},nachbau:fertig.size};await page.close();return;}
 await sleep(nurKarten?300:Number(process.env.NACH_BEREIT||1500));
 const vorOeffnen=await zustand();await oeffnen();const t0=Date.now(),verlauf=[];
 for(const sek of [0.1,0.2,0.5,1,2,3,5,8]){while(Date.now()-t0<sek*1000)await sleep(40);const z=await zustand();verlauf.push({sek,...kurz(z)});if(sek===0.2||sek===2)await page.screenshot({path:'acryl/'+NAME+(nurKarten?'-sofort':'')+'-'+String(sek).replace('.','')+'s.png'});if(z.offen===0&&sek>=2)break;}
 const nach=await zustand();
 res.kosten??={durchgang:nr,schriftenGeladen:schrift.anzahl,schriftenKB:Math.round(schrift.kB),teileRohKB:(res.ersatz.teile||[]).slice(-7).reduce((n,t)=>n+t.kB,0),teileBrotliKB:(res.ersatz.teile||[]).slice(-7).reduce((n,t)=>n+t.brotliKB,0),gruppen:(res.ersatz.teile||[]).slice(-7).map(t=>t.designs+':'+t.kB+'/'+t.brotliKB).join(' ')};
 if(nurKarten){res.sofort={wartenVorTippenMs:warten,bereitNachMs:bereit,vorOeffnen:{designsImGeraet:vorOeffnen.designsImGeraet,schriften:vorOeffnen.schriften},verlauf,schriften:nach.schriften};await page.close();return;}
 // Wechsel im Gerät: drei Karten antippen, je Wechsel die Zeit, bis das Design gilt.
 const wechsel=[];
 for(const index of [3,9,17]){
  wechsel.push(await f().evaluate(new Function('index',WALK+'const k=all.filter(e=>e.matches(".ux-product-choose"))[index];if(!k)return null;const id=k.dataset.productDesignId;const t=performance.now();k.click();return new Promise(done=>{const tick=()=>{if(el.state.designId===id)return requestAnimationFrame(()=>done({id,ms:Math.round(performance.now()-t)}));if(performance.now()-t>15000)return done({id,ms:null});setTimeout(tick,10);};tick();});'),index));await sleep(700);}
 await page.screenshot({path:'acryl/'+NAME+'-nach-wechsel.png'});
 // Rückgängig: zurück zum vorigen Design.
 const rueck=await f().evaluate(new Function(WALK+'const vor=el.state.designId;const b=all.find(e=>e.matches("[data-ux=undo]")&&!e.disabled);if(!b)return {vor,knopf:false};b.click();return new Promise(done=>setTimeout(()=>done({vor,knopf:true,nach:el.state.designId}),400));'));
 const syncViele=await sync();
 // Ausführung wechseln (Farbe oder Befestigung), falls es mehr als eine gibt; das Design muss bleiben oder seine Entsprechung nehmen.
 const ausfuehrung=await f().evaluate(new Function(WALK+'const vor={design:el.state.designId,optionen:{...el.state.mOptions}};const sel=all.filter(e=>e.matches(".m-options select, .m-options input[type=radio]"));const gruppen=(el.uxSelectedProfile().optionGroups||[]).map(g=>({id:g.id,werte:g.values.map(v=>v.id)}));const g=gruppen.find(g=>g.werte.length>1);if(!g)return {gruppen,vor};const ziel=g.werte.find(w=>w!==vor.optionen[g.id]);try{el.uxChangeOption(g.id,ziel);}catch(e){return {gruppen,vor,fehler:String(e.message)};}const mitte={design:el.state.designId,optionen:{...el.state.mOptions},objekte:el.state.objects.length};try{el.uxChangeOption(g.id,vor.optionen[g.id]);}catch(e){return {gruppen,vor,mitte,fehler:String(e.message)};}return {gruppen,vor,mitte,zurueck:{design:el.state.designId,optionen:{...el.state.mOptions}}};'));
 // Weitere Designs (zweite Seite).
 const geklickt=await mehr();const t1=Date.now();let seite2=null;
 for(const sek of [0.3,0.6,1,2,4,8]){while(Date.now()-t1<sek*1000)await sleep(40);const z=await zustand();seite2={sek,...kurz(z)};if(z.karten>40&&z.offen<=1)break;}
 seite2.nichtImGeraet=await f().evaluate(new Function(WALK+'const bekannt=new Set(el.uxSelectedProfile().designs.map(d=>d.id));return all.filter(e=>e.matches(".ux-product-choose")).map(k=>k.dataset.productDesignId).filter(id=>id&&!bekannt.has(id)).map(id=>id.split("-").at(-1));'));seite2.abgelehnt=await f().evaluate(()=>document.querySelector('gravuru-configurator').uxDesignPreloadLog?.refused||0);
 await page.screenshot({path:'acryl/'+NAME+'-seite2.png'});
 // Suche.
 await suchen(SUCHE);const t2=Date.now();let suche=null;
 for(const sek of [0.8,1.2,1.6,2,3,5,8]){while(Date.now()-t2<sek*1000)await sleep(40);const z=await zustand();suche={sek,...kurz(z),status:z.status};if(z.karten>0&&z.offen===0&&/gefunden/.test(z.status))break;}
 await page.screenshot({path:'acryl/'+NAME+'-suche.png'});
 const ende=await zustand();const syncEnde=await sync();
 res.messung={syncEnde,wartenVorTippenMs:WARTEN,bereitNachMs:bereit,vorOeffnen:{designsImGeraet:vorOeffnen.designsImGeraet,schriften:vorOeffnen.schriften},verlauf,nachErsterSeite:{designsImGeraet:nach.designsImGeraet,schriften:nach.schriften,vorladen:nach.vorladen},wechsel,rueck,syncViele,ausfuehrung,weitereDesigns:geklickt,seite2,suche,ende:{designsImGeraet:ende.designsImGeraet,schriften:ende.schriften,designId:ende.designId},zaehler};
 await page.close();
}
if(process.env.NUR_KOSTEN==='1'){await durchgang(2,12000,true);}else{if(!OHNE&&process.env.OHNE_FUELLEN!=='1')await durchgang(1);await durchgang(2);if(process.env.SOFORT==='1')await durchgang(3,1200,true);}
delete res.ersatz.teile;console.log(JSON.stringify(res,null,1));
await browser.close();
