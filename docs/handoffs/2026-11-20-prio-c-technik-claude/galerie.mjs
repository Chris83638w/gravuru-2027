// Claude · 20.11.2026 · nur lesend: Editor öffnen, Reiter „Designs“ öffnen, Modell- und Galerieantwort auswerten.
// Kein Speichern, kein Warenkorb, keine Bestellung. Aufruf: node galerie.mjs <ring|edelstahl> [mobil]
import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const [,,ziel,profil='pc']=process.argv;const SHOP='https://gravuru-design.myshopify.com';
const URLS={ring:SHOP+'/products/klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert',edelstahl:SHOP+'/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen'};
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext(profil==='mobil'?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE'}:{viewport:{width:1366,height:900},locale:'de-DE'});
const page=await ctx.newPage();const res={ziel,profil,zeit:new Date().toISOString(),modell:[],galerie:[],wechsel:[]};
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
page.on('response',async r=>{const u=r.url();try{
  if(/\/api\/shop-entry\/model/.test(u)&&r.request().method()!=='OPTIONS'){const b=await r.body();const j=JSON.parse(b.toString('utf8'));const p=j.model?.universal?.profile||{};
    res.modell.push({bytes:b.length,status:r.status(),produkt:j.model?.configuration,defaultDesignId:p.defaultDesignId,designsImModell:(p.designs||[]).length,designIds:(p.designs||[]).map(d=>d.id).slice(0,60),bindung:j.binding?{productId:j.binding.productId,productRevision:j.binding.productRevision,variante:String(j.binding.shopifyVariantId||'').split('/').pop()}:null,schluessel:Object.keys(j)});}
  if(/\/api\/shop-entry\/design-gallery(\?|$)/.test(u)){const b=await r.body();const j=JSON.parse(b.toString('utf8'));const it=j.items||[];
    res.galerie.push({bytes:b.length,status:r.status(),anfrage:(r.request().postData()||'').slice(0,200),karten:it.length,total:j.total,current:it.filter(i=>i.current).length,produkte:[...new Set(it.map(i=>i.productId+'@'+i.productRevision))],varianten:[...new Set(it.map(i=>String(i.shopifyVariantId||'').split('/').pop()))],beispiel:it.slice(0,3).map(i=>({designId:i.designId,name:i.designName,current:i.current,productId:i.productId,rev:i.productRevision,masse:i.widthMm+'x'+i.heightMm})),alleDesignIds:it.map(i=>i.designId)});}
  if(/\/api\/shop-entry\/design-switch/.test(u))res.wechsel.push({status:r.status()});
}catch(e){res.fehler=(res.fehler||[]).concat(String(e.message).slice(0,120));}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
  await page.goto(URLS[ziel],{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForSelector('[data-gravuru-personalisieren] a[data-gravuru-start]',{timeout:60000});await sleep(1200);
  await page.click('[data-gravuru-personalisieren] a[data-gravuru-start]');
  const t0=Date.now();let bereit=false;while(Date.now()-t0<90000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready')){bereit=true;break;}await sleep(100);}
  res.editorBereit=bereit;res.oeffnenMs=Date.now()-t0;await sleep(2500);
  const ed=page.frames().filter(f=>{try{return new URL(f.url()).pathname==='/_merchant-acryl-editor.html'&&!f.isDetached();}catch{return false;}}).at(-1);
  if(ed){
    res.designsGeklickt=await ed.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);
      const sicht=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>4&&r.height>4&&s.visibility!=='hidden'&&s.display!=='none';};
      const b=all.filter(e=>e.matches('button,[role=tab]')).filter(sicht).find(e=>((e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' '))==='Designs');if(b){b.click();return true;}return false;});
    await sleep(6000);
    res.karten=await ed.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);
      const lokal=all.filter(e=>e.matches('[data-c-design]')).length,galerie=all.filter(e=>e.matches('.ux-product-choose')).length,galerieLokal=all.filter(e=>e.matches('.ux-product-choose[data-product-design-id]')).length;
      const host=all.find(e=>e.tagName==='GRAVURU-CONFIGURATOR');return {lokaleKarten:lokal,galerieKarten:galerie,galerieKartenImGeraet:galerieLokal,aktuellesDesign:host?.state?.designId||null};});
    await page.screenshot({path:(process.env.OUT||'out')+'/galerie-'+ziel+'-'+profil+'.png'});
  }
}catch(e){res.abbruch=String(e.message).slice(0,200);}
fs.writeFileSync((process.env.OUT||'out')+'/galerie-'+ziel+'-'+profil+'.json',JSON.stringify(res,null,1));
const kurz={...res,modell:res.modell.map(m=>({...m,designIds:m.designIds.length+' Kennungen'})),galerie:res.galerie.map(g=>({...g,alleDesignIds:g.alleDesignIds.length+' Kennungen'}))};
console.log(JSON.stringify(kurz,null,1).slice(0,3200));await browser.close();
