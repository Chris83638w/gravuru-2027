// Native customer UI and main-image audit against the generated plan.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {chromium}=require('playwright');
const args=process.argv.slice(2),arg=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const data=path.resolve(arg('--data','../slate-product-groups')),out=path.resolve(arg('--out',path.join(data,'browser-review'))),url=arg('--url','http://127.0.0.1:8984');
(async()=>{
 fs.mkdirSync(out,{recursive:true});const plans=JSON.parse(fs.readFileSync(path.join(data,'shopify-plan.json'))),checks=[];
 assert.ok(plans.length,'Prepared products required');const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const p of plans){
   await page.goto(url+'/?configuration='+p.productId+'&revision='+p.revision,{waitUntil:'networkidle',timeout:120000});
   const frame=page.frames().find(f=>f.url().endsWith('/editor.html'));assert.ok(frame,'Native editor frame');
   const root=frame.locator('gravuru-configurator');await root.waitFor({state:'visible',timeout:60000});
   await root.locator('#ux-tab-design').waitFor({state:'visible',timeout:60000});
   const state=await root.evaluate(el=>({designId:el.state.designId,ids:el.catalog.designs.map(d=>d.id)}));
   assert.equal(state.designId,p.defaultDesignId,p.handle+' starts with its main image');
   const cards=root.locator('[data-c-design]');await root.locator('#ux-tab-design').click();
   assert.equal(await cards.count(),p.designIds.length,p.handle+' has only its own gallery');
   assert.deepEqual((await cards.evaluateAll(els=>els.map(e=>e.dataset.cDesign))).sort(),state.ids.sort());
   const svg=fs.readFileSync(path.join(data,p.mainImage.file));assert.equal(createHash('sha256').update(svg).digest('hex'),p.mainImage.sha256);
   assert.equal(p.mainImage.designId,state.designId);
   if(checks.length===0||p.photoDesigns==='ohne'&&!checks.some(c=>c.photoDesigns==='ohne'))await page.screenshot({path:path.join(out,p.photoDesigns+'-foto-konfigurator.png'),fullPage:true});
   checks.push({handle:p.handle,designId:state.designId,designs:state.ids.length,photoDesigns:p.photoDesigns,mainImageHash:p.mainImage.sha256});
  }
  assert.deepEqual(errors,[]);
  const image=await browser.newPage({viewport:{width:1200,height:1200},deviceScaleFactor:1});
  for(const p of plans){
   const svg=fs.readFileSync(path.join(data,p.mainImage.file),'utf8');
   await image.setContent('<style>html,body{margin:0;width:1200px;height:1200px;background:white}body{display:flex;align-items:center;justify-content:center}svg{width:1120px;height:1120px}</style>'+svg);
   await image.waitForFunction(()=>[...document.images].every(i=>i.complete));
   await image.screenshot({path:path.join(data,'images',p.handle+'.png')});
  }
  fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({products:checks.length,checks,errors},null,2)+'\n');
  console.log(JSON.stringify({products:checks.length,mainImages:plans.length,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
