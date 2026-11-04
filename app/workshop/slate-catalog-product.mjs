import {readFileSync,realpathSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {familyProductConfig} from './product-families.mjs';
import {bindSlateAccessories} from './slate-accessories.mjs';
import {prepareConfig} from '../configurator/variant-m/contract.mjs';

const finishNames={edelstahl:'Edelstahl',schwarz:'Schwarz matt',bronze:'Bronze',gold:'Gold',weiss:'Weiß'};
const optionIds={B02:'b2',B02S:'b2s',B04:'b4',B04S:'b4s',AH02:'ah2',AH04:'ah4',KORDEL:'kordel'};
export function catalogueImage(root,relative){
 const base=realpathSync(root),file=realpathSync(resolve(base,relative));
 if(!file.startsWith(base+sep)||!/^\.(?:png|jpg|webp)$/.test(file.slice(file.lastIndexOf('.'))))throw Error('Bild außerhalb des Katalogs.');
 const type=file.endsWith('.jpg')?'jpeg':file.split('.').at(-1);
 return `data:image/${type};base64,`+readFileSync(file).toString('base64');
}
export function withFamilyPreview(config,root,size){
 if(!size.previewImage)return config;
 return {...config,materialSurface:catalogueImage(root,size.previewImage)};
}
// One native, fixed-size master configurator per confirmed plate. The catalogue
// owns the four families; the 48 shop products do not offer a different plate.
export function slateCatalogueProduct(root,family,size,{revision=1,accessories=true}={}){
 if(!family.id.startsWith('schiefer-tafeln-'))throw Error('Nur die vier neuen Schieferfamilien sind Quelle.');
 const view={...family,sizes:[size],groups:family.groups.filter(g=>g.key===size.groupKey),mountingRules:family.mountingRules.filter(r=>size.mounting.includes(r.id))};
 let c=withFamilyPreview(familyProductConfig(view,size,revision),root,size);
 c.profile.designs[0].name='Eigene Gestaltung';
 // Scaffolding is editable native text, not an approved catalogue design.
 c.profile.designs[0].objects[0].text='Dein Text';
 if(accessories){
  const path='materialien/zubehoer/schiefer-zubehoer.json',catalogue=JSON.parse(readFileSync(resolve(root,path))),bindings=[];
  for(const g of c.profile.optionGroups)for(const v of g.values){
   if(g.id==='mounting'&&v.id!=='K00')bindings.push({groupId:g.id,valueId:v.id,optionId:optionIds[v.id],...(v.mountingRule?.accessory==='standoffs'?{imageName:'Edelstahl'}:{})});
   else if(g.id.startsWith('ah-farbe-'))bindings.push({groupId:g.id,valueId:v.id,optionId:g.id.endsWith('2')?'ah2':'ah4',imageName:finishNames[v.id],finishOnly:true});
  }
  for(const f of c.profile.optionFields??[])bindings.push({groupId:'zubehoer',valueId:f.id,fieldId:f.id,optionId:f.id});
  c=bindSlateAccessories(c,{catalogue,source:{revision:'86aa4bcec5c62e0c46cfc61ed30a42418841d1ff',path},bindings,resolveImage:file=>catalogueImage(root,'materialien/zubehoer/'+file),includePhoto:c.photo.enabled});
 }
 return prepareConfig(c);
}
