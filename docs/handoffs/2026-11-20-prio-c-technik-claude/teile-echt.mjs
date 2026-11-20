// Claude · 20.11.2026 · Stufe 2: Gegenprobe an den zwei am 20.11. im Shop gelesenen Modellen (Edelstahl-Türschild 12 × 8 cm).
// Design-Teile des einen Modells in das andere eingesetzt muss genau das andere Modell ergeben. Aufruf: node teile-echt.mjs <Arbeitskopie> <Ordner mit den zwei Modellen>
import fs from 'node:fs';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {pathToFileURL} from 'node:url';
const [,,root,dir]=process.argv;
const {shopDesignParts,shopDesignBase}=await import(pathToFileURL(root+'/app/workshop/shop-start-model.mjs'));
const {universalWithDesignParts}=await import(pathToFileURL(root+'/app/workshop/ui/shop-design-switch.mjs'));
const A=JSON.parse(fs.readFileSync(dir+'/modell-erstes-design.json')).universal,B=JSON.parse(fs.readFileSync(dir+'/modell-zweites-design.json')).universal;
const out={};
for(const [name,from,to] of [['erstes→zweites',A,B],['zweites→erstes',B,A]]){
 const parts=JSON.parse(JSON.stringify(shopDesignParts(to))),id=to.profile.defaultDesignId;
 const built=universalWithDesignParts(structuredClone(from),parts,id);
 assert.deepEqual(built,to);assert.equal(JSON.stringify(built).length,JSON.stringify(to).length);
 const text=JSON.stringify({id,base:shopDesignBase(to),parts});
 out[name]={design:id,gleich:true,teileZeichen:text.length,teileBrotli:zlib.brotliCompressSync(text).length,modellZeichen:JSON.stringify(to).length};
}
out.fingerabdruckGleich=shopDesignBase(A)===shopDesignBase(B);out.fingerabdruck=shopDesignBase(A).slice(0,16);
const C=structuredClone(B);C.quantityTiers=[...(C.quantityTiers||[]),{min:99,percent:1}];out.fingerabdruckBeiAnderemPreis=shopDesignBase(C)!==shopDesignBase(A);
console.log(JSON.stringify(out,null,1));
