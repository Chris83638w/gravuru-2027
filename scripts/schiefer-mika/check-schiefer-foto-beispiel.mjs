import fs from 'node:fs';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'outputs/schiefer-foto-beispiel-molly');
const src=path.join(root,'Produkte-Design/gravuru-katalog-neu'),cat=path.join(out,'katalog-pruefkopie');
fs.mkdirSync(cat,{recursive:true});
for(const name of ['schriften','motive','materialien'])if(!fs.existsSync(path.join(cat,name)))fs.symlinkSync(path.join(src,name),path.join(cat,name),'junction');
for(const name of ['themen.json','struktur.json'])fs.copyFileSync(path.join(src,name),path.join(cat,name));
const family=JSON.parse(fs.readFileSync(path.join(root,'outputs/schiefer-30-hunde-30-katzen/katalog/familien/schiefer/gedenktafel-22x14-schiefer-natur.json')));
fs.mkdirSync(path.join(cat,'familien/schiefer'),{recursive:true});fs.writeFileSync(path.join(cat,'familien/schiefer/gedenktafel-22x14-schiefer-natur.json'),JSON.stringify(family));
const series='schiefer-foto-mika-beispiel',id='GT-S-22x14-D236',dest=path.join(cat,'designs',series,id);fs.mkdirSync(dest,{recursive:true});
for(const name of ['design.svg','design.json','originalfoto.jpg'])fs.copyFileSync(path.join(out,name),path.join(dest,name));
fs.writeFileSync(path.join(cat,'designs',series,'index.json'),JSON.stringify([{id,name:'Molly · Foto in Herzmaske',pfad:id}]));
const {targetDesignPreview}=await import(pathToFileURL(path.join(root,'Produkte-Design/gravuru-2027-neu/app/workshop/design-target-preview.mjs')));
let result;try{const p=await targetDesignPreview(cat,{reihe:series,id,familie:family.id});if(p.svg)fs.writeFileSync(path.join(out,'konfi-unveraendert.svg'),p.svg);result={...p,svg:undefined,hasSvg:!!p.svg,deliveryReadySvg:true,nativeMaskReady:false,nativeInlinePhotoReady:false};}catch(e){result={error:e.message,deliveryReadySvg:true,nativeMaskReady:false,nativeInlinePhotoReady:false};}
fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
