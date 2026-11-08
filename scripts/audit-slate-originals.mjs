import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';
const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1];
for(const k of ['--data','--katalog'])if(!args.includes(k))throw Error(k+' required');
const root=path.resolve(arg('--data')),catalogue=path.resolve(arg('--katalog')),read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const r=read(path.join(root,'preparation-report.json'));assert(r.counts);
const repo=createProductRepository({filename:path.join(root,'workshop.sqlite'),validateDocument:validateProductDocument});
let sourceFiles=0,pairs=0,objects=0;
try{
 assert.equal(new Set(r.originals.map(d=>d.id)).size,r.originals.length);
 for(const row of r.originals){
  for(const f of row.files){assert.equal(sha(path.join(root,'originals',row.id,f.name)),f.sha256);assert.equal(sha(path.join(catalogue,path.dirname(row.source),f.name)),f.sha256);sourceFiles++;}
  if(row.targets.length!==2||row.targets.some(t=>t.status!=='prepared'))continue;
  const a=read(path.join(root,row.targets.find(t=>t.mm[0]===300).file)).template,b=read(path.join(root,row.targets.find(t=>t.mm[0]===220).file)).template;
  assert.equal(a.katalog.originalId,b.katalog.originalId);assert.equal(a.katalog.sourceSvgSha256,b.katalog.sourceSvgSha256);assert.equal(a.objects.length,b.objects.length);
  for(let i=0;i<a.objects.length;i++){
   const x=a.objects[i],y=b.objects[i];objects++;assert.equal(x.id,y.id);assert.equal(x.type,y.type);assert.equal(x.text,y.text);assert.equal(x.font,y.font);
   assert(Math.abs(y.x-(x.x*.7+5))<.002);assert(Math.abs(y.y-x.y*.7)<.002);assert.equal(y.rotation,x.rotation);
   if(x.type==='text')assert(Math.abs(y.size-x.size*.7)<.001);else{assert(Math.abs(y.w-x.w*.7)<.002);assert(Math.abs(y.h-x.h*.7)<.002);}
  }pairs++;
 }
 for(const p of r.products){const stored=repo.get(p.productId),document=read(path.join(root,p.file));assert.deepEqual(stored.document.config,document.config);assert.equal(stored.status,'draft');p.revision=stored.revision;}
 const audit={sourceFiles,originals:r.originals.length,sourceFilesByteIdentical:true,pairedDesigns:pairs,pairedObjects:objects,scale:.7,offsetMm:[5,0],maximumPositionToleranceMm:.002,productsReadBack:r.products.length,allLocalDrafts:true,shopifyWrites:0};
 fs.writeFileSync(path.join(root,'preparation-report.json'),JSON.stringify(r,null,2)+'\n');fs.writeFileSync(path.join(root,'audit.json'),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit));
}finally{repo.close();}
