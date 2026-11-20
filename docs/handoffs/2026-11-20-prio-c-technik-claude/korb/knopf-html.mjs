// Claude · 20.11.2026 · Woran hängt der Knopf „Jetzt personalisieren“? Rohes HTML und Zustand nach dem Laden, nur lesend.
import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const h=process.argv[2];
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY}});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
const page=await ctx.newPage();
const r=await ctx.request.get('https://gravuru-design.myshopify.com/products/'+h);const html=await r.text();
const i=html.indexOf('gravuru-personalisieren');
console.log('ROH: Status',r.status(),'Länge',html.length,'Block im rohen HTML:',i>=0);
if(i>=0)console.log(html.slice(Math.max(0,i-600),i+1800).replace(/\s+/g,' ').slice(0,2400));
const j=html.indexOf('id="gravuru-konfi"');if(j>=0)console.log('SKRIPT:',html.slice(j-200,j+2600).replace(/\s+/g,' ').slice(0,2800));
await page.goto('https://gravuru-design.myshopify.com/products/'+h,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForTimeout(6000);
const lage=await page.evaluate(()=>{const d=document.querySelector('.gravuru-personalisieren'),a=document.querySelector('a[data-gravuru-start]');const over=[...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e);return (s.position==='fixed')&&e.getBoundingClientRect().width>300&&e.getBoundingClientRect().height>300&&s.display!=='none'&&s.visibility!=='hidden';}).slice(0,4).map(e=>e.tagName.toLowerCase()+'#'+e.id+'.'+String(e.className).slice(0,60)+' | '+(e.innerText||'').trim().slice(0,80));return {block:d?{hidden:d.hidden,display:getComputedStyle(d).display,html:d.outerHTML.slice(0,500)}:null,knopf:a?{y:Math.round(a.getBoundingClientRect().top+scrollY),hoehe:Math.round(a.getBoundingClientRect().height)}:null,ueberlagerungen:over};});
console.log('NACH DEM LADEN:',JSON.stringify(lage));
await page.evaluate(()=>document.querySelector('a[data-gravuru-start]')?.scrollIntoView({block:'center'}));await page.waitForTimeout(800);
await page.screenshot({path:'korb/knopf-live-handy-am-knopf.png'});
await browser.close();
