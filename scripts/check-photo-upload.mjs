// Foto-Upload im Kundeneditor (Fehler 20.10.2026): Tipp/Klick auf Fotobereich bzw. Fotohinweis der Platte,
// „Dateien auswählen“ und „Foto für diesen Platzhalter hochladen“ öffnen die Dateiauswahl; das gewählte Bild
// ersetzt das Beispielfoto (Pixelprüfung im Fotobereich), der Hinweis verschwindet und fehlt in Prüfansicht
// und Fertigungsdatei. Desktop (Maus) und Handy 390×844 (Touch). Lokaler Prüfstand, keine Live-Systeme.
//   node app/configurator/variant-m/server.mjs --port=8961   (separates Terminal)
//   node scripts/check-photo-upload.mjs http://127.0.0.1:8961 [ausgabeordner]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const base=(process.argv[2]||'http://127.0.0.1:8961').replace(/\/$/,'');
const out=path.resolve(process.argv[3]||'deliverables/konfi-neu-foto-laden');
fs.mkdirSync(out,{recursive:true});
const playwright=(()=>{for(const candidate of ['playwright','/opt/npm-tools/node_modules/playwright/index.js']){try{return require(candidate);}catch{}}throw Error('Playwright nicht gefunden.');})();
const executablePath=['/opt/pw-browsers/chromium'].find(p=>fs.existsSync(p));

// ---- PNG ohne Abhängigkeiten (Testbild erzeugen, Bildschirmfoto lesen) ----
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc32=buf=>{let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
function encodePng(width,height,pixel){
  const raw=Buffer.alloc((width*3+1)*height);
  for(let y=0;y<height;y++){raw[y*(width*3+1)]=0;for(let x=0;x<width;x++){const [r,g,b]=pixel(x,y),i=y*(width*3+1)+1+x*3;raw[i]=r;raw[i+1]=g;raw[i+2]=b;}}
  const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(td));return Buffer.concat([len,td,crc]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
function decodePng(buf){
  let pos=8,width,height,type,idat=[];
  while(pos<buf.length){const len=buf.readUInt32BE(pos),t=buf.toString('ascii',pos+4,pos+8),data=buf.subarray(pos+8,pos+8+len);pos+=12+len;
    if(t==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);type=data[9];if(data[8]!==8||data[12]!==0)throw Error('PNG-Format nicht unterstützt');}
    if(t==='IDAT')idat.push(data);if(t==='IEND')break;}
  const bpp=type===6?4:type===2?3:null;if(!bpp)throw Error('PNG-Farbtyp nicht unterstützt: '+type);
  const raw=zlib.inflateSync(Buffer.concat(idat)),stride=width*bpp,px=Buffer.alloc(stride*height);
  for(let y=0;y<height;y++){const f=raw[y*(stride+1)],line=raw.subarray(y*(stride+1)+1,(y+1)*(stride+1));
    for(let x=0;x<stride;x++){const a=x>=bpp?px[y*stride+x-bpp]:0,b=y?px[(y-1)*stride+x]:0,c=x>=bpp&&y?px[(y-1)*stride+x-bpp]:0;let v=line[x];
      if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
      px[y*stride+x]=v&255;}}
  return {width,height,bpp,px};
}
// Testbilder: zwei kräftige Farbflächen, im Beispielfoto (Paar am See) nicht vorhanden.
const IMAGE_A={name:'kundenfoto-a.png',colors:[[226,32,138],[18,158,150]]};
const IMAGE_B={name:'kundenfoto-b.png',colors:[[245,140,20],[34,62,205]]};
for(const image of [IMAGE_A,IMAGE_B])image.buffer=encodePng(1200,900,x=>x<600?image.colors[0]:image.colors[1]);
const asUpload=image=>({name:image.name,mimeType:'image/png',buffer:image.buffer});
function colorShare(png,colors){
  let hit=0,all=0;
  for(let i=0;i<png.px.length;i+=png.bpp){all++;const [r,g,b]=[png.px[i],png.px[i+1],png.px[i+2]];if(colors.some(([cr,cg,cb])=>Math.abs(r-cr)+Math.abs(g-cg)+Math.abs(b-cb)<60))hit++;}
  return all?hit/all:0;
}

const report={base,checks:[],scenarios:{}};
let failed=0;
const check=(name,ok,detail='')=>{report.checks.push({name,ok:!!ok,detail:String(detail).slice(0,400)});if(!ok){failed++;console.error('FEHLER',name,detail);}else console.log('ok  ',name);};

const DESKTOP={viewport:{width:1280,height:900},locale:'de-DE'};
const MOBILE={viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'de-DE'};
async function open(browser,device,{throttle=false,waitReady=true}={}){
  const context=await browser.newContext(device);const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Abfangen der Dateiauswahl sofort einschalten: Playwright schaltet es sonst erst beim ersten waitForEvent
  // ohne Rückmeldung ein, ein schneller Klick kann davor liegen (Messfehler, kein Editorfehler).
  page.on('filechooser',()=>{});
  if(throttle){const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:20e6/8,uploadThroughput:20e6/8});}
  await page.goto(base+'/?model=acryl');
  const frame=await (await page.waitForSelector('#editor iframe',{timeout:60000})).contentFrame();
  // Fotobereich ist auf der Platte gezeichnet (frühester Zeitpunkt, zu dem ein Kunde tippen kann).
  await frame.waitForFunction(()=>!!document.querySelector('gravuru-configurator')?.shadowRoot?.querySelector('.scene [data-ux-empty-photo-slot]'),null,{timeout:60000,polling:20});
  if(waitReady){await frame.waitForFunction(()=>document.querySelector('gravuru-configurator')?.dataset.uxNeutral==='true',null,{timeout:60000});await page.waitForTimeout(600);}
  const offset=await (await page.$('#editor iframe')).boundingBox();
  const evaluate=(fn,arg)=>frame.evaluate(({src,arg})=>{const el=document.querySelector('gravuru-configurator');return (new Function('el','r','arg','return ('+src+')(el,r,arg)'))(el,el.shadowRoot,arg);},{src:fn.toString(),arg});
  const box=async selector=>{const b=await evaluate((el,r,sel)=>{const n=[...r.querySelectorAll(sel)].find(n=>{const c=n.getBoundingClientRect();return c.width>0&&c.height>0;});if(!n)return null;const c=n.getBoundingClientRect();return {x:c.x,y:c.y,w:c.width,h:c.height};},selector);return b&&{x:b.x+offset.x,y:b.y+offset.y,w:b.w,h:b.h};};
  const tap=async(x,y)=>device.hasTouch?page.touchscreen.tap(x,y):page.mouse.click(x,y);
  return {context,page,frame,errors,evaluate,box,tap,device};
}
// Tipp auslösen und die Dateiauswahl abfangen; liefert Angaben zum Eingabefeld.
async function choose(s,act,file){
  const chooser=s.page.waitForEvent('filechooser',{timeout:4000}).catch(()=>null);
  await act();
  const c=await chooser;if(!c)return null;
  const input=await c.element().evaluate(e=>({accept:e.accept,capture:e.hasAttribute('capture'),multiple:e.multiple}));
  await c.setFiles(file);
  return input;
}
const photoState=s=>s.evaluate(el=>{const o=el.state.objects.find(o=>o.id==='photo-main');const g=el.shadowRoot.querySelector('.scene [data-object="photo-main"]');return {uploadId:o?.uxUploadId||null,blob:!!g?.querySelector('image[href^="blob:"]'),hint:!!g?.querySelector('[data-ux-photo-hint],[data-role="guide"]'),hintText:/Hier tippen|Beispielfoto ersetzen/.test(g?.textContent||''),status:el.shadowRoot.querySelector('[data-ux-status]')?.textContent||''};});
const waitPhoto=s=>s.frame.waitForFunction(()=>{const el=document.querySelector('gravuru-configurator');const g=el.shadowRoot.querySelector('.scene [data-object="photo-main"]');return !!el.state.objects.find(o=>o.id==='photo-main')?.uxUploadId&&!!g?.querySelector('image[href^="blob:"]');},null,{timeout:20000}).then(()=>true).catch(()=>false);
async function photoPixels(s,image){
  await s.page.waitForTimeout(400);
  const b=await s.box('.scene [data-object="photo-main"] > rect[fill="transparent"]')||await s.box('.scene [data-object="photo-main"]');
  // Innere Fläche ohne Rand; das Testbild füllt den Bereich (preserveAspectRatio slice).
  const clip={x:b.x+b.w*.12,y:b.y+b.h*.12,width:b.w*.76,height:b.h*.76};
  const png=decodePng(await s.page.screenshot({clip}));
  return colorShare(png,image.colors);
}
const acceptOk=input=>!!input&&input.accept.split(',').includes('image/jpeg')&&!input.capture;
const hintBox=s=>s.box('.scene [data-object="photo-main"] [data-ux-photo-hint]');
const slotBox=s=>s.box('.scene [data-object="photo-main"] > rect[fill="transparent"]');

async function scenarioEarly(browser,device,label){
  const s=await open(browser,device,{throttle:true,waitReady:false});
  try{
    const ready=await s.evaluate(el=>!!el.uxPhotoTapReady);
    const b=await slotBox(s);
    // Mitte des Fotobereichs: dort liegt der feste Rahmen (photo-frame) darüber.
    const input=await choose(s,()=>s.tap(b.x+b.w/2,b.y+b.h*.45),asUpload(IMAGE_A));
    check(`${label}: früher Tipp (Oberfläche ${ready?'bereit':'lädt noch'}) öffnet die Dateiauswahl`,!!input);
    check(`${label}: früher Tipp – Dateiauswahl erlaubt Galerie (accept JPG, kein capture)`,acceptOk(input),JSON.stringify(input));
    const shown=await waitPhoto(s);
    check(`${label}: früher Tipp – Foto erscheint nach dem Laden im Fotobereich`,shown,JSON.stringify(await photoState(s)));
    if(shown){await s.frame.waitForFunction(()=>document.querySelector('gravuru-configurator')?.dataset.uxNeutral==='true',null,{timeout:60000});const share=await photoPixels(s,IMAGE_A);check(`${label}: früher Tipp – Pixel im Fotobereich stammen vom Kundenfoto`,share>.6,share.toFixed(2));}
    report.scenarios[label+' früh']={uiReadyAtTap:ready};
    check(`${label}: früher Tipp – keine Skriptfehler`,!s.errors.length,s.errors.join(' | '));
  }finally{await s.context.close();}
}

async function scenarioHint(browser,device,label){
  const s=await open(browser,device);
  try{
    const h=await hintBox(s);check(`${label}: Fotohinweis auf der Platte sichtbar`,!!h);
    const input=await choose(s,()=>s.tap(h.x+h.w/2,h.y+h.h/2),asUpload(IMAGE_A));
    check(`${label}: Tipp auf den Fotohinweis öffnet die Dateiauswahl`,!!input);
    check(`${label}: Dateiauswahl erlaubt Galerie (accept JPG, kein capture)`,acceptOk(input),JSON.stringify(input));
    check(`${label}: gewähltes Bild ersetzt das Beispielfoto`,await waitPhoto(s),JSON.stringify(await photoState(s)));
    const share=await photoPixels(s,IMAGE_A);check(`${label}: Pixel im Fotobereich stammen vom Kundenfoto`,share>.6,share.toFixed(2));
    const state=await photoState(s);check(`${label}: Fotohinweis nach dem Upload verschwunden`,!state.hint&&!state.hintText,JSON.stringify(state));
    // Fertigungsdatei: kein Hinweis, Kundenfoto eingebettet.
    const exported=await s.evaluate(async el=>{const p=await el.acrylicExportPayload();return {hint:/Hier tippen|Beispielfoto ersetzen|data-preview-only|data-ux-photo-hint/.test(p.svg),photo:/data:image\/png;base64,/.test(p.svg),reference:/reference\.(webp|png)/.test(p.svg)};});
    check(`${label}: Fertigungsdatei ohne Hinweis, mit Kundenfoto statt Beispielfoto`,!exported.hint&&exported.photo&&!exported.reference,JSON.stringify(exported));
    if(device===MOBILE)await s.page.screenshot({path:path.join(out,'handy-foto-auf-platte.png')});
    // Foto ersetzen (zweites Bild): Auf der Platte verschiebt ein Tipp/Ziehen das eigene Foto; ersetzt wird über „Ersetzen“.
    if(device===MOBILE)await s.evaluate((el,r)=>r.querySelector('[data-ux=mobile-step][data-step=media]').click());else await s.evaluate((el,r)=>r.querySelector('#ux-tab-upload').click());
    await s.page.waitForTimeout(400);await s.evaluate((el,r)=>r.querySelector('[data-ux=replace-upload]')?.scrollIntoView({block:'center'}));await s.page.waitForTimeout(400);
    const rb=await s.box('[data-ux=replace-upload]');
    const again=rb&&await choose(s,()=>s.tap(rb.x+rb.w/2,rb.y+rb.h/2),asUpload(IMAGE_B));
    check(`${label}: „Ersetzen“ öffnet die Dateiauswahl`,!!again&&acceptOk(again),JSON.stringify(again));
    if(again){await s.page.waitForTimeout(800);if(device===MOBILE){await s.evaluate(()=>window.scrollTo(0,0));}const share2=await photoPixels(s,IMAGE_B);check(`${label}: ersetztes Foto erscheint im Fotobereich`,share2>.6,share2.toFixed(2));}
    // Prüfansicht mit Kundenfoto.
    if(device===MOBILE){
      await s.evaluate((el,r)=>r.querySelector('[data-ux=mobile-step][data-step=review]').click());await s.page.waitForTimeout(600);
      const review=await s.evaluate((el,r)=>{const scene=r.querySelector('.scene');return {step:el.uxMobileSteps?.current,hint:!!scene.querySelector('[data-ux-photo-hint]')||/Hier tippen/.test(scene.textContent),photo:!!scene.querySelector('[data-object="photo-main"] image[href^="blob:"]')};});
      check(`${label}: Prüfen-Schritt zeigt Kundenfoto ohne Hinweis`,review.step==='review'&&!review.hint&&review.photo,JSON.stringify(review));
      await s.page.screenshot({path:path.join(out,'handy-pruefen-kundenfoto.png')});
    }
    const opened=await s.evaluate((el,r)=>{const b=r.querySelector('.completion-finish');if(!b)return false;b.click();return true;});
    await s.page.waitForTimeout(700);
    const art=await s.evaluate((el,r)=>{const d=r.querySelector('.ux-completion-dialog');const a=r.querySelector('[data-review-art]');return {open:!!d?.open,hint:!!a?.querySelector('[data-ux-photo-hint]')||/Hier tippen|Beispielfoto ersetzen/.test(a?.textContent||''),photo:!!a?.querySelector('image[href^="blob:"]')};});
    check(`${label}: Prüfansicht zeigt Kundenfoto ohne Fotohinweis`,opened&&art.open&&!art.hint&&art.photo,JSON.stringify(art));
    await s.page.screenshot({path:path.join(out,(device===MOBILE?'handy':'desktop')+'-pruefansicht-kundenfoto.png')});
    check(`${label}: keine Skriptfehler`,!s.errors.length,s.errors.join(' | '));
  }finally{await s.context.close();}
}

async function scenarioButton(browser,device,label,selector,buttonLabel){
  const s=await open(browser,device);
  try{
    if(device===MOBILE)await s.evaluate((el,r)=>r.querySelector('[data-ux=mobile-step][data-step=media]').click());
    else await s.evaluate((el,r)=>r.querySelector('#ux-tab-upload').click());
    await s.page.waitForTimeout(500);
    await s.evaluate((el,r,sel)=>r.querySelector(sel)?.scrollIntoView({block:'center'}),selector);await s.page.waitForTimeout(400);
    const b=await s.box(selector);
    const look=await s.evaluate((el,r,sel)=>{const n=r.querySelector(sel);if(!n)return null;const st=getComputedStyle(n);return {color:st.color,background:st.backgroundColor,opacity:st.opacity,disabled:n.disabled};},selector);
    const top=b&&await s.evaluate((el,r,arg)=>{const t=r.elementFromPoint(arg.x,arg.y);return !!t?.closest(arg.sel);},{x:b.x+b.w/2-(await (await s.page.$('#editor iframe')).boundingBox()).x,y:b.y+b.h/2-(await (await s.page.$('#editor iframe')).boundingBox()).y,sel:selector});
    check(`${label}: „${buttonLabel}“ sichtbar und nicht verdeckt`,!!b&&top,JSON.stringify({b,top}));
    const input=b&&await choose(s,()=>s.tap(b.x+b.w/2,b.y+b.h/2),asUpload(IMAGE_A));
    check(`${label}: „${buttonLabel}“ öffnet die Dateiauswahl`,!!input&&acceptOk(input),JSON.stringify(input));
    check(`${label}: „${buttonLabel}“ – Bild erscheint im Fotobereich`,await waitPhoto(s),JSON.stringify(await photoState(s)));
    report.scenarios[label+' '+buttonLabel]=look;
    if(selector==='[data-ux=choose-upload]'){const rgb=s=>s.match(/\d+/g).map(Number);const [fr,fg,fb]=rgb(look.color),[br,bg,bb]=rgb(look.background);const lum=(r,g,b)=>.2126*r+.7152*g+.0722*b;check(`${label}: „${buttonLabel}“ gut lesbar (helle Schrift auf dunklem Grund)`,lum(fr,fg,fb)-lum(br,bg,bb)>120&&look.opacity==='1',JSON.stringify(look));}
    check(`${label}: „${buttonLabel}“ – keine Skriptfehler`,!s.errors.length,s.errors.join(' | '));
  }finally{await s.context.close();}
}

async function scenarioHeic(browser,device,label){
  const s=await open(browser,device);
  try{
    const h=await hintBox(s);
    // Nicht dekodierbare HEIC-Datei (Chromium liest HEIC nicht): klare Meldung, Beispielfoto bleibt.
    const input=await choose(s,()=>s.tap(h.x+h.w/2,h.y+h.h/2),{name:'IMG_0420.HEIC',mimeType:'image/heic',buffer:Buffer.from('0000001c6674797068656963000000006d696631686569636d696166','hex')});
    await s.page.waitForTimeout(800);
    const state=await photoState(s);
    check(`${label}: HEIC wird nicht stillschweigend abgewiesen, sondern verständlich gemeldet`,!!input&&!state.uploadId&&/HEIC/.test(state.status)&&/JPG/.test(state.status),JSON.stringify(state));
  }finally{await s.context.close();}
}

const browser=await playwright.chromium.launch({executablePath});
try{
  for(const [device,label] of [[DESKTOP,'Desktop'],[MOBILE,'Handy']]){
    await scenarioEarly(browser,device,label);
    await scenarioHint(browser,device,label);
    await scenarioButton(browser,device,label,'[data-ux=choose-upload]','Dateien auswählen');
    await scenarioButton(browser,device,label,'[data-ux=fill-photo-slot]','Foto für diesen Platzhalter hochladen');
    await scenarioHeic(browser,device,label);
  }
}finally{await browser.close();}
report.result=failed?'FAIL':'PASS';
fs.writeFileSync(path.join(out,'foto-upload-report.json'),JSON.stringify(report,null,1));
console.log(JSON.stringify({result:report.result,checks:report.checks.length,failed,out}));
process.exit(failed?1:0);
