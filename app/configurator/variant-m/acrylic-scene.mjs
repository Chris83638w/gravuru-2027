import {ACRYLIC_BASES,acrylicSelection,containAcrylicObject} from './acrylic-product.mjs';
import {money} from './contract.mjs';
import {baseAnchors} from './acrylic-base-anchors.mjs';
const ROOT='/acrylic-assets/';
export async function installAcrylicScene({el,r,config,files,select,selected,say,acceptFiles}) {
 if(!config?.acrylic)return;
 const $=s=>r.querySelector(s),all=s=>[...r.querySelectorAll(s)];
 const css=document.createElement('style');css.textContent=await fetch('/configurator/variant-m/acrylic-scene.css').then(r=>r.text());r.append(css);
 r.host.dataset.acrylicScene='true';
 const stage=$('.stage');stage.classList.add('acryl-scene');
 const scene=document.createElement('img');scene.className='acryl-backdrop';scene.src=ROOT+'scene-empty-v2.png';scene.alt='Acrylglas vor hellem, warmem Hintergrund';
 const base=document.createElement('img');base.className='acryl-base';base.alt='Gewählter Sockel';base.hidden=true;
 const baseBack=base.cloneNode();baseBack.classList.add('acryl-base-back');baseBack.alt='';baseBack.setAttribute('aria-hidden','true');
 stage.prepend(scene);stage.append(baseBack,base);
 const footer=document.createElement('div');footer.className='acryl-details';$('.ux-preview-caption').after(footer);
 const below=document.createElement('div');below.className='acryl-below';stage.after(below);
 for(const selector of ['.ux-preview-caption','.acryl-details','.ux-preview-tools']){const node=$(selector);if(node)below.append(node);}
 $('.ux-preview-help').textContent='Eigenes Foto hochladen, dann direkt im Motiv verschieben. Zoom findest du unter Fotos.';
 const provenance=document.createElement('p');provenance.className='acryl-preview-note';provenance.textContent='Sockelansichten sind Visualisierungen. Gestaltung und Preis sind interaktiv.';$('.ux-preview').append(provenance);
 const rawSVG=el.uxObjectSVG;
 el.uxObjectSVG=function(o){
   if(o.id!=='photo-main'||files.has(o.uxUploadId))return rawSVG(o);
   if(o.uxHidden)return '';
   const asset=files.get(o.uxUploadId),url=asset?.url||ROOT+'reference.png';
   const src=String(url).replaceAll('&','&amp;').replaceAll('"','&quot;');
   const example=!asset;
   const picture=example?`<svg x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" viewBox="130 101 827 708" preserveAspectRatio="xMidYMid slice"><image href="${src}" width="1086" height="1448"/></svg>`:`<image href="${src}" x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" preserveAspectRatio="xMidYMid slice"/>`;
   const replaceable=el.uxCanEdit?.(o,'replace')!==false;
   const hint=example&&replaceable?`<g data-preview-only="true" transform="translate(0 31)"><rect x="-53" y="-9" width="106" height="18" rx="3" fill="white" fill-opacity=".96"/><text text-anchor="middle" y="-.5" font-size="4.2" font-family="Arial" fill="#332d27">Hier tippen &amp; eigenes Foto hochladen</text><text text-anchor="middle" y="5.5" font-size="3.1" font-family="Arial" fill="#63564c">Beispielfoto ersetzen</text></g>`:'';
   return `<g data-object="${o.id}" ${replaceable?`data-ux-empty-photo-slot="true" role="button" tabindex="0" aria-label="${example?'Eigenes Foto hochladen':'Foto ersetzen'}"`:'data-ux-static-photo="true" aria-hidden="true" tabindex="-1" focusable="false"'} transform="translate(${o.x} ${o.y})"><defs><clipPath id="acryl-photo-clip"><rect x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" rx="2"/></clipPath></defs><g clip-path="url(#acryl-photo-clip)">${picture}</g>${hint}<rect x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" fill="transparent"/></g>`;
 };
 // Keep native editor tools and event handling; only the scene and physical options are extended.
 const originalBody=el.svgBody;
 el.svgBody=function(...args){const dom=new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">'+originalBody.apply(this,args)+'</svg>','image/svg+xml');
   const root=dom.documentElement;
   for(const node of [...root.children])if(node.tagName==='rect'&&node.getAttribute('width')==='150'&&!node.hasAttribute('data-object'))node.setAttribute('fill','transparent');
   for(const o of this.state.objects.filter(o=>o.acrylicFixed))root.querySelectorAll('[data-resize="'+o.id+'"]').forEach(n=>n.remove());
   return root.innerHTML;
 };
 const fixedSource=()=>config.profile.designs.find(design=>design.id===el.state.designId)?.objects.filter(object=>object.acrylicFixed)||[];
 const isFixed=o=>!!o&&fixedSource().some(source=>source.id===o.id);
 const photoInput=document.createElement('input');photoInput.type='file';photoInput.accept='image/png,image/jpeg,image/webp';photoInput.hidden=true;r.append(photoInput);
 photoInput.addEventListener('change',async()=>{await acceptFiles(photoInput.files,'photo','photo-main');photoInput.value='';});
 r.addEventListener('click',e=>{if(e.target.closest('[data-object="photo-main"]')&&files.get(el.state.objects.find(o=>o.id==='photo-main')?.uxUploadId)){e.preventDefault();e.stopImmediatePropagation();photoInput.click();}},true);
 r.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.closest('[data-object="photo-main"]')&&files.get(el.state.objects.find(o=>o.id==='photo-main')?.uxUploadId)){e.preventDefault();e.stopImmediatePropagation();photoInput.click();}},true);
 r.addEventListener('pointerdown',e=>{const hit=e.target.closest('[data-object],[data-resize]');const o=el.state.objects.find(o=>o.id===(hit?.dataset.object||hit?.dataset.resize));if(!isFixed(o))return;e.preventDefault();e.stopImmediatePropagation();if(o.type!=='photoSlot')select(o.id);},true);
 r.addEventListener('click',e=>{const control=e.target.closest('[data-ux]');const object=control?.dataset.id?el.state.objects.find(o=>o.id===control.dataset.id):selected();if(isFixed(object)&&['lock','remove-content','delete','duplicate','layer-front','layer-back','original-colors'].includes(control?.dataset.ux)){e.preventDefault();e.stopImmediatePropagation();say('Dieses Element gehört fest zur Vorlage. Seine Farbe kannst du ändern.');}},true);
 r.addEventListener('change',e=>{if(isFixed(selected())&&(e.target.dataset.uxContentProp||e.target.dataset.uxProp)){e.preventDefault();e.stopImmediatePropagation();el.sync();}},true);
 r.addEventListener('keydown',e=>{if(isFixed(selected())&&e.target.closest('.scene')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();}},true);
 // Restore fixed geometry after any native transformation, including undo/import paths.
 const normalize=el.normalize;el.normalize=function(...args){const result=normalize.apply(this,args),geometry=new Map(fixedSource().map(o=>[o.id,{x:o.x,y:o.y,w:o.w,h:o.h,rotation:o.rotation}]));for(const o of this.state.objects){if(geometry.has(o.id)){Object.assign(o,geometry.get(o.id),{acrylicFixed:true,uxLocked:false,uxHidden:false});}else containAcrylicObject(o);}return result;};
 const oldAction=el.action;el.action=function(key,...args){if(isFixed(selected())&&['delete','duplicate','grow','shrink','center','centerX','up','down','resetRotation'].includes(key))return;return oldAction.call(this,key,...args);};
 function updateScene(){
   const choice=acrylicSelection(el.state.mOptions,config.acrylic.pricing),b=choice.base;
   for(const o of el.state.objects)if(isFixed(o))o.acrylicFixed=true;
   stage.dataset.fixedSelected=String(isFixed(selected()));
   const mainPhoto=el.state.objects.find(o=>o.id==='photo-main');if(mainPhoto?.uxUploadId)mainPhoto.uxPhotoBackground='keep';
   const uploadCopy=$('#ux-panel-upload > p');if(uploadCopy)uploadCopy.textContent='Ein Foto inklusive. Neue Uploads ersetzen dein Foto. JPG, PNG oder WebP · bis 15 MB.';
   for(const layer of [base,baseBack])layer.hidden=!b.asset;
   if(b.asset){
     const anchor=baseAnchors[b.asset],scale=912/(anchor.right-anchor.left),slot=1246-b.insertionMm*1196/choice.size.height;
     for(const layer of [base,baseBack]){
       const src=ROOT+b.asset.replace('.png','-v2.png');if(layer.getAttribute('src')!==src)layer.src=src;
       layer.style.width=(anchor.width*scale/1086*100)+'%';layer.style.height='auto';
       layer.style.left=((542-(anchor.left+anchor.right)/2*scale)/1086*100)+'%';
       layer.style.top=((slot-anchor.slot*scale)/1448*100)+'%';
     }
     base.style.clipPath=`inset(${anchor.slot/anchor.height*100}% 0 0 0)`;
     baseBack.style.clipPath=`inset(${(anchor.bodyTop-8)/anchor.height*100}% 0 ${100-anchor.slot/anchor.height*100}% 0)`;
   }
   base.dataset.flat=String(!!b.flat);
   stage.dataset.hasBase=String(!!b.asset);
   const quantity=Number($('[data-fk-quantity]')?.value||1);
   all('[data-fk-total]').forEach(n=>n.textContent=money(choice.totalCents*quantity));
   const lines=$('[data-ux-price-lines]');if(lines)lines.textContent=`Acrylglas ${money(choice.size.basePriceCents)}${b.id==='none'?'':` + Sockel ${money(choice.baseCents)}`}${choice.wallCents?` + Wandhalterung ${money(choice.wallCents)}`:''}`;
   footer.textContent=`${choice.size.width/10} × ${(choice.size.height/10).toLocaleString('de-DE')} cm · 3 mm Acrylglas`;
   for(const option of all('select[data-m-option="base"] option')){const row=ACRYLIC_BASES.find(b=>b.id===option.value);if(row)option.textContent=row.label+(row.id==='none'?'':` · +${money(acrylicSelection({size:el.state.mOptions.size,base:row.id},config.acrylic.pricing).baseCents)}`);}
   all('[data-ux=lock],[data-ux=remove-content]').forEach(n=>{if(fixedSource().some(o=>o.id===n.dataset.id))n.disabled=true;});
   all('[data-ux-content-prop]').forEach(n=>{if(isFixed(selected()))n.disabled=true;});
 }
 const sync=el.sync;el.sync=function(...args){const value=sync.apply(this,args);updateScene();return value;};
 el.acrylicExportPayload=async()=>{
   const uploaded=files.get(el.state.objects.find(o=>o.id==='photo-main')?.uxUploadId);
   if(!uploaded)throw Error('Bitte zuerst das Beispielfoto durch dein eigenes Foto ersetzen.');
   let body='';const selectedId=el.state.selected;el.state.selected=null;
   try{for(const o of el.state.objects.filter(o=>!o.uxHidden)){
     const xml=new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">'+el.objectSVG(o)+'</svg>','image/svg+xml');
     xml.querySelectorAll('[data-preview-only],[data-resize],rect[fill="transparent"]').forEach(n=>n.remove());
     if(o.type==='motif'&&o.preserveColors===false){xml.querySelectorAll('filter').forEach(n=>n.remove());for(const n of xml.querySelectorAll('*')){n.removeAttribute('filter');for(const key of ['fill','stroke'])if(n.hasAttribute(key)&&n.getAttribute(key)!=='none')n.setAttribute(key,o.color);}}
     body+=xml.documentElement.innerHTML;
   }}finally{el.state.selected=selectedId;}
   for(const asset of files.values())if(body.includes(asset.url)){
     const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(asset.blob||asset.file);});body=body.replaceAll(asset.url,data);
   }
   return {schema:'gravuru-acrylic-print/v1',options:el.state.mOptions,objects:structuredClone(el.state.objects),svg:'<svg xmlns="http://www.w3.org/2000/svg" width="150mm" height="200mm" viewBox="0 0 150 200">'+body+'</svg>'};
 };
 // Production preparation is reserved for the future authenticated workbench.
 el.sync();
}
