#!/usr/bin/env node
// Konfigurator gegenprüfen (Chris 27.10.2026: „wie kann ich den konfi im terminal gegenprüfen lassen?“).
// Öffnet die Produktseite im Shop mit einem unsichtbaren Chrome, klickt „Jetzt personalisieren“ (wie ein Kunde,
// ohne etwas zu kaufen) und misst: Zeit bis bedienbar, Größe der Produktdaten, Zwischenspeicher, Kaufknopf.
// Nichts wird gespeichert oder in den Warenkorb gelegt.
//
// Einmalig:   npm install --no-save playwright && npx playwright install chromium
// Messen:     node scripts/konfi-messen.cjs [Produkt-URL] [--handy]
//             --handy = Prozessor 4-fach gebremst (langsameres Handy)
const {chromium}=require('playwright');
const url=process.argv.slice(2).find(a=>a.startsWith('http'))||'https://gravuru-design.myshopify.com/products/tuerschild-abger-ecken-v2a-personalisiert-leuchtturm-12x8';
const handy=process.argv.includes('--handy');
const s=ms=>ms==null?'–':(ms/1000).toFixed(1).replace('.',',')+' s';
(async()=>{
 const proxy=process.env.HTTPS_PROXY||process.env.https_proxy;
 const browser=await chromium.launch(proxy?{proxy:{server:proxy}}:{});
 const ctx=await browser.newContext({viewport:handy?{width:390,height:844}:{width:1366,height:800}});
 const page=await ctx.newPage();
 const rows=[],net=new Map();
 page.on('response',async r=>{const u=new URL(r.url());if(!/app-2027|\/apps\/konfigurator/.test(u.host+u.pathname))return;net.set(u.pathname,{status:r.status(),cache:r.headers()['cache-control']||'',size:Number(r.headers()['content-length']||0)});});
 const t0=Date.now();
 await page.goto(url,{waitUntil:'load',timeout:90000});
 const seite=Date.now()-t0;
 const check=await page.evaluate(()=>({
  knopf:!!document.querySelector('[data-gravuru-personalisieren] a[data-gravuru-start]'),
  kaufknopfSichtbar:[...document.querySelectorAll('form[action*="/cart/add"] [type=submit]')].some(b=>b.offsetParent!==null),
  konfiDaten:!!document.getElementById('gravuru-konfi')
 }));
 if(!check.knopf){console.log('Kein Knopf „Jetzt personalisieren“ auf',url);await browser.close();process.exit(2);}
 const href=await page.$eval('[data-gravuru-personalisieren] a[data-gravuru-start]',a=>a.href);
 const cdp=await ctx.newCDPSession(page);if(handy)await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 let modell=null;const t1=Date.now();
 page.on('requestfinished',r=>{if(/\/api\/shop-entry\/model/.test(r.url())&&modell===null)modell=Date.now()-t1;});
 await page.goto(href,{waitUntil:'load',timeout:90000});
 let frame;for(let i=0;i<300&&!frame;i++){frame=page.frames().find(f=>/_merchant-acryl-editor/.test(f.url()));if(!frame)await page.waitForTimeout(100);}
 let bereit=null;
 for(let i=0;frame&&i<900;i++){const ok=await frame.evaluate(()=>{const r=document.querySelector('gravuru-configurator')?.shadowRoot;return !!r&&[...r.querySelectorAll('button')].some(b=>/Gestaltung fertig/.test(b.textContent)&&b.offsetParent);}).catch(()=>false);if(ok){bereit=Date.now()-t1;break;}await page.waitForTimeout(100);}
 const model=await page.evaluate(()=>{const u=window.UniversalConfig;if(!u)return null;return {kb:Math.round(JSON.stringify(u).length/1024),schriften:Object.keys(u.localResources?.fonts||{}).length,grundplatte:String(u.materialSurface||'').slice(5,15)};});
 const cache=p=>{for(const [k,v] of net)if(k.includes(p))return v.cache.replace(/\s*\n\s*/g,', ')||'(keine Angabe)';return '–';};
 rows.push(['Produktseite geladen',s(seite)],['Knopf „Jetzt personalisieren“',check.knopf?'ja':'NEIN'],['Normaler Kaufknopf ausgeblendet',check.kaufknopfSichtbar?'NEIN – sichtbar':'ja'],
  ['Produktdaten geladen nach',s(modell)],['Konfigurator bedienbar nach',s(bereit)],
  ['Produktdaten (entpackt)',model?model.kb+' KB':'–'],['Mitgeschickte Schriften',model?String(model.schriften):'–'],['Grundplatte',model?model.grundplatte:'–'],
  ['Zwischenspeicher Editor-Seite',cache('_merchant-acryl-editor.html')],['Zwischenspeicher Editor-Paket',cache('_acryl-bundle/')],['Zwischenspeicher Katalog',cache('katalog-kern.json')]);
 console.log('\nKonfigurator-Messung '+(handy?'(Handy, CPU 4x gebremst)':'(Desktop)')+' – '+new Date().toLocaleString('de-DE')+'\n'+url+'\n');
 const w=Math.max(...rows.map(r=>r[0].length));for(const [k,v] of rows)console.log(k.padEnd(w+2)+v);
 await browser.close();
})().catch(e=>{console.error('Fehler:',e.message);process.exit(1);});
