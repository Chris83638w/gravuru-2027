import fs from 'node:fs';
import path from 'node:path';
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
import {workshopCatalog} from '../../app/workshop/catalog.mjs';
import {importSpecimens} from '../../app/workshop/specimen-import.mjs';

// Explicit, restartable maintenance. Never starts jobs or changes old products.
const config=merchantConfig(process.env);verifyMerchantStorage(config);
process.umask(0o077);process.env.GRAVURU_PYTHON=config.python;
const lock=await lockTestData(config),stores=[];
try{
 const db=new DatabaseSync(path.join(config.data,'workshop.sqlite'),{readOnly:true});
 try{if(db.prepare("SELECT 1 FROM ai_design_jobs WHERE status='running' LIMIT 1").get())throw Error('Ein KI-Auftrag läuft; Übernahme abgebrochen.');}finally{db.close();}
 const before=fs.realpathSync(process.argv[2]||'');
 if(!path.isAbsolute(before)||(fs.statSync(before).mode&0o077)||!fs.existsSync(path.join(before,'ACTIVATION-RECEIPT.json')))throw Error('Geprüfte private Aktivierungssicherung erforderlich.');
 for(const file of ['workshop.sqlite','profiles.sqlite','design-assets.sqlite'])if(!fs.existsSync(path.join(before,file)))throw Error('Private Datensicherung fehlt.');
 const fonts=createFontLibrary({filename:path.join(config.data,'design-assets.sqlite')});stores.push(fonts);
 const profiles=createProfileLibrary({filename:path.join(config.data,'profiles.sqlite'),catalog:workshopCatalog()});stores.push(profiles);profiles.registerFonts(fonts.list());
 const production=createProductionProfiles({filename:path.join(config.data,'profiles.sqlite')});stores.push(production);
 const assets=createDesignAssetStore({filename:path.join(config.data,'design-assets.sqlite')});stores.push(assets);
 const repository=createProductRepository({filename:path.join(config.data,'workshop.sqlite'),validateDocument:value=>{
  const d=validateProductDocument(value);profiles.resolve(d);assets.validateDocument(d);production.resolve(d);return d;
 },snapshotMetadata:d=>({profiles:profiles.resolve(d),productionProfile:production.resolve(d)})});stores.push(repository);
 const previous=repository.list({includeArchived:true}).map(r=>({id:r.id,revision:r.revision}));
 const result=await importSpecimens({repository,assets});
 for(const row of previous)if(repository.get(row.id).revision!==row.revision)throw Error('Vorhandener Produktstand verändert.');
 console.log(JSON.stringify({result:'PASS',existingProductsUnchanged:previous.length,imported:result}));
}finally{
 for(const store of stores.reverse())store.close();
 const exited=once(lock,'exit');lock.stdin.end();await exited;
}
