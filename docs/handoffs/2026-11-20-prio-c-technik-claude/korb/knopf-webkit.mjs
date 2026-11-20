// Claude · 20.11.2026 · Produktseite im Safari-nahen Browser (WebKit, iPhone-Profil): Steht der Knopf „Jetzt personalisieren“,
// ist er sichtbar und antippbar – auch während und nach dem unsichtbaren Vorab-Start? Nur lesend, Wegwerf-Browser.
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {webkit,devices}=require('playwright');
const HANDLES=process.argv.slice(2),GERAET=process.env.GERAET||'iPhone 13',ZEITEN=(process.env.ZEITEN||'1,4,9,16,25').split(',').map(Number);
const browser=await webkit.launch({headless:true,proxy:{server:process.env.HTTPS_PROXY}});
for(const h of HANDLES){
 const ctx=await browser.newContext({...devices[GERAET],locale:'de-DE'});
 const page=await ctx.newPage();const res={produkt:h.slice(0,40),geraet:GERAET,browser:'WebKit '+browser.version(),meldungen:[],fehler:[],absturz:false,neuGeladen:0,verlauf:[]};
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')res.meldungen.push((m.type()+': '+m.text()).slice(0,200));});
 page.on('pageerror',e=>res.fehler.push(String(e.message).slice(0,200)));
 page.on('crash',()=>{res.absturz=true;});
 page.on('framenavigated',f=>{if(f===page.mainFrame())res.neuGeladen++;});
 const fehlschlag=[];page.on('requestfailed',r=>{const u=r.url();if(/konfigurator|gravuru-designwerkstatt/.test(u))fehlschlag.push((r.failure()?.errorText||'')+' '+u.replace(/[?#].*/,'').slice(-70));});
 const t0=Date.now();let status=null;
 try{const r=await page.goto('https://gravuru-design.myshopify.com/products/'+h,{waitUntil:'domcontentloaded',timeout:90000});status=r?.status();}catch(e){status='Fehler '+String(e.message).slice(0,80);}
 res.status=status;
 const lage=()=>page.evaluate(()=>{
  const a=document.querySelector('a[data-gravuru-start]');let knopf=null;
  if(a){const s=getComputedStyle(a);a.scrollIntoView({block:'center'});const r=a.getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
   knopf={text:(a.innerText||'').trim(),display:s.display,visibility:s.visibility,opacity:s.opacity,breite:Math.round(r.width),hoehe:Math.round(r.height),y:Math.round(r.top+scrollY),schrift:s.color,grund:s.backgroundColor,obenauf:e?(e===a||a.contains(e)?'der Knopf selbst':e.tagName.toLowerCase()+'.'+String(e.className||'').slice(0,50)):null};}
  const shell=document.querySelector('.gv-embed');let huelle=null;
  if(shell){const s=getComputedStyle(shell),r=shell.getBoundingClientRect();huelle={hidden:shell.hidden,klasse:shell.className,display:s.display,visibility:s.visibility,zeiger:s.pointerEvents,flaeche:Math.round(r.width)+'x'+Math.round(r.height),sichtbareKinder:[...shell.querySelectorAll('*')].filter(e=>{const c=getComputedStyle(e);return c.visibility==='visible'&&c.display!=='none'&&e.getBoundingClientRect().width>0;}).map(e=>e.tagName.toLowerCase()+'.'+String(e.className||'').slice(0,30)).slice(0,6),rahmen:!!shell.querySelector('iframe')};}
  return {knopf,huelle,kaufen:[...document.querySelectorAll('button[name=add]')].map(b=>({text:(b.innerText||'').trim().slice(0,24),sichtbar:b.getBoundingClientRect().width>10})).slice(0,3),sperre:document.documentElement.classList.contains('gv-embed-open'),einbettung:!!document.querySelector('script#gravuru-konfi'),eingebettetGeladen:!!window.__gravuruShopEmbed,thema:(document.documentElement.innerHTML.match(/\/cdn\/shop\/t\/(\d+)\//)||[])[1],titel:document.title.slice(0,40)};
 }).catch(e=>({fehler:String(e.message).slice(0,120)}));
 for(const z of ZEITEN){const warte=z*1000-(Date.now()-t0);if(warte>0)await page.waitForTimeout(warte);const l=await lage();res.verlauf.push({nachS:z,...l});
  if(z===ZEITEN[1]||z===ZEITEN[ZEITEN.length-1])await page.screenshot({path:'korb/wk/'+h.slice(0,16)+'-'+z+'s.png'}).catch(()=>{});}
 // Antippen: öffnet sich der Konfigurator?
 let tipp=null;try{const a=page.locator('a[data-gravuru-start]').first();await a.scrollIntoViewIfNeeded({timeout:5000});await a.tap({timeout:8000});await page.waitForTimeout(6000);
  tipp=await page.evaluate(()=>{const shell=document.querySelector('.gv-embed');const f=shell?.querySelector('iframe');return {fensterOffen:!!shell&&!shell.hidden&&!shell.classList.contains('gv-embed--preload'),rahmen:!!f,adresse:location.pathname.slice(0,60)};});
  await page.screenshot({path:'korb/wk/'+h.slice(0,16)+'-nach-tipp.png'}).catch(()=>{});}catch(e){tipp={fehler:String(e.message).slice(0,160)};}
 res.tipp=tipp;res.fehlgeschlageneAnfragen=fehlschlag.slice(0,6);res.meldungen=res.meldungen.slice(0,8);
 console.log(JSON.stringify(res,null,1));
 await ctx.close();
}
await browser.close();
