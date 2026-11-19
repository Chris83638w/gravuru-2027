// Customer-facing controls only. The test host never contacts Shopify.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const out = path.resolve(process.argv[2] || 'beta-actions');
const photo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAIElEQVR4nGM0Lp/JgA0wYRWlUOJMIIplCAmT9emU2QEA60kEUyzU9KoAAAAASUVORK5CYII=','base64');

async function capture(cdp, name) {
  const dir=path.join(out,name+'-frames');
  fs.mkdirSync(dir,{recursive:true});
  const frames=[];
  const handler=async ({data,metadata,sessionId})=>{
    await cdp.send('Page.screencastFrameAck',{sessionId}).catch(()=>{});
    const time=metadata.timestamp;
    if(!Number.isFinite(time) || frames.length && time-frames.at(-1).time<0.15) return;
    const file=String(frames.length).padStart(4,'0')+'.jpg';
    frames.push({time,file});
    fs.writeFileSync(path.join(dir,file),Buffer.from(data,'base64'));
  };
  cdp.on('Page.screencastFrame',handler);
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:70,maxWidth:970,maxHeight:780});
  return async()=>{await cdp.send('Page.stopScreencast');cdp.off('Page.screencastFrame',handler);fs.writeFileSync(path.join(dir,'frames.json'),JSON.stringify(frames));};
}

async function acrylicFlow(page,device,saveEvidence) {
  await page.goto('http://127.0.0.1:18267/?produkt=acryl',{waitUntil:'domcontentloaded'});
  const iframe=page.frameLocator('iframe');
  const tab=key=>iframe.locator('[data-demo-section="'+key+'"]:visible').first();
  await tab('text').click();
  const field=iframe.locator('textarea[data-ux-text]:visible').first();
  await field.fill('Muster 267');
  await field.press('Tab');
  await tab('upload').click();
  const start=performance.now();
  await iframe.locator('[data-ux-file]').setInputFiles({name:'synthetische-probe.png',mimeType:'image/png',buffer:photo});
  const frame=page.frames().find(f=>f!==page.mainFrame());
  await frame.waitForFunction(()=>document.querySelector('gravuru-configurator').state.objects.some(o=>o.uxUploadId),{},{timeout:15000});
  const photoMs=performance.now()-start;
  await iframe.locator('.completion-finish:visible').first().click();
  const button=iframe.locator('[data-shop-cart]:visible').first();
  await button.waitFor({state:'visible',timeout:12000});
  const saveStart=performance.now();
  await button.click();
  try {
    await page.locator('#downloads').waitFor({state:'visible',timeout:45000});
  } catch(error) {
    throw Error((await iframe.locator('[data-shop-cart-status]').textContent())||error.message);
  }
  const draftMs=performance.now()-saveStart;
  assert.match(await page.locator('#status').innerText(),/Prüfstand [0-9]+ gesichert/);
  const exportMs={};
  for (const format of ['svg','kontur','druck','zip']) {
    const started=performance.now();
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('[data-format="'+format+'"]').click()]);
    assert.equal(await download.failure(),null);
    const data=fs.readFileSync(await download.path());
    assert.ok(data.length>50);
    if(format==='kontur'||format==='druck')assert.equal(data.subarray(0,5).toString(),'%PDF-');
    if(format==='svg')assert.match(data.toString(),/<svg\b/);
    if(format==='zip')assert.equal(data.subarray(0,2).toString(),'PK');
    exportMs[format]=performance.now()-started;
  }
  if(saveEvidence)await page.screenshot({path:path.join(out,device+'-Dateien.png')});
  return {photoMs,draftMs,exportMs};
}

async function main(){
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.env.CHROME267?{executablePath:process.env.CHROME267}:{})});
  const runs=Number(process.env.BETA_RUNS||3);
  const rows=[];
  try {
    for(let run=1;run<=runs;run++)for(const device of ['PC','Mobil']){
      const mobile=device==='Mobil';
      const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:900},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,locale:'de-DE',acceptDownloads:true});
      try{
        const page=await ctx.newPage(),cdp=await ctx.newCDPSession(page);
        await cdp.send('Network.enable');await cdp.send('Network.clearBrowserCache');
        await cdp.send('Emulation.setCPUThrottlingRate',{rate:mobile?4:1});
        for(const cache of ['kalt','warm']){
          const record=run===1&&cache==='warm'&&process.env.BETA_FILM==='1';
          const stop=record?await capture(cdp,device):null;
          try{
            const timing=await acrylicFlow(page,device,run===1&&cache==='warm');
            rows.push({run,device,cache,recorded:record,...timing});
            fs.writeFileSync(path.join(out,'acryl.json'),JSON.stringify(rows,null,2));
          }finally{if(stop)await stop();}
        }
      }finally{await ctx.close();}
    }
  }finally{await browser.close();}
  console.log(rows.length+' Fotowege mit wieder gelesenen SVG-, PDF- und Entwurfsdateien.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
