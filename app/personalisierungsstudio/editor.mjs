import {scene,svg} from './render.mjs';

const strings=new Map();
async function request(url,options){
  const response=await fetch(url,options);
  const data=await response.json();
  if(!response.ok)throw Error(data.description||data.error||'Anfrage fehlgeschlagen. Bitte erneut versuchen.');
  return data;
}
function asJSON(value){return {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)};}
function loadAsset(base,key){
  const url=base+'assets/'+key;
  if(!strings.has(url)) strings.set(url,request(url).catch(e=>{strings.delete(url);throw e;}));
  return strings.get(url);
}
const node=(tag,content)=>{const el=document.createElement(tag);if(content!==undefined)el.textContent=content;return el;};
const asDataURL=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Foto konnte nicht gelesen werden.'));r.readAsDataURL(file);});

class GravuruStudio extends HTMLElement{
  connectedCallback(){
    if(this.started)return;
    this.started=true;this.base=this.dataset.base;this.drafts=new Map();this.prepared=new Map();this.sharedEdits=new Map();this.sharedPhotos=new Map();this.pendingPhotos=new Map();
    this.variant=this.dataset.variant;this.epoch=0;this.listeners=new AbortController();
    this.photoErrors=new Map();
    this.innerHTML='<div class="gs-layout"><div class="gs-preview" aria-label="Produktvorschau" aria-busy="true"><div class="gs-plate"></div></div><section class="gs-controls"><h2>Dein Schild gestalten</h2><label>Vorlage<select class="gs-design"></select></label><div class="gs-fields"></div><div class="gs-actions"><label>Menge<input class="gs-qty" type="number" value="1" min="1" step="1"></label><button type="button" class="gs-add" disabled>In den Warenkorb</button></div><p class="gs-message" role="status" aria-live="polite"></p></section></div>';
    this.q=s=>this.querySelector(s);
    if(this.dataset.previewData){
      this.previewData=JSON.parse(document.getElementById(this.dataset.previewData).textContent);
      this.q('.gs-qty').closest('label').remove();this.q('.gs-add').textContent='SVG mit Kontur herunterladen';
      this.q('.gs-actions').style.gridTemplateColumns='1fr';
    }
    this.asset=key=>this.previewData ? Promise.resolve(this.previewData.assets[key]) :
      this.catalog?.initialAssets?.[key] ? Promise.resolve(this.catalog.initialAssets[key]) : loadAsset(this.base,key);
    if(this.dataset.surface) this.q('.gs-plate').style.backgroundImage='url("'+this.dataset.surface.replace(/["\\]/g,'')+'")';
    this.q('.gs-design').addEventListener('change',()=>this.select(this.q('.gs-design').value));
    this.enableMotifDrag();
    this.q('.gs-add').addEventListener('click',()=>this.add());
    this.form=()=>this.dataset.form ? document.getElementById(this.dataset.form) : this.closest('.shopify-section')?.querySelector('form[action$="/cart/add"]');
    this.actualVariant=()=>this.form()?.querySelector('[name="id"]')?.value || this.eventVariant || new URL(location.href).searchParams.get('variant') || this.dataset.variant;
    this.syncVariant=()=>{const variant=this.actualVariant();if(variant && variant!==this.variant) this.load(variant);};
    document.addEventListener('change',()=>setTimeout(this.syncVariant,0),{signal:this.listeners.signal});
    document.addEventListener('variant:change',e=>{
      const v=e.detail?.variant;
      if(v && String(v.product_id)===this.dataset.product)this.eventVariant=String(v.id);
      this.syncVariant();
    },{signal:this.listeners.signal});
    // Some themes set input.value without dispatching a change event.
    this.variantPoll=setInterval(this.syncVariant,500);
    this.load(this.actualVariant());
  }
  disconnectedCallback(){this.epoch++;this.listeners?.abort();clearInterval(this.variantPoll);this.started=false;}
  status(msg){this.q('.gs-message').textContent=msg;}
  async load(variant){
    const epoch=++this.epoch;this.variant=variant;this.current=null;this.prepared.clear();
    this.q('.gs-add').disabled=true;this.q('.gs-preview').setAttribute('aria-busy','true');this.q('.gs-fields').replaceChildren();this.q('.gs-plate').replaceChildren();this.q('.gs-design').replaceChildren();
    this.status('Vorlagen werden geladen …');
    try{
      const catalog=this.previewData?.catalog || await request(this.base+'catalog?variant='+encodeURIComponent(variant));
      if(epoch!==this.epoch)return;
      if(catalog.product!==this.dataset.product)throw Error('Vorlage und Produkt passen nicht zusammen.');
      this.catalog=catalog;
      for(const d of catalog.designs){const opt=node('option',d.name);opt.value=d.id;this.q('.gs-design').append(opt);}
      await this.select(catalog.designs[0].id);
      const next=catalog.designs[1];
      if(next && this.catalog===catalog && !navigator.connection?.saveData) this.prepare(next).catch(()=>{});
    }catch(error){if(epoch===this.epoch)this.status(error.message);}
  }
  prepare(entry){
    if(this.prepared.has(entry.key))return this.prepared.get(entry.key);
    const result=this.asset(entry.key).then(async({design,faces})=>{
      const fonts={};
      await Promise.all(Object.entries(faces).flatMap(([name,styles])=>Object.entries(styles).map(async([style,keys])=>{
        const face=await this.asset(typeof keys==='string'?keys:keys.initial);fonts[name]??={};fonts[name][style]=face;
      })));
      return {design,fonts,faces};
    }).catch(error=>{this.prepared.delete(entry.key);throw error;});
    this.prepared.set(entry.key,result);return result;
  }
  async select(id){
    const entry=this.catalog.designs.find(d=>d.id===id);if(!entry)return;
    const epoch=++this.epoch;this.current=null;this.q('.gs-add').disabled=true;
    this.q('.gs-preview').setAttribute('aria-busy','true');this.status('Vorlage wird geladen …');
    try{
      const current=await this.prepare(entry);
      if(epoch!==this.epoch)return;
      this.current=current;this.q('.gs-fields').replaceChildren();
      const key=[this.variant,this.catalog.revision,id].join('/');
      if(!this.drafts.has(key))this.drafts.set(key,{edits:{},motifs:{},photo:null,request:crypto.randomUUID()});
      this.draft=this.drafts.get(key);
      const group=this.variant+'/'+this.catalog.revision;
      const sharedPhoto=this.sharedPhotos.get(group)||null;
      if(current.design.objects.some(o=>o.type==='photo') && this.draft.photo?.id!==sharedPhoto?.id){this.draft.photo=sharedPhoto;this.changed();}
      for(const o of current.design.objects){
        if(o.type==='text'){
          const label=node('label',o.label);const input=node('input');input.type='text';input.maxLength=300;input.dataset.key=o.key;
          if(o.text.includes('\n')){const area=node('textarea');area.maxLength=300;area.dataset.key=o.key;label.append(area);}
          else label.append(input);
          const sharedKey=group+'/'+o.key;
          if(o.fieldKey && this.sharedEdits.has(sharedKey) && this.draft.edits[o.key]!==this.sharedEdits.get(sharedKey)){
            this.draft.edits[o.key]=this.sharedEdits.get(sharedKey);this.changed();
          }
          const field=label.lastElementChild;field.value=this.draft.edits[o.key]??o.text;
          field.oninput=()=>{this.draft.edits[o.key]=field.value;if(o.fieldKey)this.sharedEdits.set(sharedKey,field.value);this.changed();this.paint();};
          this.q('.gs-fields').append(label);
        }
        if(o.type==='photo')this.photoField();
      }
      for(const o of current.design.objects.filter(o=>o.type==='motif' && o.editable))this.motifField(o);
      this.q('.gs-preview').setAttribute('aria-busy','false');this.dataset.activeDesign=id;this.paint();
    }catch(error){if(epoch===this.epoch)this.status(error.message);}
  }
  changed(){this.draft.request=crypto.randomUUID();delete this.draft.receipt;delete this.draft.uncertain;}
  setMotif(id,change){
    this.draft.motifs[id]={...this.draft.motifs[id],...change};this.changed();this.paint();
  }
  motifField(o){
    const {design}=this.current,panel=node('details'),summary=node('summary','Motiv anpassen');panel.append(summary);
    const owner=this.current,label=node('label','Motiv'),select=node('select');
    select.setAttribute('aria-label','Motiv');
    for(const m of [...design.motifs,{id:'none',name:'Ohne Motiv'}]){
      const opt=node('option',m.name);opt.value=m.id;select.append(opt);
    }
    select.value=this.draft.motifs[o.id]?.choice??o.motif;label.append(select);panel.append(label);
    select.onchange=async()=>{
      const choice=select.value,resource=design.motifs.find(m=>m.id===choice);
      try{
        if(resource && choice!==o.motif && !resource.paths)resource.paths=await this.asset(resource.key);
        if(this.current===owner && select.value===choice)this.setMotif(o.id,{choice});
      }catch(e){if(this.current===owner){select.value=this.draft.motifs[o.id]?.choice??o.motif;this.status(e.message);}}
    };
    for(const [axis,caption,max] of [['x','Horizontal',design.width],['y','Vertikal',design.height]]){
      const row=node('label',caption+' (mm)'),range=node('input');range.type='range';range.min='0';range.max=max;range.step='0.1';
      range.value=this.draft.motifs[o.id]?.[axis]??o[axis];range.dataset.motifId=o.id;range.dataset.axis=axis;
      range.oninput=()=>this.setMotif(o.id,{[axis]:Number(range.value)});row.append(range);panel.append(row);
    }
    panel.className='gs-motif';this.q('.gs-fields').append(panel);
  }
  enableMotifDrag(){
    const plate=this.q('.gs-plate');let drag=null;
    plate.onpointerdown=e=>{
      const id=e.target.closest('[data-motif]')?.dataset.motif;
      const o=this.current?.design.objects.find(v=>v.id===id);
      if(!o || this.busy || !e.isPrimary)return;
      const box=plate.querySelector('svg').getBoundingClientRect(),change=this.draft.motifs[id]||{};
      drag={id,o,box,design:this.current.design,x:change.x??o.x,y:change.y??o.y,px:e.clientX,py:e.clientY};
      plate.setPointerCapture(e.pointerId);
    };
    plate.onpointermove=e=>{
      if(!drag || this.current?.design!==drag.design)return;
      const clamp=(n,max)=>Math.round(Math.max(0,Math.min(n,max))*10)/10;
      const x=clamp(drag.x+(e.clientX-drag.px)*drag.design.width/drag.box.width,drag.design.width);
      const y=clamp(drag.y+(e.clientY-drag.py)*drag.design.height/drag.box.height,drag.design.height);
      this.setMotif(drag.id,{x,y});
      for(const control of this.querySelectorAll('input[data-motif-id]'))if(control.dataset.motifId===drag.id)control.value=control.dataset.axis==='x'?x:y;
    };
    plate.onlostpointercapture=plate.onpointercancel=plate.onpointerup=()=>{drag=null;};
  }
  async completeFont(o){
    const current=this.current,style=o.bold?'bold':'regular',keys=current.faces[o.font][style];
    if(typeof keys==='string')return;
    current.fonts[o.font][style]=await this.asset(keys.full);
  }
  photoField(){
    const draft=this.draft,label=node('label','Dein Foto'),field=node('input');field.type='file';field.accept='image/jpeg,image/png';
    label.append(field);
    const reset=node('button','Foto entfernen');reset.type='button';reset.className='gs-link';reset.hidden=!draft.photo;
    const refresh=()=>{if(this.draft===draft){reset.hidden=!draft.photo;this.paint();}};
    const group=this.variant+'/'+this.catalog.revision;
    reset.hidden=!(draft.photo||this.pendingPhotos.has(group)||this.photoErrors.has(group));
    reset.onclick=()=>{draft.sequence=(draft.sequence||0)+1;draft.uploading=false;draft.photo=null;draft.photoError='';this.pendingPhotos.delete(group);this.photoErrors.delete(group);this.sharedPhotos.delete(group);field.value='';this.changed();refresh();};
    field.onchange=async()=>{
      const file=field.files?.[0];if(!file)return;
      const seq=(draft.sequence||0)+1;draft.sequence=seq;draft.uploading=true;draft.photoError='';reset.hidden=false;
      const ticket=Symbol();this.pendingPhotos.set(group,ticket);
      this.photoErrors.delete(group);
      this.changed();this.paint();
      const context={variant:this.variant,revision:this.catalog.revision,design:this.current.design.id};
      try{
        if(file.size>8_000_000)throw Error('Das Foto darf höchstens 8 MB groß sein.');
        const original=await asDataURL(file);
        const result=await request(this.base+'photos',asJSON({...context,original}));
        if(draft.sequence===seq && this.pendingPhotos.get(group)===ticket){
          draft.photo={id:result.id,original};this.sharedPhotos.set(group,draft.photo);
          if(this.draft!==draft && this.variant+'/'+this.catalog.revision===group && this.current?.design.objects.some(o=>o.type==='photo')){
            this.draft.photo=draft.photo;this.changed();this.paint();
          }
        }
      }catch(error){if(draft.sequence===seq && this.pendingPhotos.get(group)===ticket){this.photoErrors.set(group,error.message);draft.photo=null;}}
      finally{if(this.pendingPhotos.get(group)===ticket)this.pendingPhotos.delete(group);if(draft.sequence===seq){draft.uploading=false;refresh();reset.hidden=false;}if(this.draft!==draft && this.current)this.paint();}
    };
    this.q('.gs-fields').append(label,reset);
  }
  paint(){
    if(!this.current)return;
    try{
      const design=this.current.design;
      for(const o of design.objects.filter(v=>v.type==='text')){
        const style=o.bold?'bold':'regular',face=this.current.fonts[o.font][style],keys=this.current.faces[o.font][style];
        if(typeof keys!=='string' && !this.current.expanded?.has(keys.full) && [...(this.draft.edits[o.key]??o.text)].some(c=>c!=='\n' && !Object.hasOwn(face.glyphs,c))){
          const current=this.current;this.q('.gs-add').disabled=true;this.status('Schriftzeichen werden geladen …');
          this.completeFont(o).then(()=>{current.expanded??=new Set();current.expanded.add(keys.full);if(this.current===current)this.paint();})
            .catch(e=>{if(this.current===current)this.status(e.message);});
          return;
        }
      }
      const art=scene(design,this.current.fonts,this.draft.edits,this.draft.photo?.original,this.draft.motifs);
      const plate=this.q('.gs-plate');plate.style.aspectRatio=design.width+'/'+design.height;
      plate.innerHTML=svg(art,{contour:false,label:design.name});
      if(design.objects.some(o=>o.type==='photo') && this.photoErrors.has(this.variant+'/'+this.catalog.revision))throw Error(this.photoErrors.get(this.variant+'/'+this.catalog.revision));
      if(this.draft.uploading || design.objects.some(o=>o.type==='photo') && this.pendingPhotos.has(this.variant+'/'+this.catalog.revision))throw Error('Dein Foto wird gesichert …');
      this.q('.gs-add').disabled=!!this.busy;
      this.status('');
    }catch(error){this.q('.gs-add').disabled=true;this.status(error.message);}
  }
  async add(){
    if(this.busy || !this.current || this.q('.gs-add').disabled)return;
    if(this.previewData){
      const source=svg(scene(this.current.design,this.current.fonts,this.draft.edits,null,this.draft.motifs));
      const link=node('a');link.href=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'}));
      link.download=this.current.design.id+'.svg';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),3000);return;
    }
    if(this.actualVariant()!==this.variant){this.syncVariant();return;}
    const form=this.form();
    if(form && !form.reportValidity())return;
    const qty=this.q('.gs-qty');
    if(!qty.reportValidity())return;
    const draft=this.draft, current=this.current, variant=this.variant, number=Number(qty.value);
    const payload={variant,revision:this.catalog.revision,design:current.design.id,edits:{...draft.edits},motifs:structuredClone(draft.motifs),photo:draft.photo?.id||null,request:draft.request};
    this.busy=true;this.q('.gs-controls').inert=true;this.q('.gs-add').disabled=true;this.status('Wird in den Warenkorb gelegt …');
    let attempted=false;
    try{
      const result=draft.receipt||await request(this.base+'designs',asJSON(payload));draft.receipt=result;
      const go=()=>location.assign(this.dataset.cart);
      const inCart=async()=>{const cart=await request(this.dataset.cartJson,{cache:'no-store'});return cart.items.some(i=>i.properties?._gravuru_studio===result.id);};
      if(draft.uncertain && await inCart()){go();return;}
      if(this.actualVariant()!==variant)throw Error('Die Variante wurde geändert. Bitte die Gestaltung prüfen.');
      const properties={_gravuru_studio:result.id,Gestaltung:current.design.name,Personalisierung:current.design.objects.filter(o=>o.type==='text').map(o=>draft.edits[o.key]??o.text).filter(Boolean).join(' · ').slice(0,200)};
      attempted=true;draft.uncertain=true;
      let add=asJSON({items:[{id:variant,quantity:number,properties}]});
      if(form){
        const data=new FormData(form);
        data.set('id',variant);data.set('quantity',String(number));
        for(const [key,value] of Object.entries(properties))data.set('properties['+key+']',value);
        add={method:'POST',body:data,headers:{Accept:'application/json'}};
      }
      await request(this.dataset.add,add);go();
    }catch(error){
      if(attempted){try{const cart=await request(this.dataset.cartJson,{cache:'no-store'});if(cart.items.some(i=>i.properties?._gravuru_studio===draft.receipt?.id)){location.assign(this.dataset.cart);return;}}catch{}}
      this.status(error.message+' Deine Eingaben sind erhalten.');
    }finally{this.busy=false;this.q('.gs-controls').inert=false;this.q('.gs-add').disabled=!this.current;}
  }
}
if(!customElements.get('gravuru-studio'))customElements.define('gravuru-studio',GravuruStudio);
