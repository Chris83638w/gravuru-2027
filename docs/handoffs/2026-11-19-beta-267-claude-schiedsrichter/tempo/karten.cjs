// Claude · Designkarten: Zeit bis die wirklich sichtbaren Karten gezeichnet sind (nach Öffnen und nach Scrollen ans Ende).
// Aufruf: node karten.cjs <Port> <Ausgabe.json> [--drossel] [--sparen] [--pc] [--runs=3]
const {chromium}=require('playwright');const fs=require('node:fs');
const args=process.argv.slice(2),port=args[0],out=args[1],drossel=args.includes('--drossel'),sparen=args.includes('--sparen'),pc=args.includes('--pc');
const runs=Number((args.find(a=>a.startsWith('--runs='))||'--runs=3').split('=')[1]);
(async()=>{const browser=await chromium.launch({channel:'chrome'});const result={port,drossel,sparen,pc,runs:[]};
 for(let run=1;run<=runs;run++){
  const context=await browser.newContext({viewport:pc?{width:1365,height:900}:{width:390,height:844},isMobile:!pc,hasTouch:!pc,deviceScaleFactor:1,locale:'de-DE'});const page=await context.newPage();page.setDefaultTimeout(120000);
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
  if(sparen)await cdp.send('Emulation.setDataSaverOverride',{dataSaverEnabled:true});
  if(drossel){await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:0.75*1024*1024/8});}
  const row={run};result.runs.push(row);
  try{
   const t0=performance.now();await page.goto('http://127.0.0.1:'+port+'/?produkt=ring',{waitUntil:'domcontentloaded'});const fl=page.frameLocator('iframe');
   await fl.locator('[data-demo-section="text"]:visible').first().waitFor();row.editor=performance.now()-t0;
   row.saveData=await page.evaluate(()=>navigator.connection?.saveData??null);
   await fl.locator('[data-demo-section="design"]:visible').first().click();const frame=page.frames().find(f=>f!==page.mainFrame());
   const warte=scroll=>frame.evaluate(async scroll=>{const start=performance.now();const root=document.querySelector('gravuru-configurator').shadowRoot;const all=()=>[...root.querySelectorAll('[data-c-design]')];
     if(scroll)all().at(-1).scrollIntoView({block:'end'});
     const sichtbar=c=>{const r=c.getBoundingClientRect();if(!r.width||!r.height)return false;const e=root.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!e&&(e===c||c.contains(e));};
     const fertig=c=>{const s=c.querySelector('svg'),label=(c.getAttribute('aria-label')||'').replace(/^Design /,'');return !!s&&s.getAttribute('aria-label')===label&&!!s.querySelector('path');};
     let erste=null;
     for(;;){await new Promise(r=>requestAnimationFrame(r));const v=all().filter(sichtbar);const n=v.filter(fertig).length;if(n&&erste===null)erste=performance.now()-start;
       if(v.length&&n===v.length){await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {ms:performance.now()-start,ersteMs:erste,sichtbar:v.length,fertig:n,karten:v.map(c=>c.getAttribute('data-c-design'))};}
       if(performance.now()-start>20000)return {ms:null,ersteMs:erste,sichtbar:v.length,fertig:n,karten:v.map(c=>c.getAttribute('data-c-design')+(fertig(c)?'':' (leer)'))};}},scroll);
   row.oeffnen=await warte(false);row.scrollen=await warte(true);
   if(run===1)await page.screenshot({path:out.replace(/\.json$/,'.png')});
  }catch(e){row.fehler=String(e.message).split('\n')[0].slice(0,200);}
  await context.close();const k=x=>x&&{ms:x.ms===null?null:Math.round(x.ms),erste:x.ersteMs===null?null:Math.round(x.ersteMs),fertig:x.fertig+'/'+x.sichtbar};
  console.log(JSON.stringify({run,editor:Math.round(row.editor||0),saveData:row.saveData,oeffnen:k(row.oeffnen),scrollen:k(row.scrollen),fehler:row.fehler}));}
 fs.writeFileSync(out,JSON.stringify(result,null,1));await browser.close();})();
