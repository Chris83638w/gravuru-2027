// Synthetic acceptance product. No customer data and no live shop binding.
import {readFileSync} from 'node:fs';
import {makeAcrylicConfig} from '../../configurator/variant-m/acrylic-product.mjs';
import {makeProductDocument} from '../product-model.mjs';
export function moduleProfileTestSource(){
 const resources=JSON.parse(readFileSync(new URL('../../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
 const c=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));delete c.acrylic;
 const p=c.profile;p.name='Edelstahl-Türschild · getrennte Modulprüfung';
 p.material={kind:'steel',color:'#a0a0a0',thicknessMm:1.5};p.processing={profileId:'steel-engraving'};
 p.geometry={width:120,height:80,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]};
 const text=structuredClone(p.designs[0].objects.find(o=>o.type==='text'));
 Object.assign(text,{id:'name',text:'Familie Muster',size:5,x:60,y:40,w:70,h:10,rotation:0,acrylicFixed:false});
 p.designs=[{id:'module-test',name:'Prüfvorlage',objects:[text]}];p.defaultDesignId='module-test';
 p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[
  {id:'none',label:'Ohne Bohrung',priceCents:0,currency:'EUR',holes:[]},
  {id:'two',label:'2 Bohrlöcher',priceCents:299,currency:'EUR',holes:[{x:8,y:40,diameter:4},{x:112,y:40,diameter:4}]}
 ]}];
 c.basePriceCents=1999;c.extraMotifCents=169;c.photo={enabled:false,mode:'upload-only',includedCount:0,extraPriceCents:999};
 c.logo={enabled:true,vectorUpload:true,extraPriceCents:1299};c.localResources.photoExamples=[];c.localResources.photoPlaceholders=[];
 return makeProductDocument(c);
}
export const steelModuleSwitches=Object.freeze({options:true,designs:true,text:true,motifs:true,photo:false,logo:true,colors:false});
