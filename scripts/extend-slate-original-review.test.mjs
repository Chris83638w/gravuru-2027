import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {makeProductDocument,validateProductDocument} from '../app/workshop/product-model.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {extendSlateReview,mergeSlatePackages,readSlatePackage} from './extend-slate-original-review.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const write=(file,data)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');};
function document(id){
  const family=JSON.parse(fs.readFileSync(new URL('../app/designs/steel-door-signs/family.json',import.meta.url)));
  family.id='schiefer-tafeln-natur';family.material={kind:'slate',label:'Schiefer',thicknessMm:5,processingProfileId:'slate-engraving'};
  family.photo={includedCount:1,extraPriceCents:999};family.sizes=family.sizes.slice(0,1);
  Object.assign(family.sizes[0],{key:'TEST-300X200',widthMm:300,heightMm:200,baseCents:1999,photoDesignCents:2999});
  const config=familyProductConfig(family,family.sizes[0],1);
  config.profile.designs=[{...config.profile.designs[0],id:'katalog-'+id,name:id,katalog:{designId:id,target:{familyId:family.id,explicit:true,released:false}}}];
  config.profile.defaultDesignId='katalog-'+id;
  return makeProductDocument(config,{name:'Schiefer '+id});
}
function pack(root,id){
  const d=document(id),source=structuredClone(d),fontFiles={},fontRefs=Object.keys(source.config.localResources.fonts);
  for(const name of fontRefs){fontFiles[name]='fonts/'+name+'.json';write(path.join(root,fontFiles[name]),source.config.localResources.fonts[name]);}
  source.config.localResources.fonts={};
  const product={key:'slate:'+id,productId:'cfg_package-'+id,revision:1,reviewOnly:true,designIds:[id],file:'products/'+id+'.json',documentHash:sha(JSON.stringify(source))};
  write(path.join(root,product.file),{document:source,fontRefs});
  write(path.join(root,'originals',id,'design.json'),{id});
  write(path.join(root,'audit.json'),{original:id});
  const manifest={schema:'gravuru-slate-original-review/v1',catalogueCommit:'synthetic-test-only',reviewOnly:true,released:false,counts:{originals:1,engraving:1,reviewProducts:1,preparedDesigns:id==='OLD'?0:1},products:[product],assets:[],fontFiles,originals:[{id,targets:id==='OLD'?[{status:'prepared'},{status:'open'}]:[{status:'prepared'}]}]};
  write(path.join(root,'manifest.json'),manifest);checksum(root);
  return {document:d,manifest,product};
}
function checksum(root){
  const files=fs.readdirSync(root,{withFileTypes:true,recursive:true}).filter(entry=>entry.isFile()&&entry.name!=='files-sha256.json').map(entry=>{
    const file=path.join(entry.parentPath,entry.name),bytes=fs.readFileSync(file);return {file:path.relative(root,file).split(path.sep).join('/'),bytes:bytes.length,sha256:sha(bytes)};
  });write(path.join(root,'files-sha256.json'),files);
}
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'slate-extension-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const baseRoot=path.join(root,'base'),addonRoot=path.join(root,'addon'),data=path.join(root,'data'),galleryOut=path.join(root,'combined');
  const base=pack(baseRoot,'OLD'),addon=pack(addonRoot,'NEW');fs.mkdirSync(data);
  const assets=createDesignAssetStore({filename:path.join(data,'design-assets.sqlite')});assets.close();
  for(const name of ['profiles.sqlite','review-comments.sqlite']){const db=new DatabaseSync(path.join(data,name));db.exec('CREATE TABLE preserved(text TEXT); INSERT INTO preserved VALUES(\'user comment\')');db.close();}
  const repo=createProductRepository({filename:path.join(data,'workshop.sqlite'),validateDocument:validateProductDocument});
  const saved=repo.create(base.document),edited=repo.save(saved.id,{...base.document,name:'My edited existing design'},saved.revision);repo.close();
  const mapping={localOnly:true,published:false,shopifyWrites:0,products:[{...base.product,productId:saved.id,revision:1}]};
  write(path.join(data,'local-review-import.json'),mapping);
  return {root,baseRoot,addonRoot,data,galleryOut,base,addon,mapping,edited};
}

test('extension preserves existing edits, mapping revisions and comments, while adding native products',async t=>{
  const f=fixture(t),beforeComments=fs.readFileSync(path.join(f.data,'review-comments.sqlite'));
  const result=await extendSlateReview(f);assert.equal(result.oldProducts,1);assert.equal(result.newProducts,1);
  const repo=createProductRepository({filename:path.join(f.data,'workshop.sqlite'),validateDocument:validateProductDocument});
  try{assert.deepEqual(repo.get(f.edited.id),f.edited);assert.equal(repo.list().length,2);}finally{repo.close();}
  const mapping=JSON.parse(fs.readFileSync(path.join(f.data,'local-review-import.json')));
  assert.deepEqual(mapping.products[0],f.mapping.products[0]);assert.equal(mapping.products[1].designIds[0],'NEW');
  assert.deepEqual(fs.readFileSync(path.join(f.data,'review-comments.sqlite')),beforeComments);
  const combined=readSlatePackage(f.galleryOut);assert.equal(combined.pack.originals.length,2);
  assert.equal(combined.pack.counts.editableOriginals,2);assert.equal(combined.pack.counts.fullyPreparedOriginals,1);assert.equal(combined.pack.counts.partiallyPreparedOriginals,1);
  assert.equal(combined.pack.counts.preparedTargets,2);assert.equal(combined.pack.counts.preparedDesigns,undefined);
  assert.equal(combined.pack.sourcePackages[0].counts.preparedDesigns,0);
  const audits=combined.checksums.filter(row=>row.file.startsWith('source-packages/')&&row.file.endsWith('/audit.json'));
  assert.equal(audits.length,2);
  await assert.rejects(extendSlateReview({...f,galleryOut:path.join(f.root,'duplicate')}),/Zuordnung/);
});

test('disjoint IDs and differing colliding files fail before touching data',async t=>{
  const f=fixture(t),before=fs.readFileSync(path.join(f.data,'local-review-import.json'));
  const manifest=JSON.parse(fs.readFileSync(path.join(f.addonRoot,'manifest.json')));manifest.originals[0].id='OLD';manifest.products[0].designIds=['OLD'];
  write(path.join(f.addonRoot,'manifest.json'),manifest);checksum(f.addonRoot);
  await assert.rejects(extendSlateReview(f),/overlaps original IDs/);
  assert.deepEqual(fs.readFileSync(path.join(f.data,'local-review-import.json')),before);
  assert.equal(fs.existsSync(f.galleryOut),false);
});

test('source checksum and resource collisions cannot be silently replaced',t=>{
  const f=fixture(t);
  write(path.join(f.addonRoot,'fonts','conflict.json'),{version:2});write(path.join(f.baseRoot,'fonts','conflict.json'),{version:1});
  checksum(f.addonRoot);checksum(f.baseRoot);
  assert.throws(()=>mergeSlatePackages({baseRoot:f.baseRoot,addonRoot:f.addonRoot,out:f.galleryOut}),/Different bytes collide/);
  fs.writeFileSync(path.join(f.addonRoot,'audit.json'),'changed without new checksum');
  assert.throws(()=>readSlatePackage(f.addonRoot),/checksum mismatch/);
  assert.equal(fs.existsSync(f.galleryOut),false);
});

test('merged process counts keep unspecified procedures separate from engraving and UV',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'review-process-counts-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const baseRoot=path.join(root,'base'),addonRoot=path.join(root,'addon');
  const make=(dir,rows)=>{
    write(path.join(dir,'manifest.json'),{schema:'gravuru-slate-original-review/v1',catalogueCommit:'synthetic-test-only',reviewOnly:true,released:false,
      counts:{originals:rows.length},products:[],assets:[],fontFiles:{},originals:rows.map(([id,process])=>({id,...(process===undefined?{}:{process}),targets:[]}))});
    checksum(dir);
  };
  make(baseRoot,[['engraved','Gravur'],['engraved-lower','gravur'],['uv','UV'],['uv-lower','uv']]);
  make(addonRoot,[['uv-print','UV-Druck'],['blank',''],['absent'],['null',null],['unspecified','offen']]);
  const before=[baseRoot,addonRoot].map(dir=>fs.readFileSync(path.join(dir,'manifest.json')));
  const result=mergeSlatePackages({baseRoot,addonRoot,out:path.join(root,'combined')});
  assert.equal(result.counts.originals,9);assert.equal(result.counts.engraving,2);assert.equal(result.counts.uv,3);assert.equal(result.counts.unknownProcess,4);
  assert.equal(result.counts.engraving+result.counts.uv+result.counts.unknownProcess,result.counts.originals);
  [baseRoot,addonRoot].forEach((dir,i)=>assert.deepEqual(fs.readFileSync(path.join(dir,'manifest.json')),before[i]));
});
