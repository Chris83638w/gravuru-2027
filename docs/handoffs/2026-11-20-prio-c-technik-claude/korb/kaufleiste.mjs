// Claude · 20.11.2026 · Beobachtung aus der Knopf-Prüfung: Auf den Acrylglas-Seiten ist ein zweiter Kaufknopf nicht ausgeblendet.
// Erscheint beim Scrollen eine Kaufleiste, über die man ohne Gestaltung in den Warenkorb legen kann? Nur lesend (kein Klick).
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY}});
for(const h of process.argv.slice(2)){
 const ctx=await browser.newContext({viewport:{width:393,height:760},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE',userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'});
 const page=await ctx.newPage();await page.goto('https://gravuru-design.myshopify.com/products/'+h,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForTimeout(7000);
 const lage=()=>page.evaluate(()=>[...document.querySelectorAll('button[name=add],.shopify-payment-button')].map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);let v=b;let sichtbar=r.width>10&&r.height>10&&s.display!=='none';while(v&&sichtbar){const c=getComputedStyle(v);if(c.visibility==='hidden'||c.opacity==='0'||c.display==='none')sichtbar=false;v=v.parentElement;}return {text:(b.textContent||'').trim().replace(/\s+/g,' ').slice(0,30),imBild:sichtbar&&r.top>=0&&r.bottom<=innerHeight,sichtbar,oben:Math.round(r.top),leiste:!!b.closest('sticky-atc-bar,sticky-atc-bar-minimalist,[class*=sticky-atc]'),versteckt:b.hasAttribute('data-gravuru-hidden-buy')};}));
 const res={produkt:h.slice(0,30),oben:await lage()};
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight*0.45));await page.waitForTimeout(2500);res.mitte=await lage();await page.screenshot({path:'korb/wk/kaufleiste-'+h.slice(0,14)+'.png'});
 console.log(JSON.stringify(res));await ctx.close();
}
await browser.close();
