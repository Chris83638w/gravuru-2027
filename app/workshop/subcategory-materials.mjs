// Mikail, 06.11.2026: choose offered materials per subcategory. This is an
// offer selection, never a product creation, approval or Shopify publication.
// Missing/null preserves the previous line selection; [] is deliberately empty.
const ID=/^[a-z0-9][a-z0-9_.-]{0,79}$/i;
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'subcategory_materials'});};

export function familyOfferingIssue(value,{families}={}){
 if(value===undefined||value===null)return null;
 if(!Array.isArray(value)||value.some(id=>typeof id!=='string'||!ID.test(id)))return 'familyIdsOffered ist null oder eine Liste gültiger Familien-Kennungen.';
 if(new Set(value).size!==value.length)return 'Eine Materialfamilie darf nur einmal angeboten werden.';
 const missing=families&&value.filter(id=>!families.has(id));
 return missing?.length?'Unbekannte Materialfamilie: '+missing.join(', ')+'.':null;
}

export function offeredFamilyIds(line,subcategory,{families}={}){
 if(!line||!subcategory)fail('Linie und Unterkategorie fehlen für die Materialauswahl.');
 const value=subcategory.familyIdsOffered,issue=familyOfferingIssue(value,{families});
 if(issue)fail(issue);
 const ids=value==null?line.families:value;
 if(!Array.isArray(ids))fail('Die Produktlinie hat keine gültige Familienliste.');
 return [...ids];
}

// A subcategory may explicitly offer a known family outside the old material-
// specific line. Keep the family identity; never merge AA/AS into "acrylic".
export function lineOfferedFamilyIds(line,{families,subcategoryIds}={}){
 const subs=(line.subcategories||[]).filter(s=>!subcategoryIds||subcategoryIds.includes(s.id));
 return [...new Set(subs.flatMap(s=>offeredFamilyIds(line,s,{families})))];
}

export function subcategoryMaterialOffering(line,subcategory,{families,supportedFamilyIds=[]}={}){
 const ids=offeredFamilyIds(line,subcategory,{families});
 return {familyIdsOffered:subcategory.familyIdsOffered==null?null:[...subcategory.familyIdsOffered],effectiveFamilyIds:ids,
  materialSelection:subcategory.familyIdsOffered==null?'inherited':'explicit',
  unsupportedFamilyFormatIds:ids.filter(id=>!supportedFamilyIds.includes(id))};
}
