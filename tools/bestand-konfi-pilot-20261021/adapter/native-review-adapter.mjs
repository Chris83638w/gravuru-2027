// Isolated, network-free contract adapter. Sources: gravuru-2027 @ bf5c059f13e0868d7c554616b7c35ff7a328ae62.
// No price, geometry, release, access credential or Shopify binding is invented here.
export const SOURCE_COMMIT = 'bf5c059f13e0868d7c554616b7c35ff7a328ae62';
export const NATIVE_INPUT_KEYS = Object.freeze(['productId','productRevision','designId','objects','options','quantity','media','preview']);
export const NATIVE_OBJECT_KEYS = Object.freeze(['id','type','x','y','w','h','rotation','color','text','font','size','bold','italic','motif','fieldKey',
  'letterSpacing','customerEditable','templateOrigin','includedInDesign','slateIncluded','photoShape','photoMaskAssetId','required','shape','filled','strokeWidth','preserveColors','acrylicFixed',
  'uxHidden','uxLocked','uxUploadId','uxUploadKind','uxLogoTint','uxPhotoBackground','uxPhotoCrop','uxDecoration','uxPersonal','cSourceId','technicalLocked','assetId','opacity','locked','role','surfaceId']);
const PHOTO_EDIT_KEYS = ['angle','flip','zoom','x','y','shape','color'];
// Native fields absent from September's cleanObject whitelist. A missing field
// must not silently change a template mask, role or appearance during the bridge.
const NATIVE_ONLY_FIELDS = ['italic','letterSpacing','photoMaskAssetId','acrylicFixed','uxPhotoCrop','assetId','opacity','locked','role','surfaceId'];
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const CFG_ID = /^cfg_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const clone = value => structuredClone(value);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (code,message) => { throw Object.assign(new Error(message), {code}); };
const stable = value => Array.isArray(value) ? '['+value.map(stable).join(',')+']' : record(value) ? '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}' : JSON.stringify(value);
function jsonValue(value,path='Wert') {
  if (value === null || ['string','boolean'].includes(typeof value)) return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) { for (const v of value) jsonValue(v,path); return; }
  if (record(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value))) { for (const [k,v] of Object.entries(value)) jsonValue(v,path+'.'+k); return; }
  fail('invalid_json',path+' muss aus vollständigen JSON-Daten bestehen.');
}
function readModel(model) {
  const binding=model?.configuration,config=model?.universal,p=config?.profile;
  if (!CFG_ID.test(binding?.id||'') || !Number.isSafeInteger(binding.revision) || binding.revision<1)
    fail('product_binding','Eine feste cfg_-Produktkennung und positive Produktrevision fehlen.');
  if (!p || p.id!==binding.id || p.binding?.productId!==binding.id || p.revision!==binding.id+':'+binding.revision)
    fail('profile_binding','Das geladene Profil gehört nicht zu dieser Produktrevision.');
  if (config.demo || config.acrylic || config.doorbell || p.kind!=='universal-product' || p.material?.kind!=='slate' ||
      p.processing?.profileId!=='slate-engraving' || p.geometry?.shape!=='rect')
    fail('unsupported_product','Dieser getrennte Pilot unterstützt ausschließlich native rechteckige Schieferprodukte.');
  if (![p.geometry.width,p.geometry.height].every(n=>Number.isFinite(n)&&n>0)) fail('model_geometry','Die feste Produktgeometrie fehlt.');
  if (!Array.isArray(p.designs) || !p.designs.length || !Array.isArray(p.optionGroups)) fail('model_content','Designs oder Optionen der Produktrevision fehlen.');
  if (p.optionFields?.length || p.surfaces?.some(s=>s.id!=='front')) fail('unsupported_features','Zusatzfelder und Rückseite benötigen einen gesondert geprüften Adapter.');
  return {binding:clone(binding),config:clone(config),p:clone(p)};
}
function sourceDraft(draft,p) {
  jsonValue(draft,'Entwurf');
  if (draft?.profileId!==p.id || draft.profileRevision!==p.revision || draft.productId!==p.binding.productId)
    fail('draft_binding','Entwurf und geladene Produkt-/Profilrevision stimmen nicht überein.');
  let designId,objects,options,editorOnly={};
  if (draft.schema==='gravuru-customer-design/v2') {
    const state=draft.state;
    if (!record(state) || state.width!==p.geometry.width || state.height!==p.geometry.height)
      fail('draft_geometry','Die Entwurfsmaße stimmen nicht mit dem geladenen Produkt überein. Keine automatische Skalierung.');
    // The universal editor inherits these inert shell values from AOSU. They
    // must not become native options or geometry; actual mOptions remain authoritative.
    editorOnly=Object.fromEntries(['selected','showHero','fkMounting','fkFrame','fkColor','uxDecorationsFor'].filter(k=>state[k]!==undefined).map(k=>[k,clone(state[k])]));
    ({designId,objects}=state);options=state.mOptions??{};
  } else if (draft.schema==='gravuru-universal-customer-draft/v1') {
    designId=draft.design?.id;objects=draft.design?.objects;options=draft.options??{};
    const source=p.designs.find(d=>d.id===designId);
    if (source && stable(draft.design.marks??[])!==stable(source.marks??[])) fail('fixed_marks','Feste Gestaltungslinien weichen vom Produkt ab.');
  } else fail('draft_schema','Dieses Entwurfsformat ist nicht unterstützt.');
  const source=p.designs.find(d=>d.id===designId);
  if (!source) fail('design_binding','Das Design gehört nicht zur geladenen Produktrevision.');
  if (!Array.isArray(objects) || objects.length>120 || new Set(objects.map(o=>o?.id)).size!==objects.length)
    fail('objects','Eindeutige Gestaltungsobjekte fehlen oder der Elementumfang ist zu groß.');
  for (const o of objects) {
    if (!record(o) || typeof o.id!=='string' || !o.id || Object.keys(o).some(k=>!NATIVE_OBJECT_KEYS.includes(k)))
      fail('object_contract','Ein Objekt enthält nicht unterstützte Daten. Nichts wird still entfernt.');
    if (o.uxPhotoBackground!==undefined && (o.uxUploadKind!=='photo' || !o.uxUploadId || !['remove','keep'].includes(o.uxPhotoBackground)))
      fail('photo_background','Der Freistellwunsch ist nicht eindeutig einem Foto zugeordnet.');
  }
  if (!record(options) || Object.keys(options).some(k=>!p.optionGroups.some(g=>g.id===k))) fail('options','Produktfremde Ausführungsoption.');
  const resolved={};
  for (const group of p.optionGroups) {
    const value=options[group.id]??group.defaultValueId;
    if (!group.values?.some(v=>v.id===value)) fail('options','Die Auswahl gehört nicht zur Optionsgruppe '+group.id+'.');
    resolved[group.id]=value;
  }
  const templateFields=[],compatibilityBlockers=[];
  for (const o of objects) {
    const original=source.objects?.find(t=>t.id===o.id);
    if (!original) continue;
    const missing=NATIVE_ONLY_FIELDS.filter(k=>original[k]!==undefined&&o[k]===undefined);
    if (missing.length) {
      templateFields.push({objectId:o.id,fields:Object.fromEntries(missing.map(k=>[k,clone(original[k])]))});
      compatibilityBlockers.push({code:'native_template_fields_missing',objectId:o.id,fields:missing,
        message:'Die alte Entwurfsfunktion hat native Vorlagenfelder nicht mitgeführt; Maske, Rolle und Darstellung dürfen nicht still geändert werden.'});
    }
  }
  return {designId,objects:clone(objects),options:resolved,editorOnly,templateFields,compatibilityBlockers};
}
function base64String(value,label,maxBytes) {
  if (typeof value!=='string' || !value.length || value.length>Math.ceil(maxBytes/3)*4 || value.length%4!==0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))
    fail('image_encoding',label+' muss unveränderte Base64-Bilddaten ohne URL enthalten.');
  let raw;try {raw=atob(value);} catch {fail('image_encoding',label+' ist nicht gültig Base64-kodiert.');}
  if (raw.length>maxBytes || btoa(raw)!==value) fail('image_encoding',label+' ist zu groß oder nicht kanonisch kodiert.');
  return value;
}
async function encodeFile(file,label) {
  if (!(file instanceof Blob) || !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size<1 || file.size>MAX_PHOTO_BYTES)
    fail('photo_file',label+': ein Originalbild (JPG/PNG/WebP, bis 15 MB) fehlt.');
  const bytes=new Uint8Array(await file.arrayBuffer());let binary='';
  for (let i=0;i<bytes.length;i+=32768) binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return btoa(binary);
}
function photoEdit(value) {
  if (!record(value) || Object.keys(value).some(k=>!PHOTO_EDIT_KEYS.includes(k)) || PHOTO_EDIT_KEYS.some(k=>value[k]===undefined) ||
      ![value.angle,value.flip,value.zoom,value.x,value.y].every(Number.isFinite) || ![1,-1].includes(value.flip) ||
      value.zoom<1 || value.zoom>4 || Math.abs(value.x)>1 || Math.abs(value.y)>1 || Math.abs(value.angle)>3600 ||
      !['original','square','portrait','landscape','circle'].includes(value.shape) || !['original','grayscale','sepia'].includes(value.color))
    fail('photo_edit','Die vorhandenen Fotobearbeitungsparameter sind unvollständig oder ungültig.');
  return clone(value);
}

/** Build only the verified native request shape. The server must still validate
 *  element rights, fonts, contours, photos, price and session/CSRF/ownership.
 *  No HTTP request, file persistence, price calculation or release is performed.
 */
export async function prepareNativeReview({model,draft,quantity,files,preview}) {
  const {binding,p}=readModel(model),{editorOnly,templateFields,compatibilityBlockers,...state}=sourceDraft(draft,p);
  if (!Number.isSafeInteger(quantity) || quantity<1 || quantity>99) fail('quantity','Menge: 1 bis 99.');
  if (!(files instanceof Map)) fail('files','Die Dateizuordnung des bestehenden Editors fehlt.');
  const allUploadObjects=state.objects.filter(o=>o.uxUploadId),allUploads=[...new Set(allUploadObjects.map(o=>o.uxUploadId))];
  const usedObjects=state.objects.filter(o=>!o.uxHidden&&o.role!=='guide'&&o.uxUploadId),used=new Set(usedObjects.map(o=>o.uxUploadId));
  if (allUploads.length>4 || allUploads.some(id=>typeof id!=='string'||!id)) fail('photo_count','Höchstens vier eindeutig zugeordnete Fotos und Logos.');
  for (const o of state.objects) if (!o.uxHidden&&o.role!=='guide'&&o.type==='photoSlot'&&o.required&&!o.uxUploadId)
    fail('required_photo','Ein erforderliches eigenes Foto fehlt.');
  const media=[],reopeningMedia=[],blockers=[...compatibilityBlockers];
  for (const id of allUploads) {
    const asset=files.get(id),objects=allUploadObjects.filter(o=>o.uxUploadId===id);
    if (!asset?.file) fail('missing_original','Originalfoto fehlt: '+id);
    if (objects.some(o=>!['photo','logo'].includes(o.uxUploadKind))) fail('photo_kind','Die Art eines hochgeladenen Bildes fehlt.');
    if (objects.some(o=>o.uxUploadKind==='photo'&&!['remove','keep'].includes(o.uxPhotoBackground)))
      fail('photo_background','Der Freistellwunsch muss ausdrücklich mitgeführt werden.');
    if (asset.edited===true&&!asset.blob || asset.photoEdit!==undefined&&!asset.blob) fail('missing_edited','Die bearbeitete Bilddatei fehlt.');
    const original=await encodeFile(asset.file,'Originalfoto'),edited=asset.blob?await encodeFile(asset.blob,'Bearbeitetes Foto'):null;
    if (used.has(id)) media.push({id,original,...(edited?{edited}:{})});
    const entry={id,objectIds:objects.map(o=>o.id)};
    if (!used.has(id)) {
      entry.original=original;if(edited)entry.edited=edited;
      blockers.push({code:'hidden_photo_not_persisted',uploadId:id,message:'Ein ausgeblendetes Bild bleibt im lokalen Wiederöffnungsstand; der native Vertrag nimmt nur verwendete Bilder an.'});
    }
    if (asset.width!==undefined||asset.height!==undefined) {
      if (![asset.width,asset.height].every(n=>Number.isSafeInteger(n)&&n>0)) fail('photo_dimensions','Die Abmessungen der bearbeiteten Datei fehlen.');
      entry.width=asset.width;entry.height=asset.height;
    }
    if (asset.photoEdit!==undefined) {
      entry.photoEdit=photoEdit(asset.photoEdit);
      // URLs remain in the editor. Only an explicit relationship to the two
      // preserved image versions can be represented in reopening metadata.
      entry.editSource=asset.editSourceUrl&&asset.originalUrl&&asset.editSourceUrl===asset.originalUrl?'original':
        asset.editSourceUrl&&asset.url&&asset.editSourceUrl===asset.url?'edited':'unresolved';
      blockers.push({code:'photo_edit_not_persisted',uploadId:id,message:'Der bestehende Serververtrag speichert Original und Ergebnis, aber keine vollständigen photoEdit-Parameter.'});
      if (entry.editSource==='unresolved') blockers.push({code:'photo_edit_source_unresolved',uploadId:id,message:'Die Bearbeitungsquelle ist keiner gesicherten Bildfassung eindeutig zugeordnet.'});
    } else if (edited) blockers.push({code:'photo_edit_metadata_missing',uploadId:id,message:'Eine bearbeitete Datei ist vorhanden, ihre Wiederöffnungsparameter fehlen.'});
    reopeningMedia.push(entry);
  }
  if (typeof preview!=='string'||preview.length>3*1024*1024) fail('preview_size','Die Gestaltungsvorschau fehlt oder überschreitet das native Limit.');
  const input={productId:binding.id,productRevision:binding.revision,...state,quantity,media,
    preview:base64String(preview,'Gestaltungsvorschau',3*1024*1024)};
  // Exact native media keys are intentional. Do not sneak reopening data into
  // the strict server contract or mislabel photoEdit as the different uxPhotoCrop.
  return {input,body:{input},reopening:{schema:'gravuru-pilot-reopening/v1',productId:binding.id,productRevision:binding.revision,designId:state.designId,editorOnly,templateFields,media:reopeningMedia},
    gates:{nativeSendAllowed:!blockers.length,requiresAuthenticatedTestTransport:true,serverValidationRequired:true,
      checkoutAllowed:false,productionAllowed:false,reopeningPersistenceComplete:!blockers.length,blockers}};
}
