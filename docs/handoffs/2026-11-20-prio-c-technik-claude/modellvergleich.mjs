// Claude · 20.11.2026 · nur lesend: Modell des Startdesigns und eines zweiten Designs desselben Produkts abrufen und die Unterschiede auflisten.
import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const SHOP='https://gravuru-design.myshopify.com',URL0=SHOP+'/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen';
const zweite=process.argv[2]||'katalog-TAE-V2A-8x5-D2';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext({viewport:{width:1366,height:900},locale:'de-DE'});const page=await ctx.newPage();
let erste=null,kopf=null,adresse=null;
page.on('response',async r=>{if(/\/api\/shop-entry\/model(\?|$)/.test(r.url())&&r.request().method()==='GET'&&!erste){try{erste=JSON.parse((await r.body()).toString('utf8'));kopf=r.request().headers();adresse=r.url().split('?')[0];}catch{}}});
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
await page.goto(URL0,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForSelector('[data-gravuru-personalisieren] a[data-gravuru-start]',{timeout:60000});
await new Promise(r=>setTimeout(r,1200));await page.click('[data-gravuru-personalisieren] a[data-gravuru-start]');
const t0=Date.now();while(Date.now()-t0<90000&&!erste)await new Promise(r=>setTimeout(r,200));
await new Promise(r=>setTimeout(r,3000));
const fr=page.frames().find(f=>{try{return new URL(f.url()).pathname.startsWith('/konfigurator/shop')}catch{return false}});
const t1=Date.now();
const zweit=await fr.evaluate(async({adresse,kopf,zweite})=>{const h={};for(const [k,v] of Object.entries(kopf))if(/^(authorization|x-gravuru|accept$)/i.test(k))h[k]=v;const r=await fetch(adresse+'?design='+encodeURIComponent(zweite),{credentials:'omit',cache:'no-store',headers:h});const t=await r.text();return {status:r.status,bytes:t.length,text:t};},{adresse,kopf,zweite});
const dauer=Date.now()-t1;
const out={zeit:new Date().toISOString(),zweite,status:zweit.status,bytesErste:JSON.stringify(erste).length,bytesZweite:zweit.bytes,abrufMs:dauer,kopfzeilen:Object.keys(kopf).filter(k=>/^(authorization|x-gravuru)/i.test(k))};
if(zweit.status===200){const b=JSON.parse(zweit.text);const diffs=[];
  const walk=(x,y,p)=>{if(diffs.length>400)return;if(JSON.stringify(x)===JSON.stringify(y))return;
    if(Array.isArray(x)&&Array.isArray(y)){const key=e=>e&&typeof e==='object'?(e.id??e.key??e.assetId??e.name??null):null;const kx=x.map(key),ky=y.map(key);
      if(kx.every(k=>k!==null)&&ky.every(k=>k!==null)){const nurA=kx.filter(k=>!ky.includes(k)),nurB=ky.filter(k=>!kx.includes(k));if(nurA.length||nurB.length)diffs.push({pfad:p,art:'Liste nach Kennung',nurErste:nurA.slice(0,6),nurZweite:nurB.slice(0,6),laengen:[x.length,y.length]});for(const k of kx.filter(k=>ky.includes(k)))walk(x[kx.indexOf(k)],y[ky.indexOf(k)],p+'['+k+']');return;}
      diffs.push({pfad:p,art:'Liste',laengen:[x.length,y.length],bytes:[JSON.stringify(x).length,JSON.stringify(y).length]});return;}
    if(x&&y&&typeof x==='object'&&typeof y==='object'&&!Array.isArray(x)&&!Array.isArray(y)){const ks=new Set([...Object.keys(x),...Object.keys(y)]);for(const k of ks){if(!(k in x))diffs.push({pfad:p+'.'+k,art:'nur im zweiten',bytes:JSON.stringify(y[k]).length});else if(!(k in y))diffs.push({pfad:p+'.'+k,art:'nur im ersten',bytes:JSON.stringify(x[k]).length});else walk(x[k],y[k],p+'.'+k);}return;}
    diffs.push({pfad:p,art:'Wert',erste:JSON.stringify(x)?.slice(0,70),zweite:JSON.stringify(y)?.slice(0,70)});};
  walk(erste,b,'');out.unterschiede=diffs;out.groessen=Object.fromEntries(Object.entries(b.model.universal).map(([k,v])=>[k,JSON.stringify(v).length]).sort((a,b)=>b[1]-a[1]).slice(0,12));
  fs.writeFileSync(process.env.OUT+'/modell-zweites-design.json',JSON.stringify({universal:b.model.universal,legacy:b.model.legacy},null,0));fs.writeFileSync(process.env.OUT+'/modell-erstes-design.json',JSON.stringify({universal:erste.model.universal,legacy:erste.model.legacy},null,0));}
fs.writeFileSync(process.env.OUT+'/modellvergleich.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,1).slice(0,5200));await browser.close();
