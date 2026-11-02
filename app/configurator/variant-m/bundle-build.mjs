// Ladezeit: gebündelte Fassung der Editor-Module (Entscheidung Chris 20.10.2026), ohne npm-Abhängigkeit.
// Der Editor lud ~80 einzelne ES-Module über Import-Wasserfälle (bei 150 ms Latenz je Ebene eine Runde)
// und danach ~10 Stylesheets nacheinander per fetch. Das Bündel enthält alle statisch erreichbaren Module
// der Einstiegspunkte unverändert als Text plus die per fetch geladenen Stylesheets; zur Laufzeit werden
// die Module als blob:-Module verknüpft (echte ES-Module-Semantik: Bindungen, Reihenfolge, strict mode).
// Geändert werden nur die Modulangaben (Platzhalter → blob-URL), dynamische import() bekannter Pfade
// (→ gravuruModules.import, ein Exemplar je Modul) und fetch der Stylesheets (→ gravuruModules.fetch).
// Dateiname mit Inhalts-Hash, gzip daneben; der Server liefert beides mit langem Cache.
// Entwicklungsmodus: `?module=einzeln` an der Kundenseite lädt weiter die Einzelmodule.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const APP=path.resolve(HERE,'../..');
// URL-Präfix → Ordner, wie der Server sie ausliefert (server.mjs).
export const BUNDLE_MOUNTS=[['/configurator/variant-m/',HERE],['/platform/sources/app/shared/',path.join(APP,'platform/sources/app/shared')],['/workshop/',path.join(APP,'workshop')]];
// Einstiegspunkte des Editors (editor.html: vor dem Montieren, Nachladen, Oberfläche).
export const BUNDLE_ENTRIES=['profile-selection.mjs','preview-resource.mjs','adapter.mjs','lazy-resources.mjs','ux.mjs'].map(name=>'/configurator/variant-m/'+name);
export const BUNDLE_FORMAT='gravuru-editor-bundle/v1';
export const BUNDLE_NAME=/^editor-[a-f0-9]{16}\.mjs$/;

export function fileForUrl(url){
  const mount=BUNDLE_MOUNTS.find(([prefix])=>url.startsWith(prefix));
  if(!mount)throw Error('Modul außerhalb der ausgelieferten Ordner: '+url);
  const file=path.resolve(mount[1],url.slice(mount[0].length));
  if(path.relative(mount[1],file).startsWith('..'))throw Error('Modulpfad verlässt den Ordner: '+url);
  return file;
}

// Statische Importe/Exporte mit Modulangabe: `import … from '…'`, `export … from '…'`, `import '…'`.
// Nur am Anweisungsanfang (Zeilenanfang oder nach ; { }), wie im Quelltext durchgehend üblich.
const STATIC=/(^|[;{}\n])([ \t]*)(import|export)(\s*(?:[\w$*{}\s,]*?\s*from\s*)?)(['"])([^'"\n]+)\5/g;
const DYNAMIC=/\bimport\(\s*(['"])([^'"\n]+)\1\s*\)/g;
const STYLE_FETCH=/\bfetch\(\s*(['"])(\/configurator\/variant-m\/[a-z0-9-]+\.css)\1\s*\)/g;
const resolve=(specifier,from)=>{
  if(!/^(\.\.?\/|\/)/.test(specifier))throw Error('Nur relative oder absolute Modulangaben werden gebündelt: '+specifier+' in '+from);
  return new URL(specifier,'http://bundle'+from).pathname;
};

// Liest den Modulgraphen ab den Einstiegspunkten. Ergebnis in Abhängigkeitsreihenfolge (Abhängigkeiten zuerst).
export function collectModules(entries=BUNDLE_ENTRIES,{read=url=>fs.readFileSync(fileForUrl(url),'utf8'),exclude=new Set()}={}){
  const modules=new Map(),order=[],visiting=new Set();
  function visit(url,chain){
    if(modules.has(url)||exclude.has(url))return;
    if(visiting.has(url))throw Error('Zyklischer Import: '+[...chain,url].join(' → '));
    visiting.add(url);
    const source=read(url).replace(/^﻿/,''),deps=[];
    for(const m of source.matchAll(STATIC))deps.push(resolve(m[6],url));
    for(const dep of deps)visit(dep,[...chain,url]);
    visiting.delete(url);modules.set(url,{source,deps:[...new Set(deps)]});order.push(url);
  }
  for(const entry of entries)visit(entry,[]);
  return {modules,order};
}

// Platzhalter für Modulangaben; zur Laufzeit durch blob-URLs ersetzt.
const token=index=>`gravuru-bundle:${index}`;
export function transformModule(url,source,index,{external=new Set()}={}){
  let statics=0,dynamics=0;
  let code=source.replace(STATIC,(all,lead,space,keyword,clause,quote,specifier)=>{statics++;const dependency=resolve(specifier,url);if(!index.has(dependency)&&!external.has(dependency))throw Error('Modul fehlt im Bündel: '+dependency);return lead+space+keyword+clause+quote+token(index.has(dependency)?index.get(dependency):dependency)+quote;});
  code=code.replace(DYNAMIC,(all,quote,specifier)=>{dynamics++;return `globalThis.gravuruModules.import(${quote}${resolve(specifier,url)}${quote})`;});
  const styles=[];
  code=code.replace(STYLE_FETCH,(all,quote,href)=>{styles.push(href);return `globalThis.gravuruModules.fetch(${quote}${href}${quote})`;});
  // Was nach dem Umschreiben noch wie eine relative Modulangabe aussieht, würde im blob-Modul nicht aufgelöst.
  const left=code.match(/(^|[;{}\n])\s*(import|export)\b[^\n;]*?\bfrom\s*['"]\.\.?\//);
  if(left)throw Error('Nicht umgeschriebene Modulangabe in '+url+': '+left[0].trim().slice(0,80));
  if(/\bimport\.meta\b/.test(code))throw Error('import.meta wird im Bündel nicht unterstützt: '+url);
  return {code:code+`\n//# sourceURL=${url}\n`,statics,dynamics,styles};
}

// Laufzeit im Bündel: verknüpft die Module als blob:-Module (Abhängigkeiten zuerst, jedes einmal).
const RUNTIME=`const blobs=new Map();
function blobUrl(i){
  if(blobs.has(i))return blobs.get(i);
  const m=MODULES[i];let code=m.code;
  for(const d of m.deps){const target=typeof d==='number'?blobUrl(d):globalThis.gravuruModules.blobUrl(d);if(!target)throw Error('Gemeinsames Modul fehlt: '+d);code=code.replaceAll('gravuru-bundle:'+d+"'",target+"'").replaceAll('gravuru-bundle:'+d+'"',target+'"');}
  const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));blobs.set(i,url);return url;
}
const INDEX=new Map(MODULES.map((m,i)=>[m.url,i]));
export default {format:FORMAT,hash:HASH,urls:MODULES.map(m=>m.url),styles:Object.keys(STYLES),
  has:url=>INDEX.has(url),
  blobUrl:url=>INDEX.has(url)?blobUrl(INDEX.get(url)):null,
  style:href=>Object.prototype.hasOwnProperty.call(STYLES,href)?STYLES[href]:null};
`;

export function buildEditorBundle(outputDirectory,{entries=BUNDLE_ENTRIES,external=new Set(),keepExisting=false}={}){
  const {modules,order}=collectModules(entries,{exclude:external});
  const index=new Map(order.map((url,i)=>[url,i]));
  const styleSet=new Set(),list=[];let statics=0,dynamics=0;
  for(const url of order){
    const result=transformModule(url,modules.get(url).source,index,{external});
    statics+=result.statics;dynamics+=result.dynamics;result.styles.forEach(s=>styleSet.add(s));
    list.push({url,deps:modules.get(url).deps.map(d=>index.has(d)?index.get(d):d),code:result.code});
  }
  const styles={};for(const href of [...styleSet].sort())styles[href]=fs.readFileSync(fileForUrl(href),'utf8');
  const body=`const MODULES=${JSON.stringify(list)};\nconst STYLES=${JSON.stringify(styles)};\n`;
  const hash=createHash('sha256').update(BUNDLE_FORMAT).update(body).update(RUNTIME).digest('hex').slice(0,16);
  const source=`// ${BUNDLE_FORMAT} – erzeugt von bundle-build.mjs, nicht von Hand ändern.\nconst FORMAT=${JSON.stringify(BUNDLE_FORMAT)},HASH=${JSON.stringify(hash)};\n`+body+RUNTIME;
  const dir=path.join(outputDirectory,'bundle'),name=`editor-${hash}.mjs`,file=path.join(dir,name);
  fs.mkdirSync(dir,{recursive:true});
  if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==source){
    const temp=file+'.'+process.pid+'.tmp';fs.writeFileSync(temp,source);fs.renameSync(temp,file);
  }
  const gz=zlib.gzipSync(source,{level:9});
  if(!fs.existsSync(file+'.gz')||!fs.readFileSync(file+'.gz').equals(gz)){const temp=file+'.gz.'+process.pid+'.tmp';fs.writeFileSync(temp,gz);fs.renameSync(temp,file+'.gz');}
  // Ältere Bündel entfernen (nur erzeugte Dateien dieses Ordners).
  if(!keepExisting)for(const old of fs.readdirSync(dir))if(/^editor-[a-f0-9]{16}\.mjs(\.gz)?$/.test(old)&&!old.startsWith(name))fs.rmSync(path.join(dir,old),{force:true});
  return {url:'/_bundle/'+name,file,name,hash,modules:order,styles:Object.keys(styles),statics,dynamics,bytes:Buffer.byteLength(source),gzipBytes:gz.length};
}

// Lader im Editor (editor.html, vor allen Skripten): gravuruModules.import(url) nutzt das Bündel, sonst
// das Einzelmodul; gravuruModules.fetch liefert gebündelte Stylesheets ohne Anfrage.
export function loaderScript(bundleUrl,chunks={}){
  return `<link rel="modulepreload" href="${bundleUrl}" fetchpriority="high"><script>window.gravuruModules=(()=>{let single=false;try{single=[location,window.parent.location].some(l=>new URLSearchParams(l.search).get('module')==='einzeln');}catch{}const url=single?null:${JSON.stringify(bundleUrl)},chunks=${JSON.stringify(chunks)},pending=new Map(),loaded=new Map();let bundle=null,core=null;const load=()=>bundle??=(url?import(url).then(m=>core=m.default).catch(error=>{console.warn('Editor-Bündel nicht geladen, Einzelmodule:',error);return null;}):Promise.resolve(null));const blobUrl=spec=>core?.blobUrl(spec)||[...loaded.values()].find(b=>b.has(spec))?.blobUrl(spec)||null;return {bundle:url,load,blobUrl,async import(spec){const b=await load();if(b&&!b.has(spec)&&chunks[spec]){const chunk=chunks[spec];if(!pending.has(chunk))pending.set(chunk,import(chunk).then(m=>{loaded.set(chunk,m.default);return m.default;}));await pending.get(chunk);}return import(blobUrl(spec)||spec);},async fetch(href,init){const b=await load(),css=b?.style(href);return css==null?fetch(href,init):new Response(css,{status:200,headers:{'Content-Type':'text/css; charset=utf-8'}});}};})();window.gravuruModules.load();</script>`;
}

export const DEVICE_ENTRIES=[
 ...['doorbell-selection','doorbell-ui','doorbell-presentation','doorbell-lazy-designs'].map(n=>'/configurator/variant-m/'+n+'.mjs'),
 ...['doorbell-material-preview','doorbell-profile-validation'].map(n=>'/platform/sources/app/shared/models/'+n+'.mjs')
];
export function buildProductEditorBundles(directory){
 const core=buildEditorBundle(directory,{keepExisting:true});
 const device=buildEditorBundle(directory,{entries:DEVICE_ENTRIES,external:new Set(core.modules),keepExisting:true});
 const chunks=Object.fromEntries(device.modules.map(url=>[url,device.url]));
 const keep=new Set([core.name,core.name+'.gz',device.name,device.name+'.gz']);
 for(const name of fs.readdirSync(path.join(directory,'bundle')))if(BUNDLE_NAME.test(name.replace(/\.gz$/,''))&&!keep.has(name))fs.rmSync(path.join(directory,'bundle',name),{force:true});
 return {...core,chunks,device};
}

// Editorquelltext auf das Bündel umstellen: Lader in den Kopf, dynamische Importe über gravuruModules.
export function patchEditorBundle(source,bundleUrl,chunks={}){
  if(!BUNDLE_NAME.test(bundleUrl.split('/').pop()))throw Error('Ungültiger Bündelname: '+bundleUrl);
  const heads=source.match(/<head>/g)||[];if(heads.length!==1)throw Error('Bündel-Anker <head> ist nicht eindeutig');
  const imports=source.match(/(?<![\w$.])import\('\/configurator\/variant-m\/[a-z0-9-]+\.mjs'\)/g)||[];
  if(!imports.length)throw Error('Keine Editor-Importe gefunden');
  return source.replace('<head>',()=>'<head>'+loaderScript(bundleUrl,chunks)).replace(/(?<![\w$.])import\('(\/configurator\/variant-m\/[a-z0-9-]+\.mjs)'\)/g,"window.gravuruModules.import('$1')");
}
