// #85 / 4.59: the original selected template defines the base, never customer
// objects (adding/hiding a photo must not change the template's included credit).
export function templatePhotoPrice(config,template,variant){
 const base=variant?.basePriceCents??config.basePriceCents;
 if(config.photoDesignPricing!==true)return {baseCents:base,policy:config.photo};
 const photoCents=variant?variant.photoDesignCents:config.photoDesignCents;
 const hasPhoto=template?.objects?.some(o=>o.type==='photoSlot'&&o.role!=='guide')===true;
 if(hasPhoto&&(!Number.isSafeInteger(photoCents)||photoCents<0))throw Error('Für diese Größe ist kein Fotodesign freigegeben.');
 return {baseCents:hasPhoto?photoCents:base,policy:{...config.photo,enabled:photoCents!==undefined,includedCount:hasPhoto?config.photo.includedCount:0}};
}
