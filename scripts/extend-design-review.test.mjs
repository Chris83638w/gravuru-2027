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
import {extendDesignReview} from './extend-design-review.mjs';
import {readSlatePackage,mergeDesignReviewOriginals,mergeSlatePackages} from './extend-slate-original-review.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const write=(file,data)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');};
const read=file=>JSON.parse(fs.readFileSync(file));
function checksum(root){
  const files=fs.readdirSync(root,{withFileTypes:true,recursive:true}).filter(e=>e.isFile()&&e.name!=='files-sha256.json').map(e=>{
    const file=path.join(e.parentPath,e.name),bytes=fs.readFileSync(file);return {file:path.relative(root,file).split(path.sep).join('/'),bytes:bytes.length,sha256:sha(bytes)};
  });write(path.join(root,'files-sha256.json'),files);
}
function pack(root,steel){
  const id=steel?'TRE-V2A-8x3,5-D1':'OLD',native=steel?'katalog-tre-v2a-8x3-5-d1':'katalog-OLD';
  const family=read(new URL('../app/designs/steel-door-signs/family.json',import.meta.url));
  if(!steel){family.material={kind:'slate',label:'Schiefer',thicknessMm:5,processingProfileId:'slate-engraving'};family.id='schiefer-tafeln-natur';family.photo={includedCount:1,extraPriceCents:999};}
  const size=family.sizes[0],config=familyProductConfig(family,size,1),key=(steel?'steel':'slate')+':'+size.key;
  config.profile.designs=[{...config.profile.designs[0],id:native,name:id,katalog:{designId:id,target:{familyId:family.id,released:false,explicit:true}}}];
  config.profile.defaultDesignId=native;
  const document=makeProductDocument(config),copy=structuredClone(document),fontRefs=Object.keys(copy.config.localResources.fonts),fontFiles={};
  for(const name of fontRefs){fontFiles[name]='fonts/'+name+'.json';write(path.join(root,fontFiles[name]),copy.config.localResources.fonts[name]);}
  copy.config.localResources.fonts={};
  const product={key,productId:'cfg_package-'+(steel?'steel':'slate'),reviewOnly:true,designIds:[id],file:'products/'+(steel?'steel':'slate')+'.json',documentHash:sha(JSON.stringify(copy))};
  write(path.join(root,product.file),{document:copy,fontRefs});write(path.join(root,'originals',id,'design.json'),{id});
  const original={id,targets:[{status:'prepared',sizeKey:size.key,mm:[size.widthMm,size.heightMm],productKey:key,nativeDesignId:native}],...(steel?{reviewMaterial:{key:'steel',label:'Edelstahl',kind:'steel'}}:{})};
  const manifest={schema:steel?'gravuru-design-original-review/v1':'gravuru-slate-original-review/v1',catalogueCommit:steel?'new-source':'old-source',reviewOnly:true,released:false,counts:{originals:1},originals:[original],products:[product],fontFiles,assets:[]};
  write(path.join(root,'manifest.json'),manifest);checksum(root);return {document,product,manifest};
}
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'material-extension-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const baseRoot=path.join(root,'base'),addonRoot=path.join(root,'addon'),data=path.join(root,'data'),galleryOut=path.join(root,'combined');
  const base=pack(baseRoot,false),addon=pack(addonRoot,true);fs.mkdirSync(data);
  const assets=createDesignAssetStore({filename:path.join(data,'design-assets.sqlite')});assets.close();
  for(const name of ['profiles.sqlite','review-comments.sqlite','review-approvals.sqlite']){const db=new DatabaseSync(path.join(data,name));db.exec("CREATE TABLE preserved(value TEXT); INSERT INTO preserved VALUES('user data')");db.close();}
  const repo=createProductRepository({filename:path.join(data,'workshop.sqlite'),validateDocument:validateProductDocument});
  const saved=repo.create(base.document),edited=repo.save(saved.id,{...base.document,name:'User slate edit'},saved.revision);repo.close();
  write(path.join(data,'local-review-import.json'),{localOnly:true,published:false,shopifyWrites:0,products:[{...base.product,productId:saved.id,revision:1}]});
  return {root,baseRoot,addonRoot,data,galleryOut,base,addon,edited};
}

test('new material import preserves slate edits, comments and approvals; repeated delivery preserves steel edits too',async t=>{
  const f=fixture(t),protectedNames=['profiles.sqlite','review-comments.sqlite','review-approvals.sqlite'];
  const before=protectedNames.map(name=>fs.readFileSync(path.join(f.data,name)));
  const result=await extendDesignReview(f);assert.equal(result.newProducts,1);
  const mapping=read(path.join(f.data,'local-review-import.json')),steel=mapping.products.find(row=>row.key.startsWith('steel:'));
  const repo=createProductRepository({filename:path.join(f.data,'workshop.sqlite'),validateDocument:validateProductDocument});
  let steelEdited;try{
    assert.deepEqual(repo.get(f.edited.id),f.edited);
    const current=repo.get(steel.productId);steelEdited=repo.save(current.id,{...current.document,name:'User steel edit'},current.revision);
  }finally{repo.close();}
  const mappingBytes=fs.readFileSync(path.join(f.data,'local-review-import.json'));
  const repeated=await extendDesignReview({...f,baseRoot:f.galleryOut,galleryOut:path.join(f.root,'unused')});
  assert.equal(repeated.alreadyPresent,true);assert.equal(repeated.newProducts,0);assert.equal(fs.existsSync(path.join(f.root,'unused')),false);
  assert.deepEqual(fs.readFileSync(path.join(f.data,'local-review-import.json')),mappingBytes);
  const after=createProductRepository({filename:path.join(f.data,'workshop.sqlite'),validateDocument:validateProductDocument});
  try{assert.equal(after.list().length,2);assert.deepEqual(after.get(steel.productId),steelEdited);}finally{after.close();}
  protectedNames.forEach((name,index)=>assert.deepEqual(fs.readFileSync(path.join(f.data,name)),before[index]));
  assert.equal(readSlatePackage(f.galleryOut).pack.schema,'gravuru-design-original-review/v1');
});

test('changed package with overlapping IDs is a conflict, never a replacement of existing user data',async t=>{
  const f=fixture(t);await extendDesignReview(f);
  const mapping=fs.readFileSync(path.join(f.data,'local-review-import.json'));
  const manifest=read(path.join(f.addonRoot,'manifest.json'));manifest.deliveryCommit='another-delivery';write(path.join(f.addonRoot,'manifest.json'),manifest);checksum(f.addonRoot);
  await assert.rejects(extendDesignReview({...f,baseRoot:f.galleryOut,galleryOut:path.join(f.root,'conflict')}),/overlaps product keys/);
  assert.deepEqual(fs.readFileSync(path.join(f.data,'local-review-import.json')),mapping);
  assert.equal(fs.existsSync(path.join(f.root,'conflict')),false);
});

test('additive target merge keeps one original, preserves old metadata and rejects changed reused targets',()=>{
  const steel={key:'steel',label:'Edelstahl',kind:'steel'},acrylic={key:'acrylic-schwarz-3mm',label:'Acrylglas Schwarz · 3 mm',kind:'acrylic'};
  const old={id:'SAME',reviewMaterial:steel,note:'keep',reviewThemes:[{key:'a',label:'A'}],targets:[{sizeKey:'steel-small',mm:[80,35],status:'prepared',productKey:'pilot',nativeDesignId:'native'}]};
  const fresh={id:'SAME',reviewMaterial:acrylic,note:'different metadata',reviewThemes:[{key:'b',label:'B'}],reusedTargetRefs:[{...old.targets[0],reviewMaterial:steel}],targets:[{sizeKey:'acrylic-small',mm:[80,35],status:'prepared',productKey:'new',nativeDesignId:'native'}]};
  const result=mergeDesignReviewOriginals([old],[fresh]);
  assert.equal(result.length,1);assert.equal(result[0].note,'keep');assert.deepEqual(result[0].targets[0],old.targets[0]);
  assert.deepEqual(result[0].targets[1].reviewMaterial,acrylic);assert.equal(result[0].reviewThemes.length,2);
  assert.equal(old.targets.length,1);
  const wrong=structuredClone(fresh);wrong.reusedTargetRefs[0].nativeDesignId='foreign';
  assert.throws(()=>mergeDesignReviewOriginals([old],[wrong]),/Reused target differs/);
  const collision={...fresh,targets:[{...old.targets[0],reviewMaterial:steel,productKey:'replacement'}]};
  assert.throws(()=>mergeDesignReviewOriginals([old],[collision]),/conflicts with an existing/);
});

test('same original gains another material without touching existing product heads or review state',async t=>{
  const f=fixture(t),id=f.base.manifest.originals[0].id;
  const addon=read(path.join(f.addonRoot,'manifest.json')),product=addon.products[0],oldId=addon.originals[0].id;
  addon.originals[0].id=id;product.designIds=[id];
  const productFile=path.join(f.addonRoot,product.file),payload=read(productFile);
  payload.document.config.profile.designs[0].katalog.designId=id;
  product.documentHash=sha(JSON.stringify(payload.document));write(productFile,payload);
  fs.renameSync(path.join(f.addonRoot,'originals',oldId),path.join(f.addonRoot,'originals',id));
  write(path.join(f.addonRoot,'originals',id,'design.json'),{id});
  write(path.join(f.addonRoot,'manifest.json'),addon);checksum(f.addonRoot);
  const protectedNames=['profiles.sqlite','review-comments.sqlite','review-approvals.sqlite'];
  const before=protectedNames.map(name=>fs.readFileSync(path.join(f.data,name)));
  const result=await extendDesignReview(f);
  assert.equal(result.newOriginals,0);assert.equal(result.extendedOriginals,1);assert.equal(result.newProducts,1);
  const merged=readSlatePackage(f.galleryOut).pack;
  assert.equal(merged.originals.length,1);assert.equal(merged.originals[0].targets.length,2);
  assert.deepEqual(merged.originals[0].targets[0],f.base.manifest.originals[0].targets[0]);
  assert.equal(merged.originals[0].targets[1].reviewMaterial.key,'steel');
  const repo=createProductRepository({filename:path.join(f.data,'workshop.sqlite'),validateDocument:validateProductDocument});
  try{assert.deepEqual(repo.get(f.edited.id),f.edited);assert.equal(repo.list().length,2);}finally{repo.close();}
  protectedNames.forEach((name,index)=>assert.deepEqual(fs.readFileSync(path.join(f.data,name)),before[index]));
  const repeated=await extendDesignReview({...f,baseRoot:f.galleryOut,galleryOut:path.join(f.root,'unused')});
  assert.equal(repeated.alreadyPresent,true);
});

test('overlapping originals require identical source bytes before creating a merged gallery',t=>{
  const f=fixture(t),manifest=read(path.join(f.addonRoot,'manifest.json'));
  manifest.originals[0].id=f.base.manifest.originals[0].id;manifest.products[0].designIds=[manifest.originals[0].id];
  write(path.join(f.addonRoot,'manifest.json'),manifest);
  write(path.join(f.addonRoot,'originals',manifest.originals[0].id,'design.json'),{id:manifest.originals[0].id,changed:true});checksum(f.addonRoot);
  assert.throws(()=>mergeSlatePackages({...f,out:f.galleryOut,materialExtension:true}),/Overlapping original source differs/);
  assert.equal(fs.existsSync(f.galleryOut),false);
});

test('different font paths may share only byte-identical resources and retain the base font mapping',t=>{
  const f=fixture(t),manifest=read(path.join(f.addonRoot,'manifest.json'));
  const [name,oldPath]=Object.entries(manifest.fontFiles)[0],newPath='fonts/content-addressed.json';
  const bytes=fs.readFileSync(path.join(f.addonRoot,oldPath));
  fs.writeFileSync(path.join(f.addonRoot,newPath),bytes);manifest.fontFiles[name]=newPath;
  write(path.join(f.addonRoot,'manifest.json'),manifest);checksum(f.addonRoot);
  const result=mergeSlatePackages({...f,out:f.galleryOut,materialExtension:true});
  assert.equal(readSlatePackage(result.out).pack.fontFiles[name],f.base.manifest.fontFiles[name]);
  fs.writeFileSync(path.join(f.addonRoot,newPath),Buffer.concat([bytes,Buffer.from(' ')]));checksum(f.addonRoot);
  assert.throws(()=>mergeSlatePackages({...f,out:path.join(f.root,'font-conflict'),materialExtension:true}),/Font file mapping conflict/);
});

test('more than 100 new product groups import in journalled batches and repeat without new revisions',async t=>{
  const f=fixture(t),manifest=read(path.join(f.addonRoot,'manifest.json'));
  const original=manifest.originals[0],product=manifest.products[0],payload=read(path.join(f.addonRoot,product.file));
  manifest.originals=[];manifest.products=[];
  for(let index=0;index<101;index++){
    const id='BATCH-'+index,native='katalog-'+id,copy=structuredClone(payload),key='batch:'+index;
    copy.document.config.profile.designs[0].id=native;
    copy.document.config.profile.designs[0].katalog.designId=id;
    copy.document.config.profile.defaultDesignId=native;
    copy.document.elementRights={[native]:copy.document.elementRights[payload.document.config.profile.designs[0].id]};
    const next={...product,key,productId:'cfg_package-'+index,designIds:[id],file:'products/batch-'+index+'.json',documentHash:sha(JSON.stringify(copy.document))};
    manifest.products.push(next);manifest.originals.push({...original,id,targets:[{...original.targets[0],nativeDesignId:native,productKey:key}]});
    write(path.join(f.addonRoot,next.file),copy);write(path.join(f.addonRoot,'originals',id,'design.json'),{id});
  }
  write(path.join(f.addonRoot,'manifest.json'),manifest);checksum(f.addonRoot);
  const result=await extendDesignReview(f);assert.equal(result.newProducts,101);assert.equal(result.newOriginals,101);
  const mapping=fs.readFileSync(path.join(f.data,'local-review-import.json'));
  const repeated=await extendDesignReview({...f,baseRoot:f.galleryOut,galleryOut:path.join(f.root,'unused')});
  assert.equal(repeated.alreadyPresent,true);assert.deepEqual(fs.readFileSync(path.join(f.data,'local-review-import.json')),mapping);
  const repo=createProductRepository({filename:path.join(f.data,'workshop.sqlite'),validateDocument:validateProductDocument});
  try{assert.equal(repo.list().length,102);assert.deepEqual(repo.get(f.edited.id),f.edited);}finally{repo.close();}
});

test('wrong material, dimensions or missing native source mapping fail before DB mutation',async t=>{
  for(const alteration of ['material','dimensions','mapping']){
    const f=fixture(t),manifest=read(path.join(f.addonRoot,'manifest.json')),before=fs.readFileSync(path.join(f.data,'workshop.sqlite'));
    if(alteration==='material')manifest.originals[0].reviewMaterial={key:'slate',label:'Schiefer',kind:'slate'};
    if(alteration==='dimensions')manifest.originals[0].targets[0].mm[0]+=1;
    if(alteration==='mapping')delete manifest.originals[0].targets[0].nativeDesignId;
    write(path.join(f.addonRoot,'manifest.json'),manifest);checksum(f.addonRoot);
    await assert.rejects(extendDesignReview(f));
    assert.deepEqual(fs.readFileSync(path.join(f.data,'workshop.sqlite')),before);
    assert.equal(fs.existsSync(f.galleryOut),false);
  }
});

test('unchanged manifest with a changed font or original is a delivery conflict, even with updated valid checksums',async t=>{
  const f=fixture(t);await extendDesignReview(f);
  const mapping=fs.readFileSync(path.join(f.data,'local-review-import.json'));
  const source=path.join(f.addonRoot,'originals',f.addon.manifest.originals[0].id,'design.json');
  write(source,{id:f.addon.manifest.originals[0].id,note:'different original bytes'});checksum(f.addonRoot);
  await assert.rejects(extendDesignReview({...f,baseRoot:f.galleryOut,galleryOut:path.join(f.root,'changed-resources')}),/resources differ/);
  assert.deepEqual(fs.readFileSync(path.join(f.data,'local-review-import.json')),mapping);
  assert.equal(fs.existsSync(path.join(f.root,'changed-resources')),false);
});

test('repeat import detects an incompletely restored workshop database without touching the mapping',async t=>{
  const f=fixture(t),oldDatabase=fs.readFileSync(path.join(f.data,'workshop.sqlite'));await extendDesignReview(f);
  const mapping=fs.readFileSync(path.join(f.data,'local-review-import.json'));
  fs.writeFileSync(path.join(f.data,'workshop.sqlite'),oldDatabase);
  await assert.rejects(extendDesignReview({...f,baseRoot:f.galleryOut,galleryOut:path.join(f.root,'restored')}));
  assert.deepEqual(fs.readFileSync(path.join(f.data,'local-review-import.json')),mapping);
  assert.equal(fs.existsSync(path.join(f.root,'restored')),false);
});
