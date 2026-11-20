// Claude · 20.11.2026 · Ist der Knopf „Jetzt personalisieren“ auf der Produktseite da? Nur lesend, ohne Ersatz.
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const HANDLES=process.argv.slice(2);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(const [name,opt] of [['handy',{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}],['pc',{viewport:{width:1366,height:900},locale:'de-DE'}]]){
 for(const h of HANDLES){
  const ctx=await browser.newContext(opt),page=await ctx.newPage(),antworten=[],fehler=[];
  page.on('response',r=>{const u=new URL(r.url());if(/apps\/konfigurator|app-2027\.gravuru|shop-embed/.test(u.href))antworten.push(r.status()+' '+u.hostname.split('.')[0]+u.pathname.slice(0,60));});
  page.on('requestfailed',r=>{const u=r.url();if(/apps\/konfigurator|app-2027\.gravuru|shop-embed/.test(u))fehler.push('fehlgeschlagen '+new URL(u).pathname.slice(0,60)+' '+(r.failure()?.errorText||''));});
  page.on('pageerror',e=>fehler.push('Seitenfehler '+String(e.message).slice(0,140)));
  const t0=Date.now();let status=null;
  try{const r=await page.goto('https://gravuru-design.myshopify.com/products/'+h,{waitUntil:'domcontentloaded',timeout:90000});status=r?.status();}catch(e){fehler.push('Seite: '+String(e.message).slice(0,100));}
  let knopf=null;for(let i=0;i<50&&!knopf;i++){knopf=await page.evaluate(()=>{const a=document.querySelector('a[data-gravuru-start]');if(!a)return null;const b=a.getBoundingClientRect(),s=getComputedStyle(a);return {text:(a.innerText||'').trim(),sichtbar:b.width>10&&b.height>10&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0.1,y:Math.round(b.top),href:(a.getAttribute('href')||'').slice(0,40)};}).catch(()=>null);if(!knopf)await sleep(500);}
  const nachMs=Date.now()-t0;
  const sonst=await page.evaluate(()=>({kaufen:[...document.querySelectorAll('button[name=add],form[action*="/cart/add"] button')].map(b=>(b.innerText||'').trim()).filter(Boolean).slice(0,3),einbettung:[...document.querySelectorAll('[data-gravuru-embed],[id*=gravuru],[class*=gravuru]')].slice(0,6).map(e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+'.'+String(e.className).slice(0,40)+(e.hidden?' [hidden]':'')),skripte:[...document.scripts].map(s=>s.src).filter(s=>/konfigurator|gravuru/.test(s)).map(s=>new URL(s).pathname.slice(0,70)),titel:document.title.slice(0,60)})).catch(()=>null);
  await page.screenshot({path:'korb/knopf-live-'+name+'-'+h.slice(0,18)+'.png'});
  console.log(JSON.stringify({ansicht:name,produkt:h,status,knopf,knopfNachMs:knopf?nachMs:null,sonst,antworten:antworten.slice(0,10),fehler:fehler.slice(0,5)}));
  await ctx.close();
 }
}
await browser.close();
