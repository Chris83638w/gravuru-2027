// Claude · 20.11.2026 · Auftrag #265, Weg A · Bedienprüfung des Designwechsels am echten Edelstahl-Türschild.
// Nur lesend: kein Speichern, kein Warenkorb, keine Bestellung. Der Server bleibt der Live-Server.
// Modus „live“: unveränderte Seite. Modus „neu“: nur in diesem Browser werden das Hauptpaket des Editors und
// shop-design-switch.mjs durch den Bau aus meinem Zweig ersetzt. Am Shop und am Server ändert sich nichts.
// Aufruf: node geraetewechsel.mjs <live|neu> [mobil] [--drossel]
import {createRequire} from 'node:module';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const [,,modus='live',...rest]=process.argv;const MOBIL=rest.includes('mobil'),DROSSEL=rest.includes('--drossel');
const SHOP='https://gravuru-design.myshopify.com',APP='https://app-2027.gravuru-designwerkstatt.de';
const ALT=process.env.ALT_PAKET||'editor-03848a8822ea9589',NEU=process.env.NEU_PAKET||'editor-d64f43ea13aaac6a';
const BAU_ALT=process.env.BAU_ALT||'/tmp/build-Live2',BAU_NEU=process.env.BAU_NEU||'/tmp/build-prioC',QUELLE_ALT=process.env.QUELLE_ALT||'/home/claude/work/Live2',QUELLE_NEU=process.env.QUELLE_NEU||'/home/claude/work/prioC';
const OUT=process.env.OUT||'out',name='knopf-'+modus+(MOBIL?'-mobil':'-pc')+(DROSSEL?'-drossel':'');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext(MOBIL?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE'}:{viewport:{width:1366,height:900},locale:'de-DE'});
const page=await ctx.newPage();const res={modus,profil:MOBIL?'mobil':'pc',drossel:DROSSEL,zeit:new Date().toISOString(),ersatz:{},schritte:[],fehler:[]};
let posts=0,modelle=0,pakete=new Set();
page.on('request',r=>{const u=r.url();if(/\/api\/shop-entry\/design-switch/.test(u)&&r.method()==='POST')posts++;if(/\/api\/shop-entry\/model(\?|$)/.test(u)&&r.method()==='GET')modelle++;const m=/_acryl-bundle\/(editor-[0-9a-f]+)\.mjs/.exec(u);if(m)pakete.add(m[1]);
  if(r.method()!=='GET'&&/\/cart\/add|acrylic-drafts|theme-cart|cart\/claim|\/api\/shop-entry\/cart/.test(u))res.fehler.push('UNERWARTETER SCHREIBZUGRIFF '+u.slice(0,90));});
page.on('pageerror',e=>res.fehler.push('Seitenfehler: '+String(e.message).slice(0,160)));
page.on('console',m=>{if(m.type()==='error'&&!/favicon|ERR_BLOCKED|Failed to load resource/.test(m.text()))res.fehler.push('Konsole: '+m.text().slice(0,160));});
if(modus==='neu'){
  const {acrylAssetText}=await import(pathToFileURL(QUELLE_ALT+'/app/workshop/acryl-employee-host.mjs'));
  // Wie liefert der Server eine Datei aus: unverändert oder mit umgeschriebenen Pfaden? An der Live-Datei ablesen.
  const regel=async(url,lokalAlt,pfad)=>{const live=await (await ctx.request.get(url)).text();if(live===lokalAlt)return t=>t;if(live===acrylAssetText(lokalAlt,pfad))return t=>acrylAssetText(t,pfad);throw Error('Live-Datei entspricht nicht dem Bau aus 2bd7bd8e: '+pfad);};
  const paketRegel=await regel(APP+'/_acryl-bundle/'+ALT+'.mjs',fs.readFileSync(BAU_ALT+'/bundle/'+ALT+'.mjs','utf8'),'/_bundle/'+ALT+'.mjs');
  const seitenRegel=await regel(APP+'/konfigurator/shop/shop-design-switch.mjs',fs.readFileSync(QUELLE_ALT+'/app/workshop/ui/shop-design-switch.mjs','utf8'),'/konfigurator/shop/shop-design-switch.mjs');
  res.ersatz.liveEntsprichtBau=true;
  await page.route('**/_merchant-acryl-editor.html*',async route=>{const r=await route.fetch();let body=await r.text();if(!body.includes(ALT)){res.fehler.push('Editor-Seite nennt das erwartete Paket nicht');return route.fulfill({response:r});}res.ersatz.seite=true;return route.fulfill({response:r,body:body.split(ALT).join(NEU)});});
  await page.route('**/_acryl-bundle/'+NEU+'.mjs*',route=>{res.ersatz.paket=true;return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:paketRegel(fs.readFileSync(BAU_NEU+'/bundle/'+NEU+'.mjs','utf8'))});});
  await page.route('**/konfigurator/shop/shop-design-switch.mjs*',route=>{res.ersatz.shopSeite=true;return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:seitenRegel(fs.readFileSync(QUELLE_NEU+'/app/workshop/ui/shop-design-switch.mjs','utf8'))});});
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
const editor=()=>page.frames().filter(f=>{try{return new URL(f.url()).pathname==='/_merchant-acryl-editor.html'&&!f.isDetached();}catch{return false;}});
// Der sichtbare Editor: bei einem Wechsel über den Server ist es der zuletzt angelegte Rahmen.
const aktiv=async()=>{const all=editor();for(const f of all.slice().reverse()){const ok=await f.evaluate(()=>{const fe=window.frameElement;return !!fe&&!fe.hidden&&fe.style.display!=='none'&&fe.style.visibility!=='hidden'&&!!document.querySelector('gravuru-configurator');}).catch(()=>false);if(ok)return f;}return all.at(-1);};
const lage=f=>f.evaluate(()=>{const el=document.querySelector('gravuru-configurator');const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);
  return {designId:el.state.designId,texte:el.state.objects.filter(o=>o.type==='text').map(o=>({text:o.text,font:o.font,x:Math.round(o.x*10)/10,y:Math.round(o.y*10)/10,size:Math.round(o.size*100)/100})),objekte:el.state.objects.length,
    designsImGeraet:(el.uxSelectedProfile?.().designs||[]).map(d=>d.id),groesse:el.state.mOptions?.size||null,gedrueckt:all.filter(e=>e.matches('.ux-product-choose[aria-pressed=true]')).map(e=>e.getAttribute('aria-label')),karten:all.filter(e=>e.matches('.ux-product-choose')).length,zurueckSichtbar:all.filter(e=>e.matches('.ux-product-back')).some(e=>!e.hidden),status:(all.find(e=>e.matches('.ux-product-status'))?.textContent||'').slice(0,60)};});
const knopf=(f,text)=>f.evaluate(text=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const sicht=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>4&&r.height>4&&s.visibility!=='hidden'&&s.display!=='none';};const b=all.filter(e=>e.matches('button,[role=tab]')).filter(sicht).find(e=>((e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' '))===text);if(b){b.click();return true;}return false;},text);
const karte=(f,i)=>f.evaluate(i=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const k=all.filter(e=>e.matches('.ux-product-choose'))[i];if(!k)return null;const id=k.dataset.productDesignId||null,name=k.getAttribute('aria-label');k.click();return {id,name};},i);
async function schritt(titel,tun,fertig){const vorher={posts,modelle,rahmen:editor().length};const t0=Date.now();const info=await tun();let ms=null;
  while(Date.now()-t0<60000){const f=await aktiv();const l=await lage(f).catch(()=>null);if(l&&await fertig(l,info)){ms=Date.now()-t0;break;}await sleep(40);}
  await sleep(900);const f=await aktiv(),l=await lage(f);await page.screenshot({path:`${OUT}/${name}-${res.schritte.length+1}.png`});
  res.schritte.push({titel,ms,ziel:info?.name||info||null,designId:l.designId,texte:l.texte,designsImGeraet:l.designsImGeraet.length,groesse:l.groesse,gedrueckt:l.gedrueckt,zurueckSichtbar:l.zurueckSichtbar,status:l.status,serverWechsel:posts-vorher.posts,modellAbrufe:modelle-vorher.modelle,neueEditoren:editor().length-vorher.rahmen});return l;}
try{
  if(DROSSEL){const cdp=await ctx.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:0.75*1024*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
  await page.goto(SHOP+'/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForSelector('[data-gravuru-personalisieren] a[data-gravuru-start]',{timeout:90000});await sleep(1200);
  await page.click('[data-gravuru-personalisieren] a[data-gravuru-start]');
  const t0=Date.now();let bereit=false;while(Date.now()-t0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready')){bereit=true;break;}await sleep(100);}
  res.editorBereit=bereit;res.oeffnenMs=Date.now()-t0;await sleep(2500);
  let f=await aktiv();res.start=await lage(f);
  await knopf(f,'Designs');await sleep(4500);
  await schritt('Zweites Design wählen',async()=>karte(await aktiv(),1),(l,info)=>l.designId===info.id);
  await sleep(2500);f=await aktiv();
  // Designauswahl wieder öffnen, falls der neue Editor sie geschlossen zeigt.
  const offen=await f.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const k=all.find(e=>e.matches('.ux-product-choose'));if(!k)return false;const r=k.getBoundingClientRect();return r.width>4&&r.height>4&&r.top<innerHeight;});
  res.auswahlBliebOffen=offen;if(!offen){await knopf(f,'Designs');await sleep(3500);}
  res.rahmen=await f.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);let ox=0,oy=0,w=window;try{while(w.frameElement){const r=w.frameElement.getBoundingClientRect();ox+=r.left;oy+=r.top;w=w.parent;}}catch{}
    const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();const s=getComputedStyle(e);if(r.width<4||r.height<4||e.hidden||s.display==='none'||s.visibility==='hidden')return null;return {x:r.left+ox,y:r.top+oy,w:r.width,h:r.height,text:(e.innerText||e.getAttribute('aria-label')||e.title||'').trim().slice(0,50),gesperrt:!!e.disabled};};
    return {zurueck:box(all.find(e=>e.matches('.ux-product-back'))),rueckgaengig:box(all.filter(e=>e.matches('[data-ux=undo]')).find(e=>e.getBoundingClientRect().width>4))};});
  await page.screenshot({path:`${OUT}/${name}-bild.png`});
}catch(e){res.abbruch=String(e.message).slice(0,240);}
res.pakete=[...pakete];res.serverWechselGesamt=posts;res.modellAbrufeGesamt=modelle;res.editorenAmEnde=editor().length;
fs.writeFileSync(`${OUT}/${name}.json`,JSON.stringify(res,null,1));
console.log(JSON.stringify({modus:res.modus,profil:res.profil,ersatz:res.ersatz,oeffnenMs:res.oeffnenMs,pakete:res.pakete,textGesetzt:res.textGesetzt,groessenwechsel:res.groessenwechsel,abbruch:res.abbruch,fehler:res.fehler.slice(0,8),gesamt:{serverWechsel:posts,modellAbrufe:modelle,editoren:res.editorenAmEnde}},null,0));
console.log('Auswahl blieb offen:',res.auswahlBliebOffen,'| Knöpfe:',JSON.stringify(res.rahmen));
await browser.close();
