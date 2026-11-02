// Read-only integration check: every delivered SVG/JSON opens as native objects.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createDesignEditor} from '../../app/workshop/design-editor.mjs';
import {selectedProfile} from '../../app/configurator/variant-m/contract.mjs';
const root=path.resolve(process.argv[2]),out=process.argv[3],read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const service=createDesignEditor(),results=[];
for(const reihe of read(path.join(root,'auftraege/2026-11-02-issue85-firmen/reihen.json'))){
 for(const entry of read(path.join(root,'designs',reihe,'index.json'))){
  const source=read(path.join(root,'designs',reihe,entry.pfad,'design.json'));
  const opened=await service.open(root,{reihe,id:source.id}),config=opened.document.config,design=config.profile.designs[0],objects=design.objects;
  assert.equal(objects.filter(o=>o.type==='text').length,source.texts.length);
  assert.equal(objects.filter(o=>o.type==='motif').length,source.motifs.length);
  assert.equal(selectedProfile(config,{}).geometry.holes.length,0);
  for(const o of objects){const rights=opened.document.elementRights[design.id][o.id];assert.equal(rights.move,true);assert.equal(rights.scale,true);assert.equal(rights.delete,true);if(o.type==='text')assert.equal(rights.content,true);}
  results.push({id:source.id,texts:source.texts.length,motifs:source.motifs.length,editable:true});
 }
}
if(out)fs.writeFileSync(out,JSON.stringify({opened:results.length,results},null,1)+'\n');
console.log(JSON.stringify({opened:results.length,texts:results.reduce((n,r)=>n+r.texts,0),motifs:results.reduce((n,r)=>n+r.motifs,0),editable:true}));
