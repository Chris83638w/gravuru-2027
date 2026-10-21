import {spacerPreview,keepoutPreview} from './option-media.mjs';
import {designAreaPreview} from './design-area.mjs';
import {textsNearHoles,holeHintText} from '../../platform/sources/app/shared/models/hole-proximity.mjs';
import {customerMotifs} from './customer-motifs.mjs';
import {studioSvg} from '../../platform/sources/app/shared/models/studio-svg.mjs';
import {surfacePreview,embedSurface,scenePreview} from './material-surface.mjs';
import {physicalGeometry} from './print-geometry.mjs';
import {decorateEmptyPhotoSlots} from './photo-placeholder.mjs';
// Fototipp auf der Platte, bevor die Kundenoberfläche fertig ist (build.mjs ruft es direkt nach mount auf).
export {installEarlyPhotoTap} from './photo-upload.mjs';
import {getProcessingProfile, elementColor} from '../../platform/sources/app/shared/models/processing-profiles.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {escapeXml as esc, filteredDesigns} from '../../platform/sources/app/shared/models/design-content.mjs';
import {prepareConfig, selectedProfile, quote, money, saveDraft, readDraft, designFromState, editedDesignTexts, validatePhotoFile, newEditableObject, resolvedOptions} from './contract.mjs';
import {optionFields, FIELD_TEXT_DEFAULT_MAX} from './option-fields.mjs';
import {objectSurface, surfaceGeometry} from './surfaces.mjs';

const clone = value => structuredClone(value);
const svgDocument = svg => new DOMParser().parseFromString(svg, 'image/svg+xml');

export function installUniversal(configInput) {
  const config = prepareConfig(configInput), p = config.profile, processing = getProcessingProfile(p);
  const originalPrepare = window.Funkklingel.prepare, originalFinish = window.Funkklingel.finish;
  let options = {}, quantity = 1, el, renderId = 0;
  const photos = new Map(); // File objects stay in this page. Never localStorage, URL, draft or Git.
  const thumbnails=new WeakMap();
  const current = () => designFromState(config, el.state);
  // K14 / Ü15.1: gewählte Seite (`el.state.uxSurface`, Standard vorn); von hinten sind die Bohrlöcher gespiegelt.
  const activeSurface = () => el?.state?.uxSurface === 'back' ? 'back' : 'front';
  const profile = (surface = activeSurface()) => { const sp = selectedProfile(config, options); return surface === 'back' ? {...sp, geometry:surfaceGeometry(sp.geometry, 'back')} : sp; };
  const motifs = () => customerMotifs(config, el.motifs, el.catalog);
  const svg = (design, {guides=false, selected='', handles=false, keepout=false, surface='front'} = {}) => {
    const visible={...design,objects:design.objects.filter(o=>!o.uxHidden&&objectSurface(o)===surface)};
    let result=surfacePreview(studioSvg(profile(surface), visible, el.fontData,{frameKey:options.frame,color:options.color,mountingKey:options.mounting,motifs:motifs(),media:[],guides,selected,handles,id:'customer-'+(++renderId)}),config.materialSurface,p.geometry);
    if(config.reviewOnly){const doc=svgDocument(result);for(const o of visible.objects.filter(o=>o.type==='photoSlot'&&!o.uxUploadId)){const group=doc.querySelector('[data-object="'+CSS.escape(o.id)+'"]');if(group){for(const rect of group.querySelectorAll('rect:not([fill="transparent"])')){rect.setAttribute('fill','none');rect.setAttribute('stroke-dasharray','2 2');}for(const text of group.querySelectorAll('text'))text.setAttribute('fill',processing.ink);}}result=doc.documentElement.outerHTML;}
    if(el.uxObjectSVG){const doc=svgDocument(result);for(const o of visible.objects){const replacement=el.uxObjectSVG(o);if(replacement!==undefined){const group=doc.querySelector('[data-object="'+CSS.escape(o.id)+'"]');if(group)group.outerHTML=replacement;}}result=doc.documentElement.outerHTML;}
    // Design boundary and drill-hole zones are preview layers only (keepout flag = editor preview); el.svg() for the order carries neither.
    return scenePreview(designAreaPreview(keepoutPreview(spacerPreview(result,profile(surface)),profile(surface),{show:keepout,emphasis:guides}),config,profile(surface),{show:keepout}),config.sceneBackground);
  };
  const locked = o => !!o?.uxLocked;

  window.Funkklingel.thumb = (element, d) => { el = element; return svg(p.designs.find(x => x.id === d.id) || d); };
  window.Funkklingel.prepare = element => {
    el = element; originalPrepare(el);
    const {width, height, shape, cornerRadiusMm=0} = p.geometry;
    const format = {...el.stainlessFormat(), widthMm:width, heightMm:height, shape, cornerRadiusMm,
      key:p.id, label:width + ' × ' + height + ' mm', allowedMountings:['K00']};
    el.stainlessGroup = {...el.stainlessGroup, name:p.name, formats:[format]};
    el.state.width = width; el.state.height = height;
    el.$('[data-stainless=size]').replaceChildren(new Option(format.label, format.key));
    el.stainlessFormat = () => format;
    el.geometry = () => {
      const outline = shape === 'ellipse' ? `M0 ${height/2}a${width/2} ${height/2} 0 1 0 ${width} 0a${width/2} ${height/2} 0 1 0 -${width} 0` : `M0 0H${width}V${height}H0Z`;
      return {outline, clip:outline, holes:profile().geometry.holes.map(h => ({...h, r:h.diameter/2})), gap:0};
    };
    el.objectSVG = o => svgDocument(svg({...p.designs[0], objects:[o], marks:[]},{surface:objectSurface(o)})).querySelector('[data-object]')?.outerHTML || '';
    el.svgBody = function(preview=true, guides=false) {
      const doc = svgDocument(svg(current(), {guides:preview && guides && !!this.$('[data-setting=guides]')?.checked,selected:preview?this.state.selected:'',handles:preview,keepout:preview,surface:preview?activeSurface():'front'}));
      if(preview){const design=current();decorateEmptyPhotoSlots(doc,design.objects,processing.ink,profile().material.color,config.localResources?.photoPlaceholders||[],design.id,config.localResources?.photoExamples||[],config.photo.hints||[]);for(const o of design.objects.filter(o=>o.type==='motif'&&o.locked===true&&o.customerEditable===false)){const g=doc.querySelector('[data-object="'+CSS.escape(o.id)+'"]');if(g)g.style.pointerEvents='none';}}
      return doc.documentElement.innerHTML;
    };
    el.svg = function() { return svg(current()); };
    el.png = async function() {
      const url = URL.createObjectURL(new Blob([await embedSurface(this.svg(true),config.materialSurface)], {type:'image/svg+xml'}));
      try {
        const image = new Image(); image.src = url; await image.decode();
        const canvas = document.createElement('canvas'), scale = 1600 / Math.max(width, height);
        canvas.width = Math.round((width + Math.max(width,height)*.07) * scale);
        canvas.height = Math.round((height + Math.max(width,height)*.07) * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return await new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('Vorschau konnte nicht erstellt werden.')), 'image/png'));
      } finally { URL.revokeObjectURL(url); }
    };
    el.normalize = function() {
      this.state.width=width; this.state.height=height;
      for (const o of this.state.objects) if (o.type==='text') {
        try { measureText(o, this.fontData); } catch { /* Keep typed characters so the customer can correct them. */ }
      }
    };
  };

  window.Funkklingel.finish = element => {
    el = element; originalFinish(el);
    const r=el.shadowRoot, $=selector=>r.querySelector(selector);
    r.host.dataset.universalProfile = p.id;
    const style = document.createElement('style');
    style.textContent = '.m-photo{margin:18px 0;padding:14px;background:#f5f4f0;border-radius:9px}.m-photo label{display:block;margin:10px 0}.m-photo input{background:#fff!important}.m-photo p{font-size:12px;line-height:1.5}.m-filters{display:flex;gap:8px;margin:8px 0}.m-filters label{flex:1;min-width:0}.m-color{display:block;padding:8px 0}.m-color input{width:70px;height:40px;padding:3px!important}[data-m-invalid]{font-size:13px;color:#873422}.fk-options fieldset,.fk-frame-field,.fk-frame-pictures,.fk-options>[data-fk-mount-note],.fk-options>label,.fk-scope-note{display:none!important}.fk-options:empty{display:none!important}.m-options>label{display:block!important;margin:10px 0}.fk-font-section{margin-top:18px}@media(max-width:720px){.c-gallery{max-height:none!important;overflow:visible!important;overscroll-behavior:auto!important;touch-action:pan-y!important}.stage{touch-action:pan-y!important}.m-filters{flex-wrap:wrap}}';
    style.textContent += '.c-gallery [hidden]{display:none!important}.c-gallery .c-design-card svg{width:100%;height:95px!important}.stage{height:auto!important;min-height:330px!important}.plate-holder{width:min(100%,520px)!important;aspect-ratio:'+p.geometry.width+'/'+p.geometry.height+'!important}.dimension-x span,.dimension-y span{position:relative;background:#fff!important;padding:0 5px!important;z-index:1}.fk-options .m-options>label{display:block!important}@media(max-width:720px){.stage{min-height:230px!important}.plate-holder{width:min(100%,430px)!important}.c-gallery .c-design-card svg{height:75px!important}}';
    style.textContent += '.stage-wrap>.stage .plate-holder{width:min(100%,520px)!important;height:auto!important;aspect-ratio:'+p.geometry.width+'/'+p.geometry.height+'!important}.c-large-preview .fk-live-preview .plate-holder{width:min(100cqw,calc(100cqh * '+p.geometry.width+' / '+p.geometry.height+'))!important;height:min(100cqh,calc(100cqw * '+p.geometry.height+' / '+p.geometry.width+'))!important;aspect-ratio:'+p.geometry.width+'/'+p.geometry.height+'!important}';
    style.textContent += '@media(max-width:720px){.stage-wrap>.stage .plate-holder{touch-action:pan-y!important}.c-large-preview .plate-holder{touch-action:none!important}}';
    r.append(style);
    const optionPanel = $('.fk-options');
    optionPanel.querySelector('h2').textContent = 'Deine Ausführung';
    const picks=document.createElement('div'); picks.className='m-options';
    picks.innerHTML=(p.optionGroups||[]).map(g=>'<label>'+esc(g.name)+'<select data-m-option="'+esc(g.id)+'" aria-label="'+esc(g.name)+'">'+g.values.map(v=>'<option value="'+esc(v.id)+'">'+esc(v.label)+(config.steelFormats&&g.id==='size'?' · '+money(v.priceCents):v.priceCents?' · +'+money(v.priceCents):' · ohne Aufpreis')+'</option>').join('')+'</select></label>').join('');
    optionPanel.append(picks);
    const pictures=document.createElement('div');pictures.className='m-option-pictures';
    pictures.innerHTML=(p.optionGroups||[]).map(g=>'<div role="group" aria-label="'+esc(g.name)+' – Bilder">'+g.values.filter(v=>v.thumbnail).map(v=>'<button type="button" data-picture-group="'+esc(g.id)+'" data-picture-option="'+esc(v.id)+'" aria-pressed="false"><img src="'+esc(v.thumbnail)+'" alt=""><span>'+esc(v.label)+'</span></button>').join('')+'</div>').join('');
    picks.append(pictures);
    style.textContent+='.m-option-pictures>div{display:flex;flex-wrap:wrap;gap:8px}.m-option-pictures button{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:6px;width:112px;min-height:110px;border:1px solid #c4cbc6;border-radius:8px;background:#fff;padding:6px;color:#1c3327}.m-option-pictures button[aria-pressed=true]{outline:2px solid #28543f}.m-option-pictures img{width:70px;height:70px;object-fit:contain;display:block;margin:auto;flex:none}.m-option-pictures span{display:block;font-size:12px;white-space:normal}';
    pictures.addEventListener('click',e=>{const button=e.target.closest('[data-picture-option]');if(!button)return;el.record();options={...options,[button.dataset.pictureGroup]:button.dataset.pictureOption};el.state.mOptions=clone(options);el.sync();});
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
    fieldBox.addEventListener('focusin',e=>{if(e.target.dataset.mField&&e.target.type!=='checkbox')el.record();});
    fieldBox.addEventListener('input',e=>{const key=e.target.dataset.mField;if(!key||e.target.type==='checkbox')return;options={...options,[key]:fieldInput(e.target)};el.state.mOptions=clone(options);el.sync();});
    fieldBox.addEventListener('change',e=>{const key=e.target.dataset.mField;if(!key)return;if(e.target.type==='checkbox')el.record();options={...options,[key]:fieldInput(e.target)};el.state.mOptions=clone(options);el.sync();});
    options=Object.fromEntries((p.optionGroups||[]).map(g=>[g.id,g.defaultValueId]));
    for(const select of picks.querySelectorAll('select[data-m-option]')) select.value=options[select.dataset.mOption];
    picks.addEventListener('change',e=>{if(!e.target.dataset.mOption)return;el.record();options={...options,[e.target.dataset.mOption]:e.target.value};el.state.mOptions=clone(options);el.sync();});
    // Sichtbarkeit (visibleIf) und Feldwerte aus dem Zustand; unsichtbare Gruppen/Felder werden ausgeblendet.
    function updateOptionVisibility(){
      let shown;try{shown=resolvedOptions(config,options);}catch{shown=null;}
      for(const select of picks.querySelectorAll('select[data-m-option]')){const g=(p.optionGroups||[]).find(x=>x.id===select.dataset.mOption),visible=!g?.visibleIf||(shown?shown[g.id]!==undefined:true);select.closest('label').hidden=!visible;}
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
    const holeHint=document.createElement('p');holeHint.dataset.mHoleHint='';holeHint.setAttribute('role','status');holeHint.hidden=true;holeHint.style.cssText='background:#fff4e5;border:1px solid #f0c27b;border-radius:10px;padding:10px 12px;font-size:14px;margin:10px 16px';($('.stage-wrap')||$('.guided-download').parentElement).append(holeHint);
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
          this.download(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${p.geometry.width} ${p.geometry.height}"><metadata>${esc(JSON.stringify({profileId:p.id,revision:p.revision,designId:draft.design.id,purpose:'vector-draft-not-production',photoIncluded:false}))}</metadata>${vector}${marks}</svg>`],{type:'image/svg+xml'}),p.id+'-vektorentwurf.svg');
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
    el.restoreDraft=function(input,{draft=false}={}){const restored=readDraft(config,input,this.fontData,motifs(),{draft});this.record();options=restored.options;this.state.objects=restored.design.objects;this.state.designId=restored.design.id;this.state.mOptions=clone(options);this.state.selected=null;photos.clear();photoDesign='';this.sync();return restored;};
    el.draftPayload=function({draft=false}={}){return saveDraft(config,this.state,options,this.fontData,motifs(),{draft});};
    el.import=async function(file){if(!file)return;try{if(file.size>2_000_000)throw Error('Entwurf ist zu groß.');const input=JSON.parse(await file.text());await this.uxEnsureDraftResources?.(input);this.restoreDraft(input);$('.status').textContent='Entwurf geladen. Bitte dein Foto erneut auswählen.';}catch(error){$('.status').textContent=error.message;}};
    el.chooseDesign=function(id){
      const d=p.designs.find(d=>d.id===id);if(!d)return;
      this.record();const texts=editedDesignTexts(config,this.state);
      this.state.designId=id;this.state.objects=clone(d.objects);this.state.selected=null;
      for(const o of this.state.objects)if(o.type==='text'&&o.customerEditable!==false&&texts.has(o.fieldKey))o.text=texts.get(o.fieldKey);
      this.normalize();this.sync();
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
    // Miniatur wie im Editor: Musterfoto im leeren Fotofeld (nur Bild, keine Klickfläche – die Karte ist
    // schon ein Knopf). Verschachtelte <svg> der Motive behalten ihre Größe: die Galerie-Regeln
    // „.c-design-card svg{width:100%;height:…!important}“ (auch im Legacy-Editor) trafen sonst auch
    // sie, Motive wurden riesig neben die Platte gezeichnet. Inline-!important schlägt die Regeln.
    function thumbnailMarkup(design){
      const doc=svgDocument(svg(design));
      decorateEmptyPhotoSlots(doc,design.objects,processing.ink,profile().material.color,config.localResources?.photoPlaceholders||[],design.id,config.localResources?.photoExamples||[],config.photo?.hints||[]);
      for(const g of doc.querySelectorAll('[data-ux-empty-photo-slot]')){for(const a of ['data-ux-empty-photo-slot','role','tabindex','aria-label'])g.removeAttribute(a);g.style.removeProperty('cursor');}
      for(const n of doc.documentElement.querySelectorAll('svg')){const w=n.getAttribute('width'),h=n.getAttribute('height');if(/^\d*\.?\d+$/.test(w||'')&&/^\d*\.?\d+$/.test(h||''))n.setAttribute('style',(n.getAttribute('style')||'').replace(/;?\s*$/,';')+'width:'+w+'px!important;height:'+h+'px!important');}
      return doc.documentElement.outerHTML;
    }
    function renderThumbnails(){
      const thumbnailKey=JSON.stringify(options)+'|'+(el.uxThumbnailSignature?.()||'');
      let budget=Number.isFinite(el.uxThumbnailBudget)?el.uxThumbnailBudget:Infinity,deferred=0;
      for(const card of r.querySelectorAll('[data-c-design]')){
        const design=p.designs.find(d=>d.id===card.dataset.cDesign);if(!design)continue;
        let thumbnail=thumbnails.get(card);
        if(!thumbnail||thumbnail.key!==thumbnailKey){
          if(card.hidden||budget<=0||el.uxThumbnailDeferred?.(card)===true){if(!card.hidden&&budget<=0)deferred++;if(!thumbnail)continue;}
          else{budget--;thumbnail={key:thumbnailKey,markup:thumbnailMarkup(el.uxThumbnailDesign?.(design)||design)};}
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
      const d=current(), visible=new Set(filteredDesigns(p.designs,filters).map(d=>d.id));
      const physical=physicalGeometry(config,{mOptions:options});
      $('.stage-top>span').textContent=(config.doorbell?'Edelstahl mit Acrylglasauflage':processing.name.replace('Gravur auf ',''))+' · '+physical.width+' × '+physical.height+' mm';
      if(config.steelFormats){for(const [selector,value] of [['.dimension-x span',physical.width],['.dimension-y span',physical.height]]){const node=$(selector);if(node)node.textContent=new Intl.NumberFormat('de-DE',{maximumFractionDigits:3}).format(value)+' mm';}}
      $('.c-preview-caption>span').textContent='';
      $('.c-preview-caption').nextElementSibling.textContent='Klicke einen Text oder ein Motiv an, um es zu gestalten.';
      $('.c-section-heading small').textContent=p.designs.length+' Vorlagen';
      $('.fk-scroll-hint').textContent='Wähle dein Design';
      $('.fk-material-note').textContent=config.doorbell?'Edelstahl 1,5 mm · Gravur auf Acrylglas 3 mm':processing.name+' · '+p.material.thicknessMm+' mm';
      $('.fk-options>[data-fk-mount-note]')?.setAttribute('hidden','');
      for(const card of r.querySelectorAll('[data-c-design]')){
        card.hidden=!visible.has(card.dataset.cDesign);card.querySelector('small').textContent='Vorlage inklusive';
      }
      renderThumbnails();
      const name=current().name;$('.guided-review dl').innerHTML='<div><dt>Design</dt><dd>'+esc(name)+'</dd></div><div><dt>Material</dt><dd>'+esc(processing.name)+'</dd></div>';
      $('[data-setting=guides]').closest('.check-guide').hidden=false;
      for(const select of picks.querySelectorAll('select[data-m-option]'))select.value=options[select.dataset.mOption];
      updateOptionVisibility();
      for(const button of pictures.querySelectorAll('[data-picture-option]'))button.setAttribute('aria-pressed',String(options[button.dataset.pictureGroup]===button.dataset.pictureOption));
      // Independent of validity: the drill-hole hint must also show while another issue is open.
      try{const shown=current();const hint=holeHintText(textsNearHoles({...shown,objects:shown.objects.filter(o=>objectSurface(o)===activeSurface())},profile(),el.fontData));holeHint.textContent=hint;holeHint.hidden=!hint;}catch{holeHint.hidden=true;}
      try{
        const price=config.basePriceCents===null?null:quote(config,el.state.objects,el.state.designId,options,quantity);
        $('[data-fk-total]').textContent=price?money(price.totalCents):'Preis noch offen';
        $('[data-fk-breakdown]').textContent=price?.additionalMotifs ? price.additionalMotifs+' zusätzliche Motive · '+money(price.additionalMotifs*config.extraMotifCents) : '';
        saveDraft(config,el.state,options,el.fontData,motifs()); issue.textContent='';
      }catch(error){issue.textContent=error.message;}
      $('.fk-buy-button').disabled=true;$('.fk-order-status').textContent='Prüfvorschau · Bestellung und Fotoübertragung noch nicht verbunden.';
      colorControl.querySelector('input').disabled=!el.selected()||!!locked(el.selected());
      if(el.selected()?.color)colorControl.querySelector('input').value=el.selected().color;
      updatePhotos();
    }
    const sync=el.sync;
    el.sync=function(...args){
      options=clone(this.state.mOptions||options);
      this.normalize();const result=sync.apply(this,args);update();return result;
    };
    $('[data-setting=guides]').checked=false;
    el.state.objects=[];el.state.mOptions=clone(options);el.chooseDesign(p.defaultDesignId||p.designs[0].id);
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
