const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const plans=JSON.parse(fs.readFileSync(process.env.SLATE_PLAN||'../slate-package-v4/shopify-plan.json'));
 const p=plans.find(p=>p.sizeKey==='GT-SN-RE-220X140');
 const out='../slate-review-6625312189';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8978/?configuration='+p.productId+'&revision=1',{waitUntil:'networkidle',timeout:120000});
  const frame=page.frames().find(f=>f.url().endsWith('/editor.html')),root=frame.locator('gravuru-configurator');
  await root.locator('[data-slate-accessory="silikon"]').waitFor({state:'visible',timeout:120000});
  const tiles=root.locator('[data-slate-accessory]');assert.equal(await tiles.count(),3);
  await root.locator('[data-picture-option="AH02"]').click();
  const gold=root.locator('[data-picture-group="ah-farbe-2"][data-picture-option="gold"]');await gold.click();
  assert.equal(await gold.locator('.m-slate-images small').count(),0);
  await root.locator('[data-slate-accessory="silikon"]').click();
  assert.match(await root.locator('[data-fk-total]').innerText(),/35,97/);
  await root.locator('[data-slate-accessory="staender-klar"]').click();
  assert.match(await root.locator('[data-fk-total]').innerText(),/49,96/);
  assert.equal(await root.locator('[data-slate-accessory][aria-pressed="true"]').count(),2);
  await root.locator('[aria-label="Zubehör · Mehrfachauswahl"]').screenshot({path:out+'/zubehoer-drei-kacheln.png'});
  await gold.locator('..').screenshot({path:out+'/abstandshalter-farben.png'});
  await page.screenshot({path:out+'/zubehoer-kacheln.png',fullPage:true});
  await root.locator('[data-slate-accessory="silikon"]').click();await root.locator('[data-slate-accessory="staender-klar"]').click();
  await root.locator('[data-picture-option="K00"]').click();
  await root.locator('#ux-tab-design').click();
  await root.locator('[data-c-design="katalog-GT-S-22x14-D200"]').click();
  assert.match(await root.locator('[data-fk-total]').innerText(),/28,99/);
  await root.locator('#ux-tab-upload').click();
  const photo='../gravuru-schiefer-katalog/materialien/zubehoer/bilder/vorlage-foto-hund.jpg';
  await root.locator('[data-ux-file]').setInputFiles(photo);
  await root.locator('[data-photo-background][value="remove"]').waitFor({state:'visible',timeout:30000});
  assert.match(await root.locator('[data-fk-total]').innerText(),/28,99/);
  for(const mode of ['remove','keep']){
   await root.locator('[data-photo-background][value="'+mode+'"]').check();
   await root.evaluate(el=>{el.state.selected=null;el.sync();});
   await root.locator('.ux-preview .scene').screenshot({path:out+'/fotogravur-'+mode+'.png'});
   await page.screenshot({path:out+'/hintergrund-'+mode+'.png',fullPage:true});
  }
  const render=await root.evaluate(el=>{const s=el.shadowRoot.querySelector('.scene');return {template:el.state.designId,photo:el.state.objects.filter(o=>o.uxUploadId).map(o=>({type:o.type,shape:o.photoShape,background:o.uxPhotoBackground})),engraving:!!s.querySelector('[data-photo-preview-treatment="engraving"]'),masked:!!s.querySelector('[clip-path],[mask]')};});
  await root.locator('[data-ux-file]').setInputFiles('../gravuru-schiefer-katalog/materialien/zubehoer/bilder/vorlage-foto-mensch.jpg');
  await root.locator('.ux-upload-row').nth(1).waitFor({state:'visible',timeout:30000});
  assert.match(await root.locator('[data-fk-total]').innerText(),/38,98/);
  await page.screenshot({path:out+'/zwei-fotos-3898.png',fullPage:true});
  assert.deepEqual(errors,[]);
  const report={sourceComment:6625312189,accessoryTiles:3,multipleSelected:2,accessoryPriceCents:4996,photoTemplate:'GT-S-22x14-D200',onePhotoCents:2899,twoPhotosCents:3898,backgroundModes:['remove','keep'],backgroundRemoval:'Werkstattauftrag vor Fertigung; unveränderte Originalvorschau',render,errors};
  fs.writeFileSync(out+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
