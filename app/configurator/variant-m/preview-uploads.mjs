import {validatePhotoFile} from './contract.mjs';
import {blobBase64,validateVectorLogoFile} from './logo-upload.mjs';

// Use only the editor's accepted upload registry. Never fetch a URL found in SVG.
// As in printArtwork, edited photos and checked black SVGs take precedence over originals.
export async function previewUploadDataURL(asset){
 const blob=asset?.blob||asset?.file;
 if(!(blob instanceof Blob))throw Error('Eine Bilddatei für die Vorschau fehlt. Bitte erneut hochladen.');
 if(blob.type==='image/svg+xml'){
  validateVectorLogoFile({name:'vorschau.svg',type:blob.type,size:blob.size});
  if(!asset.blob||asset.vectorLogo?.version!=='svg-black-v1'||!/^[a-f0-9]{64}$/.test(asset.vectorLogo.outputSha256||''))throw Error('Das Vektorlogo ist nicht geprüft. Bitte erneut hochladen.');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==asset.vectorLogo.outputSha256)throw Error('Die Logo-Prüfsumme stimmt nicht. Bitte erneut hochladen.');
 }else validatePhotoFile(blob);
 return 'data:'+blob.type+';base64,'+await blobBase64(blob);
}

export async function embedPreviewUploads(svg,files){
 const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
 if(doc.querySelector('parsererror'))throw Error('Die Gestaltungsvorschau konnte nicht gelesen werden.');
 const assets=new Map([...files.values()].filter(asset=>asset?.url).map(asset=>[asset.url,asset])),cache=new Map();
 let changed=false;
 for(const image of doc.querySelectorAll('image')){
  const href=image.getAttribute('href')||image.getAttributeNS('http://www.w3.org/1999/xlink','href');
  const asset=assets.get(href);
  if(!asset){
   if(href?.startsWith('blob:'))throw Error('Eine Bilddatei für die Vorschau fehlt. Bitte erneut hochladen.');
   continue;
  }
  if(!cache.has(href))cache.set(href,await previewUploadDataURL(asset));
  image.removeAttributeNS('http://www.w3.org/1999/xlink','href');
  image.setAttribute('href',cache.get(href));changed=true;
 }
 return changed?new XMLSerializer().serializeToString(doc):svg;
}
