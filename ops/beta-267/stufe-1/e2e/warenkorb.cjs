'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const beta = 'https://konfi-beta.gravuru-designwerkstatt.de';
const app = 'https://app-2027.gravuru-designwerkstatt.de';
const shop = 'https://gravuru-design.myshopify.com';
const betaEntry = beta+'/prio-stufe-1/';
const appFolder = '/konfi-demo/prio-claude-stufe1-267/';
const identifiers = {
  product: '16190784438652',
  variant: '58104606556540',
  sku: '156-GR-ES-AB-120X80-T15-K00',
  size: 'GR-ES-AB-120X80-T15',
  designBase: 'katalog-TAE-V2A-8x5-D',
  gross: 1999,
  productRevision: 4
};
const alternative=!process.argv.includes('--trennlinie');
const designs = [
  { number: 2, name: 'Berger', title: 'Zwei Zeilen, versetzt' },
  alternative ? {number:952,name:'Neumann',title:'Willkommen bei den … – Familie mit Vornamen'} :
    { number: 3, name: 'Neumann', title: 'Zwei Zeilen mit Trennlinie' }
];
const out = fs.mkdtempSync(path.join(require('node:os').tmpdir(),'gravuru-prio-stufe1-'));
console.log('Prüfnachweise unter '+out);
const report = {
  started: new Date().toISOString(), commit: 'a38c9701',
  viewport: '390 × 844', productRevision: identifiers.productRevision,
  entry: betaEntry, designs: [], images: [], errors: [], cartUpdates: [], assets: []
};
let stage = 'Browserstart';
const stageAt = s => {stage=s;console.log(s);};
function summary(error) {
  return String(error).replace(/https?:\/\/\S+|gse1\.[\w.-]+|[a-f0-9]{48,}/gi,'[Adresse]').split('\n').filter(Boolean).slice(0,2).join(' ').slice(0,300);
}
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const commonTimeout = {timeout:45000};
const section = (f, tool) => f.locator('[data-demo-section="'+tool+'"]:visible').first();

async function openEditor(page) {
  await page.waitForURL(u=>u.origin===app&&u.pathname===appFolder+'prio.html',{...commonTimeout,waitUntil:'domcontentloaded'});
  await page.waitForFunction(folder=>[...document.querySelectorAll('iframe')].some(frame=>{
    try {
      const h=frame.contentDocument?.querySelector('gravuru-configurator');
      return frame.getClientRects().length && h?.dataset.mobileDemo==='sheet'
        && h?.state?.designId && frame.contentWindow.location.pathname.startsWith(folder);
    } catch {return false;}
  }),appFolder,{timeout:65000});
  const f=page.frames().find(frame=>frame.parentFrame()===page.mainFrame()&&new URL(frame.url()).pathname.startsWith(appFolder));
  assert(f,'Der neue Editor muss aus dem isolierten Testverzeichnis stammen.');
  await section(f,'design').click({trial:true,...commonTimeout});
  const start = await f.evaluate(()=>{
    const h=document.querySelector('gravuru-configurator');
    const binding=window.parent.GravuruShopEntry;
    return {
      design:h.state.designId, size:h.state.mOptions.size, width:h.state.width, height:h.state.height,
      presentation:binding?.presentation, productRevision:window.parent.GravuruWorkshopReview?.productRevision
    };
  });
  assert.equal(start.design,identifiers.designBase+'1');
  assert.equal(start.presentation,'prio-r15');
  assert.equal(start.size,identifiers.size);
  assert.equal(start.productRevision,identifiers.productRevision);
  assert.deepEqual([start.width,start.height],[120,80]);
  return f;
}
async function selectDesign(page, frame, design) {
  const expected=identifiers.designBase+design.number;
  const witness=await frame.evaluateHandle(()=>{
    const frameElement=window.frameElement, element=document.querySelector('gravuru-configurator');
    const observation={addedFrames:0,addedEditors:0};
    const watch=new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes){
        if(node.nodeType!==1)continue;
        if(node.localName==='iframe')observation.addedFrames++;
        observation.addedFrames+=node.querySelectorAll('iframe').length;
      }
    });
    watch.observe(frameElement.parentElement,{childList:true,subtree:true});
    const watchElement=new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes){
        if(node.nodeType!==1)continue;
        if(node.localName==='gravuru-configurator')observation.addedEditors++;
        observation.addedEditors+=node.querySelectorAll('gravuru-configurator').length;
      }
    });
    watchElement.observe(document.body,{childList:true,subtree:true});
    return {doc:document,element,frameElement,observation,watch,watchElement};
  });
  const transport={modelReads:0,serverSwitches:0};
  const count=req=>{
    const u=new URL(req.url());
    if(u.origin!==app)return;
    if(u.pathname==='/api/shop-entry/model'&&req.method()==='GET')transport.modelReads++;
    if(u.pathname==='/api/shop-entry/design-switch'&&req.method()==='POST')transport.serverSwitches++;
  };
  page.on('request',count);
  try {
    await section(frame,'design').click();
    const card=frame.locator('[data-product-design-id="'+expected+'"]:visible').first();
    await card.waitFor({timeout:35000});
    assert.match(await card.getAttribute('aria-label') || await card.innerText(), new RegExp(design.title));
    await card.click();
    await page.waitForFunction(id=>[...document.querySelectorAll('iframe')].some(fr=>{
      try {
        if(fr.inert||fr.hidden||!fr.getClientRects().length)return false;
        const h=fr.contentDocument.querySelector('gravuru-configurator');
        return h?.state.designId===id&&h.shadowRoot?.querySelector('svg [data-object]');
      } catch {return false;}
    }),expected,{timeout:35000});
    const check=await witness.evaluate(w=>{
      const doc=w.frameElement.contentDocument;
      w.watch.disconnect();w.watchElement.disconnect();
      return {...w.observation,sameDocument:doc===w.doc,sameEditor:doc.querySelector('gravuru-configurator')===w.element,
        sameFrame:w.frameElement.isConnected&&w.frameElement.contentWindow===window&&!w.frameElement.inert&&!w.frameElement.hidden,
        width:w.element.state.width,height:w.element.state.height,design:w.element.state.designId};
    });
    const evidence={after:expected,title:design.title,start:identifiers.designBase+'1',...check,...transport};
    report.designs.push(evidence);
    assert.equal(check.sameFrame,true);
    assert.equal(check.sameEditor,true);
    assert.equal(check.sameDocument,true);
    assert.equal(check.addedFrames,0);
    assert.equal(check.addedEditors,0);
    assert.equal(check.design,expected);
    assert.equal(transport.serverSwitches,0,'Wechsel ging über die bisherige serverseitige Neuanlage.');
  } finally {page.off('request',count);await witness.dispose();}
}
async function personalize(frame, name) {
  await section(frame,'text').click();
  const id=await frame.evaluate(()=>{
    const editor=document.querySelector('gravuru-configurator');
    const inputs=[...editor.shadowRoot.querySelectorAll('textarea[data-ux-text],input[data-ux-text]')];
    const required=inputs.filter(e=>e.getAttribute('aria-required')==='true');
    const field=required.find(e=>(e.getAttribute('aria-label')||'').trim()==='Name') || required[0];
    return field?.dataset.uxText || editor.uxTextIssues?.()[0]?.id;
  });
  assert.match(id,/^[\w-]+$/);
  const field=frame.locator('[data-ux-text="'+id+'"]:visible').first();
  if(!await field.isVisible()) {
    const row=frame.locator('[data-ux="select-content"][data-id="'+id+'"]:visible').first();
    if(await row.isVisible())await row.click();
  }
  await field.waitFor({timeout:12000});
  await field.fill(name);await field.press('Tab');
  await frame.waitForFunction(({id,name})=>document.querySelector('gravuru-configurator').state.objects.some(o=>o.id===id&&o.text===name),{id,name});
  const issues=await frame.evaluate(()=>document.querySelector('gravuru-configurator').uxTextIssues?.().map(i=>i.message)||[]);
  assert.deepEqual(issues,[],'Alle Pflichtfelder der Personalisierung müssen ausgefüllt sein.');
}
async function submit(page,frame) {
  const finish=frame.locator('.completion-finish:visible').first();
  if(await finish.isVisible())await finish.click();
  else await frame.getByRole('button',{name:/^(?:In den )?Warenkorb$/i}).first().click();
  const overlap=frame.locator('[data-demo-overlap-accept]:visible').first();
  const add=frame.locator('[data-shop-cart]:visible').last();
  await Promise.race([overlap.waitFor({timeout:9000}),add.waitFor({timeout:9000})]);
  if(await overlap.isVisible())await overlap.click();
  await add.click({timeout:12000});
  const handoff=page.waitForURL(u=>u.origin===shop&&u.searchParams.get('view')==='warenkorb-cst1',{timeout:70000,waitUntil:'domcontentloaded'});
  const refused=frame.getByText('Nicht in Pfade umgewandelter Text im Motiv. Bitte die Vorlage prüfen.',{exact:true}).first()
    .waitFor({state:'visible',timeout:70000}).then(()=>{throw Error('Fertigungsprüfung vor der Übertragung: Nicht in Pfade umgewandelter Text im Motiv.');})
    .catch(e=>{if(e.message.startsWith('Fertigungsprüfung'))throw e;return handoff;});
  await Promise.race([handoff,refused]);
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Bei Shopify bestätigt')||document.querySelector('#erneut')?.hidden===false,{},commonTimeout);
  assert.equal(await page.locator('#status').innerText(),'Bei Shopify bestätigt.');
}
async function shopCart(page) {
  return page.evaluate(async()=>{
    const response=await fetch('/cart.js',{cache:'no-store'});
    if(!response.ok)throw Error('Shopify lieferte keinen Warenkorb.');
    const cart=await response.json();
    return {total:cart.total_price,currency:cart.currency,lines:cart.items.map(row=>({
      product:String(row.product_id),variant:String(row.variant_id),sku:row.sku,quantity:row.quantity,unit:row.final_price,total:row.final_line_price,
      design:row.properties.Design,fields:Object.entries(row.properties).filter(([k])=>/^Gravurtext(?: \d+)?$/.test(k)).map(([,value])=>value),
      config:row.properties._gravuru_config,rev:row.properties._gravuru_rev,offer:row.properties._gravuru_offer,
      picture:row.properties._gravuru_checkout_image,reviewPicture:row.properties._gravuru_bild
    }))};
  });
}
async function imagePixels(ctx,page,line,design) {
  const cdn=new URL(line.picture), reference=new URL(line.reviewPicture);
  assert.equal(cdn.origin,'https://cdn.shopify.com');assert.equal(reference.origin,app);assert(reference.pathname.startsWith('/gestaltung/'));
  const results=await Promise.all([ctx.request.get(reference.href,{timeout:24000}),ctx.request.get(cdn.href,{timeout:24000})]);
  assert(results.every(r=>r.status()===200),'Ein persönliches Bild fehlt.');
  const bytes=await Promise.all(results.map(r=>r.body()));
  const proof=await page.evaluate(async sources=>{
    async function canvasPixels(base64) {
      const file=new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],{type:'image/png'});
      const image=await createImageBitmap(file);
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const g=canvas.getContext('2d',{willReadFrequently:true});
      g.drawImage(image,0,0);image.close();
      const pixels=g.getImageData(0,0,canvas.width,canvas.height).data;
      return {width:canvas.width,height:canvas.height,sha:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels)),v=>v.toString(16).padStart(2,'0')).join('')};
    }
    return Promise.all(sources.map(canvasPixels));
  },bytes.map(b=>b.toString('base64')));
  assert.deepEqual(proof[1],proof[0],'Shopify-Bild unterscheidet sich von der persönlichen Kundenansicht des gespeicherten Entwurfs.');
  assert(proof[1].width>100&&proof[1].height>100);
  return {name:design.name,width:proof[1].width,height:proof[1].height,pixelHash:proof[1].sha,identicalToSavedCustomerPicture:true};
}
async function checkLine(page,ctx,design,count,previous) {
  const cart=await shopCart(page);
  assert.equal(cart.currency,'EUR');assert.equal(cart.lines.length,count);assert.equal(cart.total,1999*count);
  const line=cart.lines.find(i=>i.fields.some(t=>t.includes(design.name)));
  assert(line,'Persönlicher Name wurde nicht von Shopify zurückgelesen.');
  assert.equal(line.product,identifiers.product);assert.equal(line.variant,identifiers.variant);assert.equal(line.sku,identifiers.sku);
  assert.equal(line.quantity,1);assert.equal(line.unit,identifiers.gross);assert.equal(line.total,identifiers.gross);
  assert.equal(line.design,design.title);assert.match(line.config,/^konfig_[\da-f-]{36}$/);
  assert(Number.isSafeInteger(Number(line.rev))&&Number(line.rev)>0);
  if(previous){
    assert.notEqual(line.config,previous.config);
    assert.notEqual(line.picture,previous.picture);
    assert.notEqual(line.offer,previous.offer);
    assert.deepEqual(cart.lines.find(i=>i.config===previous.config),previous,'Erste Position beim zweiten Hinzufügen verändert.');
  }
  const matching=page.locator('#positionen article').filter({hasText:new RegExp(design.name)});
  assert.equal(await matching.count(),1);
  assert.equal(await matching.locator('img').getAttribute('src'),line.picture);
  const picture=await imagePixels(ctx,page,line,design);
  await matching.locator('button:has(img)').click();
  const zoom=page.locator('dialog[open] img');
  assert.equal(await zoom.getAttribute('src'),line.picture);
  await zoom.evaluate(img=>img.decode());
  await page.getByRole('button',{name:'Schließen'}).click();
  report.images.push(picture);
  report.cartUpdates.push({name:design.name,design:line.design,sku:line.sku,unitCents:line.unit,totalCents:cart.total,
    configurationDigest:digest(line.config),savedRevision:line.rev,zoom:true});
  return line;
}
async function main() {
  const account=process.env.GRAVURU_BETA_BENUTZER;
  const password=process.env.GRAVURU_BETA_PASSWORT;
  assert(account&&password,'Es werden die Zugangsdaten für den geschützten Prüfstand benötigt.');
  const browser=await chromium.launch({channel:'chrome'});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'de-DE',
    httpCredentials:{username:account,password,origin:beta}});
  const page=await ctx.newPage(), starts=[];
  const net={draftCreates:0,draftWrites:0,offers:0,claims:0,shopifyAdds:0,checkouts:0};
  const count=(req,code)=>{
    const u=new URL(req.url());if(req.method()!=='POST'||code<200||code>=300)return;
    if(u.origin===app){
      if(u.pathname==='/api/shop-entry/acrylic-drafts')net.draftCreates++;
      if(/^\/api\/shop-entry\/acrylic-drafts\/adraft_/.test(u.pathname))net.draftWrites++;
      if(u.pathname==='/api/shop-entry/theme-cart')net.offers++;
    }
    if(u.origin===shop){
      if(u.pathname==='/apps/konfigurator/cart/claim')net.claims++;
      if(u.pathname==='/cart/add.js')net.shopifyAdds++;
      if(/\/checkouts?\//.test(u.pathname))net.checkouts++;
    }
  };
  page.on('pageerror',e=>report.errors.push(summary(e.message)));
  const checked=new Set();
  page.on('response',r=>{
    const u=new URL(r.url());count(r.request(),r.status());
    if(u.origin===app&&u.pathname.startsWith(appFolder)&&!checked.has(u.pathname)){
      report.assets.push({path:u.pathname,status:r.status()});checked.add(u.pathname);
    }
    if(u.href===betaEntry&&r.status()===302){
      const target=r.headers().location;
      if(target)starts.push(new URLSearchParams(new URL(target).hash.slice(1)).get('test'));
    }
  });
  try{
    stageAt('Geschützte Beta öffnen');
    const first=await page.goto(betaEntry,{waitUntil:'domcontentloaded',timeout:65000});
    assert.equal(first.status(),200,'Geschützter Einstieg nicht bereit.');
    let previous=null;
    for(const [index,design] of designs.entries()){
      stageAt('Originalen Prio öffnen für '+design.name);
      const frame=await openEditor(page);
      stageAt('Designwechsel '+design.title);
      await selectDesign(page,frame,design);
      stageAt('Name im gewählten Design eingeben: '+design.name);
      await personalize(frame,design.name);
      await page.screenshot({path:path.join(out,'Prio-'+design.name+'.png'),animations:'disabled'});
      stageAt('Persönlichen Entwurf speichern und zu Shopify übertragen');
      await submit(page,frame);
      stageAt('Shopify-Position, Entwurfsbild und Zoom prüfen');
      previous=await checkLine(page,ctx,design,index+1,previous);
      if(!index)await page.getByRole('link',{name:'Weiteres Edelstahl-Türschild gestalten'}).click();
    }
    assert.equal(starts.length,2);assert.match(starts[0],/^[a-f0-9]{48}$/);assert.equal(starts[0],starts[1]);
    assert.notEqual(report.images[0].pixelHash,report.images[1].pixelHash);
    assert.equal(net.shopifyAdds,2);assert.equal(net.checkouts,0);assert.equal(net.claims,2);assert.equal(net.offers,2);
    await page.screenshot({path:path.join(out,'Shopify-zwei-Schilder.png'),animations:'disabled',fullPage:true});
    report.passed=true;
  }catch(e){
    report.failedAt=stage;report.error=summary(e.message);
    report.lastPath=new URL(page.url()).pathname;
    report.openDialogs=[];
    for(const f of page.frames()){
      const messages=await f.locator('[data-shop-cart-status],[role=alert],dialog[open],#status').allInnerTexts().catch(()=>[]);
      report.openDialogs.push(...messages.filter(Boolean).map(summary).slice(-3));
    }
    await page.screenshot({path:path.join(out,'Pruefstelle.png'),animations:'disabled',timeout:3500}).catch(()=>{});
    console.error(report.error,report.openDialogs);process.exitCode=1;
  }finally{
    report.network=net;report.browser=browser.version();report.ended=new Date().toISOString();
    fs.writeFileSync(path.join(out,'Ergebnis.json'),JSON.stringify(report,null,2)+'\n');
    await browser.close();
    console.log(JSON.stringify({passed:report.passed??false,designs:report.designs.length,items:report.cartUpdates.length,at:report.failedAt}));
  }
}
main().catch(e=>{console.error(summary(e.message));process.exitCode=1;});
