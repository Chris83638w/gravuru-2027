// Verify every gallery choice loads, including switching between signs and cat motifs.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(process.env.GRAVURU_NODE_MODULES?path.join(process.env.GRAVURU_NODE_MODULES,'package.json'):import.meta.url),{chromium}=require('playwright');
const arg=n=>process.argv.find(a=>a.startsWith('--'+n+'='))?.split('=').slice(1).join('=');
const root=path.resolve(arg('root')||'../../outputs/rasse-schilder-review');
const browser=await chromium.launch({headless:true,...(process.env.GRAVURU_BROWSER?{executablePath:process.env.GRAVURU_BROWSER}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
let signs=0,motifs=0;
const loaded=async()=>{
 await page.waitForFunction(()=>{const im=document.querySelector('#sheet');return im.complete&&im.naturalWidth>0;});
 const matches=await page.evaluate(()=>document.querySelector('#sheet').src===document.querySelector('#full').href);
 if(!matches)throw Error('Full-size link does not match displayed image');
};
try{
 await page.goto(pathToFileURL(path.join(root,'GALERIE.html')).href);
 const breeds=await page.locator('#breed option').evaluateAll(opts=>opts.map(o=>o.value));
 for(const breed of breeds){
  await page.selectOption('#breed',breed);await page.selectOption('#view','signs');
  const forms=await page.locator('#form option').evaluateAll(opts=>opts.map(o=>o.value));
  for(const form of forms){await page.selectOption('#form',form);await loaded();signs++;}
  // Native option.disabled is authoritative; the generic enabled matcher treats
  // an option differently from its parent select in this browser.
  if(!await page.locator('#view option[value="motifs"]').evaluate(option=>option.disabled)){
   await page.selectOption('#view','motifs');await loaded();motifs++;
   if(!await page.locator('#form').isDisabled())throw Error('Motif view must not suggest a plate size: '+JSON.stringify(await page.evaluate(()=>({breed:document.querySelector('#breed').value,view:document.querySelector('#view').value,optionDisabled:document.querySelector('#view option[value="motifs"]').disabled,title:document.querySelector('#title').textContent})))+' errors='+JSON.stringify(errors));
  }
 }
 await page.selectOption('#breed','Labrador');await loaded();
 if(await page.locator('#view').inputValue()!=='signs'||await page.locator('#form').isDisabled())throw Error('Dog selection did not return to sign view');
 await page.selectOption('#breed','Britisch Kurzhaar');await page.selectOption('#view','motifs');await loaded();
 await page.screenshot({path:path.join(root,'galerie-vorschau.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await loaded();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Gallery overflows mobile viewport');
 const report={breeds:breeds.length,signSheetsLoaded:signs,motifSheetsLoaded:motifs,mobileWidth:390,errors};
 if(breeds.length!==30||signs!==95||motifs!==25||errors.length)throw Error(JSON.stringify(report));
 fs.mkdirSync(path.join(root,'pruefung'),{recursive:true});fs.writeFileSync(path.join(root,'pruefung/galerie.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser.close();}
