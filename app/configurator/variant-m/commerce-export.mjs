import {selectedProfile,designFromState,productionObjects} from './contract.mjs';
import {textPaths} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {escapeXml as esc} from '../../platform/sources/app/shared/models/design-content.mjs';
import {embedSurface} from './material-surface.mjs';

const dataURL=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Bilddatei konnte nicht gelesen werden.'));r.readAsDataURL(blob);});
const parse=svg=>new DOMParser().parseFromString(svg,'image/svg+xml');
const wrap=(body,w,h)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">${body}</svg>`;
async function embedUploads(svg,files){for(const file of files.values())if(svg.includes(file.url))svg=svg.replaceAll(file.url,await dataURL(file.blob||file.file));return svg;}
async function embedRasters(svg,resources,assets){for(const resource of resources||[])if(assets.has(resource.assetId)&&svg.includes(resource.url))svg=svg.replaceAll(resource.url,await dataURL(assets.get(resource.assetId)));return svg;}
async function raster(svg,width=1800,background){
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas');c.width=width;c.height=Math.round(width*image.naturalHeight/image.naturalWidth);const ctx=c.getContext('2d');if(background){ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height);}ctx.drawImage(image,0,0,c.width,c.height);return {canvas:c,blob:await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(Error('Bildexport fehlgeschlagen.')),'image/png'))};}finally{URL.revokeObjectURL(url);}
}
// A 1:1 raster PDF accompanies the editable paths, so SVG filters/crops match
// the browser exactly. It is deliberately not described as a vector PDF.
export function jpegPDF(jpeg,pixels,widthMm,heightMm){
 const enc=new TextEncoder(),bytes=s=>enc.encode(s),w=widthMm*72/25.4,h=heightMm*72/25.4;
 const stream=bytes(`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`);
 const objects=[bytes('<< /Type /Catalog /Pages 2 0 R >>'),bytes('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),new Blob([bytes(`<< /Type /XObject /Subtype /Image /Width ${pixels.width} /Height ${pixels.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,bytes('\nendstream')]),new Blob([bytes(`<< /Length ${stream.length} >>\nstream\n`),stream,bytes('\nendstream')])];
 const parts=[bytes('%PDF-1.7\n')],offsets=[0];let offset=parts[0].length;
 objects.forEach((body,i)=>{const pre=bytes(`${i+1} 0 obj\n`),post=bytes('\nendobj\n');offsets.push(offset);parts.push(pre,body,post);offset+=pre.length+(body.size??body.length)+post.length;});
 parts.push(bytes(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`));return new Blob(parts,{type:'application/pdf'});
}
export async function exportCommerce({el,config,files,selection,binding}){
 const state=structuredClone(el.state),profile=selectedProfile(config,state.mOptions),design=designFromState(config,state),{width:w,height:h}=profile.geometry;
 // Ü6.1: Hilfsebenen (role guide) bleiben Vorschau und gehen nie in Fertigungsdateien.
 const active=productionObjects(design.objects),assets=[],used=new Set(active.filter(o=>o.uxUploadId).map(o=>o.uxUploadId));
 const rasterObjects=active.filter(o=>o.type==='motif-raster'),rasterAssets=new Map();
 let vectors='',layout='';
 for(const o of active){
  if(o.type==='motif-raster'){
   const resource=config.localResources?.rasters?.find(r=>r.assetId===o.assetId);
   if(!resource?.url||resource.pixelWidth<Math.ceil(o.w*600/25.4)||resource.pixelHeight<Math.ceil(o.h*600/25.4))throw Error('Rastermotiv fehlt oder unterschreitet 600 dpi.');
   if(!rasterAssets.has(o.assetId)){
    const response=await fetch(resource.url,{credentials:'same-origin'});if(!response.ok)throw Error('Rastermotiv konnte nicht geladen werden.');
    const blob=await response.blob(),sum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
    if(sum!==o.assetId||blob.type!=='image/png')throw Error('Rastermotiv-Prüfsumme oder Dateityp abweichend.');
    rasterAssets.set(o.assetId,blob);
   }
   layout+=el.uxObjectSVG(o);continue;
  }
  if(o.uxUploadId){let image=el.uxObjectSVG(o)||'';if(o.uxUploadKind==='logo'&&o.uxLogoTint){const doc=parse(wrap(image,w,h));for(const matrix of doc.querySelectorAll('feColorMatrix[type="matrix"]')){const values=matrix.getAttribute('values').split(/\s+/).map(Number);values[4]=values[9]=values[14]=0;matrix.setAttribute('values',values.join(' '));}image=doc.documentElement.innerHTML;}layout+=image;continue;}
  if(o.type==='photoSlot')continue;
  let inside='';
  if(o.type==='text')inside=textPaths(o,el.fontData);
  else {
   const doc=parse(wrap(el.objectSVG(o),w,h)),group=doc.querySelector('[data-object]');
   if(!group)throw Error('Element konnte nicht exportiert werden.');
   for(const n of group.querySelectorAll('filter,[fill="transparent"]'))n.remove();
   for(const n of [group,...group.querySelectorAll('*')]){n.removeAttribute('filter');n.removeAttribute('style');for(const attr of ['fill','stroke','color'])if(n.hasAttribute(attr)&&!['none','transparent'].includes(n.getAttribute(attr)))n.setAttribute(attr,'#000000');}
   vectors+=group.outerHTML;layout+=group.outerHTML;continue;
  }
  const item=`<g data-object="${esc(o.id)}" transform="translate(${o.x} ${o.y}) rotate(${o.rotation||0})" fill="#000000">${inside}</g>`;vectors+=item;layout+=item;
 }
 // Marks are already editable decoration objects when UX is installed.
 const vectorSvg=wrap(vectors,w,h),artwork=await embedRasters(await embedUploads(wrap(layout,w,h),files),config.localResources?.rasters,rasterAssets);
 const preview=await raster(await embedRasters(await embedUploads(await embedSurface(el.svg(),config.materialSurface),files),config.localResources?.rasters,rasterAssets));
 const print=await raster(artwork,Math.round(w/25.4*(rasterObjects.length?600:300)),'#ffffff');
 const jpeg=new Uint8Array(await (await new Promise(res=>print.canvas.toBlob(res,'image/jpeg',.98))).arrayBuffer());
 const outer=profile.geometry.shape==='ellipse'?`<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2}" ry="${h/2}"/>`:`<rect width="${w}" height="${h}" rx="${profile.geometry.cornerRadiusMm||0}"/>`;
 const alignment=wrap(`<g fill="none" stroke="#0000ff" stroke-width=".15" data-operation="reference-only">${outer}</g><g fill="none" stroke="#ff0000" stroke-width=".15" data-operation="cut">${profile.geometry.holes.map(h=>`<circle cx="${h.x}" cy="${h.y}" r="${h.diameter/2}"/>`).join('')}</g>`,w,h);
 const add=(property,blob,name)=>assets.push({property,blob,name});
 add('Entwurf',preview.blob,'entwurf.png');add('Layout PDF 1 zu 1',jpegPDF(jpeg,print.canvas,w,h),'layout-1zu1.pdf');
 add('Gravur Vektoren',new Blob([vectorSvg],{type:'image/svg+xml'}),'gravur-vektoren.svg');add('Layout mit Bildern',new Blob([artwork],{type:'image/svg+xml'}),'layout-mit-bildern.svg');add('Ausrichtung',new Blob([alignment],{type:'image/svg+xml'}),'ausrichtung.svg');
 let rasterIndex=0;for(const blob of rasterAssets.values())add('Gravur Raster',blob,'gravur-raster-'+(++rasterIndex)+'.png');
 const uploadMap=[];let index=0;
 for(const id of used){const a=files.get(id);if(!a?.file)throw Error('Foto fehlt. Bitte erneut hochladen.');index++;const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[a.file.type];const name=`bild-${index}-original.${ext}`;add('Originalbild '+index,a.file,name);const mapping={uploadId:id,original:name};if(a.blob){mapping.edited=`bild-${index}-bearbeitet.png`;add('Bearbeitetes Bild '+index,a.blob,mapping.edited);}uploadMap.push(mapping);}
 const snapshot={schema:'gravuru-shopify-design/v1',productId:binding.productId,profileId:profile.id,revision:profile.revision,design,geometry:profile.geometry,options:selection.options,price:selection,uploads:uploadMap,processing:profile.processing,photoProduction:`Originale und bearbeitete Bilder separat; Layout-PDF ist eine ${rasterObjects.length?600:300}-dpi-Rasterreferenz.`,rasterProduction:rasterObjects.map(o=>({assetId:o.assetId,x:o.x,y:o.y,w:o.w,h:o.h,rotation:o.rotation||0,opacity:o.opacity??1})),createdAt:new Date().toISOString()};
 add('Bearbeitbarer Entwurf',new Blob([JSON.stringify(snapshot)],{type:'application/json'}),'gestaltung.json');
 return {assets,snapshot};
}

