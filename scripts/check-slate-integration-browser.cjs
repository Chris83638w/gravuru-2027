const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{gunzipSync}=require('node:zlib');
const {chromium}=require('playwright');
const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1];
for(const k of ['--proof','--bundle','--out','--url'])assert(args.includes(k),k+' required');
(async()=>{
 const proof=JSON.parse(fs.readFileSync(arg('--proof'))),bundle=JSON.parse(gunzipSync(fs.readFileSync(arg('--bundle'))));
 const p=bundle.products[0],saved=proof.first.products[0],out=path.resolve(arg('--out'));fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-proxy-server']});const checks=[];
 try{for(const device of ['desktop','mobile']){
  const context=await browser.newContext(device==='mobile'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:1000}});
  const page=await context.newPage(),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
  await page.goto(arg('--url')+'/?configuration='+saved.id+'&revision='+saved.revision,{waitUntil:'networkidle',timeout:120000});
  const frame=page.frames().find(f=>f.url().endsWith('/editor.html'));assert(frame);
  const root=frame.locator('gravuru-configurator');
  const designButton=root.locator(device==='mobile'?'[data-ux="mobile-step"][data-step="design"]':'#ux-tab-design');
  try{await designButton.waitFor({state:'visible',timeout:30000});}catch(e){
   const debug=await root.evaluate(el=>({state:el.state?.designId,ids:el.catalog?.designs?.map(d=>d.id),configId:el.config?.profile?.id,text:el.shadowRoot?.textContent?.slice(-3000)}));
   fs.writeFileSync(path.join(out,device+'-failure.json'),JSON.stringify({errors,failed,debug},null,2));
   await page.screenshot({path:path.join(out,device+'-failure.png'),fullPage:true});throw e;
  }
  const state=await root.evaluate(el=>({designId:el.state.designId,ids:el.catalog.designs.map(d=>d.id)}));
  assert.equal(state.designId,p.defaultDesignId);assert.equal(state.ids.length,82);
  await designButton.click();assert.equal(await root.locator('[data-c-design]').count(),82);
  await page.screenshot({path:path.join(out,device+'-galerie.png'),fullPage:true});
  const mounting=root.locator('[data-picture-group="mounting"][data-picture-option="AH02"]');
  if(!await mounting.isVisible())await root.locator(device==='mobile'?'[data-ux="mobile-step"][data-step="options"]':'#ux-tab-options').click();
  await mounting.click();await root.locator('[data-picture-group="ah-farbe-2"][data-picture-option="gold"]').click();
  await root.locator('[data-slate-accessory="silikon"]').click();
  const variant=p.variants.find(v=>v.options.mounting==='AH02'&&v.options['ah-farbe-2']==='gold');assert(variant);
  const expectedCents=variant.priceCents+699,total=await root.locator(device==='mobile'?'[data-ux-mobile-total]':'[data-fk-total]').innerText();
  assert(total.includes((expectedCents/100).toFixed(2).replace('.',',')),total+' != '+expectedCents);
  await page.screenshot({path:path.join(out,device+'-zubehoer.png'),fullPage:true});
  assert.deepEqual(errors,[]);checks.push({device,designId:state.designId,designs:82,expectedCents,displayedTotal:total,errors});await context.close();
 }}finally{await browser.close();}
 const report={localOnly:true,productId:saved.id,revision:saved.revision,checks,shopifyWrites:0,realCartChecked:false};
 fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
