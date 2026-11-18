import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createServer,DEMO_PRODUCT,DEMO_SHOP,DEMO_VARIANT} from '../server.mjs';
import {openStore} from '../store.mjs';
import {compile,here,importFiles} from '../catalog.mjs';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
function findPlaywright(){
  for(const base of ['',path.dirname(path.dirname(process.execPath)),...(process.env.NODE_REPL_NODE_MODULE_DIRS||'').split(path.delimiter).filter(Boolean)]){
    try{return base?require(require.resolve('playwright',{paths:[base,path.dirname(base)]})):require('playwright');}catch{}
    try{if(base)return require(path.join(base,'playwright'));}catch{}
  }
  throw Error('Playwright fehlt. npm install --no-save playwright');
}
const store=openStore(':memory:');
const pack=importFiles([here('../designs/steel-heimathafen/source.json')]);
store.publish(DEMO_SHOP,DEMO_PRODUCT,DEMO_VARIANT,pack);
const server=createServer(store,{demo:true});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const executablePath=process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe','/usr/bin/chromium','/usr/bin/google-chrome'].find(fs.existsSync);
const browser=await findPlaywright().chromium.launch({executablePath,headless:true,args:['--no-proxy-server','--disable-background-networking']});
const output=path.resolve(process.argv[2]||'.studio/measurements');fs.mkdirSync(output,{recursive:true});
const afterPaint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const results=[];
try{
 for(const network of ['loopback',...(process.env.STUDIO_4G?['mobil']:[])]){
  for(let i=0;i<Number(process.env.STUDIO_PROBE_RUNS||5);i++){
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
    const page=await ctx.newPage(),errors=[],requests=[];
    page.on('request',r=>requests.push(r.url()));
    page.on('pageerror',e=>errors.push(e.message));
    const cdp=await ctx.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    if(network==='mobil')await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1600000/8,uploadThroughput:750000/8});
    for(const cache of ['kalt','warm']){
      await page.goto(origin+'/',{waitUntil:'commit'});
      await page.locator('gravuru-studio[data-active-design="RE-90X60-HOC-08"] .gs-plate path').first().waitFor();
      await page.evaluate(afterPaint);
      const opening=await page.evaluate(()=>performance.now());
      const startupBytes=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.responseEnd<=performance.now()).reduce((n,e)=>n+e.transferSize,performance.getEntriesByType('navigation')[0].transferSize));
      const beforeSwitch=requests.length;
      const elapsedBefore=await page.evaluate(()=>{const s=document.querySelector('.gs-design');const t=performance.now();s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}));return t;});
      await page.locator('gravuru-studio[data-active-design="RE-90X60-EIN-10"] .gs-add:enabled').waitFor();
      await page.evaluate(afterPaint);
      const switchMs=await page.evaluate(start=>performance.now()-start,elapsedBefore);
      const switchRequests=requests.length-beforeSwitch;assert.equal(switchRequests,0);
      const last=page.getByLabel('Familienname',{exact:true});
      const oldSvg=await page.locator('.gs-plate').innerHTML();
      const editStart=await page.evaluate(()=>performance.now());
      await last.fill('Müller');
      await page.waitForFunction(old=>document.querySelector('.gs-plate').innerHTML!==old && !document.querySelector('.gs-add').disabled,oldSvg);
      await page.evaluate(afterPaint);
      const editMs=Math.round(await page.evaluate(start=>performance.now()-start,editStart));
      const editRequests=requests.length-beforeSwitch-switchRequests;assert.equal(editRequests,0);
      assert(await page.locator('.gs-plate svg path').count()>8);
      if(!i && cache==='kalt') await page.screenshot({path:path.join(output,'Mobil.png'),fullPage:true});
      const checkoutStart=await page.evaluate(()=>{const t=Date.now();document.querySelector('.gs-add').click();return t;});
      await page.waitForURL('**/cart');
      await page.getByText('HEIMATHAFEN · Familie · Müller').waitFor();
      await page.evaluate(afterPaint);
      const cartMs=await page.evaluate(s=>Date.now()-s,checkoutStart);
      const cart=await page.evaluate(()=>fetch('/cart.js').then(r=>r.json()));
      assert.equal(cart.items.length,1);assert.equal(cart.items[0].quantity,1);assert.equal(cart.items[0].price,1099);
      await page.getByRole('button',{name:/Testbestellung/}).click();
      await page.waitForURL('**/werkstatt');const dl=page.locator('article').first();
      const files={};
      for(const type of ['svg','pdf','json']){
        const href=await dl.getByRole('link',{name:type.toUpperCase(),exact:true}).getAttribute('href');
        const response=await page.request.get(origin+href);assert.equal(response.status(),200);files[type]=await response.body();
      }
      const manifest=JSON.parse(files.json);assert.equal(manifest.edits['RE-90X60-EIN-10-4'],'Müller');
      assert(files.svg.toString().includes('id="CutContour"'));assert(files.pdf.toString('latin1').includes('/CutContour'));
      if(!i && cache==='kalt')for(const type of ['svg','pdf','json']) fs.writeFileSync(path.join(output,'Heimathafen-Mueller.'+type),files[type]);
      results.push({network,run:i+1,cache,openingMs:Math.round(opening),switchMs:Math.round(switchMs),editMs,cartMs,startupBytes,switchRequests,editRequests});
    }
    assert.deepEqual(errors,[]);await ctx.close();
  }
 }
  const pg=await browser.newPage({viewport:{width:1280,height:800}});
  await pg.goto(origin);await pg.locator('.gs-add:enabled').waitFor();
  await pg.screenshot({path:path.join(output,'Desktop.png')});
  const raster=fs.readFileSync(path.join(output,'Heimathafen-Mueller.svg'),'utf8');
  await pg.setViewportSize({width:900,height:600});
  await pg.setContent('<style>*{margin:0}body{background:white}svg{display:block;width:900px;height:600px}</style>'+raster);
  await pg.screenshot({path:path.join(output,'svg-raster.png')});
  if(process.argv[3]){
    await pg.goto(pathToFileURL(path.resolve(process.argv[3])).href);
    await pg.locator('.gs-add:enabled').waitFor();
    await pg.locator('.gs-design').selectOption('RE-90X60-EIN-10');
    await pg.getByLabel('Familienname').fill('Müller');
    const download=pg.waitForEvent('download');
    await pg.getByRole('button',{name:'SVG mit Kontur herunterladen'}).click();
    const file=await download;
    assert.equal(fs.readFileSync(await file.path(),'utf8'),raster);
    assert.equal(await pg.evaluate(()=>performance.getEntriesByType('resource').filter(e=>/^https?:/.test(e.name)).length),0);
    await pg.getByText('Motiv anpassen',{exact:true}).click();
    const motif=pg.getByLabel('Motiv',{exact:true});await motif.selectOption('none');
    assert.equal(await pg.locator('.gs-plate [data-motif]').count(),0);
    await motif.selectOption({index:0});await pg.locator('.gs-plate [data-motif]').first().waitFor();
  }
  const native=await browser.newPage();
  await native.goto(origin);await native.locator('.gs-add:enabled').waitFor();
  await native.evaluate(()=>{
    const form=document.createElement('form');form.id='theme-form';
    form.innerHTML='<input name="id" value="90002"><input name="selling_plan" value="123"><input name="properties[Zusatz]" value="Geschenk">';
    document.body.append(form);document.querySelector('gravuru-studio').dataset.form=form.getAttribute('id');
  });
  assert.equal(await native.evaluate(()=>document.querySelector('gravuru-studio').form()?.getAttribute('id')),'theme-form');
  let adds=0;
  await native.route('**/cart/add.js',async route=>{
    const request=route.request();
    const raw=request.postDataBuffer(),headers=await request.allHeaders();
    const boundary=/^--([^\r\n]+)\r\n/.exec(raw?.toString('utf8')||'')?.[1];
    assert(boundary,'Storefront sendet die nativen Felder als FormData: '+request.method()+' '+headers['content-type']+' '+(raw?.subarray(0,55).toString()||''));
    const data=await new Response(raw,{headers:{'content-type':headers['content-type']||'multipart/form-data; boundary='+boundary}}).formData();
    assert.equal(data.get('properties[Zusatz]'),'Geschenk');assert.equal(data.get('selling_plan'),'123');
    const properties=Object.fromEntries([...data].filter(([k])=>k.startsWith('properties[')).map(([k,v])=>[k.slice(11,-1),v]));
    adds++;
    if(adds===1)return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({description:'Testbestand ausverkauft.'})});
    const response=await native.request.post(origin+'/cart/add.js',{data:{items:[{id:data.get('id'),quantity:Number(data.get('quantity')),properties}]}});
    assert.equal(response.status(),200);
    await route.abort('failed'); // Shopify accepted the line, but the browser lost the reply.
  });
  await native.getByLabel('Namen',{exact:true}).fill('Eva & Lea');
  await native.locator('.gs-add').click();await native.getByRole('status').filter({hasText:'Testbestand ausverkauft'}).waitFor();
  assert.equal(await native.getByLabel('Namen',{exact:true}).inputValue(),'Eva & Lea');
  await native.locator('.gs-add').click();await native.waitForURL('**/cart');
  assert.equal(adds,2);assert.equal((await (await native.request.get(origin+'/cart.js')).json()).items.length,1);
  const merchant=await browser.newPage();await merchant.goto(origin+'/verwaltung');
  await merchant.locator('#file').setInputFiles(here('../designs/steel-heimathafen/source.json'));
  await merchant.getByRole('button',{name:'Quelle prüfen'}).click();
  await merchant.locator('#publish:enabled').waitFor();
  await merchant.locator('#publish').click();
  await merchant.getByRole('status').filter({hasText:'2 Vorlagen für diese Studio-Variante übernommen.'}).waitFor();
  const photoModel=id=>({id,name:id,width:90,height:60,cuts:['M0 0 H90 V60 H0 Z'],objects:[{type:'photo',x:10,y:10,w:40,h:30}]});
  store.publish(DEMO_SHOP,DEMO_PRODUCT,DEMO_VARIANT,compile([photoModel('Foto-A'),photoModel('Foto-B')],{fonts:{}}));
  const photoPage=await browser.newPage();await photoPage.goto(origin);
  let unlock,started;const gate=new Promise(r=>{unlock=r;}),uploadStarted=new Promise(r=>{started=r;});
  await photoPage.route('**/studio/photos',async route=>{started();await gate;await route.continue();});
  const photoBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  await photoPage.getByLabel('Dein Foto').setInputFiles({name:'test.png',mimeType:'image/png',buffer:photoBytes});await uploadStarted;
  await photoPage.locator('.gs-design').selectOption('Foto-B');
  await photoPage.locator('[data-active-design="Foto-B"] .gs-add:disabled').waitFor();unlock();
  await photoPage.locator('.gs-plate image').waitFor();await photoPage.locator('.gs-add').click();await photoPage.waitForURL('**/cart');
  await photoPage.getByRole('button',{name:/Testbestellung/}).click();await photoPage.waitForURL('**/werkstatt');
  const receipt=store.orders(DEMO_SHOP)[0];const original=await store.download(DEMO_SHOP,receipt.id,receipt.line,'original');
  assert.deepEqual(original.bytes,photoBytes);
  const report={browser:browser.version(),viewport:[390,844],cpu:4,mobil:{rtt:150,downBps:1600000,upBps:750000},results};
  fs.writeFileSync(path.join(output,'measurements.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{await browser.close();server.close();store.close();}
