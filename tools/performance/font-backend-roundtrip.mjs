// Same synthetic profile before/after: edit then regular importer round-trip.
// Includes the new preview+audit work; not a customer/browser speed benchmark.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
const [beforeRoot,afterRoot,output]=process.argv.slice(2);
if(!beforeRoot||!afterRoot||!output)throw Error('Usage: node tools/performance/font-backend-roundtrip.mjs <before checkout> <after checkout> <report.json>');
const initial=['Michroma','Lato','Cinzel','Montserrat'],selected=['Michroma','Lato','Montserrat'],runs=[];
for(const [variant,root] of [['before',beforeRoot],['after',afterRoot]]){
 const load=f=>import(pathToFileURL(path.resolve(root,f)).href);
 const {createProfileLibrary}=await load('app/workshop/profile-library.mjs'),{openKatalog}=await load('app/workshop/katalog-source.mjs'),{ensureFontSet}=await load('app/workshop/katalog-import.mjs');
 const factory=variant==='after'?(await load('app/workshop/catalog-fontsets.mjs')).createCatalogFontSets:null;
 for(let run=0;run<5;run++){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-font-measure-'));fs.cpSync(path.resolve(afterRoot,'app/workshop/fixtures/katalog'),dir,{recursive:true});
  const profiles=createProfileLibrary({filename:':memory:',catalog:{fonts:initial,motifs:[]}}),fontLibrary={list:()=>[]},runtimeFonts=Object.fromEntries(initial.map(n=>[n,{regular:{units:1000,glyphs:{A:{a:500,d:'M0 0'}}}}])),options={profiles,fontLibrary,runtimeFonts};
  try{
   const group={id:'tuerschilder',fonts:initial},p=await ensureFontSet(openKatalog(dir),group,options),record=profiles.get(p.profileId),start=performance.now();
   if(factory){
    const service=factory({root:dir,...options,repository:{list:()=>[]}}),input={setId:'tuerschilder',fonts:selected,sourceSha256:service.list().sourceSha256};
    await service.save({...input,impactToken:service.impact(input).token});
   }else profiles.save(record.id,{name:record.name,type:'fonts',items:selected},record.revision);
   const editMs=performance.now()-start,importStart=performance.now(),catalog=openKatalog(dir);
   const result=await ensureFontSet(catalog,catalog.fontSet({fontSet:'tuerschilder'}),options),importMs=performance.now()-importStart,final=profiles.get(result.profileId);
   runs.push({variant,run:run+1,editMs:+editMs.toFixed(3),importMs:+importMs.toFixed(3),finalFonts:final.items,selectionRetained:JSON.stringify(final.items)===JSON.stringify(selected),profileCount:profiles.list().length,revision:final.revision});
  }finally{profiles.close();if(path.dirname(dir)!==path.resolve(os.tmpdir()))throw Error('Unexpected temporary directory');fs.rmSync(dir,{recursive:true,force:true});}
 }
}
const report={profile:'synthetic four-font list, remove Cinzel; in-memory SQLite; warm synthetic glyphs; Windows/Node '+process.version,initial,selected,runs};
fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
