// Explicit opt-in for the forthcoming slate catalogue. Never infer bindings from
// old family names, hole counts or labels; never create product/price variants.
export const SLATE_ACCESSORIES_SCHEMA='gravuru-slate-accessories/v1';
const fail=message=>{throw Error(message);};
export function bindSlateAccessories(config,{catalogue,source,bindings,resolveImage,includePhoto=false}){
 if(catalogue?.schema!=='gravuru-zubehoer/v1'||catalogue.material!=='schiefer')fail('Schiefer-Zubehörquelle fehlt.');
 if(!source?.revision||!source?.path||typeof resolveImage!=='function'||!Array.isArray(bindings))fail('Schiefer-Zubehör braucht Quelle, Revision, Bildauflösung und ausdrückliche Zuordnungen.');
 if(config.familyFormats)fail('Schiefer-Familienformate erst nach der vollständigen Katalogübergabe anbinden.');
 const rows=catalogue.optionen;
 if(!Array.isArray(rows)||new Set(rows.map(row=>row.id)).size!==rows.length)fail('Zubehörkennungen sind nicht eindeutig.');
 const get=id=>rows.find(row=>row.id===id)||fail('Zubehör fehlt: '+id);
 const images=(row,name)=>{
  const selected=name===undefined?row.konfiBilder:row.konfiBilder?.filter(image=>image.name===name);
  if(!selected?.length)fail('Konfi-Bild fehlt: '+row.id);
  return selected.map(image=>{
   if(!/^bilder\/[A-Za-z0-9_.-]+\.(?:png|jpg|webp)$/.test(image.datei)||!image.name)fail('Ungültiger Konfi-Bildpfad.');
   const src=resolveImage(image.datei);
   if(typeof src!=='string'||!(/^(?:\/(?!\/)|https:\/\/)/.test(src)||/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src))||/^https:\/\/[^/]*@/.test(src))fail('Konfi-Bild braucht eine lokale oder HTTPS-Ressourcenadresse.');
   return {src,name:image.name,file:image.datei};
  });
 };
 const seen=new Set();
 const choices=bindings.map(({groupId,valueId,optionId,imageName,fieldId,finishOnly=false})=>{
  const key=JSON.stringify([groupId,valueId]);if(seen.has(key))fail('Doppelte Zubehörzuordnung.');seen.add(key);
  const row=get(optionId),group=config.profile?.optionGroups?.find(group=>group.id===groupId),value=fieldId?config.profile?.optionFields?.find(f=>f.id===fieldId&&f.kind==='checkbox'):group?.values.find(value=>value.id===valueId);
  if(!value)fail('Gebundene Produktoption fehlt: '+groupId+'/'+valueId);
  if(row.art==='aufpreis')fail('Foto-Aufpreis gehört zum bestehenden Fotovertrag.');
  let priceCents=row.preisCents;
  if(row.farben){
   if(!row.farben.includes(imageName)||!row.preisJeFarbe)fail('Abstandshalter brauchen eine ausdrücklich zugeordnete Farbe.');
   const extra=row.preisJeFarbe[imageName]??row.preisJeFarbe.farbig;
   if(!Number.isSafeInteger(extra)||extra<0)fail('Farbaufpreis fehlt.');
   if(finishOnly){
    const mounts=config.profile.optionGroups.find(g=>g.id==='mounting').values.filter(v=>group.visibleIf?.groupId==='mounting'&&group.visibleIf.valueIds.includes(v.id));
    if(!mounts.length||mounts.some(v=>v.priceCents!==row.preisCents||v.mountingRule?.accessory!=='standoffs'||v.mountingRule?.count!==(optionId==='ah2'?2:4)))fail('Farbgruppe ist nicht dem bestätigten Halterset zugeordnet.');
    priceCents=extra;
   }else priceCents+=extra;
  }
  if(!Number.isSafeInteger(priceCents)||priceCents<0||value.priceCents!==priceCents)fail('Zubehörpreis passt nicht zum Produktvertrag: '+optionId);
  return {groupId,valueId,optionId,...(fieldId?{fieldId}:{}),label:finishOnly?value.label:row.name,art:row.art,priceCents,images:images(row,imageName)};
 });
 let photo;
 if(includePhoto){
  const row=get('foto');
  if(!config.photo?.enabled||!Number.isSafeInteger(row.preisCents)||config.photo.extraPriceCents!==row.preisCents)fail('Foto-Aufpreis passt nicht zum Produktvertrag.');
  photo={priceCents:row.preisCents,images:images(row)};
 }
 const result=structuredClone(config);
 result.slateAccessories={schema:SLATE_ACCESSORIES_SCHEMA,source:structuredClone(source),choices,...(photo?{photo}:{})};
 return result;
}
