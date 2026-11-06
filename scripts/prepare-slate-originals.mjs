// Chris 05.11.2026: prepare all 22x14/30x20 Neue-Struktur originals unchanged;
// documented font replacements explicitly approved in the same chat.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {openKatalog,readDesignFolder} from '../app/workshop/katalog-source.mjs';
import {katalogDesignToTemplate,parseDesignSvg,scaleTemplate,scaleEmbeddedMotifs} from '../app/workshop/katalog-convert.mjs';
import {prepareKatalogPhotoAssets} from '../app/workshop/katalog-photo-assets.mjs';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {slateCatalogueProduct} from '../app/workshop/slate-catalog-product.mjs';
import {makeProductDocument,validateProductDocument} from '../app/workshop/product-model.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {originalPreview} from './lib/slate-original-preview.mjs';
import {assessDesignTarget} from '../app/workshop/design-target-rules.mjs';
import {galleryOrder} from '../app/configurator/variant-m/design-gallery-model.mjs';
import {customerLayoutIssue} from '../app/configurator/variant-m/contract.mjs';
import {correctSlateProcesses} from './lib/slate-process-corrections.mjs';
import {slateExtensionTargetSizes} from './lib/slate-review-catalog-inventory.mjs';
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
for(const k of ['--katalog','--out'])if(!args.includes(k))throw Error(k+' required');
const root=path.resolve(get('--katalog')),out=path.resolve(get('--out'));
const catalogueExtension=args.includes('--catalog-extension');
const catalogueAssetsRoot=catalogueExtension?path.join(out,'catalogue-assets'):root;
if(catalogueExtension&&['workshop.sqlite','design-assets.sqlite'].some(f=>fs.existsSync(path.join(out,f))))throw Error('Extension preparation requires a new output database.');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const write=(p,x)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');};
const katalog=openKatalog(root),family=katalog.families.get('schiefer-tafeln-natur');
if(!family)throw Error('Natural slate family missing');
const inventoryRows=read(path.join(out,'source-inventory.json'));
if(catalogueExtension&&inventoryRows.some(r=>r.catalogueExtension!==true||!/^designs\/bestand\/(tuerschilder|hausnummern)\//.test(r.source)))throw Error('Extension mode requires explicit slate door/house originals.');
const processPlan=read(new URL('./data/slate-process-corrections-20261106.json',import.meta.url));
const sourceRows=correctSlateProcesses(inventoryRows,catalogueExtension?{...processPlan,designs:Object.fromEntries(Object.entries(processPlan.designs).filter(([id])=>inventoryRows.some(r=>r.id===id)))}:processPlan);
const assets=createDesignAssetStore({filename:path.join(out,'design-assets.sqlite')});
const repository=createProductRepository({filename:path.join(out,'workshop.sqlite'),validateDocument:validateProductDocument});
const fontResources={},groups=new Map();
const report={schema:'gravuru-slate-original-preparation/v1',catalogueCommit:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),source:'designs/bestand/gedenktafeln',scopeMm:[[220,140],[300,200]],fontReplacementApproval:'Chris, this chat, 2026-11-05: Dokumentierte Ersatzschriften verwenden',originals:[],products:[],shopifyWrites:0,published:false};
if(catalogueExtension){
 const source=read(path.join(out,'extension-source.json'));
 if(source.catalogueCommit!==report.catalogueCommit)throw Error('Extension catalogue commit differs from pinned sources.');
 report.source='designs/bestand/{tuerschilder,hausnummern}';report.catalogueExtension=true;report.exactFormatOnly=true;
 report.scopeMm=[...new Map(sourceRows.filter(r=>r.normalized).map(r=>[JSON.stringify(r.sourcePlateMm),r.sourcePlateMm])).values()];
}
if(args.includes('--reuse-fonts-from')){
 const previous=path.resolve(get('--reuse-fonts-from'));
 if(read(path.join(previous,'preparation-report.json')).catalogueCommit!==report.catalogueCommit)throw Error('Font cache belongs to another catalogue commit');
 for(const f of fs.readdirSync(path.join(previous,'fonts')).filter(f=>f.endsWith('.json')))fontResources[f.slice(0,-5)]=read(path.join(previous,'fonts',f));
}
try{
 for(const row of sourceRows){
  const r={...row,targets:[]};report.originals.push(r);
  if(!row.normalized)continue;
  try{
   const folder=path.join(out,'native-source',row.id),design=readDesignFolder(folder),svg=design.svg();
   const parsed=parseDesignSvg(svg),names=[...new Set(parsed.layers.filter(l=>l.kind==='text').map(l=>l.font))];
   const resources=await katalog.fontResources(names,{available:fontResources,converter:convertFont});
   if(resources.missing.length)throw Error('Original or documented replacement font missing: '+resources.missing.join(', '));
   Object.assign(fontResources,resources.fonts);
   const converted=await prepareKatalogPhotoAssets(katalogDesignToTemplate(design,family,katalog.theme(design.themes?.[0]),{fonts:resources.fonts,svgText:svg}),design,{assets});
   // Conservative Bezier control-point boxes can extend beyond the visible ink.
   // Use the source adapter's exact painted bounds for both object and viewBox;
   // changing both together leaves every path at its original plate coordinate.
   for(const o of converted.template.objects.filter(o=>o.type==='motif')){
    const b=design.json.nativeVectorBounds?.[o.id],m=converted.motifs.find(m=>m.key===o.motif);
    if(b&&m&&b[2]>0&&b[3]>0){m.bounds=[...b];Object.assign(o,{x:b[0]+b[2]/2,y:b[1]+b[3]/2,w:b[2],h:b[3]});}
   }
   // Keep source identity independent of display size, so the two sizes form a pair.
   converted.template.katalog={...converted.template.katalog,prio:1,originalId:row.id,originalSource:row.source,sourceSvgSha256:hash(fs.readFileSync(path.join(out,'originals',row.id,'design.svg'))),target:{familyId:family.id,explicit:true,released:false}};
   r.fonts=names;r.photoSlots=converted.template.objects.filter(o=>o.type==='photoSlot').length;
   if(design.json.katalog?.kategorie?.foto==='ja'&&!r.photoSlots)r.sourceIssue='Katalog kennzeichnet mit Foto, enthält aber keinen Original-Fotobereich. Keine Position oder Maske erfunden.';
   const targetSizes=catalogueExtension?slateExtensionTargetSizes(row,family):family.sizes.filter(s=>s.groupKey==='RE'&&[[220,140],[300,200]].some(mm=>mm[0]===s.widthMm&&mm[1]===s.heightMm));
   if(catalogueExtension&&!targetSizes.length)throw Error('No exact catalogue format for original dimensions.');
   for(const size of targetSizes){
    const target={sizeKey:size.key,mm:[size.widthMm,size.heightMm]};r.targets.push(target);
    try{
     const t=scaleTemplate(converted.template,design.plateMm,target.mm,resources.fonts,{contain:true});
     const motifs=scaleEmbeddedMotifs(converted.motifs,t.katalog.scale);
     for(const o of t.objects.filter(o=>o.type==='motif')){
      const original=converted.motifs.find(m=>m.key===o.motif),m=motifs.find(m=>m.key===o.motif),s=t.katalog.scale,[dx,dy]=t.katalog.offsetMm;
      if(original&&m){const b=original.bounds.map(v=>v*s);m.bounds=b;Object.assign(o,{x:b[0]+b[2]/2+dx,y:b[1]+b[3]/2+dy,w:b[2],h:b[3]});}
     }
     const c=slateCatalogueProduct(catalogueAssetsRoot,family,size);
     c.profile.designs=[t];c.profile.defaultDesignId=t.id;c.localResources.fonts=resources.fonts;c.localResources.motifs=motifs;
     c.localResources.photoExamples=converted.examples.map(e=>({designId:t.id,slotId:e.slotId,assetId:e.assetId}));
     target.layoutIssues=t.objects.flatMap(o=>{const issue=customerLayoutIssue(o,c.profile,c.localResources);return issue?[{id:o.id,type:o.type,text:o.text,font:o.font,size:o.size,x:o.x,y:o.y,w:o.w,h:o.h,issue}]:[];});
     const document=makeProductDocument(c);document.elementRights[t.id]=converted.rights;
     validateProductDocument(document);assets.validateDocument(document);
     const preview=originalPreview(document.config,t.id,assets);
     const base=path.join('templates',size.key,row.id);
     write(path.join(out,base+'.json'),{template:t,motifs,rights:converted.rights,fonts:names,examples:c.localResources.photoExamples,source:row.source});
     fs.writeFileSync(path.join(out,base+'.svg'),preview);
     const fit=assessDesignTarget({master:design,template:t,family,size,fonts:resources.fonts,motifs});
     target.status='prepared';target.file=(base+'.json').replaceAll('\\','/');target.preview=(base+'.svg').replaceAll('\\','/');target.fit={status:fit.status,issues:fit.issues};target.templateHash=hash(t);target.scale=t.katalog.scale;target.offsetMm=t.katalog.offsetMm;
     if(r.sourceIssue){target.status='open';target.reason=r.sourceIssue;continue;}
     const groupKey=[size.key,row.group,row.subcategory,r.photoSlots?'mit-foto':'ohne-foto'].join(':');
     let group=groups.get(groupKey);if(!group){group={key:groupKey,size,group:row.group,subcategory:row.subcategory,photos:r.photoSlots>0,entries:[]};groups.set(groupKey,group);}
     group.entries.push({row,template:t,motifs,rights:converted.rights,fonts:resources.fonts,examples:c.localResources.photoExamples});
    }catch(e){target.status='open';target.reason=e.message;}
   }
  }catch(e){r.status='open';r.reason=e.message;}
  if(report.originals.length%10===0){write(path.join(out,'preparation-report.json'),report);console.log(JSON.stringify({done:report.originals.length,total:sourceRows.length,prepared:report.originals.reduce((n,r)=>n+r.targets.filter(t=>t.status==='prepared').length,0)}));}
 }
 for(const [name,font]of Object.entries(fontResources))write(path.join(out,'fonts',name+'.json'),font);
 for(const group of groups.values()){
  const c=slateCatalogueProduct(catalogueAssetsRoot,family,group.size),profileId='slate-original-review-'+hash(group.key).slice(0,16);
  c.profile.id=profileId;c.profile.label='Schiefer Originale '+group.size.widthMm/10+' × '+group.size.heightMm/10+' · '+group.group+' · '+group.subcategory;
  c.profile.designs=group.entries.map(e=>e.template);c.profile.defaultDesignId=c.profile.designs[0].id;
  c.localResources.fonts=Object.assign({},...group.entries.map(e=>e.fonts));c.localResources.motifs=group.entries.flatMap(e=>e.motifs);c.localResources.photoExamples=group.entries.flatMap(e=>e.examples);
  const document=makeProductDocument(c);for(const e of group.entries)document.elementRights[e.template.id]=e.rights;
  validateProductDocument(document);assets.validateDocument(document);
  const [saved]=repository.importBatch([{key:'original-review:'+hash([group.key,document]),fingerprint:hash(document),document}]);
  saved.revision=repository.get(saved.id).revision;
  const file='products/'+profileId+'.json';write(path.join(out,file),document);
  report.products.push({key:group.key,productId:saved.id,revision:saved.revision,created:saved.created,file,designIds:c.profile.designs.map(d=>d.katalog.originalId),defaultDesignId:c.profile.defaultDesignId,gallery:galleryOrder(c.profile.designs).primary,reviewOnly:true});
 }
 report.counts={originals:sourceRows.length,engraving:sourceRows.filter(r=>r.process==='Gravur').length,uv:sourceRows.filter(r=>r.process==='UV').length,preparedDesigns:report.originals.filter(r=>(catalogueExtension?r.targets.length>0:r.targets.length===2)&&r.targets.every(t=>t.status==='prepared')).length,preparedTargets:report.originals.reduce((n,r)=>n+r.targets.filter(t=>t.status==='prepared').length,0),openDesigns:report.originals.filter(r=>r.process==='Gravur'&&(!r.targets.length||r.targets.some(t=>t.status!=='prepared'))).length,reviewProducts:report.products.length};
 write(path.join(out,'preparation-report.json'),report);console.log(JSON.stringify(report.counts));
}finally{assets.close();repository.close();}
