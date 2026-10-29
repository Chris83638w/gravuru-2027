import {designPaintOrder} from '../../platform/sources/app/shared/models/design-layer-order.mjs';
import {contourPathWithHoles} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {previewResourceURL} from './preview-resource.mjs';
import {photoShape,photoClip,photoMaskURL} from '../../platform/sources/app/shared/models/photo-shape.mjs';
import {textPaths} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {selectedProfile,designFromState,isGuideObject} from './contract.mjs';
import {objectSurface} from './surfaces.mjs';
import {acrylicSelection} from './acrylic-product.mjs';
import {exportSettings,printPDF,zipFiles,hasContourInk,whiteMask,insideContour,boundarySample,resolutionAdvice} from './print-export-model.mjs';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blobURL=blob=>new Promise((res,rej)=>{const reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=()=>rej(Error('Bild konnte nicht eingebettet werden.'));reader.readAsDataURL(blob);});
export {physicalGeometry} from './print-geometry.mjs';
import {physicalGeometry} from './print-geometry.mjs';
export async function printArtwork({el,config,files}){
 // Ladezeit: Schriften/Motive der Gestaltung sind vor dem Export sicher geladen (lazy-resources.mjs).
 await el.uxEnsureDraftResources?.({design:{objects:el.state.objects}});
 const fingerprint=JSON.stringify(el.state),selection=el.state.selected,markup=[],examplePhotos=[];
 try{
  el.state.selected=null;
  // K14 / Ü15.1: Der lokale Browser-Druckexport gibt nur die Vorderseite aus; die Rückseite erzeugt die Werkstatt-Ausgabe als eigene Datei.
  for(const o of designPaintOrder({objects:el.state.objects,textOnTop:true})){if(o.uxHidden||isGuideObject(o)||objectSurface(o)!=='front')continue;if(o.type==='photoSlot'&&!o.uxUploadId){
    const example=config.localResources?.photoExamples?.find(e=>e.designId===el.state.designId&&e.slotId===o.id);
    if(example){const clip='print-example-'+o.id,mask=photoClip(o,clip,previewResourceURL(photoMaskURL(o)));markup.push(`<g transform="translate(${o.x} ${o.y}) rotate(${o.rotation||0})"><defs>${mask.defs}</defs><g ${mask.attribute}><image href="${previewResourceURL('/api/workshop/design-assets/'+example.assetId+'/preview.svg')}" x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" preserveAspectRatio="none"/></g></g>`);examplePhotos.push(o.id);}
    else{const picture=el.uxObjectSVG(o);if(!picture&&o.required)throw Error('Bitte für den benötigten Fotobereich ein Foto hochladen.');markup.push(picture||'');if(picture)examplePhotos.push(o.id);}continue;
   }if(o.uxUploadId&&!files.has(o.uxUploadId))throw Error('Ein hochgeladenes Bild fehlt. Bitte erneut auswählen.');if(o.type==='text')markup.push(`<g transform="translate(${o.x} ${o.y}) rotate(${o.rotation||0})" fill="${esc(o.color||'#202824')}">${textPaths(o,el.fontData)}</g>`);else markup.push(el.objectSVG(o)||'');}
 }finally{el.state.selected=selection;}
 const g=physicalGeometry(config,el.state),base=config.profile.geometry;
 const doc=new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${g.width}mm" height="${g.height}mm" viewBox="0 0 ${base.width} ${base.height}">${markup.join('')}</svg>`,'image/svg+xml');
 if(doc.querySelector('parsererror'))throw Error('Das Motiv konnte nicht als SVG gelesen werden.');
 for(const node of doc.querySelectorAll('[data-photo-preview-treatment]'))node.removeAttribute('filter'); // Material light effect is preview-only; grayscale and original pixels remain.
 for(const node of doc.querySelectorAll('[data-preview-only],[data-role="guide"],[data-resize],.ux-selection-handles'))node.remove(); // Ü6.1: Hilfsebenen nie in der Fertigungsdatei
 if(doc.querySelector('text'))throw Error('Nicht in Pfade umgewandelter Text im Motiv. Bitte die Vorlage prüfen.');
 for(const node of doc.querySelectorAll('*'))for(const a of [...node.attributes])if(a.name.startsWith('data-')||['role','tabindex','focusable','aria-label','aria-hidden'].includes(a.name))node.removeAttribute(a.name);
 const cache=new Map();
 for(const image of doc.querySelectorAll('image')){
  const href=image.getAttribute('href')||image.getAttributeNS('http://www.w3.org/1999/xlink','href');if(!href)throw Error('Bildquelle fehlt.');
  if(!cache.has(href)){
   // Authenticated previews are already embedded image bytes. Fetching a data
   // URL is a new connection under CSP and is correctly blocked by connect-src.
   if(/^data:image\/(?:svg\+xml|png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(href)){cache.set(href,href);}
   else{
   const u=new URL(href,location.href);if(!['data:','blob:'].includes(u.protocol)&&u.origin!==location.origin)throw Error('Externe Bildquelle wird nicht exportiert.');
   const known=[...files.values()].find(f=>f.url===href),blob=known?(known.blob||known.file):await ((u.origin===location.origin&&u.pathname.startsWith('/api/workshop/')&&window.parent.GravuruMerchantRequest)?window.parent.GravuruMerchantRequest(u.pathname+u.search):fetch(href,{credentials:'same-origin'})).then(r=>{if(!r.ok)throw Error('Motivbild fehlt.');return r.blob();});
   cache.set(href,await blobURL(blob));
   }
  }
  image.removeAttributeNS('http://www.w3.org/1999/xlink','href');image.setAttribute('href',cache.get(href));
 }
 if(fingerprint!==JSON.stringify(el.state))throw Error('Die Gestaltung wurde geändert. Bitte den Download erneut starten.');
 return {svg:new XMLSerializer().serializeToString(doc),geometry:g,fingerprint,examplePhotos};
}
export async function artworkPixels(svg,requested){
 let s=requested;
 const artworkGeometry={...s.geometry,holes:[]}; // Drilling follows engraving/printing; only previews show holes.
 const scale=s.dpi/25.4,w=Math.round(s.geometry.width*scale),h=Math.round(s.geometry.height*scale);
 let W=Math.round(s.pageWidthMm*scale),H=Math.round(s.pageHeightMm*scale);
 if(W*H>50000000)throw Error('Das Druckformat überschreitet die Exportgrenze von 50 Megapixeln.');
 const source=document.createElement('canvas');source.width=w;source.height=h;const sc=source.getContext('2d');
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),image=new Image();
 try{image.src=url;await image.decode();sc.drawImage(image,0,0,w,h);}finally{URL.revokeObjectURL(url);}
 const sourcePixels=sc.getImageData(0,0,w,h).data,edgeInk=hasContourInk(sourcePixels,w,h,s.geometry);
 if(!edgeInk){s=exportSettings(s.geometry,{...s,bleedMm:0,whiteBleedMm:0});W=w;H=h;}
 const bx=Math.round((W-w)/2),by=Math.round((H-h)/2);
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
 if(s.mirror){ctx.translate(W,0);ctx.scale(-1,1);}
 // Free contours are clipped with their original SVG path, with the complete artwork through future drill holes.
 if(s.geometry.shape==='contour'){ctx.scale(w/s.geometry.width,h/s.geometry.height);ctx.clip(new Path2D(contourPathWithHoles(artworkGeometry)),'evenodd');ctx.scale(s.geometry.width/w,s.geometry.height/h);}
 // Repeat only the outermost artwork pixels into the bleed, never scale the design itself.
 const X=[[0,1,0,bx],[0,w,bx,w],[w-1,1,bx+w,W-bx-w]],Y=[[0,1,0,by],[0,h,by,h],[h-1,1,by+h,H-by-h]];
 for(const [sx,sw,dx,dw]of X)for(const [sy,sh,dy,dh]of Y)if(dw&&dh)ctx.drawImage(source,sx,sy,sw,sh,dx,dy,dw,dh);
 const rgba=ctx.getImageData(0,0,W,H).data,rgb=new Uint8Array(W*H*3),alpha=new Uint8Array(W*H);
 // Extend ink normal to curved contours too, keeping untouched interior pixels.
 if(s.geometry.shape!=='contour'&&(s.geometry.shape==='ellipse'||s.geometry.cornerRadiusMm||s.geometry.holes?.length)){
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   let mx=(x+.5)*s.pageWidthMm/W-s.bleedMm;const my=(y+.5)*s.pageHeightMm/H-s.bleedMm;if(s.mirror)mx=s.geometry.width-mx;
   const target=(y*W+x)*4;
   if(!insideContour(artworkGeometry,mx,my,s.bleedMm)){rgba[target+3]=0;continue;}
   if(insideContour(artworkGeometry,mx,my))continue;
   const [px,py]=boundarySample(artworkGeometry,mx,my),ix=Math.max(0,Math.min(w-1,Math.floor(px*w/s.geometry.width))),iy=Math.max(0,Math.min(h-1,Math.floor(py*h/s.geometry.height))),source=(iy*w+ix)*4;
   for(let c=0;c<4;c++)rgba[target+c]=sourcePixels[source+c];
  }
 }
 for(let i=0;i<alpha.length;i++){rgb[i*3]=rgba[i*4];rgb[i*3+1]=rgba[i*4+1];rgb[i*3+2]=rgba[i*4+2];alpha[i]=rgba[i*4+3];}
 let whiteAllowed;
 if(s.geometry.shape==='contour'){
  const mask=document.createElement('canvas');mask.width=W;mask.height=H;const mc=mask.getContext('2d');mc.scale(W/s.pageWidthMm,H/s.pageHeightMm);if(s.mirror){mc.translate(s.geometry.width,0);mc.scale(-1,1);}mc.fillStyle='white';mc.fill(new Path2D(contourPathWithHoles(artworkGeometry)),'evenodd');
  const pixels=mc.getImageData(0,0,W,H).data;whiteAllowed=new Uint8Array(W*H);for(let i=0;i<whiteAllowed.length;i++)whiteAllowed[i]=pixels[i*4+3];
 }
 return {width:W,height:H,rgb,alpha,...(whiteAllowed?{whiteAllowed}:{}),settings:s,edgeInk,requestedBleedMm:requested.bleedMm};
}
export async function createPrintPackage(api,input){
 const art=await printArtwork(api),requested=exportSettings(art.geometry,input),pixels=await artworkPixels(art.svg,requested),settings=pixels.settings,files=[];
 const add=async(name,kind)=>files.push({name,blob:await printPDF({settings,pixels,kind})});
 const pdfName=settings.profile==='roland'?'Roland-RDG_WHITE-CutContour.pdf':'Mimaki-Weissersatz-CutContour.pdf';
 await add(pdfName,'combined');
 const pdf=files[0].blob;
 if(settings.profile==='mimaki'&&settings.white!=='none')await add('Mimaki-Weissersatz-separat.pdf','white');
 const used=new Set(api.el.state.objects.filter(o=>!o.uxHidden&&!isGuideObject(o)&&o.uxUploadId).map(o=>o.uxUploadId));
 const uploads=[];let photoIndex=0;for(const id of used){const file=api.files.get(id);if(!file?.file)continue;const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.file.type];if(!extension)throw Error('Originalbildtyp nicht unterstützt.');const name=`Originalfoto-${++photoIndex}.${extension}`;files.push({name,blob:file.file});uploads.push({uploadId:id,original:name,edited:file.blob?`Foto-${photoIndex}-bearbeitet.png`:null});if(file.blob)files.push({name:`Foto-${photoIndex}-bearbeitet.png`,blob:file.blob});}
 files.push({name:'Motiv-Pfade-und-Originalbilder.svg',blob:new Blob([art.svg],{type:'image/svg+xml'})});
 const design=designFromState(api.config,api.el.state),fonts=Object.fromEntries([...new Set(design.objects.filter(o=>o.type==='text').map(o=>o.font))].map(name=>[name,api.el.fontData[name]]));
 files.push({name:'Gestaltung.json',blob:new Blob([JSON.stringify({schema:'gravuru-print-source/v1',profileId:api.config.profile.id,revision:api.config.profile.revision,design,geometry:art.geometry,options:api.el.state.mOptions,fonts,uploads},null,2)],{type:'application/json'})});
 const metadata={schema:'gravuru-print-proof/v1',profileId:api.config.profile.id,revision:api.config.profile.revision,designId:api.el.state.designId,settings,edgeInk:pixels.edgeInk,requestedBleedMm:pixels.requestedBleedMm,createdAt:new Date().toISOString(),productionApproved:false,examplePhotos:art.examplePhotos,color:`DeviceCMYK, ${settings.dpi} dpi; generische Maximalschwarz-Separation, kein druckerspezifisches ICC-Profil`,white:settings.white==='motif'?`${settings.dpi}-dpi-Deckkraftschwelle 128, geschlossene Vektorfüllungen`:'Konturfüllung oder ohne Weiß',bleed:'Randpixel fortgesetzt; Motiv innerhalb der Schnittkontur unverändert',svg:'Unbeschnittene, ungespiegelte Motivquelle ohne Drucksonderfarben; Textpfade und eingebettete Bilder',files:files.map(f=>f.name)};
 files.push({name:'Einstellungen.json',blob:new Blob([JSON.stringify(metadata,null,2)],{type:'application/json'})});
 files.push({name:'BITTE-LESEN.txt',blob:new Blob([`PRUEFEXPORT - keine Produktionsfreigabe\n${settings.profile==='mimaki'?'Die weisse Vektorfuellung der PDF-Ebene Weissersatz Vektor muss im RIP Weiss zugeordnet werden. Normales CMYK-Weiss druckt von allein keine weisse Tinte. Die separate Weissersatz-PDF im ZIP zeigt dieselbe Fuellung schwarz. Alle Dateien unveraendert seitenbezogen registrieren.':'RDG_WHITE und CutContour sind echte PDF-Sonderfarben in getrennten Ebenen.'}\nFarbmotiv: DeviceCMYK ${settings.dpi} dpi. Generische Maximalschwarz-Separation aus RGB, kein druckerspezifisches ICC-Profil. Textpfade/Originalbilder bleiben zusaetzlich in der SVG in ihren Quellfarben.\nWeiss nach Motiv: binaere ${settings.dpi}-dpi-Deckkraftmaske als geschlossene Vektorflaechen, keine verlustfreie Vektorisierung.\n1 mm Ueberdruck setzt Randpixel fort. Unsichtbare Motivteile werden nicht erfunden.\nSpiegelung: ${settings.mirror?'bereits in PDFs enthalten - NICHT erneut im RIP spiegeln':'aus'}. SVG bleibt ungespiegelt.\nSockel, Bediengriffe und Fotohinweise sind ausgeschlossen. Untere 7 mm bleiben im Druck enthalten.\nVor Produktion: RIP-Separationen, Weisszuordnung, Farbprofil, Ebenenreihenfolge, Deckkraft und Probedruck pruefen.\n`],{type:'text/plain'})});
 if(art.fingerprint!==JSON.stringify(api.el.state))throw Error('Die Gestaltung wurde geändert. Bitte den Download erneut starten.');
 return {pdf,pdfName,files,settings,metadata};
}
export function installPrintExport(api){
 if(window.parent.GravuruOperatorExport!==true)return;
 const r=api.el.shadowRoot,button=document.createElement('button'),dialog=document.createElement('dialog');
 button.type='button';button.className='print-download-button';button.textContent='Druckdateien herunterladen';
 dialog.className='print-download';dialog.setAttribute('aria-labelledby','print-download-title');
 dialog.innerHTML=`<form><h2 id="print-download-title">Druckdateien herunterladen</h2><p>Aktuelle Gestaltung · Prüfexport für eure Werkstatt</p><p>Ohne eigenen Upload bleibt ein hinterlegtes Beispielfoto im Prüfdruck enthalten.</p><label>Dateiumfang<select name="format"><option value="pdf">Nur PDF</option><option value="zip">ZIP mit allen Daten und Originalfotos</option></select></label><label>Drucksystem<select name="profile"><option value="roland">Roland · RDG_WHITE</option><option value="mimaki">Mimaki · Vektorfüllung als Weißersatz</option></select></label><label>Auflösung<select name="dpi"><option value="300" selected>300 dpi · Standard</option><option value="600">600 dpi · feine Details</option></select></label><p data-print-resolution-note class="print-export-note" hidden></p><label>Überdruck Farbe<select name="bleedMm"><option value="0" selected>0 mm · Standard</option><option value="1">Bis 1 mm · nur an bedruckten Rändern</option></select></label><label>Weißunterlegung<select name="white"><option value="motif" selected>Nur unter bedruckten Elementen · freie Flächen transparent</option><option value="full">Gesamte Platte weiß hinterlegen</option><option value="none">Ohne Weiß</option></select></label><p data-print-white-note class="print-export-note"></p><label>Überdruck Weiß<select name="whiteBleedMm"><option value="0">0 mm · bis zur Kontur</option><option value="1">1 mm · nur bei 1 mm Farbüberdruck</option></select></label><label class="print-mirror"><input name="mirror" type="checkbox" disabled>Spiegelung laut Produkt-/Fertigungsprofil (nicht änderbar)</label><p data-print-dimensions></p><p class="print-export-note">Farbmotiv in CMYK, ohne druckerspezifisches ICC-Profil. 600 dpi für sehr feine Schrift und Linien wählbar. Details in importierten Bildern werden nicht automatisch bewertet.</p><button type="button" data-print-preview>Weißkanal prüfen</button><figure data-print-white-preview hidden><canvas aria-label="Weißunterlegung: weiße Flächen werden gedruckt"></canvas><figcaption>Weiß = Weißdruck · Karomuster = transparentes Acryl. Der weiße Seitenhintergrund eines PDF-Programms ist kein Weißkanal.</figcaption></figure><p data-print-status role="status" aria-live="polite"></p><div class="print-actions"><button type="button" data-print-close>Abbrechen</button><button type="submit">PDF herunterladen</button></div><div data-print-photos></div></form>`;
 const form=dialog.querySelector('form'),status=dialog.querySelector('[data-print-status]');form.elements.mirror.checked=api.config.acrylic?.print?.side==='rear'; // Ü7.2: Rückseitendruck spiegelt genau einmal; keine Clientwahl
 const update=()=>{const geometry=physicalGeometry(api.config,api.el.state),note=dialog.querySelector('[data-print-resolution-note]');note.textContent=resolutionAdvice(api.el.state.objects,geometry.width/api.config.profile.geometry.width,designFromState(api.config,api.el.state).marks||[]);note.hidden=!note.textContent;dialog.querySelector('[data-print-white-note]').textContent=({motif:'Weiß unter Foto, Text und allen bedruckten Elementen des Designs – nur auf deren gedruckten Flächen. Freie Acrylflächen bleiben durchsichtig.',full:'Auch unbedruckte Flächen innerhalb der Plattenkontur werden weiß. Die Platte ist dort nicht mehr durchsichtig.',none:'Keine Weißunterlegung. Die Farbausgabe bleibt unverändert.'})[form.elements.white.value];form.querySelector('[type=submit]').textContent=form.elements.format.value==='pdf'?'PDF herunterladen':'ZIP herunterladen';const isContour=geometry.shape==='contour';form.elements.bleedMm.querySelector('[value="1"]').disabled=isContour;if(isContour)form.elements.bleedMm.value='0';const bleed=Number(form.elements.bleedMm.value);if(!bleed)form.elements.whiteBleedMm.value='0';form.elements.whiteBleedMm.disabled=!bleed||form.elements.white.value==='none';const g=physicalGeometry(api.config,api.el.state);dialog.querySelector('[data-print-dimensions]').textContent=`Schnittkontur: ${g.width} × ${g.height} mm · PDF ohne Randdruck: ${g.width} × ${g.height} mm${bleed?` · bei Randdruck: ${g.width+2*bleed} × ${g.height+2*bleed} mm`:""}`;};
 form.addEventListener('change',()=>{dialog.querySelector('[data-print-white-preview]').hidden=true;update();});button.addEventListener('click',()=>{status.textContent='';update();const target=dialog.querySelector('[data-print-photos]');target.replaceChildren();const used=new Set(api.el.state.objects.filter(o=>!o.uxHidden&&o.uxUploadKind==='photo').map(o=>o.uxUploadId));let i=0;for(const id of used){const file=api.files.get(id)?.file;if(!file)continue;const photoButton=document.createElement('button');photoButton.type='button';photoButton.textContent=`Originalfoto ${++i} separat herunterladen`;const name=`Originalfoto-${i}.`+({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]||'bin');photoButton.addEventListener('click',()=>api.el.download(file,name));target.append(photoButton);}dialog.showModal();});dialog.querySelector('[data-print-close]').addEventListener('click',()=>dialog.close());
 form.addEventListener('submit',async e=>{e.preventDefault();const controls=[...form.elements];if(form.dataset.busy)return;form.dataset.busy='true';const format=form.elements.format.value,input={profile:form.elements.profile.value,bleedMm:Number(form.elements.bleedMm.value),white:form.elements.white.value,whiteBleedMm:Number(form.elements.whiteBleedMm.value),mirror:form.elements.mirror.checked,dpi:Number(form.elements.dpi.value)};controls.forEach(c=>c.disabled=true);status.textContent='Design, Weißfüllung und Kontur werden vorbereitet …';try{const result=await createPrintPackage(api,input);api.el.download(format==='pdf'?result.pdf:await zipFiles(result.files),format==='pdf'?result.pdfName:`Gravuru-${result.settings.profile}-Pruefexport.zip`);status.textContent=(format==='pdf'?'PDF':'ZIP')+` erstellt · CMYK / ${result.settings.dpi} dpi · ${result.settings.pageWidthMm} × ${result.settings.pageHeightMm} mm · Farbüberdruck ${result.settings.bleedMm} mm. Vor Produktion im RIP prüfen.`;}catch(error){status.textContent=error.message;}finally{delete form.dataset.busy;controls.forEach(c=>c.disabled=false);form.elements.mirror.disabled=true;update();}});
 dialog.querySelector('[data-print-preview]').addEventListener('click',async()=>{
  if(form.dataset.busy)return;form.dataset.busy='true';const controls=[...form.elements];controls.forEach(c=>c.disabled=true);status.textContent='Weißkanal wird geprüft …';
  try{const input={profile:form.elements.profile.value,bleedMm:Number(form.elements.bleedMm.value),white:form.elements.white.value,whiteBleedMm:Number(form.elements.whiteBleedMm.value),mirror:form.elements.mirror.checked,dpi:Number(form.elements.dpi.value)};const art=await printArtwork(api),pixels=await artworkPixels(art.svg,exportSettings(art.geometry,input)),s=pixels.settings,mask=whiteMask(pixels,s);
   const source=document.createElement('canvas');source.width=pixels.width;source.height=pixels.height;const ctx=source.getContext('2d'),image=ctx.createImageData(source.width,source.height);for(let i=0;i<mask.length;i++){image.data[i*4]=image.data[i*4+1]=image.data[i*4+2]=255;image.data[i*4+3]=mask[i];}ctx.putImageData(image,0,0);
   const target=dialog.querySelector('[data-print-white-preview] canvas');target.width=300;target.height=Math.round(300*s.pageHeightMm/s.pageWidthMm);target.getContext('2d').drawImage(source,0,0,target.width,target.height);dialog.querySelector('[data-print-white-preview]').hidden=false;dialog.querySelector('[data-print-white-preview]').scrollIntoView({block:'nearest'});status.textContent=`Weißkanal geprüft · ${s.pageWidthMm} × ${s.pageHeightMm} mm · Farbüberdruck ${s.bleedMm} mm.`;
  }catch(error){status.textContent=error.message;}finally{delete form.dataset.busy;controls.forEach(c=>c.disabled=false);form.elements.mirror.disabled=true;update();}
 });
 dialog.addEventListener('cancel',e=>{if(form.dataset.busy)e.preventDefault();});
 const style=document.createElement('style');style.textContent='.print-download-button{display:block!important;margin:14px auto;padding:12px 22px;background:#17614f;color:white;border:0;border-radius:8px}.print-download{width:min(520px,calc(100vw - 32px));max-height:90vh;box-sizing:border-box;overflow:auto;border:1px solid #ddd;border-radius:16px;padding:24px;color:#28352f;background:#fff}.print-download::backdrop{background:#152b2488}.print-download h2{margin-top:0}.print-download label{display:block;margin:16px 0;font-weight:600}.print-download select{display:block;box-sizing:border-box;width:100%;margin-top:6px;padding:10px;font:inherit;background:white;border:1px solid #bbc7c0;border-radius:6px}.print-download .print-mirror{display:flex;align-items:center;gap:10px}.print-download input[type=checkbox]{width:18px;height:18px;accent-color:#17614f}.print-export-note{font-size:13px;line-height:1.5;background:#f3f5f1;padding:12px}.print-actions{display:flex;gap:12px;justify-content:flex-end}.print-actions button{padding:12px;border:1px solid #bbc7c0;border-radius:7px;background:white}.print-actions button[type=submit]{background:#17614f;color:white}.print-download [data-print-white-preview]{margin:16px 0}.print-download [data-print-white-preview] canvas{display:block;max-width:100%;height:auto;margin:auto;background:repeating-conic-gradient(#91a39a 0% 25%,#c1cbc5 0% 50%) 50%/18px 18px;border:1px solid #8a9a91}.print-download figcaption{font-size:12px;line-height:1.5;margin-top:8px}.print-download [data-print-status]{font-size:14px;line-height:1.4}';
 r.append(style,dialog);(r.querySelector('.acryl-below')||r).append(button);
}
