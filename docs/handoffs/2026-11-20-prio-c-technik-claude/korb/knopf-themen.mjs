// Claude · 20.11.2026 · Steht der Knopf „Jetzt personalisieren“ auch in den Vorschau-Themes? Nur lesend (Vorschau in einem Wegwerf-Browser).
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const THEMEN=process.argv[2].split(','),HANDLES=process.argv.slice(3);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY}});
for(const thema of THEMEN){
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
 const page=await ctx.newPage();
 for(const h of HANDLES){
  let status=null;try{const r=await page.goto('https://gravuru-design.myshopify.com/products/'+h+(thema==='live'?'':'?preview_theme_id='+thema),{waitUntil:'domcontentloaded',timeout:90000});status=r?.status();}catch(e){status='Fehler '+String(e.message).slice(0,60);}
  await page.waitForTimeout(5000);
  const lage=await page.evaluate(()=>{const a=document.querySelector('a[data-gravuru-start]');const s=a?getComputedStyle(a):null,r=a?.getBoundingClientRect();const sonst=[...document.querySelectorAll('a,button')].filter(e=>/personalisier|gestalten|anpassen|konfigur/i.test(e.innerText||'')).slice(0,5).map(e=>({text:(e.innerText||'').trim().slice(0,40),tag:e.tagName.toLowerCase(),sichtbar:e.getBoundingClientRect().width>10&&getComputedStyle(e).display!=='none',href:(e.getAttribute('href')||'').slice(0,50),typ:e.getAttribute('type')}));
   return {themaNr:(document.documentElement.innerHTML.match(/\/cdn\/shop\/t\/(\d+)\//)||[])[1],vorschauLeiste:!!document.querySelector('#PBarNextFrameWrapper,#preview-bar-iframe,[id*=preview-bar]'),knopf:a?{text:(a.innerText||'').trim(),sichtbar:r.width>10&&r.height>10&&s.display!=='none'&&s.visibility!=='hidden',y:Math.round(r.top+scrollY)}:null,aehnlicheKnoepfe:sonst,kaufen:[...document.querySelectorAll('button[name=add]')].map(b=>(b.innerText||'').trim()).slice(0,2),einbettung:!!document.querySelector('script#gravuru-konfi'),titel:document.title.slice(0,50)};}).catch(e=>({fehler:String(e.message).slice(0,80)}));
  console.log(JSON.stringify({thema,produkt:h.slice(0,34),status,...lage}));
  await page.screenshot({path:'korb/thema-'+thema+'-'+h.slice(0,14)+'.png'});
 }
 await ctx.close();
}
await browser.close();
