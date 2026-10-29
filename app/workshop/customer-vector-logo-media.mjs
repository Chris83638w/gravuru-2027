import {createHash} from 'node:crypto';
import {prepareCustomerVectorLogo,MAX_CUSTOMER_VECTOR_LOGO_BYTES} from './customer-vector-logo.mjs';
import {vectorLogoAllowed} from '../configurator/variant-m/contract.mjs';

// Customer SVGs are accepted only through this bounded, server-verified path.
// A browser acknowledgement records what was shown; it never blesses SVG bytes.
export const VECTOR_LOGO_MEDIA_BYTES=MAX_CUSTOMER_VECTOR_LOGO_BYTES;
export const VECTOR_LOGO_REQUEST_BYTES=Math.ceil(VECTOR_LOGO_MEDIA_BYTES/3)*4+4096;
const checked=new WeakMap(),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'customer_vector_logo'});};
export function assertVectorLogoEnabled(config){
 if(!vectorLogoAllowed(config))fail('Der Vektorlogo-Upload ist für diesen Produktstand nicht freigegeben.');
}
export function vectorLogoMetadata(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3||value.version!=='svg-black-v1'||!['sourceSha256','outputSha256'].every(k=>typeof value[k]==='string'&&/^[a-f0-9]{64}$/.test(value[k])))fail('Bitte die schwarze Logo-Vorschau prüfen und bestätigen.');
 return {version:value.version,sourceSha256:value.sourceSha256,outputSha256:value.outputSha256};
}
export function vectorLogoBytes(value){
 if(Buffer.isBuffer(value)){if(!value.length||value.length>VECTOR_LOGO_MEDIA_BYTES)fail('Die SVG-Datei ist leer oder zu groß.');return value;}
 if(typeof value!=='string'||!value.length||value.length>Math.ceil(VECTOR_LOGO_MEDIA_BYTES/3)*4||value.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))fail('Die SVG-Datei ist unvollständig oder zu groß.');
 const bytes=Buffer.from(value,'base64');if(bytes.toString('base64')!==value||bytes.length>VECTOR_LOGO_MEDIA_BYTES)fail('Die SVG-Datei ist unvollständig oder zu groß.');return bytes;
}
const metadata=result=>({version:result.version,sourceSha256:result.sourceSha256||result.sha256,outputSha256:result.outputSha256});
export async function customerVectorLogoPreview(config,input){
 assertVectorLogoEnabled(config);
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['productId','productRevision','name','original'].includes(k)))fail('Bitte nur die SVG-Logodatei für dieses Produkt übergeben.');
 const result=await prepareCustomerVectorLogo({name:input.name,bytes:vectorLogoBytes(input.original)});
 return {...metadata(result),width:result.width,height:result.height,svg:result.svg.toString('base64'),preview:result.preview.toString('base64'),warnings:result.warnings,detailCheck:result.detailCheck,minFeatureUnits:result.minFeatureUnits};
}
export async function verifyCustomerVectorLogoMedia(config,object,media){
 assertVectorLogoEnabled(config);
 if(object?.type!=='image'||object.uxUploadKind!=='logo'||!object.uxUploadId)fail('Diese SVG-Datei gehört zu keinem Logo.');
 const approval=vectorLogoMetadata(object.uxVectorLogo),submitted=vectorLogoMetadata(media.vectorLogo);
 if(JSON.stringify(approval)!==JSON.stringify(submitted))fail('Die Logo-Bestätigung passt nicht zur Gestaltung. Bitte erneut bestätigen.');
 const original=vectorLogoBytes(media.original),edited=vectorLogoBytes(media.edited);
 if(sha(original)!==approval.sourceSha256||sha(edited)!==approval.outputSha256)fail('Die Logo-Datei wurde nach der Vorschau geändert. Bitte erneut bestätigen.');
 const result=await prepareCustomerVectorLogo({name:media.name||'logo.svg',bytes:original});
 if(JSON.stringify(metadata(result))!==JSON.stringify(approval)||!result.svg.equals(edited))fail('Die schwarze Logo-Fassung stimmt nicht mit der geprüften Vorschau überein. Bitte erneut bestätigen.');
 return {...result,vectorLogo:approval};
}

// The synchronous account store accepts SVG only after asynchronous conversion.
// The private seal is bound to the exact object and bytes, never client JSON.
export function verifiedAccountVectorLogo(photo,result){
 const value={...photo,original:result.original,edited:result.svg,vectorLogo:result.vectorLogo};
 checked.set(value,{source:sha(value.original),output:sha(value.edited),metadata:JSON.stringify(vectorLogoMetadata(value.vectorLogo))});return value;
}
export function isVerifiedAccountVectorLogo(photo){
 const entry=checked.get(photo);return !!entry&&Buffer.isBuffer(photo.original)&&Buffer.isBuffer(photo.edited)&&sha(photo.original)===entry.source&&sha(photo.edited)===entry.output&&JSON.stringify(vectorLogoMetadata(photo.vectorLogo))===entry.metadata;
}

// Frozen packages are hash checked by readReviewPackage. Require the additional
// logo/object agreement before inserting passive vector paths into production.
export function customerVectorLogoFragment(entry,object,files){
 const approval=vectorLogoMetadata(object.uxVectorLogo),saved=vectorLogoMetadata(entry.vectorLogo);
 const original=files.get(entry.path),output=files.get(entry.edited?.path);
 if(entry.kind!=='vector-logo'||JSON.stringify(saved)!==JSON.stringify(approval)||!original||!output||sha(original)!==saved.sourceSha256||sha(output)!==saved.outputSha256)fail('Die gesicherte Vektorlogo-Fassung ist nicht vollständig.');
 const raw=output.toString('utf8'),root=raw.match(/^\s*<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/);
 if(!root||!Number.isFinite(entry.width)||entry.width<=0||!Number.isFinite(entry.height)||entry.height<=0||/<\/?(?!path\b)[A-Za-z]/.test(root[1])||/\bon\w+\s*=|\b(?:href|style)\s*=|url\s*\(|<!/i.test(root[1]))fail('Die gesicherte Gravurfassung enthält keine sicheren Vektorpfade.');
 return {fragment:root[1],width:entry.width,height:entry.height};
}
