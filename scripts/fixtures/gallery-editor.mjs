import fs from 'node:fs';
import {familyProductConfig} from '../../app/workshop/product-families.mjs';
import {makeProductDocument} from '../../app/workshop/product-model.mjs';

export function galleryEditorDocument({material='slate',width=220,height=140,shape='rect'}={}){
 const family=JSON.parse(fs.readFileSync(new URL('../../app/designs/steel-door-signs/family.json',import.meta.url)));
 family.id=material==='slate'?'schiefer-tafeln-natur':'edelstahl-galerietest';
 family.material={kind:material,label:material==='slate'?'Schiefer':'Edelstahl',thicknessMm:material==='slate'?5:1.5,processingProfileId:material==='slate'?'slate-engraving':'steel-engraving'};
 family.photo={includedCount:material==='slate'?1:0,extraPriceCents:999};family.sizes=family.sizes.slice(0,1);
 Object.assign(family.sizes[0],{key:'TEST-'+width+'X'+height,widthMm:width,heightMm:height,baseCents:1999,photoDesignCents:2999});
 const config=familyProductConfig(family,family.sizes[0],1),seed=config.profile.designs[0];
 config.profile.geometry.shape=shape;
 config.profile.designs=['source-a','source-b'].map((id,index)=>({...structuredClone(seed),id,name:id,katalog:{designId:index?'OTHER-ORIGINAL':'TRE-V2A-8x3,5-D1',target:{familyId:family.id,released:false}},
  objects:[{...structuredClone(seed.objects[0]),id:'name',text:index?'Unverändert':'Hallo',x:width*.5+.00127,y:height*.3+.00317,size:4.125,locked:true,acrylicFixed:true,uxLocked:true},
   {...structuredClone(seed.objects[0]),id:'technical',text:'FIX',x:width*.5,y:height*.75,size:3,technicalLocked:true}],marks:[]}));
 config.profile.defaultDesignId='source-a';
 return makeProductDocument(config,{name:'Isolierte Galerieprüfung '+material});
}
export function galleryEditorTargets(record,{material=record.document.config.profile.material.kind,sizeKey='TEST-220X140'}={}){
 const p=record.document.config.profile;
 return p.designs.map(d=>({originalId:d.katalog.designId,material:material==='slate'?'Schiefer':'Edelstahl',materialKind:material,sizeKey,mm:[p.geometry.width,p.geometry.height],productId:record.id,nativeDesignId:d.id}));
}
export const galleryTestPng='iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
