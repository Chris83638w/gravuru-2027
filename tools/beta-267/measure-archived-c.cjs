// Run the original archived HTML unmodified. Only local GETs are served during this read-only comparison.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{chromium}=require('playwright');
const [directory,output]=process.argv.slice(2);
const root=path.resolve(directory);
const index=fs.readFileSync(path.join(root,'index.html'));
const samples=[],rejected=new Set();
const slowMobile=process.env.BETA_MOBILE_THROTTLE==='1',saveData=process.env.BETA_SAVE_DATA==='1';
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(req.method!=='GET')return res.writeHead(405).end();
 if(pathname==='/')return res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(index);
 if(!/^\/assets\/[a-zA-Z0-9_.-]+$/.test(pathname))return res.writeHead(404).end();
 const file=path.join(root,pathname.slice(1));
 if(!fs.existsSync(file))return res.writeHead(404).end();
 const type={'.json':'application/json','.png':'image/png','.txt':'text/plain','.js':'text/javascript'}[path.extname(file)]||'application/octet-stream';
 res.writeHead(200,{'Content-Type':type,'Cache-Control':'private, max-age=600'}).end(fs.readFileSync(file));
});
async function sample(page,origin,device,cache,round){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 const gallery=page.locator('.c-gallery [data-c-design]').first();
 await gallery.waitFor({state:'attached',timeout:45000});
 await gallery.scrollIntoViewIfNeeded();
 const initial=await gallery.evaluate(async card=>{
  const host=document.querySelector('gravuru-configurator'),root=host.shadowRoot;
  const start=performance.now();const ready=()=>{const rect=card.getBoundingClientRect();const hit=root.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
   return card.contains(hit) && !!card.querySelector('svg path, img');};
  while(!ready()&&performance.now()-start<5000)await new Promise(requestAnimationFrame);
  if(!ready())throw Error('Erste Originalkarte nicht sichtbar.');
  await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
  return {entryToFirstVisibleMs:Math.round(performance.now()),afterScrollMs:Math.round(performance.now()-start),
   designCount:host.catalog.designs.length,drawn:root.querySelectorAll('.c-gallery [data-c-design] svg,.c-gallery [data-c-design] img').length,
   initialRequests:performance.getEntriesByType('resource').filter(r=>/^https?:/.test(r.name)).length};
 });
 const host=page.locator('gravuru-configurator');
 const ids=await host.evaluate(el=>Array.from(el.shadowRoot.querySelectorAll('.c-gallery [data-c-design]'),card=>card.dataset.cDesign));
 const active=await host.evaluate(el=>el.state.designId);const choices=ids.filter(id=>id!==active).slice(0,2);assert.equal(choices.length,2);
 const switches=[];
 for(const id of choices){
  const card=page.locator('[data-c-design="'+id+'"]').first();
  await card.evaluate((card,id)=>card.addEventListener('click',()=>{
   const start=performance.now(),el=document.querySelector('gravuru-configurator');
   const count=()=>performance.getEntriesByType('resource').filter(r=>/^https?:/.test(r.name)).length;
   const initial=count();
   window.oldDraw=(async()=>{
    const drawn=()=>el.state.designId===id && !!el.shadowRoot.querySelector('.scene [data-object]');
    await new Promise(requestAnimationFrame);
    while(!drawn()&&performance.now()-start<6000)await new Promise(requestAnimationFrame);
    if(!drawn())throw Error('Das gewählte Design fehlt in der Originalszene.');
    await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    return {id,ms:Math.round(performance.now()-start),requests:count()-initial};
   })();
  },{capture:true,once:true}),id);
  await card.click();
  switches.push(await page.evaluate(()=>window.oldDraw));
 }
 samples.push({device,cache,round,...initial,switches});
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chrome',args:['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});
 try{
  for(let round=1;round<=3;round++) for(const device of ['PC','Mobil']){
   const mobile=device==='Mobil',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
   if(saveData)await context.addInitScript(()=>{if(navigator.connection)Object.defineProperty(navigator.connection,'saveData',{get:()=>true});});
   const page=await context.newPage();page.on('requestfailed',req=>{if(/^https?:/.test(req.url())&&!req.url().startsWith(origin+'/'))rejected.add(new URL(req.url()).hostname);});
   if(mobile&&slowMobile){
    const cdp=await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:1000000,uploadThroughput:250000});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   }
   try{for(const state of ['kalt','warm'])await sample(page,origin,device,state,round);}finally{await context.close();}
  }
 }finally{
  fs.writeFileSync(output,JSON.stringify({htmlSha256:createHash('sha256').update(index).digest('hex'),htmlBytes:index.length,browser:browser.version(),saveData,slowMobile,externalUnavailable:[...rejected],samples},null,2)+'\n');
  await browser.close();server.close();
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;server.close();});
