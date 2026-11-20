// Claude · 20.11.2026 · Bleibt eine einmal geöffnete Theme-Vorschau hängen, wenn danach der normale Produktlink geöffnet wird?
// Nur lesend, Wegwerf-Browser (WebKit, iPhone-Profil).
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {webkit,devices}=require('playwright');
const THEMA=process.argv[2],H=process.argv[3],B='https://gravuru-design.myshopify.com';
const browser=await webkit.launch({headless:true,proxy:{server:process.env.HTTPS_PROXY}});
const ctx=await browser.newContext({...devices['iPhone 13'],locale:'de-DE'});const page=await ctx.newPage();
const lage=()=>page.evaluate(()=>({thema:(document.documentElement.innerHTML.match(/\/cdn\/shop\/t\/(\d+)\//)||[])[1],knopf:!!document.querySelector('a[data-gravuru-start]'),kaufen:[...document.querySelectorAll('button[name=add]')].map(b=>({text:(b.innerText||'').trim().slice(0,24),sichtbar:b.getBoundingClientRect().width>10})).slice(0,2),vorschauLeiste:!!document.querySelector('#PBarNextFrameWrapper,#preview-bar-iframe,[id*="preview-bar"],[id*="PBar"]')}));
const res={};
await page.goto(B+'/?preview_theme_id='+THEMA,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForTimeout(3000);res.schritt1_VorschauStartseite=await lage();
await page.goto(B+'/products/'+H,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForTimeout(5000);res.schritt2_normalerProduktlink=await lage();
await page.evaluate(()=>{const b=[...document.querySelectorAll('button[name=add]')].find(b=>b.getBoundingClientRect().width>10&&(b.innerText||'').trim());b?.scrollIntoView({block:'center'});});await page.waitForTimeout(1200);
await page.screenshot({path:'korb/wk/vorschau-haengt-kaufbereich.png'});
console.log(JSON.stringify(res,null,1));await browser.close();
