import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {gunzipSync} from 'node:zlib';
import {buildMobileDemo,demoBootstrap,demoNamespace,rewriteDemoText,PUBLISHED_REFERENCE} from './build.mjs';
import {createDemoServer,verifyDemoPackage} from './serve.mjs';

const hash=data=>createHash('sha256').update(data).digest('hex');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-mobile-demo-')),source=path.join(root,'source'),preview=path.join(source,'app/configurator/variant-m/.preview');
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const write=(relative,text)=>{const file=path.join(source,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);};
 const bundles=Array.from({length:5},(_,i)=>'editor-'+String(i).padStart(16,'0')+'.mjs');
 write('app/configurator/variant-m/.preview/editor.html','<!doctype html><html><head><title>Old Klingel</title>'+bundles.map(name=>'<script type="module" src="/_bundle/'+name+'"></script>').join('')+'</head><body><script>window.gravuruModules={};</script></body></html>');
 for(const name of bundles)write('app/configurator/variant-m/.preview/bundle/'+name,"export const storage='gravuru-session:';export const db='gravuru-session-uploads';export const url='/configurator/variant-m/module.mjs';");
 write('app/configurator/variant-m/.preview/lazy/katalog-kern.json',JSON.stringify({motif_index:[{key:'real-motif'}],font_index:[{name:'Real Font'}]}));
 write('app/configurator/variant-m/.preview/lazy/motive-alle.json',JSON.stringify([{key:'real-motif',svgFragment:'<path d="M0 0L10 10"/>'}]));
 write('app/configurator/variant-m/.preview/assistant.js','globalThis.help=true;');write('app/configurator/variant-m/.preview/guides.json','[]');
 write('app/configurator/variant-m/module.mjs',"export const data='/api/workshop/session';export const visitor='gravuru:text-toolbar-placement:v1';");
 write('app/configurator/variant-m/module.test.mjs','SECRET TEST DATA');
 write('app/designs/aosu-labrador/runtime/images/blank.webp','unchanged image');
 write('app/platform/sources/app/shared/models/geometry.mjs','export const width=220;');
 write('app/workshop/theme-limits.mjs','export const limits={};');write('app/workshop/process-profiles.mjs','export const profiles=[];');
 write('app/designs/acrylic-unser-anfang/base.webp','base');
 write('app/configurator/mobile-demo/demo.mjs',"import {installDemoEdgeResize} from './edge-resize.mjs';if(window.GravuruMobileDemo)window.demoLoaded=true;");write('app/configurator/mobile-demo/demo.css',':host{color:#111}');write('app/configurator/mobile-demo/text-editor.mjs','export const installDemoTextEditor=()=>null;');write('app/configurator/mobile-demo/shopping-cart.svg','<svg/>');
 write('app/configurator/mobile-demo/edge-resize.mjs',"import {data} from '../variant-m/module.mjs';export const installDemoEdgeResize=()=>data;");
 write('app/configurator/mobile-demo/text-selection-dismiss.mjs','export const installDemoTextSelectionDismiss=()=>null;');
 write('app/configurator/mobile-demo/desktop-selection.mjs','export const installDemoDesktopSelection=()=>null;');
 write('app/configurator/mobile-demo/options-navigation.mjs','export const installDemoOptionsNavigation=()=>null;');
 for(const name of ['overlap-review','overlap-consent','contour-placement'])write('app/configurator/mobile-demo/'+name+'.mjs','export const test=true;');
 const font={label:'Real Font',regular:{units:1000,glyphs:{A:{d:'M0 0L500 1000',a:500},'ä':{d:'M3 4L5 6',a:510}}},bold:{units:1000,glyphs:{A:{d:'M1 0L501 1000',a:510}}}};
 const designs=Array.from({length:43},(_,i)=>({id:'original-'+i,objects:[{id:'text-1',type:'text',text:'Bruno '+i,font:'Real Font',x:10+i,y:22}]}));
 const profile={id:'original-product',revision:'original-product:2',binding:{kind:'local-review',productId:'original-product'},material:{kind:'slate'},designs,geometry:{width:220,height:140},features:{orderEnabled:false}};
 const model={key:'acryl',name:'Gedenktafel',legacy:{...structuredClone(profile),purchasing:{variants:[{variantId:'must-not-escape'}]}},configuration:{id:'original-product',revision:2},universal:{basePriceCents:1999,profile:structuredClone(profile),materialSurface:'data:image/webp;base64,Ymxhbms=',localResources:{fonts:{'Real Font':font},motifs:[{key:'original',svgFragment:'<path d="M0 0L12 8"/>'}]},scalableSizes:{defaultSizeId:'22x14',sizes:[{id:'22x14',basePriceCents:1999,profile:structuredClone(profile)},{id:'30x20',basePriceCents:2499,profile:structuredClone(profile)}]}}};
 model.universal.workshopElementRights=Object.fromEntries(designs.map(d=>[d.id,{'text-1':{delete:false,move:true}}]));
 model.universal.customerUI={designFilters:{collection:true}};
 model.universal.slateAccessories={choices:[{id:'mount',images:[{src:'data:image/png;base64,YWNjZXNzb3J5',name:'Rechteck'}]}]};
 const modelFiles={};for(const size of ['22x14','30x20']){modelFiles[size]=path.join(root,size+'.json');const clone=structuredClone(model);clone.universal.scalableSizes.defaultSizeId=size;fs.writeFileSync(modelFiles[size],JSON.stringify(clone));}
 return {root,source,preview,modelFiles,model,font,options:{outputDirectory:path.join(root,'package'),sourceRoot:source,previewDirectory:preview,modelFiles,namespace:'/konfi-demo/test-package/'}};
}
test('full models retain every design, glyph and groundplate; only demo identities/transport differ',t=>{
 const f=fixture(t),before=Object.fromEntries(Object.entries(f.modelFiles).map(([k,p])=>[k,hash(fs.readFileSync(p))]));
 const result=buildMobileDemo(f.options),{root,manifest}=verifyDemoPackage(result.outputDirectory);
 assert.equal(manifest.checkout,false);assert.equal(manifest.models['22x14'].designs,43);
 for(const size of ['22x14','30x20']){
  const m=JSON.parse(fs.readFileSync(path.join(root,'model-'+size+'.json')));
  assert.deepEqual(m.universal.profile.designs,f.model.universal.profile.designs);
  assert.deepEqual(m.universal.scalableSizes.sizes.map(s=>s.profile.designs),f.model.universal.scalableSizes.sizes.map(s=>s.profile.designs));
  assert.equal(m.universal.materialSurface,f.model.universal.materialSurface);
  assert.equal(m.universal.customerUI.designFilters.collection,false);
  for(const rights of Object.values(m.universal.workshopElementRights)){assert.equal(rights['text-1'].delete,true);assert.equal(rights['text-1'].move,true);}
  assert.equal(manifest.models[size].restoredDeletionRights,43);assert.equal(manifest.models[size].publishedHtmlSha256,PUBLISHED_REFERENCE[size]);
  const accessory=m.universal.slateAccessories.choices[0].images[0];assert.match(accessory.src,/^\/konfi-demo\/test-package\/material\/[a-f0-9]{64}\.png$/);assert.equal(fs.readFileSync(path.join(root,accessory.src.slice(manifest.namespace.length))).toString(),'accessory');
  assert.equal(m.configuration,undefined);assert.equal(m.legacy.purchasing.variants[0].variantId,null);
  assert.match(m.universal.profile.binding.productId,/^demo-test-package-/);
  for(const s of m.universal.scalableSizes.sizes)assert.match(s.profile.binding.productId,/^demo-test-package-/);
  assert.deepEqual(m.universal.localResources.fonts,{});
  const font=m.universal.localResources.lazyFonts[0];assert.match(font.url,/^\/konfi-demo\/test-package\/schriften\/[a-f0-9]{64}\.json$/);
  const body=fs.readFileSync(path.join(root,font.url.slice(manifest.namespace.length)));
  assert.equal(hash(body),path.basename(font.url,'.json'));assert.deepEqual(JSON.parse(body),f.font);
  const html=fs.readFileSync(path.join(root,size+'.html'),'utf8');assert.match(html,/<title>Mobile Konfi-Demo · Gravuru<\/title>/);assert.match(html,/GravuruMobileDemo=/);assert.match(html,/gravuru-ux-ready/);assert.ok(html.includes(manifest.namespace+'demo.mjs'));assert.ok(html.includes('form-action &#39;none&#39;')||html.includes("form-action 'none'"));
  assert.equal(hash(fs.readFileSync(f.modelFiles[size])),before[size]);
 }
 assert.equal(fs.existsSync(path.join(root,'configurator/variant-m/module.test.mjs')),false);
 assert.match(fs.readFileSync(path.join(root,'demo.mjs'),'utf8'),/from '\.\/configurator\/mobile-demo\/edge-resize\.mjs'/);
 assert.match(fs.readFileSync(path.join(root,'configurator/mobile-demo/edge-resize.mjs'),'utf8'),/from '\.\.\/variant-m\/module\.mjs'/);
 assert.equal(fs.readFileSync(path.join(root,'text-selection-dismiss.mjs'),'utf8'),'export const installDemoTextSelectionDismiss=()=>null;');
 assert.equal(fs.readFileSync(path.join(root,'desktop-selection.mjs'),'utf8'),'export const installDemoDesktopSelection=()=>null;');
 assert.equal(fs.readFileSync(path.join(root,'options-navigation.mjs'),'utf8'),'export const installDemoOptionsNavigation=()=>null;');
 for(const name of ['overlap-review','overlap-consent','contour-placement'])assert.equal(fs.readFileSync(path.join(root,name+'.mjs'),'utf8'),'export const test=true;');
 assert.equal(manifest.files['demo.mjs'].sourceSha256,hash(fs.readFileSync(path.join(f.source,'app/configurator/mobile-demo/demo.mjs'))));
 assert.equal(fs.readFileSync(path.join(root,'_runtime/images/blank.webp'),'utf8'),'unchanged image');
 const bundle=fs.readFileSync(path.join(root,'_bundle/editor-0000000000000000.mjs'),'utf8');
 assert.ok(bundle.includes('gravuru-mobile-demo-test-package-uploads'));assert.ok(bundle.includes('gravuru-mobile-demo:test-package:gravuru-session:'));
 assert.ok(bundle.includes('/konfi-demo/test-package/configurator/variant-m/module.mjs'));
 assert.throws(()=>buildMobileDemo(f.options),/existiert bereits/);
});
test('namespace and output guards reject original paths, nesting and bad models before any output',t=>{
 const f=fixture(t);
 for(const namespace of ['/','/produktvorschau/abc/','/konfi-demo/../','/konfi-demo/x%2fy/'])assert.throws(()=>demoNamespace(namespace));
 assert.throws(()=>buildMobileDemo({...f.options,outputDirectory:path.join(f.source,'out')}),/außerhalb/);
 const bad=JSON.parse(fs.readFileSync(f.modelFiles['22x14']));bad.universal.scalableSizes.sizes[1].basePriceCents=2399;fs.writeFileSync(f.modelFiles['22x14'],JSON.stringify(bad));
 assert.throws(()=>buildMobileDemo(f.options),/bestätigten Testumfang/);assert.equal(fs.existsSync(f.options.outputDirectory),false);
});
test('output through a parent symlink cannot write into the source tree',t=>{
 const f=fixture(t),alias=path.join(f.root,'source-alias');
 try{fs.symlinkSync(f.source,alias,process.platform==='win32'?'junction':'dir');}catch(error){if(['EPERM','ENOSYS'].includes(error.code)){t.skip('Symbolic links unavailable for this account');return;}throw error;}
 assert.throws(()=>buildMobileDemo({...f.options,outputDirectory:path.join(alias,'generated')}),/außerhalb/);
 assert.equal(fs.existsSync(path.join(f.source,'generated')),false);
});
test('static server serves only inventoried demo files, handles gzip, rejects every write and live path',async t=>{
 const f=fixture(t);buildMobileDemo(f.options);const server=createDemoServer({directory:f.options.outputDirectory});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const origin='http://127.0.0.1:'+server.address().port,prefix=origin+f.options.namespace;
 for(const outside of ['/api/workshop/products','/cart.js','/editor.html','/konfi-demo/other/22x14.html'])assert.equal((await fetch(origin+outside)).status,404);
 assert.equal((await fetch(prefix+'22x14.html',{method:'POST',body:'{}'})).status,405);
 assert.equal((await fetch(prefix+'../test-package/MANIFEST.json')).status,404);
 const response=await fetch(prefix+'22x14.html');assert.equal(response.status,200);assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow, noarchive');assert.equal(response.headers.get('content-encoding'),'gzip');
 assert.equal(await response.text(),fs.readFileSync(path.join(f.options.outputDirectory,'22x14.html'),'utf8'));
 assert.equal((await fetch(prefix+'22x14.html',{headers:{'Accept-Encoding':'gzip;q=0'}})).headers.get('content-encoding'),null);
 assert.equal((await fetch(prefix+'22x14.html',{method:'HEAD'})).status,200);
 const gz=fs.readFileSync(path.join(f.options.outputDirectory,'22x14.html.gz'));assert.equal(gunzipSync(gz).toString(),fs.readFileSync(path.join(f.options.outputDirectory,'22x14.html'),'utf8'));
 fs.writeFileSync(path.join(f.options.outputDirectory,'demo.mjs'),'changed');assert.equal((await fetch(prefix+'demo.mjs')).status,503);assert.throws(()=>verifyDemoPackage(f.options.outputDirectory),/Prüfsumme/);
});
test('bootstrap allows demo and local blob reads, blocks shop/API writes before network, marks ready only for self',async()=>{
 const calls=[],events=new Map(),location={href:'https://example.test/konfi-demo/test-package/22x14.html',origin:'https://example.test'};
 class XHR{open(...args){calls.push(args);}}
 const window={fetch:async(...args)=>{calls.push(args);return 'ok';},addEventListener:(name,fn)=>events.set(name,fn)};
 const context={window,location,URL,XMLHttpRequest:XHR,navigator:{sendBeacon:()=>{throw Error('must not be called');}},Error};
 vm.runInNewContext(demoBootstrap({legacy:{},universal:{}},{id:'test-package',namespace:'/konfi-demo/test-package/'}).slice(8,-9),context);
 assert.equal(await window.fetch('/konfi-demo/test-package/demo.css'),'ok');
 assert.equal(await window.fetch('blob:https://example.test/id'),'ok');
 for(const [url,init] of [['/cart/add.js',{method:'POST'}],['/api/workshop/products',{}],['https://other.test/file',{}],['/konfi-demo/test-package/api',{method:'POST'}]])await assert.rejects(()=>window.fetch(url,init),/keine Daten/);
 assert.equal(calls.length,2);assert.throws(()=>new XHR().open('POST','/api/workshop'),/keine Daten/);assert.equal(context.navigator.sendBeacon('/api/workshop','data'),false);
 assert.equal(window.GravuruMobileDemo.ready,false);events.get('message')({source:{},data:{type:'gravuru-ux-ready'}});assert.equal(window.GravuruMobileDemo.ready,false);events.get('message')({source:window,data:{type:'gravuru-ux-ready'}});assert.equal(window.GravuruMobileDemo.ready,true);
});
test('generated URL and storage rewrites are scoped; text data and designs are not rewritten',()=>{
 const source="'/configurator/variant-m/a.mjs' '/_runtime/lazy/x.json' '/api/workshop/events' 'gravuru-session:' 'gravuru-session-uploads' 'gravuru:text-toolbar-placement:v1'";
 const result=rewriteDemoText(source,'/konfi-demo/test-package/');
 assert.ok(result.includes("'/konfi-demo/test-package/api/workshop/events'"));assert.ok(result.includes('gravuru-mobile-demo-test-package-uploads'));assert.ok(result.includes('gravuru-mobile-demo:test-package:gravuru:text-toolbar-placement:v1'));
 const imports="import x from '../../platform/sources/app/shared/x.mjs';import y from '../../workshop/process-profiles.mjs';import z from '../configurator/variant-m/z.mjs';";
 assert.equal(rewriteDemoText(imports,'/konfi-demo/test-package/'),imports);
});
