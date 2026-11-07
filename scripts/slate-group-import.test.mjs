import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {makeProductDocument,validateProductDocument} from '../app/workshop/product-model.mjs';
import {slateProductGroups,slateGroupDocument,slateGroupVariants,slateGroupMainImage} from '../app/workshop/slate-product-groups.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {BUNDLE_SCHEMA,digest,validateBundle,planImport,importBundle,makeBundle} from './slate-group-import.mjs';
import {checkRuntime} from './check-slate-import-runtime.mjs';
const runtime=fileURLToPath(new URL('..',import.meta.url));
function fixture(){
 const family=JSON.parse(fs.readFileSync(new URL('../app/designs/steel-door-signs/family.json',import.meta.url)));
 family.id='schiefer-tafeln-natur';family.material={kind:'slate',label:'Schiefer',thicknessMm:5,processingProfileId:'slate-engraving'};
 family.photo={includedCount:1,extraPriceCents:999};family.sizes=family.sizes.slice(0,1);Object.assign(family.sizes[0],{key:'TEST-300X200',widthMm:300,heightMm:200,baseCents:2199,photoDesignCents:2899});
 const config=familyProductConfig(family,family.sizes[0],1),seed=config.profile.designs[0];
 config.profile.designs=[{...seed,id:'katalog-M1',name:'M1',themes:['andenken'],katalog:{designId:'M1',target:{familyId:family.id,explicit:true,released:true}}}];config.profile.defaultDesignId='katalog-M1';
 const source=makeProductDocument(config),groups=slateProductGroups(source,{familyId:family.id,sizeKey:family.sizes[0].key,masters:[{id:'M1',themes:['andenken'],json:{katalog:{zielgruppe:'Menschen'}}}],themes:[{id:'andenken',name:'Andenken'}]}).groups;
 const document=slateGroupDocument(source,groups[0]),image=slateGroupMainImage(document);
 const p={key:groups[0].key,family:family.id,productId:'cfg_fixture',revision:1,sourceDesignId:'M1',defaultDesignId:document.config.profile.defaultDesignId,designIds:['M1'],document,fingerprint:digest(document),variants:slateGroupVariants(document),mainImage:{designId:image.designId,sha256:image.sha256},imageSvg:Buffer.from(image.svg).toString('base64')};
 return {schema:BUNDLE_SCHEMA,tenantId:'gravuru',products:[p],assets:{design_sources:[],design_assets:[],material_surfaces:[],photo_example_sources:[]}};
}
function target(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'slate-group-import-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 createDesignAssetStore({filename:path.join(dir,'design-assets.sqlite'),tenantId:'gravuru'}).close();
 const repo=createProductRepository({filename:path.join(dir,'workshop.sqlite'),tenantId:'gravuru',validateDocument:validateProductDocument});
 const unrelated=structuredClone(fixture().products[0].document);unrelated.config.profile.id='unrelated-existing';unrelated.name='Vorhandenes Produkt';const saved=repo.create(unrelated);repo.close();
 return {dir,saved};
}
test('plans without product writes; append import preserves existing product and repeats without a revision',async t=>{
 const {dir,saved}=target(t),bundle=fixture();assert.equal(planImport(bundle,dir).products[0].action,'create');
 const planned=await importBundle(bundle,dir);assert.equal(planned.applied,false);assert.equal(fs.existsSync(path.join(dir,'slate-import-backups')),false);
 await assert.rejects(()=>importBundle(bundle,dir,{apply:true}),/--runtime/);
 const first=await importBundle(bundle,dir,{apply:true,runtime});assert.equal(first.products[0].created,true);assert.equal(first.applied,true);assert.ok(fs.existsSync(path.join(first.backupDirectory,'workshop.sqlite')));
 const second=await importBundle(bundle,dir,{apply:true,runtime});assert.equal(second.products[0].action,'unchanged');assert.equal(second.products[0].id,first.products[0].id);assert.equal(second.products[0].revision,1);assert.equal(second.backupDirectory,undefined);
 fs.unlinkSync(path.join(dir,'slate-group-import-state.json'));
 const resumed=await importBundle(bundle,dir,{apply:true,runtime});assert.equal(resumed.journalRepaired,true);assert.equal(resumed.products[0].revision,1);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'slate-group-import-state.json')))[bundle.products[0].key].id,first.products[0].id);
 const repo=createProductRepository({filename:path.join(dir,'workshop.sqlite'),tenantId:'gravuru'});try{assert.equal(repo.list().length,2);assert.equal(repo.get(saved.id).document.name,'Vorhandenes Produkt');assert.equal(repo.get(saved.id).revision,1);}finally{repo.close();}
});
test('owned update appends a revision; outside changes and duplicate profiles block before writes',async t=>{
 const {dir}=target(t),bundle=fixture(),first=await importBundle(bundle,dir,{apply:true,runtime});
 const changed=structuredClone(bundle);changed.products[0].document.name='Neuer Titel';changed.products[0].document=validateProductDocument(changed.products[0].document);changed.products[0].fingerprint=digest(changed.products[0].document);
 const next=await importBundle(changed,dir,{apply:true,runtime});assert.equal(next.products[0].id,first.products[0].id);assert.equal(next.products[0].revision,2);
 const repo=createProductRepository({filename:path.join(dir,'workshop.sqlite'),tenantId:'gravuru',validateDocument:validateProductDocument});
 const manual=structuredClone(changed.products[0].document);manual.name='Manuell';repo.save(first.products[0].id,manual,2);repo.close();
 assert.throws(()=>planImport(bundle,dir),/außerhalb/);
 const duplicate=fixture();duplicate.products[0].key='schiefer-gruppe:'+'f'.repeat(32);assert.throws(()=>planImport(duplicate,dir),/außerhalb dieses Imports/);
});
test('changed image, approval, prices and originals are rejected before any target write',()=>{
 const b=fixture();assert.equal(validateBundle(b),b);
 for(const mutate of [p=>p.imageSvg=Buffer.from('fremd').toString('base64'),p=>p.variants[0].priceCents++,p=>{p.document.config.profile.designs[0].katalog.target.released=false;p.fingerprint=digest(p.document);}]){
  const changed=structuredClone(b);mutate(changed.products[0]);assert.throws(()=>validateBundle(changed));
 }
 b.assets.design_sources.push({sha256:'a'.repeat(64),bytes:Buffer.from('fremd').toString('base64')});assert.throws(()=>validateBundle(b),/Originaldatei/);
 const forged=fixture();forged.products[0].imageSvg=Buffer.from('<svg/>').toString('base64');forged.products[0].mainImage.sha256=digest('<svg/>');assert.throws(()=>validateBundle(forged),/gerenderten Startdesign/);
});
test('runtime gate checks the specified runtime and reports price differences',async t=>{
 const bundle=fixture(),compatible=await checkRuntime(bundle,runtime);assert.equal(compatible.compatible,true);assert.equal(Object.keys(compatible.hashes).length,3);
 bundle.products[0].variants[0].priceCents++;const incompatible=await checkRuntime(bundle,runtime);assert.equal(incompatible.compatible,false);assert.match(incompatible.products[0].reason,/Serverpreise/);
 const {dir}=target(t),before=fs.readFileSync(path.join(dir,'workshop.sqlite'));await assert.rejects(()=>importBundle(bundle,dir,{apply:true,runtime}),/Ziel-Laufzeit inkompatibel/);assert.deepEqual(fs.readFileSync(path.join(dir,'workshop.sqlite')),before);assert.equal(fs.existsSync(path.join(dir,'.slate-group-import.lock')),false);
});
test('immutable resource collisions and an existing writer lock cannot be overwritten',async t=>{
 const {dir}=target(t),bundle=fixture(),source=Buffer.from('original');bundle.assets.design_sources.push({sha256:digest(source),bytes:source.toString('base64')});
 const db=new DatabaseSync(path.join(dir,'design-assets.sqlite'));db.prepare('INSERT INTO design_sources(sha256,bytes) VALUES (?,?)').run(digest(source),Buffer.from('corrupt'));db.close();
 assert.throws(()=>planImport(bundle,dir),/unveränderliche Ressource/);
 bundle.assets.design_sources=[];fs.writeFileSync(path.join(dir,'.slate-group-import.lock'),'other writer');await assert.rejects(()=>importBundle(bundle,dir,{apply:true,runtime}),/EEXIST/);assert.equal(fs.readFileSync(path.join(dir,'.slate-group-import.lock'),'utf8'),'other writer');
});

test('portable bundle hydrates compact source fonts and imports them into a separate target without dangling references',async t=>{
 const source=target(t),destination=target(t),bundle=fixture(),p=bundle.products[0];
 const first=await importBundle(bundle,source.dir,{apply:true,runtime}),saved=first.products[0];
 const db=new DatabaseSync(path.join(source.dir,'workshop.sqlite'),{readOnly:true});
 try{assert.match(db.prepare('SELECT document FROM product_revisions WHERE product_id=? AND revision=?').get(saved.id,saved.revision).document,/\$gravuruResource/);}finally{db.close();}
 fs.mkdirSync(path.join(source.dir,'images'));
 fs.writeFileSync(path.join(source.dir,'images/main.svg'),Buffer.from(p.imageSvg,'base64'));
 fs.writeFileSync(path.join(source.dir,'shopify-plan.json'),JSON.stringify([{...p,productId:saved.id,revision:saved.revision,mainImage:{...p.mainImage,file:'images/main.svg'}}]));
 const exported=makeBundle(source.dir);
 assert.deepEqual(exported.products[0].document,p.document);
 assert.equal(exported.products[0].fingerprint,p.fingerprint);
 assert.equal(JSON.stringify(exported).includes('$gravuruResource'),false,'internal storage markers never leave in import packages');
 const imported=await importBundle(exported,destination.dir,{apply:true,runtime});
 const repo=createProductRepository({filename:path.join(destination.dir,'workshop.sqlite'),tenantId:'gravuru'});
 try{assert.deepEqual(repo.get(imported.products[0].id).document,p.document);}finally{repo.close();}
 assert.equal((await importBundle(exported,destination.dir,{apply:true,runtime})).products[0].action,'unchanged');
});
