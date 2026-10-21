import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {merchantConfig,verifyMerchantStorage} from './merchant-config.mjs';
import {lockTestData} from './lock.mjs';
import {createProductRepository} from '../../app/workshop/repository.mjs';
import {validateProductDocument} from '../../app/workshop/product-model.mjs';
import {createProfileLibrary} from '../../app/workshop/profile-library.mjs';
import {createProductionProfiles} from '../../app/workshop/production-profiles.mjs';
import {createDesignAssetStore} from '../../app/workshop/design-assets.mjs';
import {createFontLibrary} from '../../app/workshop/font-library.mjs';
import {createOrderIntake} from '../../app/workshop/order-intake.mjs';
import {workshopCatalog} from '../../app/workshop/catalog.mjs';
import {productOverview} from '../../app/workshop/product-preview.mjs';
import {isFormProduct,formOverview} from '../../app/workshop/form-product.mjs';
import {importApprovedDesignBatch} from '../../app/workshop/approved-design-batch.mjs';

// Explicit maintenance only. No remote Shopify calls, orders, startup migration or publication.
const [packageArg,backupArg,copyArg]=process.argv.slice(2);
assert(packageArg&&backupArg&&process.argv.length<=5,'Usage: package-dir snapshot-dir [private-dry-run-copy-dir]');
const canonicalPrivate=p=>{assert(path.isAbsolute(p));assert.equal(fs.realpathSync(p),p);assert.equal(fs.statSync(p).mode&0o077,0);return p;};
process.umask(0o077);
const config=merchantConfig(process.env);verifyMerchantStorage(config);
const backup=canonicalPrivate(backupArg),bundle=canonicalPrivate(packageArg);
const proof=JSON.parse(fs.readFileSync(path.join(backup,'SNAPSHOT.json')));
assert.equal(proof.schema,'gravuru-merchant-private-snapshot/v1');assert.equal(proof.databases.length,3);
const liveData=config.data;
if(copyArg){config.data=canonicalPrivate(copyArg);assert.notEqual(config.data,liveData);assert.equal(path.dirname(config.data),path.dirname(backup));}
process.env.GRAVURU_PYTHON=config.python;
process.env.OPENBLAS_NUM_THREADS='1';process.env.OMP_NUM_THREADS='1';
const lock=await lockTestData(config),stores=[];
try{
 const db=new DatabaseSync(path.join(config.data,'workshop.sqlite'));stores.push(db);
 if(db.prepare("SELECT 1 FROM ai_design_jobs WHERE status='running' LIMIT 1").get())throw Error('Ein KI-Auftrag läuft.');
 const fontsStore=createFontLibrary({filename:path.join(config.data,'design-assets.sqlite')});stores.push(fontsStore);
 const profiles=createProfileLibrary({filename:path.join(config.data,'profiles.sqlite'),catalog:workshopCatalog()});stores.push(profiles);profiles.registerFonts(fontsStore.list());
 const production=createProductionProfiles({filename:path.join(config.data,'profiles.sqlite')});stores.push(production);
 const assets=createDesignAssetStore({filename:path.join(config.data,'design-assets.sqlite')});stores.push(assets);
 const repository=createProductRepository({filename:path.join(config.data,'workshop.sqlite'),catalogOverview:d=>isFormProduct(d)?formOverview(d):productOverview(d),validateDocument:value=>{const d=validateProductDocument(value);profiles.resolve(d);assets.validateDocument(d);production.resolve(d);return d;},snapshotMetadata:d=>({profiles:profiles.resolve(d),productionProfile:production.resolve(d)})});stores.push(repository);
 const intake=createOrderIntake({database:db,snapshot:()=>{throw Error('Keine Bestellung während des Imports.');}});
 const read=name=>JSON.parse(fs.readFileSync(path.join(bundle,name)));
 const products=read('produkte.json'),mapping=read('mapping.json').products,fonts=read('schriften.json');
 const packages=products.map(p=>read('designs/'+p.designId+'/import.json'));
 const result=await importApprovedDesignBatch({repository,assets,intake,seedId:'cfg_8e7244bf-3ce2-402e-a206-372a4fe400aa',seedRevision:1,packages,products,mapping,fonts});
 // Every historical row from the offline snapshot must still exist byte-for-byte.
 for(const name of ['workshop.sqlite','profiles.sqlite','design-assets.sqlite']){
  const check=new DatabaseSync(path.join(config.data,name),{readOnly:true});
  check.prepare('ATTACH DATABASE ? AS before_import').run(path.join(backup,name));
  for(const {name:table}of check.prepare("SELECT name FROM before_import.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()){
   const q='"'+table.replaceAll('"','""')+'"';
   assert.equal(check.prepare(`SELECT COUNT(*) AS n FROM (SELECT * FROM before_import.${q} EXCEPT SELECT * FROM main.${q})`).get().n,0,'Historische Daten verändert: '+table);
  }
  assert.equal(check.prepare('PRAGMA quick_check').get().quick_check,'ok');check.close();
 }
 const receipt={...result,dryRun:Boolean(copyArg),historicalRowsPreserved:true};
 const output=path.join(backup,copyArg?'IMPORT-DRY-RUN.json':'IMPORT-RESULT.json');
 fs.writeFileSync(output,JSON.stringify(receipt,null,2),{mode:0o600});
 console.log(JSON.stringify({ok:true,dryRun:Boolean(copyArg),products:result.products.length,bindings:result.products.reduce((n,p)=>n+p.bindings.length,0),existingProductsUnchanged:result.existingProductsUnchanged,historicalRowsPreserved:true,receipt:output}));
}finally{for(const store of stores.reverse())store.close();const closed=once(lock,'exit');lock.stdin.end();await closed;}
