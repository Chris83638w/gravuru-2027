// Customer SVGs are converted by the bound server. Raw upload markup is never
// inserted into the editor DOM; preview and production use the checked result.
import {moduleEnabled} from './module-profile.mjs';
import {getProcessingProfile} from '../../platform/sources/app/shared/models/processing-profiles.mjs';
export const VECTOR_LOGO_ACCEPT='.svg,image/svg+xml';
export const vectorLogoEnabled=config=>moduleEnabled(config,'logo')&&config?.logo?.enabled===true&&config.logo.vectorUpload===true;
// Display only: retain the checked black SVG bytes and their alpha cutouts.
// Production consumes the immutable SVG, never this material-preview filter.
export function vectorLogoPreviewFilter(profile){
  if(profile?.material?.kind!=='acrylic'||profile?.processing?.profileId!=='acrylic-engraving')return '';
  const rgb=getProcessingProfile(profile).ink.slice(1).match(/../g).map(h=>parseInt(h,16)/255);
  return `<feColorMatrix type="matrix" values="${rgb.map(n=>'0 0 0 0 '+n).join(' ')} 0 0 0 1 0"/>`;
}
export function validateVectorLogoFile(file,objects=[],replacingId){
  if(!file||!Number.isSafeInteger(file.size)||file.size<1||file.size>2*1024*1024||!/\.svg$/i.test(file.name||'')||!['','image/svg+xml','application/xml','text/xml'].includes(file.type))throw Error('Bitte ein Vektorlogo als SVG bis 2 MB auswählen. Fotos und eingebettete Bilder sind in SVG-Logos nicht möglich.');
  if(!replacingId&&new Set(objects.filter(o=>o.uxUploadId).map(o=>o.uxUploadId)).size>=4)throw Error('Du kannst insgesamt vier Fotos oder Logos hinzufügen.');
}
export async function blobBase64(blob){
  const bytes=new Uint8Array(await blob.arrayBuffer());let text='';
  for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return btoa(text);
}
const digest=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
function svgBlob(encoded){
  if(typeof encoded!=='string'||encoded.length>28*1024*1024||!encoded||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw Error('Die Logo-Vorschau ist unvollständig. Bitte erneut versuchen.');
  return new Blob([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],{type:'image/svg+xml'});
}
export async function logoMediaPayload(asset,id){
  if(!asset?.file)throw Error('Eine Originaldatei fehlt. Bitte erneut hochladen.');
  return {id,original:await blobBase64(asset.file),...(asset.blob?{edited:await blobBase64(asset.blob)}:{}),...(asset.vectorLogo?{name:asset.file.name,vectorLogo:structuredClone(asset.vectorLogo)}:{})};
}
export async function requestVectorLogoPreview(file,{binding,request=fetch,csrfToken}={}){
  validateVectorLogoFile(file);
  if(!binding?.productId||!binding.productRevision)throw Error('Die Logo-Prüfung ist für diesen Produktstand noch nicht verbunden.');
  const response=await request('/api/workshop/customer-vector-logo/preview',{method:'POST',headers:{'Content-Type':'application/json',...(csrfToken?{'X-Gravuru-CSRF':csrfToken}:{})},body:JSON.stringify({productId:binding.productId,productRevision:binding.productRevision,name:file.name,original:await blobBase64(file)})});
  const result=await response.json();
  if(!response.ok)throw Error(result.error?.message||'Das Logo konnte nicht als Gravur vorbereitet werden.');
  if(result.version!=='svg-black-v1'||!Number.isFinite(result.width)||!Number.isFinite(result.height)||result.width<=0||result.height<=0||!Array.isArray(result.warnings)||result.warnings.some(v=>typeof v!=='string'))throw Error('Die Logo-Prüfung ist unvollständig. Bitte erneut versuchen.');
  const blob=svgBlob(result.svg),preview=svgBlob(result.preview);
  if(result.sourceSha256!==await digest(file)||result.outputSha256!==await digest(blob))throw Error('Die Logo-Prüfsumme stimmt nicht. Bitte erneut versuchen.');
  return {file,blob,preview,width:result.width,height:result.height,warnings:result.warnings,vectorLogo:{version:result.version,sourceSha256:result.sourceSha256,outputSha256:result.outputSha256}};
}
export function logoPlacement(width,height,asset,prior){
  const maxW=prior?.w||Math.min(width*.3,50),maxH=prior?.h||Math.min(height*.25,50),scale=Math.min(maxW/asset.width,maxH/asset.height);
  return {x:prior?.x??width/2,y:prior?.y??height*.35,w:asset.width*scale,h:asset.height*scale,rotation:prior?.rotation||0};
}
export function confirmVectorLogo({dialog,asset,scene,placement,priorId,priceCents,profile,esc}){
  const materialKind=profile?.material?.kind;
  const originalUrl=URL.createObjectURL(asset.preview),blackUrl=URL.createObjectURL(asset.blob);
  const d=dialog('vector-logo','Logo als Gravur prüfen',`<p>Dein SVG wird in einfarbige Gravurflächen umgewandelt. Weiße Aussparungen bleiben frei.</p><div class="ux-logo-comparison"><figure><figcaption>Originalfarben</figcaption><img src="${originalUrl}" alt="Logo in Originalfarben"></figure><figure><figcaption>Gravur auf deinem Schild</figcaption><div data-logo-surface></div></figure></div><p class="ux-logo-detail">Feine Linien und Aussparungen prüfen.${materialKind==='steel'?' Details unter 0,5 mm können auf Edelstahl verloren gehen.':''} Die automatische Umwandlung bestätigt keine Mindeststärke.</p><p>Farbgrenzen fallen durch die Umwandlung weg. Übernimm das Logo nur, wenn alle wichtigen Details erkennbar bleiben.</p><details><summary>Hinweise zur Umwandlung</summary><ul>${asset.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></details><p><strong>Logo-Aufpreis: ${new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(priceCents/100)}</strong></p><label class="ux-logo-check"><input type="checkbox" data-logo-confirm> Ich habe die Gravurvorschau und die Aussparungen geprüft.</label><div class="ux-actions"><button type="button" data-ux="close">Abbrechen</button><button type="button" class="ux-primary" data-logo-accept disabled>Gravur übernehmen</button></div>`);
  const copy=scene.cloneNode(true);copy.removeAttribute('tabindex');copy.removeAttribute('style');copy.setAttribute('aria-label','Dein Schild mit Logo als Gravur');
  for(const node of copy.querySelectorAll('[data-object]'))if(node.getAttribute('data-object')===priorId)node.remove();
  for(const node of copy.querySelectorAll('[data-preview-only],[data-resize],rect[stroke="#64ae87"]'))node.remove();
  const ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g'),image=document.createElementNS(ns,'image');
  group.setAttribute('transform',`translate(${placement.x} ${placement.y}) rotate(${placement.rotation})`);
  for(const [key,value] of Object.entries({href:blackUrl,x:-placement.w/2,y:-placement.h/2,width:placement.w,height:placement.h,preserveAspectRatio:'xMidYMid meet'}))image.setAttribute(key,String(value));
  const inkFilter=vectorLogoPreviewFilter(profile);
  if(inkFilter){const id='vector-logo-preview-'+crypto.randomUUID(),defs=document.createElementNS(ns,'defs'),filter=document.createElementNS(ns,'filter');filter.id=id;filter.setAttribute('color-interpolation-filters','sRGB');filter.innerHTML=inkFilter;defs.append(filter);copy.prepend(defs);image.setAttribute('filter',`url(#${id})`);}
  group.append(image);copy.append(group);d.querySelector('[data-logo-surface]').append(copy);
  const accept=d.querySelector('[data-logo-accept]'),check=d.querySelector('[data-logo-confirm]');check.addEventListener('change',()=>{accept.disabled=!check.checked;});
  return new Promise(resolve=>{
    let confirmed=false;accept.addEventListener('click',()=>{if(!check.checked)return;confirmed=true;d.close();});
    d.addEventListener('close',()=>{URL.revokeObjectURL(originalUrl);URL.revokeObjectURL(blackUrl);d.remove();resolve(confirmed);},{once:true});d.showModal();
  });
}
