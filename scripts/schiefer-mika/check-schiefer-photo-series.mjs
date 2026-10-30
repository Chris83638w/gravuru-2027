import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'outputs/schiefer-foto-alle-groessen');
const src=path.join(root,'Produkte-Design/gravuru-katalog-neu');
const code=path.join(root,'Produkte-Design/gravuru-2027-neu');
const cat=path.join(out,'katalog-pruefkopie');
const masters=JSON.parse(fs.readFileSync(path.join(out,'master-index.json')));
const {parseDesignSvg}=await import(pathToFileURL(path.join(code,'app/workshop/katalog-convert.mjs')));
fs.mkdirSync(cat,{recursive:true});
for(const name of ['schriften','motive','materialien'])if(!fs.existsSync(path.join(cat,name)))fs.symlinkSync(path.join(src,name),path.join(cat,name),'junction');
for(const name of ['themen.json','struktur.json'])fs.copyFileSync(path.join(src,name),path.join(cat,name));
const familyFile='familien/schiefer/gedenktafel-22x14-schiefer-natur.json';
fs.mkdirSync(path.dirname(path.join(cat,familyFile)),{recursive:true});
fs.copyFileSync(path.join(root,'outputs/schiefer-30-hunde-30-katzen/katalog',familyFile),path.join(cat,familyFile));
const parser=[];const series='schiefer-foto-rechteck-3-2';const index=[];
for(const m of masters){
 const folder=path.join(out,m.path),doc=JSON.parse(fs.readFileSync(path.join(folder,'design.json')));
 try{
  const p=parseDesignSvg(fs.readFileSync(path.join(folder,'design.svg'),'utf8'));
  parser.push({id:doc.id,group:m.group,theme:m.theme,layerCount:p.layers.length,notes:p.notes||[],photos:p.layers.filter(l=>l.kind==='foto'),textCount:p.layers.filter(l=>l.kind==='text').length});
 }catch(e){parser.push({id:doc.id,error:e.message})}
 if(m.group==='rechteck-3-2'){
  const dest=path.join(cat,'designs',series,doc.id);fs.mkdirSync(dest,{recursive:true});
  for(const f of ['design.svg','design.json'])fs.copyFileSync(path.join(folder,f),path.join(dest,f));
  index.push({id:doc.id,name:m.name,pfad:doc.id});
 }
}
fs.writeFileSync(path.join(cat,'designs',series,'index.json'),JSON.stringify(index,null,2));
const nativeOut=path.join(out,'konfi-pruefung');fs.mkdirSync(nativeOut,{recursive:true});
fs.writeFileSync(path.join(nativeOut,'parser-ergebnis.json'),JSON.stringify({nativeMaskImportReady:false,nativeInlinePhotoReady:false,masters:parser},null,2));
console.log('Native SVG-Struktur:',parser.length,'Master, Fehler:',parser.filter(p=>p.error).length);
execFileSync(process.execPath,[path.join(code,'scripts/design-pruefung/konfi-vorschau.mjs'),'--katalog='+cat,'--reihe='+series,'--out='+nativeOut],{cwd:code,stdio:'inherit',windowsHide:true});
