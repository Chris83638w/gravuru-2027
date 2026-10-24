import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const here=path.dirname(new URL(import.meta.url).pathname);
const code=path.resolve(process.argv[2]),catalog=path.resolve(process.argv[3]),output=process.argv[4];
const current=await import(pathToFileURL(path.join(code,'app/workshop/katalog-convert.mjs')));
const {openKatalog}=await import(pathToFileURL(path.join(code,'app/workshop/katalog-source.mjs')));
let original=fs.readFileSync(new URL('./paket-c-base/app/workshop/katalog-convert.mjs',import.meta.url),'utf8');
original=original.replace(/from '(\.[^']+)'/g,(_,spec)=>"from '"+pathToFileURL(path.resolve(code,'app/workshop',spec)).href+"'");
const before=await import('data:text/javascript;base64,'+Buffer.from(original).toString('base64'));
const k=openKatalog(catalog),family=k.families.get('steel-door-signs');
let designs=0,motifs=0,comparisons=0;
for(const assigned of current.assignSeries(family,k.designs.masters)){
 if(assigned.oldSize||!assigned.sizes.length)continue;
 const parsed=current.parseDesignSvg(assigned.design.svg());
 const layers=parsed.layers.filter(l=>l.paths?.length);
 if(!layers.length)continue;designs++;
 const input=layers.map((l,i)=>({key:'layer-'+i,bounds:l.bounds,svgFragment:l.paths.map(p=>'<path d="'+p+'" fill="currentColor"/>').join(''),embeddedOnly:true}));
 motifs+=input.length;
 const scales=new Set(assigned.sizes.map(key=>family.sizes.find(s=>s.key===key).widthMm/assigned.design.plateMm[0]));
 for(const scale of scales){
  assert.deepEqual(current.scaleEmbeddedMotifs(input,scale),before.scaleEmbeddedMotifs(input,scale),assigned.design.id+' scale='+scale);comparisons++;
 }
}
const result={equal:true,designs,motifs,designScaleComparisons:comparisons,reference:'603fa4415121d305cff31755ffab2c6af653919a',method:'Every assigned catalog master with path layers, every distinct assigned width scale, full motif object including exact SVG string.'};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
