import {PHOTO_REOPENING_SCHEMA,PHOTO_REOPENING_LIMITS} from './photo-reopening.mjs';
export const PHOTO_REOPENING_WIRE_SCHEMA='gravuru-photo-reopening-wire/v1';
export const EXISTING_NATIVE_REQUEST_LIMIT=100*1024*1024;
const fail=(code,message)=>{throw Object.assign(Error(message),{status:413,code});};
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,list)=>{if(!record(v)||Object.keys(v).some(k=>!list.includes(k)))fail('photo_transport_contract','Unbekannter Foto-Transportvertrag.');};
function packetShape(packet){
  keys(packet,['schema','binding','documents','media','nativeInputSha256','blobs','integrity']);
  if(packet.schema!==PHOTO_REOPENING_SCHEMA||!record(packet.blobs)||Object.keys(packet.blobs).length>PHOTO_REOPENING_LIMITS.maxBlobs)fail('photo_transport_contract','Ungültiges Fotopaket.');
}
function description(id,value){
  if(!/^[a-f0-9]{64}$/.test(value.sha256||'')||id!=='sha256:'+value.sha256||!['image/png','image/jpeg','image/webp'].includes(value.mimeType)||
    !Number.isSafeInteger(value.bytes)||value.bytes<1||value.bytes>PHOTO_REOPENING_LIMITS.maxBlobBytes)fail('photo_transport_contract','Ungültige Bildbeschreibung.');
}
function media(input){
  if(!record(input)||!Array.isArray(input.media)||input.media.length>4)fail('photo_transport_contract','Native Bildzuordnung fehlt.');
  for(const m of input.media){keys(m,['id','original','edited']);if(typeof m.id!=='string'||typeof m.original!=='string'||m.edited!==undefined&&typeof m.edited!=='string')fail('photo_transport_contract','Ungültiges natives Bild.');}
  return input.media;
}
/** Encode the complete HTTP body once. Send serializedBody exactly; it is immutable.
 *  Native input bytes are referenced, never duplicated in reopening.blobs.
 *  The structural encoder is not an image/rights validator or a send authorization.
 */
export function encodePhotoReopeningTransport({packet,input,expectedRevision,maxRequestBytes=EXISTING_NATIVE_REQUEST_LIMIT}){
  packetShape(packet);const native=media(input),blobs={};let total=0;
  if(!Number.isSafeInteger(maxRequestBytes)||maxRequestBytes<1||maxRequestBytes>EXISTING_NATIVE_REQUEST_LIMIT)fail('photo_transport_limit','Das bestehende Requestlimit darf nicht erhöht werden.');
  for(const [id,value]of Object.entries(packet.blobs)){
    keys(value,['sha256','mimeType','bytes','base64']);description(id,value);total+=value.bytes;
    if(total>PHOTO_REOPENING_LIMITS.maxTotalBytes||typeof value.base64!=='string'||value.base64.length!==Math.ceil(value.bytes/3)*4)fail('photo_transport_contract','Ungültiger Bildumfang.');
    let nativeRef=null;
    for(let index=0;index<native.length&&!nativeRef;index++)for(const field of ['original','edited'])if(native[index][field]===value.base64){nativeRef={mediaIndex:index,field};break;}
    const {base64,...metadata}=value;blobs[id]=nativeRef?{...metadata,nativeRef}:{...metadata,base64};
  }
  const reopening={schema:PHOTO_REOPENING_WIRE_SCHEMA,packet:{...packet,blobs}},body={input,reopening};
  if(expectedRevision!==undefined){if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)fail('photo_transport_revision','Erwartete Entwurfsrevision fehlt.');body.expectedRevision=expectedRevision;}
  const serializedBody=JSON.stringify(body),byteLength=new TextEncoder().encode(serializedBody).length;
  if(byteLength>maxRequestBytes)fail('photo_transport_size','Gestaltung einschließlich Fotos überschreitet die vorhandene Uploadgrenze. Es wurde nichts gesendet.');
  return {serializedBody,byteLength,transportSchema:PHOTO_REOPENING_WIRE_SCHEMA,gates:{transportFitsExistingBodyLimit:true,serverPersistenceSupported:false,nativeSendAllowed:false}};
}
/** Server-side expansion after the existing bounded HTTP body reader. No URL,
 *  path or arbitrary object key can be referenced. Core validation follows it.
 */
export function hydratePhotoReopeningTransport({reopening,input}){
  keys(reopening,['schema','packet']);if(reopening.schema!==PHOTO_REOPENING_WIRE_SCHEMA)fail('photo_transport_version','Nicht unterstützte Foto-Transportversion.');
  packetShape(reopening.packet);const native=media(input),blobs={};let total=0;
  for(const [id,value]of Object.entries(reopening.packet.blobs)){
    keys(value,['sha256','mimeType','bytes','base64','nativeRef']);description(id,value);total+=value.bytes;
    if(total>PHOTO_REOPENING_LIMITS.maxTotalBytes||(value.base64!==undefined)===(value.nativeRef!==undefined))fail('photo_transport_contract','Bildquelle muss genau einmal angegeben sein.');
    let base64=value.base64;
    if(value.nativeRef!==undefined){
      keys(value.nativeRef,['mediaIndex','field']);const {mediaIndex,field}=value.nativeRef;
      if(!Number.isSafeInteger(mediaIndex)||mediaIndex<0||mediaIndex>=native.length||!['original','edited'].includes(field))fail('photo_transport_reference','Ungültiger Verweis auf native Bilddaten.');
      base64=native[mediaIndex][field];
    }
    if(typeof base64!=='string'||base64.length!==Math.ceil(value.bytes/3)*4)fail('photo_transport_reference','Referenzierte Bildbytes fehlen oder haben die falsche Größe.');
    blobs[id]={sha256:value.sha256,mimeType:value.mimeType,bytes:value.bytes,base64};
  }
  // Referenced strings remain shared with input; no second Base64 payload is allocated here.
  return {...reopening.packet,blobs};
}
