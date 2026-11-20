// Claude · 20.11.2026 · nur lesend: Modelle aller Galerie-Designs des Edelstahl-Türschilds mit dem Startmodell vergleichen.
// Ziel: vollständige Liste der Stellen, an denen sich die Modelle je Design unterscheiden. Kein Speichern, kein Warenkorb.
import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const SHOP='https://gravuru-design.myshopify.com';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext({viewport:{width:1366,height:900},locale:'de-DE'});const page=await ctx.newPage();
let erste=null,kopf=null,adresse=null,galerie=null;
page.on('response',async r=>{const u=r.url();try{if(/\/api\/shop-entry\/model(\?|$)/.test(u)&&r.request().method()==='GET'&&!erste){erste=JSON.parse((await r.body()).toString('utf8'));kopf=r.request().headers();adresse=u.split('?')[0];}
  if(/\/api\/shop-entry\/design-gallery(\?|$)/.test(u)&&!galerie)galerie=JSON.parse((await r.body()).toString('utf8'));}catch{}});
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await page.goto(SHOP+'/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen',{waitUntil:'domcontentloaded',timeout:90000});await page.waitForSelector('[data-gravuru-personalisieren] a[data-gravuru-start]',{timeout:60000});await sleep(1200);
await page.click('[data-gravuru-personalisieren] a[data-gravuru-start]');
let t0=Date.now();while(Date.now()-t0<90000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready'))break;await sleep(100);}
await sleep(2500);
const ed=page.frames().filter(f=>{try{return new URL(f.url()).pathname==='/_merchant-acryl-editor.html'}catch{return false}}).at(-1);
await ed.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const b=all.filter(e=>e.matches('button,[role=tab]')).find(e=>((e.innerText||e.getAttribute('aria-label')||'').trim())==='Designs');b?.click();});
t0=Date.now();while(Date.now()-t0<30000&&!galerie)await sleep(200);
const fr=page.frames().find(f=>{try{return new URL(f.url()).pathname.startsWith('/konfigurator/shop')}catch{return false}});
const ids=(galerie?.items||[]).filter(i=>i.current).map(i=>({id:i.designId,name:i.designName}));
const key=e=>e&&typeof e==='object'?(e.id??e.key??e.assetId??e.name??null):null;
function diff(x,y,p,out){if(JSON.stringify(x)===JSON.stringify(y))return;
  if(Array.isArray(x)&&Array.isArray(y)){const kx=x.map(key),ky=y.map(key);if(kx.every(k=>k!==null)&&ky.every(k=>k!==null)){if(kx.some(k=>!ky.includes(k))||ky.some(k=>!kx.includes(k)))out.push([p,'Liste nach Kennung',ky.filter(k=>!kx.includes(k)).slice(0,3)]);for(const k of kx.filter(k=>ky.includes(k)))diff(x[kx.indexOf(k)],y[ky.indexOf(k)],p+'[*]',out);return;}out.push([p,'Liste',[x.length,y.length]]);return;}
  if(x&&y&&typeof x==='object'&&typeof y==='object'&&!Array.isArray(x)&&!Array.isArray(y)){for(const k of new Set([...Object.keys(x),...Object.keys(y)])){if(!(k in x))out.push([p+'.'+(/^katalog-/.test(k)?'<design>':k),'nur im Zielmodell']);else if(!(k in y))out.push([p+'.'+(/^katalog-/.test(k)?'<design>':k),'nur im Startmodell']);else diff(x[k],y[k],p+'.'+(/^katalog-/.test(k)?'<design>':k),out);}return;}
  out.push([p,'Wert']);}
const res={zeit:new Date().toISOString(),designs:ids.length,start:erste?.model?.universal?.profile?.defaultDesignId,stellen:{},jeDesign:[]};
for(const d of ids){ if(d.id===res.start)continue;
  const r=await fr.evaluate(async({adresse,kopf,id})=>{const h={};for(const [k,v] of Object.entries(kopf))if(/^(x-gravuru|accept$)/i.test(k))h[k]=v;const r=await fetch(adresse+'?design='+encodeURIComponent(id),{credentials:'omit',cache:'no-store',headers:h});return {status:r.status,text:await r.text()};},{adresse,kopf,id:d.id});
  if(r.status!==200){res.jeDesign.push({...d,status:r.status});await sleep(400);continue;}
  const b=JSON.parse(r.text),out=[];diff(erste.model,b.model,'',out);const eigene=new Set(out.map(o=>o[0]+' | '+o[1]));for(const s of eigene)res.stellen[s]=(res.stellen[s]||0)+1;
  const u=b.model.universal,lr=u.localResources||{},dz=u.profile.designs.find(x=>x.id===d.id);
  res.jeDesign.push({...d,status:200,bytes:r.text.length,objekte:(dz?.objects||[]).map(o=>o.type+(o.motif?':'+o.motif:'')+(o.assetId?':asset':'')).join(','),motive:(lr.motifs||[]).map(m=>m.key),rasters:(lr.rasters||[]).length,fonts:Object.keys(lr.fonts||{}).length,lazyFonts:(lr.lazyFonts||[]).length,fotoPlatzhalter:(lr.photoPlaceholders||[]).length});
  await sleep(350);}
fs.writeFileSync(process.env.OUT+'/alle-designs.json',JSON.stringify(res,null,1));
console.log('Designs',res.designs,'| Start',res.start);for(const [s,n] of Object.entries(res.stellen).sort((a,b)=>b[1]-a[1]))console.log(String(n).padStart(3),'×',s);
console.log('--- Designs mit Motiv oder Besonderheit ---');for(const d of res.jeDesign)if(d.status!==200||/motif|raster|photo|asset/.test(d.objekte)||d.motive?.length||d.rasters)console.log(d.id.replace('katalog-TAE-V2A-8x5-',''),'|',d.name.slice(0,34),'|',d.status,'|',d.objekte,'| Motive im Modell',d.motive?.length,'| Raster',d.rasters);
await browser.close();
