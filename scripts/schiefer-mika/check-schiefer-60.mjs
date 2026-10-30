import fs from 'node:fs';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';
const workspace=process.env.GRAVURU_PROJECT_ROOT||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(workspace,'outputs/schiefer-30-hunde-30-katzen');
const {targetDesignPreview}=await import(pathToFileURL(path.join(workspace,'Produkte-Design/gravuru-2027-neu/app/workshop/design-target-preview.mjs')));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
let results=[];
for(const item of manifest){
 try{
  const r=await targetDesignPreview(path.join(root,'katalog'),{reihe:item.series,id:item.id,familie:'gedenktafel-22x14-schiefer-natur'});
  if(r.svg)fs.writeFileSync(path.join(item.folder,'konfi.svg'),r.svg);
  const result={id:item.id,theme:item.theme,name:item.name,status:r.reviewFit.status,issues:r.reviewFit.issues,hasSvg:!!r.svg};
  fs.writeFileSync(path.join(item.folder,'ergebnis.json'),JSON.stringify(result,null,2));results.push(result);
 }catch(e){results.push({id:item.id,theme:item.theme,status:'FEHLER',issues:[e.message]});}
}
fs.writeFileSync(path.join(root,'ergebnis.json'),JSON.stringify({created:new Date().toISOString(),results},null,2));
const counts=results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});console.log(counts);
for(const r of results)if(r.status!=='passt')console.log(r.theme,r.id,r.status,r.issues.join(' | '));
