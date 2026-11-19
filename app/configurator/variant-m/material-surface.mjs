import {contourPathWithHoles} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {escapeXml} from '../../platform/sources/app/shared/models/design-content.mjs';
import {DOORBELL_STEEL_SURFACE,isDoorbellImagePath} from '../../platform/sources/app/shared/models/doorbell-image-paths.mjs';
// Material photographs are preview resources; geometry and production paths remain separate.
export const validSurface=url=>/^\/api\/workshop\/material-surfaces\/[a-f0-9]{64}\.png$/.test(url)||/^\/api\/product-workbench\/assets\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(url)||/^\/produktvorschau\/[a-f0-9]{48}\/material\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(url)||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url);
// Leistung (20.10.2026): Eine als data:-URI gelieferte Rohlingtextur (oft ~2 MB) stand in jeder Vorschau-Zeichnung
// und wurde je Fingerbewegung mehrfach geparst. Für die Bildschirmvorschau einmal in eine blob:-Adresse umwandeln;
// Exporte (embedSurface) bekommen weiter die Original-Adresse. Nur hier erzeugte blob:-Adressen gelten als sicher.
const previewBlobs=new Map(),trustedBlobs=new Set();
export function previewSurfaceUrl(url){
 if(!url||!url.startsWith('data:')||typeof Blob==='undefined'||typeof URL?.createObjectURL!=='function'||typeof atob!=='function')return url;
 let blob=previewBlobs.get(url);if(blob)return blob;
 if(!validSurface(url))return url;
 const comma=url.indexOf(','),type=url.slice(5,url.indexOf(';')),bin=atob(url.slice(comma+1)),bytes=new Uint8Array(bin.length);
 for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
 blob=URL.createObjectURL(new Blob([bytes],{type}));previewBlobs.set(url,blob);trustedBlobs.add(blob);return blob;
}
export function plateClipMarkup(geometry){
 const {width,height,shape}=geometry;
 return shape==='contour'?'<path d="'+escapeXml(contourPathWithHoles(geometry))+'" clip-rule="evenodd"/>':shape==='ellipse'?'<ellipse cx="'+width/2+'" cy="'+height/2+'" rx="'+width/2+'" ry="'+height/2+'"/>':'<rect width="'+width+'" height="'+height+'" rx="'+(geometry.cornerRadiusMm||0)+'"/>';
}
// Separate preview layer: the original surface and artwork stay untouched.
export function plateDepthPreview(svg,geometry,id='plate-depth'){
 const {width,height}=geometry,scale=Math.max(width,height)/120;
 if(![width,height].every(n=>Number.isFinite(n)&&n>0))throw Error('Plattenschatten: Maße fehlen.');
 const key='depth-'+String(id).replace(/[^a-zA-Z0-9_-]/g,'_');
 const silhouette=plateClipMarkup({...geometry,holes:[]}).replace('clip-rule=','fill-rule=');
 // A diffuse shadow beneath the plate, separate from its physical edge. The
 // directional offset gives depth without a crisp second silhouette or glow.
 const shadow='<g data-plate-shadow="true" data-role="guide" aria-hidden="true" pointer-events="none"><defs><filter id="'+key+'" filterUnits="userSpaceOnUse" x="'+(-6*scale)+'" y="'+(-6*scale)+'" width="'+(width+12*scale)+'" height="'+(height+12*scale)+'"><feGaussianBlur stdDeviation="'+(1.05*scale)+'"/></filter></defs><g transform="translate('+(.35*scale)+' '+(1.4*scale)+')" fill="#23282c" opacity=".24" filter="url(#'+key+')">'+silhouette+'</g></g>';
 return svg.replace(/(<svg\b[^>]*>)/,'$1'+shadow);
}
export function surfacePreview(svg,url,geometry){
 if(!url||!(trustedBlobs.has(url)||validSurface(url)))return svg;
 const {width,height,shape}=geometry;
 if(![width,height].every(n=>Number.isFinite(n)&&n>0))throw Error('Materialvorschau: Maße fehlen.');
 const clip=plateClipMarkup(geometry);
 // Chris 21.10.2026: hinter den Bruchkanten ist weiß zu sehen, keine dunkle Kante und keine Kontur. Die
 // Materialfläche bleibt (um den Bruchrand eingerückt) darunter, damit ohne Bild die Platte sichtbar bleibt.
 const inset=Math.min(4,width*.04,height*.04);
 const solid=fill=>shape==='ellipse'?'<ellipse cx="'+width/2+'" cy="'+height/2+'" rx="'+(width/2-inset)+'" ry="'+(height/2-inset)+'" fill="'+fill+'"/>':'<rect x="'+inset+'" y="'+inset+'" width="'+(width-2*inset)+'" height="'+(height-2*inset)+'" rx="'+Math.max(0,(geometry.cornerRadiusMm||0)-inset)+'" fill="'+fill+'"/>';
 return svg.replace(/(<\/defs>)(<(?:rect|ellipse|path)\b[^>]*\/>)/,(_,defs,base)=>defs+(shape==='contour'?base:solid(/\sfill="([^"]*)"/.exec(base)?.[1]||'#fff'))+'<defs><clipPath id="material-preview-clip">'+clip+'</clipPath></defs><image data-material-surface="true" href="'+url+'" width="'+width+'" height="'+height+'" preserveAspectRatio="none" clip-path="url(#material-preview-clip)"/>');
}
export function scenePreview(svg,url){
 if(!url||!validSurface(url))return svg;
 const box=svg.match(/viewBox="([^\"]+)"/)?.[1].split(/\s+/).map(Number);
 if(!box||box.length!==4||!box.every(Number.isFinite))throw Error('Szenenvorschau: Maße fehlen.');
 return svg.replace(/(<svg\b[^>]*>)/,'$1<image data-scene-background="true" href="'+url+'" x="'+box[0]+'" y="'+box[1]+'" width="'+box[2]+'" height="'+box[3]+'" preserveAspectRatio="xMidYMid slice" pointer-events="none"/>');
}
export async function embedSurface(svg,url,doorbell,motifs=[]){
 const sources=new Map();
 if(url && validSurface(url) && !url.startsWith('data:'))sources.set(url,null);
 if(doorbell){
  const {imageUrl,steelImageUrl=DOORBELL_STEEL_SURFACE}=doorbell;
  if(isDoorbellImagePath(imageUrl))sources.set(imageUrl,null);
  if(steelImageUrl===DOORBELL_STEEL_SURFACE || validSurface(steelImageUrl)&&!steelImageUrl.startsWith('data:'))sources.set(steelImageUrl,null);
 }
 for(const {artwork} of motifs){
  if(artwork?.schema==='gravuru-imported-artwork/v1' && /^[a-f0-9]{64}$/.test(artwork.assetId) && /^[a-f0-9]{64}$/.test(artwork.previewSha256))
   sources.set('/api/workshop/design-assets/'+artwork.assetId+'/preview.svg',artwork.previewSha256);
 }
 // SVG images rasterised through a Blob URL cannot load linked photos. Embed only the profile's known assets.
 const used=[...sources].filter(([source])=>svg.includes('href="'+source+'"'));
 const images=await Promise.all(used.map(async ([source,checksum])=>{
  const request=checksum && window.parent.GravuruMerchantRequest || fetch;
  const response=await request(source,{credentials:'same-origin'});
  if(!response.ok)throw Error('Das Produktbild für die persönliche Vorschau konnte nicht geladen werden.');
  const blob=await response.blob();
  if(checksum){
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),byte=>byte.toString(16).padStart(2,'0')).join('');
   if(digest!==checksum)throw Error('Die Motivvorschau stimmt nicht mit dem gespeicherten Original überein.');
  }
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
  return [source,data];
 }));
 for(const [source,data] of images)svg=svg.replaceAll('href="'+source+'"','href="'+data+'"');
 return svg;
}

