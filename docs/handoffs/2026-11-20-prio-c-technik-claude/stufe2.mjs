// Claude · 20.11.2026 · Auftrag #265, Weg A · alle Galerie-Designs des echten Edelstahl-Türschilds nacheinander wählen
// und Gestaltung samt gezeichneter Pfade festhalten, damit bisheriger und neuer Wechsel vergleichbar sind.
// Nur lesend: kein Speichern, kein Warenkorb, keine Bestellung. Der Server bleibt der Live-Server.
// Modus „live“: unveränderte Seite. Modus „neu“: nur in diesem Browser werden das Hauptpaket des Editors und
// shop-design-switch.mjs durch den Bau aus meinem Zweig ersetzt. Am Shop und am Server ändert sich nichts.
// Stufe 2: zusätzlich shop-entry-client.mjs ersetzt; der neue Server-Abruf design-parts und der Fingerabdruck der Startantwort
// werden in diesem Browser aus den echten Live-Modellen gebildet (dieselben Funktionen wie im Server). Aufruf: node stufe2.mjs neu [mobil] [--drossel]
import {createRequire} from 'node:module';import zlib from 'node:zlib';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const [,,modus='live',...rest]=process.argv;const MOBIL=rest.includes('mobil'),DROSSEL=rest.includes('--drossel');
const SHOP='https://gravuru-design.myshopify.com',APP='https://app-2027.gravuru-designwerkstatt.de';
const ALT=process.env.ALT_PAKET||'editor-6c00a8d0e08b6e0d',NEU=process.env.NEU_PAKET||'editor-fe2e516c889012e3';
const BAU_ALT=process.env.BAU_ALT||'/tmp/build-prioC3',BAU_NEU=process.env.BAU_NEU||'/tmp/build-S2',QUELLE_ALT=process.env.QUELLE_ALT||'/home/claude/work/Live3',QUELLE_NEU=process.env.QUELLE_NEU||'/home/claude/work/prioC';
const OUT=process.env.OUT||'out',name='stufe2-'+(process.env.LEICHT==='1'?'zeit-':'')+modus+(MOBIL?'-mobil':'-pc')+(DROSSEL?'-drossel':'');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext(MOBIL?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE'}:{viewport:{width:1366,height:900},locale:'de-DE'});
const page=await ctx.newPage();const res={modus,profil:MOBIL?'mobil':'pc',drossel:DROSSEL,zeit:new Date().toISOString(),ersatz:{},schritte:[],fehler:[]};
let posts=0,modelle=0,teile=0,pakete=new Set();
page.on('request',r=>{const u=r.url();if(/\/api\/shop-entry\/design-switch/.test(u)&&r.method()==='POST')posts++;if(/\/api\/shop-entry\/model\?design=/.test(u)&&r.method()==='GET'&&r.frame()!==null&&!r.headers()['x-claude-nachbau'])modelle++;if(/\/api\/shop-entry\/design-parts/.test(u))teile++;const m=/_acryl-bundle\/(editor-[0-9a-f]+)\.mjs/.exec(u);if(m)pakete.add(m[1]);
  if(r.method()!=='GET'&&/\/cart\/add|acrylic-drafts|theme-cart|cart\/claim|\/api\/shop-entry\/cart/.test(u))res.fehler.push('UNERWARTETER SCHREIBZUGRIFF '+u.slice(0,90));});
const schrift={anzahl:0,kb:0};page.on('requestfinished',async r=>{if(/\/lazy\/schriften\/|\/konfigurator\/shop\/schriften\//.test(r.url())){try{const z=await r.sizes();if(z.responseBodySize>0){schrift.anzahl++;schrift.kb+=z.responseBodySize/1024;}}catch{}}});
page.on('pageerror',e=>res.fehler.push('Seitenfehler: '+String(e.message).slice(0,160)));
page.on('console',m=>{if(m.type()==='error'&&!/favicon|ERR_BLOCKED|Failed to load resource/.test(m.text()))res.fehler.push('Konsole: '+m.text().slice(0,160));});
if(modus==='neu'){
  const {acrylAssetText}=await import(pathToFileURL(QUELLE_ALT+'/app/workshop/acryl-employee-host.mjs'));
  // Wie liefert der Server eine Datei aus: unverändert oder mit umgeschriebenen Pfaden? An der Live-Datei ablesen.
  const regel=async(url,lokalAlt,pfad)=>{let laenge=[];for(let i=0;i<4;i++){const live=await (await ctx.request.get(url)).text();if(live===lokalAlt)return t=>t;if(live===acrylAssetText(lokalAlt,pfad))return t=>acrylAssetText(t,pfad);laenge.push(live.length);await new Promise(r=>setTimeout(r,1500));}res.fehler.push('Abruf unvollständig: '+pfad+' '+laenge.join('/'));throw Error('Live-Datei entspricht nicht dem Bau aus 921928f4: '+pfad+' (Längen '+laenge.join('/')+')');};
  const paketRegel=await regel(APP+'/_acryl-bundle/'+ALT+'.mjs',fs.readFileSync(BAU_ALT+'/bundle/'+ALT+'.mjs','utf8'),'/_bundle/'+ALT+'.mjs');
  const seitenRegel=await regel(APP+'/konfigurator/shop/shop-design-switch.mjs',fs.readFileSync(QUELLE_ALT+'/app/workshop/ui/shop-design-switch.mjs','utf8'),'/konfigurator/shop/shop-design-switch.mjs');
  res.ersatz.liveEntsprichtBau=true;
  await page.route('**/_merchant-acryl-editor.html*',async route=>{let r,body='';for(let i=0;i<4&&!body.includes(ALT);i++){r=await route.fetch();body=await r.text();if(!body.includes(ALT)){res.ersatz.wiederholt=(res.ersatz.wiederholt||0)+1;await new Promise(x=>setTimeout(x,1200));}}if(!body.includes(ALT)){res.fehler.push('Editor-Seite nennt das erwartete Paket nicht ('+body.length+' Zeichen)');return route.fulfill({response:r});}res.ersatz.seite=true;return route.fulfill({response:r,body:body.split(ALT).join(NEU)});});
  await page.route('**/_acryl-bundle/'+NEU+'.mjs*',route=>{res.ersatz.paket=true;return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:paketRegel(fs.readFileSync(BAU_NEU+'/bundle/'+NEU+'.mjs','utf8'))});});
  const clientRegel=await regel(APP+'/konfigurator/shop/shop-entry-client.mjs',fs.readFileSync(QUELLE_ALT+'/app/workshop/ui/shop-entry-client.mjs','utf8'),'/konfigurator/shop/shop-entry-client.mjs');
  await page.route('**/konfigurator/shop/shop-entry-client.mjs*',route=>{res.ersatz.client=true;return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:clientRegel(fs.readFileSync(QUELLE_NEU+'/app/workshop/ui/shop-entry-client.mjs','utf8'))});});
  // Nachbau des neuen Server-Teils aus echten Live-Antworten, mit den Funktionen aus dem Zweig.
  const {shopDesignParts,shopDesignBase}=await import(pathToFileURL(QUELLE_NEU+'/app/workshop/shop-start-model.mjs'));
  const fertig=new Map();
  await page.route(u=>u.pathname==='/api/shop-entry/model',async route=>{
   let r,data=null;for(let i=0;i<4&&!data;i++){r=await route.fetch();if(r.status()!==200)return route.fulfill({response:r});try{data=await r.json();}catch{res.ersatz.wiederholt=(res.ersatz.wiederholt||0)+1;await new Promise(x=>setTimeout(x,1200));}}
   data.designBase=shopDesignBase(data.model.universal);res.ersatz.fingerabdruck=data.designBase.slice(0,12);
   return route.fulfill({response:r,body:JSON.stringify(data)});});
  await page.route(u=>u.pathname==='/api/shop-entry/design-parts',async route=>{
   const req=route.request(),ids=new URL(req.url()).searchParams.get('designs').split(','),session=req.headers()['x-gravuru-shop-session'];
   res.ersatz.teileAnfrage=(res.ersatz.teileAnfrage||0)+1;res.ersatz.teileDesigns=ids.length;let binding=null,configuration=null;const designs=[];
   for(let i=0;i<ids.length;i+=4)await Promise.all(ids.slice(i,i+4).map(async id=>{
    if(!fertig.has(id)){const r=await ctx.request.get(APP+'/api/shop-entry/model?design='+encodeURIComponent(id),{headers:{'X-Gravuru-Shop-Session':session,Origin:APP,'x-claude-nachbau':'1'}});
     let d=null;if(r.status()===200){try{d=await r.json();}catch{res.ersatz.wiederholt=(res.ersatz.wiederholt||0)+1;const again=await ctx.request.get(APP+'/api/shop-entry/model?design='+encodeURIComponent(id),{headers:{'X-Gravuru-Shop-Session':session,Origin:APP,'x-claude-nachbau':'1'}});try{d=await again.json();}catch{}}}fertig.set(id,d);}
   }));
   for(const id of ids){const d=fertig.get(id);if(!d||d.model.universal.profile.defaultDesignId!==id)continue;binding=d.binding;configuration={id:d.model.configuration.id,revision:d.model.configuration.revision};
    designs.push({id,base:shopDesignBase(d.model.universal),parts:shopDesignParts(d.model.universal)});}
   const body=JSON.stringify({binding,configuration,designs});(res.ersatz.teile??=[]).push({designs:designs.length,zeichen:body.length,brotli:zlib.brotliCompressSync(Buffer.from(body),{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:5}}).length});
   return route.fulfill({status:200,contentType:'application/json; charset=utf-8',headers:{'cache-control':'private, no-store'},body});});
  await page.route('**/konfigurator/shop/shop-design-switch.mjs*',route=>{res.ersatz.shopSeite=true;return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:seitenRegel(fs.readFileSync(QUELLE_NEU+'/app/workshop/ui/shop-design-switch.mjs','utf8'))});});
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
const editor=()=>page.frames().filter(f=>{try{return new URL(f.url()).pathname==='/_merchant-acryl-editor.html'&&!f.isDetached();}catch{return false;}});
// Der sichtbare Editor: bei einem Wechsel über den Server ist es der zuletzt angelegte Rahmen.
const aktiv=async()=>{const all=editor();for(const f of all.slice().reverse()){const ok=await f.evaluate(()=>{const fe=window.frameElement;return !!fe&&!fe.hidden&&fe.style.display!=='none'&&fe.style.visibility!=='hidden'&&!!document.querySelector('gravuru-configurator');}).catch(()=>false);if(ok)return f;}return all.at(-1);};
const LEICHT=process.env.LEICHT==='1';
const lage=f=>f.evaluate(LEICHT=>{const el=document.querySelector('gravuru-configurator');const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);
  let zeichnung=null;if(LEICHT)zeichnung={leicht:true};else try{const m=el.svg(true);const ds=[...m.matchAll(/\sd="([^"]*)"/g)].map(x=>x[1]).sort();let h=2166136261;for(const d of ds)for(let i=0;i<d.length;i++){h^=d.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}zeichnung={pfade:ds.length,pfadSumme:h.toString(16),textElemente:(m.match(/<text\b/g)||[]).length,laenge:m.length};}catch(e){zeichnung={fehler:String(e.message).slice(0,80)};}
  return {zeichnung,motive:el.state.objects.filter(o=>o.type==='motif').map(o=>({motif:o.motif,x:Math.round(o.x*10)/10,y:Math.round(o.y*10)/10,w:Math.round((o.w||0)*10)/10,h:Math.round((o.h||0)*10)/10,registriert:o.motif in el.motifs})),designId:el.state.designId,texte:el.state.objects.filter(o=>o.type==='text').map(o=>({text:o.text,font:o.font,x:Math.round(o.x*10)/10,y:Math.round(o.y*10)/10,size:Math.round(o.size*100)/100})),objekte:el.state.objects.length,
    schriften:Object.keys(el.fontData||{}).length,designsImGeraet:(el.uxSelectedProfile?.().designs||[]).map(d=>d.id),groesse:el.state.mOptions?.size||null,gedrueckt:all.filter(e=>e.matches('.ux-product-choose[aria-pressed=true]')).map(e=>e.getAttribute('aria-label')),karten:all.filter(e=>e.matches('.ux-product-choose')).length,zurueckSichtbar:all.filter(e=>e.matches('.ux-product-back')).some(e=>!e.hidden),status:(all.find(e=>e.matches('.ux-product-status'))?.textContent||'').slice(0,60)};},LEICHT);
const knopf=(f,text)=>f.evaluate(text=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const sicht=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>4&&r.height>4&&s.visibility!=='hidden'&&s.display!=='none';};const b=all.filter(e=>e.matches('button,[role=tab]')).filter(sicht).find(e=>((e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' '))===text);if(b){b.click();return true;}return false;},text);
const karte=(f,i)=>f.evaluate(i=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const k=all.filter(e=>e.matches('.ux-product-choose'))[i];if(!k)return null;const id=k.dataset.productDesignId||null,name=k.getAttribute('aria-label');k.click();return {id,name};},i);
async function schritt(titel,tun,fertig){const vorher={posts,modelle,rahmen:editor().length};const t0=Date.now();const info=await tun();let ms=null;
  while(Date.now()-t0<60000){const f=await aktiv();const l=await lage(f).catch(()=>null);if(l&&await fertig(l,info)){ms=Date.now()-t0;break;}await sleep(40);}
  await sleep(700);const f=await aktiv(),l=await lage(f);if([2,3,5,12].includes(res.schritte.length+1))await page.screenshot({path:`${OUT}/${name}-${res.schritte.length+1}.png`});
  res.schritte.push({titel,ms,ziel:info?.name||info||null,designId:l.designId,zeichnung:l.zeichnung,motive:l.motive,texte:l.texte,designsImGeraet:l.designsImGeraet.length,schriften:l.schriften,teileAbrufe:teile,groesse:l.groesse,gedrueckt:l.gedrueckt,zurueckSichtbar:l.zurueckSichtbar,status:l.status,serverWechsel:posts-vorher.posts,modellAbrufe:modelle-vorher.modelle,neueEditoren:editor().length-vorher.rahmen});return l;}
try{
  if(DROSSEL){const cdp=await ctx.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:0.75*1024*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
  await page.goto(SHOP+'/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForSelector('[data-gravuru-personalisieren] a[data-gravuru-start]',{timeout:90000});await sleep(1200);
  await page.click('[data-gravuru-personalisieren] a[data-gravuru-start]');
  const t0=Date.now();let bereit=false;while(Date.now()-t0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready')){bereit=true;break;}await sleep(100);}
  res.editorBereit=bereit;res.oeffnenMs=Date.now()-t0;await sleep(2500);
  let f=await aktiv();res.start=await lage(f);
  // Warten, bis alle Designs der Liste im Gerät liegen (im Nachbau dauert das länger als am echten Server).
  const w0=Date.now();let im=0;while(Date.now()-w0<150000){const l=await lage(await aktiv()).catch(()=>null);im=l?.designsImGeraet.length||0;if(l&&l.karten>1&&im>=l.karten)break;await sleep(250);}
  res.alleImGeraetNachMs=Date.now()-w0;res.designsImGeraetVorDemOeffnen=im;await sleep(DROSSEL?12000:6000);
  res.vorDemOeffnen=await lage(await aktiv());
  await knopf(await aktiv(),'Designs');await sleep(1500);
  const n=(await lage(await aktiv())).karten;res.karten=n;
  for(let i=1;i<n;i++)await schritt('Design '+(i+1),async()=>karte(await aktiv(),i),(l,info)=>l.designId===info.id);
  await schritt('Zurück zu Design 1',async()=>karte(await aktiv(),0),(l,info)=>l.designId===info.id);
}catch(e){res.abbruch=String(e.message).slice(0,240);}
res.schriftAbrufe={anzahl:schrift.anzahl,kb:Math.round(schrift.kb)};try{res.aufnahme=await (await aktiv()).evaluate(()=>document.querySelector('gravuru-configurator').uxDesignPreloadLog||null);}catch{}
res.pakete=[...pakete];res.teileAbrufeGesamt=teile;res.serverWechselGesamt=posts;res.modellAbrufeGesamt=modelle;res.editorenAmEnde=editor().length;
fs.writeFileSync(`${OUT}/${name}.json`,JSON.stringify(res,null,1));
console.log(JSON.stringify({modus:res.modus,profil:res.profil,ersatz:res.ersatz,oeffnenMs:res.oeffnenMs,pakete:res.pakete,textGesetzt:res.textGesetzt,groessenwechsel:res.groessenwechsel,abbruch:res.abbruch,fehler:res.fehler.slice(0,8),teile:res.ersatz.teile,schriftAbrufe:res.schriftAbrufe,aufnahme:res.aufnahme,alleImGeraetNachMs:res.alleImGeraetNachMs,designsImGeraetVorDemOeffnen:res.designsImGeraetVorDemOeffnen,schriftenVorDemOeffnen:res.vorDemOeffnen?.schriften,karten:res.karten,gesamt:{serverWechsel:posts,modellAbrufe:modelle,teileAbrufe:teile,editoren:res.editorenAmEnde}},null,0));
console.log(res.schritte.length,'Schritte');
await browser.close();
