const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const [origin,out]=process.argv.slice(2);
assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin) && out);
const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAIElEQVR4nGM0Lp/JgA0wYRWlUOJMIIplCAmT9emU2QEA60kEUyzU9KoAAAAASUVORK5CYII=','base64');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const rows=[];
function pdfPages(bytes) {
  const inspect=[
    'import hashlib, json, sys, pymupdf',
    'doc=pymupdf.open(stream=sys.stdin.buffer.read(),filetype="pdf")',
    'print(json.dumps([{"mm":[round(page.rect.width*25.4/72,2),round(page.rect.height*25.4/72,2)],"drawingSha256":hashlib.sha256(page.read_contents()).hexdigest()} for page in doc]))'
  ].join('\n');
  return JSON.parse(execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',inspect],{input:bytes,windowsHide:true}));
}
async function drag(page,frame,type) {
  const result=await frame.evaluate(kind=>{
    const host=document.querySelector('gravuru-configurator'),root=host.shadowRoot;
    const state=host.state.objects;
    const visible=(x,y,id)=>root.elementFromPoint(x,y)?.closest('[data-object]')?.dataset.object===id;
    for(const obj of state.filter(o=>(kind==='photo'?!!o.uxUploadId:o.type===kind) && host.uxCanEdit?.(o,'move')!==false)) {
      const hit=root.querySelector('.scene [data-object="'+CSS.escape(obj.id)+'"]');
      if(!hit)continue;
      const box=hit.getBoundingClientRect();
      for (const y of [.51,.38,.63,.25,.75]) for(const x of [.51,.35,.65,.21,.79]){
        const cx=box.x+box.width*x,cy=box.y+box.height*y;
        if(visible(cx,cy,obj.id))return {id:obj.id,type:kind,x:obj.x,y:obj.y,point:[cx,cy]};
      }
    }
    return null;
  },type);
  assert.ok(result,'Kein verschiebbares Element über die sichtbare Fläche erreichbar: '+type);
  const f=await page.locator('iframe').boundingBox();
  const [x,y]=[f.x+result.point[0], f.y+result.point[1]];
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+14,y+8,{steps:7});await page.mouse.up();
  const end=await frame.evaluate(id=>{const o=document.querySelector('gravuru-configurator').state.objects.find(o=>o.id===id);return [o.x,o.y];},result.id);
  assert.ok(Math.hypot(end[0]-result.x,end[1]-result.y)>.15,'Bewegung wurde nicht übernommen: '+type);
  return {type,id:result.id,before:[result.x,result.y],after:end};
}
async function run(browser,key,reader,schemas,{resolvedOptions,choiceOptions}){
  const context=await browser.newContext({viewport:{width:1365,height:900},locale:'de-DE'});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const row={key,moves:[],exports:[]};rows.push(row);
  try{
    await page.goto(origin+'/?produkt='+key);
    const shell=page.frameLocator('iframe'),tab=k=>shell.locator('[data-demo-section="'+k+'"]:visible').first();
    await tab('text').waitFor();
    const frame=page.frames().find(f=>f!==page.mainFrame());
    if(key==='heimathafen') for(const kind of ['motif','text'])row.moves.push(await drag(page,frame,kind));
    else{
      await tab('upload').click();
      await shell.locator('[data-ux-file]').setInputFiles({name:'Farbprobe.png',mimeType:'image/png',buffer:photo});
      await frame.waitForFunction(()=>document.querySelector('gravuru-configurator').state.objects.some(o=>o.uxUploadId));
      if(key==='schiefer')row.moves.push(await drag(page,frame,'photo'));
    }
    const state=await frame.evaluate(()=>{const el=document.querySelector('gravuru-configurator');return {design:el.state.designId,options:el.state.mOptions};});
    await shell.locator('.completion-finish:visible').first().click();
    const confirm=shell.locator('[data-shop-cart]:visible').first();await confirm.click();
    await page.waitForURL(u=>u.pathname==='/beta/cart',{timeout:45000});
    await page.locator('#items article img').waitFor();await page.locator('#items article img').evaluate(i=>i.decode());
    const lines=await page.evaluate(async()=>(await fetch('/beta-warenkorb',{headers:{'X-Beta-Cart':sessionStorage.getItem('gravuru-beta-cart')}})).json());
    assert.equal(lines.items.length,1);const line=lines.items[0];assert.equal(line.product,key);
    await page.getByRole('link',{name:'Prüfdateien',exact:true}).click();
    const article=page.locator('#items article');await article.waitFor();
    const formats=await article.locator('[data-format]').evaluateAll(buttons=>buttons.map(b=>b.dataset.format));
    for(const format of formats) {
      const [download]=await Promise.all([page.waitForEvent('download'),article.locator('[data-format="'+format+'"]').click()]);
      assert.equal(await download.failure(),null);const bytes=fs.readFileSync(await download.path());
      if(format==='zip'){
        const {files,manifest}=reader(bytes,sha(bytes),schemas);
        const frozen=JSON.parse(files.get('produkt-und-gestaltung.json'));
        assert.equal(state.design,frozen.state.design.id,'Design im Fertigungspaket');
        const config=JSON.parse(files.get('konfigurator-quellen.json'));
        const chosen=resolvedOptions(config,state.options);
        assert.deepEqual(frozen.state.options,chosen,'Gültige Optionen im Fertigungspaket');
        assert.deepEqual(manifest.selection.options,choiceOptions(config,chosen),'Preisgebundene Auswahl');
        assert.equal(manifest.selection.price.unitCents,line.unitCents);assert.equal(lines.totalCents,manifest.selection.price.totalCents);
        assert.equal(sha(files.get('gestaltung-kundenansicht.png')),line.imageSha256);
        for(const move of row.moves){
          const object=frozen.state.design.objects.find(o=>o.id===move.id);assert.ok(object);
          assert.ok(Math.abs(move.after[0]-object.x)<=.011 && Math.abs(move.after[1]-object.y)<=.011,'Position im Prüfpaket abweichend');
        }
        if(key!=='heimathafen') {
          const original=[...files].find(([name])=>/^fotos\/\d+-original\.png$/.test(name));
          assert.ok(original);assert.deepEqual(original[1],photo);row.originalSha256=sha(original[1]);
        }
        row.unitCents=line.unitCents;row.geometryMm=[manifest.product.widthMm,manifest.product.heightMm];row.options=manifest.selection.options;
        row.method=manifest.product.method;row.productionReady=manifest.productionReady;row.rev=line.rev;row.previewSha256=line.imageSha256;
      }else if(format==='svg')assert.match(bytes.toString(),/<svg\b/);
      else assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
      const pages=['kontur','druck'].includes(format)?pdfPages(bytes):null;
      if(pages)assert.ok(pages.length>0 && pages.every(page=>page.mm.every(mm=>mm>0)));
      row.exports.push({format,bytes:bytes.length,sha256:sha(bytes),...(pages?{pages}:{})});
    }
    assert.ok(['zip','kontur','svg'].every(id=>formats.includes(id)));
    const contour=row.exports.find(file=>file.format==='kontur').pages;
    assert.equal(contour.length,1);
    assert.ok(contour[0].mm.every((value,index)=>Math.abs(value-row.geometryMm[index])<0.05),'Physisches Maß der Kontur-PDF');
    row.passed=true;
  }catch(e){row.error=e.message.slice(0,470);if(e.stack)row.step=e.stack.split('\n').find(line=>line.includes('check-material-cart.cjs:'))?.match(/check-material-cart\.cjs:\d+/)?.[0];process.exitCode=1;await page.screenshot({path:path.join(out,key+'-Pruefstelle.png')}).catch(()=>{});}
  finally{console.log(key,row.passed?'bestanden':row.error);fs.writeFileSync(path.join(out,'Materialpruefung.json'),JSON.stringify(rows,null,2)+'\n');await context.close();}
}
(async()=>{const {readReviewPackage}=await import('../../app/workshop/review-package.mjs');const {NATIVE_REVIEW_SCHEMAS}=await import('../../app/workshop/native-review-schema.mjs');const options=await import('../../app/configurator/variant-m/contract.mjs');fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({channel:'chrome'});try{for(const key of ['heimathafen','schiefer','acryl'])await run(b,key,readReviewPackage,NATIVE_REVIEW_SCHEMAS,options);}finally{await b.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
