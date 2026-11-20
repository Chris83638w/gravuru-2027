// Claude · 20.11.2026 · Was passiert im echten Shop heute (ohne Ersatz), wenn man das Design D808 „Herzlinie“ wählt? Nur lesend.
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const HANDLE=process.argv[2]||'familienschild-acryl-baum-12x8-personalisiert',ZIEL=process.argv[3]||'D808';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext({viewport:{width:1366,height:900},locale:'de-DE'});const page=await ctx.newPage();const sleep=ms=>new Promise(r=>setTimeout(r,ms));const fehler=[],antworten=[];
page.on('pageerror',e=>fehler.push('Seitenfehler: '+String(e.message).slice(0,200)));
page.on('console',m=>{if(m.type()==='error'&&!/favicon|accessibility|shop\.app/.test(m.text()))fehler.push('Konsole: '+m.text().slice(0,200));});
page.on('response',r=>{const u=new URL(r.url());if(/design-switch|shop-entry\/model/.test(u.pathname))antworten.push(r.request().method()+' '+u.pathname.slice(-28)+' '+r.status());});
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
await page.goto('https://gravuru-design.myshopify.com/products/'+HANDLE,{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForSelector('a[data-gravuru-start]',{timeout:90000});await sleep(5000);await page.click('a[data-gravuru-start]');
const s0=Date.now();while(Date.now()-s0<120000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready'))break;await sleep(100);}
await sleep(1500);
const rahmen=()=>page.frames().filter(f=>{try{return new URL(f.url()).pathname==='/_merchant-acryl-editor.html'&&!f.isDetached();}catch{return false;}});
const WALK='const all=[];const walk=r=>{for(const e of r.querySelectorAll("*")){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);const el=document.querySelector("gravuru-configurator");';
const f=rahmen().at(-1);
await f.evaluate(new Function(WALK+'all.filter(e=>e.matches("button,[role=tab]")).find(e=>(e.innerText||"").trim()==="Designs"&&e.getBoundingClientRect().width>4)?.click();'));
await sleep(1500);
// Suche nach der Designnummer, dann die Karte antippen.
await f.evaluate(new Function('text',WALK+'const i=all.find(e=>e.matches(".ux-product-designs input"));i.focus();i.value=text;i.dispatchEvent(new Event("input",{bubbles:true}));'),ZIEL);
await sleep(4000);
const karte=await f.evaluate(new Function('ziel',WALK+'const k=all.filter(e=>e.matches(".ux-product-choose"));const treffer=k.find(e=>(e.dataset.productDesignId||"").endsWith("-"+ziel));const status=(all.find(e=>e.matches(".ux-product-status"))?.textContent||"").trim();if(!treffer)return {status,karten:k.map(e=>e.dataset.productDesignId).slice(0,8)};treffer.scrollIntoView();treffer.click();return {status,id:treffer.dataset.productDesignId,name:treffer.getAttribute("aria-label")};'),ZIEL);
const lage=async()=>{const alle=rahmen();const out=[];for(const g of alle){out.push(await g.evaluate(new Function(WALK+'const fe=window.frameElement;const sichtbar=!!fe&&!fe.hidden&&fe.style.display!=="none"&&fe.style.visibility!=="hidden";const meld=all.filter(e=>e.matches("[role=status],[role=alert],.ux-product-status,.ux-product-result")).map(e=>(e.innerText||"").trim()).filter(Boolean).slice(0,5);return {sichtbar,hatEditor:!!el,design:el?.state?.designId||null,texte:el?.state?.objects?.filter(o=>o.type==="text").map(o=>o.text)||null,meldungen:meld,body:el?null:(document.body.innerText||"").trim().slice(0,200)};')).catch(e=>({fehler:String(e.message).slice(0,80)})));}return out;};
const verlauf=[];for(const sek of [2,5,10,20]){await sleep(sek===2?2000:sek===5?3000:sek===10?5000:10000);verlauf.push({sek,rahmen:await lage()});if(sek===5||sek===20)await page.screenshot({path:'acryl/d808-live-'+sek+'s.png'});}
const shop=page.frames().find(f=>{try{return /\/konfigurator\/shop\/?$/.test(new URL(f.url()).pathname);}catch{return false;}});
const shopText=shop?await shop.evaluate(()=>(document.body.innerText||'').trim().slice(0,300)).catch(()=>null):null;
console.log(JSON.stringify({karte,antworten,fehler:fehler.slice(0,8),verlauf,shopText},null,1));
await browser.close();
