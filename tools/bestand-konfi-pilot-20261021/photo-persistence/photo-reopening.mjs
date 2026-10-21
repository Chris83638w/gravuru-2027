// Private, network-free persistence proposal. Never applies state to the editor.
// The deployed contract at bf5c059 does NOT accept this sidecar.
export const PHOTO_REOPENING_SCHEMA = 'gravuru-photo-reopening/v1';
export const PHOTO_REOPENING_LIMITS = Object.freeze({maxPhotos:4,maxBlobs:12,maxBlobBytes:15*1024*1024,maxTotalBytes:60*1024*1024,maxMetadataBytes:2*1024*1024,maxJsonBytes:84*1024*1024});
const CFG = /^cfg_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const HEX = /^[a-f0-9]{64}$/;
const MIME = ['image/jpeg','image/png','image/webp'];
const EDIT_KEYS = ['angle','flip','zoom','x','y','shape','color'];
const ASSET_BINARY_KEYS = new Set(['file','blob','editSourceBlob','url','originalUrl','editSourceUrl']);
const PROTECTED_FIELDS = ['customerEditable','technicalLocked','locked','role','surfaceId','acrylicFixed','photoMaskAssetId','assetId'];
const fail = (code,message) => {throw Object.assign(new Error(message),{code});};
const record = v => v!==null && typeof v==='object' && !Array.isArray(v) && [Object.prototype,null].includes(Object.getPrototypeOf(v));
const clone = v => structuredClone(v);
const canonical = v => Array.isArray(v)?'['+v.map(canonical).join(',')+']':record(v)?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const equal = (a,b) => canonical(a)===canonical(b);
const exactKeys = (v,allowed,label) => {if(!record(v)||Object.keys(v).some(k=>!allowed.includes(k)))fail('invalid_shape',label);};
function jsonData(value,depth=0) {
  if(depth>40)fail('metadata_depth','Zu tief verschachtelte Metadaten.');
  if(value===null||['string','boolean'].includes(typeof value))return;
  if(typeof value==='number'&&Number.isFinite(value))return;
  if(Array.isArray(value)){for(const v of value)jsonData(v,depth+1);return;}
  if(record(value)){
    for(const [k,v] of Object.entries(value)){
      if(['__proto__','prototype','constructor'].includes(k))fail('unsafe_key','Unzulässiger Metadatenschlüssel.');
      jsonData(v,depth+1);
    }return;
  }
  fail('invalid_json','Metadaten müssen vollständige JSON-Daten sein.');
}
function jsonSnapshot(value) {
  jsonData(value);
  if(new TextEncoder().encode(JSON.stringify(value)).length>PHOTO_REOPENING_LIMITS.maxMetadataBytes)fail('metadata_size','Metadaten sind zu groß.');
  return clone(value);
}
async function sha(bytes) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
async function jsonSha(value) {return sha(new TextEncoder().encode(canonical(value)));}
function b64(bytes) {let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
function decode(value,size) {
  if(typeof value!=='string'||value.length!==Math.ceil(size/3)*4||value.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))fail('base64','Ungültige Bildkodierung.');
  let binary;try{binary=atob(value);}catch{fail('base64','Ungültige Bildkodierung.');}
  if(binary.length!==size||btoa(binary)!==value)fail('base64','Nicht kanonische Bildkodierung.');
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
function checkBlob(blob) {
  if(!(blob instanceof Blob)||!MIME.includes(blob.type)||blob.size<1||blob.size>PHOTO_REOPENING_LIMITS.maxBlobBytes)fail('image_file','JPG/PNG/WebP bis 15 MB erforderlich.');
}
function checkEdit(edit) {
  exactKeys(edit,EDIT_KEYS,'Unbekannte Fotobearbeitungsparameter.');
  if(EDIT_KEYS.some(k=>edit[k]===undefined)||![edit.angle,edit.flip,edit.zoom,edit.x,edit.y].every(Number.isFinite)||
    ![1,-1].includes(edit.flip)||edit.zoom<1||edit.zoom>4||Math.abs(edit.x)>1||Math.abs(edit.y)>1||Math.abs(edit.angle)>3600||
    !['original','square','portrait','landscape','circle'].includes(edit.shape)||!['original','grayscale','sepia'].includes(edit.color))fail('photo_edit','Ungültige oder unvollständige Fotobearbeitung.');
}
function dimensions(metadata) {
  if(metadata.width!==undefined||metadata.height!==undefined)
    if(![metadata.width,metadata.height].every(v=>Number.isSafeInteger(v)&&v>0&&v<=100000))fail('dimensions','Ungültige Bildabmessungen.');
}
function modelBinding(model,designId) {
  const b=model?.configuration,p=model?.universal?.profile;
  if(!CFG.test(b?.id||'')||!Number.isSafeInteger(b.revision)||b.revision<1||p?.id!==b.id||p?.binding?.productId!==b.id||p?.revision!==b.id+':'+b.revision)fail('product_binding','Feste Produkt-/Profilrevision erforderlich.');
  const template=p.designs?.find(d=>d.id===designId);
  if(!template||!Array.isArray(template.objects))fail('design_binding','Design gehört nicht zum Produkt.');
  return {binding:{productId:b.id,productRevision:b.revision,profileRevision:p.revision,designId},profile:p,templateObjects:template.objects};
}
function objectsOf(draft) {
  if(draft?.schema==='gravuru-customer-design/v2')return draft.state?.objects;
  if(draft?.schema==='gravuru-universal-customer-draft/v1')return draft.design?.objects;
  fail('draft_schema','Nicht unterstütztes Entwurfsformat.');
}
function nativeBinding(input,binding,documents) {
  if(input.productId!==binding.productId||input.productRevision!==binding.productRevision||input.designId!==binding.designId)fail('native_binding','Native Eingabe gehört zu einer anderen Produktrevision.');
  const options=documents.draft.state?.mOptions??documents.draft.options??{};
  if(!equal(input.objects,objectsOf(documents.draft))||!record(input.options)||Object.keys(options).some(k=>!equal(options[k],input.options[k])))
    fail('native_state_mismatch','Native Eingabe und gesicherter Entwurf beschreiben unterschiedliche Inhalte.');
}
function nativeMediaBinding(input,media,blobs) {
  const active=new Set(input.objects.filter(o=>!o.uxHidden&&o.role!=='guide'&&o.uxUploadId).map(o=>o.uxUploadId));
  if(!Array.isArray(input.media)||input.media.length!==active.size||new Set(input.media.map(m=>m?.id)).size!==active.size)fail('native_media_mismatch','Native Bildzuordnung ist nicht vollständig.');
  for(const entry of input.media){
    exactKeys(entry,['id','original','edited'],'Unbekannte native Medienfelder.');
    const preserved=media.find(m=>m.id===entry.id);
    if(!active.has(entry.id)||!preserved||entry.original!==blobs[preserved.original.blobId]?.base64||
      entry.edited!==(preserved.edited?blobs[preserved.edited.blobId]?.base64:undefined))fail('native_media_mismatch','Native Bestellung und Wiederöffnungsstand enthalten unterschiedliche Bildfassungen.');
  }
}
function validateDocuments(documents,binding,profile,templateObjects) {
  exactKeys(documents,['draft','editorState','templateObjects'],'Unbekannte Dokumentfelder.');
  const {draft,editorState:state}=documents,objects=objectsOf(draft);
  if(draft.productId!==binding.productId||draft.profileId!==binding.productId||draft.profileRevision!==binding.profileRevision||state?.designId!==binding.designId||
    (draft.state?.designId??draft.design?.id)!==binding.designId)fail('draft_binding','Entwurf oder Editor gehört zu einer anderen Produktrevision.');
  if(state.width!==profile.geometry?.width||state.height!==profile.geometry?.height||
    draft.schema==='gravuru-customer-design/v2'&&(draft.state.width!==state.width||draft.state.height!==state.height))fail('geometry','Geometrie wird nicht umgerechnet.');
  if(!Array.isArray(objects)||!Array.isArray(state.objects)||objects.length>120||state.objects.length!==objects.length||
    new Set(state.objects.map(o=>o?.id)).size!==objects.length)fail('objects','Objektzuordnung ist nicht eindeutig.');
  for(let i=0;i<objects.length;i++){
    const serialized=objects[i],raw=state.objects[i];
    if(!record(serialized)||!record(raw)||typeof raw.id!=='string'||!raw.id||raw.id!==serialized.id||
      Object.keys(serialized).some(k=>!equal(serialized[k],raw[k])))fail('draft_state_mismatch','Entwurf und vollständiger Editorzustand widersprechen sich.');
  }
  const options=draft.state?.mOptions??draft.options??{};
  if(!equal(options,state.mOptions??{}))fail('draft_state_mismatch','Ausführungsoptionen stimmen nicht überein.');
  if(!equal(documents.templateObjects,templateObjects))fail('template_mismatch','Vorlagendaten stimmen nicht mit dem fest gebundenen Serverprodukt überein.');
  return state.objects;
}
function protectionBlockers(objects,templateObjects) {
  const blockers=[];
  for(const object of objects){
    const original=templateObjects.find(o=>o.id===object.id);
    if(!original)continue;
    for(const field of PROTECTED_FIELDS){
      if(original[field]!==undefined&&!equal(original[field],object[field]))blockers.push({code:'protected_template_field_changed',objectId:object.id,field});
      else if(original[field]===undefined&&object[field]!==undefined)blockers.push({code:'unverified_template_field_added',objectId:object.id,field});
    }
  }
  return blockers;
}
function gates(objects,templateObjects) {
  return {localRoundtripComplete:true,serverPersistenceSupported:false,nativeSendAllowed:false,checkoutAllowed:false,productionAllowed:false,
    stateApplicationAllowed:false,requiresServerObjectRightsValidation:true,
    blockers:[{code:'server_photo_persistence_not_deployed'},...protectionBlockers(objects,templateObjects)]};
}
function references(objects) {
  const used=new Map();
  for(const o of objects){
    if(o.uxUploadId===undefined)continue;
    if(typeof o.uxUploadId!=='string'||!o.uxUploadId||!['photo','logo'].includes(o.uxUploadKind)||
      (o.uxUploadKind==='photo'&&!['keep','remove'].includes(o.uxPhotoBackground)))fail('photo_reference','Fotozuordnung oder Freistellwunsch fehlt.');
    if(!used.has(o.uxUploadId))used.set(o.uxUploadId,[]);
    used.get(o.uxUploadId).push(o.id);
  }
  if(used.size>PHOTO_REOPENING_LIMITS.maxPhotos)fail('photo_count','Höchstens vier referenzierte Bilder.');
  return used;
}
function fileDetails(blob) {
  const result={};
  if(typeof blob.name==='string')result.name=blob.name;
  if(blob.lastModified!==undefined){if(!Number.isSafeInteger(blob.lastModified)||blob.lastModified<0)fail('file_metadata','Ungültiger Dateizeitpunkt.');result.lastModified=blob.lastModified;}
  return result;
}

/** Capture only currently referenced images, including hidden/guide objects.
 *  editorState is the state BEFORE September cleanObject strips native fields.
 *  editSourceBlob is optional explicit source data when URL-to-Blob history is absent.
 *  No URLs are fetched or persisted; no credentials or network clients accepted.
 */
export async function capturePhotoReopening({model,draft,editorState,files,nativeInput}) {
  const modelCopy=jsonSnapshot(model),draftCopy=jsonSnapshot(draft),stateCopy=jsonSnapshot(editorState);
  const {binding,profile,templateObjects}=modelBinding(modelCopy,stateCopy.designId);
  const documents={draft:draftCopy,editorState:stateCopy,templateObjects:clone(templateObjects)};
  const objects=validateDocuments(documents,binding,profile,templateObjects),used=references(objects);
  if(!(files instanceof Map))fail('files','Editor-Dateizuordnung fehlt.');
  const snapshots=new Map(),sources=new Map();
  const index=(url,blob)=>{if(typeof url==='string'&&url&&blob instanceof Blob){const list=sources.get(url)||[];list.push(blob);sources.set(url,list);}};
  for(const [id,asset] of files){
    if(!record(asset))fail('file_record','Ungültiger Dateieintrag.');
    // Snapshot all URL-to-Blob relations before the first await. Blob bytes are immutable.
    index(asset.url,asset.blob||asset.file);index(asset.originalUrl,asset.file);index(asset.editSourceUrl,asset.editSourceBlob);
    if(!used.has(id))continue;
    const metadata=jsonSnapshot(Object.fromEntries(Object.entries(asset).filter(([k])=>!ASSET_BINARY_KEYS.has(k))));
    snapshots.set(id,{file:asset.file,blob:asset.blob,editSourceBlob:asset.editSourceBlob,url:asset.url,editSourceUrl:asset.editSourceUrl,metadata});
  }
  let nativeInputSha256,nativeCopy;
  if(nativeInput!==undefined){
    jsonData(nativeInput);
    nativeBinding(nativeInput,binding,documents);
    nativeCopy=clone(nativeInput);nativeInputSha256=await jsonSha(nativeCopy);
  }
  const blobs={},cache=new WeakMap();let total=0;
  async function saveBlob(blob){
    checkBlob(blob);if(cache.has(blob))return cache.get(blob);
    const bytes=new Uint8Array(await blob.arrayBuffer()),hash=await sha(bytes),id='sha256:'+hash;
    if(blobs[id]&&blobs[id].mimeType!==blob.type)fail('mime_conflict','Identische Bytes mit widersprüchlichem MIME-Typ.');
    if(!blobs[id]){
      total+=bytes.length;if(total>PHOTO_REOPENING_LIMITS.maxTotalBytes||Object.keys(blobs).length>=PHOTO_REOPENING_LIMITS.maxBlobs)fail('package_size','Sicherung überschreitet die Paketgrenze.');
      blobs[id]={sha256:hash,mimeType:blob.type,bytes:bytes.length,base64:b64(bytes)};
    }
    cache.set(blob,id);return id;
  }
  const media=[];
  for(const [id,objectIds] of used){
    const asset=snapshots.get(id);if(!asset?.file)fail('missing_original','Originalbild fehlt.');
    const metadata=asset.metadata;dimensions(metadata);
    if(asset.blob&&!metadata.photoEdit)fail('missing_photo_edit','Bearbeitetes Ergebnis ohne Wiederöffnungsparameter.');
    if(metadata.photoEdit){checkEdit(metadata.photoEdit);if(!asset.blob)fail('missing_edited','Bearbeitetes Ergebnis fehlt.');}
    if(metadata.edited===true&&!asset.blob)fail('missing_edited','Bearbeitetes Ergebnis fehlt.');
    const original={blobId:await saveBlob(asset.file),...fileDetails(asset.file)};
    const edited=asset.blob?{blobId:await saveBlob(asset.blob)}:null;
    let editSourceId=original.blobId;
    if(metadata.photoEdit){
      const sourceUrl=asset.editSourceUrl||asset.url;
      const candidates=asset.editSourceBlob?[asset.editSourceBlob]:(sources.get(sourceUrl)||[]);
      if(!candidates.length)fail('missing_edit_source','Die tatsächlichen Bytes der Bearbeitungsquelle fehlen. Keine URL wird nachgeladen.');
      const ids=new Set();for(const candidate of candidates)ids.add(await saveBlob(candidate));
      if(ids.size!==1)fail('ambiguous_edit_source','Eine Quell-URL bezeichnet verschiedene Bildfassungen.');
      editSourceId=[...ids][0];
    }
    media.push({id,objectIds:clone(objectIds),original,...(edited?{edited}:{}),editSource:{blobId:editSourceId},metadata});
  }
  if(nativeCopy)nativeMediaBinding(nativeCopy,media,blobs);
  const metadata={schema:PHOTO_REOPENING_SCHEMA,binding,documents,media,...(nativeInputSha256?{nativeInputSha256}:{})};
  jsonSnapshot(metadata);
  const body={...metadata,blobs},packet={...body,integrity:{algorithm:'sha256',sha256:await jsonSha(body)}};
  return {packet,gates:gates(objects,templateObjects)};
}

/** Portable structural/integrity verification for a future private server store.
 *  Hashes detect corruption, NOT authorship. Image decoding and rights checks
 *  remain required; this function neither authenticates nor writes files.
 */
export async function validatePhotoReopening({packet,model,nativeInput}) {
  let value=packet;
  if(typeof value==='string'){
    if(value.length>PHOTO_REOPENING_LIMITS.maxJsonBytes)fail('package_size','Sicherung ist zu groß.');
    try{value=JSON.parse(value);}catch{fail('invalid_json','Ungültige Sicherungsdatei.');}
  }
  exactKeys(value,['schema','binding','documents','media','nativeInputSha256','blobs','integrity'],'Unbekannte Paketfelder.');
  if(value.schema!==PHOTO_REOPENING_SCHEMA)fail('schema','Unbekannte Sicherungsversion.');
  exactKeys(value.integrity,['algorithm','sha256'],'Ungültige Integritätsangabe.');
  if(value.integrity.algorithm!=='sha256'||!HEX.test(value.integrity.sha256))fail('integrity','Prüfsumme fehlt.');
  exactKeys(value.binding,['productId','productRevision','profileRevision','designId'],'Ungültige Produktbindung.');
  if(!Array.isArray(value.media)||value.media.length>PHOTO_REOPENING_LIMITS.maxPhotos||!record(value.blobs)||Object.keys(value.blobs).length>PHOTO_REOPENING_LIMITS.maxBlobs)fail('package_size','Zu viele Bilddaten.');
  const {blobs:inputBlobs,integrity,...inputMetadata}=value;
  const metadata=jsonSnapshot(inputMetadata),binaryRecords={};let total=0;
  for(const [id,data] of Object.entries(inputBlobs)){
    exactKeys(data,['sha256','mimeType','bytes','base64'],'Unbekannte Binärfelder.');
    if(!HEX.test(data.sha256)||id!=='sha256:'+data.sha256||!MIME.includes(data.mimeType)||!Number.isSafeInteger(data.bytes)||data.bytes<1||data.bytes>PHOTO_REOPENING_LIMITS.maxBlobBytes)fail('blob_record','Ungültige Binärbeschreibung.');
    if(typeof data.base64!=='string'||data.base64.length!==Math.ceil(data.bytes/3)*4)fail('base64','Bildkodierung überschreitet ihre deklarierte Größe.');
    total+=data.bytes;if(total>PHOTO_REOPENING_LIMITS.maxTotalBytes)fail('package_size','Zu große Bildsumme.');
    // Copy individual string-bearing records before awaiting so caller mutations cannot race validation.
    binaryRecords[id]={...data};
  }
  const content={...metadata,blobs:binaryRecords},expectedHash=integrity.sha256;
  const current=jsonSnapshot(model),known=modelBinding(current,metadata.binding.designId);
  if(!equal(known.binding,metadata.binding))fail('product_binding','Sicherung gehört zu einer anderen Produktrevision.');
  const objects=validateDocuments(metadata.documents,known.binding,known.profile,known.templateObjects),used=references(objects);
  let nativeCopy;
  if(metadata.nativeInputSha256!==undefined){
    if(!HEX.test(metadata.nativeInputSha256)||!nativeInput)fail('native_input_required','Die zugehörige native Eingabe muss zur Prüfung vorliegen.');
    jsonData(nativeInput);nativeCopy=clone(nativeInput);nativeBinding(nativeCopy,known.binding,metadata.documents);
    if(await jsonSha(nativeCopy)!==metadata.nativeInputSha256)fail('native_input_mismatch','Sicherung und native Eingabe gehören nicht zusammen.');
  }
  if(await jsonSha(content)!==expectedHash)fail('integrity','Die Sicherung wurde verändert oder ist beschädigt.');
  const decoded=new Map();
  for(const [id,data] of Object.entries(binaryRecords)){
    const bytes=decode(data.base64,data.bytes);
    if(await sha(bytes)!==data.sha256)fail('blob_integrity','Bilddatei stimmt nicht mit ihrer Prüfsumme überein.');
    decoded.set(id,new Blob([bytes],{type:data.mimeType}));
  }
  const referenced=new Set(),ids=new Set();
  for(const entry of metadata.media){
    exactKeys(entry,['id','objectIds','original','edited','editSource','metadata'],'Unbekannte Medienfelder.');
    if(!used.has(entry.id)||ids.has(entry.id)||!equal(entry.objectIds,used.get(entry.id)))fail('media_binding','Bildzuordnung stimmt nicht mit dem Editorzustand überein.');
    ids.add(entry.id);exactKeys(entry.original,['blobId','name','lastModified'],'Ungültiges Original.');
    if(entry.original.name!==undefined&&typeof entry.original.name!=='string'||entry.original.lastModified!==undefined&&(!Number.isSafeInteger(entry.original.lastModified)||entry.original.lastModified<0))fail('file_metadata','Ungültige Originalmetadaten.');
    if(entry.edited)exactKeys(entry.edited,['blobId'],'Ungültiges Ergebnis.');
    exactKeys(entry.editSource,['blobId'],'Ungültige Bearbeitungsquelle.');
    for(const ref of [entry.original,entry.edited,entry.editSource].filter(Boolean)){
      if(typeof ref.blobId!=='string'||!decoded.has(ref.blobId))fail('missing_blob','Referenzierte Bilddatei fehlt.');referenced.add(ref.blobId);
    }
    if(!record(entry.metadata)||Object.keys(entry.metadata).some(k=>ASSET_BINARY_KEYS.has(k)))fail('asset_metadata','Datei-/URL-Felder sind nicht als Metadaten zulässig.');
    dimensions(entry.metadata);
    if(entry.edited&&!entry.metadata.photoEdit||entry.metadata.edited===true&&!entry.edited)fail('missing_photo_edit','Bildbearbeitungsstand ist unvollständig.');
    if(entry.metadata.photoEdit){checkEdit(entry.metadata.photoEdit);if(!entry.edited)fail('missing_edited','Bearbeitetes Ergebnis fehlt.');}
    else if(entry.editSource.blobId!==entry.original.blobId)fail('edit_source','Ein unbearbeitetes Foto muss das Original als Quelle behalten.');
  }
  if(ids.size!==used.size||referenced.size!==decoded.size)fail('media_binding','Bilder fehlen oder unzugeordnete Dateien sind enthalten.');
  if(nativeCopy)nativeMediaBinding(nativeCopy,metadata.media,binaryRecords);
  return {binding:clone(known.binding),draft:clone(metadata.documents.draft),candidateEditorState:clone(metadata.documents.editorState),
    templateObjects:clone(known.templateObjects),media:clone(metadata.media),blobs:decoded,packetSha256:expectedHash,gates:gates(objects,known.templateObjects)};
}

/** Restore URL-backed file records only after full structural verification.
 *  No state is applied to an editor; returned state remains a rights-unverified candidate.
 */
export async function restorePhotoReopening({packet,model,nativeInput,createObjectURL,revokeObjectURL}) {
  if(typeof createObjectURL!=='function'||typeof revokeObjectURL!=='function')fail('url_adapter','Lokale URL-Erzeugung und Freigabe müssen ausdrücklich bereitgestellt werden.');
  const validated=await validatePhotoReopening({packet,model,nativeInput}),decoded=validated.blobs;
  const urls=new Map(),created=[],files=new Map();let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;for(const url of created)revokeObjectURL(url);};
  const urlFor=id=>{if(!urls.has(id)){const url=createObjectURL(decoded.get(id));if(typeof url!=='string'||!url.startsWith('blob:'))fail('url_adapter','URL-Erzeuger muss eine lokale Blob-URL liefern.');urls.set(id,url);created.push(url);}return urls.get(id);};
  try{
    for(const entry of validated.media){
      const blob=decoded.get(entry.original.blobId);
      const file=entry.original.name!==undefined?new File([blob],entry.original.name,{type:blob.type,lastModified:entry.original.lastModified??0}):blob;
      files.set(entry.id,{...clone(entry.metadata),file,...(entry.edited?{blob:decoded.get(entry.edited.blobId)}:{}),
        originalUrl:urlFor(entry.original.blobId),url:urlFor(entry.edited?.blobId??entry.original.blobId),
        editSourceUrl:urlFor(entry.editSource.blobId),editSourceBlob:decoded.get(entry.editSource.blobId)});
    }
  }catch(error){dispose();throw error;}
  return {binding:validated.binding,draft:validated.draft,candidateEditorState:validated.candidateEditorState,
    templateObjects:validated.templateObjects,files,dispose,gates:validated.gates};
}
