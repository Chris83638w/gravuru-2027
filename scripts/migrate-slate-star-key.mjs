// #85/6625312189. Local evidence migration only; Shopify is changed separately
// using slate-star-correction.graphql and verified by shopify-stern.json.
import fs from 'node:fs';
import path from 'node:path';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {createProductFamilies} from '../app/workshop/product-families.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
if(!args.includes('--katalog'))throw Error('--katalog erforderlich.');
const root=path.resolve(get('--katalog')),old='GT-SG-ST-199P999863X190P598709',key='GT-SG-ST-200X190P6';
const replace=s=>s.replaceAll(old,key).replaceAll(old.toLowerCase(),key.toLowerCase());
const evidence=path.join(root,'auftraege/2026-11-04-schiefer-anschluss');
const correction=JSON.parse(fs.readFileSync(path.join(evidence,'review-6625312189/shopify-stern.json')));
if(correction.after.status!=='DRAFT'||correction.after.resourcePublicationsCount.count!==0||correction.after.variants.nodes[0].sku!==key)throw Error('Shopify-Lesenachweis fehlt.');
const reportPath=path.join(evidence,'shopify-entwuerfe.json'),report=JSON.parse(fs.readFileSync(reportPath));
const row=report.rows.find(r=>r.id===correction.after.id);if(!row)throw Error('Stern fehlt im Nachweis.');
Object.assign(row,{...correction.after,sizeKey:key,verifiedAt:correction.verifiedAt});
report.corrections=[{comment:6625312189,revisedDrafts:1,created:0,published:0,proof:'review-6625312189/shopify-stern.json'}];
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
const prep=path.join(evidence,'native-vorbereitung.json');fs.writeFileSync(prep,replace(fs.readFileSync(prep,'utf8')));
// Old generated artifacts are superseded by the new renderer/build output.
for(const file of ['kataloge/konturen/'+old+'.svg',...['.svg','.png','.kontur.svg'].map(ext=>'auftraege/2026-11-04-schiefer-anschluss/kontaktboegen/geschnitten/grundplatte__'+old+ext)]){
 const absolute=path.join(root,file);if(fs.existsSync(absolute))fs.unlinkSync(absolute);
}
if(args.includes('--data')){
 const data=path.resolve(get('--data')),file=path.join(data,'shopify-plan.json'),plans=JSON.parse(fs.readFileSync(file));
 const plan=plans.find(p=>[old,key].includes(p.sizeKey));if(!plan)throw Error('Lokaler Stern fehlt.');
 const repository=createProductRepository({filename:path.join(data,'workshop.sqlite'),validateDocument:validateProductDocument});
 const families=createProductFamilies({filename:path.join(data,'workshop.sqlite'),repository});
 try{
  const saved=repository.get(plan.productId),next=JSON.parse(replace(JSON.stringify(saved.document)));
  if(JSON.stringify(next)!==JSON.stringify(saved.document))repository.save(saved.id,next,saved.revision);
  const family=JSON.parse(fs.readFileSync(path.join(root,'familien/schiefer/schiefer-tafeln-geschnitten.json'))),prior=families.get(family.id);
  families.save(family.id,family,prior.revision);
 }finally{families.close();repository.close();}
 for(const name of ['shopify-plan.json','preparation-report.json']){const f=path.join(data,name);fs.writeFileSync(f,replace(fs.readFileSync(f,'utf8')));}
}
console.log(JSON.stringify({old,key,geometryChanged:false,revisedDrafts:1,published:0}));
