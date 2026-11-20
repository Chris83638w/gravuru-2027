// Claude · 20.11.2026 · Welche Produkte im echten Shop haben den Konfigurator-Knopf? Nur lesend.
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY}});
const ctx=await browser.newContext({locale:'de-DE'});const page=await ctx.newPage();
const alle=[];
for(let seite=1;seite<=4;seite++){
 const r=await page.goto('https://gravuru-design.myshopify.com/products.json?limit=250&page='+seite,{timeout:90000});
 let j;try{j=JSON.parse(await page.evaluate(()=>document.body.innerText));}catch{console.log('Seite',seite,'Status',r?.status(),'kein JSON');break;}
 if(!j.products?.length)break;alle.push(...j.products.map(p=>({handle:p.handle,titel:p.title,typ:p.product_type,varianten:p.variants.length})));
 if(j.products.length<250)break;
}
console.log('Produkte',alle.length);
const typen={};for(const p of alle)(typen[p.typ||'(ohne)']??=[]).push(p.handle);
for(const [t,l] of Object.entries(typen))console.log(t,'|',l.length,'|',l.slice(0,4).join(', '));
await browser.close();
