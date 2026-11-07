// Reproducible layered-doorbell adapter. Input data belongs in the catalogue;
// no Shopify IDs/SKUs are allocated and no internal publication is performed.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

export const digest=value=>createHash('sha256').update(value).digest('hex');
const clone=structuredClone;
const fail=message=>{throw Error(message);};
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])):value);
const equal=(a,b)=>canonical(a)===canonical(b);

export function catalogPath(root,relative){
 if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(v=>v==='..'||v===''))fail('Ungültiger Katalogpfad: '+relative);
 const base=fs.realpathSync(root),target=fs.realpathSync(path.resolve(base,relative));
 const rel=path.relative(base,target);
 if(rel.startsWith('..'+path.sep)||rel==='..'||path.isAbsolute(rel))fail('Katalogpfad verlässt den Quellordner.');
 return target;
}
function verified(root,entry){
 const filename=catalogPath(root,entry.path),bytes=fs.readFileSync(filename);
 if(!/^[a-f0-9]{64}$/.test(entry.sha256)||digest(bytes)!==entry.sha256||(entry.bytes!==undefined&&entry.bytes!==bytes.length))fail('Quellprüfsumme stimmt nicht: '+entry.path);
 return filename;
}

export function loadDoorbellCatalog(root){
 root=fs.realpathSync(root);
 const manifest=read(catalogPath(root,'migration-manifest.json'));
 if(manifest.schema!=='gravuru-layered-doorbell-migration/v1')fail('Unbekanntes Funkklingelmanifest.');
 const plan=read(catalogPath(root,manifest.mainProductsRef));
 const source=read(catalogPath(root,manifest.sourceIndexRef));
 const native=read(catalogPath(root,'native-input-index.json'));
 const resources=read(catalogPath(root,'legacy-resources-index.json'));
 if(plan.schema!=='gravuru-doorbell-main-product-plan/v1'||native.schema!=='gravuru-doorbell-native-conversion-audit/v1'||resources.schema!=='gravuru-doorbell-legacy-resources/v1')fail('Katalogindizes sind nicht kompatibel.');
 for(const item of [...source.files,...resources.files])verified(root,item);
 const bundles=new Map(native.entries.map(entry=>[entry.modelKey,read(verified(root,entry))]));
 if(manifest.models.length!==manifest.counts.models||bundles.size!==manifest.models.length||plan.entries.length!==manifest.models.length*3||plan.entries.length!==manifest.counts.mainProducts)fail('Modelle, Formate und Hauptprodukte stimmen nicht überein.');
 if(new Set(plan.entries.map(p=>p.key)).size!==plan.entries.length||new Set(plan.entries.map(p=>p.handle)).size!==plan.entries.length)fail('Doppelte Produktkennung oder Shopadresse.');
 for(const model of manifest.models){
  if(!/^[a-z0-9][a-z0-9-]{0,100}$/.test(model.key))fail('Ungültige Modellkennung.');
  const b=bundles.get(model.key);
  if(!b||b.schema!=='gravuru-doorbell-native-input/v1'||b.modelKey!==model.key||b.doorbell.formats.length!==3)fail('Native Modellzuordnung fehlt.');
  for(const format of model.formats){
   const original=read(verified(root,format)).profile;
   const adapted=b.doorbell.formats.find(f=>f.key===format.key);
   if(!adapted||adapted.basePriceCents!==format.basePriceCents||!equal(adapted.profile.geometry.cutPaths,original.geometry.cutPaths)||!equal(adapted.profile.geometry.bell,original.geometry.bell)||adapted.profile.designs.length!==16)fail('Native Geometrie oder Vorlagen weichen ab: '+model.key+'/'+format.key);
   if(!equal(adapted.profile.geometry,{...original.geometry,shape:'rect',safeMarginMm:0,holes:[]})||['frames','materials','mounting','manufacturing'].some(k=>!equal(adapted.profile[k],original[k])))fail('Native Ebenen oder Bohrbilder weichen ab: '+model.key+'/'+format.key);
   for(const [i,design]of original.designs.entries()){
    const target=adapted.profile.designs[i];
    if(target.id!==design.id||!equal(target.objects.slice(0,design.objects.length),design.objects)||(target.marks||[]).length||(target.objects.length-design.objects.length)!==(design.marks||[]).length)fail('Originalgestaltung wurde verändert: '+model.key+'/'+format.key+'/'+design.id);
   }
  }
  const entries=plan.entries.filter(p=>p.modelKey===model.key);
  if(entries.length!==3||new Set(entries.map(p=>p.formatKey)).size!==3)fail('Genau drei Formateinstiege pro Modell sind erforderlich.');
  for(const entry of entries){
   if(entry.key!==model.key+'--'+entry.formatKey||!['16x28','24x20','35x18'].includes(entry.formatKey)||!/^[a-z0-9][a-z0-9-]{0,254}$/.test(entry.handle))fail('Ungültige Hauptproduktkennung: '+entry.key);
   if(entry.variantCount!==120||entry.defaults.position!=='standard'||entry.defaults.format!==entry.formatKey||entry.basePriceCents!==b.doorbell.formats.find(f=>f.key===entry.formatKey)?.basePriceCents)fail('Ungültiger Hauptprodukteinstieg: '+entry.key);
  }
 }
 return {root,manifest,entries:plan.entries,bundles,resources,sourceFiles:source.files.length,manifestSha256:digest(fs.readFileSync(catalogPath(root,'migration-manifest.json')))};
}

// Compare the actual geometry/glyphs, not names or a claimed licence status.
export function resourceCrosswalk(catalog,available){
 if(!available?.fonts||!Array.isArray(available.motifs))fail('Die vorhandene Ressourcenbibliothek fehlt.');
 const fonts=[],motifs=[],mismatches=[];
 const byKey=new Map(available.motifs.map(m=>[m.key,m]));
 for(const item of catalog.resources.files){
  if(item.path.endsWith('--index.json'))continue;
  const source=read(catalogPath(catalog.root,item.path));
  if(item.kind==='fonts'){
   const id=path.basename(item.path).replace(/^fk26-fonts--/,'').replace(/\.json$/,'');
   const target=available.fonts[id];
   if(!target||!equal(source.regular,target.regular)||!equal(source.bold,target.bold))mismatches.push('font:'+id);
   fonts.push(id);
  }else{
   const target=byKey.get(source.key);
   if(!target||!equal(source.bounds,target.bounds)||source.svgFragment!==target.svgFragment)mismatches.push('motif:'+source.key);
   motifs.push(source.key);
  }
 }
 if(mismatches.length)fail('Vorhandene Ressourcen müssen exakt zugeordnet werden: '+mismatches.join(', '));
 return {fonts,motifs,policy:'preserve-existing-resources',newLicenceClaims:false,sourceFiles:catalog.resources.files.length};
}

export function decorationSvg(motif){
 const [x,y,w,h]=motif.bounds;
 if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0||typeof motif.svgFragment!=='string')fail('Ungültige Originaldekoration.');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="${x} ${y} ${w} ${h}">${motif.svgFragment}</svg>`;
}

async function artworkFor(svg,assets,cache){
 const sha=digest(svg);let resource=cache.get(sha);
 if(!resource){
  const prior=assets.list().find(a=>a.sourceSha256===sha&&a.format==='svg'&&a.page===1);
  if(prior){
   if(digest(assets.read(prior.assetId,true))!==sha||digest(assets.read(prior.assetId))!==prior.previewSha256)fail('Unveränderliche SVG-Quelle stimmt nicht mehr.');
   resource=assets.resource(prior.assetId);
  }else{
   const asset=await assets.import({name:'doorbell-decoration-'+sha.slice(0,16)+'.svg',bytes:Buffer.from(svg).toString('base64')});resource=assets.resource(asset.assetId);
  }
  cache.set(sha,resource);
 }
 return resource;
}

export async function importDecorations(bundle,assets,cache=new Map()){
 const mapped=new Map(),resources=new Map(),originals=new Map();
 for(const source of bundle.localResources.motifs){
  const svg=decorationSvg(source),sha=digest(svg);
  const resource=await artworkFor(svg,assets,cache);
  mapped.set(source.key,resource.key);resources.set(resource.key,resource);originals.set(sha,svg);
 }
 const native=clone(bundle);
 for(const profile of [native.profile,...native.doorbell.formats.map(f=>f.profile)]){
  for(const design of profile.designs)for(const object of design.objects)if(mapped.has(object.motif))object.motif=mapped.get(object.motif);
 }
 native.localResources={scope:'local-review-only',fonts:{},motifs:[...resources.values()]};
 return {native,originals};
}

export function buildDoorbellConfig(native,entry,{fontIds=[],motifIds=[],imageSha256}={}){
 const c=clone(native),selected=c.doorbell.formats.find(f=>f.key===entry.formatKey);
 if(!selected)fail('Unbekanntes Startformat.');
 const groups=c.optionGroups.map(g=>({id:g.id,name:g.label,required:true,defaultValueId:entry.defaults[g.id],values:g.values.map(v=>({...v,currency:'EUR'}))}));
 const fields=c.optionFields.map(({defaultValue,...field})=>field);
 const localId='doorbell-'+digest(entry.key).slice(0,24);
 const decorateProfile=p=>{
  const result=clone(p);
  // These legacy references are retained in the source archive, never treated
  // as current sales/production authorization or bindings for a new product.
  for(const key of ['purchasing','review','formats'])delete result[key];
  result.id=localId;result.revision='doorbell-import-v1';
  result.name=`Klingelschild für ${entry.modelLabel} – ${entry.formatLabel==='Laenglich'?'Länglich':entry.formatLabel}`;
  result.binding={kind:'local-review',productId:localId};
  result.features={...result.features,orderEnabled:false,productionConfirmed:false};
  result.defaultDesignId=entry.defaults.designId;
  if(imageSha256){if(!/^[a-f0-9]{64}$/.test(imageSha256))fail('Ungültige Bildprüfsumme.');result.admin={...result.admin,imageUrl:'/doorbell-assets/'+imageSha256+'.webp'};}
  const color=result.materials.acrylic.colors.find(v=>v.key===entry.defaults.color);
  if(!color)fail('Unbekannte Acrylfarbe.');
  // The old drawing defines gradients, not a material hex. Its 0.7 stop is
  // retained as the representative metadata colour; the preview keeps all stops.
  result.material={kind:'acrylic',color:color.hex||color.color||({schwarz:'#111214',anthrazit:'#33383e'}[color.key]),thicknessMm:result.materials.acrylic.thicknessMm};
  result.processing={profileId:'acrylic-engraving'};
  result.optionGroups=clone(groups);result.optionFields=clone(fields);
  return result;
 };
 const doorbell={...c.doorbell,defaultFormatKey:entry.formatKey,defaultPosition:entry.defaults.position,formats:c.doorbell.formats.map(f=>({...f,profile:decorateProfile(f.profile)}))};
 return {reviewOnly:true,basePriceCents:selected.basePriceCents,extraMotifCents:0,logo:{enabled:false},photo:{enabled:false,mode:'upload-only',includedCount:0,extraPriceCents:0},localResources:c.localResources,profile:decorateProfile(selected.profile),doorbell,
  workshopProfiles:{selections:{fonts:[...fontIds],motifs:[...motifIds]}}};
}

export function assertCurrentRepository(filename){
 if(!fs.existsSync(filename))return;
 const db=new DatabaseSync(filename,{readOnly:true});
 try{const version=db.prepare('PRAGMA user_version').get().user_version;if(![4,5].includes(version))fail('Bestehende Datenbank hat nicht Version 4 oder 5; niemals durch diesen Import automatisch migrieren.');}
 finally{db.close();}
}

export function assertCurrentAssetRepository(filename){
 if(!fs.existsSync(filename))return;
 const db=new DatabaseSync(filename,{readOnly:true});
 try{for(const table of ['design_assets','material_surfaces','photo_example_sources']){
  if(!db.prepare('PRAGMA table_info('+table+')').all().some(c=>c.name==='tenant_id'))fail('Bestehende Assetablage ist nicht das aktuelle Mandantenschema; keine automatische Migration.');
 }}finally{db.close();}
}

export async function prepareDoorbellImport(catalog,{assets,onProgress=()=>{}}){
 const [{makeProductDocument},{workshopResources},{variantCombinations,quote,resolvedOptions}]=await Promise.all([
  import('../app/workshop/product-model.mjs'),import('../app/workshop/catalog.mjs'),import('../app/configurator/variant-m/contract.mjs')]);
 const crosswalk=resourceCrosswalk(catalog,workshopResources()),cache=new Map(),originals=new Map(),bundles=new Map(),documents=[];
 const matrices=new Map();
 for(const model of catalog.manifest.models){
  const source=read(catalogPath(catalog.root,model.formats.find(f=>f.key==='16x28').path)).profile;
  const expected=source.purchasing.variants.map(v=>{const [color,frame,mounting]=v.key.split('|');return {formatKey:v.formatKey||'16x28',color,frame,mounting,priceCents:v.priceCents,existingVariantId:v.variantId,existingSku:v.sku};});
  const actual=read(catalogPath(catalog.root,model.legacyVariantMatrix)).variants;
  if(actual.length!==120||!equal(expected,actual))fail('Variantenmatrix weicht von gehashter Originalquelle ab: '+model.key);
  matrices.set(model.key,actual);
 }
 for(const [modelKey,bundle] of catalog.bundles){
  const imported=await importDecorations(bundle,assets,cache);bundles.set(modelKey,imported.native);
  for(const [sha,svg]of imported.originals)originals.set(sha,svg);
 }
 for(const entry of catalog.entries){
  const model=catalog.manifest.models.find(m=>m.key===entry.modelKey);
  const imageSha256=model.image?.sha256;
  if(!imageSha256)fail('Originales Gerätebild fehlt: '+entry.modelKey);
  verified(catalog.root,{path:'devices/'+imageSha256+'.webp',sha256:imageSha256,bytes:model.image.bytes});
  const config=buildDoorbellConfig(bundles.get(entry.modelKey),entry,{fontIds:crosswalk.fonts,motifIds:crosswalk.motifs,imageSha256});
  let document;
  try{document=assets.validateDocument(makeProductDocument(config,{name:config.profile.name,kind:'product'}));}
  catch(error){throw Error('Native Prüfung '+entry.key+': '+error.message,{cause:error});}
  const combinations=variantCombinations(document.config);
  if(entry.variantMatrixRef!==model.legacyVariantMatrix)fail('Variantenmatrix gehört zu einem anderen Modell.');
  const matrix=matrices.get(entry.modelKey);
  if(combinations.length!==120)fail('Variantenanzahl wurde verändert: '+entry.key);
  for(const option of combinations){
   const expected=matrix.find(v=>v.formatKey===option.format&&v.frame===option.frame&&v.color===option.color&&v.mounting===option.mounting);
   const p=quote(document.config,[],document.config.profile.defaultDesignId,option);
   const base=document.config.doorbell.formats.find(f=>f.key===option.format).basePriceCents;
   const surcharge=document.config.profile.optionGroups.find(g=>g.id==='mounting').values.find(v=>v.id===option.mounting).priceCents;
   if(!expected||expected.priceCents!==base+surcharge||p.unitCents!==expected.priceCents)fail('Preisabweichung: '+entry.key);
  }
  if(resolvedOptions(document.config).format!==entry.formatKey)fail('Startformat geht verloren.');
  const key='doorbell-v1:'+entry.key;
  const fingerprint=digest(canonical({manifest:catalog.manifestSha256,entry,document}));
  documents.push({key,fingerprint,document,source:entry});
  onProgress({completed:documents.length,total:catalog.entries.length,key:entry.key});
 }
 return {documents,originals,crosswalk,decorationAssets:cache.size,artworkResources:[...cache.values()]};
}

export async function importDoorbellCatalog({catalogDir,workDir,apply=false,database,assetDatabase,tenantId,onProgress}){
 const catalog=loadDoorbellCatalog(catalogDir);
 if(!workDir)fail('Isolierten Arbeitsordner angeben.');
 const workspace=path.resolve(workDir);
 if(workspace===catalog.root||workspace.startsWith(catalog.root+path.sep))fail('Arbeitsordner muss außerhalb des unveränderten Katalogs liegen.');
 if(apply&&(!database||!assetDatabase))fail('Schreibimport benötigt ausdrücklich Produkt- und Asset-Datenbank.');
 if(apply){if(path.resolve(database)===path.resolve(assetDatabase))fail('Getrennte Datenbanken angeben.');assertCurrentRepository(database);assertCurrentAssetRepository(assetDatabase);}
 const [{createDesignAssetStore},{createProductRepository},{validateProductDocument}]=await Promise.all([
  import('../app/workshop/design-assets.mjs'),import('../app/workshop/repository.mjs'),import('../app/workshop/product-model.mjs')]);
 fs.mkdirSync(workspace,{recursive:true});
 const preview=path.join(workspace,'validation-assets.sqlite');
 if(apply&&[database,assetDatabase].some(p=>path.resolve(p)===preview))fail('Prüfablage darf kein Importziel sein.');
 assertCurrentAssetRepository(preview);
 const assets=createDesignAssetStore({filename:preview,tenantId});let prepared;
 try{
  prepared=await prepareDoorbellImport(catalog,{assets,onProgress});
  fs.mkdirSync(path.join(workspace,'assets'),{recursive:true});
  const entries=prepared.artworkResources.map(resource=>{
   const a=resource.artwork,relative='assets/'+a.assetId+'.svg',bytes=assets.read(a.assetId);
   if(digest(bytes)!==a.previewSha256)fail('Geprüfte Grafik hat ihre Prüfsumme verloren.');
   fs.writeFileSync(path.join(workspace,relative),bytes);
   return {assetId:a.assetId,path:relative,url:'/api/workshop/design-assets/'+a.assetId+'/preview.svg',sourceSha256:a.sourceSha256,previewSha256:a.previewSha256};
  });
  fs.writeFileSync(path.join(workspace,'asset-index.json'),JSON.stringify({schema:'gravuru-doorbell-import-artwork/v1',entries},null,2)+'\n');
 }finally{assets.close();}
 let imported=[];
 if(apply){
  const targetAssets=createDesignAssetStore({filename:assetDatabase,tenantId});let repository;
  try{
   const targetCache=new Map();for(const svg of prepared.originals.values())await artworkFor(svg,targetAssets,targetCache);
   const validateDocument=doc=>targetAssets.validateDocument(validateProductDocument(doc));
   for(const row of prepared.documents)validateDocument(row.document);
   repository=createProductRepository({filename:database,tenantId,validateDocument,snapshotMetadata:()=>({importSource:'doorbell-catalog',manifestSha256:catalog.manifestSha256})});
   // Check every idempotency conflict before the first transaction. Batches are
   // bounded by the existing repository API, and interrupted imports resume.
   for(const row of prepared.documents){const prior=repository.importItem(row.key);if(prior&&prior.fingerprint!==row.fingerprint)fail('Importschlüssel bereits mit anderem Stand belegt: '+row.key);}
   for(let i=0;i<prepared.documents.length;i+=100)imported.push(...repository.importBatch(prepared.documents.slice(i,i+100)));
  }finally{repository?.close();targetAssets.close();}
 }
 const output=path.join(workspace,'documents');fs.mkdirSync(output,{recursive:true});
 const entries=prepared.documents.map(row=>{
  const filename=row.source.key+'.json';fs.writeFileSync(path.join(output,filename),JSON.stringify(row.document)+'\n');
  const {key:journalKey,...saved}=imported.find(x=>x.key===row.key)||{};
  return {key:row.source.key,importKey:row.key,fingerprint:row.fingerprint,documentPath:'documents/'+filename,sourceShopifyProductId:row.source.shopifyProductId,formatKey:row.source.formatKey,defaults:row.source.defaults,image:row.source.primaryImage,...saved};
 });
 const report={schema:'gravuru-doorbell-import-report/v1',mode:apply?'imported-internal-only':'dry-run',manifestSha256:catalog.manifestSha256,models:catalog.bundles.size,products:entries.length,formats:catalog.bundles.size*3,variantsPerProduct:120,sourceFiles:catalog.sourceFiles+catalog.resources.files.length,decorationAssets:prepared.decorationAssets,fonts:prepared.crosswalk.fonts.length,motifs:prepared.crosswalk.motifs.length,newLicenceClaims:false,shopifyMutations:0,publicationPerformed:false,entries};
 fs.writeFileSync(path.join(workspace,'import-report.json'),JSON.stringify(report,null,2)+'\n');
 return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const options={},allowed=new Set(['catalog','work-dir','database','asset-database','tenant']);
 for(let i=2;i<process.argv.length;i++){
  const key=process.argv[i];if(key==='--apply'){options.apply=true;continue;}if(key==='--dry-run')continue;
  if(!key.startsWith('--')||!allowed.has(key.slice(2))||!process.argv[i+1]||process.argv[i+1].startsWith('--'))fail('Unbekannte oder unvollständige Importoption: '+key);
  options[key.slice(2)]=process.argv[++i];
 }
 if(!options.catalog||!options['work-dir'])fail('Aufruf: --catalog <Verzeichnis> --work-dir <Prüfablage> [--apply --database <Datei> --asset-database <Datei>]');
 const report=await importDoorbellCatalog({catalogDir:options.catalog,workDir:options['work-dir'],apply:options.apply,database:options.database,assetDatabase:options['asset-database'],tenantId:options.tenant,onProgress:p=>{if(p.completed%21===0)console.error(JSON.stringify(p));}});
 console.log(JSON.stringify({...report,entries:undefined}));
}
