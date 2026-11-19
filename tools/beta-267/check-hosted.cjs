// Exercises the shared cart and drawer through the normal R15 controls. Use only synthetic input.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const [origin,output] = process.argv.slice(2);
const hosted = origin === 'https://konfi-beta.gravuru-designwerkstatt.de';
assert.ok(output && (hosted || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)));
const repetitions = Number(process.env.BETA_CART_RUNS || 3);
assert.ok(Number.isInteger(repetitions)&&repetitions>=1&&repetitions<=10);
const photo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAIElEQVR4nGM0Lp/JgA0wYRWlUOJMIIplCAmT9emU2QEA60kEUyzU9KoAAAAASUVORK5CYII=','base64');
const results = [];
const report = {origin,repetitions,started:new Date().toISOString(),network:'ohne künstliche Drosselung',results};
report.saveData=process.env.BETA_SAVE_DATA==='1';
report.mobileThrottle=process.env.BETA_MOBILE_THROTTLE==='1'?{rttMs:80,downMbps:8,upMbps:2,cpu:4}:null;
if(report.mobileThrottle)report.network='PC ungedrosselt, Mobil gemäß mobileThrottle';
const store = ()=>fs.writeFileSync(path.join(output,'Protokoll.json'),JSON.stringify(report,null,2)+'\n');
const elapsed = start=>Math.round(performance.now()-start);

async function devicePhotoReference(frame) {
  return frame.evaluate(async()=>{
    const el=document.querySelector('gravuru-configurator');
    const svg=new DOMParser().parseFromString(el.svg(),'image/svg+xml').documentElement;
    const photo=Array.from(svg.querySelectorAll('image')).find(n=>/^\/doorbell-assets\//.test(n.getAttribute('href')));
    if(!photo)throw Error('Das gebundene Ring-Originalbild fehlt im Editor.');
    const image=new Image();image.src=photo.getAttribute('href');await image.decode();
    const canvas=document.createElement('canvas');
    canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const [ox,oy,width,height]=svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const read=k=>Number(photo.getAttribute(k));const scale=Math.min(read('width')/canvas.width,read('height')/canvas.height);
    const x0=read('x')+(read('width')-canvas.width*scale)/2;
    const y0=read('y')+(read('height')-canvas.height*scale)/2;
    const samples=[];
    for(let y=2;y<canvas.height-2;y+=3)for(let x=2;x<canvas.width-2;x+=3){
      const i=(y*canvas.width+x)*4;
      const [r,g,b,a]=data.subarray(i,i+4);
      if(a>245 && b-r>40 && g-r>18 && b>85)samples.push([(x0+(x+.5)*scale-ox)/width,(y0+(y+.5)*scale-oy)/height,r,g,b]);
    }
    if(samples.length<24)throw Error('Zu wenige markante Bildpunkte im Ring-Original.');
    return Array.from({length:24},(_,i)=>samples[Math.floor(i*samples.length/24)]);
  });
}
async function checkDevicePhoto(image,samples){
  const matched=await image.evaluate((img,points)=>{
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
    const data=ctx.getImageData(0,0,c.width,c.height).data;
    return points.filter(([x,y,r,g,b])=>{
      const i=(Math.floor(y*c.height)*c.width+Math.floor(x*c.width))*4;
      return data[i+2]-data[i]>20 && Math.max(Math.abs(data[i]-r),Math.abs(data[i+1]-g),Math.abs(data[i+2]-b))<52;
    }).length;
  },samples);
  assert.ok(matched>=17,'Ring-Gerätefoto im gespeicherten Bild: '+matched+'/24 Merkmale');
  return matched;
}
async function checkOriginalAngle(image,expected){
  // Ring 16 × 28, K00. The verified source 994bd7bd has the path M22 87 H138 V237.
  const counts=await image.evaluate(img=>{
    const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const bright=(x,y,vertical)=>{
      const col=Math.round((x+8)*canvas.width/176),row=Math.round((y+8)*canvas.height/296);
      for(let d=-2;d<=2;d++){
        const idx=((row+(vertical?0:d))*canvas.width+col+(vertical?d:0))*4;
        if(Math.min(data[idx],data[idx+1],data[idx+2])>112)return true;
      }
      return false;
    };
    return {horizontal:Array.from({length:16},(_,i)=>bright(40+i*4,87,false)).filter(Boolean).length,
      vertical:Array.from({length:16},(_,i)=>bright(138,112+i*6,true)).filter(Boolean).length};
  });
  if(expected)assert.ok(counts.horizontal>=14&&counts.vertical>=14,'Originalwinkel fehlt: '+JSON.stringify(counts));
  else assert.ok(counts.horizontal<=2&&counts.vertical<=2,'Fremder Originalwinkel: '+JSON.stringify(counts));
  return counts;
}

async function verifyImages(scope,expected) {
  const imgs = scope.locator('article .image-box img');
  await imgs.nth(expected-1).waitFor({state:'visible',timeout:60000});
  return imgs.evaluateAll(async images=>{
    const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
    const result=[];
    for (const img of images) {
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
      const pixels=await sha(ctx.getImageData(0,0,canvas.width,canvas.height).data);
      const blob=window.proofImageBlobs.get(img.currentSrc);
      if (!blob || blob.type!=='image/png') throw Error('Das tatsächlich angezeigte PNG fehlt.');
      result.push({w:canvas.width,h:canvas.height,png:await sha(await blob.arrayBuffer()),pixels,alt:img.alt});
    }
    return result;
  });
}
async function run(browser,device,viewport,runNo) {
  const mobile=device==='Mobil';
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,locale:'de-DE',...(hosted?{httpCredentials:{username:'astra',password:process.env.BETA_REVIEW_PASSWORD,origin}}:{})});
  const page=await context.newPage();page.setDefaultTimeout(18000);
  if(mobile && report.mobileThrottle){
    const cdp=await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:1000000,uploadThroughput:250000});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  }
  const phases=process.env.BETA_PHASES==='1' ? await require('./customer-timing.cjs').captureCustomerTiming(context,page,{saveData:process.env.BETA_SAVE_DATA==='1'}) : null;
  // Record the exact Blob handed to the image element without a second image fetch or re-encoding.
  await page.addInitScript(()=>{
    const original=URL.createObjectURL.bind(URL);window.proofImageBlobs=new Map();
    URL.createObjectURL=blob=>{const url=original(blob);if(blob?.type==='image/png')window.proofImageBlobs.set(url,blob);return url;};
  });
  const row={device,viewport,run:runNo,timings:[],products:[],files:[]};results.push(row);
  const capture=name=>page.screenshot({path:path.join(output,device+'-'+name+'.png'),timeout:60000,animations:'disabled'});
  const frame=page.frameLocator('iframe');
  const tab=id=>frame.locator('[data-demo-section="'+id+'"]:visible').first();
  const errors=new Set();
  page.on('response',res=>{if(res.status()>=400&&res.status()!==401)errors.add(res.status()+' '+new URL(res.url()).pathname.replace(/[a-f0-9-]{20,}/gi,'ID'));});
  page.on('pageerror',e=>errors.add(e.message.slice(0,120)));
  async function enter(key) {
    await page.goto(origin+'/?produkt='+key,{waitUntil:'domcontentloaded'});
    await tab('text').waitFor({timeout:60000});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth)<=viewport.width+1);
    row.products.push(key);
  }
  async function field(id,value) {
    const target=frame.locator('textarea[data-ux-text="'+id+'"]');
    if (!await target.isVisible()) await frame.locator('[data-ux=select-content][data-id="'+id+'"]:visible').first().click();
    await target.fill(value);await target.press('Tab');assert.equal(await target.inputValue(),value);
  }
  async function save(count) {
    await frame.locator('.completion-finish:visible').first().click();
    const confirm=frame.locator('[data-shop-cart]:visible').first();
    await confirm.waitFor();const last=performance.now();await confirm.click();
    try {await page.waitForURL(u=>u.pathname==='/beta/cart',{timeout:60000,waitUntil:'domcontentloaded'});}
    catch(err){throw Error((await frame.locator('[data-shop-cart-status]').textContent({timeout:800}).catch(()=>''))||err.message);}
    await page.locator('#items article .image-box img').nth(count-1).waitFor({timeout:60000});
    await page.locator('#items article img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())).then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
    return elapsed(last);
  }
  const rows=page.locator('#items');
  const data=()=>page.evaluate(async()=> (await fetch('/beta-warenkorb',{headers:{'X-Beta-Cart':sessionStorage.getItem('gravuru-beta-cart')}})).json());
  const noEdit=async scope=>{
    assert.equal(await scope.getByRole('link',{name:/bearbeiten|weiter gestalten|editieren/i}).count(),0);
    assert.equal(await scope.getByRole('button',{name:/bearbeiten|weiter gestalten|editieren/i}).count(),0);
    assert.equal(await scope.locator('a[href*="config="],a[href*="/start?"],a[href*="gravuru_cart="]').count(),0);
  };
  try {
    let firstPng;let count=0;
    for(const person of [{name:'Nord',number:'12',design:'FK-SEITLICH'},{name:'Süd',number:'27',design:'FK-RUNDUM'}]){
      const begin=performance.now();await enter('ring');await tab('design').click();
      if(phases) {
        // Give the first real card a rendering opportunity before selecting a different design.
        await page.frames().find(f=>f!==page.mainFrame()).waitForFunction(()=>!!window.betaCardsPaint);
      }
      const card=frame.locator('[data-c-design="'+person.design+'"]:visible').first();
      if(await card.getAttribute('aria-pressed')!=='true')await card.click();
      await frame.locator('[data-c-design="'+person.design+'"][aria-pressed=true]').first().waitFor({state:'attached'});
      const entryMs=elapsed(begin);
      await tab('text').click();await field('name','Haus');await field('quote',person.name);await field('number',person.number);
      const deviceReference=await devicePhotoReference(page.frames().find(f=>f!==page.mainFrame()));
      if(runNo===1&&count===0)await capture('Editor');
      const confirmMs=await save(++count);
      let trace;
      if(phases) {
        await page.waitForFunction(()=>!!window.betaCartPaint);
        trace=await phases();
        assert.ok(trace.events.some(e=>e.kind==='Erste sichtbare Designkarte'),'Erste gezeichnete Karte fehlt');
        assert.ok(trace.events.some(e=>e.kind==='Designwechsel'),'Gezeichneter Designwechsel fehlt');
      }
      const fullMs=elapsed(begin);
      const pics=await verifyImages(rows,count);const cart=await data();
      const deviceMatches=await checkDevicePhoto(rows.locator('.image-box img').nth(count-1),deviceReference);
      const angle=await checkOriginalAngle(rows.locator('.image-box img').nth(count-1),person.design==='FK-RUNDUM');
      assert.equal(cart.items.length,count);assert.equal(cart.totalCents,4999*count);
      assert.match(cart.items.at(-1).lettering,new RegExp(person.name));assert.equal(cart.items.at(-1).quantity,1);
      assert.deepEqual(pics.map(p=>p.png),cart.items.map(i=>i.imageSha256));
      assert.ok(pics.every(p=>p.w>150&&p.h>150));
      if(count===1)firstPng=pics[0].png;
      if(count===2) {
        assert.equal(cart.items[0].variant,'57471227756924');assert.equal(cart.items[0].variant,cart.items[1].variant);
        assert.ok(cart.items[0].sku && cart.items[1].sku===cart.items[0].sku);assert.notEqual(cart.items[0].id,cart.items[1].id);
        assert.equal(pics[0].png,firstPng);assert.notEqual(pics[0].pixels,pics[1].pixels);
        row.pictures=pics;row.variant=cart.items[0].variant;row.sku=cart.items[0].sku;row.totalCents=cart.totalCents;
      }
      row.timings.push({context:count===1?'kalt':'warm',entryThroughDesignMs:entryMs,confirmThroughDecodedPaintMs:confirmMs,entryThroughDecodedPaintWithAutomatedInputMs:fullMs,deviceImageSamplesMatched:deviceMatches,deviceImageSamples:24,angle,...(trace?{trace}:{})});
    }
    await noEdit(rows);assert.match(await page.locator('#sum').innerText(),/99,98/);
    if(runNo===1)await capture('Warenkorb');
    await page.getByRole('button',{name:'Kurzansicht'}).click();
    const drawer=page.getByRole('dialog');await noEdit(drawer);
    const drawerPics=await verifyImages(drawer,2);assert.deepEqual(drawerPics,row.pictures);
    if(runNo===1)await capture('Kurzansicht');
    const [popup]=await Promise.all([context.waitForEvent('page'),drawer.locator('.image-box a').last().click()]);
    await popup.locator('img').waitFor();assert.ok(await popup.locator('img').evaluate(i=>i.naturalWidth)>150);await popup.close();
    const removeAt=runNo%2?drawer:rows;
    if(removeAt===rows)await drawer.getByRole('button',{name:'Schließen'}).click();
    await removeAt.locator('article').filter({hasText:'Nord'}).getByRole('button',{name:'Entfernen'}).click();
    await page.waitForFunction(()=>document.querySelectorAll('#items article').length===1);
    await page.reload({waitUntil:'domcontentloaded'});
    const remaining=await verifyImages(rows,1);assert.equal(remaining[0].png,row.pictures[1].png);
    assert.match(await rows.innerText(),/Süd/);assert.match(await page.locator('#sum').innerText(),/49,99/);
    row.removal='Nord entfernt, Süd mit identischer Vorschau nach Neuladen';
    if(runNo===1 && process.env.BETA_RING_ONLY!=='1') {
      for(const key of ['heimathafen','schiefer','acryl'])await enter(key);
      await tab('upload').click();
      await frame.locator('[data-ux-file]').setInputFiles({name:'Testfoto.png',mimeType:'image/png',buffer:photo});
      await page.frames().find(f=>f!==page.mainFrame()).waitForFunction(()=>document.querySelector('gravuru-configurator').state.objects.some(o=>o.uxUploadId));
      await save(2);
      await page.getByRole('link',{name:'Prüfdateien',exact:true}).click();
      const artwork=rows.locator('article').filter({has:page.getByRole('button',{name:'Druck-PDF',exact:true})});
      for(const [label,format] of [['SVG','svg'],['Kontur-PDF','pdf'],['Druck-PDF','pdf'],['Entwurf und Originale','zip']]) {
        const [download]=await Promise.all([page.waitForEvent('download',{timeout:60000}),artwork.getByRole('button',{name:label,exact:true}).click()]);
        assert.equal(await download.failure(),null);const bytes=fs.readFileSync(await download.path());
        if(format==='svg')assert.match(bytes.toString(),/<svg\b/);
        else assert.ok(bytes.subarray(0,format==='pdf'?5:2).equals(Buffer.from(format==='pdf'?'%PDF-':'PK')));
        row.files.push({label,bytes:bytes.length});
      }
    }
    assert.deepEqual([...errors],[]);row.passed=true;
  } catch(error){row.error=error.message.split('\n')[0].slice(0,270);row.responses=[...errors];process.exitCode=1;
    await page.screenshot({path:path.join(output,device+'-Pruefstelle.png')}).catch(()=>{});
  } finally{store();await context.close();console.log(device,runNo,row.passed?'bestanden':row.error);}
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:process.env.BETA_CHROME_CHANNEL||'chrome'});report.browser=browser.version();
 try{for(let i=1;i<=repetitions;i++)for(const [device,viewport] of Object.entries({PC:{width:1365,height:900},Mobil:{width:390,height:844}})){
   if (!process.env.BETA_DEVICE || device===process.env.BETA_DEVICE) await run(browser,device,viewport,i);
 }}
 finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
