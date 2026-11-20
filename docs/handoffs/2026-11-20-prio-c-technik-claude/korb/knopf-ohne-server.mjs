// Claude · 20.11.2026 · Bleibt der Knopf sichtbar, wenn der Konfigurator-Server nicht antwortet (z. B. während des Aufspielens)? Nur lesend.
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const h=process.argv[2],ART=process.argv[3]||'abbruch';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY}});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
const page=await ctx.newPage();let gesperrt=0;
// Alles, was vom Konfigurator-Server kommt (App-Proxy und App-Domain), fällt aus: Abbruch, 502 oder hängt.
await page.route(u=>/\/apps\/konfigurator\//.test(u.pathname)||/app-2027\.gravuru-designwerkstatt\.de$/.test(u.hostname),async route=>{gesperrt++;if(ART==='502')return route.fulfill({status:502,contentType:'text/html',body:'<h1>502 Bad Gateway</h1>'});if(ART==='haengt')return;return route.abort('connectionrefused');});
await page.goto('https://gravuru-design.myshopify.com/products/'+h,{waitUntil:'domcontentloaded',timeout:90000});
const lage=()=>page.evaluate(()=>{const a=document.querySelector('a[data-gravuru-start]');if(!a)return {knopf:null};const r=a.getBoundingClientRect(),s=getComputedStyle(a),p=a.closest('.gravuru-personalisieren'),ps=p?getComputedStyle(p):null;return {knopf:{text:(a.innerText||'').trim(),sichtbar:r.width>10&&r.height>10&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0.1,display:s.display,deckkraft:s.opacity,zeiger:s.pointerEvents,klassen:a.className,blockDisplay:ps?.display,blockHidden:p?.hidden}};});
const verlauf=[];for(const sek of [1,4,9,15]){await page.waitForTimeout(sek===1?1000:sek===4?3000:sek===9?5000:6000);verlauf.push({sek,...await lage()});}
await page.evaluate(()=>document.querySelector('a[data-gravuru-start]')?.scrollIntoView({block:'center'}));await page.waitForTimeout(500);
await page.screenshot({path:'korb/knopf-ohne-server-'+ART+'.png'});
console.log(JSON.stringify({produkt:h,ausfall:ART,gesperrteAbrufe:gesperrt,verlauf}));
await browser.close();
