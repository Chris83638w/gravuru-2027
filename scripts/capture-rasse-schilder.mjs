// Screenshots from the actual local customer configurator; no alternate renderer.
// npm packages playwright and sharp must be installed/resolvable by the caller.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(process.env.GRAVURU_NODE_MODULES?path.join(process.env.GRAVURU_NODE_MODULES,'package.json'):import.meta.url);
const {chromium}=require('playwright');
const arg=n=>process.argv.find(a=>a.startsWith('--'+n+'='))?.split('=').slice(1).join('=');
const root=path.resolve(arg('review')||'../rasse-review'),out=path.resolve(arg('out')||'../rasse-captures');
const ready=JSON.parse(fs.readFileSync(path.join(root,'ready.json'),'utf8'));
fs.mkdirSync(out,{recursive:true});
let entries=ready.designs.filter(e=>(e.plateMm[0]===120&&e.plateMm[1]===80)||(e.form==='OV'&&e.plateMm[0]===150&&e.plateMm[1]===80));
if(arg('breed'))entries=entries.filter(e=>e.breed===arg('breed'));
if(arg('form'))entries=entries.filter(e=>e.form===arg('form'));
if(arg('limit'))entries=entries.slice(0,Number(arg('limit')));
const browser=await chromium.launch({headless:true,...(process.env.GRAVURU_BROWSER?{executablePath:process.env.GRAVURU_BROWSER}:{})});
const results=[];let index=0;
try{
 await Promise.all(Array.from({length:Number(arg('workers')||3)},async()=>{
  const page=await browser.newPage({viewport:{width:1500,height:1100},deviceScaleFactor:1});
  let errors=[];page.on('pageerror',e=>errors.push(e.message));
  while(index<entries.length){
   const e=entries[index++],file=e.id+'.png',url=ready.url+'/?configuration='+encodeURIComponent(e.id);
   errors=[];
   try{
    await page.goto(url,{waitUntil:'load'});
    const frame=page.frameLocator('iframe');
    const scene=frame.locator('svg.scene:visible').first();
    await scene.waitFor({state:'visible',timeout:30000});
    await scene.locator('path').first().waitFor({state:'attached'});
    // Let the native glyph layout and material image settle before reading pixels.
    await page.waitForTimeout(180);
    const objects=await scene.locator('[data-object]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.object,box:n.getBoundingClientRect().toJSON()})));
    if(objects.length!==5)throw Error('Expected portrait, ornament and three text fields; got '+objects.length);
    const textOverlaps=[];
    for(let i=0;i<objects.length;i++)for(let j=i+1;j<objects.length;j++){
     const a=objects[i],b=objects[j];if(!a.id.startsWith('text-')||!b.id.startsWith('text-'))continue;
     if(Math.min(a.box.right,b.box.right)>Math.max(a.box.left,b.box.left)+.5&&Math.min(a.box.bottom,b.box.bottom)>Math.max(a.box.top,b.box.top)+.5)textOverlaps.push([a.id,b.id]);
    }
    await scene.screenshot({path:path.join(out,file)});
    if(e.layout===1)await page.screenshot({path:path.join(out,e.id+'-konfigurator.png')});
    const hash=createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex');
    results.push({...e,file,url,sha256:hash,browserErrors:[...errors],textOverlaps});
   }catch(err){results.push({...e,url,error:err.message,browserErrors:[...errors]});}
   if(results.length%24===0)console.log(JSON.stringify({captured:results.length,total:entries.length,errors:results.filter(x=>x.error||x.browserErrors.length).length}));
  }
  await page.close();
 }));
}finally{await browser.close();}
results.sort((a,b)=>a.id.localeCompare(b.id));
fs.writeFileSync(path.join(out,'screenshots.json'),JSON.stringify({source:'Native customer configurator via review-rasse-schilder.mjs',capturedAt:new Date().toISOString(),results},null,2));
console.log(JSON.stringify({captured:results.length,total:entries.length,errors:results.filter(x=>x.error||x.browserErrors.length).length}));
if(results.some(x=>x.error||x.browserErrors.length))process.exitCode=1;
