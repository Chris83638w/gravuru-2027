// Material photographs are preview resources; geometry and production paths remain separate.
export const validSurface=url=>/^\/api\/workshop\/material-surfaces\/[a-f0-9]{64}\.png$/.test(url)||/^\/api\/product-workbench\/assets\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(url)||/^\/produktvorschau\/[a-f0-9]{48}\/material\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(url)||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url);
export function surfacePreview(svg,url,geometry){
 if(!url||!validSurface(url))return svg;
 const {width,height,shape}=geometry;
 if(![width,height].every(n=>Number.isFinite(n)&&n>0))throw Error('Materialvorschau: Maße fehlen.');
 const clip=shape==='ellipse'?'<ellipse cx="'+width/2+'" cy="'+height/2+'" rx="'+width/2+'" ry="'+height/2+'"/>':'<rect width="'+width+'" height="'+height+'"/>';
 return svg.replace(/(<\/defs>)(<(?:rect|ellipse)\b[^>]*\/>)/,'$1$2<defs><clipPath id="material-preview-clip">'+clip+'</clipPath></defs><image data-material-surface="true" href="'+url+'" width="'+width+'" height="'+height+'" preserveAspectRatio="none" clip-path="url(#material-preview-clip)"/>');
}
export async function embedSurface(svg,url){if(!url||!validSurface(url)||url.startsWith('data:'))return svg;const response=await fetch(url);if(!response.ok)throw Error('Rohlingbild konnte nicht geladen werden.');const blob=await response.blob();const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});return svg.replaceAll('href="'+url+'"','href="'+data+'"');}

