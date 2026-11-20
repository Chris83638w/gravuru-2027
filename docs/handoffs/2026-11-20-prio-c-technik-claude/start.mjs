// Claude · 20.11.2026 · Stufe 3: woraus besteht der Start des Editors. Nur lesend, Live-Server unverändert.
// Aufruf: node start.mjs [mobil] [--drossel]
import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const rest=process.argv.slice(2),MOBIL=rest.includes('mobil'),DROSSEL=rest.includes('--drossel');
const SHOP='https://gravuru-design.myshopify.com';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext(MOBIL?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE'}:{viewport:{width:1366,height:900},locale:'de-DE'});
const page=await ctx.newPage();const reqs=new Map();let t0=null;const fehler=[];
page.on('request',r=>{if(t0===null)return;reqs.set(r,{url:r.url(),m:r.method(),typ:r.resourceType(),s:Date.now()-t0});if(r.method()!=='GET'&&/\/cart\/add|acrylic-drafts|theme-cart|cart\/claim|\/api\/shop-entry\/cart/.test(r.url()))fehler.push('SCHREIBZUGRIFF '+r.url().slice(0,90));});
page.on('requestfinished',async r=>{const e=reqs.get(r);if(!e)return;e.e=Date.now()-t0;try{const z=await r.sizes();e.kb=Math.round(z.responseBodySize/102.4)/10;const resp=await r.response();e.st=resp?.status();e.enc=resp?.headers()['content-encoding']||'';e.cc=resp?.headers()['cache-control']||'';e.sv=resp?.headers()['server-timing']||'';const t=r.timing();e.ttfb=Math.round(t.responseStart-t.requestStart);e.dl=Math.round(t.responseEnd-t.responseStart);e.conn=Math.round(t.connectEnd-t.connectStart);}catch{}});
page.on('requestfailed',r=>{const e=reqs.get(r);if(e){e.e=Date.now()-t0;e.fail=r.failure()?.errorText;}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push([t,Date.now()]);},true);});
if(DROSSEL){const cdp=await ctx.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:0.75*1024*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
await page.goto(SHOP+'/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen',{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForSelector('[data-gravuru-personalisieren] a[data-gravuru-start]',{timeout:90000});await sleep(2500);
t0=Date.now();const w0=await page.evaluate(()=>Date.now());
await page.click('[data-gravuru-personalisieren] a[data-gravuru-start]');
let bereit=null;while(Date.now()-t0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);const hit=m.find(x=>x[0]==='gravuru-shop-editor-ready');if(hit){bereit=hit[1]-w0;break;}await sleep(60);}
await sleep(3000);
const meld=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);
const liste=[...reqs.values()].sort((a,b)=>a.s-b.s).map(e=>({...e,url:e.url.replace(/^https:\/\//,'').replace(/[?#].*$/,m=>m.length>40?m.slice(0,40)+'…':m).slice(0,110)}));
const out={profil:MOBIL?'mobil':'pc',drossel:DROSSEL,zeit:new Date().toISOString(),bereitMs:bereit,meldungen:meld.map(x=>[x[0],x[1]-w0]),anfragen:liste,fehler};
const name='start-'+(MOBIL?'mobil':'pc')+(DROSSEL?'-drossel':'');fs.writeFileSync('out2/'+name+'.json',JSON.stringify(out,null,1));
console.log(name,'bereit nach',bereit,'ms · Anfragen bis bereit:',liste.filter(e=>e.s<=bereit).length,'· kB bis bereit:',Math.round(liste.filter(e=>e.s<=bereit).reduce((a,e)=>a+(e.kb||0),0)));
console.log(meld.map(x=>x[0]+'@'+(x[1]-w0)).join(' | '));
for(const e of liste.filter(e=>e.s<=bereit+200&&/app-2027/.test(e.url)&&!e.url.startsWith('blob:')))console.log(String(e.s).padStart(6),String(e.e??'-').padStart(6),String(e.kb??'-').padStart(7),(e.enc||'-').padEnd(4),'ttfb',String(e.ttfb??'-').padStart(5),'dl',String(e.dl??'-').padStart(5),e.st??e.fail??'',e.url.replace('app-2027.gravuru-designwerkstatt.de','').slice(0,60),'|',(e.cc||'').slice(0,40),'|',(e.sv||'').slice(0,160));
console.log('blobs bis bereit:',liste.filter(e=>e.url.startsWith('blob:')&&e.s<=bereit).length,'· Shopify/sonstige bis bereit:',liste.filter(e=>!/app-2027/.test(e.url)&&!e.url.startsWith('blob:')&&e.s<=bereit).length);
if(fehler.length)console.log('FEHLER',fehler);
await browser.close();
