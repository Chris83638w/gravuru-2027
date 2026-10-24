import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const reports=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(reports,'../gravuru-2027');
const variant=path.join(repo,'app/configurator/variant-m');
const output=path.join(reports,'paket-bc-bundle-check');
const sha=data=>createHash('sha256').update(data).digest('hex');
const sourceNames=['usability.mjs','surfaces.mjs','bundle-build.mjs','build.mjs','server.mjs'];
const before=Object.fromEntries(sourceNames.map(name=>[name,sha(fs.readFileSync(path.join(variant,name)))]));
const bundler=await import(pathToFileURL(path.join(variant,'bundle-build.mjs')));
const graph=bundler.collectModules();
const result=bundler.buildEditorBundle(output);
const bytes=fs.readFileSync(result.file);
const text=bytes.toString('utf8');
const modules=JSON.parse(text.match(/^const MODULES=(.*);$/m)[1]);
const usabilityUrl='/configurator/variant-m/usability.mjs';
const surfacesUrl='/configurator/variant-m/surfaces.mjs';
const usabilityIndex=modules.findIndex(m=>m.url===usabilityUrl);
const surfacesIndex=modules.findIndex(m=>m.url===surfacesUrl);
assert.ok(usabilityIndex>=0&&surfacesIndex>=0);
assert.ok(graph.modules.get(usabilityUrl).deps.includes(surfacesUrl));
assert.ok(modules[usabilityIndex].deps.includes(surfacesIndex));
assert.ok(modules[usabilityIndex].code.includes("import {objectSurface} from 'gravuru-bundle:"+surfacesIndex+"'"));
assert.ok(modules[surfacesIndex].code.includes('export const objectSurface='));
assert.ok(zlib.gunzipSync(fs.readFileSync(result.file+'.gz')).equals(bytes));
// Link the actual generated payload with native ES-module binding checks.
// No browser and no application-source edits.
const context=vm.createContext({console,TextEncoder,TextDecoder,URL,Blob,structuredClone});
const linked=modules.map(m=>new vm.SourceTextModule(m.code,{context,identifier:m.url}));
const linker=specifier=>{
 const match=/^gravuru-bundle:(\d+)$/.exec(specifier);
 assert.ok(match,'Unexpected external import: '+specifier);
 const dependency=linked[Number(match[1])];
 assert.ok(dependency,'Unresolved bundled dependency: '+specifier);
 return dependency;
};
for(const module of linked)if(module.status==='unlinked')await module.link(linker);
await linked[usabilityIndex].evaluate();
assert.equal(typeof linked[surfacesIndex].namespace.objectSurface,'function');
assert.equal(linked[surfacesIndex].namespace.objectSurface({surfaceId:'back'}),'back');
assert.equal(linked[surfacesIndex].namespace.objectSurface({}),'front');
const calls=[];
const objects=[{id:'front',type:'text',text:'Front'},{id:'back',surfaceId:'back',type:'text',text:'Back'}];
for(const side of ['front','back']){
 const issues=linked[usabilityIndex].namespace.surfaceTextIssues(objects,side,{},object=>{
  calls.push({side,object:object.id});throw Error('intentional bounds sentinel');
 });
 assert.equal(issues.length,1);assert.equal(issues[0].id,side);assert.equal(issues[0].code,'font-invalid');
}
assert.deepEqual(calls,[{side:'front',object:'front'},{side:'back',object:'back'}]);
const bundleApi=(await import(pathToFileURL(result.file))).default;
assert.ok(bundleApi.has(usabilityUrl)&&bundleApi.has(surfacesUrl));
assert.ok(bundleApi.style('/configurator/variant-m/usability.css'));
const loader=bundler.loaderScript(result.url);
assert.ok(loader.includes(result.url)&&loader.includes('b?.blobUrl(spec)||spec'));
const buildSource=fs.readFileSync(path.join(variant,'build.mjs'),'utf8');
const serverSource=fs.readFileSync(path.join(variant,'server.mjs'),'utf8');
assert.ok(buildSource.includes('const bundle=buildEditorBundle(outputDirectory);'));
assert.ok(buildSource.includes('source=patchEditorBundle(source,bundle.url);'));
assert.ok(serverSource.includes("path.join(outputDirectory,'bundle',pathname.split('/').pop())"));
const after=Object.fromEntries(sourceNames.map(name=>[name,sha(fs.readFileSync(path.join(variant,name)))]));
assert.deepEqual(after,before,'Sources changed during proof');
const report={
 status:'passed',createdAt:new Date().toISOString(),
 scope:'Production bundle step, actual generated payload, native ESM linking and focused surface helper invocation; no browser or full build',
 command:'node --experimental-vm-modules work/reports/paket-bc-revision-bundle-check.mjs',
 productionCommand:'npm run build',
 coordination:'catalog_scripts confirmed no tests running; independent output directory used; global build not invoked because writeLazyResources uses the shared LAZY path',
 sourceSha256:before,sourcesUnchanged:true,outputDirectory:output,
 bundle:{url:result.url,file:result.file,sha256:sha(bytes),hash:result.hash,bytes:result.bytes,gzipBytes:result.gzipBytes,moduleCount:modules.length,styleCount:result.styles.length,gzipMatches:true},
 objectSurface:{importFile:'app/configurator/variant-m/usability.mjs',importLine:7,exportFile:'app/configurator/variant-m/surfaces.mjs',exportLine:18,usabilityIndex,surfacesIndex,generatedImport:"import {objectSurface} from 'gravuru-bundle:"+surfacesIndex+"'",nativeEsmLinkPassed:true,allBundledModulesLinked:linked.length,focusedCalls:calls},
 assetResolution:{usabilityPath:bundler.fileForUrl(usabilityUrl),surfacesPath:bundler.fileForUrl(surfacesUrl),usabilityStylesBundled:true,productionBuildCallsSameBundler:true,productionEditorLoaderUsesBundle:true,serverRouteReadsOutputBundle:true},
 limitations:['No browser rendering or HTTP serving checked.','Full npm build not invoked to avoid shared .preview/lazy writes.','Proof is bound to the recorded source hashes; later edits require a new build.']
};
fs.writeFileSync(path.join(reports,'paket-bc-revision-bundle-check.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,bundle:report.bundle,objectSurface:report.objectSurface,report:path.join(reports,'paket-bc-revision-bundle-check.json')}));
