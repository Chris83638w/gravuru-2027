import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {bestsellerChoices} from '../../../app/configurator/variant-m/profile-selection.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(root,'../..'), workspace=path.resolve(repo,'../..');
const catalog=path.resolve(repo,'../gravuru-katalog');
const assets=path.join(root,'public/assets');fs.mkdirSync(assets,{recursive:true});
// Same source library, German labels and uncurated starter selection as the Master.
// Only the compact index loads on opening Motive; SVG files load as needed.
const runtime=path.join(repo,'app/designs/aosu-labrador/runtime');
const editor=fs.readFileSync(path.join(repo,'app/references/aosu-upgrade-2026-09-21/verification/editor-source.html'),'utf8');
const urls=JSON.parse(editor.match(/<script[^>]*id="preview-urls"[^>]*>([\s\S]*?)<\/script>/)[1]);
const readRuntime=file=>fs.readFileSync(path.join(runtime,path.basename(file)),'utf8');
const manifest=JSON.parse(readRuntime(urls.catalog));
const catalogData=manifest.format==='gravuru-catalog-parts-v1'?JSON.parse(manifest.parts.map(readRuntime).join('')):manifest;
const imported=JSON.parse(gunzipSync(Buffer.from(urls.parts.map(readRuntime).join(''),'base64')).toString('utf8'));
const originals=Object.entries(catalogData.motifs).map(([key,svgFragment])=>{
 const match=editor.match(new RegExp('(?:^|[,\\{])'+key+':"([^"\\n]+)"'));
 if(!match)throw Error('German motif name missing: '+key);
 const name=match[1].replace(/\\x([0-9a-f]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
 return {key,name,category:'Grundmotive',bounds:[0,0,100,100],svgFragment};
});
const all=[...imported,...originals];
const starterKeys=[...editor.match(/const doorSignStarterKeys=\[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
const bestsellers=new Set(bestsellerChoices(all,starterKeys.map(key=>({key})),null,{fillTo:18}).map(m=>m.key));
const motifExamples=all.map(m=>{
 const [x,y,w,h]=m.bounds, file=`motif-${m.key}.svg`;
 if(!/^[a-zA-Z0-9_-]+$/.test(m.key))throw Error('Invalid motif filename');
 fs.writeFileSync(path.join(assets,file),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" fill="#000">${m.svgFragment}</svg>`);
 return {id:m.key,key:m.key,name:m.name,category:m.category,file,bestseller:bestsellers.has(m.key),bestsellerRank:[...bestsellers].indexOf(m.key)};
});
fs.writeFileSync(path.join(assets,'motifs.json'),JSON.stringify(motifExamples)+'\n');
console.log('Master motifs:',motifExamples.length,'categories:',new Set(motifExamples.map(m=>m.category)).size,'starter selection:',bestsellers.size);
const provenance=[];
function copy(source,name){const dest=path.join(assets,name);fs.copyFileSync(source,dest);provenance.push({file:name,source:path.relative(workspace,source).replaceAll('\\','/'),bytes:fs.statSync(dest).size});}
copy(path.join(repo,'app/designs/aosu-labrador/runtime/images/gravuru-edelstahl-feine-maserung-vorschau.webp'),'steel.webp');
copy(path.join(repo,'app/designs/aosu-labrador/runtime/images/aosu-pro-v8p1ax11.png'),'aosu.png');
copy(path.join(repo,'app/designs/aosu-labrador/assets/labrador-solid.svg'),'labrador.svg');
copy(path.join(workspace,'outputs/SCHIEFER-WEBP/Schiefer-Grundplatte-kompakt.webp'),'slate.webp');
copy(path.join(workspace,'outputs/D204-WEBP/GT-S-22x14-D204-foto-verlustfrei.webp'),'d204-photo.webp');
for(const id of [1,8,12,15,18,24])copy(path.join(catalog,`designs/edelstahl-gravur-ab-80x53/TAE-V2A-8x5-D${id}/design.svg`),`design-${id}.svg`);
const fonts=path.join(root,'public/local-fonts');fs.mkdirSync(fonts,{recursive:true});
for(const [folder,name] of [['Ashley','AshleyRegular.ttf'],['Cinzel','Cinzel-Regular.ttf']])fs.copyFileSync(path.join(catalog,'schriften/dateien',folder,name),path.join(fonts,name));
fs.writeFileSync(path.join(root,'asset-sources.json'),JSON.stringify({scope:'Unveränderte lokale Originale; historische Katalogkopie ausschließlich als visuelle Muster, keine neue Produktfreigabe.',files:provenance},null,2)+'\n');
const names=new Set();for(const id of [1,8,12,15,18,24])for(const m of fs.readFileSync(path.join(assets,`design-${id}.svg`),'utf8').matchAll(/font-family="([^"]+)"/g))names.add(m[1]);
const rules=[];
for(const name of names){const dir=path.join(catalog,'schriften/dateien',name);if(!fs.existsSync(dir))continue;const candidates=fs.readdirSync(dir).filter(n=>/\.(ttf|otf|woff2?)$/i.test(n));const file=candidates.find(n=>/regular/i.test(n))||candidates[0];if(!file)continue;const target=name.replace(/[^a-z0-9]/gi,'-')+path.extname(file);fs.copyFileSync(path.join(dir,file),path.join(fonts,target));rules.push(`@font-face{font-family:"${name}";src:url("/local-fonts/${target}")}`)}
fs.writeFileSync(path.join(fonts,'fonts.css'),rules.join('\n'));
console.log('Local-only fonts:',[...names]);
console.log(provenance.map(x=>({file:x.file,bytes:x.bytes})));
