// Run only against the local acceptance host. No Shopify order or cart requests are sent.
const {chromium}=require('playwright');
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const port=Number(process.argv[2]||18267),out=path.resolve(process.argv[3]||'warenkorb-belege');
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Lokalen Port angeben.');
const origin='http://127.0.0.1:'+port, runs=Number(process.env.BETA_CART_RUNS||3);
const samples=[];
const buyers=[{design:'FK-SEITLICH',name:'Wagner',number:'12'},{design:'FK-RUNDUM',name:'König',number:'27'}];
const devices={PC:{width:1365,height:900},Mobil:{width:390,height:844}};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

async function add(page,buyer){
 const started=performance.now(),url=origin+'/?produkt=ring';
 await page.goto(url,{waitUntil:'domcontentloaded'});
 const frame=page.frameLocator('iframe');
 const tab=id=>frame.locator('[data-demo-section='+id+']:visible').first();
 await tab('design').click();const card=frame.locator('[data-c-design="'+buyer.design+'"]');
 if(await card.getAttribute('aria-pressed')!=='true')await card.click();
 await frame.locator('[data-c-design="'+buyer.design+'"][aria-pressed=true]').waitFor({state:'attached'});
 const readyMs=Math.round(performance.now()-started);
 await tab('text').click();
 for(const [id,text] of [['name','Familie'],['quote',buyer.name],['number',buyer.number]]){
  const field=frame.locator('textarea[data-ux-text="'+id+'"]');
  if(!await field.isVisible())await frame.locator('[data-ux=select-content][data-id="'+id+'"]:visible').first().click();
  await field.fill(text);await field.press('Tab');assert.equal(await field.inputValue(),text);
 }
 await frame.locator('.completion-finish:visible').first().click();
 const confirm=frame.locator('[data-shop-cart]:visible').first();await confirm.waitFor({state:'visible',timeout:12000});
 const last=performance.now();await confirm.click();
 try{await page.waitForURL(origin+'/beta-warenkorb',{timeout:45000});}catch(e){
  const message=await frame.locator('[data-shop-cart-status]').textContent().catch(()=>'');
  throw Error('Übergabe: '+message+' '+e.message.split('\n')[0]);
 }
 const rows=page.locator('li[data-position]');await rows.last().waitFor();
 await page.waitForFunction(()=>{const images=[...document.querySelectorAll('li[data-position] img')];return images.length>0&&images.every(img=>!img.hidden&&img.complete&&img.naturalWidth>0);},{},{timeout:12000});
 await rows.evaluateAll(nodes=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return {lastClickToPaintMs:Math.round(performance.now()-last),startThroughChosenDesignMs:readyMs};
}

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME267?{executablePath:process.env.CHROME267}:{})});
 try{
  for(const [device,viewport] of Object.entries(devices))for(let run=1;run<=runs;run++){
   const ctx=await browser.newContext({viewport,isMobile:device==='Mobil',hasTouch:device==='Mobil',deviceScaleFactor:1,locale:'de-DE'});
   try{
    const page=await ctx.newPage();page.setDefaultTimeout(12000);
    const timings=[];for(const person of buyers)timings.push(await add(page,person));
    const client=await (await ctx.request.get(origin+'/beta-warenkorb/daten')).json();
    assert.equal(client.items.length,2);assert.equal(client.totalCents,9998);
    const [one,two]=client.items;assert.equal(one.variant,two.variant);assert.equal(one.variant,'57471227756924');
    assert.notEqual(one.key,two.key);assert.notEqual(one.image,two.image);assert.notEqual(one.sourceImageSha256,two.sourceImageSha256);
    for(const [index,item] of client.items.entries()){
     assert.equal(item.revision,1);assert.equal(item.quantity,1);assert.equal(item.unitCents,4999);
     assert.ok(item.text.includes(buyers[index].name));assert.ok(item.text.endsWith(buyers[index].number));assert.ok(!item.text.includes(buyers[1-index].name));
     const row=page.locator('li[data-position="'+item.key+'"]'),img=row.locator('img');
     assert.equal(new URL(await img.getAttribute('src'),origin).pathname,item.image);
     const response=await ctx.request.get(origin+item.image);assert.equal(response.status(),200);
     assert.equal(digest(await response.body()),item.sourceImageSha256);
    }
    assert.equal(await page.locator('a').count(),0);
    assert.equal(await page.getByRole('button',{name:/bearbeiten|weiter gestalten/i}).count(),0);
    if(run===1)await page.screenshot({path:path.join(out,device+'-Warenkorb.png'),fullPage:true});
    await page.getByRole('button',{name:/Vorschau vergrößern.*König/i}).click();
    assert.equal(new URL(await page.locator('dialog img').getAttribute('src'),origin).pathname,two.image);
    assert.equal(await page.locator('dialog input, dialog textarea').count(),0);
    await page.getByRole('button',{name:'Schließen'}).click();
    await page.getByRole('button',{name:/entfernen.*Wagner/i}).click();
    await page.waitForFunction(()=>document.querySelectorAll('li[data-position]').length===1);
    const left=await (await ctx.request.get(origin+'/beta-warenkorb/daten')).json();
    assert.equal(left.totalCents,4999);assert.equal(left.items[0].key,two.key);assert.equal(left.items[0].sourceImageSha256,two.sourceImageSha256);
    samples.push({device,run,timings,variant:one.variant,unitCents:4999,totalCents:9998,revisions:[one.revision,two.revision],differentImages:true,fileChecksumsMatch:true,removePreservesSecond:true});
    fs.writeFileSync(path.join(out,'messwerte.json'),JSON.stringify({mode:'Isolierter R15 mit echten Entwürfen, Warenkorbangeboten und persönlichen PNGs, lokaler Transport',samples},null,2));
    console.log(device,run,timings.map(v=>v.lastClickToPaintMs).join('/'));
   }finally{await ctx.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
