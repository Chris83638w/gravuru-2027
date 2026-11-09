import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import http from 'node:http';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {BUNDLE_ENTRIES,BUNDLE_NAME,collectModules,transformModule,buildEditorBundle,buildProductEditorBundles,patchEditorBundle,fileForUrl,DEVICE_ENTRIES,PRESENTATION_ENTRIES} from './bundle-build.mjs';
import {acrylAssetText,acrylRoute} from '../../workshop/acryl-employee-host.mjs';
import {currentEditorBundles} from '../../workshop/ui/shop-warm.mjs';
import {build,OUTPUT} from './build.mjs';
import {createPreviewServer} from './server.mjs';

const read=files=>url=>{if(!(url in files))throw Error('fehlt: '+url);return files[url];};
const loadBundle=async file=>(await import(pathToFileURL(file).href+'?t='+Date.now())).default;
// blob:-Verknüpfung in Node nachstellen: dieselben Platzhalter, aber data:-URLs (Node importiert keine blob:-URLs).
async function linkInNode(file,entry){
  const text=fs.readFileSync(file,'utf8');
  const modules=JSON.parse(text.match(/^const MODULES=(.*);$/m)[1]),cache=new Map();
  const dataUrl=i=>{if(cache.has(i))return cache.get(i);let code=modules[i].code;for(const d of modules[i].deps)code=code.replaceAll('gravuru-bundle:'+d+"'",dataUrl(d)+"'").replaceAll('gravuru-bundle:'+d+'"',dataUrl(d)+'"');code=code.replace(/globalThis\.gravuruModules\.import\(['"]([^'"]+)['"]\)/g,(_,url)=>'import('+JSON.stringify(pathToFileURL(fileForUrl(url)).href)+')');const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(i,url);return url;};
  return import(dataUrl(modules.findIndex(m=>m.url===entry)));
}

test('Modulgraph: Importformen, Reihenfolge Abhängigkeiten zuerst, Zyklen und fremde Angaben werden gemeldet',()=>{
  const files={
    '/configurator/variant-m/a.mjs':"import {b} from './b.mjs'\nimport * as c from \"../../platform/sources/app/shared/models/c.mjs\";\nexport {d} from './d.mjs';\nimport './e.mjs';\nexport const a=b+c.c;",
    '/configurator/variant-m/b.mjs':"import {\n  d,\n  d as dd\n} from './d.mjs';export const b=d+dd;",
    '/platform/sources/app/shared/models/c.mjs':"export var c=1,x=2;",
    '/configurator/variant-m/d.mjs':"export const d=1;",
    '/configurator/variant-m/e.mjs':"globalThis.e=1;"
  };
  const {order,modules}=collectModules(['/configurator/variant-m/a.mjs'],{read:read(files)});
  assert.deepEqual(order,['/configurator/variant-m/d.mjs','/configurator/variant-m/b.mjs','/platform/sources/app/shared/models/c.mjs','/configurator/variant-m/e.mjs','/configurator/variant-m/a.mjs']);
  assert.deepEqual(modules.get('/configurator/variant-m/a.mjs').deps,['/configurator/variant-m/b.mjs','/platform/sources/app/shared/models/c.mjs','/configurator/variant-m/d.mjs','/configurator/variant-m/e.mjs']);
  assert.throws(()=>collectModules(['/configurator/variant-m/x.mjs'],{read:read({'/configurator/variant-m/x.mjs':"import {y} from './y.mjs';",'/configurator/variant-m/y.mjs':"import {x} from './x.mjs';"})}),/Zyklischer Import/);
  assert.throws(()=>collectModules(['/configurator/variant-m/n.mjs'],{read:read({'/configurator/variant-m/n.mjs':"import x from 'paket';"})}),/Nur relative oder absolute/);
  assert.throws(()=>fileForUrl('/geheim/x.mjs'),/außerhalb/);
});

test('Umschreiben: Modulangaben → Platzhalter, dynamische Importe → gravuruModules, Stylesheets → gebündelt',()=>{
  const index=new Map([['/configurator/variant-m/b.mjs',0],['/configurator/variant-m/c.mjs',1]]);
  const source="import {b} from './b.mjs';\nexport {c} from \"./c.mjs\";\nconst css=await fetch('/configurator/variant-m/ux.css');const m=await import('./b.mjs');const n=el.import(file);\nconst s='kein import hier';";
  const result=transformModule('/configurator/variant-m/a.mjs',source,index);
  assert.match(result.code,/import \{b\} from 'gravuru-bundle:0';/);
  assert.match(result.code,/export \{c\} from "gravuru-bundle:1";/);
  assert.match(result.code,/globalThis\.gravuruModules\.fetch\('\/configurator\/variant-m\/ux\.css'\)/);
  assert.match(result.code,/globalThis\.gravuruModules\.import\('\/configurator\/variant-m\/b\.mjs'\)/);
  assert.match(result.code,/el\.import\(file\)/);assert.match(result.code,/kein import hier/);
  assert.deepEqual([result.statics,result.dynamics,result.styles],[2,1,['/configurator/variant-m/ux.css']]);
  assert.throws(()=>transformModule('/configurator/variant-m/a.mjs','const u=import.meta.url;',index),/import\.meta/);
});

test('Editor-Bündel enthält alle statisch erreichbaren Module unverändert (bis auf Modulangaben) und die Stylesheets',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-bundle-'));
  try{
    const result=buildEditorBundle(dir);
    assert.match(result.name,BUNDLE_NAME);
    const bundle=await loadBundle(result.file);
    assert.equal(bundle.hash,result.hash);assert.deepEqual(bundle.urls,result.modules);
    // Unabhängige Prüfung des Abschlusses: jede Modulangabe jedes Quelltextes zeigt auf ein Modul im Bündel.
    const set=new Set(bundle.urls);
    assert.ok(set.has('/platform/sources/app/shared/models/text-paths.mjs'));
    assert.equal(set.has('/platform/sources/app/shared/models/doorbell-preview.mjs'),false,'common text rendering must not pull in the device preview or its old CDN font loader');
    for(const url of DEVICE_ENTRIES)assert.equal(set.has(url),false,'device logic must not be delivered in the common bundle: '+url);
    for(const name of ['doorbells','doorbell-release','runtime-contract','studio-products'])assert.equal(set.has('/platform/sources/app/shared/models/'+name+'.mjs'),false,'customer core must not include merchant administration: '+name);
    for(const entry of BUNDLE_ENTRIES)assert.ok(set.has(entry),entry);
    const specifier=/(?:^|[;{}\n])\s*(?:import|export)\s*(?:[\w$*{}\s,]*?\s*from\s*)?['"]([^'"\n]+)['"]/g;
    const sourceOf=url=>fs.readFileSync(fileForUrl(url),'utf8');
    for(const url of bundle.urls)for(const m of sourceOf(url).matchAll(specifier))assert.ok(set.has(new URL(m[1],'http://x'+url).pathname),url+' → '+m[1]);
    // Alle Editor-Module des Kundeneditors, die der Editor zur Laufzeit lädt, sind enthalten.
    for(const name of ['ux.mjs','acrylic-scene.mjs','mobile-steps.mjs','photo-upload.mjs','lazy-resources.mjs','contract.mjs','refinements.mjs','selection-arrows.mjs','completion.mjs'])assert.ok(set.has('/configurator/variant-m/'+name),name);
    for(const url of ['/workshop/theme-limits.mjs','/workshop/process-profiles.mjs','/platform/sources/app/shared/vendor/fflate-0.8.3.mjs'])assert.ok(set.has(url),url);
    assert.ok(bundle.urls.length>=70,String(bundle.urls.length));
    // Quelltext unverändert bis auf die Modulangaben.
    const text=fs.readFileSync(result.file,'utf8'),modules=JSON.parse(text.match(/^const MODULES=(.*);$/m)[1]);
    const neutral=code=>code.replace(/(['"])(?:gravuru-bundle:\d+|\.{1,2}\/[^'"\n]+|\/[^'"\n]+\.mjs)\1/g,'"§"').replace(/globalThis\.gravuruModules\.fetch\(/g,'fetch(').replace(/globalThis\.gravuruModules\.import\(/g,'import(').replace(/\n\/\/# sourceURL=.*\n$/,'');
    for(const m of modules)assert.equal(neutral(m.code),neutral(sourceOf(m.url).replace(/^﻿/,'')),m.url);
    // Stylesheets: genau die per fetch geladenen, Inhalt identisch.
    assert.deepEqual(bundle.styles,['acrylic-scene','completion','customer-tools','layout','mobile','modern-layout','modern-navigation','motif-tile-fit','neutral-theme','product-design-gallery','refinements','usability','ux-details','ux','view-zoom','workflow'].map(n=>'/configurator/variant-m/'+n+'.css'));
    for(const href of bundle.styles)assert.equal(bundle.style(href),fs.readFileSync(fileForUrl(href),'utf8'));
    assert.equal(bundle.style('/configurator/variant-m/fehlt.css'),null);
    // Name = Inhalts-Hash; gzip daneben mit identischem Inhalt; erneuter Build ändert nichts.
    assert.equal(zlib.gunzipSync(fs.readFileSync(result.file+'.gz')).toString('utf8'),text);
    const again=buildEditorBundle(dir);assert.equal(again.name,result.name);
    assert.deepEqual(fs.readdirSync(path.join(dir,'bundle')).sort(),[result.name,result.name+'.gz']);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Gebündelte Module verknüpfen sich als echte ES-Module und verhalten sich wie die Einzelmodule',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-bundle-'));
  try{
    const entry='/configurator/variant-m/contract.mjs';
    const result=buildEditorBundle(dir,{entries:[entry]});
    const bundled=await linkInNode(result.file,entry),direct=await import('./contract.mjs');
    assert.deepEqual(Object.keys(bundled).sort(),Object.keys(direct).sort());
    assert.equal(bundled.money(123456),direct.money(123456));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('product chunk retains common module identities and contains only the missing static dependency closure',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-product-bundle-'));
 try{
  const result=buildProductEditorBundles(directory),common=new Set(result.modules);
  const chunk=JSON.parse(fs.readFileSync(result.device.file,'utf8').match(/^const MODULES=(.*);$/m)[1]);
  const device=new Set(chunk.map(m=>m.url));
  for(const entry of DEVICE_ENTRIES)assert.ok(device.has(entry),entry);
  for(const module of chunk){
   assert.equal(common.has(module.url),false,'no duplicate common module instance');
   for(const dependency of module.deps){
    if(typeof dependency==='number')assert.ok(chunk[dependency]);
    else assert.ok(common.has(dependency),dependency);
   }
   assert.equal(result.chunks[module.url],result.device.url);
  }
  assert.ok(chunk.some(m=>m.deps.some(d=>typeof d==='string')),'shared dependencies stay external');
  assert.ok(fs.existsSync(result.file));assert.ok(fs.existsSync(result.device.file));
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('R15 chunk closes the presentation graph without duplicate native modules or changed presentation code',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-r15-bundle-'));
 try{
  const result=buildProductEditorBundles(directory),common=new Set(result.modules),chunk=result.presentation;
  const modules=JSON.parse(fs.readFileSync(chunk.file,'utf8').match(/^const MODULES=(.*);$/m)[1]);
  const native=collectModules(PRESENTATION_ENTRIES),missing=native.order.filter(url=>!common.has(url));
  assert.deepEqual(chunk.modules,missing);assert.equal(modules.length,15);
  const normalize=source=>source.replace(/(['"])(?:gravuru-bundle:[^'"\n]+|\.\.?\/[^'"\n]+|\/[^'"\n]+\.mjs)\1/g,'"§"').replace(/new URL\([^;]+?globalThis\.location\.href\)/g,'ASSET').replace(/new URL\([^;]+?import\.meta\.url\)/g,'ASSET').replace(/\n\/\/# sourceURL=.*\n$/,'');
  for(const m of modules){
   assert.equal(common.has(m.url),false,m.url);assert.equal(result.chunks[m.url],chunk.url);
   assert.equal(normalize(m.code),normalize(fs.readFileSync(fileForUrl(m.url),'utf8').replace(/^\uFEFF/,'')),m.url);
   for(const dependency of m.deps)assert.ok(typeof dependency==='number'?modules[dependency]:common.has(dependency),String(dependency));
  }
  const demo=modules.find(m=>m.url.endsWith('/demo.mjs')).code;
  assert.match(demo,/new URL\('\/configurator\/mobile-demo\/demo\.css',globalThis\.location\.href\)/);
  assert.match(demo,/new URL\('\/configurator\/mobile-demo\/shopping-cart\.svg',globalThis\.location\.href\)/);
  assert.doesNotMatch(demo,/import\.meta/);
  const rewritten=acrylAssetText(demo);
  assert.match(rewritten,/\/acryl-configurator\/mobile-demo\/demo\.css/);
  assert.match(rewritten,/\/acryl-configurator\/mobile-demo\/shopping-cart\.svg/);
  const html=acrylAssetText(patchEditorBundle('<head></head><script>import(\'/configurator/variant-m/ux.mjs\')</script>',result.url,result.chunks));
  assert.deepEqual(currentEditorBundles(html),[result.url,chunk.url].map(url=>url.replace('/_bundle/','/_acryl-bundle/')));
  assert.ok(!currentEditorBundles(html).includes(result.device.url));
  assert.equal(acrylRoute(chunk.url.replace('/_bundle/','/_acryl-bundle/')),chunk.url);
  assert.ok(chunk.gzipBytes<50*1024,'presentation stays a small separate chunk');
  const again=buildProductEditorBundles(directory);assert.equal(again.presentation.hash,chunk.hash);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('bundled R15 executes the same native session and cross-realm guards',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-r15-link-'));
 try{
  const result=buildProductEditorBundles(directory),files=new Map();
  const chunks=[result,result.presentation].map(b=>JSON.parse(fs.readFileSync(b.file,'utf8').match(/^const MODULES=(.*);$/m)[1]));
  for(const modules of chunks)for(const m of modules)files.set(m.url,pathToFileURL(path.join(directory,'module-'+files.size+'.mjs')).href);
  for(const modules of chunks)for(const m of modules){
   let code=m.code;
   for(const dep of m.deps){const target=files.get(typeof dep==='number'?modules[dep].url:dep);assert.ok(target);code=code.replaceAll('gravuru-bundle:'+dep+"'",target+"'").replaceAll('gravuru-bundle:'+dep+'"',target+'"');}
   code=code.replace(/globalThis\.gravuruModules\.import\(['"]([^'"]+)['"]\)/g,(_,url)=>'import('+JSON.stringify(files.get(url)||pathToFileURL(fileForUrl(url)).href)+')');
   fs.writeFileSync(new URL(files.get(m.url)),code);
  }
  const bundled=await import(files.get(PRESENTATION_ENTRIES[0])),direct=await import('../mobile-demo/shop-shell.mjs');
  const config={profile:{name:'Türschild',material:{kind:'steel'}},photo:{enabled:false},logo:{enabled:true}},binding={productId:'cfg_test',productRevision:4};
  const host={location:{origin:'https://app.example'},UniversalConfig:config,GravuruWorkshopReview:binding,GravuruShopEntry:{...binding,presentation:'prio-r15',cartMode:'theme',submitCart(){},request(){}}};
  const context={host,view:{location:{origin:host.location.origin}},config};
  assert.deepEqual(bundled.shopPresentationContext(context),direct.shopPresentationContext(context));
  assert.equal(bundled.shopProductSummary(config,{width:80,height:53.3},bundled.shopPresentationContext(context)),'Edelstahl · 8 × 5,33 cm');
  for(const bad of [{...context,config:structuredClone(config)},{...context,view:{location:{origin:'https://foreign.example'}}},{...context,view:host}])assert.throws(()=>bundled.shopPresentationContext(bad));
  delete host.GravuruShopEntry.presentation;assert.equal(await bundled.installPrioShopShell(null,config,context),null);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('Editor lädt das Bündel über den Lader; Einzelmodule bleiben als Entwicklungsmodus erreichbar',()=>{
  const result=build();
  assert.match(result.bundle.url,/^\/_bundle\/editor-[a-f0-9]{16}\.mjs$/);
  const editor=fs.readFileSync(path.join(OUTPUT,'editor.html'),'utf8');
  assert.equal(editor.split('<link rel="modulepreload" href="'+result.bundle.url+'"').length,2);
  assert.match(editor,/window\.gravuruModules=\(\(\)=>\{/);
  assert.match(editor,/get\('module'\)==='einzeln'/);
  for(const name of ['profile-selection','preview-resource','adapter','lazy-resources','ux'])assert.match(editor,new RegExp(`window\\.gravuruModules\\.import\\('/configurator/variant-m/${name}\\.mjs'\\)`));
  assert.doesNotMatch(editor,/[^.]import\('\/configurator\/variant-m\//);
  assert.throws(()=>patchEditorBundle('<html></html>',result.bundle.url),/head/);
  assert.throws(()=>patchEditorBundle('<head></head>','/_bundle/x.mjs'),/Bündelname/);
});

test('Server: Bündel mit langem Cache und gzip, unbekannte Namen und Pfadausbruch gesperrt',async()=>{
  const result=build();
  const server=createPreviewServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const port=server.address().port;
  const request=(url,headers={})=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path:url,headers},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});req.on('error',reject);req.end();});
  try{
    const zipped=await request(result.bundle.url,{'Accept-Encoding':'gzip'});
    assert.equal(zipped.status,200);assert.equal(zipped.headers['content-encoding'],'gzip');
    assert.equal(zipped.headers['cache-control'],'public, max-age=31536000, immutable');
    assert.match(zipped.headers['content-type'],/^text\/javascript/);
    const plain=await request(result.bundle.url);assert.equal(plain.headers['content-encoding'],undefined);
    assert.equal(zlib.gunzipSync(zipped.body).toString('utf8'),plain.body.toString('utf8'));
    // Name trägt den Inhalts-Hash (bundle-build.mjs).
    assert.ok(plain.body.toString('utf8').includes('HASH='+JSON.stringify(result.bundle.url.match(/editor-([a-f0-9]{16})/)[1])));
    for(const route of ['/_bundle/editor-0000000000000000.mjs','/_bundle/editor-'+'a'.repeat(16)+'.mjs.gz','/_bundle/%2e%2e%2fmodels.json','/_bundle/editor-'+'a'.repeat(16)+'.mjs%2f..%2f..%2fmodels.json','/_bundle/stempel.json','/_bundle/'])assert.equal((await request(route)).status,404,route);
    const editor=await request('/editor.html');assert.equal(editor.status,200);
    const presentation=/<link rel="modulepreload" href="([^\"]+)" data-gravuru-bundle="prio-r15">/.exec(editor.body.toString('utf8'))?.[1];assert.ok(presentation);
    const r15=await request(presentation,{'Accept-Encoding':'gzip'});assert.equal(r15.status,200);assert.equal(r15.headers['cache-control'],'public, max-age=31536000, immutable');
    assert.equal(r15.headers['content-encoding'],'gzip');assert.match(zlib.gunzipSync(r15.body).toString('utf8'),/configurator\/mobile-demo\/shop-shell\.mjs/);
  }finally{server.close();await once(server,'close');}
});
