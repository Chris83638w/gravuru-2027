// Claude · 20.11.2026 · Acryl-Schild 12 × 8: Passen die Design-Teile (Stufe 2) auch hier? Nur lesend.
// Holt über den bestehenden Weg (ganzes Modell je Design) Modelle aus dem echten Shop und rechnet lokal Fingerabdruck und Teile.
import {createRequire} from 'node:module';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const HANDLE=process.argv[2]||'familienschild-acryl-baum-12x8-personalisiert',QUELLE=process.env.QUELLE||'/home/claude/work/prioD',ANZAHL=Number(process.argv[3]||40);
const {shopDesignParts,shopDesignBase}=await import(pathToFileURL(QUELLE+'/app/workshop/shop-start-model.mjs'));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext({viewport:{width:1366,height:900},locale:'de-DE'});const page=await ctx.newPage();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
await page.goto('https://gravuru-design.myshopify.com/products/'+HANDLE,{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForSelector('a[data-gravuru-start]',{timeout:90000});await sleep(6000);await page.click('a[data-gravuru-start]');
const s0=Date.now();while(Date.now()-s0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready'))break;await sleep(100);}
await sleep(1500);
const shop=page.frames().find(f=>{try{return /\/konfigurator\/shop\/?$/.test(new URL(f.url()).pathname);}catch{return false;}});
if(!shop){console.log('Shop-Rahmen fehlt',page.frames().map(f=>f.url().slice(0,90)));process.exit(1);}
const api=await shop.evaluate(()=>Object.keys(window.GravuruShopEntry?.designGallery||{}));
const seiten=[];for(let p=1;p<=6;p++){const r=await shop.evaluate(async p=>{try{const r=await window.GravuruShopEntry.designGallery.load(p);return {total:r.total,more:r.more??r.hasMore??null,ids:r.items.map(i=>i.designId),schluessel:Object.keys(r).filter(k=>k!=='items')};}catch(e){return {fehler:String(e.message)};}},p);seiten.push(r);if(r.fehler||!r.ids?.length)break;}
const alle=seiten.flatMap(s=>s.ids||[]);const wahl=[...new Set([...alle.slice(0,ANZAHL),...alle.filter((_,i)=>i>=ANZAHL&&i%20===0)])];
const start=await shop.evaluate(()=>{const e=window.GravuruShopEntry;return null;});
const ergebnis=[],schriften=new Map(),motive=new Set();let basis0=null,fehler=0;
for(let at=0;at<wahl.length;at+=4){
 const teil=wahl.slice(at,at+4);
 const geholt=await shop.evaluate(async ids=>Promise.all(ids.map(async id=>{try{const r=await window.GravuruShopEntry.designGallery.loadDesign(id);return {id,universal:r.universal};}catch(e){return {id,fehler:String(e.message)};}})),teil);
 for(const g of geholt){
  if(g.fehler){fehler++;ergebnis.push({id:g.id,fehler:g.fehler});continue;}
  const u=g.universal,basis=shopDesignBase(u),teile=shopDesignParts(u);basis0??=basis;
  const d=u.profile.designs[0];for(const o of d.objects||[]){if(o.type==='text'&&o.font)schriften.set(o.font,(schriften.get(o.font)||0)+1);if(o.type==='motif')motive.add(o.motif);}
  ergebnis.push({id:g.id,gleicherRest:basis===basis0,teileKB:Math.round(JSON.stringify(teile).length/102.4)/10,modellKB:Math.round(JSON.stringify(u).length/1024),objekte:(d.objects||[]).map(o=>o.type).join(','),foto:(d.objects||[]).some(o=>o.type==='photo'||o.media),fotoBeispiele:u.localResources?.photoExamples?.length||0,hinweise:u.photo?.hints?.length||0,fixedSize:u.familyFormats?.fixedSize,formate:u.familyFormats?.formats?.length,designIds:u.familyFormats?.formats?.map(f=>f.variants.map(v=>v.designIds.length))});
 }
}
fs.writeFileSync('acryl/teile-'+HANDLE.slice(0,24)+'.json',JSON.stringify({api,seiten:seiten.map(s=>({...s,ids:s.ids?.length})),ergebnis},null,1));
const gut=ergebnis.filter(e=>e.gleicherRest);
console.log(JSON.stringify({api,seiten:seiten.map(s=>({total:s.total,ids:s.ids?.length,fehler:s.fehler,schluessel:s.schluessel})),designsGesamt:alle.length,geprueft:ergebnis.length,fehler,gleicherRest:gut.length,abweichend:ergebnis.filter(e=>e.gleicherRest===false).map(e=>e.id+(e.foto?' (Foto)':'')).slice(0,12),teileKBSumme:Math.round(gut.reduce((s,e)=>s+e.teileKB,0)),teileKBje:[Math.min(...gut.map(e=>e.teileKB)),Math.max(...gut.map(e=>e.teileKB))],schriftenErsteSeite:schriften.size,motive:motive.size,beispiel:ergebnis[0]}));
await browser.close();
