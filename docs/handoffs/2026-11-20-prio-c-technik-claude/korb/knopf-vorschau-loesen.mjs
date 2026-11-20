// Claude · 20.11.2026 · Mit welchem Link kommt ein Browser, in dem eine alte Theme-Vorschau hängt, wieder auf das Live-Theme?
// Nur lesend, Wegwerf-Browser (WebKit, iPhone-Profil). Je Variante ein frischer Browser-Kontext.
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {webkit,devices}=require('playwright');
const THEMA=process.argv[2],H=process.argv[3],B='https://gravuru-design.myshopify.com';
const browser=await webkit.launch({headless:true,proxy:{server:process.env.HTTPS_PROXY}});
const lage=page=>page.evaluate(()=>({thema:(document.documentElement.innerHTML.match(/\/cdn\/shop\/t\/(\d+)\//)||[])[1],knopf:!!document.querySelector('a[data-gravuru-start]'),vorschauLeiste:!!document.querySelector('#PBarNextFrameWrapper,#preview-bar-iframe,[id*="preview-bar"],[id*="PBar"]')}));
for(const anhang of process.argv.slice(4)){
 const ctx=await browser.newContext({...devices['iPhone 13'],locale:'de-DE'});const page=await ctx.newPage();const res={anhang};
 await page.goto(B+'/?preview_theme_id='+THEMA,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForTimeout(2500);res.vorher=await lage(page);
 await page.goto(B+'/products/'+H+anhang,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForTimeout(4000);res.mitAnhang=await lage(page);
 await page.goto(B+'/products/'+H,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForTimeout(4000);res.danachNormalerLink=await lage(page);
 console.log(JSON.stringify(res));await ctx.close();
}
await browser.close();
