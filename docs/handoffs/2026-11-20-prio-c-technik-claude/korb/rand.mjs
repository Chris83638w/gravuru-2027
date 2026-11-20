// Claude · 20.11.2026 · Freier Rand außer bei Edelstahl (Chris 19:26 Uhr und Rückfrage): am echten Shop prüfen, Paket nur in
// meinem Browser ersetzt. Ein Element mit der Maus über den Rand ziehen: bleibt es dort, zeigt die Vorschau es abgeschnitten,
// kommt der neutrale Hinweis, bleibt der Weg zum Warenkorb frei? Nur lesend (kein Warenkorb).
// Aufruf: node rand.mjs <Produkt-Handle>   (MOBIL=1 für Handy-Größe)
import {createRequire} from 'node:module';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const [,,PRODUKT]=process.argv,KURZ=process.env.KURZ||PRODUKT.slice(0,12),OUT=process.env.OUT||'korb/rand/',MOBIL=process.env.MOBIL==='1';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext(MOBIL?{viewport:{width:393,height:760},deviceScaleFactor:2.75,isMobile:true,hasTouch:true,locale:'de-DE',userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'}:{viewport:{width:1366,height:900},locale:'de-DE'});
const page=await ctx.newPage();const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res={produkt:PRODUKT,mobil:MOBIL,fehler:[],schritte:{}};
page.on('pageerror',e=>res.fehler.push('Seitenfehler: '+String(e.message).slice(0,160)));
if(process.env.PAARE){const {acrylAssetText}=await import(pathToFileURL((process.env.QUELLE||'/home/claude/work/prioD')+'/app/workshop/acryl-employee-host.mjs'));const paare=process.env.PAARE.split(',').map(p=>p.split(':'));res.ersatz={seite:false,pakete:[]};
 await page.route('**/_merchant-acryl-editor.html*',async route=>{const r=await route.fetch();let body=await r.text();for(const [alt,neu] of paare){if(!body.includes(alt))res.fehler.push('Editor-Seite nennt '+alt+' nicht');body=body.split(alt).join(neu);}res.ersatz.seite=true;return route.fulfill({response:r,body});});
 for(const [,neu] of paare)await page.route('**/_acryl-bundle/'+neu+'.mjs*',route=>{if(!res.ersatz.pakete.includes(neu))res.ersatz.pakete.push(neu);return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:acrylAssetText(fs.readFileSync(process.env.BAU_NEU+'/bundle/'+neu+'.mjs','utf8'),'/_bundle/'+neu+'.mjs')});});
}
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
const editor=()=>page.frames().filter(f=>{try{return /^\/_merchant-(acryl-)?editor\.html$/.test(new URL(f.url()).pathname)&&!f.isDetached();}catch{return false;}}).at(-1);
const lage=f=>f.evaluate(()=>{const el=document.querySelector('gravuru-configurator'),r=el.shadowRoot,p=el.uxSelectedProfile?.(),badge=r.querySelector('[data-ux-boundary-status]'),plate=r.querySelector('.plate-holder')?.getBoundingClientRect();
 const texts=el.state.objects.filter(o=>o.type==='text'&&String(o.text||'').trim()).sort((a,b)=>b.w*b.h-a.w*a.h);
 return {material:p?.material?.kind,breite:el.state.width,hoehe:el.state.height,objekte:el.state.objects.filter(o=>['text','motif'].includes(o.type)).map(o=>({id:o.id,typ:o.type,text:(o.text||'').slice(0,16),x:+o.x.toFixed(2),y:+o.y.toFixed(2),w:+o.w.toFixed(2),h:+o.h.toFixed(2)})),groesster:texts[0]?.id,
  rand:p?.geometry?.safeMarginMm??null,form:p?.geometry?.shape+'/'+(p?.geometry?.cornerRadiusMm??0),hinweis:badge?{sichtbar:!badge.hidden,text:badge.textContent,neutral:badge.hasAttribute('data-ux-edge-note'),farbe:getComputedStyle(badge).color}:null,
  roteMarken:r.querySelectorAll('.scene .ux-outside,.ux-text-row.ux-overflow').length,dialoge:[...r.querySelectorAll('dialog[open]')].map(d=>(d.getAttribute('aria-label')||d.className).slice(0,40)),
  schild:plate?{links:Math.round(plate.left),rechts:Math.round(plate.right),oben:Math.round(plate.top),unten:Math.round(plate.bottom)}:null};});
try{
 await page.goto('https://gravuru-design.myshopify.com/products/'+PRODUKT,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForSelector('a[data-gravuru-start]',{timeout:90000});await sleep(9000);
 await page.evaluate(()=>document.querySelector('a[data-gravuru-start]').click());
 const s0=Date.now();while(Date.now()-s0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready'))break;await sleep(100);}
 await sleep(4000);const f=editor();
 const start=await lage(f);res.schritte['1 Start']=start;const id=start.groesster;
 // Mit der Maus (bzw. dem Finger) ziehen: am Element anfassen und weit nach rechts über den Schildrand hinaus.
 const box=await f.evaluate(id=>{const g=document.querySelector('gravuru-configurator').shadowRoot.querySelector('.scene [data-object="'+CSS.escape(id)+'"]');const b=g.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};},id);
 // Rahmen-Koordinaten in Seiten-Koordinaten umrechnen (verschachtelte Rahmen).
 let ox=0,oy=0;for(let fr=f;fr.parentFrame();fr=fr.parentFrame()){const h=await fr.frameElement();const b=await h.boundingBox();ox+=b.x;oy+=b.y;}
 const px=ox+box.x,py=oy+box.y,weit=MOBIL?170:420;
 if(MOBIL){const c=await ctx.newCDPSession(page);const t=(type,x,y)=>c.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});await t('touchStart',px,py);for(let i=1;i<=12;i++){await t('touchMove',px+weit*i/12,py);await sleep(30);}await t('touchEnd',0,0);}
 else{await page.mouse.move(px,py);await page.mouse.down();for(let i=1;i<=12;i++){await page.mouse.move(px+weit*i/12,py);await sleep(30);}await page.mouse.up();}
 await sleep(1200);res.gezogen={id,umPx:weit};res.schritte['2 nach dem Ziehen nach rechts']=await lage(f);await page.screenshot({path:OUT+KURZ+'-2-gezogen.png'});
 // Weg zum Warenkorb: die Prüfung davor (kein Klick auf Warenkorb, keine Bestellung).
 res.pruefungVorWarenkorb=await f.evaluate(async()=>{const el=document.querySelector('gravuru-configurator'),r=el.shadowRoot;const frei=await el.uxCheckLayout();const offen=[...r.querySelectorAll('dialog[open]')].map(d=>(d.querySelector('h2')?.textContent||d.getAttribute('aria-label')||'').slice(0,40)),texte=[...r.querySelectorAll('dialog[open] p')].map(p=>(p.textContent||'').trim().slice(0,140)).filter(Boolean),knoepfe=[...r.querySelectorAll('dialog[open] button')].map(b=>(b.textContent||'').trim().slice(0,40)).filter(Boolean);return {frei,dialoge:offen,texte,knoepfe};});
 await sleep(300);await page.screenshot({path:OUT+KURZ+'-3-pruefung.png'});
 await f.evaluate(()=>{for(const d of document.querySelector('gravuru-configurator').shadowRoot.querySelectorAll('dialog[open]'))d.close();});
 // Ganz neben das Schild setzen: die Mitte muss auf dem Schild bleiben.
 await f.evaluate(id=>{const el=document.querySelector('gravuru-configurator');const o=el.state.objects.find(o=>o.id===id);o.x=el.state.width+60;el.sync();},id);
 await sleep(800);res.schritte['3 ganz neben das Schild gesetzt']=await lage(f);
}catch(e){res.fehler.push(String(e.message).slice(0,300));}
console.log(JSON.stringify(res));await browser.close();
