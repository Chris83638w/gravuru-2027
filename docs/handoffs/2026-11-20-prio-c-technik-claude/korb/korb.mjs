// Claude · 20.11.2026 · Warenkorb-Prüfung im echten Shop mit ausdrücklicher Erlaubnis von Chris (14:37 Uhr: „du darfst alles. du hast von mir vollen zugriff“).
// Legt EINE Testgestaltung in den Warenkorb eines Wegwerf-Browsers. Keine Kasse, keine Bestellung, keine Zahlung.
// Aufruf: node korb.mjs <Produkt-Handle> <Kartennummer oder -1> <Name>
import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const [,,PRODUKT='tuerschild-edelstahl-form-und-groesse-selbst-waehlen',KARTE='2',NAME='Claudetest']=process.argv;
const kurz=process.env.KURZ||(PRODUKT.includes('ring')?'ring':'edelstahl'),OUT=process.env.OUT||'korb/';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext({viewport:{width:1366,height:900},locale:'de-DE'});const page=await ctx.newPage();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res={produkt:PRODUKT,zeit:new Date().toISOString(),anfragen:[],fehler:[],verlauf:[]};let t0=null;
const wichtig=/acrylic-drafts|theme-cart|\/cart\/data|\/cart\/claim|\/cart\/add|design-parts|\/api\/shop-entry\/model|checkout/;
page.on('requestfinished',async r=>{const u=r.url();if(t0===null||!wichtig.test(u))return;try{const resp=await r.response(),z=await r.sizes(),t=r.timing();
 res.anfragen.push({weg:new URL(u).pathname.replace(/[a-f0-9]{24,}/g,'…').slice(-48),m:r.method(),status:resp.status(),abMs:Date.now()-t0-Math.round(t.responseEnd),dauerMs:Math.round(t.responseEnd),wartenMs:Math.round(t.responseStart-t.requestStart),gesendetKb:Math.round((z.requestBodySize||0)/102.4)/10,empfangenKb:Math.round(z.responseBodySize/102.4)/10,serverTiming:(resp.headers()['server-timing']||'').slice(0,900)});}catch{}});
page.on('requestfailed',r=>{if(t0!==null&&wichtig.test(r.url()))res.fehler.push('Abruf fehlgeschlagen '+new URL(r.url()).pathname.slice(-40)+' '+(r.failure()?.errorText||''));});
page.on('pageerror',e=>res.fehler.push('Seitenfehler: '+String(e.message).slice(0,160)));
// Mit NEU_PAKET: Paket und neuer Server-Teil nur in meinem Browser ersetzt (acryl/nachbau.mjs). Der Warenkorb geht an den echten Server.
if(process.env.NEU_PAKET){const {nachbau}=await import('../acryl/nachbau.mjs');await nachbau(ctx,page,res);}
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
const editor=()=>page.frames().filter(f=>{try{return new URL(f.url()).pathname==='/_merchant-acryl-editor.html'&&!f.isDetached();}catch{return false;}}).at(-1);
const sicht=`const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const sicht=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>4&&r.height>4&&s.visibility!=='hidden'&&s.display!=='none';};`;
const knopf=(f,text)=>f.evaluate(new Function('text',sicht+`const b=all.filter(e=>e.matches('button,[role=tab]')).filter(sicht).find(e=>((e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' '))===text&&!e.disabled);if(b){b.click();return true;}return false;`),text);
const lage=f=>f.evaluate(new Function(sicht+`const el=document.querySelector('gravuru-configurator');return {design:el.state.designId,texte:el.state.objects.filter(o=>o.type==='text').map(o=>o.text),motive:el.state.objects.filter(o=>o.type==='motif').length,groesse:el.state.mOptions?.size||null,designsImGeraet:(el.uxSelectedProfile?.().designs||[]).length,karten:all.filter(e=>e.matches('.ux-product-choose')).length,dialoge:all.filter(e=>e.matches('dialog[open],[role=dialog],[role=alertdialog]')).filter(sicht).map(e=>(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,200)),meldung:all.filter(e=>e.matches('[role=status],[role=alert]')).filter(sicht).map(e=>(e.innerText||'').trim().slice(0,120)).filter(Boolean).slice(0,4),knoepfe:all.filter(e=>e.matches('button')).filter(sicht).map(e=>(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,30)).filter(Boolean).slice(0,40)};`));
try{
 await page.goto('https://gravuru-design.myshopify.com/products/'+PRODUKT,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForSelector('a[data-gravuru-start]',{timeout:90000});await sleep(6000);
 res.korbVorher=(await page.evaluate(()=>fetch('/cart.js').then(r=>r.json()))).item_count;
 await page.click('a[data-gravuru-start]');
 const s0=Date.now();while(Date.now()-s0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready'))break;await sleep(100);}
 res.bereitNachMs=Date.now()-s0;await sleep(3000);let f=editor();res.start=await lage(f);
 if(Number(KARTE)>=0){
  await knopf(f,'Designs');const w=Date.now();while(Date.now()-w<60000){const l=await lage(f);if(l.karten>Number(KARTE)&&l.designsImGeraet>=l.karten)break;await sleep(300);}
  res.vorWahl=await lage(f);
  const gewaehlt=await f.evaluate(new Function('i',sicht+`const k=all.filter(e=>e.matches('.ux-product-choose'))[i];if(!k)return null;k.click();return {id:k.dataset.productDesignId,name:k.getAttribute('aria-label')};`),Number(KARTE));
  res.gewaehlt=gewaehlt;await sleep(2500);
 }
 if(process.env.ALLE_TEXTE==='1')await f.evaluate(()=>{window.__alleTexte=true;});
 res.name=await f.evaluate(name=>{const el=document.querySelector('gravuru-configurator');const t=el.state.objects.filter(o=>o.type==='text');const o=t.find(x=>/^name$/.test(x.fieldKey||''))||t[0];if(!o)return null;el.record?.();const vorher=o.text;o.text=name;const weitere=[];if(window.__alleTexte){const ersatz=['Mustermann','Musterweg 1','2026'];let n=0;for(const x of t)if(x!==o){const alt=x.text;x.text=ersatz[n++%ersatz.length];weitere.push(alt+' → '+x.text);}}el.normalize?.();el.sync();return {feld:o.fieldKey||o.id,vorher,jetzt:o.text,weitere};},NAME);
 await sleep(1500);res.vorKorb=await lage(f);await page.screenshot({path:OUT+kurz+'-1-vor-warenkorb.png'});
 res.fertig=await knopf(f,'Fertig');await sleep(1200);
 res.klick=await knopf(f,'In den Warenkorb')?'In den Warenkorb':(await knopf(f,'Warenkorb')?'Warenkorb':false);await sleep(2000);await page.screenshot({path:OUT+kurz+'-1b-ueberblick.png'});
 t0=Date.now();res.bestaetigt=await knopf(f,'Jetzt in den Warenkorb');
 let korb=null;
 while(Date.now()-t0<150000){
  korb=await page.evaluate(()=>fetch('/cart.js',{credentials:'same-origin'}).then(r=>r.json())).catch(()=>null);
  if(korb&&korb.item_count>0){res.imKorbNachMs=Date.now()-t0;break;}
  const sek=Math.round((Date.now()-t0)/1000);
  if([3,8,20,45,90].includes(sek)){const fr=editor();const l=fr?await lage(fr).catch(()=>null):null;res.verlauf.push({sek,dialoge:l?.dialoge,meldung:l?.meldung,knoepfe:l?.knoepfe?.slice(0,14)});await page.screenshot({path:OUT+kurz+'-warten-'+sek+'.png'}).catch(()=>{});await sleep(1000);}
  await sleep(250);
 }
 await sleep(4000);await page.screenshot({path:OUT+kurz+'-2-nach-warenkorb.png'});
 korb=await page.evaluate(()=>fetch('/cart.js',{credentials:'same-origin'}).then(r=>r.json())).catch(()=>null);
 res.korb=korb&&{item_count:korb.item_count,total_price:korb.total_price,currency:korb.currency,items:korb.items.map(i=>({title:i.title,variant_title:i.variant_title,sku:i.sku,product_id:i.product_id,variant_id:i.variant_id,quantity:i.quantity,price:i.price,final_line_price:i.final_line_price,eigenschaften:Object.fromEntries(Object.entries(i.properties||{}).map(([k,v])=>[k,/^https?:/.test(String(v))?'[Adresse '+new URL(v).hostname+']':String(v).length>60?'['+String(v).length+' Zeichen]':v]))}))};
 const bildUrls=korb?korb.items.flatMap(i=>Object.entries(i.properties||{}).filter(([k,v])=>/^https:\/\//.test(String(v))&&/bild|image|Entwurf/i.test(k)).map(([k,v])=>[k,v])):[];
 res.bilder=[];for(const [k,v] of bildUrls){try{const r=await ctx.request.get(v);const b=await r.body();const ct=r.headers()['content-type']||'';const ext=/png/.test(ct)?'png':/webp/.test(ct)?'webp':/jpe?g/.test(ct)?'jpg':'bin';const datei=OUT+kurz+'-bild-'+k.replace(/\W/g,'')+'.'+ext;fs.writeFileSync(datei,b);res.bilder.push({eigenschaft:k,status:r.status(),typ:ct,bytes:b.length,datei});}catch(e){res.bilder.push({eigenschaft:k,fehler:String(e.message).slice(0,100)});}}
}catch(e){res.abbruch=String(e.message).slice(0,300);}
fs.writeFileSync(OUT+kurz+'-ergebnis.json',JSON.stringify(res,null,1));
console.log(JSON.stringify({bereitNachMs:res.bereitNachMs,gewaehlt:res.gewaehlt,name:res.name,vorKorb:res.vorKorb&&{design:res.vorKorb.design,texte:res.vorKorb.texte,motive:res.vorKorb.motive},klick:res.klick,imKorbNachMs:res.imKorbNachMs,korb:res.korb,bilder:res.bilder,verlauf:res.verlauf,fehler:res.fehler,abbruch:res.abbruch},null,1).slice(0,5000));
console.log('ANFRAGEN');for(const a of res.anfragen)console.log(String(a.abMs).padStart(6),String(a.dauerMs).padStart(6),a.m.padEnd(4),a.status,String(a.gesendetKb).padStart(7),String(a.empfangenKb).padStart(7),a.weg,'|',a.serverTiming.slice(0,330));
await browser.close();
