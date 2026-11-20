// Claude · 20.11.2026 · Chris 17:52: Nach „Vergrößern“ verrutscht die Vorschau auf dem Handy (Schild links abgeschnitten,
// „Gestaltung zurücksetzen“ rechts daneben). Am echten Shop nachstellen: direkt nach dem Start und nach einem Designwechsel.
// Nur lesend (kein Warenkorb). Aufruf: node vollbild.mjs <Produkt-Handle> [Kartennummer für den Designwechsel]
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const [,,PRODUKT,KARTE='3']=process.argv,KURZ=process.env.KURZ||PRODUKT.slice(0,12),OUT=process.env.OUT||'korb/vb/';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext({viewport:{width:Number(process.env.BREITE||393),height:Number(process.env.HOEHE||760)},deviceScaleFactor:2.75,isMobile:true,hasTouch:true,locale:'de-DE',userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'});
const page=await ctx.newPage();const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res={produkt:PRODUKT,fehler:[],schritte:{}};
page.on('pageerror',e=>res.fehler.push('Seitenfehler: '+String(e.message).slice(0,160)));
if(process.env.NEU_PAKET){const {nurPaket}=await import('../acryl/nachbau.mjs');await nurPaket(page,res);}
// PAARE="alt:neu,alt2:neu2": mehrere Paket-Teile nur in meinem Browser ersetzen (der echte Server liefert alles andere).
if(process.env.PAARE){const fs=await import('node:fs');const {pathToFileURL}=await import('node:url');const {acrylAssetText}=await import(pathToFileURL((process.env.QUELLE||'/home/claude/work/prioD')+'/app/workshop/acryl-employee-host.mjs'));const paare=process.env.PAARE.split(',').map(p=>p.split(':'));res.ersatz={seite:false,pakete:[]};
 await page.route('**/_merchant-acryl-editor.html*',async route=>{const r=await route.fetch();let body=await r.text();for(const [alt,neu] of paare){if(!body.includes(alt))res.fehler.push('Editor-Seite nennt '+alt+' nicht');body=body.split(alt).join(neu);}res.ersatz.seite=true;return route.fulfill({response:r,body});});
 for(const [,neu] of paare)await page.route('**/_acryl-bundle/'+neu+'.mjs*',route=>{if(!res.ersatz.pakete.includes(neu))res.ersatz.pakete.push(neu);return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:acrylAssetText(fs.readFileSync(process.env.BAU_NEU+'/bundle/'+neu+'.mjs','utf8'),'/_bundle/'+neu+'.mjs')});});
}
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
const editor=()=>page.frames().filter(f=>{try{return /^\/_merchant-(acryl-)?editor\.html$/.test(new URL(f.url()).pathname)&&!f.isDetached();}catch{return false;}}).at(-1);
const lage=f=>f.evaluate(()=>{const el=document.querySelector('gravuru-configurator'),r=el.shadowRoot,full=r.querySelector('.c-large-preview'),stage=r.querySelector('.stage'),bar=r.querySelector('.ux-design-reset'),plate=r.querySelector('.plate-holder'),zoom=r.querySelector('.ux-view-zoom');
 const rect=e=>{if(!e)return null;const b=e.getBoundingClientRect();return {links:Math.round(b.left),oben:Math.round(b.top),breite:Math.round(b.width),hoehe:Math.round(b.height),rechts:Math.round(b.right)};};const cs=e=>getComputedStyle(e);
 return {fensterBreite:innerWidth,design:el.state.designId,vollbildOffen:!!full.open,buehneImDialog:full.contains(stage),
  buehne:{klasse:String(stage.className).slice(0,60),display:cs(stage).display,richtung:cs(stage).flexDirection,ueberlauf:cs(stage).overflow,rect:rect(stage),kinder:[...stage.children].map(c=>c.tagName.toLowerCase()+'.'+String(c.className).split(' ')[0]+(cs(c).position==='absolute'?'(abs)':''))},
  knopf:bar?{eltern:bar.parentNode===stage?'Bühne':String(bar.parentNode?.className||bar.parentNode?.nodeName).slice(0,40),position:cs(bar).position,display:cs(bar).display,text:(bar.innerText||'').trim().replace(/\s+/g,' '),rect:rect(bar)}:null,
  schild:rect(plate),ansicht:zoom?{eltern:zoom.parentNode===stage?'Bühne':String(zoom.parentNode?.className).slice(0,30),position:cs(zoom).position,rect:rect(zoom)}:null,
  schildVollSichtbar:plate?(()=>{const b=plate.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth;})():null,
  merkmale:[...el.attributes].map(a=>a.name).filter(n=>n.startsWith('data-')).join(' ').slice(0,400)};});
const tipp=(f,sel)=>f.evaluate(sel=>{const r=document.querySelector('gravuru-configurator').shadowRoot;const b=r.querySelector(sel);if(!b)return false;b.click();return true;},sel);
try{
 await page.goto('https://gravuru-design.myshopify.com/products/'+PRODUKT,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForSelector('a[data-gravuru-start]',{timeout:90000});await sleep(Number(process.env.WARTEN||9000));
 await page.evaluate(()=>document.querySelector('a[data-gravuru-start]').click());
 const s0=Date.now();while(Date.now()-s0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready'))break;await sleep(100);}
 await sleep(3500);let f=editor();
 res.schritte['1 Start']=await lage(f);await page.screenshot({path:OUT+KURZ+'-1-start.png'});
 res.vergroessernKnopf=await tipp(f,'.md-large-preview');await sleep(1500);
 res.schritte['2 vergrößert nach Start']=await lage(f);await page.screenshot({path:OUT+KURZ+'-2-vergroessert-start.png'});
 await tipp(f,'.c-large-preview .ux-preview-back');await sleep(1000);
 res.schritte['3 wieder zu']=await lage(f);
 if(Number(KARTE)>=0){
  await f.evaluate(()=>{const r=document.querySelector('gravuru-configurator').shadowRoot;[...r.querySelectorAll('button')].find(b=>(b.innerText||'').trim()==='Designs'&&b.getBoundingClientRect().width>4)?.click();});
  const w=Date.now();let n=0;while(Date.now()-w<60000){n=await f.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);return all.filter(e=>e.matches('.ux-product-choose')).length;});if(n>Number(KARTE))break;await sleep(300);}
  await sleep(2500);const vorher=(await lage(f)).design;
  await f.evaluate(k=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);all.filter(e=>e.matches('.ux-product-choose'))[k].click();},Number(KARTE));
  const w2=Date.now();while(Date.now()-w2<30000){f=editor();const l=await lage(f).catch(()=>null);if(l&&l.design!==vorher)break;await sleep(300);}
  await sleep(2500);f=editor();res.karten=n;
  res.schritte['4 nach Designwechsel']=await lage(f);await page.screenshot({path:OUT+KURZ+'-4-nach-wechsel.png'});
  await tipp(f,'.md-large-preview');await sleep(1500);
  res.schritte['5 vergrößert nach Designwechsel']=await lage(f);await page.screenshot({path:OUT+KURZ+'-5-vergroessert-wechsel.png'});
 }
}catch(e){res.fehler.push(String(e.message).slice(0,300));}
console.log(JSON.stringify(res));await browser.close();
