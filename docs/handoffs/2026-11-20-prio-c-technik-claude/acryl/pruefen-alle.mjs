// Claude · 20.11.2026 · Welche Designs eines Produkts besteht die Prüfung des Editors nicht (und führen heute in eine Sackgasse)?
// Nur lesend: holt je Design das Modell über den bestehenden Weg (höchstens drei gleichzeitig) und prüft es lokal mit prepareConfig.
import {createRequire} from 'node:module';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const HANDLE=process.argv[2],NUR=process.argv[3]?process.argv[3].split(','):null,QUELLE=process.env.QUELLE||'/home/claude/work/prioD';
const {prepareConfig}=await import(pathToFileURL(QUELLE+'/app/configurator/variant-m/contract.mjs'));
const {shopDesignBase}=await import(pathToFileURL(QUELLE+'/app/workshop/shop-start-model.mjs'));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext({viewport:{width:1366,height:900},locale:'de-DE'});const page=await ctx.newPage();const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
await page.goto('https://gravuru-design.myshopify.com/products/'+HANDLE,{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForSelector('a[data-gravuru-start]',{timeout:90000});await sleep(5000);await page.click('a[data-gravuru-start]');
const s0=Date.now();while(Date.now()-s0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready'))break;await sleep(100);}
await sleep(1500);
const shop=page.frames().find(f=>{try{return /\/konfigurator\/shop\/?$/.test(new URL(f.url()).pathname);}catch{return false;}});
const alle=[];for(let p=0;p<12;p++){const r=await shop.evaluate(async p=>{try{const r=await window.GravuruShopEntry.designGallery.load(p,'all');return {total:r.total,items:r.items.map(i=>({id:i.designId,name:i.designName,aktuell:i.current})),next:r.nextPage};}catch(e){return {fehler:String(e.message)};}},p);if(r.fehler||!r.items?.length)break;alle.push(...r.items);if(r.next===null||r.next===undefined)break;}
const wahl=(NUR?alle.filter(a=>NUR.some(n=>a.id.endsWith('-'+n))):alle).filter(a=>a.aktuell);
const ergebnis=[];let basis=null;const abweichendeBasis=[];
for(let at=0;at<wahl.length;at+=3){
 const teil=wahl.slice(at,at+3);
 const geholt=await shop.evaluate(async ids=>Promise.all(ids.map(async id=>{for(let i=0;i<3;i++){try{const r=await window.GravuruShopEntry.designGallery.loadDesign(id);return {id,universal:r.universal};}catch(e){if(i===2)return {id,fehler:String(e.message)};await new Promise(r=>setTimeout(r,800));}}})),teil.map(t=>t.id));
 for(const g of geholt){const name=teil.find(t=>t.id===g.id).name;
  if(g.fehler){ergebnis.push({id:g.id,name,abruf:g.fehler});continue;}
  const b=shopDesignBase(g.universal);basis??=b;if(b!==basis)abweichendeBasis.push(g.id);
  try{prepareConfig(structuredClone(g.universal));}catch(e){const p=g.universal.profile,d=p.designs[0];ergebnis.push({id:g.id,name,pruefung:String(e.message).slice(0,160),flaeche:{breite:p.geometry.width,hoehe:p.geometry.height,rand:p.geometry.margin??p.margin??null,form:p.geometry.shape},objekte:d.objects.map(o=>({id:o.id,art:o.type,text:o.text,x:o.x,y:o.y,w:o.w,h:o.h,drehung:o.rotation||0,links:+(o.x-o.w/2).toFixed(2),rechts:+(o.x+o.w/2).toFixed(2),oben:+(o.y-o.h/2).toFixed(2),unten:+(o.y+o.h/2).toFixed(2)}))});}
 }
 if(at%30===0)process.stderr.write(at+' ');
}
const out={produkt:HANDLE,designsInDerAuswahl:alle.length,geprueft:wahl.length,nichtBestanden:ergebnis,restWeichtAb:abweichendeBasis};
fs.writeFileSync('acryl/pruefung-'+HANDLE.slice(0,28)+'.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,1));
await browser.close();
