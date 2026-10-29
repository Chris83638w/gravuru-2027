// Only persisted catalogue categories and the native doorbell model identify a
// gallery. Names, Shopify titles and profile IDs are not catalogue evidence.
export function galleryScope(model,binding){
 const categories=model.galleryCategoryIds||[],lines=categories.filter(x=>typeof x==='string'&&x.startsWith('linie-'));
 const families=categories.filter(x=>typeof x==='string'&&x.startsWith('familie-'));
 const lineId=lines.length===1?lines[0].slice(6):null,familyId=families.length===1?families[0].slice(8):null;
 const bell=model.universal.doorbell,doorbell=bell?.schema==='gravuru-doorbell/v1';
 const modelKey=doorbell&&typeof bell.modelKey==='string'&&bell.modelKey.trim()?bell.modelKey:null;
 // Legacy products without a proven line remain within their own fixed product.
 // Doorbell imports predate catalogue categories; their explicit modelKey is
 // authoritative, and never shares a namespace with ordinary product lines.
 const key=doorbell&&modelKey?JSON.stringify(['doorbell',lineId,modelKey]):!doorbell&&lineId?JSON.stringify(['line',lineId]):JSON.stringify(['product',binding.productId,binding.productRevision]);
 return {key,lineId,familyId};
}
export const galleryProcess=profile=>JSON.stringify([profile.material?.kind,profile.material?.variant??null,profile.processing?.method??profile.processing?.profileId??null]);
export function galleryTargetAllowed(source,target,design){
 if(source.scope.key!==target.scope.key)return false;
 if(source.process===target.process)return true;
 const approval=design.katalog?.target;
 return !!source.scope.lineId&&!!target.scope.familyId&&approval?.lineId===source.scope.lineId&&approval.familyId===target.scope.familyId&&approval.explicit===true&&approval.released===true;
}
