import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>{throw Object.assign(Error('Die feste Galeriequelle passt nicht zu den geprüften Originalen.'),{code});};
const cfg=id=>/^cfg_[a-f0-9-]{36}$/.test(id||'');

/** Metadata only. A visible card is not an approved native sync target.
 * IDs are copied solely from the pinned manifest and its existing import map.
 * Missing/ambiguous mappings remain explicit and never remove target artwork. */
export function mapProductionGallerySources({metadata,provenance,expectedManifestSha256,expectedImportsSha256,role}={}){
 if(!['active','prepared'].includes(role)||metadata?.schema!=='gravuru-module-gallery-source-metadata/v1'||metadata.readOnly!==true||metadata.manifestSha256!==expectedManifestSha256||metadata.importsSha256!==expectedImportsSha256||!Array.isArray(provenance?.designs))fail('gallery_source_pin');
 const designs=provenance.designs,ids=new Set(designs.map(d=>d.originalId));
 if(ids.size!==designs.length||metadata.requestedOriginalIds?.length!==ids.size||metadata.requestedOriginalIds.some(id=>!ids.has(id)))fail('gallery_source_allowlist');
 const imports=new Map();for(const row of metadata.imports||[]){if(imports.has(row.key))fail('gallery_source_duplicate_import');imports.set(row.key,row);}
 const products=new Map();for(const row of metadata.products||[]){if(products.has(row.key))fail('gallery_source_duplicate_product');products.set(row.key,row);}
 const results=designs.map(design=>{
  const cards=(metadata.originals||[]).filter(card=>card.id===design.originalId||card.sourceOriginalId===design.originalId);
  const exact=cards.filter(card=>card.files?.some(file=>file.name==='design.json'&&file.sha256===design.originalSha256));
  const candidates=[],issues=[];
  if(!cards.length)issues.push('card_missing');else if(!exact.length)issues.push('original_hash_changed');
  for(const card of exact)for(const target of card.targets||[]){
   if(target.status!=='prepared'){issues.push('target_not_prepared');continue;}
   const product=products.get(target.productKey),entry=imports.get(target.productKey);
   if(!product||!entry||!cfg(entry.productId)||!Number.isSafeInteger(entry.revision)||entry.revision<1||entry.reviewOnly!==true){issues.push('native_import_missing');continue;}
   // No catalogue-ID prefix guess, default-design fallback or nearest format.
   const nativeDesignId=target.nativeDesignId;
   if(!nativeDesignId||!Array.isArray(product.designIds)||!Array.isArray(entry.designIds)||!product.designIds.some(id=>[nativeDesignId,card.id,design.originalId].includes(id))||!entry.designIds.some(id=>[nativeDesignId,card.id,design.originalId].includes(id))){issues.push('native_design_identity_unproven');continue;}
   // The legacy native manifest uses its explicit family:size product key;
   // newer batch targets carry familyId separately. Never infer from material.
   const familyId=target.familyId||(target.productKey===`${design.approval?.familie}:${target.sizeKey}`?design.approval.familie:null);
   if(!familyId||!target.sizeKey||!Array.isArray(target.mm)||target.mm.length!==2){issues.push('native_format_identity_unproven');continue;}
   if(familyId!==design.approval?.familie||!design.compatibleSizes?.includes(target.sizeKey)){issues.push('target_outside_active_compatibility');continue;}
   candidates.push({cardId:card.id,originalId:design.originalId,originalSha256:design.originalSha256,targetDesignId:design.nativeDesignId,source:{productId:entry.productId,revision:entry.revision,designId:nativeDesignId},productKey:target.productKey,familyId,sizeKey:target.sizeKey,mm:structuredClone(target.mm),documentHash:entry.documentHash,...(target.templateHash?{templateHash:target.templateHash}:{}),approval:'not_read'});
  }
  const unique=new Map(),ambiguous=new Set();for(const candidate of candidates){const key=JSON.stringify([candidate.familyId,candidate.sizeKey]);if(ambiguous.has(key))continue;if(unique.has(key)&&hash(unique.get(key))!==hash(candidate)){issues.push('ambiguous_native_target');unique.delete(key);ambiguous.add(key);}else unique.set(key,candidate);}
  return {originalId:design.originalId,targetDesignId:design.nativeDesignId,cardCount:cards.length,exactCardCount:exact.length,nativeTargets:[...unique.values()],issues:[...new Set(issues)]};
 });
 const present=results.filter(r=>r.exactCardCount>0),native=results.filter(r=>r.nativeTargets.length>0);
 return {schema:'gravuru-production-gallery-source-map/v1',role,manifestSha256:metadata.manifestSha256,importsSha256:metadata.importsSha256,
  originals:results,counts:{requested:designs.length,cardsMatched:present.length,withNativeTargets:native.length,openNativeTargets:designs.length-native.length,nativeMappings:native.reduce((n,r)=>n+r.nativeTargets.length,0)},
  openOriginalIds:results.filter(r=>!r.nativeTargets.length).map(r=>r.originalId),
  designSyncEnabled:false,sourceActivated:role==='active',artworkWritten:false};
}
