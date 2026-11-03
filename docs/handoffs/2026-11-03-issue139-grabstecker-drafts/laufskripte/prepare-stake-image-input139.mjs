import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {textPaths} from './issue139-latency/app/platform/sources/app/shared/models/text-paths.mjs';
const base='work/grabstecker-alle-20261103',r=JSON.parse(fs.readFileSync(base+'/complete.json')),out=base+'/image-input';fs.mkdirSync(out,{recursive:true});
for(const e of r.entries){
 const c=JSON.parse(fs.readFileSync(e.directory+'/review-config.json')),design=c.profile.designs.find(d=>d.id===c.profile.defaultDesignId);assert.ok(design);const source=r.counts.find(x=>x.handle===e.handle).source;
 let svg=fs.readFileSync(source,'utf8'),replaced=0;
 svg=svg.replace(/<text\b[\s\S]*?<\/text>/g,old=>{const id=/\bid="([^"]+)"/.exec(old)?.[1],o=design.objects.find(o=>o.id===id&&o.type==='text');assert.ok(o,e.handle+' '+id);assert.ok(c.localResources.fonts[o.font]);const ink=textPaths(o,c.localResources.fonts);assert.ok(ink);replaced++;return '<g id="'+id+'" transform="translate('+o.x+' '+o.y+') rotate('+(o.rotation||0)+')" fill="#000000">'+ink+'</g>';});
 assert.equal(replaced,design.objects.filter(o=>o.type==='text').length);assert.ok(!/<text\b/.test(svg));fs.writeFileSync(out+'/'+e.handle+'.svg',svg);
}
fs.copyFileSync('work/issue139-katalog-modules/schneidvorlagen/grabstecker/grabstecker.json',out+'/schnitt.json');const material=JSON.parse(fs.readFileSync(r.entries[0].directory+'/review-config.json')).materialSurface;assert.match(material,/^data:image\/png;base64,/);fs.writeFileSync(out+'/material.png',Buffer.from(material.split(',')[1],'base64'));
fs.writeFileSync(out+'/entries.json',JSON.stringify(r.entries.map(e=>({handle:e.handle,sizeKey:e.sizeKey,image:JSON.parse(fs.readFileSync(e.directory+'/product-set.json')).image})),null,2));
console.log(JSON.stringify({images:r.entries.length,source:'catalogue SVG, native font outlines, unchanged motifs and contours'}));
