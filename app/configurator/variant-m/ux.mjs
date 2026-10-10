import {previewResourceURL} from './preview-resource.mjs';
import {installTemplateDeletion} from './template-deletion.mjs';
import {installPreviewFeedback} from './preview-feedback.mjs';
import {installFirstTextFocus} from './first-text-focus.mjs';
import {installPrintExport} from './print-export.mjs';
import {photoPlacement} from './photo-position-model.mjs';
import {photoShape} from '../../platform/sources/app/shared/models/photo-shape.mjs';
import {roundEdit,roundDesign,editorTextSize} from './design-edit.mjs';
import {textPaths,measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {quote,money} from './contract.mjs';
import {getProcessingProfile} from '../../platform/sources/app/shared/models/processing-profiles.mjs';
import {uploadAllowed,uploadQuote,validateUpload,customerDraft,additionalMotifCount,mapPersonalObjects,uploadTarget,photoAvailableForDesign} from './ux-model.mjs';
import {installRefinements} from './refinements.mjs';
import {installCommerce} from './commerce.mjs';
import {decorateEmptyPhotoSlots} from './photo-placeholder.mjs';
import {physicalTextSize,designTextSize,applyPrintColor} from './usability-model.mjs';
import {installAcrylicScene} from './acrylic-scene.mjs';
import {acrylicSelection} from './acrylic-product.mjs';
import {selectionIds} from './profile-selection.mjs';
import {rightForProperty} from './element-rights.mjs';
import {beginCustomerRights} from './customer-rights.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>structuredClone(value);
const svgDoc=markup=>new DOMParser().parseFromString(markup,'image/svg+xml');
const button=(key,label,extra='')=>`<button type="button" data-ux="${key}" ${extra}>${label}</button>`;
const names={text:'Text',motif:'Motiv','motif-raster':'Rastermotiv',photoSlot:'Fotobereich',image:'Logo',graphic:'Grafik'};
export function rasterMarkup(o,raster,selected=false){
 if(o.type!=='motif-raster'||raster?.assetId!==o.assetId||!raster.url)return '';
 return `<g data-object="${esc(o.id)}" transform="translate(${o.x} ${o.y}) rotate(${o.rotation||0})"><image href="${esc(previewResourceURL(raster.url))}" x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" preserveAspectRatio="none" opacity="${o.opacity??1}" style="mix-blend-mode:screen"/>${selected?`<rect x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" fill="none" stroke="#64ae87" stroke-width=".7"/>`:''}</g>`;
}

// Presentation adapter. Ordering requires a separately validated parent commerce binding.
export async function installUX(el,config,legacy){
  const r=el.shadowRoot,$=s=>r.querySelector(s),all=s=>[...r.querySelectorAll(s)];
  const profile=config?.profile||legacy, width=config?.profile.geometry.width||160,height=config?.profile.geometry.height||280;
  const isPrint=config?.profile.processing?.profileId==='color-print';
  const profileChoices=config?.workshopProfiles?.selections;
  const availableFonts=()=>selectionIds(Object.keys(el.fontData).sort((a,b)=>a.localeCompare(b,'de')),profileChoices?.fonts);
  const fontFits=(object,font)=>{try{measureText({...object,font},el.fontData);return true;}catch{return false;}};
  // The scene uses the original design grid; the customer always edits physical mm.
  const textScale=()=>config?.acrylic?acrylicSelection(el.state.mOptions,config.acrylic.pricing).size.width/config.acrylic.designWidth:1;
  const displayTextSize=o=>physicalTextSize(o,textScale());
  el.uxTextScale=textScale;
  el.uxDisplayTextSize=displayTextSize;
  const photoEnabled=config?config.photo.enabled:true, logoEnabled=config?.logo?.enabled!==false;
  const files=new Map(), icons={};
  for(const key of ['templates','text','motif','image'])icons[key]=$(`[data-tab="${key}"] svg`)?.outerHTML||'';
  for(const key of ['undo','redo','delete','duplicate'])icons[key]=$(`[data-do="${key}"] svg`)?.outerHTML||'';
  const style=document.createElement('style');style.textContent=await fetch('/configurator/variant-m/ux.css').then(resp=>{if(!resp.ok)throw Error('Oberfläche nicht verfügbar.');return resp.text();});r.append(style);
  const shell=document.createElement('div');shell.className='ux-shell';
  shell.innerHTML=`<header class="ux-heading"><span class="ux-brand">gravuru</span>${button('back','← Zurück')}<h1>${config?'Dein Produkt':'Klingelschild'} personalisieren</h1>${button('account','Entwurf speichern')}<small data-ux-save-state>Entwurf nur in dieser Sitzung</small></header>
    <div class="ux-layout"><section class="ux-preview" data-dimensions="false" aria-label="Produktvorschau" style="--ux-ratio:${width}/${height}"><div data-ux-stage></div>
      <div class="ux-preview-caption"><span>${config?esc(profile.name):'AOSU Pro V8P1AX11 · Lieferung ohne Klingel'}</span>${button('enlarge','Vollbild ↗')}</div>
      <div class="ux-preview-tools">${button('undo',icons.undo||'↶','aria-label="Rückgängig"')}${button('redo',icons.redo||'↷','aria-label="Wiederholen"')}<label><input type="checkbox" data-ux-guides> Hilfslinien</label><label><input type="checkbox" data-ux-dimensions> Maße</label>${button('contents','Ebenenverwaltung <span data-ux-count></span>')}</div>
      <p class="ux-preview-help">Text oder Motiv antippen. Zum Verschieben auf dem Handy die Vollbildansicht öffnen.</p></section>
    <section class="ux-editor" aria-label="Gestaltungswerkzeuge"><nav class="ux-tabs" role="tablist" aria-label="Gestaltung">${[['options','Optionen',''],['design','Designs','templates'],['text','Text','text'],['motif','Motive','motif'],['upload',photoEnabled&&logoEnabled?'Foto / Logo':photoEnabled?'Foto':'Logo','image']].filter(([id])=>id!=='upload'||photoEnabled||logoEnabled).map(([id,title,icon])=>`<button type="button" role="tab" id="ux-tab-${id}" aria-controls="ux-panel-${id}" aria-selected="${id==='options'}" tabindex="${id==='options'?0:-1}" data-ux-tab="${id}"><span class="ux-tab-icon" aria-hidden="true">${icons[icon]||(id==='options'?'⚙':'')}</span>${title}</button>`).join('')}</nav>
    ${['options','design','text','motif','upload'].map(id=>`<section class="ux-panel" role="tabpanel" id="ux-panel-${id}" aria-labelledby="ux-tab-${id}" ${id==='options'?'':'hidden'}></section>`).join('')}
    <p class="ux-status" role="status" aria-live="polite" data-ux-status></p></section></div>${button('help','? Hilfe','class="ux-help-button"')}</div>`;
  r.append(shell);
  const largeHelp=document.createElement('div');largeHelp.innerHTML=button('help','? Hilfe','class="ux-large-help"');$('.c-large-preview').append(largeHelp.firstElementChild);
  $('[data-ux-stage]').append($('.stage-wrap'));
  $('#ux-panel-options').append($('.fk-options'));
  $('.fk-options h2').textContent='Material & Befestigung';
  $('#ux-panel-design').append($('.c-design-section'));
  $('#ux-panel-motif').append($('#panel-motif'));
  if($('[data-m-invalid]'))$('.ux-editor').append($('[data-m-invalid]'));
  for(const s of all('#panel-motif summary'))if(s.textContent.includes('Motivideen'))s.textContent='Bestseller Motive';
  $('[data-bestsellers]').open=false;
  $('#ux-panel-text').innerHTML=`<h2>Text bearbeiten</h2><p>Tippe die Zeile an, die du ändern möchtest.</p><div class="ux-fields"></div>${button('add-text','+ Text hinzufügen','class="ux-add"')}<div class="ux-controls">
    <div class="ux-font-row">${button('fonts','<span>Schrift ändern</span><strong data-ux-font-name>Schriftart</strong><span aria-hidden="true">›</span>')}</div>
    <div class="ux-size-align"><div><label class="ux-size-label" for="ux-size">Schriftgröße</label><div class="ux-stepper">${button('smaller','−','aria-label="Schrift verkleinern"')}<span class="ux-size-value"><input id="ux-size" type="number" min="4" max="100" step="1" value="10" aria-label="Schriftgröße in Millimetern"><span aria-hidden="true">mm</span></span>${button('bigger','+','aria-label="Schrift vergrößern"')}</div></div><div><span class="ux-size-label">Auf dem Schild ausrichten</span><div class="ux-align">${button('left','Links')}${button('center','Mitte')}${button('right','Rechts')}</div></div></div>
    <div class="ux-actions">${button('bold','Fett','aria-pressed="false"')}${button('italic','Kursiv','aria-pressed="false"')}${button('duplicate',`${icons.duplicate}Duplizieren`)}${button('delete',`${icons.delete}Löschen`)}</div>${isPrint?'<label class="ux-print-color">Druckfarbe <input type="color" data-ux-color aria-label="Druckfarbe des ausgewählten Texts" value="#202824"></label>':''}
    <details class="ux-precise"><summary>Position & Drehung</summary><div class="ux-precise-fields">${[['x','Horizontal · mm'],['y','Vertikal · mm'],['rotation','Drehung · °']].map(([key,label])=>`<label>${label}<input type="number" data-ux-prop="${key}" step="${config?.workbench?.embedded?'.01':'1'}"></label>`).join('')}</div></details>
    <p class="ux-tip">Hilfslinien helfen dir beim mittigen Ausrichten. Die Linien werden nicht mitgefertigt.</p></div>`;
  $('#ux-panel-upload').innerHTML=`<h2>${photoEnabled&&logoEnabled?'Deine Fotos & Logos':photoEnabled?'Deine Fotos':'Deine Logos'}</h2><p>${(config?.reviewOnly&&config.basePriceCents===null)?'Preise noch offen · maximal vier Dateien insgesamt.':!photoEnabled?`Je Logo ${money(config?.photo?.extraPriceCents??999)} · maximal vier Dateien insgesamt.`:config?.photo?.includedCount!==undefined?`${config.photo.includedCount} Foto(s) inklusive · weitere Dateien ${money(config.photo.extraPriceCents)} · maximal vier insgesamt.`:'Je Datei <strong>+9,99 €</strong> · maximal vier insgesamt.'}<br>JPG, PNG oder WebP · bis 15 MB.</p><div class="ux-upload-buttons">${photoEnabled?button('photo-upload','+ Foto hochladen','class="ux-primary"'):''}${logoEnabled?button('logo-upload','+ Logo hochladen'):''}</div><div class="ux-uploads"></div><p class="ux-small">${config&&photoEnabled?'Dein Foto erscheint direkt auf deinem Schild. ':''}Deine Dateien bleiben im lokalen Prüfstand in dieser Sitzung.</p><input type="file" accept="image/jpeg,image/png,image/webp" data-ux-file hidden>`;
  const dialogs={};
  function dialog(key,title,body){const d=document.createElement('dialog');d.className='ux-dialog ux-'+key+'-dialog';d.setAttribute('aria-label',title);d.innerHTML=`<header><h2>${title}</h2>${button('close','✕','aria-label="Fenster schließen"')}</header>${body}`;d.addEventListener('click',e=>{if(e.target.closest('[data-ux=close]'))d.close();});const show=d.showModal.bind(d);d.showModal=()=>{window.GravuruChat?.close?.();for(const other of all('dialog[open]'))if(other!==d&&!other.matches('.c-large-preview'))other.close();show();};r.append(d);dialogs[key]=d;return d;}
  dialog('font','Schrift auswählen','<p>Dein Text als Schriftprobe. Bei eingeschränkten PDF-Schriften zeigen wir ein Beispiel aus dem Design.</p><div class="ux-font-columns" aria-hidden="true"><span>Dein Text</span><span>Schriftname</span></div><div class="ux-font-grid" tabindex="0" aria-label="Schriftproben"></div>'+button('font-apply','Schrift übernehmen','class="ux-primary"'));
  dialog('contents','Ebenenverwaltung','<p>Alle Bestandteile deines Designs. Sichtbarkeit und Sperre lassen sich einzeln ändern.</p><div data-ux-contents-list></div><div data-ux-object-tools></div>');
  dialog('account','Deine Entwürfe','<div class="ux-account-note"><strong>Im Kundenkonto speichern</strong><p>Für dauerhaft gespeicherte Entwürfe meldest du dich in deinem Kundenkonto an.</p></div><p>Im lokalen Prüfstand ist die Kontoverbindung noch nicht eingerichtet. Dein Entwurf bleibt während dieser geöffneten Sitzung erhalten.</p><p>Downloads sind erst nach bezahltem Kauf im zugehörigen Kundenkonto vorgesehen. Die serverseitige Konto- und Kaufprüfung ist in dieser Testansicht noch nicht angebunden.</p>');
  dialog('price','Dein Preis','<div data-ux-price-lines></div>');
  dialog('help','Hilfe beim Gestalten',`<p>Ich zeige dir die wichtigsten Schritte.</p><div class="ux-actions">${[['text','Text ändern'],['font','Schrift & Größe'],['guides','Mittig ausrichten'],['motif','Motiv ändern'],['upload',photoEnabled&&logoEnabled?'Foto / Logo':photoEnabled?'Foto':'Logo'],['save','Entwurf speichern']].filter(([id])=>id!=='upload'||photoEnabled||logoEnabled).map(([id,title])=>button('guide-'+id,title)).join('')}</div><div data-ux-help-content></div><p class="ux-small">Direkthilfe funktioniert hier lokal. Der persönliche KI-Chat wird beim Anschluss an den vorhandenen Chatserver ergänzt.</p>`);
  const detailsButton=document.createElement('button');detailsButton.type='button';detailsButton.className='ux-price-details';detailsButton.dataset.ux='price';detailsButton.textContent='Preisdetails';$('[data-fk-total]').parentElement.append(detailsButton);
  let activeTab='options',fontChoice='',fontObject='',fieldSignature='',uploadKind=photoEnabled?'photo':'logo',replacing=null,dirty=false;
  const selected=()=>el.state.objects.find(o=>o.id===el.state.selected);
  const design=()=>profile.designs.find(d=>d.id===el.state.designId);
  const say=message=>{$('[data-ux-status]').textContent=message;};
  const finishCustomerRights=beginCustomerRights({el,r,config,selected,select,say});
  const finishTemplateDeletion=installTemplateDeletion({el,r,config,selected,mutate,say});
  const selectable=()=>selected()&&!selected().uxLocked&&!selected().uxHidden;
  function showTab(key,focus=false){if(!$('#ux-tab-'+key)||$('#ux-tab-'+key).hidden)key='text';activeTab=key;for(const b of all('[data-ux-tab]')){const is=b.dataset.uxTab===key;b.setAttribute('aria-selected',is);b.tabIndex=is?0:-1;}for(const p of all('.ux-panel'))p.hidden=p.id!=='ux-panel-'+key;if(focus)$('#ux-tab-'+key).focus();}
  $('.ux-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=all('[data-ux-tab]').filter(b=>!b.hidden&&!b.disabled),i=tabs.indexOf(e.target);const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;showTab(tabs[next].dataset.uxTab,true);});
  el.uxShowSection=section=>showTab(({font:'text',arrangement:'text',form:'options',start:'design',logo:'upload'})[section]||section);
  el.revealEditor=function(o){if(o?.type==='text')showTab('text');else if(o?.type==='photoSlot'||o?.uxUploadId)showTab('upload');};
  el.guidedGo=function(step){showTab(({1:'design',2:'text',3:'motif',4:'options'})[step]||'text');};
  function mutate(fn){el.record();fn();dirty=true;el.state.showHero=false;el.normalize();el.sync();}
  function changeObject(key,value){if(!selectable())return say('Bitte das Element zuerst in „Ebenenverwaltung“ einblenden und entsperren.');const right=rightForProperty(key);if(right&&el.uxCanEdit?.(selected(),right)===false)return say('Diese Änderung ist für dieses Vorlagenelement nicht freigegeben.');mutate(()=>{const o=selected();if(key==='color'&&isPrint)applyPrintColor(o,value);else o[key]=config?.workbench?.embedded&&typeof value==='number'?roundEdit(value):value;if(o.type==='text'&&key==='size')o.size=config?.workbench?.embedded?editorTextSize(value):designTextSize(Math.round(value),textScale());});}
  const originalNormalize=el.normalize;el.normalize=function(...args){const requested=new Map(this.state.objects.filter(o=>o.type==='text').map(o=>[o.id,{size:el.uxCanEdit?.(o,'scale')===false?o.size:config?.workbench?.embedded?editorTextSize(o.size):designTextSize(o.size*textScale(),textScale()),x:o.x,y:o.y}]));const v=originalNormalize.apply(this,args);for(const o of this.state.objects)if(o.type==='text'){Object.assign(o,requested.get(o.id));try{measureText(o,this.fontData);}catch{}}return v;};
  const originalPhotoLayout=el.photoLayout;el.photoLayout=function(o){return o?.technicalLocked?originalPhotoLayout.call(this,o):null;};
  const originalObjectSVG=el.objectSVG;
  el.uxObjectSVG=o=>{
    if(o.uxHidden)return '';
    if(o.type==='text'&&o.italic)return `<g data-object="${esc(o.id)}" transform="translate(${o.x} ${o.y}) rotate(${o.rotation||0})" fill="${esc(o.color||'#202824')}">${textPaths(o,el.fontData)}</g>`;
    if(o.type==='motif-raster'){
      const raster=config?.localResources?.rasters?.find(r=>r.assetId===o.assetId);
      return rasterMarkup(o,raster,o.id===el.state.selected);
    }
    if(!o.uxUploadId)return undefined;
    const file=files.get(o.uxUploadId),label=o.uxUploadKind==='logo'?'Dein Logo':'Dein Foto';
    const ink=isPrint?(o.color||'#202824'):config?getProcessingProfile(profile).ink:'#ffffff',rgb=ink.slice(1).match(/../g).map(h=>parseInt(h,16)/255),filterId='ux-logo-'+o.id;
    const tint=o.uxUploadKind==='logo'&&(!isPrint||o.uxLogoTint===true);
    const filter=tint?`<defs><filter id="${esc(filterId)}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${rgb.map(n=>'0 0 0 0 '+n).join(' ')} -0.2126 -0.7152 -0.0722 0 1"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs>`:'';
    const placement=photoPlacement(o,file);
    const body=file?.url?`${filter}<image data-ux-photo="${o.uxUploadKind}" href="${esc(file.url)}" x="${o.type==='photoSlot'?placement.x:-o.w/2}" y="${o.type==='photoSlot'?placement.y:-o.h/2}" width="${o.type==='photoSlot'?placement.w:o.w}" height="${o.type==='photoSlot'?placement.h:o.h}" preserveAspectRatio="xMidYMid meet" ${o.type==='photoSlot'?`transform="rotate(${placement.angle} ${placement.cx} ${placement.cy})"`:''} ${tint?`filter="url(#${esc(filterId)})"`:''}/>`:`<rect x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" rx="2" fill="#dce8df" stroke="#5a8c70" stroke-width=".5"/><text text-anchor="middle" dominant-baseline="central" font-family="Arial" fill="#294e3c" font-size="${Math.min(5,o.w/8)}">${label}</text>`;
    const maskId='ux-mask-'+o.id,masked=o.type==='photoSlot';
    const picture=masked?`<defs><clipPath id="${esc(maskId)}">${photoShape(o)}/></clipPath></defs><g clip-path="url(#${esc(maskId)})">${body}</g>`:body;
    return `<g data-object="${esc(o.id)}" transform="translate(${o.x} ${o.y}) rotate(${o.rotation||0})"><rect x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" fill="transparent"/>${picture}${o.type!=='photoSlot'&&o.id===el.state.selected?`<rect x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" fill="none" stroke="#64ae87" stroke-width=".7"/>`:''}</g>`;
  };
  el.objectSVG=function(o,...args){const custom=this.uxObjectSVG(o);if(custom!==undefined)return custom;let markup=originalObjectSVG.call(this,o,...args);if(!config&&o.type==='motif')markup=markup.replace(/(fill|stroke)="(?:#000000|#000|black|currentColor)"/gi,'$1="#ffffff"');return markup;};
  // Promote trusted template lines to editable design objects, without touching the source profile.
  function addDecoration(){const d=design();if(!d)return;for(const [i,mark] of (d.marks||[]).entries()){
    const key='ux-line-'+d.id+'-'+i,id=key;if(el.state.objects.some(o=>o.id===id))continue;
    if(el.state.uxDecorationsFor===d.id)continue;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('style','position:absolute;visibility:hidden;width:1px;height:1px');svg.innerHTML='<path d="'+esc(mark.d)+'"/>';r.append(svg);const b=svg.firstElementChild.getBBox();svg.remove();const pad=(Number(mark.width)||.4)/2;
    const bounds=[b.x-pad,b.y-pad,Math.max(.1,b.width+2*pad),Math.max(.1,b.height+2*pad)];
    el.motifs[key]=`<path d="${esc(mark.d)}" fill="none" stroke="currentColor" stroke-width="${Number(mark.width)||.4}"/>`;el.catalog.motif_bounds[key]=bounds;
    el.state.objects.push({id,type:'motif',motif:key,x:b.x+b.width/2,y:b.y+b.height/2,w:bounds[2],h:bounds[3],rotation:0,color:'#ffffff',uxDecoration:true,customerEditable:true,templateOrigin:true});
  }el.state.uxDecorationsFor=d.id;}
  const originalBody=el.svgBody;el.svgBody=function(...args){const markup=originalBody.apply(this,args);const doc=svgDoc('<svg xmlns="http://www.w3.org/2000/svg">'+markup+'</svg>');doc.querySelectorAll('[data-design-lines]').forEach(n=>n.remove());const paths=new Set((design()?.marks||[]).map(m=>m.d));for(const p of doc.querySelectorAll('path'))if(paths.has(p.getAttribute('d'))&&!p.closest('[data-object]'))p.remove();return doc.documentElement.innerHTML;};
  if(!config){
    const originalRender=el.render;
    el.render=function(...args){
      const result=originalRender.apply(this,args);
      decorateEmptyPhotoSlots(this.$('.scene'),this.state.objects,'#e1e4e5','#17191b');
      return result;
    };
  }
  const oldChoose=el.chooseDesign;el.chooseDesign=function(id){const keep=this.state.objects.map(clone);oldChoose.call(this,id);this.state.uxDecorationsFor=null;const transfer=mapPersonalObjects(keep,this.state.objects);this.state.objects=transfer.objects;addDecoration();this.state.selected=null;this.normalize();this.sync();dirty=true;if(transfer.unmappedUploads.length)say('Dein Foto konnte im neuen Design nicht eindeutig zugeordnet werden. Bitte den gewünschten Fotobereich wählen und das Foto dort ersetzen.');};
  const oldAdd=el.add;el.add=function(object,...args){
    if(object?.type==='motif'&&Array.isArray(this.uxMotifChoiceIds)&&!this.uxMotifChoiceIds.includes(object.motif))return say('Dieses Motiv steht für dieses Produkt nicht zur Auswahl.');
    if(object?.type==='text'){
      const fonts=availableFonts(),font=fonts.includes(object.font)&&fontFits(object,object.font)?object.font:fonts.find(name=>fontFits(object,name));
      if(!font)return say(fonts.length?'Die angebotenen Schriften enthalten nicht alle Zeichen für diesen Text.':'Für dieses Produkt sind keine zusätzlichen Schriften freigegeben. Die Texte im Design bleiben erhalten.');
      object={...object,font};
    }
    const ids=new Set(this.state.objects.map(o=>o.id));const result=oldAdd.call(this,object,...args);for(const o of this.state.objects)if(!ids.has(o.id))o.uxPersonal=true;this.sync();return result;
  };
  const oldAction=el.action;el.action=async function(key,...args){if(['save','import','export'].includes(key)){dialogs.account.showModal();return;}if(key==='duplicate'&&selected()?.type==='motif'&&config?.localResources?.motifs?.some(m=>m.key===selected().motif&&m.embeddedOnly===true))return say('Dieses Vorlagenmotiv kannst du verschieben, vergrößern oder entfernen, aber nicht erneut einfügen.');if(selected()?.uxLocked&&['delete','duplicate','grow','shrink','center','centerX','up','down','resetRotation'].includes(key))return say('Dieses Element ist gesperrt. Du kannst es in „Ebenenverwaltung“ entsperren.');const result=await oldAction.call(this,key,...args);return result;};
  // Keep administrative exports callable in the renderer, but never expose them as customer downloads.
  r.addEventListener('pointerdown',e=>{const obj=e.target.closest('[data-object],[data-resize]');if(!obj)return;const o=el.state.objects.find(o=>o.id===(obj.dataset.object||obj.dataset.resize));if(o?.uxLocked){e.preventDefault();e.stopImmediatePropagation();}},true);
  r.addEventListener('keydown',e=>{if(e.target.closest('.scene')&&selected()?.uxLocked&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();}},true);
  function select(id){el.state.selected=id;el.sync();}
  function emptySlotFromTarget(target){
    if(!photoEnabled||target.closest?.('[data-resize]'))return null;
    const group=target.closest?.('[data-ux-empty-photo-slot]');
    const slot=el.state.objects.find(o=>o.id===group?.dataset.object);
    return slot?.type==='photoSlot'&&!slot.uxUploadId&&!slot.uxHidden&&!slot.uxLocked&&el.uxCanEdit?.(slot,'replace')!==false?slot:null;
  }
  function uploadFromEmptySlot(event,slot){
    event.preventDefault();event.stopImmediatePropagation();
    replacing=slot.id;uploadKind='photo';say('Wähle jetzt ein Foto für diesen Platzhalter aus.');$('[data-ux-file]').click();
  }
  let photoPointer=null;
  r.addEventListener('pointerdown',event=>{
    const slot=event.button===0?emptySlotFromTarget(event.target):null;
    photoPointer=slot?{id:slot.id,pointerId:event.pointerId,x:event.clientX,y:event.clientY}:null;
  },true);
  r.addEventListener('pointerup',event=>{
    const start=photoPointer;photoPointer=null;
    if(!start||start.pointerId!==event.pointerId||Math.hypot(event.clientX-start.x,event.clientY-start.y)>6)return;
    const slot=el.state.objects.find(o=>o.id===start.id);
    if(slot?.type==='photoSlot'&&!slot.uxUploadId&&!slot.uxHidden&&!slot.uxLocked)uploadFromEmptySlot(event,slot);
  },true);
  r.addEventListener('pointercancel',()=>{photoPointer=null;},true);
  r.addEventListener('keydown',event=>{
    const slot=emptySlotFromTarget(event.target);
    if(slot&&(event.key==='Enter'||event.key===' '))uploadFromEmptySlot(event,slot);
  },true);
  const fieldLabel=(object,index)=>profile.designs.find(d=>d.id===el.state.designId)?.customerFields?.find(f=>f.id===object.id)?.label||({heading:'Überschrift',names:'Namen',place:'Ort',date:'Datum',slogan:'Spruch'})[object.fieldKey]||'Text '+(index+1);
  function updateFields(){const texts=el.state.objects.filter(o=>o.type==='text');const signature=el.state.designId+'|'+texts.map((o,i)=>o.id+':'+fieldLabel(o,i)).join('|');if(signature!==fieldSignature){fieldSignature=signature;$('.ux-fields').innerHTML=texts.map((o,i)=>`<div class="ux-text-row" data-ux-row="${esc(o.id)}"><label for="ux-text-${i}">${esc(fieldLabel(o,i))}</label><textarea id="ux-text-${i}" rows="1" data-ux-text="${esc(o.id)}" aria-label="${esc(fieldLabel(o,i))}"></textarea></div>`).join('');}
    for(const field of all('[data-ux-text]')){const o=texts.find(o=>o.id===field.dataset.uxText);if(r.activeElement!==field)field.value=o.text;field.disabled=!!o.uxLocked||!!o.uxHidden;field.closest('.ux-text-row').classList.toggle('is-selected',el.state.selected===o.id);}
    const o=selected(),isText=o?.type==='text';$('.ux-controls').hidden=!isText;
    if(isText){$('[data-ux-font-name]').textContent=o.font;if(r.activeElement!==$('#ux-size'))$('#ux-size').value=(config?.workbench?.embedded?roundEdit(o.size):displayTextSize(o));$('[data-ux=bold]').setAttribute('aria-pressed',!!o.bold);$('[data-ux=italic]')?.setAttribute('aria-pressed',!!o.italic);if($('[data-ux-color]'))$('[data-ux-color]').value=o.color||'#202824';for(const f of all('[data-ux-prop]'))if(r.activeElement!==f)f.value=(config?.workbench?.embedded?roundEdit(o[f.dataset.uxProp]||0):Math.round((o[f.dataset.uxProp]||0)*10)/10);}
  }
  function renderFontPage(){const o=el.state.objects.find(o=>o.id===fontObject);if(!o)return;const fonts=availableFonts();
    $('[data-ux=font-apply]').disabled=!fonts.includes(fontChoice)||!fontFits({...o,bold:false},fontChoice);
    $('.ux-font-grid').innerHTML=fonts.length?fonts.map(name=>{
      const text={...o,text:o.text.trim()?o.text:'Dein Text',font:name,size:12,bold:false};let unavailable=false;
      try{measureText(text,el.fontData);}catch{
        unavailable=true;
        const sample=profile.designs.flatMap(d=>d.objects||[]).find(v=>v.type==='text'&&v.font===name&&v.text?.trim());
        text.text=sample?.text||Object.keys(el.fontData[name]?.regular?.glyphs||{}).filter(c=>c.trim()).slice(0,12).join('');
        try{measureText(text,el.fontData);}catch{return `<button disabled><span>${esc(name)}</span><small>Keine Schriftprobe verfügbar</small></button>`;}
      }
      return `<button type="button" data-ux-font="${esc(name)}" aria-pressed="${fontChoice===name}" aria-label="Schrift ${esc(name)}" ${unavailable?'disabled':''}><svg viewBox="${-text.w/2-2} ${-text.h/2-2} ${text.w+4} ${text.h+4}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" fill="#243a32"><g data-font-ink>${textPaths(text,el.fontData)}</g></svg><span>${esc(name)}${unavailable?'<small>Designbeispiel · Zeichen für deinen Text fehlen</small>':''}</span></button>`;
    }).join(''):'<p>Für dieses Produkt sind keine weiteren Schriften freigegeben. Die Schrift aus deinem Design bleibt erhalten.</p>';
    // Letter advances omit calligraphic overhangs. Fit the actual ink once the
    // dialog is visible, so Safari and Chromium measure a rendered SVG.
    for(const svg of all('.ux-font-grid svg')){const b=svg.querySelector('[data-font-ink]').getBBox();if(b.width>0&&b.height>0){const pad=Math.max(1,b.height*.12);svg.setAttribute('viewBox',`${b.x-pad} ${b.y-pad} ${b.width+2*pad} ${b.height+2*pad}`);}}
  }
  function updateGallery(){const tab=$('#ux-tab-design'),hasChoice=profile.designs.length>1;tab.hidden=!hasChoice;tab.disabled=!hasChoice;tab.tabIndex=hasChoice&&activeTab==='design'?0:-1;$('.ux-tabs').style.setProperty('--ux-tab-count',all('[data-ux-tab]').filter(b=>!b.hidden).length);if(!hasChoice&&activeTab==='design')showTab('text');const cards=all('[data-c-design]');const filters=Object.fromEntries(all('[data-m-filter]').map(f=>[f.dataset.mFilter,f.value]));let shown=0;for(const card of cards){const d=designFor(card.dataset.cDesign);card.hidden=!!((filters.category&&d?.category!==filters.category)||(filters.collection&&!d?.collections?.includes(filters.collection)));if(!card.hidden)shown++;const note=card.querySelector('small');if(note)note.hidden=true;}const count=$('[data-c-count]');if(count)count.textContent=shown+' Designs';}
  const designFor=id=>profile.designs.find(d=>d.id===id);
  function label(o){return o.uxDecoration?'Gestaltungslinie':o.uxUploadId?(o.uxUploadKind==='logo'?'Dein Logo':'Dein Foto'):o.type==='text'?(o.text||'Leerer Text'):o.type==='motif'?(el.catalog.motif_labels?.[o.motif]||'Motiv'):names[o.type]||'Element';}
  function renderContents(){if(!dialogs.contents.open||r.activeElement?.matches('[data-ux-content-prop]'))return;$('[data-ux-contents-list]').innerHTML=el.state.objects.map(o=>`<div class="ux-content-row">${button('select-content',`${esc(label(o))}<small>${o.uxHidden?'Ausgeblendet':'Auf deinem Produkt'}${o.uxLocked?' · gesperrt':''}</small>`,`data-id="${esc(o.id)}" aria-pressed="${o.id===el.state.selected}"`)}<label title="Anzeigen oder ausblenden"><input type="checkbox" data-ux-visible="${esc(o.id)}" aria-label="${esc(label(o))} anzeigen" ${o.uxHidden?'':'checked'}></label>${button('lock',o.uxLocked?'🔒':'🔓',`data-id="${esc(o.id)}" aria-label="${esc(label(o))} ${o.uxLocked?'entsperren':'sperren'}" aria-pressed="${!!o.uxLocked}"`)}${button('remove-content',icons.delete||'×',`data-id="${esc(o.id)}" aria-label="${esc(label(o))} löschen" ${o.uxLocked?'disabled':''}`)}</div>`).join('');
    for(const item of el.state.objects.filter(o=>o.type==='motif-raster')){
      const row=[...all('.ux-content-row')].find(node=>node.querySelector('[data-ux="select-content"]')?.dataset.id===item.id);
      row?.querySelector('[data-ux="remove-content"]')?.setAttribute('disabled','');
      row?.querySelector('[data-ux="lock"]')?.setAttribute('disabled','');
    }
    const o=selected();$('[data-ux-object-tools]').innerHTML=o?`<h3>${esc(label(o))}</h3><div class="ux-precise-fields">${[['x','Horizontal · mm'],['y','Vertikal · mm'],['rotation','Drehung · °'],...(o.type==='text'?[['size','Schriftgröße · mm']]:[['w','Breite · mm'],['h','Höhe · mm']])].map(([key,title])=>`<label>${title}<input type="number" value="${key==='size'?displayTextSize(o):Math.round((o[key]||0)*10)/10}" data-ux-content-prop="${key}" ${o.uxLocked?'disabled':''} step="1"></label>`).join('')}</div><div class="ux-actions">${button('duplicate','Duplizieren')}${button('layer-front','Nach vorn')}${button('layer-back','Nach hinten')}</div>`:'';
  }
  function updateUploads(){const available=photoAvailableForDesign(config,el.state.designId),tab=$('#ux-tab-upload');if(tab){tab.hidden=!available&&!logoEnabled;tab.disabled=tab.hidden;if(tab.hidden&&activeTab==='upload')showTab('options');$('.ux-tabs').style.setProperty('--ux-tab-count',all('[data-ux-tab]').filter(b=>!b.hidden).length);}for(const b of all('[data-ux=photo-upload]'))b.hidden=!available;$('.ux-uploads').innerHTML=el.state.objects.filter(o=>o.type==='photoSlot'&&!o.uxUploadId).map((o,i)=>`<div class="ux-upload-row"><strong>Fotoplatzhalter ${i+1}</strong><span>Dein Foto übernimmt Position, Größe und Form aus dem Design.</span><div class="ux-upload-actions">${button('fill-photo-slot','Foto für diesen Platzhalter hochladen',`data-id="${esc(o.id)}" ${o.uxLocked?'disabled':''}`)}</div></div>`).join('')+el.state.objects.filter(o=>o.uxUploadId).map(o=>`<div class="ux-upload-row">${files.get(o.uxUploadId)?.url?`<button type="button" class="ux-upload-select" data-ux="select-upload" data-id="${esc(o.id)}" aria-label="${esc(label(o))} auswählen"><img class="ux-upload-thumb" src="${esc(files.get(o.uxUploadId).url)}" alt="${esc(label(o))} – Vorschau"></button>`:''}<strong>${esc(label(o))}</strong><span>${esc(files.get(o.uxUploadId)?.file.name||'Datei erneut auswählen')} · ${o.uxHidden?'ausgeblendet':(config?.reviewOnly&&config.basePriceCents===null)?'Preis offen':config?.acrylic?'inklusive':config?.photo?.includedCount!==undefined?'nach Fotopreisregel':'9,99 €'}</span><div class="ux-upload-actions">${button('replace-upload','Ersetzen',`data-id="${esc(o.id)}"`)}${button('remove-content','Entfernen',`data-id="${esc(o.id)}" class="ux-remove-upload"`)}</div></div>`).join('');for(const b of all('[data-ux=photo-upload],[data-ux=logo-upload]'))b.disabled=new Set(el.state.objects.filter(o=>o.uxUploadId).map(o=>o.uxUploadId)).size>=4;}
  function updatePrice(){if(config?.reviewOnly&&config.basePriceCents===null){$('[data-fk-total]').textContent='Preis noch offen';$('[data-ux-price-lines]').innerHTML='<p>Grundpreis und Fotozuschläge sind für dieses Produkt noch offen. Die Optionen zeigen die übernommenen Referenzaufschläge.</p>';return;}try{const quantity=Number($('[data-fk-quantity]').value||1),extra=uploadQuote(el.state.objects,quantity,false,config?.photo?.includedCount!==undefined?config.photo:undefined);let total,base,options=0,motifs=0;
    if(config){const q=quote(config,el.state.objects,el.state.designId,el.state.mOptions,quantity);total=q.totalCents+extra.totalCents;base=config.basePriceCents;motifs=q.additionalMotifs*config.extraMotifCents;options=q.unitCents-base-motifs;}
    else{base=legacy.purchasing.basePriceCents;options=legacy.mounting.options.find(v=>v.key===el.state.fkMounting)?.surchargeCents||0;motifs=additionalMotifCount(el.state.objects,design()?.objects||[])*(legacy.purchasing.motifPriceCents??169);total=(base+options+motifs)*quantity+extra.totalCents;}
    const optionNames=config?(profile.optionGroups||[]).map(g=>g.values.find(v=>v.id===(el.state.mOptions?.[g.id]||g.defaultValueId))?.label).filter(Boolean).join(', '):legacy.mounting.options.find(v=>v.key===el.state.fkMounting)?.name;
    $('[data-fk-total]').textContent=config?.demo?'Materialdemo':money(total);$('[data-ux-price-lines]').innerHTML=config?.demo?'<p>Reiner Profiltest ohne Artikelpreis oder Shopify-Zuordnung.</p>':`<p>Grundpreis: <strong>${money(base)}</strong></p><p>${esc(optionNames||'Optionen')}: ${money(options)}</p><p>Zusätzliche Motive: ${money(motifs)}</p><p>Fotos / Logos (${extra.count}): ${money(extra.unitCents)}</p><p>Menge: ${quantity}</p><p>Gesamt: <strong>${money(total)}</strong></p><small>Inkl. MwSt. · zzgl. Versand. Berechnet werden nur Fotos und Logos, die auf deinem Produkt sichtbar sind.</small>`;
  }catch(error){say(error.message);}}
  function update(){updateFields();updateGallery();updateUploads();updatePrice();$('[data-ux-guides]').checked=$('[data-setting=guides]').checked;$('[data-ux-count]').textContent=`(${el.state.objects.length})`;$('[data-ux=undo]').disabled=!el.history.length;$('[data-ux=redo]').disabled=!el.future.length;$('.fk-buy-button').disabled=true;$('.fk-order-status').textContent=config?.productPreview?'Produktvorschau · Bestellung noch nicht verbunden':'Lokaler Prüfstand · Bestellung noch nicht verbunden';renderContents();if(dialogs.contents.open&&isPrint&&selected()&&!$('[data-ux-content-color]'))$('[data-ux-object-tools]').insertAdjacentHTML('beforeend','<label class="ux-print-color">Druckfarbe <input type="color" data-ux-content-color aria-label="Druckfarbe des ausgewählten Elements" value="'+esc(selected().color||'#202824')+'"></label>');}
  let previousCorrection='',correctionReady=false;
  function notifyCorrection(){if(!config?.workbench?.embedded||!correctionReady)return;const design=roundDesign({id:el.state.designId,objects:el.state.objects}),value=JSON.stringify(design);if(value!==previousCorrection){previousCorrection=value;window.parent.postMessage({type:'gravuru-workbench-change',...design},location.origin);}}
  const oldSync=el.sync;el.sync=function(...args){const result=oldSync.apply(this,args);update();notifyCorrection();return result;};
  function openFonts(){const o=selected();if(o?.type!=='text')return say('Bitte zuerst eine Textzeile auswählen.');fontObject=o.id;fontChoice=o.font;dialogs.font.showModal();renderFontPage();}
  function guide(key){const content={text:['Text ändern','Tippe auf eine Textzeile und ersetze den Beispieltext. Alle Änderungen siehst du sofort auf deinem Produkt.'],font:['Schrift & Größe','Wähle eine Textzeile und danach „Schrift ändern“. Du siehst deinen eigenen Text in jeder Schrift. Mit Plus und Minus änderst du die Größe. Der Schriftgrößenwert beträgt mindestens 4 mm.'],guides:['Mittig ausrichten','Aktiviere „Hilfslinien“ unten links im Produktbild. Wähle deinen Text und tippe auf „Mitte“. Beim Ziehen rastet er auch an der Mitte und den Kanten anderer Texte ein. Ankerpunkte zeigen dir die Textmitten, damit du Texte untereinander setzen kannst.'],motif:['Deine Motive',config?.acrylic?'Vorlagenmotive bleiben fest platziert; ihre Farbe kannst du ändern. Eigene zusätzliche Motive kannst du in der Motivbibliothek hinzufügen und bearbeiten.':'Wähle Motive aus Bestsellern oder Kategorien. In „Ebenenverwaltung“ kannst du ein freigegebenes Motiv bearbeiten.'],upload:['Fotos & Logos',config?.acrylic?'Ein Foto ist enthalten. Tippe auf das Beispielfoto, um dein eigenes Foto an derselben Position einzusetzen. Ein weiterer Upload ersetzt dieses Foto. Der Hintergrund bleibt erhalten.':(config?.reviewOnly&&config.basePriceCents===null)?'Du kannst bis zu vier Fotos und Logos testen. Die Preise für dieses Produkt sind noch offen. Dein Bild erscheint direkt in der Vorschau. Zuschneiden öffnet die Bildbearbeitung.':'Du kannst bis zu vier Fotos und Logos zusammen hinzufügen. Jede sichtbare Datei kostet 9,99 Euro extra. Dein Bild erscheint direkt in der Vorschau. Über „Bild bearbeiten“ kannst du dein Foto zuschneiden, drehen oder spiegeln.'],save:['Entwurf speichern',config?.workbench?'Mit „Entwurf speichern“ sicherst du Text, Schrift und Positionen dauerhaft in der Produktanlage. Testfotos werden nicht als Vorlage gespeichert.':'Dauerhafte Entwürfe gehören in dein Kundenkonto. Im lokalen Prüfstand ist diese Verbindung noch nicht aktiv. Nach dem bezahlten Kauf ist ein PNG-Download vorgesehen.']}[key];if(!content)return;
    if(['text','font','guides'].includes(key))showTab('text');else if(key==='motif')showTab('motif');else if(key==='upload')showTab('upload');
    $('[data-ux-help-content]').innerHTML=`<h3>${content[0]}</h3><p data-ux-guide-copy>${content[1]}</p>${button('speak','Erklärung anhören')}${button('stop-speaking','Stopp')}<p class="ux-small">Vorlesen mit der verfügbaren Gerätestimme.</p>`;
  }
  r.addEventListener('click',async e=>{
    const tab=e.target.closest('[data-ux-tab]');if(tab){showTab(tab.dataset.uxTab);return;}
    const font=e.target.closest('[data-ux-font]');if(font){if(font.disabled||!availableFonts().includes(font.dataset.uxFont))return;fontChoice=font.dataset.uxFont;for(const b of all('[data-ux-font]'))b.setAttribute('aria-pressed',String(b===font));$('[data-ux=font-apply]').disabled=false;return;}
    const b=e.target.closest('[data-ux]');if(!b||b.disabled)return;const action=b.dataset.ux;
    if(action==='back'){window.parent.postMessage({type:'gravuru-fk-close'},location.origin);return;}
    if(action==='account'&&window.parent.GravuruWorkshopReview){$('.completion-finish')?.click();return;}
    if(action==='account'&&config?.workbench){
      if(el.state.objects.some(o=>o.uxUploadId))return say('Testfotos zuerst entfernen. Die Vorlage speichert Fotofelder; Kundenfotos gehören zur Bestellung.');
      window.parent.postMessage({type:'gravuru-workbench-save',designId:el.state.designId,objects:roundDesign({objects:el.state.objects}).objects},location.origin);return;
    }
    if(action==='account'||action==='price'){dialogs[action].showModal();return;}
    if(action==='help'){for(const d of all('.ux-dialog[open]'))d.close();if(window.GravuruChat&&!$('.c-large-preview').open){window.GravuruChat.show(({options:'form',upload:'logo'})[activeTab]||activeTab);}else{guide(activeTab==='text'?'text':activeTab==='upload'?'upload':'guides');dialogs.help.showModal();}return;}
    if(action==='alignment-help'){guide('guides');dialogs.help.showModal();return;}
    if(action.startsWith('guide-')){guide(action.slice(6));return;}
    if(action==='speak'){if(!('speechSynthesis'in window))return say('Vorlesen ist in diesem Browser nicht verfügbar.');speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance($('[data-ux-guide-copy]').textContent);voice.lang='de-DE';voice.rate=.9;speechSynthesis.speak(voice);return;}
    if(action==='stop-speaking'){window.speechSynthesis?.cancel();return;}
    if(action==='enlarge'){if(!$('.c-large-preview').open)$('[data-guide-preview]')?.click();return;}
    if(action==='fonts'){openFonts();return;}
    if(action==='font-apply'){const object=el.state.objects.find(o=>o.id===fontObject);if(!object||!availableFonts().includes(fontChoice)||!fontFits({...object,bold:false},fontChoice)){e.stopImmediatePropagation();say('Bitte eine verfügbare Schrift auswählen.');return;}select(fontObject);changeObject('font',fontChoice);dialogs.font.close();return;}
    if(action==='contents'){dialogs.contents.showModal();update();return;}
    if(action==='select-content'){select(b.dataset.id);return;}
    if(action==='lock'){mutate(()=>{const o=el.state.objects.find(o=>o.id===b.dataset.id);if(o?.type==='motif-raster')return;o.uxLocked=!o.uxLocked;});return;}
    if(action==='remove-content'){const o=el.state.objects.find(o=>o.id===b.dataset.id);if(!o||o.uxLocked||o.locked||o.acrylicFixed)return;mutate(()=>{el.state.objects=el.state.objects.filter(v=>v.id!==o.id);if(el.state.selected===o.id)el.state.selected=null;});return;}
    if(['photo-upload','logo-upload','replace-upload','fill-photo-slot'].includes(action)){replacing=['replace-upload','fill-photo-slot'].includes(action)?b.dataset.id:null;uploadKind=replacing?(el.state.objects.find(o=>o.id===replacing)?.uxUploadKind||'photo'):action==='logo-upload'?'logo':'photo';$('[data-ux-file]').click();return;}
    if(action==='add-text'){el.add({type:'text',text:'Dein Text',font:config?'Montserrat':'Nunito',size:10,bold:false});showTab('text');return;}
    if(action==='smaller'||action==='bigger'){changeObject('size',(selected()?displayTextSize(selected()):4)+(action==='bigger'?1:-1));return;}
    if(action==='bold'||action==='italic'){changeObject(action,!selected()?.[action]);return;}
    if(['left','center','right'].includes(action)){if(el.uxAlign){el.uxAlign(action);return;}const o=selected();if(o)changeObject('x',action==='center'?width/2:action==='left'?o.w/2+8:width-o.w/2-8);return;}
    if(['layer-front','layer-back'].includes(action)){if(!selectable())return;mutate(()=>{const o=selected();el.state.objects=el.state.objects.filter(v=>v.id!==o.id);if(action==='layer-front')el.state.objects.push(o);else el.state.objects.unshift(o);});return;}
    if(['undo','redo','delete','duplicate'].includes(action)){if(['delete','duplicate'].includes(action)&&selected()?.locked)return say('Das feste Rastermotiv kann verschoben und skaliert werden.');if(action==='duplicate'&&selected()?.uxUploadId)return say('Bitte Fotos und Logos über den Upload hinzufügen, damit Anzahl und Aufpreis eindeutig bleiben.');await el.action(action);return;}
  });
  r.addEventListener('focusin',e=>{const f=e.target.closest('[data-ux-text]');if(f&&el.state.selected!==f.dataset.uxText){el.state.selected=f.dataset.uxText;el.sync();}});
  r.addEventListener('input',e=>{const t=e.target;if(t.dataset.uxText){if(!t.dataset.editStarted){el.record();t.dataset.editStarted='true';}const o=el.state.objects.find(o=>o.id===t.dataset.uxText);o.text=t.value;dirty=true;el.normalize();el.sync();}if(t.matches('[data-fk-quantity]'))updatePrice();});
  r.addEventListener('input',e=>{const t=e.target,key=t.id==='ux-size'?'size':t.dataset.uxProp||t.dataset.uxContentProp;if(key&&t.value!==''&&Number.isFinite(Number(t.value))){e.stopImmediatePropagation();const value=Number(t.value);if(!['w','h','size'].includes(key)||value>0)changeObject(key,value);}},true);
  r.addEventListener('focusout',e=>{if(e.target.dataset.uxText)delete e.target.dataset.editStarted;if(e.target.id==='ux-size'&&selected()?.type==='text')e.target.value=displayTextSize(selected());});
  let uploadPending=false;
  async function acceptFiles(incoming,kind=uploadKind,replaceId=replacing){
    if(config.acrylic&&kind==='photo'&&!replaceId){const slots=el.state.objects.filter(o=>o.type==='photoSlot');replaceId=slots.find(o=>o.fieldKey==='photo-main')?.id||(slots.length===1?slots[0].id:null);}
    if(!uploadAllowed(config,kind)||kind==='photo'&&!photoAvailableForDesign(config,el.state.designId)){say('Diese Vorlage hat noch keinen austauschbaren Fotobereich.');return;}
    if(uploadPending)return;uploadPending=true;let revealedId=null;
    try{for(const file of (replaceId?[...incoming].slice(0,1):[...incoming])){let url;
      try{const prior=uploadTarget(el.state.objects,kind,replaceId,el.state.selected);if(replaceId&&!prior)throw Error('Der gewählte Fotobereich ist nicht mehr verfügbar. Bitte erneut auswählen.');if(prior&&el.uxCanEdit?.(prior,'replace')===false)throw Error('Dieses Foto ist Bestandteil des Designs und kann nicht ersetzt werden.');validateUpload(file,el.state.objects,prior?.uxUploadId);url=URL.createObjectURL(file);const image=new Image();image.src=url;await image.decode();if(image.naturalWidth*image.naturalHeight>40_000_000)throw Error('Bitte ein Bild mit höchstens 40 Megapixeln wählen.');
        if(prior&&!el.state.objects.includes(prior))throw Error('Das Design wurde gewechselt. Bitte das Foto erneut auswählen.');
        if(prior?.uxLocked)throw Error('Bitte den Fotobereich zuerst entsperren.');
        validateUpload(file,el.state.objects,prior?.uxUploadId);
        const id=crypto.randomUUID();files.set(id,{file,url,width:image.naturalWidth,height:image.naturalHeight});url=null;
        mutate(()=>{let o=prior;if(!o&&kind==='photo')o=el.state.objects.find(o=>o.type==='photoSlot'&&!o.uxUploadId);if(!o){o={id:el.id(),type:kind==='logo'?'image':'photoSlot',x:width/2,y:height*.35,w:Math.min(width*.3,50),h:Math.min(height*.25,50),rotation:0,customerEditable:true,uxPersonal:true};if(kind==='photo')Object.assign(o,{photoShape:'rect',fieldKey:'photo-'+crypto.randomUUID(),required:false});el.state.objects.push(o);}o.uxUploadId=id;delete o.uxPhotoCrop;o.uxUploadKind=kind;if(kind==='photo')o.uxPhotoBackground=o.uxPhotoBackground==='keep'?'keep':'remove';else delete o.uxPhotoBackground;o.uxHidden=false;delete o.preserveColors;el.state.selected=o.id;revealedId=o.id;});say('Bild übernommen.');
      }catch(error){if(url)URL.revokeObjectURL(url);say(error.message);break;}
    }}finally{uploadPending=false;replacing=null;
      if(revealedId){showTab('upload');requestAnimationFrame(()=>{const target=all('[data-ux=select-upload]').find(b=>b.dataset.id===revealedId);if(!target)return;target.focus({preventScroll:true});});}
    }
  }
  r.addEventListener('change',async e=>{const t=e.target;
    if(t.matches('[data-ux-guides]')){const field=$('[data-setting=guides]');field.checked=t.checked;field.dispatchEvent(new Event('change',{bubbles:true}));el.sync();}
    if(t.matches('[data-ux-dimensions]'))$('.ux-preview').dataset.dimensions=String(t.checked);
    if(t.id==='ux-size')changeObject('size',Number(t.value));
    if(t.matches('[data-ux-color],[data-ux-content-color]')&&isPrint)changeObject('color',t.value);
    if(t.dataset.uxProp||t.dataset.uxContentProp){const prop=t.dataset.uxProp||t.dataset.uxContentProp,value=Number(t.value);if(Number.isFinite(value)&&(!['w','h','size'].includes(prop)||value>0))changeObject(prop,value);}
    if(t.dataset.uxVisible)mutate(()=>{el.state.objects.find(o=>o.id===t.dataset.uxVisible).uxHidden=!t.checked;if(!t.checked&&el.state.selected===t.dataset.uxVisible)el.state.selected=null;});
    if(t.dataset.mFilter)updateGallery();
    if(t.matches('[data-ux-file]')){const incoming=[...t.files];t.value='';await acceptFiles(incoming);}
  },true);
  dialogs.help.addEventListener('close',()=>window.speechSynthesis?.cancel());
  // A portable draft payload is provided to the future authenticated server adapter, not downloaded.
  el.uxDraft=()=>customerDraft(el.state,profile);
  await installRefinements({el,r,profile,config,files,pending:()=>uploadPending,selected,select,mutate,showTab,say,dialog,dialogs,button,esc,acceptFiles,changeObject});
  if(el.uxMotifChoiceIds?.length===0){
    const entry=$('.workflow-motif-entry');
    if(entry){const note=document.createElement('p');note.textContent='Für dieses Produkt sind keine zusätzlichen Motive freigegeben. Die Motive im Design bleiben erhalten.';entry.append(note);entry.querySelector('[data-ux=discover-motifs]').hidden=true;entry.querySelector('.completion-motif-nav')?.setAttribute('hidden','');}
    $('.ux-motif-pricing').hidden=true;
  }
  if($('[data-bestsellers]')?.hidden)$('[data-ux=bestsellers]')?.setAttribute('hidden','');
  if(config)installCommerce({el,config,files,pending:()=>uploadPending});
  if(config?.acrylic)await installAcrylicScene({el,r,config,files,select,selected,say,acceptFiles});
  finishCustomerRights();
  finishTemplateDeletion();
  installFirstTextFocus({el,r});
  function startUnselected(){r.activeElement?.blur();el.multiSelecting=false;el.state.selected=null;el.centerSuggestion=null;showTab(config?.productPreview?'design':'options');el.sync();}
  window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===window.parent&&e.data?.type==='gravuru-ux-open')startUnselected();});
  addDecoration();el.normalize();startUnselected();if(config?.workbench?.embedded){showTab('text');for(const field of all('input[type=number]'))field.step='.01';if($('#ux-size'))$('#ux-size').min='1';r.addEventListener('focusout',e=>{if(e.target.type==='number'&&e.target.value!==''&&Number.isFinite(e.target.valueAsNumber))e.target.value=roundEdit(e.target.valueAsNumber);});previousCorrection=JSON.stringify(roundDesign({id:el.state.designId,objects:el.state.objects}));correctionReady=true;const s=document.createElement('style');s.textContent='.ux-cart-bar,.ux-bottom-bar,.ux-price-bar,.fk-buy-row{display:none!important}';r.append(s);}
  window.addEventListener('pagehide',()=>{for(const asset of files.values())URL.revokeObjectURL(asset.url);},{once:true});
  if(config?.workbench)window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===window.parent&&event.data?.type==='gravuru-workbench-saved')say(event.data.message);});
  installPrintExport({el,config,files});
  installPreviewFeedback({el,r});
  const neutral=document.createElement('style');neutral.textContent=await fetch('/configurator/variant-m/neutral-theme.css').then(res=>{if(!res.ok)throw Error('Oberflächenstil fehlt');return res.text();});r.append(neutral);r.host.dataset.uxNeutral='true';
  window.parent.postMessage({type:'gravuru-ux-ready'},location.origin);
  const assistant=document.createElement('script');assistant.src='/assistant.js';assistant.dataset.api=location.origin;document.body.append(assistant);
  return {showTab,update,isDirty:()=>dirty};
}
