// Rebuild local review groups from validated prepared templates, without redoing
// expensive font/photo conversion. Source completeness is checked again.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {slateCatalogueProduct} from '../app/workshop/slate-catalog-product.mjs';
import {makeProductDocument,validateProductDocument} from '../app/workshop/product-model.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1];
for(const k of ['--data','--katalog'])if(!args.includes(k))throw Error(k+' required');
const data=path.resolve(arg('--data')),root=path.resolve(arg('--katalog')),read=p=>JSON.parse(fs.readFileSync(p)),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const report=read(path.join(data,'preparation-report.json')),family=openKatalog(root).families.get('schiefer-tafeln-natur'),groups=new Map();
for(const row of report.originals){
 const original=read(path.join(data,'originals',row.id,'design.json'));
 if(original.katalog?.kategorie?.foto==='ja'&&row.photoSlots===0){row.sourceIssue='Katalog kennzeichnet mit Foto, enthält aber keinen Original-Fotobereich. Keine Position oder Maske erfunden.';for(const t of row.targets){t.status='open';t.reason=row.sourceIssue;}}
 row.catalogueReview=[];
 for(const series of ['schiefer-gedenktafeln-katalog-rechteck-3-2','schiefer-gedenktafeln-katalog-rechteck-220x140']){const p=path.join(root,'designs',series,row.id,'design.json');if(fs.existsSync(p)){const j=read(p);if(j.schieferUebernahme?.ausgelassen)row.catalogueReview.push({source:path.relative(root,p).replaceAll('\\','/'),note:j.schieferUebernahme.ausgelassen});}}
 for(const target of row.targets.filter(t=>t.status==='prepared')){
  const key=[target.sizeKey,row.group,row.subcategory,row.photoSlots?'mit-foto':'ohne-foto'].join(':'),entry={row,target,...read(path.join(data,target.file))};
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(entry);
 }
}
const repo=createProductRepository({filename:path.join(data,'workshop.sqlite'),validateDocument:validateProductDocument}),assets=createDesignAssetStore({filename:path.join(data,'design-assets.sqlite')});report.products=[];
try{
 for(const [key,entries]of groups){
  const size=family.sizes.find(s=>s.key===entries[0].target.sizeKey),c=slateCatalogueProduct(root,family,size),id='slate-original-review-'+hash(key).slice(0,16);
  c.profile.id=id;c.profile.label='Schiefer Originale '+size.widthMm/10+' × '+size.heightMm/10+' · '+entries[0].row.group+' · '+entries[0].row.subcategory;
  c.profile.designs=entries.map(e=>e.template);c.profile.defaultDesignId=c.profile.designs[0].id;
  const names=[...new Set(entries.flatMap(e=>e.fonts))];c.localResources.fonts=Object.fromEntries(names.map(n=>[n,read(path.join(data,'fonts',n+'.json'))]));c.localResources.motifs=entries.flatMap(e=>e.motifs);c.localResources.photoExamples=entries.flatMap(e=>e.examples);
  const document=makeProductDocument(c);for(const e of entries)document.elementRights[e.template.id]=e.rights;validateProductDocument(document);assets.validateDocument(document);
  const fingerprint=hash(document),[saved]=repo.importBatch([{key:'original-review:'+hash([key,document]),fingerprint,document}]),stored=repo.get(saved.id),file='products/'+id+'.json';
  fs.writeFileSync(path.join(data,file),JSON.stringify(document,null,2));report.products.push({key,productId:saved.id,revision:stored.revision,created:saved.created,file,designIds:entries.map(e=>e.row.id),defaultDesignId:c.profile.defaultDesignId,reviewOnly:true});
 }
 report.counts={...report.counts,preparedDesigns:report.originals.filter(r=>r.targets.length===2&&r.targets.every(t=>t.status==='prepared')).length,preparedTargets:report.originals.reduce((n,r)=>n+r.targets.filter(t=>t.status==='prepared').length,0),openDesigns:report.originals.filter(r=>r.process==='Gravur'&&(!r.targets.length||r.targets.some(t=>t.status!=='prepared'))).length,missingPhotoFields:report.originals.filter(r=>r.sourceIssue).length,reviewProducts:report.products.length};
 fs.writeFileSync(path.join(data,'preparation-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.counts));
}finally{repo.close();assets.close();}
