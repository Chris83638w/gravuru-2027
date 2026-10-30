import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const katalogArg=process.argv.find(v=>v.startsWith('--katalog=')),baseArg=process.argv.find(v=>v.startsWith('--base-url='));
if(!katalogArg||!baseArg)throw Error('Historischer Editorcheck benötigt --katalog=<Arbeitskopie> und --base-url=<lokaler Editor>. Für die aktuelle Abnahme audit-family-designs.mjs und konfi-vorschau.mjs verwenden.');
const root=path.resolve(katalogArg.slice(10),'designs/familie-mika-120x80'),base=baseArg.slice(11).replace(/\/$/,'');
const results=[];
for(const entry of JSON.parse(fs.readFileSync(path.join(root,'index.json'))).designs){
 const source=JSON.parse(fs.readFileSync(path.join(root,entry.id,'design.json')));
 const response=await fetch(base+'/api/workshop/designs/editor?reihe=familie-mika-120x80&id='+entry.id);
 assert.equal(response.status,200);const api=await response.json();
 const design=api.document.config.profile.designs[0],rights=api.document.elementRights[design.id];
 assert.equal(source.familyMembers.persons,entry.persons);assert.equal(source.familyMembers.maximumPersons,6);assert.equal(source.familyMembers.petsAdditionalOptional,true);
 assert.ok(source.fonts.length<=3);assert.equal(new Set(design.objects.map(o=>o.id)).size,design.objects.length);
 for(const member of source.familyMembers.members){
  const motif=design.objects.find(o=>o.id===member.motifElementId),name=design.objects.find(o=>o.id===member.nameElementId);
  assert.equal(motif.type,'motif');assert.equal(name.type,'text');assert.equal(rights[motif.id].move,true);assert.equal(rights[motif.id].scale,true);assert.equal(rights[name.id].content,true);assert.equal(name.required,false);
 }
 assert.ok(api.fit.sizes.every(s=>s.status==='passt'),entry.id+JSON.stringify(api.fit));
 results.push({id:entry.id,persons:entry.persons,pets:entry.pets,objects:design.objects.length,fonts:source.fonts,fit:api.fit.sizes,independentMotifsAndNames:true});
}
const report={checkedAt:new Date().toISOString(),scope:'Native local catalogue editor, not production/customer approval',designCount:results.length,checks:results};
fs.writeFileSync(path.join(root,'pruefung','validierung.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({designsPassed:results.length,fit:'10/10 passt',independentElements:true}));
