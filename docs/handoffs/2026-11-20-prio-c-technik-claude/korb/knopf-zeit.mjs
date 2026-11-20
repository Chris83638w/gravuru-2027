// Claude · 20.11.2026 · Bleibt der Knopf „Jetzt personalisieren“ über die Zeit sichtbar, antippbar und die Seite rollbar? Nur lesend.
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const h=process.argv[2];
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY}});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
const page=await ctx.newPage();const fehler=[];page.on('pageerror',e=>fehler.push(String(e.message).slice(0,160)));
page.on('console',m=>{if(m.type()==='error'&&/gravuru|konfigurator|embed/i.test(m.text()))fehler.push('Konsole: '+m.text().slice(0,160));});
const t0=Date.now();await page.goto('https://gravuru-design.myshopify.com/products/'+h,{waitUntil:'domcontentloaded',timeout:90000});
const lage=()=>page.evaluate(()=>{const a=document.querySelector('a[data-gravuru-start]');const d=document.documentElement,b=document.body;const out={html:d.className.split(/\s+/).filter(c=>/gv-|embed|lock|overflow|no-scroll|drawer|modal/.test(c)),htmlOverflow:getComputedStyle(d).overflowY,bodyOverflow:getComputedStyle(b).overflowY,bodyPos:getComputedStyle(b).position,seitenhoehe:d.scrollHeight};
 if(!a){out.knopf=null;return out;}const r=a.getBoundingClientRect(),s=getComputedStyle(a);out.knopf={yInSeite:Math.round(r.top+scrollY),breite:Math.round(r.width),hoehe:Math.round(r.height),display:s.display,sichtbarkeit:s.visibility,deckkraft:s.opacity,zeigerereignisse:s.pointerEvents,klassen:a.className,disabled:a.getAttribute('aria-disabled')};
 const schalen=[...document.querySelectorAll('.gv-embed')].map(e=>{const s=getComputedStyle(e);return {klassen:e.className,hidden:e.hidden,display:s.display,sichtbarkeit:s.visibility,zeiger:s.pointerEvents,rahmen:e.querySelectorAll('iframe').length};});out.schalen=schalen;
 return out;});
const verlauf=[];
for(const sek of [1,3,6,10,15,22]){while(Date.now()-t0<sek*1000)await page.waitForTimeout(100);verlauf.push({sek,...await lage()});}
// Rollen wie mit dem Finger und prüfen, was an der Stelle des Knopfs liegt.
await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(300);
await page.mouse.move(195,600);await page.mouse.wheel(0,700);await page.waitForTimeout(800);
const rollen=await page.evaluate(()=>{const a=document.querySelector('a[data-gravuru-start]');const r=a?.getBoundingClientRect();const mitte=r?document.elementFromPoint(r.left+r.width/2,r.top+r.height/2):null;return {scrollY:Math.round(scrollY),knopfImBild:r?Math.round(r.top):null,anDerStelleLiegt:mitte?mitte.tagName.toLowerCase()+'.'+String(mitte.className).slice(0,50):null,istKnopf:mitte===a};});
await page.screenshot({path:'korb/knopf-zeit-'+h.slice(0,16)+'.png'});
console.log(JSON.stringify({produkt:h,verlauf,rollen,fehler},null,1));
await browser.close();
