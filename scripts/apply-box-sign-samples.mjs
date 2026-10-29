// Apply explicit fictional presentation data; never publish or set approvals.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parseDesignSvg} from '../app/workshop/katalog-convert.mjs';
const arg=process.argv.find(a=>a.startsWith('--katalog='));assert(arg,'--katalog=<path> required');
const root=path.resolve(arg.slice('--katalog='.length)),order='auftraege/2026-10-29-pferdeschilder-astra';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=read(order+'/katalog-zuordnung.json'),samples=read(order+'/technik/beispieldaten.json');
const escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const changed=[];
for(const entry of manifest.designs){
 const group=entry.form!=='OV'?entry.form:['15x8','22.5x12','30x16'].includes(entry.size)?'OV15:8':'OV3:2';
 const sample=samples.sets.find(s=>s.muster===entry.muster&&s.shapeGroup===group);assert(sample&&sample.fictional);
 const dir=path.resolve(root,entry.path);assert(dir.startsWith(root+path.sep));
 const jsonFile=path.join(dir,'design.json'),svgFile=path.join(dir,'design.svg');
 const json=JSON.parse(fs.readFileSync(jsonFile,'utf8'));assert.equal(json.freigabe,null);
 let svg=fs.readFileSync(svgFile,'utf8');const before=parseDesignSvg(svg);
 for(const [id,value] of Object.entries(sample.values)){
  const pattern=new RegExp('(<g id="'+id+'">)([\\s\\S]*?)(</g>)');assert(pattern.test(svg),id);
  svg=svg.replace(pattern,(_,start,body,end)=>{
   const lines=value.split('\n');let i=0;
   if(!body.includes('<tspan')){
    assert.equal(lines.length,1,'Single-line text required');
    body=body.replace(/(<text[^>]*>)[^<>]*(<\/text>)/,(_,a,b)=>{i++;return a+escape(lines[0])+b;});
   }
   body=body.replace(/(<tspan\b[^>]*>)[\s\S]*?(<\/tspan>)/g,(_,a,b)=>{assert(i<lines.length,'Line count');return a+escape(lines[i++])+b;});
   assert.equal(i,lines.length,'Line count');return start+body+end;
  });
  json.fields[id]={...json.fields[id],label:{horse:'Pferdename',birthDate:'Geburtsdatum',sire:'Vater',dam:'Mutter',owner:'Besitzer',ownerContact:'Besitzer und Kontakt',vetContact:'Tierarzt und Kontakt'}[sample.roles[id]]};
 }
 const after=parseDesignSvg(svg);assert.equal(after.layers.length,before.layers.length);
 assert.deepEqual(after.layers.filter(l=>l.kind!=='text'),before.layers.filter(l=>l.kind!=='text'),'Motifs changed');
 json.sampleData={setId:sample.id,fictional:true,data:sample.data,roles:sample.roles,values:sample.values};
 fs.writeFileSync(svgFile,svg);fs.writeFileSync(jsonFile,JSON.stringify(json,null,2)+'\n');
 changed.push(entry.id);
}
console.log(JSON.stringify({variants:changed.length,sampleSets:samples.sets.length,liveWrites:0}));
