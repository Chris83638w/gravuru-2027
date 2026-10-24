// Display profiles are not machine settings. Thickness remains product-specific.
export const PROCESSING_PROFILES=Object.freeze([
 {id:'steel-engraving',name:'Gravur auf Edelstahl',method:'engraving',materialKind:'steel',ink:'#000000',colorMode:'monochrome'},
 {id:'wood-engraving',name:'Gravur auf Holz',method:'engraving',materialKind:'wood',ink:'#49301d',colorMode:'monochrome'},
 {id:'slate-engraving',name:'Gravur auf Schiefer',method:'engraving',materialKind:'slate',ink:'#e8e9e5',colorMode:'monochrome'},
 {id:'acrylic-engraving',name:'Gravur auf Acrylglas',method:'engraving',materialKind:'acrylic',ink:'#e1e4e5',colorMode:'monochrome'},
 {id:'color-print',name:'UV-Druck',method:'print',materialKind:null,ink:'#202824',colorMode:'full-color'},
].map(Object.freeze));
export const WALNUT_ENGRAVING_TONE=Object.freeze({ink:'#33271f',rgb:Object.freeze([51/255,39/255,31/255]),label:'Walnussgravur · dunkle, kontrastarme Näherung',approximate:true,note:'Näherung ohne Material- oder Maschinenabnahme.'});
export const MATERIAL_COLORS=Object.freeze({steel:'#bac2c4',wood:'#c7a275',slate:'#41494b',acrylic:'#17191b',other:'#f5f2eb',print:'#f5f2eb'});
export const validColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
export function getProcessingProfile(product){
 const explicit=product.processing?.profileId;
 const id=explicit??(product.material?.kind==='print'?'color-print':product.material?.kind+'-engraving');
 const profile=PROCESSING_PROFILES.find(p=>p.id===id);
 if(!profile)throw Error('Bitte eines der fünf Bearbeitungsprofile auswählen.');
 return profile.id==='wood-engraving'&&['walnut','walnuss'].includes(String(product.material?.variant??product.material?.id??'').toLowerCase())?{...profile,...WALNUT_ENGRAVING_TONE}:profile;
}
export function validateProcessingProfile(product){
 if(product.processing!==undefined&&(!product.processing||typeof product.processing!=='object'||Array.isArray(product.processing)||Object.keys(product.processing).some(k=>k!=='profileId')||!product.processing.profileId))throw Error('Ungültiges Bearbeitungsprofil.');
 const profile=getProcessingProfile(product);
 if(profile.method==='engraving'&&product.material.kind!==profile.materialKind)throw Error('Gravurprofil und Material passen nicht zusammen.');
 return profile;
}
export function applyProcessingProfile(product,id){
 const profile=PROCESSING_PROFILES.find(p=>p.id===id);
 if(!profile||product.kind!=='universal-product')throw Error('Ungültiger Profilwechsel.');
 product.processing={profileId:id};
 if(profile.materialKind&&product.material.kind!==profile.materialKind){product.material.kind=profile.materialKind;product.material.color=MATERIAL_COLORS[profile.materialKind];}
 else if(product.material.kind==='print')product.material.kind='other';
 // Never rewrite colors, media references, crop, thickness, or geometry.
 return product;
}
export function elementColor(product,object){
 const profile=getProcessingProfile(product);
 return profile.method==='print'&&validColor(object.color)?object.color:profile.ink;
}
