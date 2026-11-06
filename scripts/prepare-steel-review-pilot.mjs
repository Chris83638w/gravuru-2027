// PR183: immutable catalogue originals -> isolated native review package. No DB writes.
// Rules: source design.json sizes/family geometry; source fonts/replacements only;
// targetDesignPreview's proportional-contain transform; current review is unreleased.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readDesignFolder} from '../app/workshop/katalog-source.mjs';
import {katalogDesignToTemplate,scaleTemplate,scaleEmbeddedMotifs,katalogFamilyToProduct} from '../app/workshop/katalog-convert.mjs';
import {validateFamily} from '../app/workshop/product-families.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';
import {assessDesignTarget} from '../app/workshop/design-target-rules.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';

export const STEEL_PILOT_SOURCE_COMMIT='3c6051fbbc7904969948950fae12cae2ae663f30';
export const STEEL_PILOT_DELIVERY_COMMIT='5e0c3f151bbbb9cdae08e0562561014f727b40fe';
export const STEEL_PILOT_FOLDER='auftraege/2026-11-06-gesamtuebergabe-designs-rohlinge';
const FAMILY_FILE='familien/edelstahl/steel-door-signs.json';
const LINE_FILE='linien/edelstahl-tuerschilder.json';
const REPLACEMENTS_FILE='schriften/ersatz-tuerschilder.json';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const clone=value=>structuredClone(value);
const sorted=value=>[...value].sort();
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const slash=p=>p.replaceAll('\\','/');
function inside(root,relative){
 if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||/^[A-Za-z]:/.test(relative))throw Error('Invalid relative path: '+relative);
 const full=path.resolve(root,relative),rel=path.relative(root,full);
 if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('Path leaves package: '+relative);
 return full;
}
function write(root,relative,value){const file=inside(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');}
function read(root,relative){return fs.readFileSync(inside(root,relative));}
const git=(root,args,options={})=>execFileSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:8*1024*1024,...options});

/** Data checks are strict. Only the independently verified stale PR183 README hash
 * is a reported documentation defect; no asset/manifest/version exception exists. */
export function verifySteelPilotFiles(root,manifest,index){
 const refs=new Map(),warnings=[];
 for(const entry of [...manifest.designs,...manifest.rohlinge]){
  if(!entry.dateien?.length)throw Error('No source files: '+(entry.id||entry.key));
  for(const file of entry.dateien){
   const bytes=read(root,file.pfad);
   if(bytes.length!==file.bytes||hash(bytes)!==file.sha256)throw Error('Manifest checksum mismatch: '+file.pfad);
   if(refs.has(file.pfad)&&!equal(refs.get(file.pfad),{sha256:file.sha256,bytes:file.bytes}))throw Error('Conflicting source reference: '+file.pfad);
   refs.set(file.pfad,{sha256:file.sha256,bytes:file.bytes});
   if(index[file.pfad]!==file.sha256)throw Error('Checksum index differs from manifest: '+file.pfad);
  }
  const roles=entry.id?['design-svg','design-json']:['rohling-svg','rohling-png'];
  const bytes=roles.map(role=>{const f=entry.dateien.find(f=>f.rolle===role);if(!f)throw Error('Missing '+role);return read(root,f.pfad);});
  if(hash(Buffer.concat(bytes))!==entry.version)throw Error('Source version mismatch: '+(entry.id||entry.key));
 }
 for(const [file,expected]of Object.entries(index)){
  const actual=hash(read(root,file));
  if(actual===expected)continue;
  if(file===STEEL_PILOT_FOLDER+'/README.md'&&expected==='b2ae0283c41682c3ed4bf2acb54274d81b523b2c02f3a4b1f2da032571748722'&&actual==='68281a082b33a046c0a6736aabc57a07a75101722119328c8ef1fa251179d5c5'){
   warnings.push({code:'delivery-readme-checksum-stale',file,expected,actual,message:'PR183 README changed after its checksum index; all data manifest references verified separately.'});
  }else throw Error('Delivery checksum mismatch: '+file);
 }
 return {manifestFiles:refs.size,indexFiles:Object.keys(index).length,verifiedIndexFiles:Object.keys(index).length-warnings.length,warnings,refs};
}

function verifyProvenance(root,manifest,refs){
 const head=git(root,['rev-parse','HEAD']).trim();
 if(head!==STEEL_PILOT_DELIVERY_COMMIT||manifest.quelle?.commit!==STEEL_PILOT_SOURCE_COMMIT)throw Error('The pilot source/delivery commit differs from the reviewed PR183.');
 const deliveryFiles=['manifest.json','files-sha256.json','pruefung/pruefbericht.json'].map(p=>STEEL_PILOT_FOLDER+'/'+p);
 const deliveryBlobs=git(root,['cat-file','--batch-check'],{input:deliveryFiles.map(p=>head+':'+p).join('\n')+'\n'}).trim().split('\n');
 for(let i=0;i<deliveryFiles.length;i++){
  const bytes=read(root,deliveryFiles[i]),blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(deliveryBlobs[i]!==blob+' blob '+bytes.length)throw Error('Delivery metadata differs from the pinned commit: '+deliveryFiles[i]);
 }
 const paths=[...refs.keys()].filter(p=>!p.startsWith(STEEL_PILOT_FOLDER+'/')).concat(FAMILY_FILE,LINE_FILE,REPLACEMENTS_FILE);
 const commits=[STEEL_PILOT_SOURCE_COMMIT,manifest.galerie.stand.katalog_HEAD,head];
 const lines=git(root,['cat-file','--batch-check'],{input:paths.flatMap(p=>commits.map(c=>c+':'+p)).join('\n')+'\n'}).trim().split('\n');
 const sources=[];
 for(let i=0;i<paths.length;i++){
  const entries=lines.slice(i*3,i*3+3);
  if(entries.some(s=>!/^\w{40} blob \d+$/.test(s)||s!==entries[0]))throw Error('Unpinned source content: '+paths[i]);
  const bytes=read(root,paths[i]);
  const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(blob!==entries[0].split(' ')[0])throw Error('Working source differs from its Git blob (check core.autocrlf): '+paths[i]);
  sources.push({file:paths[i],blob,sha256:hash(bytes),bytes:bytes.length});
 }
 return {catalogueCommit:STEEL_PILOT_SOURCE_COMMIT,deliveryCommit:head,intermediateCommit:commits[1],sourceFiles:sources};
}

function outputIsSeparate(root,out){
 if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Output must be new or empty.');
 for(const forbidden of [root,ROOT]){const rel=path.relative(forbidden,out);if(!rel||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel)))throw Error('Output must be outside source and code repositories.');}
}

export async function prepareSteelReviewPilot({catalogueRoot,outRoot,converter=convertFont,onProgress=()=>{}}){
 if(!catalogueRoot||!outRoot)throw Error('catalogueRoot and outRoot are required.');
 const root=path.resolve(catalogueRoot),out=path.resolve(outRoot);outputIsSeparate(root,out);
 const manifest=json(inside(root,STEEL_PILOT_FOLDER+'/manifest.json'));
 if(manifest.schema!=='gravuru-gesamtuebergabe/v1'||manifest.designs.length!==28||manifest.rohlinge.length!==73)throw Error('Unexpected pilot scope.');
 const checked=verifySteelPilotFiles(root,manifest,json(inside(root,STEEL_PILOT_FOLDER+'/files-sha256.json')));
 if(checked.manifestFiles!==500)throw Error('Unexpected source file count.');
 const provenance=verifyProvenance(root,manifest,checked.refs);
 const family=validateFamily(json(inside(root,FAMILY_FILE))),line=json(inside(root,LINE_FILE));
 const replacements=json(inside(root,REPLACEMENTS_FILE));
 if(family.id!=='steel-door-signs'||family.material.kind!=='steel'||line.id!=='edelstahl-tuerschilder')throw Error('Wrong material/family/line.');
 // A review product groups original templates by size, not a new shop taxonomy.
 // The existing catalogue subcategory supplies the native family-product adapter.
 const subcategory=line.subcategories.find(s=>s.id==='namensschilder');
 if(!subcategory||Object.keys(subcategory.priceOverrides||{}).length)throw Error('Review carrier category is missing or changes source prices.');
 const sizes=new Map(family.sizes.map(s=>[s.key,s])),blankKeys=new Set(manifest.rohlinge.map(b=>b.key));
 const ids=new Set(manifest.designs.map(d=>d.id));
 if(ids.size!==28||blankKeys.size!==73)throw Error('Duplicate pilot identities.');
 const fonts={},fontSources=new Map();
 for(const d of manifest.designs)for(const f of d.schriften){
  if(f.ersatzFuer&&replacements[f.ersatzFuer]!==f.name)throw Error('Undocumented replacement: '+f.ersatzFuer);
  if(fontSources.has(f.name)&&fontSources.get(f.name).sha256!==f.sha256)throw Error('Conflicting source font: '+f.name);
  fontSources.set(f.name,f);
 }
 for(const [name,f]of fontSources){
  const bytes=read(root,f.datei);if(hash(bytes)!==f.sha256)throw Error('Font source changed: '+name);
  const result=await converter(bytes.toString('base64'));
  if(!result?.font?.regular?.glyphs)throw Error('Native glyph conversion failed: '+name);
  fonts[name]=result.font;
 }
 onProgress({stage:'verified',designs:28,sourceFiles:checked.manifestFiles,fonts:Object.keys(fonts).length});
 const pack={schema:'gravuru-design-original-review/v1',...Object.fromEntries(['catalogueCommit','deliveryCommit'].map(k=>[k,provenance[k]])),reviewOnly:true,released:false,products:[],assets:[],fontFiles:{},originals:[],blanks:[]};
 const report={schema:'gravuru-steel-pilot-preparation/v1',...provenance,reviewOnly:true,released:false,validation:{manifestFiles:checked.manifestFiles,indexFiles:checked.indexFiles,verifiedIndexFiles:checked.verifiedIndexFiles},deliveryWarnings:checked.warnings,sourceIssues:manifest.offen,sourceGalleryIssues:manifest.galerie.offen,sourceReviewCarrier:{line:line.id,subcategory:subcategory.id},transform:'targetDesignPreview: scaleTemplate contain=true; no text replacement/reflow or motif distortion',originals:[],counts:null};
 const groups=new Map();
 for(const source of manifest.designs){
  if(source.material!=='Edelstahl'||source.verfahren!=='Gravur'||source.mitFoto!==false)throw Error('Unexpected pilot material/process/photo: '+source.id);
  const master=readDesignFolder(inside(root,source.pfad));
  if(master.id!==source.id||!equal(sorted(master.json.sizes),sorted(source.format.groessen))||!equal(sorted(source.rohlinge),sorted(source.format.groessen)))throw Error('Source target/identity mismatch: '+source.id);
  const sourceApproval=clone(master.json.ziele||[]);
  const adapter={...master,json:{...clone(master.json),movable:true},movable:true,released:false};
  const converted=katalogDesignToTemplate(adapter,family,null,{fonts});
  if(converted.template.objects.some(o=>o.type==='photoSlot'))throw Error('Unexpected pilot photo layer.');
  converted.template.katalog={...converted.template.katalog,originalId:source.id,originalSource:source.pfad,sourceSvgSha256:source.dateien.find(f=>f.rolle==='design-svg').sha256,target:{familyId:family.id,explicit:true,released:false}};
  const files=source.dateien.filter(f=>['design-svg','design-json'].includes(f.rolle)).map(f=>({name:path.basename(f.pfad),sha256:f.sha256,bytes:f.bytes,source:f.pfad}));
  const row={id:source.id,name:master.name,source:source.pfad,sourceMaster:clone(source.herkunft),sourceApproval,sourceVersion:source.version,process:'Gravur',photoSlots:0,normalized:true,status:'prepared',reviewOnly:true,released:false,files,fonts:[...converted.fonts],targets:[],reviewMaterial:{key:'steel',label:'Edelstahl',kind:'steel'},reviewCategory:{key:'tuerschilder-ohne-foto',label:'Türschilder ohne Foto',rank:80,photo:'without',topic:'tuerschilder'},reviewThemes:source.themen.map(key=>({key,label:line.subcategories.find(s=>s.themeId===key)?.name||key})),sourceIssues:[...source.offen],visualReviewIssues:[]};
  for(const issue of manifest.galerie.offen.filter(i=>i.id===source.id&&i.grund==='kleinsteGroesse ist nicht die kleinste Flaeche'))row.visualReviewIssues.push({code:'smallest-b02s-evidence-missing',message:'Die zusätzliche B02S-Prüfansicht wurde für '+issue.pilot+' geliefert; für die kleinste Größe '+issue.flaechenMinimum+' fehlt diese Lieferprobe.'});
  for(const sizeKey of source.format.groessen){
   const size=sizes.get(sizeKey),blank=manifest.rohlinge.find(b=>b.key===sizeKey);
   if(!size||!blank||!equal(blank.mm,[size.widthMm,size.heightMm])||blank.groupKey!==size.groupKey)throw Error('Undefined or mismatched source format: '+sizeKey);
   const mm=[size.widthMm,size.heightMm],template=scaleTemplate(converted.template,master.plateMm,mm,fonts,{contain:true}),motifs=scaleEmbeddedMotifs(converted.motifs,template.katalog.scale);
   const fit=assessDesignTarget({master,template,family,size,fonts,motifs});
   if(fit.status==='passt nicht')throw Error('Native target does not fit '+source.id+' / '+sizeKey+': '+fit.issues.join('; '));
   const productKey=family.id+':'+sizeKey;
   row.targets.push({sizeKey,mm,status:'prepared',nativeDesignId:template.id,productKey,reviewOnly:true,released:false,scale:template.katalog.scale,offsetMm:template.katalog.offsetMm,fit:{status:fit.status,issues:fit.issues}});
   if(!groups.has(sizeKey))groups.set(sizeKey,{size,entries:[]});
   groups.get(sizeKey).entries.push({originalId:source.id,template,motifs,rights:converted.rights});
  }
  pack.originals.push(row);report.originals.push({id:row.id,targets:row.targets,sourceIssues:row.sourceIssues,visualReviewIssues:row.visualReviewIssues});
 }
 if(groups.size!==73||pack.originals.reduce((n,r)=>n+r.targets.length,0)!==146)throw Error('Pilot target count changed.');
 // Build/validate everything before writing a package; the final manifest is the completion marker.
 const outputs=[];
 for(const {size,entries}of groups.values()){
  const {document}=katalogFamilyToProduct(family,line,subcategory,{size,fonts,templates:entries});
  const used=new Set(document.config.profile.designs.flatMap(d=>d.objects.filter(o=>o.type==='text').map(o=>o.font)));
  document.config.localResources.fonts=Object.fromEntries([...used].map(name=>[name,fonts[name]]));
  if(document.config.profile.designs.length!==entries.length||document.config.profile.designs.some(d=>d.id==='start'))throw Error('Unexpected default design.');
  validateProductDocument(document);
  if(document.config.reviewOnly!==true||document.config.profile.features.orderEnabled!==false||document.config.profile.features.productionConfirmed!==false)throw Error('Review package became orderable.');
  const surface=document.config.materialSurface;
  if(!surface?.startsWith('data:image/png;base64,'))throw Error('Steel preview surface must be embedded.');
  const surfaceHash=hash(Buffer.from(surface.split(',')[1],'base64'));
  if(report.materialSurface&&report.materialSurface.sha256!==surfaceHash)throw Error('Inconsistent steel surface.');
  report.materialSurface={sha256:surfaceHash,source:'app/designs/aosu-labrador/runtime/images/gravuru-edelstahl-feine-maserung-vorschau.png',role:'native neutral steel preview texture; catalogue blank geometry is separate'};
  const fontRefs=[...used];document.config.localResources.fonts={};
  const file='products/'+size.key+'.json';outputs.push({file,value:{document,fontRefs}});
  pack.products.push({key:family.id+':'+size.key,productId:'cfg_package-steel-'+hash(size.key).slice(0,20),file,documentHash:hash(JSON.stringify(document)),designIds:entries.map(e=>e.originalId),defaultDesignId:document.config.profile.defaultDesignId,reviewOnly:true});
 }
 for(const blank of manifest.rohlinge){
  const size=sizes.get(blank.key),preview='originals/_blanks/'+blank.key+'.webp';
  outputs.push({file:preview,value:read(root,blank.webp)});
  pack.blanks.push({key:blank.key,materialKey:'steel',materialLabel:'Edelstahl',familyId:family.id,sizeKey:blank.key,form:family.groups.find(g=>g.key===size.groupKey).name,label:size.label,mm:[...blank.mm],preview,sha256:hash(read(root,blank.webp)),source:blank.svg,sourceVersion:blank.version,reviewOnly:true,released:false});
 }
 for(const row of pack.originals)for(const f of row.files)outputs.push({file:'originals/'+row.id+'/'+f.name,value:read(root,f.source)});
 for(const [name,font]of Object.entries(fonts)){const file='fonts/'+name+'.json';pack.fontFiles[name]=file;outputs.push({file,value:font});}
 for(const file of [FAMILY_FILE,LINE_FILE,REPLACEMENTS_FILE,STEEL_PILOT_FOLDER+'/manifest.json',STEEL_PILOT_FOLDER+'/pruefung/pruefbericht.json'])outputs.push({file:'evidence/'+file,value:read(root,file)});
 report.nativeCode=['app/workshop/katalog-convert.mjs','app/workshop/design-target-preview.mjs','app/workshop/design-target-rules.mjs','app/workshop/product-families.mjs','app/workshop/specimen-product.mjs','app/workshop/font-import.py'].map(file=>({file,sha256:hash(read(ROOT,file))}));
 pack.counts=report.counts={originals:28,engraving:28,uv:0,preparedDesigns:28,preparedTargets:146,openDesigns:0,reviewProducts:73,blanks:73};
 pack.sources={provenance:'preparation-report.json',deliveryManifest:'evidence/'+STEEL_PILOT_FOLDER+'/manifest.json',sourceFileCount:checked.manifestFiles,sourceIssues:manifest.offen.length,deliveryWarningCount:checked.warnings.length};
 for(const entry of outputs)write(out,entry.file,entry.value);
 write(out,'preparation-report.json',report);
 write(out,'START-HIER.md','# Edelstahl-Pilot zur Prüfung\n\n28 Originaldesigns, 146 native Größenfassungen und 73 separate Rohlinge. Neue Galerie-Freigaben bleiben offen. Texte und Motive sind einzeln bearbeitbar; Quellen und Sidecars bleiben bytegleich. Keine Datenbank, kein Shop-Import, keine Live- oder Fertigungsfreigabe.\n\nQuellencommit '+pack.catalogueCommit+'; Lieferung '+pack.deliveryCommit+'. Alle 500 Datenreferenzen und 101 Quellversionen geprüft. Der bekannte veraltete README-Hash und die zwei fehlenden kleinsten B02S-Lieferproben stehen im Prüfbericht. Geometrie und Preise stammen aus dem Familienprofil; die Materialfläche ist die eingebettete neutrale native Edelstahlvorschau.\n');
 write(out,'manifest.json',pack);
 const checksums=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else{const bytes=fs.readFileSync(file);checksums.push({file:slash(path.relative(out,file)),sha256:hash(bytes),bytes:bytes.length});}}}walk(out);
 write(out,'files-sha256.json',checksums);
 onProgress({stage:'complete',out,counts:pack.counts,fonts:Object.keys(fonts).length});
 return {out,manifest:pack,report};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),opts={};
 for(let i=0;i<args.length;i++){if(args[i]==='--katalog')opts.catalogueRoot=args[++i];else if(args[i]==='--out')opts.outRoot=args[++i];else throw Error('Unknown option: '+args[i]);}
 await prepareSteelReviewPilot({...opts,onProgress:entry=>console.log(JSON.stringify(entry))});
}
