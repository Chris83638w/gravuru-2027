// Build the four confirmed groups with the existing catalogue/format/product contracts.
// No publication or change to an existing product. Data stays outside Git.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {planFamilyFormats} from '../app/workshop/katalog-family-formats.mjs';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {makeProductDocument,validateProductDocument} from '../app/workshop/product-model.mjs';
import {createProductionProfiles} from '../app/workshop/production-profiles.mjs';
import {createProfileLibrary} from '../app/workshop/profile-library.mjs';
import {workshopCatalog} from '../app/workshop/catalog.mjs';
import {productOverview} from '../app/workshop/product-preview.mjs';
const [catalogArg,outArg,fontArg,reportArg]=process.argv.slice(2);
if(!catalogArg||!outArg||!fontArg)throw Error('Arguments: <catalog> <private-data-directory> <verified-native-fonts.json>');
const out=path.resolve(outArg);for(let p=out;;p=path.dirname(p)){if(fs.existsSync(path.join(p,'.git')))throw Error('Private data must stay outside Git');if(p===path.dirname(p))break;}
fs.mkdirSync(out,{recursive:true});
const reports=path.resolve(reportArg||out);fs.mkdirSync(reports,{recursive:true});
const katalog=openKatalog(path.resolve(catalogArg)),fonts=JSON.parse(fs.readFileSync(fontArg,'utf8'));
const line=katalog.lines.get('uv-gedenkkreuze'),assets=createDesignAssetStore({filename:path.join(out,'design-assets.sqlite')});
const profiles=createProfileLibrary({filename:path.join(out,'profiles.sqlite'),catalog:workshopCatalog({fonts,motifs:[]})});
const productionProfiles=createProductionProfiles({filename:path.join(out,'profiles.sqlite')});
const productionSettings={name:'UV-Gedenkkreuz · 5 mm klar · Hinterdruck',method:'print',materialId:'acrylic-clear',thicknessMm:5,machine:'',rip:'',notes:'Chris, 09.11.2026: Hinterdruck, 5 mm klar. RDG_WHITE motivbezogen, Schnittkontur separat. Maschinen- und ICC-Abnahme bleiben unverändert offen.',output:{profile:'roland',dpi:300,white:'motif',bleedMm:0,whiteBleedMm:0,mirror:true},archived:false};
const productionProfile=productionProfiles.list().find(p=>JSON.stringify(p.document)===JSON.stringify(productionSettings))??productionProfiles.create(productionSettings);
const repo=createProductRepository({filename:path.join(out,'workshop.sqlite'),catalogOverview:productOverview,validateDocument:d=>{const v=assets.validateDocument(validateProductDocument(d));productionProfiles.resolve(v);return v;},snapshotMetadata:d=>({productionProfile:productionProfiles.resolve(d)})});
try{
 const prepared=[];
 for(const [index,sub] of line.subcategories.entries()){
  const {config,report}=await planFamilyFormats(katalog,line.id,sub.id,{available:fonts,assets,shopProduct:{sizeKey:'UV-KREUZ-11X20',themeId:sub.themeId,defaultDesignId:sub.startDesign,groessenWahl:'alle'}});
  fs.writeFileSync(path.join(reports,sub.id+'-plan.json'),JSON.stringify(report,null,2)+'\n');
  assert.ok(config,sub.id+': '+JSON.stringify(report.blocked));assert.equal(report.excluded.length,0,JSON.stringify(report.excluded));
  assert.equal(config.familyFormats.formats.length,3);assert.equal(config.familyFormats.designs.length,15);
  assert.ok(config.familyFormats.formats.every(s=>s.variants.length===1&&s.variants[0].designIds.length===5));
  const document=makeProductDocument(config,{name:config.profile.name});
  document.categoryIds=['linie-'+line.id,'unterkategorie-'+sub.id,'familie-uv-gedenkkreuze-acryl-klar'];
  document.productionProfile={id:productionProfile.id,revision:productionProfile.revision};
  const fingerprint=createHash('sha256').update(JSON.stringify(document)).digest('hex');
  const prior=repo.importItem('uv-cross-20261109:'+sub.id);
  if(prior&&prior.fingerprint!==fingerprint)throw Error(sub.id+': Existing import differs; create an explicit new revision instead of a duplicate.');
  prepared.push({sub,index,fingerprint,document});
 }
 const imported=repo.importBatch(prepared.map(({sub,fingerprint,document})=>({key:'uv-cross-20261109:'+sub.id,fingerprint,document})));
 const groups=[];
 for(const [{sub,index,document},saved] of prepared.map((p,i)=>[p,imported[i]])){
  const readback=repo.get(saved.id);assert.deepEqual(readback.document.config,document.config);assets.validateDocument(readback.document);
  groups.push({id:sub.id,name:sub.name,sortOrder:index+1,productId:saved.id,revision:readback.revision,created:saved.created,designs:5,formats:3,configuratorUrl:'/?'+new URLSearchParams({configuration:saved.id,revision:String(readback.revision)}),document});
  console.log(JSON.stringify({group:sub.name,productId:saved.id,designs:15,created:saved.created}));
 }
 fs.writeFileSync(path.join(reports,'uv-cross-products.json'),JSON.stringify({schema:'gravuru-uv-cross-products/v1',groups},null,2)+'\n');
}finally{repo.close();assets.close();productionProfiles.close();profiles.close();}
