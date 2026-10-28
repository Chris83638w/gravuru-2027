import {contourPathWithHoles} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {escapeXml} from '../../platform/sources/app/shared/models/design-content.mjs';
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
export async function embedSurface(svg,url){if(!url||!validSurface(url)||url.startsWith('data:'))return svg;const response=await fetch(url);if(!response.ok)throw Error('Rohlingbild konnte nicht geladen werden.');const blob=await response.blob();const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});return svg.replaceAll('href="'+url+'"','href="'+data+'"');}

