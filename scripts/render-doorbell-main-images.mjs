import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {productPreview} from '../app/workshop/product-preview.mjs';
import {resolvedOptions} from '../app/configurator/variant-m/contract.mjs';
import {isLayeredDoorbell} from '../app/configurator/variant-m/doorbell-selection.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=m=>{throw Error('Funkklingel-Hauptbilder: '+m);};
const json=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
function within(root,relative){
 const file=path.resolve(root,relative),rel=path.relative(path.resolve(root),file);
 if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))fail('Ressource liegt außerhalb des freigegebenen Bildordners.');
 return file;
}
function verified(file,expected){
 if(!/^[a-f0-9]{64}$/.test(expected||''))fail('Eine Ressource benötigt ihren bestätigten SHA-256.');
 const bytes=fs.readFileSync(file);if(hash(bytes)!==expected)fail('Ressourcen-Prüfsumme weicht ab: '+path.basename(file));return bytes;
}
// Original device bytes and the already sanitized asset preview are embedded.
// No fetching, raster tracing, redesign, resampling or edits of the originals.
export function embedDoorbellImages(svg,{devicesDir,assetIndex,indexDir}){
 const entries=assetIndex.entries;
 if(!Array.isArray(entries))fail('Geprüfter SVG-Ressourcenindex fehlt.');
 const indexed=new Map(entries.map(e=>[e.url,e])),used=new Map();
 const result=svg.replace(/\bhref="([^"]+)"/g,(full,url)=>{
  if(url.startsWith('data:')||url.startsWith('#'))return full;
  const device=/^\/doorbell-assets\/([a-f0-9]{64})\.webp$/.exec(url);
  if(device){const bytes=verified(within(devicesDir,device[1]+'.webp'),device[1]);used.set(url,device[1]);return 'href="data:image/webp;base64,'+bytes.toString('base64')+'"';}
  const asset=indexed.get(url);if(!asset)fail('Bildreferenz ist nicht im geprüften Ressourcenindex: '+url);
  const bytes=verified(within(indexDir,asset.path),asset.previewSha256);
  const source=bytes.toString('utf8');
  if(/<(?:script|foreignObject)\b|\bon[a-z]+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(source))fail('Die SVG-Vorschau enthält aktive oder externe Inhalte.');
  used.set(url,asset.previewSha256);return 'href="data:image/svg+xml;base64,'+bytes.toString('base64')+'"';
 });
 if(/\bhref="(?!data:|#)/.test(result))fail('Nicht eingebettete Bildreferenz.');
 return {svg:result,resources:[...used].map(([url,sha256])=>({url,sha256}))};
}
export function mainImageSvg(source){
 const box=source.match(/\bviewBox="([^"]+)"/)?.[1].trim().split(/\s+/).map(Number);
 if(box?.length!==4||!box.every(Number.isFinite)||box[2]<=0||box[3]<=0)fail('Maßhaltige Produktvorschau fehlt.');
 const factor=1320/Math.max(box[2],box[3]),width=box[2]*factor,height=box[3]*factor;
 const nested=source.replace(/<svg\b([^>]*)>/,(_,attrs)=>'<svg'+attrs.replace(/\s(?:x|y|width|height)="[^"]*"/g,'')+' x="'+((1600-width)/2)+'" y="'+((1600-height)/2)+'" width="'+width+'" height="'+height+'">');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600" viewBox="0 0 1600 1600"><defs><filter id="main-product-shadow" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="5" dy="14" stdDeviation="12" flood-color="#25313a" flood-opacity=".18"/></filter></defs><rect width="1600" height="1600" fill="#f5f4f1"/><g filter="url(#main-product-shadow)">'+nested+'</g></svg>';
}
export async function renderDoorbellMainImages({reportFile,assetIndexFile,devicesDir,out,sharpModule=null}){
 const report=json(reportFile),indexDir=path.dirname(path.resolve(assetIndexFile)),assetIndex=json(assetIndexFile),base=path.dirname(path.resolve(reportFile));
 if(!Array.isArray(report.entries)||report.entries.length!==126)fail('Genau126 importierte Hauptproduktdokumente sind erforderlich.');
 const keys=new Set(),formats=new Map(),outputs=[];
 let sharp=null;if(sharpModule)sharp=(await import(pathToFileURL(path.resolve(sharpModule)).href)).default;
 fs.mkdirSync(out,{recursive:true});
 for(const entry of report.entries){
  if(typeof entry.key!=='string'||!/^[a-z0-9][a-z0-9-]{0,180}$/.test(entry.key)||keys.has(entry.key))fail('Eindeutiger Hauptproduktschlüssel fehlt.');
  keys.add(entry.key);
  const document=json(within(base,entry.documentPath)),config=document.config,before=JSON.stringify(config);
  if(!isLayeredDoorbell(config))fail('Dokument ist kein natives Funkklingelprodukt.');
  const options=resolvedOptions(config,{}),format=options.format,model=config.doorbell.modelKey;
  if(format!==(entry.formatKey||config.doorbell.defaultFormatKey))fail('Hauptbild und Hauptproduktformat widersprechen sich.');
  if(!['schwarz','anthrazit'].includes(options.color))fail('Bestätigte Acrylfarbe fehlt.');
  if(!formats.has(model))formats.set(model,new Set());if(formats.get(model).has(format))fail('Doppeltes Modellformat.');formats.get(model).add(format);
  const rendered=productPreview({universal:config},{options});
  const embedded=embedDoorbellImages(rendered,{devicesDir,assetIndex,indexDir});
  const svg=mainImageSvg(embedded.svg),filename=entry.key+'.svg';
  fs.writeFileSync(path.join(out,filename),svg);
  const row={key:entry.key,modelKey:model,formatKey:format,color:options.color,svg:filename,sha256:hash(svg),resources:embedded.resources};
  if(sharp){
   // librsvg does not decode embedded WebP on every platform. Preserve exact
   // decoded pixels in a PNG transport for the rasterizer; the source SVG and
   // original WebP provenance stay unchanged.
   let rasterSvg=svg;
   for(const match of [...svg.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g)]){
    const png=await sharp(Buffer.from(match[1],'base64')).png().toBuffer();
    rasterSvg=rasterSvg.replace(match[0],'data:image/png;base64,'+png.toString('base64'));
   }
   const bytes=Buffer.from(rasterSvg);
   await sharp(bytes,{density:96}).resize(1600,1600).png().toFile(path.join(out,entry.key+'.png'));
   await sharp(bytes,{density:96}).resize(1600,1600).webp({quality:92}).toFile(path.join(out,entry.key+'.webp'));
   row.png=entry.key+'.png';row.webp=entry.key+'.webp';
   row.pngSha256=hash(fs.readFileSync(path.join(out,row.png)));row.webpSha256=hash(fs.readFileSync(path.join(out,row.webp)));
  }
  if(JSON.stringify(config)!==before)fail('Vorschau hat das gespeicherte Produkt verändert.');
  outputs.push(row);
 }
 if(formats.size!==42||[...formats.values()].some(s=>s.size!==3))fail('42Modelle mit je3Formaten sind erforderlich.');
 if(new Set(outputs.map(o=>o.color)).size!==2)fail('Die bestätigten Hauptprodukte müssen Schwarz und Anthrazit variieren.');
 const result={schema:'gravuru-doorbell-main-images/v1',products:126,models:42,generatedAt:new Date().toISOString(),sourceReport:path.resolve(reportFile),production:false,entries:outputs};
 fs.writeFileSync(path.join(out,'main-images.json'),JSON.stringify(result,null,2)+'\n');return result;
}
export async function run(argv){
 const arg=name=>{const i=argv.indexOf('--'+name);return i<0?null:argv[i+1];};
 const reportFile=arg('report'),assetIndexFile=arg('asset-index'),devicesDir=arg('devices'),out=arg('out');
 if(!reportFile||!assetIndexFile||!devicesDir||!out)fail('Aufruf: --report <import-report.json> --asset-index <asset-index.json> --devices <catalog-stage/devices> --out <Bildordner> [--sharp-module <sharp/lib/index.js>]');
 const result=await renderDoorbellMainImages({reportFile,assetIndexFile,devicesDir,out,sharpModule:arg('sharp-module')});process.stdout.write(JSON.stringify({products:result.products,models:result.models,out:path.resolve(out)})+'\n');return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});

