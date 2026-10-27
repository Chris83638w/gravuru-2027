import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {catalogPath,digest,loadDoorbellCatalog,decorationSvg,buildDoorbellConfig,assertCurrentRepository,assertCurrentAssetRepository,importDoorbellCatalog} from './import-doorbell-catalog.mjs';

const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-doorbell-test-'));
const write=(root,name,value)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value));return {path:name,sha256:digest(fs.readFileSync(file))};};
function fixture(root){
 const original={geometry:{cutPaths:['M 20 40 L 21 40 L 21 41 Z'],bell:{x:10,y:30,width:10,height:20}},designs:Array.from({length:16},(_,i)=>({id:'d'+i,objects:[]}))};
 const formats=['16x28','24x20','35x18'].map((key,i)=>({key,basePriceCents:[4999,5999,6999][i],...write(root,'models/'+key+'.json',{profile:original})}));
 const bundle={schema:'gravuru-doorbell-native-input/v1',modelKey:'test',doorbell:{formats:formats.map(f=>({...f,profile:{...original,geometry:{...original.geometry,shape:'rect',safeMarginMm:0,holes:[]}}}))}};
 const ref=write(root,'native/test.json',bundle);
 write(root,'native-input-index.json',{schema:'gravuru-doorbell-native-conversion-audit/v1',entries:[{modelKey:'test',...ref}]});
 write(root,'source-index.json',{files:[]});write(root,'legacy-resources-index.json',{schema:'gravuru-doorbell-legacy-resources/v1',files:[]});
 write(root,'main-products-126.json',{schema:'gravuru-doorbell-main-product-plan/v1',entries:formats.map(f=>({key:'test--'+f.key,modelKey:'test',handle:'test-'+f.key,formatKey:f.key,variantCount:120,basePriceCents:f.basePriceCents,defaults:{position:'standard',format:f.key}}))});
 write(root,'migration-manifest.json',{schema:'gravuru-layered-doorbell-migration/v1',mainProductsRef:'main-products-126.json',sourceIndexRef:'source-index.json',counts:{models:1,mainProducts:3},models:[{key:'test',formats}]});
 return ref;
}

test('catalogue references reject traversal and checksum changes before import',()=>{
 const dir=temporary();fixture(dir);
 assert.equal(loadDoorbellCatalog(dir).entries.length,3);
 assert.throws(()=>catalogPath(dir,'../other.json'),/Katalogpfad/);
 fs.appendFileSync(path.join(dir,'native/test.json'),' ');
 assert.throws(()=>loadDoorbellCatalog(dir),/Quellprüfsumme/);
});

test('the same model cannot silently lose a format or reuse another handle',()=>{
 const dir=temporary();fixture(dir);const file=path.join(dir,'main-products-126.json'),plan=JSON.parse(fs.readFileSync(file));
 plan.entries[2].handle=plan.entries[0].handle;fs.writeFileSync(file,JSON.stringify(plan));
 assert.throws(()=>loadDoorbellCatalog(dir),/Doppelte/);
});

test('native defaults retain every format and option without legacy live approval',()=>{
 const base={geometry:{width:160,height:280},materials:{acrylic:{thicknessMm:3,colors:[{key:'schwarz',hex:'#17191b'},{key:'anthrazit',hex:'#343a40'}]}},features:{orderEnabled:true,productionConfirmed:true},purchasing:{variants:[{sku:'old'}]},review:{approved:true},formats:[{}],designs:[{id:'D1',objects:[]}]};
 const native={doorbell:{schema:'gravuru-doorbell/v1',modelKey:'test',formats:['16x28','24x20','35x18'].map((key,i)=>({key,basePriceCents:[4999,5999,6999][i],profile:base}))},optionGroups:[{id:'format',label:'Format',values:['16x28','24x20','35x18'].map((id,i)=>({id,label:id,priceCents:[4999,5999,6999][i]}))},{id:'color',label:'Farbe',values:[{id:'schwarz',label:'Schwarz',priceCents:0},{id:'anthrazit',label:'Anthrazit',priceCents:0}]}],optionFields:[{id:'position',kind:'select',defaultValue:'standard',choices:[]}],localResources:{scope:'local-review-only',fonts:{},motifs:[]}};
 const entry={key:'test--24x20',formatKey:'24x20',formatLabel:'Querformat',modelLabel:'Test',defaults:{format:'24x20',color:'anthrazit',position:'standard',designId:'D1'}};
 const config=buildDoorbellConfig(native,entry,{fontIds:['Montserrat'],motifIds:['paw']});
 assert.equal(config.basePriceCents,5999);assert.equal(config.doorbell.formats.length,3);
 assert.equal(config.profile.optionGroups[0].defaultValueId,'24x20');assert.equal(config.profile.material.color,'#343a40');
 assert.equal(config.profile.binding.kind,'local-review');assert.equal(config.profile.features.orderEnabled,false);assert.equal(config.profile.features.productionConfirmed,false);
 assert.equal(config.profile.purchasing,undefined);assert.equal(config.profile.review,undefined);assert.equal(config.profile.optionFields[0].defaultValue,undefined);
 assert.deepEqual(config.localResources.fonts,{});assert.deepEqual(config.workshopProfiles.selections.fonts,['Montserrat']);
 assert.equal(native.doorbell.formats[0].profile.features.orderEnabled,true);
});

test('original path, round caps, physical bounds survive the artwork wrapper',()=>{
 const fragment='<path d="M22 87H138V237" fill="none" stroke="#000000" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>';
 const svg=decorationSvg({bounds:[21.6,86.6,116.8,150.8],svgFragment:fragment});
 assert.ok(svg.includes(fragment));assert.ok(svg.includes('viewBox="21.6 86.6 116.8 150.8"'));assert.ok(svg.includes('width="116.8mm"'));
});

test('existing version 3 databases are read-only rejected, not migrated',()=>{
 const dir=temporary(),file=path.join(dir,'legacy.sqlite'),db=new DatabaseSync(file);db.exec('PRAGMA user_version=3');db.close();
 const before=digest(fs.readFileSync(file));assert.throws(()=>assertCurrentRepository(file),/Version 4/);
 assert.equal(digest(fs.readFileSync(file)),before);
});

test('legacy assets without tenant columns are not silently upgraded',()=>{
 const dir=temporary(),file=path.join(dir,'legacy-assets.sqlite'),db=new DatabaseSync(file);db.exec('CREATE TABLE design_assets (id TEXT PRIMARY KEY)');db.close();
 const before=digest(fs.readFileSync(file));assert.throws(()=>assertCurrentAssetRepository(file),/Mandantenschema/);assert.equal(digest(fs.readFileSync(file)),before);
});

test('full private catalogue validates all 126 entries and imports idempotently into isolated databases',{skip:!process.env.GRAVURU_DOORBELL_CATALOG,timeout:600000},async()=>{
 const dir=temporary(),catalogDir=process.env.GRAVURU_DOORBELL_CATALOG,workDir=path.join(dir,'validation');
 const dry=await importDoorbellCatalog({catalogDir,workDir});
 assert.equal(dry.products,126);assert.equal(dry.models,42);assert.equal(dry.fonts,30);assert.equal(dry.motifs,703);assert.equal(dry.decorationAssets,82);
 assert.equal(dry.publicationPerformed,false);assert.equal(dry.shopifyMutations,0);
 const options={catalogDir,workDir,apply:true,database:path.join(dir,'products.sqlite'),assetDatabase:path.join(dir,'assets.sqlite')};
 const first=await importDoorbellCatalog(options),second=await importDoorbellCatalog(options);
 assert.equal(first.entries.filter(x=>x.created).length,126);assert.equal(second.entries.filter(x=>x.created).length,0);
 assert.deepEqual(first.entries.map(x=>x.id),second.entries.map(x=>x.id));
 assert.deepEqual(dry.entries.map(x=>x.key),first.entries.map(x=>x.key));
 assert.deepEqual(dry.entries.map(x=>x.fingerprint),first.entries.map(x=>x.fingerprint));
});
