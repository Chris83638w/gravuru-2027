// Reproducible local preparation; never publishes or writes to Shopify.
// Catalogue source and decisions: #85 comments 6618926268 and 6618993147.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {katalogFor} from '../app/workshop/design-dashboard.mjs';
import {approvedForFamily,assignTargetSeries} from '../app/workshop/design-targets.mjs';
import {katalogDesignToTemplate,parseDesignSvg} from '../app/workshop/katalog-convert.mjs';
import {assessDesignTarget} from '../app/workshop/design-target-rules.mjs';
import {prepareKatalogPhotoAssets} from '../app/workshop/katalog-photo-assets.mjs';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {slateCatalogueProduct} from '../app/workshop/slate-catalog-product.mjs';
import {makeProductDocument,validateProductDocument} from '../app/workshop/product-model.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {createProductFamilies} from '../app/workshop/product-families.mjs';
import {quote,variantCombinations} from '../app/configurator/variant-m/contract.mjs';
import {SLATE_COMMIT} from './build-slate-families.mjs';

const args=process.argv.slice(2),arg=name=>args[args.indexOf(name)+1];
if(!args.includes('--katalog')||!args.includes('--out'))throw Error('--katalog und --out erforderlich.');
const root=path.resolve(arg('--katalog')),out=path.resolve(arg('--out'));
fs.mkdirSync(out,{recursive:true});
const hash=v=>createHash('sha256').update(v).digest('hex'),katalog=katalogFor(root,{maxAgeMs:0});
const assets=createDesignAssetStore({filename:path.join(out,'design-assets.sqlite')});
const repository=createProductRepository({filename:path.join(out,'workshop.sqlite'),validateDocument:validateProductDocument});
const families=createProductFamilies({filename:path.join(out,'workshop.sqlite'),repository});
const report={sourceCommit:SLATE_COMMIT,products:[],excluded:[],published:false},plans=[];
try{
 for(const family of [...katalog.families.values()].filter(f=>f.id.startsWith('schiefer-tafeln-'))){
  const prior=families.list().find(f=>f.id===family.id);
  if(!prior)families.create(family);
  else if(JSON.stringify(families.get(family.id).document)!==JSON.stringify(family))throw Error('Familie wurde zwischenzeitlich geändert: '+family.id);
  const masters=katalog.designs.masters.filter(d=>!d.hidden&&approvedForFamily(d,family.id,katalog));
  const assigned=assignTargetSeries(family,masters,katalog),cache=new Map();
  for(const size of family.sizes){
   let config=slateCatalogueProduct(root,family,size);config.designSelection='all-approved';const templates=[];
   for(const a of assigned.filter(a=>a.sizes.includes(size.key))){
    try{
     if(a.design.plateMm.some((n,i)=>Math.abs(n-[size.widthMm,size.heightMm][i])>.001))throw Error('Migration übernimmt ausschließlich die identische Quellgröße.');
     let entry=cache.get(a.design.id);
     if(!entry){
      const svgText=a.design.svg(),names=[...new Set(parseDesignSvg(svgText).layers.filter(l=>l.kind==='text'||l.text).map(l=>l.font))];
      const resources=await katalog.fontResources(names,{converter:convertFont});
      if(resources.missing.length)throw Error('Schrift fehlt: '+resources.missing.join(', '));
      const converted=await prepareKatalogPhotoAssets(katalogDesignToTemplate(a.design,family,katalog.theme(a.design.themes?.[0]),{fonts:resources.fonts,svgText}),a.design,{assets});
      entry={...converted,fonts:resources.fonts};cache.set(a.design.id,entry);
     }
     if(entry.template.objects.some(o=>o.type==='photoSlot')&&size.photoDesignCents===undefined)throw Error('Diese Größe ist ohne Foto freigegeben.');
     const fit=assessDesignTarget({master:a.design,template:entry.template,family,size,fonts:entry.fonts,motifs:entry.motifs});
     if(fit.status==='passt nicht')throw Error(fit.issues.join(' · '));
     const template=structuredClone(entry.template);template.katalog.target={familyId:family.id,explicit:true,released:true};template.katalog.fit=fit.status;
     // #85/4.60: retain the source theme as a filter, never a separate dog family.
     if(family.id==='schiefer-tafeln-natur'&&template.themes?.includes('hundegedenktafeln'))template.collections=[...new Set([...(template.collections??[]),'Hunde'])];
     if(fit.issues.length)template.katalog.review=fit.issues;
     templates.push({...entry,template});
    }catch(e){report.excluded.push({family:family.id,size:size.key,design:a.design.id,reason:e.message});}
   }
   for(const t of templates){
    config.profile.designs.push(t.template);Object.assign(config.localResources.fonts,t.fonts);
    config.localResources.motifs.push(...t.motifs);
    for(const e of t.examples??[])(config.localResources.photoExamples??=[]).push({designId:t.template.id,slotId:e.slotId,assetId:e.assetId});
   }
   if(config.profile.designs.some(d=>d.collections?.includes('Hunde')))config.customerUI={...config.customerUI,designFilters:{...config.customerUI?.designFilters,collection:true}};
   const document=makeProductDocument(config);document.categoryIds=['familie-'+family.id,'form-'+size.groupKey.toLowerCase()];
   for(const t of templates)document.elementRights[t.template.id]=t.rights;
   const key='schiefer-2027:'+size.key;
   const [saved]=repository.importBatch([{key,fingerprint:hash(JSON.stringify(document)),document:validateProductDocument(document)}]);
   const variants=variantCombinations(config).map(options=>({options,label:Object.entries(options).map(([g,v])=>config.profile.optionGroups.find(x=>x.id===g).values.find(x=>x.id===v).label).join(' · '),priceCents:quote(config,[],config.profile.defaultDesignId,options).unitCents}));
   const handle='schiefer-2027-'+size.key.toLowerCase();
   const plan={handle,title:document.name,family:family.id,sizeKey:size.key,baseCents:size.baseCents,photoDesignCents:size.photoDesignCents,variants,productId:saved.id,status:'DRAFT',sourceCommit:SLATE_COMMIT};
   plans.push(plan);report.products.push({...plan,templates:templates.map(t=>t.template.katalog.designId),created:saved.created});
   console.log(JSON.stringify({size:size.key,templates:templates.length,variants:variants.length}));
  }
 }
 if(plans.length!==48)throw Error('Es müssen genau 48 Tafeln sein.');
 fs.writeFileSync(path.join(out,'shopify-plan.json'),JSON.stringify(plans,null,2)+'\n');
 fs.writeFileSync(path.join(out,'preparation-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({products:48,templates:report.products.reduce((n,p)=>n+p.templates.length,0),excluded:report.excluded.length}));
}finally{families.close();assets.close();repository.close();}
