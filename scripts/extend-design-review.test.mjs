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
import {readSlatePackage} from './extend-slate-original-review.mjs';

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
  await assert.rejects(extendDesignReview({...f,baseRoot:f.galleryOut,galleryOut:path.join(f.root,'conflict')}),/overlaps original IDs/);
  assert.deepEqual(fs.readFileSync(path.join(f.data,'local-review-import.json')),mapping);
  assert.equal(fs.existsSync(path.join(f.root,'conflict')),false);
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
