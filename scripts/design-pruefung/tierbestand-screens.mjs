import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const req=createRequire(path.join(process.env.GRAVURU_NODE_MODULES,'package.json')), {chromium}=req('playwright');
const folder=path.resolve(process.argv[2]),browser=await chromium.launch({headless:true,executablePath:process.env.GRAVURU_BROWSER});
try{const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});await page.goto(pathToFileURL(path.join(folder,'kontaktbogen.html')).href);const count=await page.locator('nav button').count();
for(let i=0;i<count;i++){await page.locator('nav button').nth(i).click();await page.locator('main img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));await page.screenshot({path:path.join(folder,'kontaktbogen-'+(i+1)+'.png'),fullPage:true});}
await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(folder,'mobil.png'),fullPage:true});
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');console.log(count+' Kontaktbogenseiten und Mobilansicht geprüft.');
}finally{await browser.close();}
