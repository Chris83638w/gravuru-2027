import {isScalableSizes} from './scalable-sizes.mjs';
import {updateBackingPreviewViewport} from './backing-preview-viewport.mjs';
import {contourPathWithHoles} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {contourGuides} from './contour-guides.mjs';
import {spacerPreview,screwPreview,keepoutPreview,optionTileIcon,optionTilePrice} from './option-media.mjs';
import {designAreaPreview} from './design-area.mjs';
import {customerMotifs} from './customer-motifs.mjs';
import {studioSvg,universalPreviewViewport} from '../../platform/sources/app/shared/models/studio-svg.mjs';
import {surfacePreview,embedSurface,scenePreview,previewSurfaceUrl,plateClipMarkup,plateDepthPreview} from './material-surface.mjs';
import {physicalGeometry} from './print-geometry.mjs';
import {decorateEmptyPhotoSlots} from './photo-placeholder.mjs';
// Fototipp auf der Platte, bevor die Kundenoberfläche fertig ist (build.mjs ruft es direkt nach mount auf).
export {installEarlyPhotoTap} from './photo-upload.mjs';
import {getProcessingProfile, elementColor} from '../../platform/sources/app/shared/models/processing-profiles.mjs';
import {measureText} from '../../platform/sources/app/shared/models/text-paths.mjs';
import {escapeXml as esc, filteredDesigns} from '../../platform/sources/app/shared/models/design-content.mjs';
import {prepareConfig, selectedProfile, quote, money, saveDraft, readDraft, designFromState, validatePhotoFile, newEditableObject, resolvedOptions} from './contract.mjs';
import {changedCustomerTexts, transferTexts} from './workflow-model.mjs';
import {optionFields, FIELD_TEXT_DEFAULT_MAX} from './option-fields.mjs';
import {objectSurface, surfaceGeometry} from './surfaces.mjs';
import {designResourcesReady} from './product-view-module.mjs';
import {isLayeredDoorbell} from './product-model-module.mjs';
import {doorbellOptionState,updateDoorbellViewport,doorbellTextSurface} from './product-view-module.mjs';
import {installDoorbellPresentation} from './product-view-module.mjs';
import {isFamilyFormats,familyFormatState,familyDesignReviewNote} from './family-formats.mjs';
import {installExecutionPresentation} from './product-execution-module.mjs';
import {executionOptionGroups} from './execution-registry.mjs';
import {mountingPlacementState} from './mounting-placement.mjs';
import {prepareNativeShellState} from './native-shell-state.mjs';
import {finishNativeShell} from './native-shell-ui.mjs';
import {updateProductViewport} from './product-viewport.mjs';
import {scalableSizeState} from './scalable-size-state.mjs';

const clone = value => structuredClone(value);
const svgDocument = svg => new DOMParser().parseFromString(svg, 'image/svg+xml');
const pendingThumbnail='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" role="img" aria-label="Designvorschau wird geladen"></svg>';

export function installUniversal(configInput) {
  const config = prepareConfig(configInput), p = config.profile, processing = getProcessingProfile(p);
  const dynamicDoorbell=isLayeredDoorbell(config);
  const dynamicFamily=isFamilyFormats(config),dynamicSizes=isScalableSizes(config),dynamicProfiles=dynamicFamily||dynamicSizes,dynamicFormats=dynamicDoorbell||dynamicProfiles;
  let options = {}, quantity = 1, el, renderId = 0;
  const photos = new Map(); // File objects stay in this page. Never localStorage, URL, draft or Git.
  const thumbnails=new WeakMap();
  const current = () => designFromState(config, el.state);
  // K14 / Ü15.1: gewählte Seite (`el.state.uxSurface`, Standard vorn); von hinten sind die Bohrlöcher gespiegelt.
  const activeSurface = () => el?.state?.uxSurface === 'back' ? 'back' : 'front';
  // The physical options select the immutable template set. Doorbell glyphs
  // and preview assets load separately into the editor's resource maps.
  let projectionKey=null,projectedProfile=null;
  const profile = (surface = activeSurface()) => {
    const key=dynamicFormats?JSON.stringify(options):null;
    if(dynamicFormats&&key!==projectionKey){projectedProfile=selectedProfile(config,options);projectionKey=key;}
    const sp=dynamicFormats?projectedProfile:selectedProfile(config,options);
    return surface==='back'?{...sp,geometry:surfaceGeometry(sp.geometry,'back')}:sp;
  };
  const motifs = () => customerMotifs(config, el.motifs, el.catalog);
  const svg = (design, {guides=false, selected='', handles=false, keepout=false, surface='front', screen=false, bare=false} = {}) => {
    const visible={...design,textOnTop:true,objects:design.objects.filter(o=>!o.uxHidden&&objectSurface(o)===surface)};
    let result=surfacePreview(studioSvg(profile(surface), visible, el.fontData,{frameKey:options.frame,color:options.color,mountingKey:options.mounting,motifs:motifs(),media:[],guides,selected,handles,id:'customer-'+(++renderId)}),bare?'':screen?previewSurfaceUrl(config.materialSurface):config.materialSurface,profile(surface).geometry);
    if(dynamicFamily&&screen&&!bare)result=plateDepthPreview(result,profile(surface).geometry,'customer-'+renderId);
    if(config.reviewOnly){const doc=svgDocument(result);for(const o of visible.objects.filter(o=>o.type==='photoSlot'&&!o.uxUploadId)){const group=doc.querySelector('[data-object="'+CSS.escape(o.id)+'"]');if(group){for(const rect of group.querySelectorAll('rect:not([fill="transparent"])')){rect.setAttribute('fill','none');rect.setAttribute('stroke-dasharray','2 2');}for(const text of group.querySelectorAll('text'))text.setAttribute('fill',processing.ink);}}result=doc.documentElement.outerHTML;}
    if(el.uxObjectSVG){const doc=svgDocument(result);for(const o of visible.objects){const replacement=el.uxObjectSVG(o);if(replacement!==undefined){const group=doc.querySelector('[data-object="'+CSS.escape(o.id)+'"]');if(group)group.outerHTML=replacement;}}result=doc.documentElement.outerHTML;}
    // Clip artwork to the real plate for every universal shape; external edit handles remain outside.
    // This is visual containment only. The shared placement and server validation still reject overflow.
    if(!bare){const doc=svgDocument(result),root=doc.documentElement,clipId='customer-artwork-'+renderId,ns='http://www.w3.org/2000/svg';
      const acrylic=dynamicDoorbell?doorbellTextSurface(profile(surface)):null;
      const outline=acrylic?'<rect x="'+acrylic.x+'" y="'+acrylic.y+'" width="'+acrylic.width+'" height="'+acrylic.height+'"/>':plateClipMarkup(profile(surface).geometry);
      const defs=doc.createElementNS(ns,'defs');defs.innerHTML='<clipPath id="'+clipId+'">'+outline+'</clipPath>';root.prepend(defs);
      for(const group of [...root.querySelectorAll('[data-object]')]){const wrapper=doc.createElementNS(ns,'g');wrapper.setAttribute('clip-path','url(#'+clipId+')');group.before(wrapper);wrapper.append(group);}result=root.outerHTML;
    }
    // Design boundary and drill-hole zones are preview layers only (keepout flag = editor preview); el.svg() for the order carries neither.
    // Rote Schutzringe um die Bohrlöcher zeigt der Kundeneditor nicht mehr (Chris 20.10.2026), und seit 22./23.10.2026
    // auch keinen Hinweis zu Texten nahe an Löchern (nur noch mechanische Prüfung). Schrauben/Abstandshalter
    // erscheinen, wenn die Befestigung sie enthält.
    return scenePreview(designAreaPreview(keepoutPreview(screwPreview(spacerPreview(result,profile(surface)),profile(surface)),profile(surface),{show:false,emphasis:guides}),config,profile(surface),{show:keepout}),config.sceneBackground);
  };
  const locked = o => !!o?.uxLocked;

  // Leistung (Fehler 20.10.2026): Die Altgalerie ruft thumb() bei jedem sync für jede Karte auf –
  // beim Ziehen also je Fingerbewegung. Vorlagen ändern sich dabei nicht: Ergebnis zwischenspeichern.
  const thumbCache=new Map();let familyThumbOptions=null;
  window.Funkklingel.thumb = (element, d) => { el = element; if(!el.isConnected||!el.uxLayoutReady)return pendingThumbnail; const design=(dynamicFormats?profile().designs:p.designs).find(x => x.id === d.id) || d; if(dynamicDoorbell&&!designResourcesReady(design,el.fontData,el.motifs))return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120"><text x="120" y="65" text-anchor="middle" font-size="12" fill="#526b5d">Design wird geladen …</text></svg>'; const optionKey=JSON.stringify(options);if(dynamicProfiles&&familyThumbOptions!==optionKey){thumbCache.clear();familyThumbOptions=optionKey;}const key=JSON.stringify([options,design]); let markup=thumbCache.get(key); if(markup===undefined){markup=svg(design,{screen:true});if(!dynamicFamily&&thumbCache.size>64)thumbCache.clear();thumbCache.set(key,markup);} return markup; };
  window.Funkklingel.prepare = element => {
    el = element; prepareNativeShellState(el,profile());
    const {width, height, shape, cornerRadiusMm=0} = profile().geometry;
    const format = {...el.stainlessFormat(), widthMm:width, heightMm:height, shape, cornerRadiusMm,
      key:p.id, label:width + ' × ' + height + ' mm', allowedMountings:['K00']};
    el.stainlessGroup = {...el.stainlessGroup, name:p.name, formats:[format]};
    el.state.width = width; el.state.height = height;
    el.$('[data-stainless=size]').replaceChildren(new Option(format.label, format.key));
    el.stainlessFormat = () => dynamicFormats?{...format,widthMm:profile().geometry.width,heightMm:profile().geometry.height,label:profile().geometry.width+' × '+profile().geometry.height+' mm'}:format;
    el.geometry = () => {
      const geometry=profile().geometry,{width,height,shape}=geometry;
      const outline = shape === 'contour' ? geometry.outlinePath : shape === 'ellipse' ? `M0 ${height/2}a${width/2} ${height/2} 0 1 0 ${width} 0a${width/2} ${height/2} 0 1 0 -${width} 0` : `M0 0H${width}V${height}H0Z`;
      return {outline, clip:shape==='contour'?contourPathWithHoles(geometry):outline, holes:(geometry.holes||[]).map(h => ({...h, r:h.diameter/2})), gap:0};
    };
    el.objectSVG = o => svgDocument(svg({...p.designs[0], objects:[o], marks:[]},{surface:objectSurface(o),bare:true})).querySelector('[data-object]')?.outerHTML || '';
    let bodyCache=null;
    el.svgBody = function(preview=true, guides=false) {
      const design=current(),cacheable=dynamicFamily&&config.familyFormats.fixedSize&&design.objects.every(o=>o.type==='text'||o.type==='motif');
      const refs=cacheable?[this.uxObjectSVG,...design.objects.map(o=>o.type==='text'?this.fontData[o.font]:this.motifs[o.motif])]:null;
      const key=cacheable?JSON.stringify([design,options,preview,guides,!!this.$('[data-setting=guides]')?.checked,this.state.selected,activeSurface()]):null;
      if(cacheable&&bodyCache?.key===key&&refs.every((r,i)=>r===bodyCache.refs[i]))return bodyCache.body;
      const doc = svgDocument(svg(current(), {guides:preview && guides && !!this.$('[data-setting=guides]')?.checked,selected:preview?this.state.selected:'',handles:preview,keepout:preview,surface:preview?activeSurface():'front',screen:preview}));
      if(preview){const design=current();decorateEmptyPhotoSlots(doc,design.objects,processing.ink,profile().material.color,config.localResources?.photoPlaceholders||[],design.id,config.localResources?.photoExamples||[],config.photo.hints||[],{blendMode:profile().material.kind==='slate'?'lighten':undefined,grayscale:profile().material.kind==='slate'});for(const o of design.objects.filter(o=>o.type==='motif'&&o.locked===true&&o.customerEditable===false)){const g=doc.querySelector('[data-object="'+CSS.escape(o.id)+'"]');if(g)g.style.pointerEvents='none';}}
      const body=doc.documentElement.innerHTML;
      bodyCache=cacheable?{key,refs,body}:null;
      return body;
    };
    el.svg = function() { return svg(current()); };
    el.png = async function({type='image/png',quality}={}) {
      let source=await embedSurface(this.svg(true),config.materialSurface,dynamicDoorbell?profile().admin:undefined);
      if(this.uxEmbedPreviewUploads)source=await this.uxEmbedPreviewUploads(source);
      const url = URL.createObjectURL(new Blob([source], {type:'image/svg+xml'}));
      try {
        const image = new Image(); image.src = url; await image.decode();
        const {width,height}=profile().geometry;
        const canvas = document.createElement('canvas'), scale = 1600 / Math.max(width, height);
        const padding=p.backingPreview?-2*universalPreviewViewport(profile())[0]:dynamicDoorbell?16:Math.max(width,height)*.07;
        canvas.width = Math.round((width + padding) * scale);
        canvas.height = Math.round((height + padding) * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return await new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('Vorschau konnte nicht erstellt werden.')), type, quality));
      } finally { URL.revokeObjectURL(url); }
    };
    el.normalize = function() {
      const geometry=profile().geometry;
      this.state.width=geometry.width; this.state.height=geometry.height;
      for (const o of this.state.objects) if (o.type==='text') {
        try { measureText(o, this.fontData); } catch { /* Keep typed characters so the customer can correct them. */ }
      }
    };
  };

  window.Funkklingel.finish = element => {
    el = element; el.uxFamilyGallery=dynamicFamily; finishNativeShell(el);
    el.uxProfileGeometry=()=>profile().geometry;
    el.uxSelectedProfile=()=>profile();
    el.style.setProperty('--m-plate-width',String(p.geometry.width));
    el.style.setProperty('--m-plate-height',String(p.geometry.height));
    if(window.GravuruGuided)window.GravuruGuided=contourGuides(window.GravuruGuided,el.uxProfileGeometry);
    const r=el.shadowRoot, $=selector=>r.querySelector(selector);
    r.host.dataset.universalProfile = p.id;
    const style = document.createElement('style');
    style.textContent = '.m-photo{margin:18px 0;padding:14px;background:#f5f4f0;border-radius:9px}.m-photo label{display:block;margin:10px 0}.m-photo input{background:#fff!important}.m-photo p{font-size:12px;line-height:1.5}.m-filters{display:flex;gap:8px;margin:8px 0}.m-filters label{flex:1;min-width:0}.m-color{display:block;padding:8px 0}.m-color input{width:70px;height:40px;padding:3px!important}[data-m-invalid]{font-size:13px;color:#873422}.fk-options fieldset,.fk-frame-field,.fk-frame-pictures,.fk-options>[data-fk-mount-note],.fk-options>label,.fk-scope-note{display:none!important}.fk-options:empty{display:none!important}.m-options>label{display:block!important;margin:10px 0}.fk-font-section{margin-top:18px}@media(max-width:720px){.c-gallery{max-height:none!important;overflow:visible!important;overscroll-behavior:auto!important;touch-action:pan-y!important}.stage{touch-action:pan-y!important}.m-filters{flex-wrap:wrap}}';
    style.textContent += '.c-gallery [hidden]{display:none!important}.c-gallery .c-design-card svg:not(svg svg){width:100%;height:95px!important}.stage{height:auto!important;min-height:330px!important}.plate-holder{width:min(100%,520px)!important;aspect-ratio:var(--m-plate-width)/var(--m-plate-height)!important}.dimension-x span,.dimension-y span{position:relative;background:#fff!important;padding:0 5px!important;z-index:1}.fk-options .m-options>label{display:block!important}@media(max-width:720px){.stage{min-height:230px!important}.plate-holder{width:min(100%,430px)!important}.c-gallery .c-design-card svg:not(svg svg){height:75px!important}}';
    style.textContent += '.stage-wrap>.stage .plate-holder{width:min(100%,520px)!important;height:auto!important;aspect-ratio:var(--m-plate-width)/var(--m-plate-height)!important}.c-large-preview .fk-live-preview .plate-holder{width:min(100cqw,calc(100cqh * var(--m-plate-width) / var(--m-plate-height)))!important;height:min(100cqh,calc(100cqw * var(--m-plate-height) / var(--m-plate-width)))!important;aspect-ratio:var(--m-plate-width)/var(--m-plate-height)!important}';
    style.textContent += '@media(max-width:720px){.stage-wrap>.stage .plate-holder{touch-action:pan-y!important}.c-large-preview .plate-holder{touch-action:none!important}}';
    r.append(style);
    const optionPanel = $('.fk-options');
    optionPanel.querySelector('h2').textContent = 'Deine Ausführung';
    const picks=document.createElement('div'); picks.className='m-options';
    const fullOptionPrice=g=>!!config.steelFormats&&g.id==='size'||dynamicDoorbell&&g.id==='format';
    const changeOption=(key,value,{record=true}={})=>{
      if(options[key]===value)return;
      const next={...options,[key]:value};
      let state=dynamicSizes?scalableSizeState(config,el.state,next,{fonts:el.fontData,motifs:motifs()}):dynamicFamily?familyFormatState(config,el.state,next,{fonts:el.fontData,motifs:motifs()}):dynamicDoorbell?doorbellOptionState(config,el.state,next):{...el.state,mOptions:clone(next)};
      if(key==='mounting')state=mountingPlacementState(config,state,selectedProfile(config,options),selectedProfile(config,state.mOptions),{fonts:el.fontData,motifs:motifs()});
      else if(key==='size'&&!dynamicSizes)state={...state,uxHolePlacement:null};
      if(record)el.record();
      options=state.mOptions;Object.assign(el.state,state);el.sync();
    };
    el.uxChangeOption=changeOption;
    picks.innerHTML=executionOptionGroups(config).map(g=>'<label>'+esc(g.name)+'<select data-m-option="'+esc(g.id)+'" aria-label="'+esc(g.name)+'">'+g.values.map(v=>'<option value="'+esc(v.id)+'">'+esc(v.label)+(fullOptionPrice(g)?' · '+money(v.priceCents):v.priceCents?' · +'+money(v.priceCents):' · ohne Aufpreis')+'</option>').join('')+'</select></label>').join('');
    optionPanel.append(picks);
    // Chris 22./23.10.2026: Befestigung als Kacheln mit Icon, Bezeichnung und Aufpreis („+2,99 €“ oder
    // „ohne Aufpreis“) wie die alte Auswahl [data-fk-mount] in completion.mjs; der Auswahlhaken kommt von
    // dort (completion-choice). Andere Gruppen zeigen weiterhin nur Werte mit hinterlegtem Optionsbild. Die
    // Auswahlliste darüber bleibt als barrierefreie Alternative. Preis- und Auswahllogik bleiben unverändert.
    const pictures=document.createElement('div');pictures.className='m-option-pictures';
    const tileValues=g=>g.id==='mounting'?g.values:g.values.filter(v=>v.thumbnail);
    pictures.innerHTML=executionOptionGroups(config).map(g=>'<div role="group" aria-label="'+esc(g.name)+'">'+tileValues(g).map(v=>'<button type="button" class="m-option-tile" data-picture-group="'+esc(g.id)+'" data-picture-option="'+esc(v.id)+'" aria-pressed="false">'+optionTileIcon(v,{mounting:g.id==='mounting'})+'<strong>'+esc(v.label)+'</strong><small>'+esc(optionTilePrice(v,money,{fullPrice:!!fullOptionPrice(g)}))+'</small></button>').join('')+'</div>').join('');
    picks.append(pictures);
    style.textContent+='.m-option-pictures>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:6px 0 10px}.m-option-pictures>div:empty{display:none}.m-option-pictures button{display:grid;justify-items:center;align-content:center;gap:6px;min-height:110px;padding:12px 18px;border:1px solid #dce5df;border-radius:12px;background:#fff;color:#1c3327;position:relative}.m-option-pictures button[aria-pressed=true]{border-color:#17634d;background:#edf5f0}.m-option-pictures svg{width:32px;height:32px;display:block;flex:none}.m-option-pictures img{width:56px;height:40px;object-fit:contain;display:block;flex:none}.m-option-pictures strong{font-size:14px;font-weight:600;line-height:1.3;text-align:center}.m-option-pictures small{font-size:12px;color:#526b5d}@media(max-width:600px){.m-option-pictures button{min-height:95px}.m-option-pictures svg{width:27px;height:27px}}';
    pictures.addEventListener('click',e=>{const button=e.target.closest('[data-picture-option]');if(!button)return;changeOption(button.dataset.pictureGroup,button.dataset.pictureOption);});
    // K14 / Ü12.1: Zusatzfelder ohne Vorschau (Text, Datum, Auswahlliste, Ankreuzfeld) im Reiter „Optionen“.
    const fieldBox=document.createElement('div');fieldBox.className='m-option-fields';
    const surcharge=c=>c?' · +'+money(c):'';
    fieldBox.innerHTML=optionFields(p).map(f=>{
      const head=esc(f.label)+(f.required?' · erforderlich':' · optional'),note=f.note?'<small>'+esc(f.note)+'</small>':'',attr='data-m-field="'+esc(f.id)+'" aria-label="'+esc(f.label)+'"'+(f.required?' aria-required="true"':'');
      if(f.kind==='checkbox')return '<label class="m-field-check" data-m-field-row="'+esc(f.id)+'"><input type="checkbox" '+attr+'><span>'+head+surcharge(f.priceCents)+'</span>'+note+'</label>';
      if(f.kind==='select')return '<label data-m-field-row="'+esc(f.id)+'"><span>'+head+'</span><select '+attr+'><option value="">Bitte wählen</option>'+f.choices.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.label)+surcharge(c.priceCents)+'</option>').join('')+'</select>'+note+'</label>';
      return '<label data-m-field-row="'+esc(f.id)+'"><span>'+head+surcharge(f.priceCents)+'</span><input type="'+(f.kind==='date'?'date':'text')+'" '+attr+(f.kind==='text'?' maxlength="'+(f.maxLength??FIELD_TEXT_DEFAULT_MAX)+'"':'')+(f.placeholder?' placeholder="'+esc(f.placeholder)+'"':'')+'>'+note+'</label>';
    }).join('');
    fieldBox.hidden=!fieldBox.childElementCount;picks.append(fieldBox);
    style.textContent+='.m-option-fields{display:grid;gap:10px;margin:12px 0}.m-option-fields label{display:grid!important;gap:4px;margin:0!important}.m-option-fields .m-field-check{grid-template-columns:auto 1fr;align-items:center}.m-option-fields .m-field-check small{grid-column:1/-1}.m-option-fields input[type=text],.m-option-fields input[type=date],.m-option-fields select{width:100%;box-sizing:border-box;min-height:40px}.m-option-fields small{font-size:12px;color:#46574d}.m-options label[hidden],.m-option-fields[hidden],.m-option-pictures [hidden]{display:none!important}';
    const fieldInput=input=>input.type==='checkbox'?input.checked:input.value;
    fieldBox.addEventListener('focusin',e=>{if(e.target.dataset.mField&&e.target.type!=='checkbox'&&e.target.tagName!=='SELECT')el.record();});
    fieldBox.addEventListener('input',e=>{const key=e.target.dataset.mField;if(!key||e.target.type==='checkbox'||e.target.tagName==='SELECT')return;changeOption(key,fieldInput(e.target),{record:false});});
    fieldBox.addEventListener('change',e=>{const key=e.target.dataset.mField;if(!key)return;changeOption(key,fieldInput(e.target),{record:e.target.type==='checkbox'||e.target.tagName==='SELECT'});});
    options={...Object.fromEntries((p.optionGroups||[]).map(g=>[g.id,g.defaultValueId])),...(dynamicDoorbell?{position:config.doorbell.defaultPosition||'standard'}:{})};
    const updateDoorbellChoices=dynamicDoorbell?installDoorbellPresentation({el,config,picks,pictures}):()=>{};
    const updateFamilyChoices=installExecutionPresentation({el,config,picks,pictures,fieldBox});
    for(const select of picks.querySelectorAll('select[data-m-option]')) select.value=options[select.dataset.mOption];
    picks.addEventListener('change',e=>{if(!e.target.dataset.mOption)return;changeOption(e.target.dataset.mOption,e.target.value);});
    // Sichtbarkeit (visibleIf) und Feldwerte aus dem Zustand; unsichtbare Gruppen/Felder werden ausgeblendet.
    function updateOptionVisibility(){
      let shown;try{shown=resolvedOptions(config,options);}catch{shown=null;}
      for(const select of picks.querySelectorAll('select[data-m-option]')){const g=(p.optionGroups||[]).find(x=>x.id===select.dataset.mOption),visible=!g?.visibleIf||(shown?shown[g.id]!==undefined:true);select.closest('label').hidden=!visible||g?.id==='mounting'||select.closest('label').dataset.visualOnly==='true';}
      for(const group of pictures.querySelectorAll('[role=group]')){const id=group.querySelector('[data-picture-group]')?.dataset.pictureGroup;if(id)group.hidden=shown?shown[id]===undefined:false;}
      for(const f of optionFields(p)){
        const row=fieldBox.querySelector('[data-m-field-row="'+CSS.escape(f.id)+'"]'),input=row?.querySelector('[data-m-field]');if(!row)continue;
        // Sichtbar = Bedingung erfüllt (auch wenn das Feld noch leer ist).
        const cond=f.visibleIf,visible=!cond||(shown?shown[cond.groupId]!==undefined&&cond.valueIds.includes(shown[cond.groupId]):true);row.hidden=!visible;
        const value=options[f.id];if(r.activeElement===input)continue;
        if(input.type==='checkbox')input.checked=value===true;else input.value=value??'';
      }
    }

    const photoSection=document.createElement('section'); photoSection.className='m-photo';photoSection.setAttribute('aria-label','Foto hochladen');
    $('.fk-font-section').after(photoSection);
    let photoDesign='';
    function updatePhotos() {
      const slots=current().objects.filter(o=>o.type==='photoSlot');
      photoSection.hidden=!config.photo.enabled||!slots.length;
      if(photoDesign===el.state.designId)return;
      photoDesign=el.state.designId;
      photoSection.innerHTML='<h3>Dein Foto</h3><p>Wähle dein Foto für die Gravur. Es wird hier nicht als Bildvorschau dargestellt.</p>'+slots.map((o,i)=>'<label>Foto '+(i+1)+(o.required?' · erforderlich':' · optional')+'<input type="file" accept="image/jpeg,image/png,image/webp" data-m-photo="'+esc(o.fieldKey)+'" aria-label="Foto '+(i+1)+' auswählen"></label><p data-photo-status="'+esc(o.fieldKey)+'" role="status"></p>').join('');
      for(const slot of slots) updatePhotoStatus(slot.fieldKey);
    }
    function updatePhotoStatus(key) {
      const node=photoSection.querySelector('[data-photo-status="'+CSS.escape(key)+'"]'), file=photos.get(key);
      if(node)node.textContent=file ? file.name+' · lokal ausgewählt, noch nicht übertragen.' : 'Noch kein Foto ausgewählt.';
    }
    photoSection.addEventListener('change',e=>{
      const key=e.target.dataset.mPhoto;if(!key)return;
      try{const file=e.target.files[0];if(!file)return;validatePhotoFile(file);photos.set(key,file);updatePhotoStatus(key);}
      catch(error){photos.delete(key);e.target.value='';photoSection.querySelector('[data-photo-status="'+CSS.escape(key)+'"]').textContent=error.message;}
    });

    const filterPanel=document.createElement('div');filterPanel.className='m-filters';
    const categories=[...new Set(p.designs.map(d=>d.category).filter(Boolean))], collections=[...new Set(p.designs.flatMap(d=>d.collections||[]))];
    // A category on an asset is metadata, not permission to expose a customer filter.
    const enabledFilters=config.customerUI?.designFilters||{};
    filterPanel.innerHTML=[['category','Designkategorie',categories],['collection','Designkollektion',collections]].filter(([key,,items])=>enabledFilters[key]===true&&items.length>0).map(([key,label,items])=>'<label>'+label+'<select data-m-filter="'+key+'" aria-label="'+label+'"><option value="">Alle</option>'+items.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select></label>').join('');
    filterPanel.hidden=!filterPanel.childElementCount;
    $('.c-gallery').before(filterPanel);
    const filters={category:'',collection:''};
    filterPanel.addEventListener('change',e=>{filters[e.target.dataset.mFilter]=e.target.value;update();});

    const colorControl=document.createElement('label'); colorControl.className='m-color';colorControl.hidden=processing.method!=='print';
    colorControl.innerHTML='Farbe des ausgewählten Elements <input type="color" aria-label="Elementfarbe" value="#202824">';
    $('.fk-font-section').append(colorControl);
    colorControl.addEventListener('input',e=>{const o=el.selected();if(o&&!locked(o)){el.record();o.color=e.target.value;el.sync();}});
    const issue=document.createElement('p');issue.dataset.mInvalid='';issue.setAttribute('role','status');$('.guided-download').before(issue);
    // Chris 22./23.10.2026: Kein Kundenhinweis „Text in der Bohrloch-Schutzzone“ mehr (vorher hole-proximity.mjs
    // hier). Die mechanische Prüfung (mounting-access.mjs, nicht ignorierbar) und die Überlagerungswarnung bei
    // Gravur (customer-tools-model.mjs) bleiben; Werkstatt-Prüfvermerk und Händlervorschau nutzen hole-proximity weiter.
    const exports=$('.export-type');exports.replaceChildren(new Option('Produktvorschau · PNG','png'),new Option('Vektorentwurf ohne Foto · SVG 1:1','vectors'));
    el.export=async function(){
      try{
        const draft=saveDraft(config,el.state,options,el.fontData,motifs());
        if(exports.value==='png')this.download(await this.png(),p.id+'-vorschau.png');
        else {
          const design=current();
          const vector=design.objects.filter(o=>o.type!=='photoSlot').map(o=>this.objectSVG(o)).join('');
          const marks='<g fill="none">'+(design.marks||[]).map(m=>'<path d="'+esc(m.d)+'" stroke="'+elementColor(p,m)+'" stroke-width="'+m.width+'"/>').join('')+'</g>';
          const {width,height}=physicalGeometry(config,{mOptions:options});
          this.download(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${profile().geometry.width} ${profile().geometry.height}"><metadata>${esc(JSON.stringify({profileId:p.id,revision:p.revision,designId:draft.design.id,purpose:'vector-draft-not-production',photoIncluded:false}))}</metadata>${vector}${marks}</svg>`],{type:'image/svg+xml'}),p.id+'-vektorentwurf.svg');
        }
        $('.status').textContent='Entwurf gespeichert. Fotodatei und Fertigungsfreigabe sind separat erforderlich.';
      }catch(error){$('.status').textContent=error.message;}
    };
    const action=el.action;
    el.action=async function(key,...args){
      if(locked(this.selected())&&['delete','duplicate','grow','shrink','center','centerX','resetRotation'].includes(key))return;
      if(key==='save'){try{this.download(new Blob([JSON.stringify(saveDraft(config,this.state,options,this.fontData,motifs()),null,2)],{type:'application/json'}),p.id+'-entwurf.json');$('.status').textContent='Entwurf gespeichert. Das Foto bleibt separat und muss beim erneuten Öffnen ausgewählt werden.';}catch(error){$('.status').textContent=error.message;}return;}
      return action.call(this,key,...args);
    };
    // K7: Entwurf im Vertragsformat lesen/schreiben (Sitzungsschutz, Konto-Entwurf). `draft:true` erlaubt unfertige Pflichttexte.
    el.restoreDraft=function(input,{draft=false}={}){const restored=readDraft(config,input,this.fontData,motifs(),{draft});this.record();options=restored.options;this.state.objects=restored.design.objects;this.state.uxHolePlacement=null;this.state.designId=restored.design.id;this.state.mOptions=clone(options);if(restored.ui)this.state.ui=clone(restored.ui);this.state.selected=null;photos.clear();photoDesign='';this.sync();return restored;};
    el.draftPayload=function({draft=false}={}){return saveDraft(config,this.state,options,this.fontData,motifs(),{draft});};
    el.import=async function(file){if(!file)return;try{if(file.size>2_000_000)throw Error('Entwurf ist zu groß.');const input=JSON.parse(await file.text());await this.uxEnsureDraftResources?.(input);this.restoreDraft(input);$('.status').textContent='Entwurf geladen. Bitte dein Foto erneut auswählen.';}catch(error){$('.status').textContent=error.message;}};
    el.chooseDesign=function(id,{carry=true}={}){
      const templates=dynamicFormats?profile().designs:p.designs;
      const d=templates.find(d=>d.id===id);if(!d)return;
      // Chris 21.10.2026: nur geänderte Namen/Lebensdaten wandern mit (workflow-model.mjs).
      this.record();const texts=carry?changedCustomerTexts(this.state.objects,templates.find(x=>x.id===this.state.designId)):[];
      this.state.designId=id;this.state.objects=clone(d.objects);this.state.selected=null;this.state.uxHolePlacement=null;
      if(texts.length)transferTexts(texts,this.state.objects);
      this.normalize();
      const selected=profile();Object.assign(this.state,mountingPlacementState(config,this.state,selected,selected,{fonts:this.fontData,motifs:motifs()}));
      this.sync();
    };
    el.add=function(input){
      try {
        if(this.state.objects.length>=20)throw Error('Du kannst bis zu 20 Elemente gestalten.');
        const object=newEditableObject(config,input,this.id(),this.fontData,motifs(),options);
        this.record();this.state.objects.push(object);this.state.selected=object.id;this.state.showHero=false;
        this.normalize();this.sync();
      }catch(error){$('.status').textContent=error.message;}
    };
    const edit=el.edit;el.edit=function(field){if(!locked(this.selected()))return edit.call(this,field);};
    r.addEventListener('pointerdown',e=>{const o=el.state.objects.find(o=>o.id===e.target.closest('[data-object]')?.dataset.object);if(locked(o)){e.preventDefault();e.stopImmediatePropagation();}},true);
    const qty=$('[data-fk-quantity]');qty.addEventListener('input',()=>{quantity=Number(qty.value);update();});
    // K9: Miniaturen der Designs. Der Kundeneditor kann das gezeichnete Design (Kundentext,
    // `uxThumbnailDesign`), den Cache-Schlüssel (`uxThumbnailSignature`) und das Aufschieben
    // (`uxThumbnailDeferred`, höchstens `uxThumbnailBudget` neue Miniaturen je Durchlauf)
    // bestimmen; ausgeblendete oder aufgeschobene Karten behalten ihre bisherige Miniatur.
    // Rückgabe: Anzahl sichtbarer Karten, die nur wegen des Budgets warten.
    // Während der Kunde ein Element zieht, keine Miniaturen neu zeichnen; nach dem Loslassen einmal nachholen.
    let dragging=false;
    r.addEventListener('pointerdown',e=>{if(e.target.closest?.('.scene [data-object]'))dragging=el.uxDragging=true;},true);
    for(const type of ['pointerup','pointercancel'])r.addEventListener(type,()=>{if(!dragging)return;dragging=el.uxDragging=false;setTimeout(()=>renderThumbnails(),0);},true);
    function renderThumbnails(){
      if(dragging||!el.isConnected||!el.uxLayoutReady)return 0;
      const thumbnailKey=JSON.stringify(options)+'|'+(el.uxThumbnailSignature?.()||'');
      let budget=Number.isFinite(el.uxThumbnailBudget)?el.uxThumbnailBudget:Infinity,deferred=0;
      // All cards in this synchronous pass belong to the same format and side.
      const thumbnailProfile=dynamicFormats?profile():p;
      for(const card of r.querySelectorAll('[data-c-design]')){
        const design=thumbnailProfile.designs.find(d=>d.id===card.dataset.cDesign);if(!design)continue;
        if(dynamicDoorbell&&!designResourcesReady(design,el.fontData,el.motifs))continue;
        let thumbnail=thumbnails.get(card);
        if(!thumbnail||thumbnail.key!==thumbnailKey){
          if(card.hidden||budget<=0||el.uxThumbnailDeferred?.(card)===true){if(!card.hidden&&budget<=0)deferred++;if(!thumbnail)continue;}
          else{budget--;const shown=el.uxThumbnailDesign?.(design)||design;
            // Chris 21.10.2026: Miniaturen zeigen das Musterfoto wie die Vorschau, nicht den Schriftzug „Dein Foto“.
            let markup=svg(shown,{screen:true});try{if(shown.objects.some(o=>o.type==='photoSlot')){const doc=svgDocument(markup);decorateEmptyPhotoSlots(doc,shown.objects,processing.ink,profile().material.color,config.localResources?.photoPlaceholders||[],design.id,config.localResources?.photoExamples||[],shown.objects.filter(o=>o.type==='photoSlot').map(o=>({designId:design.id,slotId:o.id,enabled:false})),{blendMode:profile().material.kind==='slate'?'lighten':undefined,grayscale:profile().material.kind==='slate'});for(const g of doc.querySelectorAll('[data-ux-empty-photo-slot]')){g.removeAttribute('data-ux-empty-photo-slot');g.removeAttribute('role');g.removeAttribute('tabindex');g.removeAttribute('aria-label');g.style.removeProperty('cursor');}markup=doc.documentElement.outerHTML;}}catch{}
            thumbnail={key:thumbnailKey,markup};}
        }
        // The legacy sync replaces the SVG with its portrait doorbell preview.
        // Restore the product geometry even when the cached rendering is valid.
        if(thumbnail.node!==card.querySelector('svg')){card.querySelector('svg').outerHTML=thumbnail.markup;thumbnail.node=card.querySelector('svg');}
        thumbnails.set(card,thumbnail);
      }
      return deferred;
    }
    el.uxRefreshThumbnails=renderThumbnails;
    function update(){
      const d=current(), visible=new Set(filteredDesigns(dynamicFormats?profile().designs:p.designs,filters).map(d=>d.id));
      const physical=physicalGeometry(config,{mOptions:options});
      if(dynamicDoorbell)updateDoorbellViewport(el,physical);
      else if(dynamicProfiles)updateProductViewport(el,physical);
      // The legacy shell keeps only SVG children. Restore the outer viewport so the
      // backing plate is fully visible; front geometry and pointer coordinates stay in mm.
      updateBackingPreviewViewport(el,profile());
      $('.stage-top>span').textContent=(config.doorbell?'Edelstahl mit Acrylglasauflage':processing.name.replace('Gravur auf ',''))+' · '+physical.width+' × '+physical.height+' mm';
      if(config.steelFormats){for(const [selector,value] of [['.dimension-x span',physical.width],['.dimension-y span',physical.height]]){const node=$(selector);if(node)node.textContent=new Intl.NumberFormat('de-DE',{maximumFractionDigits:3}).format(value)+' mm';}}
      $('.c-preview-caption>span').textContent='';
      $('.c-preview-caption').nextElementSibling.textContent='Klicke einen Text oder ein Motiv an, um es zu gestalten.';
      $('.c-section-heading small').textContent=p.designs.length+' Vorlagen';
      $('.fk-scroll-hint').textContent='Wähle dein Design';
      $('.fk-material-note').textContent=config.doorbell?'Edelstahl 1,5 mm · Gravur auf Acrylglas 3 mm':processing.name+' · '+p.material.thicknessMm+' mm';
      $('.fk-options>[data-fk-mount-note]')?.setAttribute('hidden','');
      for(const card of r.querySelectorAll('[data-c-design]')){
        card.hidden=!visible.has(card.dataset.cDesign);const note=card.querySelector('small'),review=familyDesignReviewNote(config,options,card.dataset.cDesign);note.textContent=review||'Vorlage inklusive';note.toggleAttribute('data-family-review',!!review);
      }
      renderThumbnails();
      const name=current().name;$('.guided-review dl').innerHTML='<div><dt>Design</dt><dd>'+esc(name)+'</dd></div><div><dt>Material</dt><dd>'+esc(processing.name)+'</dd></div>';
      $('[data-setting=guides]').closest('.check-guide').hidden=false;
      for(const select of picks.querySelectorAll('select[data-m-option]'))select.value=options[select.dataset.mOption];
      updateOptionVisibility();
      updateDoorbellChoices(options);
      updateFamilyChoices(options);
      for(const button of pictures.querySelectorAll('[data-picture-option]'))button.setAttribute('aria-pressed',String(options[button.dataset.pictureGroup]===button.dataset.pictureOption));
      try{
        const price=config.basePriceCents===null?null:quote(config,el.state.objects,el.state.designId,options,quantity);
        $('[data-fk-total]').textContent=price?money(price.totalCents):'Preis noch offen';
        $('[data-fk-breakdown]').textContent=(price?.chargedMotifs??price?.additionalMotifs) ? (price.chargedMotifs??price.additionalMotifs)+(config.motifCharge==='all'?' Motive · ':' weitere/geänderte Motive · ')+money((price.chargedMotifs??price.additionalMotifs)*config.extraMotifCents) : '';
        // Chris 21.10.2026: Pflichtfelder meldet erst der Abschluss (Textreiter + „Gestaltung fertig“), nicht dauerhaft hier.
        saveDraft(config,el.state,options,el.fontData,motifs(),{draft:true}); issue.textContent='';
      }catch(error){issue.textContent=error.message;}
      $('.fk-buy-button').disabled=true;$('.fk-order-status').textContent='Prüfvorschau · Bestellung und Fotoübertragung noch nicht verbunden.';
      colorControl.querySelector('input').disabled=!el.selected()||!!locked(el.selected());
      if(el.selected()?.color)colorControl.querySelector('input').value=el.selected().color;
      updatePhotos();
    }
    const sync=el.sync;
    el.sync=function(...args){
      options=clone(this.state.mOptions||options);
      if(dynamicProfiles)this.catalog.designs=profile().designs;
      this.normalize();const result=sync.apply(this,args);update();return result;
    };
    $('[data-setting=guides]').checked=false;
    const initialProfile=dynamicFormats?profile():p;
    el.state.objects=[];el.state.mOptions=clone(options);el.chooseDesign(initialProfile.defaultDesignId||initialProfile.designs[0].id);
    el.history=[];el.future=[];
    window.parent.postMessage({type:'gravuru-universal-ready',profileId:p.id},location.origin);
  };
}

export function hardenDoorbell(el) {
  const update=()=>{
    const r=el.shadowRoot, count=el.catalog.designs.length;
    const heading=r.querySelector('.c-section-heading small');if(heading)heading.textContent=count+' Vorlagen · mit jeder Rahmenform kombinierbar';
    const gallery=r.querySelector('.c-gallery');
    if(gallery)for(const design of el.catalog.designs)if(!gallery.querySelector('[data-c-design="'+CSS.escape(design.id)+'"]')){
      const button=document.createElement('button');button.type='button';button.className='c-design-card';button.dataset.cDesign=design.id;
      button.setAttribute('aria-label','Design '+design.name);button.setAttribute('aria-pressed',String(el.state.designId===design.id));
      button.innerHTML=window.Funkklingel.thumb(el,design)+'<span>'+esc(design.name)+'</span><small></small>';gallery.append(button);
    }
    const note=r.querySelector('[data-fk-mount-note]');if(note&&el.state.fkMounting==='K00')note.textContent='Lieferung ohne Befestigungsmaterial.';
  };
  const sync=el.sync;el.sync=function(...args){const result=sync.apply(this,args);update();return result;};
  update();
}

