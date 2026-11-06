// PR184, issue 85 comment 6688988751: immutable LF2 sources -> private native review.
// This prepares files only. It never opens a database, approves or publishes designs.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readDesignFolder} from '../app/workshop/katalog-source.mjs';
import {parseDesignSvg,katalogDesignToTemplate,scaleTemplate,scaleEmbeddedMotifs,katalogFamilyToProduct} from '../app/workshop/katalog-convert.mjs';
import {validateFamily} from '../app/workshop/product-families.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';
import {assessDesignTarget} from '../app/workshop/design-target-rules.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {BATCH_MATERIALS,batchHash as hash,assertBatchManifest,supplierDesignBlockers,reusedBatchTarget,chunkNativeEntries,nativeBatchProductKey,verifyDeliveredTextFit,batchVisualIssues} from './lib/design-batch-plan.mjs';

export const DESIGN_BATCH_DELIVERY_COMMIT='86c1ff5f431acfe60d4cff388958112187005550';
export const DESIGN_BATCH_SOURCE_COMMIT='3c6051fbbc7904969948950fae12cae2ae663f30';
export const DESIGN_BATCH_FOLDER='auftraege/2026-11-06-gesamtbestand';
const CODE_ROOT=fileURLToPath(new URL('../',import.meta.url));
const clone=structuredClone;
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const slash=p=>p.replaceAll('\\','/');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function inside(root,relative){
 if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||/^[A-Za-z]:/.test(relative)||relative.includes('\\'))throw Error('Invalid relative package path: '+relative);
 const full=path.resolve(root,relative),rel=path.relative(root,full);
 if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('Path leaves package: '+relative);
 return full;
}
const read=(root,file)=>fs.readFileSync(inside(root,file));
function write(root,file,value){const target=inside(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');}
const git=(root,args,options={})=>execFileSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:16*1024*1024,...options});
function assertSeparateOutput(root,out){
 if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Output must be new or empty.');
 for(const forbidden of [root,CODE_ROOT]){const rel=path.relative(forbidden,out);if(!rel||!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel))throw Error('Output must be outside source and code repositories.');}
}
/** Every supplier index byte and all individual source references are checked.
 * Unlike the historic PR183 README exception, this delivery has no hash bypass. */
export function verifyDesignBatchFiles(root,manifest,index){
 const refs=new Map();
 for(const entry of [...manifest.designs,...manifest.rohlinge])for(const file of entry.dateien||[]){
  const bytes=read(root,file.pfad);
  if(bytes.length!==file.bytes||hash(bytes)!==file.sha256||index[file.pfad]!==file.sha256)throw Error('Source checksum mismatch: '+file.pfad);
  if(refs.has(file.pfad)&&refs.get(file.pfad)!==file.sha256)throw Error('Conflicting source reference: '+file.pfad);
  refs.set(file.pfad,file.sha256);
 }
 for(const source of manifest.designs){
  const files=['design-svg','design-json'].map(role=>source.dateien.find(f=>f.rolle===role));
  if(files.every(Boolean)&&hash(Buffer.concat(files.map(f=>read(root,f.pfad))))!==source.version)throw Error('Source version mismatch: '+source.id);
 }
 for(const [file,digest]of Object.entries(index))if(!/^[a-f0-9]{64}$/.test(digest)||hash(read(root,file))!==digest)throw Error('Delivery checksum mismatch: '+file);
 return {manifestFiles:refs.size,indexFiles:Object.keys(index).length,refs};
}
function verifyPinnedFiles(root,files){
 const unique=[...new Set(files)].sort(),commit=git(root,['rev-parse','HEAD']).trim();
 if(commit!==DESIGN_BATCH_DELIVERY_COMMIT)throw Error('Catalogue checkout is not the pinned PR184 delivery.');
 const blobs=git(root,['cat-file','--batch-check'],{input:unique.map(file=>commit+':'+file).join('\n')+'\n'}).trim().split('\n');
 return unique.map((file,i)=>{const bytes=read(root,file),blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');if(blobs[i]!==blob+' blob '+bytes.length)throw Error('Source differs from pinned Git bytes: '+file);return {file,sha256:hash(bytes),bytes:bytes.length,blob};});
}
function familyFile(id){return 'familien/'+(id==='steel-door-signs'?'edelstahl':'acryl')+'/'+id+'.json';}
function lineFile(id){return 'linien/'+(id==='steel-door-signs'?'edelstahl-tuerschilder':'acryl-tuerschilder')+'.json';}
function safeNativeProduct(family,line,subcategory,size,entries,fonts,key){
 const {document}=katalogFamilyToProduct(family,line,subcategory,{size,fonts,templates:entries});
 // Distinct private groups must also have distinct native binding identities.
 document.config.profile.id='review-'+hash(key).slice(0,24);
 document.config.profile.binding={kind:'local-review',productId:'local-'+document.config.profile.id};
 const used=[...new Set(document.config.profile.designs.flatMap(d=>d.objects.filter(o=>o.type==='text').map(o=>o.font)))];
 document.config.localResources.fonts=Object.fromEntries(used.map(name=>[name,fonts[name]]));
 validateProductDocument(document);
 if(document.config.reviewOnly!==true||document.config.profile.features.orderEnabled!==false||document.config.profile.features.productionConfirmed!==false)throw Error('Native review product became orderable.');
 if(document.config.profile.designs.length!==entries.length||document.config.profile.designs.some(d=>d.id==='start'))throw Error('Unexpected scaffold design.');
 const material=BATCH_MATERIALS[family.id];
 if(document.config.profile.material.kind!==material.kind||family.material.thicknessMm!==document.config.profile.material.thicknessMm)throw Error('Native family material changed.');
 document.config.localResources.fonts={};
 return {document,fontRefs:used};
}
function rowFor(source,manifest,lines,orderStart){
 const label=Object.values(lines).flatMap(line=>line.subcategories).find(s=>s.id===source.hauptthema||s.themeId===source.hauptthema)?.name||source.hauptthema;
 const localOrder=manifest.galerie?.eintraege?.findIndex(e=>e.id===source.id);
 if(!Number.isInteger(localOrder)||localOrder<0)throw Error('Supplier gallery order missing: '+source.id);
 const order=orderStart+localOrder;
 return {id:source.id,name:source.reihenindex?.name||source.id,source:source.pfad,sourceMaster:clone(source.herkunft),sourceVersion:source.version,sourceApproval:clone(source.freigabe||[]),sourceBatch:manifest.stapel.id,process:source.verfahren,photoSlots:source.ebenen?.fotofelder?.length||0,normalized:true,status:'open',reviewOnly:true,released:false,
  files:(source.dateien||[]).filter(f=>['design-svg','design-json'].includes(f.rolle)).map(f=>({name:path.basename(f.pfad),source:f.pfad,sha256:f.sha256,bytes:f.bytes})),fonts:source.schriften.map(f=>f.name),targets:[],reusedTargetRefs:[],reviewMaterial:clone(BATCH_MATERIALS[source.ziele[0]?.familie]||BATCH_MATERIALS['steel-door-signs']),reviewOrder:order,
  reviewCategory:{key:source.hauptthema,label,rank:80,photo:source.mitFoto?'with':'without',topic:source.hauptthema},reviewThemes:source.themen.map(key=>({key,label:Object.values(lines).flatMap(line=>line.subcategories).find(s=>s.id===key||s.themeId===key)?.name||key})),
  sourceIssues:clone(source.offen||[]),sourceFindings:clone(source.befunde||[]),visualReviewIssues:batchVisualIssues(source),sourceTextFit:clone(source.textEinpassung||[]),blockers:supplierDesignBlockers(source)};
}
function addOpen(row,goal,sizeKey,reason){
 row.targets.push({familyId:goal.familie,familyLabel:goal.material,reviewMaterial:clone(BATCH_MATERIALS[goal.familie]),sizeKey,mm:clone(goal.groessenMm[sizeKey]),status:'open',reason,visualReviewIssues:clone(row.visualReviewIssues),reviewOnly:true,released:false});
}
function packageChecksums(root){
 const entries=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else{const bytes=fs.readFileSync(file);entries.push({file:slash(path.relative(root,file)),sha256:hash(bytes),bytes:bytes.length});}}}walk(root);return entries.sort((a,b)=>a.file.localeCompare(b.file));
}

export async function prepareDesignBatchReview({catalogueRoot,outRoot,batchId,existingPack,converter=convertFont,fontCacheDir,maxProducts=100,onProgress=()=>{}}){
 if(!catalogueRoot||!outRoot||!batchId)throw Error('catalogueRoot, outRoot and batchId are required.');
 if(!Number.isInteger(maxProducts)||maxProducts<1||maxProducts>100)throw Error('At most 100 products per package.');
 const root=path.resolve(catalogueRoot),out=path.resolve(outRoot);assertSeparateOutput(root,out);
 if(typeof existingPack==='string')existingPack=json(path.resolve(existingPack));
 if(existingPack&&!['gravuru-design-original-review/v1','gravuru-slate-original-review/v1'].includes(existingPack.schema))throw Error('Unknown base package schema.');
 const folder=DESIGN_BATCH_FOLDER+'/stapel/'+batchId,manifest=assertBatchManifest(json(inside(root,folder+'/manifest.json')),batchId);
 if(manifest.quelle?.commit!==DESIGN_BATCH_SOURCE_COMMIT)throw Error('Unexpected catalogue source commit.');
 const checked=verifyDesignBatchFiles(root,manifest,json(inside(root,folder+'/files-sha256.json')));
 const familyIds=[...new Set(manifest.designs.flatMap(d=>d.ziele.map(g=>g.familie)))];
 const evidence=[folder+'/manifest.json',folder+'/files-sha256.json',DESIGN_BATCH_FOLDER+'/stapel.json',...familyIds.flatMap(id=>[familyFile(id),lineFile(id)]),DESIGN_BATCH_FOLDER+'/schriften-ersatz/ersatz-alle.json'];
 const pinned=verifyPinnedFiles(root,[...checked.refs.keys(),...evidence]);
 const batches=json(inside(root,DESIGN_BATCH_FOLDER+'/stapel.json')).stapel,batchIndex=batches.findIndex(b=>b.id===batchId);
 if(batchIndex<0)throw Error('Batch missing from supplier order.');
 const orderStart=batches.slice(0,batchIndex).reduce((n,b)=>n+b.designs.length,0);
 const families=Object.fromEntries(familyIds.map(id=>[id,validateFamily(json(inside(root,familyFile(id))))])),lines=Object.fromEntries(familyIds.map(id=>[id,json(inside(root,lineFile(id)))]));
 for(const [id,family]of Object.entries(families))if(family.id!==id||family.material.kind!==BATCH_MATERIALS[id].kind||id.startsWith('acryl-3mm')&&family.material.thicknessMm!==3)throw Error('Explicit family material differs: '+id);
 const fontSources=new Map(),fonts={},fontErrors={};
 for(const source of manifest.designs.filter(d=>!supplierDesignBlockers(d).length))for(const font of source.schriften){
  if(!font.datei||!font.sha256){fontErrors[font.name]='Lieferung enthält keine nutzbare Schriftdatei.';continue;}
  if(fontSources.has(font.name)&&fontSources.get(font.name).sha256!==font.sha256)throw Error('Conflicting font bytes: '+font.name);
  fontSources.set(font.name,font);
 }
 for(const [name,source]of fontSources){
  const bytes=read(root,source.datei);if(hash(bytes)!==source.sha256)throw Error('Font source changed: '+name);
  const cache=fontCacheDir?path.join(path.resolve(fontCacheDir),source.sha256+'-'+hash(read(CODE_ROOT,'app/workshop/font-import.py')).slice(0,12)+'.json'):null;
  try{const result=cache&&fs.existsSync(cache)?json(cache):await converter(bytes.toString('base64'));if(!result?.font?.regular?.glyphs)throw Error('Native Glyphendaten fehlen.');fonts[name]=result.font;if(cache&&!fs.existsSync(cache)){fs.mkdirSync(path.dirname(cache),{recursive:true});fs.writeFileSync(cache,JSON.stringify(result));}}
  catch(error){fontErrors[name]=error.message;}
  onProgress({stage:'font',name,available:Boolean(fonts[name])});
 }
 const rows=[],groups=new Map(),nativeFailures=[];
 for(const source of manifest.designs){
  const row=rowFor(source,manifest,lines,orderStart);rows.push(row);
  for(const goal of source.ziele){
   const family=families[goal.familie];let converted,master,conversionError;
   const candidates=[];
   for(const sizeKey of goal.groessen){
    const reused=reusedBatchTarget(source,goal,sizeKey,existingPack);
    if(reused){row.reusedTargetRefs.push(reused);continue;}
    if(row.blockers.length){addOpen(row,goal,sizeKey,row.blockers.join(' · '));continue;}
    candidates.push(sizeKey);
   }
   if(!candidates.length)continue;
   try{
    master=readDesignFolder(inside(root,source.pfad));if(master.id!==source.id)throw Error('Original-ID stimmt nicht mit design.json überein.');
    const svg=master.svg(),parsed=parseDesignSvg(svg);
    if(parsed.notes.length)throw Error('Nicht vollständig native übertragbare Ebenen: '+parsed.notes.join(' · '));
    row.verifiedTextFit=verifyDeliveredTextFit(source,master,parsed);
    for(const layer of parsed.layers.filter(l=>l.kind==='text'))if(!fonts[layer.font])throw Error('Schrift '+layer.font+': '+(fontErrors[layer.font]||'nicht in den gelieferten Schriftressourcen.'));
    converted=katalogDesignToTemplate({...master,json:{...clone(master.json),movable:true},movable:true,released:false},family,null,{fonts,svgText:svg});
    if(converted.photoAssets.length||converted.template.objects.some(o=>o.type==='photoSlot'))throw Error('Fotoressourcen müssen vor nativer Vorbereitung vollständig angebunden werden.');
    if(converted.template.objects.filter(o=>o.type==='text').length!==parsed.layers.filter(l=>l.kind==='text').length)throw Error('Text-Layer wurden nicht vollständig übernommen.');
    converted.template.katalog={...converted.template.katalog,originalId:source.id,originalSource:source.pfad,sourceSvgSha256:source.dateien.find(f=>f.rolle==='design-svg')?.sha256,sourceVersion:source.version,textFit:row.verifiedTextFit,target:{familyId:family.id,explicit:true,released:false}};
   }catch(error){conversionError=error.message;}
   for(const sizeKey of candidates){
    try{
     if(conversionError)throw Error(conversionError);
     const size=family.sizes.find(s=>s.key===sizeKey),blank=manifest.rohlinge.find(b=>b.familie===family.id&&b.key===sizeKey),mm=goal.groessenMm[sizeKey];
     if(!size||!blank||!equal([size.widthMm,size.heightMm],mm)||!equal(blank.mm,mm)||blank.dickeMm!==family.material.thicknessMm)throw Error('Explizites Zielmaß/Rohling/Familie stimmen nicht überein.');
     if(goal.renderer?.some(r=>r.groesse===sizeKey&&['passt nicht','fehler'].includes(r.status)))throw Error('Lieferung meldet dieses Rendererziel als offen.');
     const template=scaleTemplate(converted.template,master.plateMm,mm,fonts,{contain:true}),motifs=scaleEmbeddedMotifs(converted.motifs,template.katalog.scale),fit=assessDesignTarget({master,template,family,size,fonts,motifs});
     if(fit.status==='passt nicht')throw Error('Native Einpassung: '+fit.issues.join(' · '));
     const target={sizeKey,mm:clone(mm),familyId:family.id,familyLabel:goal.material,reviewMaterial:clone(BATCH_MATERIALS[family.id]),nativeDesignId:template.id,status:'prepared',reviewOnly:true,released:false,visualReviewIssues:clone(row.visualReviewIssues),scale:template.katalog.scale,offsetMm:template.katalog.offsetMm,fit:{status:fit.status,issues:fit.issues}};
     row.targets.push(target);
     const groupKey=family.id+'|'+sizeKey;if(!groups.has(groupKey))groups.set(groupKey,{family,line:lines[family.id],size,entries:[]});
     groups.get(groupKey).entries.push({originalId:source.id,template,motifs,rights:converted.rights,target,row});
    }catch(error){addOpen(row,goal,sizeKey,error.message);nativeFailures.push({id:source.id,familyId:family.id,sizeKey,reason:error.message});}
   }
  }
  onProgress({stage:'design',id:source.id,prepared:row.targets.filter(t=>t.status==='prepared').length,reused:row.reusedTargetRefs.length});
 }
 const products=[];
 for(const group of groups.values()){
  // The supplier subcategory stays in gallery metadata. Existing source carrier
  // options/prices are used unchanged; absent acrylic taxonomy uses its neutral carrier.
  const subcategory=group.line.subcategories.find(s=>s.id===manifest.stapel.hauptthema)||group.line.subcategories.find(s=>s.id==='namensschilder');
  if(!subcategory)throw Error('Source review carrier is missing.');
  const chunks=chunkNativeEntries(group.entries);
  for(let i=0;i<chunks.length;i++){
   const entries=chunks[i],key=nativeBatchProductKey(batchId,group.family.id,group.size.key,i+1);
   if(existingPack?.products?.some(p=>p.key===key))throw Error('New group collides with an existing product key: '+key);
   try{
    const payload=safeNativeProduct(group.family,group.line,subcategory,group.size,entries,fonts,key);
    entries.forEach(e=>e.target.productKey=key);
    products.push({descriptor:{key,productId:'cfg_package-'+hash(key).slice(0,24),file:'products/'+hash(key).slice(0,24)+'.json',documentHash:hash(JSON.stringify(payload.document)),designIds:entries.map(e=>e.originalId),defaultDesignId:payload.document.config.profile.defaultDesignId,reviewOnly:true,familyId:group.family.id,sizeKey:group.size.key},payload});
    if(products.length%10===0)onProgress({stage:'products',prepared:products.length,familyId:group.family.id,sizeKey:group.size.key});
   }catch(error){for(const e of entries){e.target.status='open';e.target.reason=error.message;delete e.target.productKey;nativeFailures.push({id:e.originalId,familyId:group.family.id,sizeKey:group.size.key,reason:error.message});}}
  }
 }
 rows.forEach(row=>{row.status=row.targets.some(t=>t.status==='prepared')||row.reusedTargetRefs.length?'prepared':'open';});
 const parts=[],partCount=Math.max(1,Math.ceil(products.length/maxProducts));
 const report={schema:'gravuru-design-batch-preparation/v1',batchId,catalogueCommit:DESIGN_BATCH_SOURCE_COMMIT,deliveryCommit:DESIGN_BATCH_DELIVERY_COMMIT,reviewOnly:true,released:false,validation:{manifestFiles:checked.manifestFiles,indexFiles:checked.indexFiles},pinnedFiles:pinned,fontErrors,nativeFailures,masterReferences:clone(manifest.verweiseAufMaster),sourceIssues:clone(manifest.offen),counts:{originals:rows.length,preparedDesigns:rows.filter(r=>r.status==='prepared').length,openDesigns:rows.filter(r=>r.status==='open').length,preparedTargets:rows.reduce((n,r)=>n+r.targets.filter(t=>t.status==='prepared').length,0),openTargets:rows.reduce((n,r)=>n+r.targets.filter(t=>t.status==='open').length,0),reusedTargets:rows.reduce((n,r)=>n+r.reusedTargetRefs.length,0),reviewProducts:products.length,packages:partCount}};
 for(let i=0;i<partCount;i++){
  const name='part-'+String(i+1).padStart(3,'0'),dest=path.join(out,name),selected=products.slice(i*maxProducts,(i+1)*maxProducts),keys=new Set(selected.map(p=>p.descriptor.key));
  const originals=rows.map(row=>({...clone(row),targets:row.targets.filter(t=>t.status==='prepared'?keys.has(t.productKey):i===0),reusedTargetRefs:i===0?clone(row.reusedTargetRefs):[]})).filter(row=>row.targets.length||row.reusedTargetRefs.length||i===0&&!rows.find(r=>r.id===row.id).targets.length);
  const pack={schema:'gravuru-design-original-review/v1',catalogueCommit:DESIGN_BATCH_SOURCE_COMMIT,deliveryCommit:DESIGN_BATCH_DELIVERY_COMMIT,reviewOnly:true,released:false,batchId,part:i+1,parts:partCount,products:selected.map(p=>p.descriptor),originals,assets:[],fontFiles:{},blanks:[]};
  const neededFonts=new Set(selected.flatMap(p=>p.payload.fontRefs));
  for(const n of neededFonts){const file='fonts/'+hash(n).slice(0,16)+'.json';pack.fontFiles[n]=file;write(dest,file,fonts[n]);}
  for(const p of selected)write(dest,p.descriptor.file,p.payload);
  for(const row of originals)for(const f of row.files)write(dest,'originals/'+row.id+'/'+f.name,read(root,f.source));
  // Blank profiles remain a separate gallery list, never native design templates.
  if(i===0)for(const blank of manifest.rohlinge){
   const prior=existingPack?.blanks?.find(b=>b.key===blank.key&&b.familyId===blank.familie);
   if(prior){if(!equal(prior.mm,blank.mm))throw Error('Existing blank geometry conflicts: '+blank.key);continue;}
   const previewFile=blank.dateien.find(f=>f.rolle==='rohling-webp');if(!previewFile)continue;
   const preview='originals/_blanks/'+blank.key+'.webp',material=BATCH_MATERIALS[blank.familie];if(!material)continue;
   const family=families[blank.familie],size=family?.sizes.find(s=>s.key===blank.key);if(!size)continue;
   write(dest,preview,read(root,previewFile.pfad));pack.blanks.push({key:blank.key,materialKey:material.key,materialLabel:material.label,familyId:blank.familie,sizeKey:blank.key,form:family.groups.find(g=>g.key===size.groupKey)?.name||blank.form,label:size.label,mm:clone(blank.mm),preview,sha256:previewFile.sha256,source:blank.dateien.find(f=>f.rolle==='rohling-svg')?.pfad,sourceVersion:blank.version,reviewOnly:true,released:false});
  }
  for(const file of [...new Set(evidence)])write(dest,'evidence/'+file,read(root,file));
  pack.counts={originals:originals.length,preparedDesigns:originals.filter(r=>r.status==='prepared').length,openDesigns:originals.filter(r=>r.status==='open').length,preparedTargets:originals.reduce((n,r)=>n+r.targets.filter(t=>t.status==='prepared').length,0),reviewProducts:pack.products.length,blanks:pack.blanks.length};
  pack.sources={provenance:'preparation-report.json',deliveryManifest:'evidence/'+folder+'/manifest.json'};
  write(dest,'preparation-report.json',report);write(dest,'manifest.json',pack);write(dest,'files-sha256.json',packageChecksums(dest));
  parts.push({path:name,manifest:name+'/manifest.json',counts:pack.counts});
 }
 const index={schema:'gravuru-design-review-batch-set/v1',...report.counts,batchId,reviewOnly:true,released:false,parts};write(out,'preparation-report.json',report);write(out,'batch-index.json',index);
 onProgress({stage:'complete',out,counts:report.counts});return {out,index,report,parts};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i++){const key={'--katalog':'catalogueRoot','--out':'outRoot','--batch':'batchId','--base':'existingPack','--font-cache':'fontCacheDir'}[args[i]];if(!key)throw Error('Unknown option: '+args[i]);opts[key]=args[++i];}
 await prepareDesignBatchReview({...opts,onProgress:e=>console.log(JSON.stringify(e))});
}
