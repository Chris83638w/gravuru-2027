// Second step after prepare-slate-products.mjs. Local, resumable and no Shopify writes.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {approvedForFamily,assignTargetSeries,designTargets} from '../app/workshop/design-targets.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {slateCatalogueProduct} from '../app/workshop/slate-catalog-product.mjs';
import {slateProductGroups,slateMainProducts,slateGroupDocument,slateGroupVariants,slateGroupMainImage,saveSlateGroup} from '../app/workshop/slate-product-groups.mjs';

const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
if(['--katalog','--source','--out'].some(k=>!args.includes(k)||!get(k)||get(k).startsWith('--')))throw Error('--katalog, --source und --out erforderlich.');
const root=path.resolve(get('--katalog')),source=path.resolve(get('--source')),out=path.resolve(get('--out'));
if(source===out)throw Error('Produktgruppen benötigen einen eigenen Ausgabeordner.');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,data)=>{const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n');fs.renameSync(temp,file);};
const plans=read(path.join(source,'shopify-plan.json'));
if(plans.length!==48||new Set(plans.map(p=>p.sizeKey)).size!==48)throw Error('Als Grundlage werden die 48 eindeutigen nativen Tafeln erwartet.');
const katalog=openKatalog(root),masters=new Map(katalog.designs.masters.map(d=>[d.id,d]));
const catalogueCommit=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();
fs.mkdirSync(path.join(out,'images'),{recursive:true});
const locksFile=path.join(out,'starter-selections.json');
const locks=fs.existsSync(locksFile)?read(locksFile):{};
const stateFile=path.join(out,'group-state.json'),states=fs.existsSync(stateFile)?read(stateFile):{};
if(args.includes('--starters'))Object.assign(locks,read(path.resolve(get('--starters'))));
const sourceDb=new DatabaseSync(path.join(source,'workshop.sqlite'),{readOnly:true});
const sourceAssets=new DatabaseSync(path.join(source,'design-assets.sqlite'),{readOnly:true});
const assets=createDesignAssetStore({filename:path.join(out,'design-assets.sqlite')});
// Append immutable source assets, preserving output assets and WAL pages on reruns.
const destinationAssets=new DatabaseSync(path.join(out,'design-assets.sqlite'));
sourceAssets.exec('BEGIN');destinationAssets.exec('BEGIN IMMEDIATE');
try{
 for(const table of ['design_sources','design_assets','material_surfaces','photo_example_sources']){
  const columns=sourceAssets.prepare('PRAGMA table_info('+table+')').all().map(c=>c.name);
  if(columns.some(c=>!/^[a-z_][a-z0-9_]*$/.test(c)))throw Error('Unbekanntes Ressourcenschema.');
  const insert=destinationAssets.prepare('INSERT OR IGNORE INTO '+table+' ('+columns.join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')');
  for(const row of sourceAssets.prepare('SELECT * FROM '+table).all())insert.run(...columns.map(c=>row[c]));
 }
 destinationAssets.exec('COMMIT');sourceAssets.exec('COMMIT');
}catch(e){destinationAssets.exec('ROLLBACK');sourceAssets.exec('ROLLBACK');throw e;}
finally{sourceAssets.close();destinationAssets.close();}
const repository=createProductRepository({filename:path.join(out,'workshop.sqlite'),validateDocument:validateProductDocument});
const report={schema:'gravuru-slate-product-groups/v1',catalogueCommit,sourcePreparation:read(path.join(source,'preparation-report.json')),plates:[],products:[],excluded:[],writesToShopify:0};
try{
 for(const plan of plans){
  const family=katalog.families.get(plan.family),size=family?.sizes.find(s=>s.key===plan.sizeKey);
  if(!size)throw Error('Tafel fehlt im aktuellen Katalog: '+plan.sizeKey);
  const row=sourceDb.prepare('SELECT r.document,r.revision FROM product_revisions r JOIN products p ON p.id=r.product_id AND p.tenant_id=r.tenant_id AND p.revision=r.revision WHERE p.id=? AND p.tenant_id=?').get(plan.productId,'gravuru');
  if(!row)throw Error('Native Ausgangstafel fehlt: '+plan.productId);
  const original=readDocument(row.document);
  const currentBase=slateCatalogueProduct(root,family,size);
  for(const key of ['basePriceCents','photoDesignCents','extraMotifCents','quantityTiers','materialSurface'])if(JSON.stringify(currentBase[key])!==JSON.stringify(original.config[key]))throw Error('Native Vorbereitung erneuern: '+size.key+' / '+key+' wurde geändert.');
  for(const key of ['geometry','material','processing','optionGroups'])if(JSON.stringify(currentBase.profile[key])!==JSON.stringify(original.config.profile[key]))throw Error('Native Vorbereitung erneuern: '+size.key+' / '+key+' wurde geändert.');
  // A stale preparation must not carry a subsequently withdrawn release into the new products.
  const preparedIds=new Set();
  for(const d of original.config.profile.designs.filter(d=>d.katalog?.designId)){
   const master=masters.get(d.katalog.designId);
   if(!master||master.hidden||!approvedForFamily(master,plan.family,katalog))throw Error('Native Vorbereitung erneuern: Freigabe fehlt für '+d.katalog.designId);
   preparedIds.add(master.id);
  }
  const candidates=katalog.designs.masters.filter(d=>!d.hidden&&designTargets(d,katalog).some(t=>t.familie===family.id));
  const assigned=assignTargetSeries(family,candidates,katalog).filter(a=>a.sizes.includes(size.key));
  if([...preparedIds].some(id=>!assigned.some(a=>a.design.id===id)))throw Error('Native Vorbereitung erneuern: Größen-Zielzuordnung wurde geändert: '+size.key);
  const waiting=assigned.filter(a=>!approvedForFamily(a.design,family.id,katalog)).map(a=>a.design.id);
  const missingApproved=assigned.filter(a=>approvedForFamily(a.design,family.id,katalog)&&!preparedIds.has(a.design.id)).map(a=>a.design.id);
  const grouped=slateProductGroups(original,{familyId:plan.family,sizeKey:plan.sizeKey,masters,themes:katalog.themes});
  const excluded=grouped.excluded,groups=slateMainProducts(grouped.groups,{lines:katalog.lines,excluded});
  report.excluded.push(...excluded.map(e=>({sizeKey:plan.sizeKey,...e})));
  const plate={family:plan.family,sizeKey:plan.sizeKey,sourceProductId:plan.productId,groups:groups.length,prepared:0,waitingForApproval:waiting,missingFromPreparation:missingApproved};
  for(const group of groups){
   try{
    if(group.startDesign&&locks[group.key]&&locks[group.key]!==group.startDesign)throw Error('Katalog-Hauptbild und gespeichertes Startdesign widersprechen sich; ausdrücklich mit --starters abgleichen.');
    const document=slateGroupDocument(original,group,{startDesign:locks[group.key]});
    assets.validateDocument(document);
    const examples=document.config.localResources.photoExamples.map(e=>({...e,url:'data:image/svg+xml;base64,'+assets.read(e.assetId).toString('base64')}));
    const mainImage=slateGroupMainImage(document,{examples});
    const saved=saveSlateGroup(repository,{key:group.key,document,previous:states[group.key]});
    const {revision,fingerprint}=saved;states[group.key]={id:saved.id,revision,fingerprint};write(stateFile,states);
    locks[group.key]=mainImage.sourceDesignId;
    const filename=group.handle+'.svg';fs.writeFileSync(path.join(out,'images',filename),mainImage.svg);
    report.products.push({key:group.key,handle:group.handle,title:document.name,family:plan.family,sizeKey:plan.sizeKey,
     themeId:group.themeId,audience:group.audienceLabel,photoDesigns:group.photoDesigns,designIds:group.designs.map(d=>d.sourceId),
     catalogueMainProduct:group.catalogueMainProduct??null,externalIds:group.externalIds??{},
     productId:saved.id,revision,fingerprint,sourceProductId:plan.productId,sourceRevision:row.revision,catalogueCommit,
     defaultDesignId:mainImage.designId,sourceDesignId:mainImage.sourceDesignId,variants:slateGroupVariants(document),status:'DRAFT',
     mainImage:{file:'images/'+filename,designId:mainImage.designId,sourceDesignId:mainImage.sourceDesignId,sha256:mainImage.sha256,options:mainImage.options},created:saved.created});
    // Persist each successful starter so interruption or added designs cannot silently change a main image.
    write(locksFile,locks);plate.prepared++;
   }catch(e){report.excluded.push({sizeKey:plan.sizeKey,groupKey:group.key,reason:e.message});}
  }
  plate.status=plate.prepared?'vorbereitet':waiting.length?'Freigabe offen':'passende freigegebene Designs fehlen';report.plates.push(plate);
 }
 report.unusedPreviousGroups=Object.entries(states).filter(([key])=>!report.products.some(p=>p.key===key)).map(([key,state])=>({key,...state}));
 report.counts={plates:report.plates.length,platesWithGroups:report.plates.filter(p=>p.prepared).length,groups:report.products.length,
  templates:report.products.reduce((n,p)=>n+p.designIds.length,0),excluded:report.excluded.length};
 write(path.join(out,'shopify-plan.json'),report.products);write(path.join(out,'product-groups-report.json'),report);
 console.log(JSON.stringify({...report.counts,catalogueCommit,writesToShopify:0}));
 if(report.excluded.length)process.exitCode=2;
}finally{sourceDb.close();assets.close();repository.close();}
function readDocument(value){return validateProductDocument(JSON.parse(value));}
