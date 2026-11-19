// Run in the test browser only. Keep the live page, its catalog and prices, and
// substitute the two reviewed source modules and their previously served bundle.
const {chromium} = require('playwright');
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createHash} = require('node:crypto');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const [repo, bundles, output] = process.argv.slice(2);
assert(path.isAbsolute(repo) && path.isAbsolute(bundles) && path.isAbsolute(output));
const variants = {
  '14b53038':'editor-db031b06f064da6a.mjs',
  '8a3d6c86':'editor-8b274feb9a0ecee6.mjs',
  '3b3b4626':'editor-7dfd6f600e080015.mjs',
};
const verifiedBytes={
  '14b53038':'28a01dc43ba7222499093ac895146f51c4c7e5d2c88865c5d2ef257775b4cb6f',
  '8a3d6c86':'e7334ae87844ce3e664656e0a2993e1da9c320ab4a8eb259f3471ef092ba0157',
  '3b3b4626':'9f5976a4ecf5bc7666f08f3b55a5e43946abd8e25d6058b075546b57bae9bb10',
};
const app = 'app-2027.gravuru-designwerkstatt.de';
const product = 'https://gravuru-design.myshopify.com/products/klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert';
async function measure(browser, rewrite, version, mobile, series) {
  const ctx = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:960},
    isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?3:1,locale:'de-DE'});
  const modules = new Map();
  for (const n of ['adapter.mjs','contract.mjs']) {
    const src = execFileSync('git',['show',version+':app/configurator/variant-m/'+n],{cwd:repo,encoding:'utf8',maxBuffer:4*1024*1024});
    modules.set('/acryl-configurator/variant-m/'+n,rewrite(src));
  }
  const bundlePath='/_acryl-bundle/'+variants['3b3b4626'];
  const bundle=fs.readFileSync(path.join(bundles,variants[version]));
  assert.equal(createHash('sha256').update(bundle).digest('hex'),verifiedBytes[version]);
  modules.set(bundlePath,rewrite(bundle.toString('utf8')));
  const served=new Set();
  await ctx.route(url=>url.hostname===app&&modules.has(url.pathname),async route=>{
    const u=new URL(route.request().url());served.add(u.pathname);
    return route.fulfill({body:modules.get(u.pathname),contentType:'text/javascript'});
  });
  try {
    const p=await ctx.newPage();
    const response=await p.goto(product,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
    await p.getByText('Jetzt personalisieren',{exact:true}).first().click();
    let editor;
    for(let n=0;n<250&&!editor;n++){
      editor=p.frames().find(f=>new URL(f.url()||'about:blank').pathname==='/_merchant-acryl-editor.html');
      if(!editor)await p.waitForTimeout(120);
    }
    assert(editor);
    const designs=editor.getByRole('tab',{name:'Designs',exact:true});
    await designs.waitFor({state:'attached'});
    if(!await designs.isVisible())await editor.getByRole('button',{name:/Werkzeuge öffnen/}).first().click();
    await designs.click();
    await editor.evaluate(()=>{
      const parse=DOMParser.prototype.parseFromString;
      window.r15CountSvg=0;
      DOMParser.prototype.parseFromString=function(markup,mime){if(mime==='image/svg+xml')window.r15CountSvg++;return parse.call(this,markup,mime);};
    });
    const readings=[];
    for(let n=0;n<6;n++){
      const id=n%2===0?'FK-SEITLICH':'FK-RUNDUM';
      const card=editor.locator('[data-c-design="'+id+'"]').first();
      await card.evaluate(el=>el.addEventListener('click',()=>{window.r15CountSvg=0;window.r15Start=performance.now();},{once:true,capture:true}));
      await card.click();
      const row=await editor.evaluate(async target=>{
        const host=document.querySelector('gravuru-configurator'),begin=window.r15Start;
        const ok=()=>host.state.designId===target&&host.shadowRoot.querySelector('[data-c-design="'+target+'"]')?.getAttribute('aria-pressed')==='true';
        while(!ok()&&performance.now()-begin<7000)await new Promise(requestAnimationFrame);
        if(!ok())throw Error('Designwechsel nicht bestätigt');
        await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
        return {ms:Math.round(performance.now()-begin),svgParses:window.r15CountSvg};
      },id);
      readings.push({design:id,...row});
    }
    assert(served.has(bundlePath) || served.has('/acryl-configurator/variant-m/adapter.mjs'),
      'Die getestete Adapterversion wurde nicht angefordert');
    return {version,device:mobile?'Mobil':'PC',series,served:[...served],readings};
  } finally {await ctx.close();}
}
(async()=>{
  const {acrylAssetText}=await import(pathToFileURL(path.join(repo,'app/workshop/acryl-employee-host.mjs')));
  const b=await chromium.launch({channel:'chrome'});
  const rows=[];
  try{
    for(const series of [1,2]) for(const mobile of series===1?[false,true]:[true,false]){
      const order=Object.keys(variants);
      if((series===1)===mobile)order.reverse();
      for(const version of order){
        const result=await measure(b,acrylAssetText,version,mobile,series);
        rows.push(result);
        fs.writeFileSync(output,JSON.stringify(rows,null,2)+'\n');
        console.log(result.series,result.device,result.version,result.readings.map(r=>r.svgParses).join(','));
      }
    }
  }finally{await b.close();}
})().catch(e=>{console.error(e.message.split('\n')[0]);process.exitCode=1;});
