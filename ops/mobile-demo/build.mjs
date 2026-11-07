import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
export const SOURCE_ROOT=path.resolve(HERE,'../..');
const textExtensions=new Set(['.html','.mjs','.js','.css','.json','.svg','.txt']);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const safeJSON=value=>JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
// Read-only comparison on 2026-11-07: published HTML differs from the local
// scalable models only by collection=false and these 43 text-1 deletion rights.
// The old publication patched inline HTML, leaving the saved full JSON behind.
export const PUBLISHED_REFERENCE=Object.freeze({
 '22x14':'7ae7872b409b2e1e63c85f03f57822a8835ebf4da64872b1a565e4e594949087',
 '30x20':'521d42fe10b0fb586ccf9e811b22603d9d9a924dcc2f1148bec7074c2f19f7b8'
});
export function demoNamespace(value){
 if(typeof value!=='string'||!/^\/konfi-demo\/[a-z0-9][a-z0-9-]{3,79}\/$/.test(value))throw Error('Eigenen Demo-Namespace /konfi-demo/<kennung>/ angeben.');
 return value;
}
const inside=(root,file)=>{const relative=path.relative(root,file);return relative!==''&&!relative.startsWith('..')&&!path.isAbsolute(relative);};
function resolvedNewPath(value){
 const tail=[];let current=path.resolve(value);
 while(!fs.existsSync(current)){tail.unshift(path.basename(current));const parent=path.dirname(current);if(parent===current)throw Error('Ziel hat keinen vorhandenen übergeordneten Ordner.');current=parent;}
 return path.join(fs.realpathSync(current),...tail);
}
function filesIn(directory){
 const files=[];
 function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('Verknüpfungen werden nicht veröffentlicht: '+file);if(entry.isDirectory())visit(file);else if(entry.isFile())files.push(file);}}
 visit(directory);return files;
}
export function rewriteDemoText(text,namespace){
 demoNamespace(namespace);
 const id=namespace.split('/').filter(Boolean).at(-1);
 const roots=['/_runtime/','/_bundle/','/configurator/','/platform/','/workshop/','/api/','/acrylic-assets/','/doorbell-assets/','/assistant.js'];
 const pattern=new RegExp(roots.map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
 let result=text.replace(pattern,match=>namespace+match.slice(1));
 // Only generated copies change; the original engine/storage remains untouched.
 for(const prefix of ['gravuru-session:','gravuru-acrylic-private:','gravuru-form-draft:','gravuru:text-toolbar-placement:v1'])result=result.replaceAll(prefix,'gravuru-mobile-demo:'+id+':'+prefix);
 return result.replaceAll('gravuru-session-uploads','gravuru-mobile-demo-'+id+'-uploads');
}
export function demoBootstrap(model,{id,namespace}){
 return `<script>window.GravuruMobileDemo=${safeJSON({id,basePath:namespace,storagePrefix:'gravuru-mobile-demo:'+id+':',ready:false,checkout:false})};window.GravuruModelProfile=${safeJSON(model.legacy)};window.UniversalConfig=${safeJSON(model.universal)};window.GravuruPreviewResources={};window.GravuruWorkshopReview=null;window.GravuruShopEntry=null;
window.addEventListener('message',e=>{if(e.source===window&&e.data?.type==='gravuru-ux-ready')window.GravuruMobileDemo.ready=true;});
(()=>{const prefix=${safeJSON(namespace)},nativeFetch=window.fetch.bind(window);const allowed=(input,method='GET')=>{const url=new URL(typeof input==='string'?input:input.url||String(input),location.href);return ['GET','HEAD'].includes(String(method).toUpperCase())&&(url.protocol==='blob:'||url.protocol==='data:'||(url.origin===location.origin&&url.pathname.startsWith(prefix)));};window.fetch=(input,init)=>{const method=init?.method||input?.method||'GET';if(!allowed(input,method))return Promise.reject(Error('Diese Demo sendet keine Daten an den Shop.'));return nativeFetch(input,init);};const open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url,...rest){if(!allowed(String(url),method))throw Error('Diese Demo sendet keine Daten an den Shop.');return open.call(this,method,url,...rest);};try{navigator.sendBeacon=()=>false;}catch{};})();</script>`;
}
const securityMeta='<meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src \'self\' data: blob:; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' blob:; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\' data:; connect-src \'self\' data: blob:; object-src \'none\'; frame-src \'none\'; base-uri \'none\'; form-action \'none\'">';

export function buildMobileDemo({outputDirectory,modelFiles,namespace='/konfi-demo/mobil-20261107/',sourceRoot=SOURCE_ROOT,previewDirectory=path.join(sourceRoot,'app/configurator/variant-m/.preview'),sourceCommit='8ffeed8d90191cb89f1188a336751de2b2a4e0c0'}={}){
 demoNamespace(namespace);
 if(!outputDirectory)throw Error('Neuer Ausgabeordner ist erforderlich.');
 const output=resolvedNewPath(outputDirectory),source=fs.realpathSync(sourceRoot),preview=fs.realpathSync(previewDirectory);
 if(fs.existsSync(output))throw Error('Ausgabeordner existiert bereits; nichts wird überschrieben.');
 if(output===source||inside(source,output)||output===preview||inside(preview,output))throw Error('Ausgabe muss außerhalb des Quell-/Buildordners liegen.');
 if(!/^[a-f0-9]{40}$/.test(sourceCommit))throw Error('Gepinnten vollständigen Quellcommit angeben.');
 const id=namespace.split('/').filter(Boolean).at(-1),models={},inputHashes={};
 for(const size of ['22x14','30x20']){
  if(!modelFiles?.[size])throw Error('Vollständiges Modell fehlt: '+size);
  const file=fs.realpathSync(modelFiles[size]);if(file===output||inside(output,file))throw Error('Quelle darf nicht im Ausgabeordner liegen.');
  const raw=fs.readFileSync(file);inputHashes[size]={sha256:sha(raw),bytes:raw.length};
  const model=JSON.parse(raw),config=model.universal,profile=config?.profile;
  if(!model.legacy||!profile||profile.material?.kind!=='slate'||profile.designs?.length!==43||!config.scalableSizes||Object.keys(config.localResources?.fonts||{}).length===0)throw Error('Vollständiges Schiefermodell mit 43 Designs, skalierbaren Größen und Schriften erforderlich: '+size);
  const sizes=config.scalableSizes.sizes.map(s=>[s.id,s.basePriceCents,s.profile?.designs?.length]);
  if(JSON.stringify(sizes)!==JSON.stringify([['22x14',1999,43],['30x20',2499,43]]))throw Error('Größen/Preise weichen vom bestätigten Testumfang ab.');
  models[size]=model;
 }
 const editor=fs.readFileSync(path.join(preview,'editor.html'),'utf8');
 if((editor.match(/<head>/g)||[]).length!==1||!editor.includes('gravuruModules'))throw Error('Vollständiger Editor-Build fehlt.');
 for(const name of ['demo.mjs','demo.css'])if(!fs.statSync(path.join(source,'app/configurator/mobile-demo',name)).isFile())throw Error('Demo-Oberfläche fehlt: '+name);
 fs.mkdirSync(output,{recursive:true,mode:0o700});
 const manifest={schema:'gravuru-mobile-demo/v1',namespace,sourceCommit,checkout:false,storagePrefix:'gravuru-mobile-demo:'+id+':',inputs:inputHashes,models:{},files:{}};
 const put=(relative,bytes,{origin=null,transform=false}={})=>{
  if(typeof relative!=='string'||relative.startsWith('/')||relative.split('/').some(p=>!p||p==='..'||p.startsWith('.')))throw Error('Ungültiger Paketpfad.');
  let data=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
  if(transform&&textExtensions.has(path.extname(relative)))data=Buffer.from(rewriteDemoText(data.toString('utf8'),namespace));
  const file=path.join(output,...relative.split('/'));if(!inside(output,file))throw Error('Paketpfad verlässt Ziel.');
  if(fs.existsSync(file)){if(!fs.readFileSync(file).equals(data))throw Error('Unterschiedliche Ressourcen mit gleichem Ziel: '+relative);return;}
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,data,{flag:'wx',mode:0o600});
  manifest.files[relative]={bytes:data.length,sha256:sha(data),...(origin?{sourceSha256:sha(bytes)}:{})};
  if(textExtensions.has(path.extname(relative))&&data.length>1024){const gzip=gzipSync(data,{level:9});fs.writeFileSync(file+'.gz',gzip,{flag:'wx',mode:0o600});manifest.files[relative+'.gz']={bytes:gzip.length,sha256:sha(gzip)};}
 };
 const copyTree=(base,dest,filter=()=>true)=>{for(const file of filesIn(base)){const relative=path.relative(base,file).split(path.sep).join('/');if(filter(relative))put(dest+'/'+relative,fs.readFileSync(file),{origin:file,transform:true});}};
 copyTree(path.join(source,'app/designs/aosu-labrador/runtime'),'_runtime');
 copyTree(path.join(preview,'lazy'),'_runtime/lazy',name=>!name.endsWith('.gz'));
 const usedBundles=new Set([...editor.matchAll(/\/_bundle\/(editor-[a-f0-9]{16}\.mjs)/g)].map(m=>m[1]));
 if(usedBundles.size!==5)throw Error('Die fünf vollständigen Editor-Bündel fehlen.');
 for(const name of usedBundles)put('_bundle/'+name,fs.readFileSync(path.join(preview,'bundle',name)),{origin:name,transform:true});
 copyTree(path.join(source,'app/configurator/variant-m'),'configurator/variant-m',name=>!name.includes('/')&&!name.includes('.test.')&&/\.(?:mjs|js|css)$/.test(name)&&!/(?:^|-)build\./.test(name)&&!name.startsWith('server.'));
 copyTree(path.join(source,'app/platform/sources/app/shared'),'platform/sources/app/shared',name=>!name.includes('.test.')&&/\.(?:mjs|js|css)$/.test(name));
 for(const name of ['theme-limits.mjs','process-profiles.mjs'])put('workshop/'+name,fs.readFileSync(path.join(source,'app/workshop',name)),{origin:name,transform:true});
 copyTree(path.join(source,'app/designs/acrylic-unser-anfang'),'acrylic-assets',name=>!name.includes('/')&&/\.(?:png|webp)$/.test(name));
 for(const [target,original] of [['assistant.js','assistant.js'],['api/guides','guides.json']])put(target,fs.readFileSync(path.join(preview,original)),{origin:original,transform:true});
 for(const name of ['demo.mjs','demo.css'])put(name,fs.readFileSync(path.join(source,'app/configurator/mobile-demo',name)),{origin:name});
 for(const [size,original] of Object.entries(models)){
  const model=structuredClone(original),config=model.universal,resource=config.localResources;
  delete model.configuration;
  let restoredDeletionRights=0;
  for(const design of config.profile.designs){
   const object=design.objects.find(o=>o.id==='text-1'&&o.type==='text'),rights=config.workshopElementRights?.[design.id]?.['text-1'];
   if(!object||object.technicalLocked||object.locked||object.acrylicFixed||object.role==='guide'||typeof rights?.delete!=='boolean')throw Error('Belegte veröffentlichte Löschrechte fehlen: '+design.id);
   if(!rights.delete)restoredDeletionRights++;
   rights.delete=true;
  }
  config.customerUI={...config.customerUI,designFilters:{...config.customerUI?.designFilters,collection:false}};
  const setBinding=(profile,suffix)=>{profile.id='demo-'+id+'-'+suffix;profile.revision='demo-'+id+':1';profile.binding={kind:'local-review',productId:profile.id};profile.features={...profile.features,orderEnabled:false,productionConfirmed:false};};
  setBinding(config.profile,size);setBinding(model.legacy,size);
  for(const entry of config.scalableSizes.sizes)setBinding(entry.profile,entry.id);
  for(const variant of model.legacy.purchasing?.variants||[])variant.variantId=null;
  config.reviewOnly=true;config.productPreview=true;
  resource.lazyFonts=Object.entries(resource.fonts).map(([name,font])=>{const body=Buffer.from(JSON.stringify(font)),hash=sha(body);put('schriften/'+hash+'.json',body);return {name,url:namespace+'schriften/'+hash+'.json',...(typeof font.label==='string'?{label:font.label}:{}),...(typeof font.category==='string'?{category:font.category}:{})};});
  resource.fonts={};
  // The existing accessory renderer already accepts URL images. Save those exact
  // bytes once, as the original review-site builder did; never crop or re-encode.
  // Groundplate/design imagery remains the original data URL for strict validation.
  let accessoryImages=0;
  for(const choice of config.slateAccessories?.choices||[])for(const image of choice.images||[]){
   const match=typeof image.src==='string'&&image.src.match(/^data:image\/(png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/=\r\n]+)$/);
   if(!match)continue;
   const bytes=Buffer.from(match[2],'base64'),extension=({jpeg:'jpg','svg+xml':'svg'})[match[1]]||match[1],file='material/'+sha(bytes)+'.'+extension;
   put(file,bytes);image.src=namespace+file;accessoryImages++;
  }
  const raw=JSON.stringify(model);put('model-'+size+'.json',raw);
  const bootstrap=demoBootstrap(model,{id,namespace});
  const page=rewriteDemoText(editor,namespace).replace(/<title>[\s\S]*?<\/title>/,'<title>Mobile Konfi-Demo · Gravuru</title>').replace('<head>',()=>'<head><meta charset="utf-8">'+securityMeta+bootstrap).replace('</body>',()=>`<script type="module" src="${namespace}demo.mjs"></script></body>`);
  put(size+'.html',page);
  manifest.models[size]={designs:config.profile.designs.length,fonts:resource.lazyFonts.length,accessoryImages,restoredDeletionRights,publishedHtmlSha256:PUBLISHED_REFERENCE[size],defaultSize:config.scalableSizes.defaultSizeId,originalDesignSha256:sha(JSON.stringify(original.universal.profile.designs)),designSha256:sha(JSON.stringify(config.profile.designs)),materialSha256:sha(config.materialSurface),sourceMaterialSha256:sha(original.universal.materialSurface)};
 }
 put('index.html','<!doctype html><html lang="de"><meta charset="utf-8">'+securityMeta+'<meta name="viewport" content="width=device-width,initial-scale=1"><title>Konfi-Demo</title><meta http-equiv="refresh" content="0;url=22x14.html?fresh=1"><p><a href="22x14.html?fresh=1">Mobile Konfi-Demo öffnen</a></p></html>');
 fs.writeFileSync(path.join(output,'MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
 return {outputDirectory:output,namespace,files:Object.keys(manifest.files).length,bytes:Object.values(manifest.files).reduce((n,v)=>n+v.bytes,0),manifestSha256:sha(fs.readFileSync(path.join(output,'MANIFEST.json'))),models:manifest.models};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args={};for(let i=2;i<process.argv.length;i+=2){if(!process.argv[i].startsWith('--')||!process.argv[i+1])throw Error('Option und Wert erforderlich.');args[process.argv[i].slice(2)]=process.argv[i+1];}
 const allowed=new Set(['output','namespace','model-22x14','model-30x20','preview','source','commit']);for(const key of Object.keys(args))if(!allowed.has(key))throw Error('Unbekannte Option: '+key);
 console.log(JSON.stringify(buildMobileDemo({outputDirectory:args.output,namespace:args.namespace,modelFiles:{'22x14':args['model-22x14'],'30x20':args['model-30x20']},...(args.preview?{previewDirectory:args.preview}:{}),...(args.source?{sourceRoot:args.source}:{}),...(args.commit?{sourceCommit:args.commit}:{})})));
}
