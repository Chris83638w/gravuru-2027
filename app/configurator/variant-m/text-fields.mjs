// Labels come from the unedited template, never from the customer's input.
export function customerFieldLabel(object,index,design){
 const explicit=design?.customerFields?.find(f=>f.id===object.id)?.label;
 const template=design?.objects?.find(o=>o.id===object.id);
 // Added fields have no immutable sample: their label must never track typed text.
 const source=template||{fieldKey:object.fieldKey},sample=String(source.text||'').trim();
 if(explicit&&!/^Text\s*\d+$/i.test(explicit)&&explicit!=='Name')return explicit;
 // Imported generic `name` fields can contain the pair of first names itself.
 // Read that immutable sample before using a separate names field to infer a surname.
 if(/\s&\s/.test(sample))return 'Vornamen';
 if(source.fieldKey==='name'&&design?.objects?.some(o=>o.type==='text'&&/\s&\s/.test(o.text||'')))return 'Nachname';
 if(explicit==='Name')return explicit;
 const named={heading:'Überschrift',names:'Namen',name:'Name',place:'Ort',date:'Datum',daten:'Lebensdaten',slogan:'Spruch',spruch:'Spruch'}[source.fieldKey];
 if(named)return named;
 if(/^von$/i.test(sample))return 'Zeile „von“';
 if(/(?:straße|strasse|str\.|weg|gasse|platz)\s*\d/i.test(sample))return 'Adresse';
 return sample?'Text „'+sample.replace(/\s+/g,' ').slice(0,28)+(sample.length>28?'…':'')+'“':explicit||'Text '+(index+1);
}

export function installTextFields({el,r,selected,select}){
 const fields=r.querySelector('.ux-fields'),controls=r.querySelector('.ux-controls'),editor=r.querySelector('.ux-editor'),sizes=new WeakMap();let expanded=null,lastSelected=null;
 const activeField=()=>r.activeElement?.closest?.('.ux-text-row')?.querySelector('[data-ux-text]');
 let pointerAnchor=null,anchorFrame=0,pointerGesture=null;
 const remember=field=>field?{field,top:field.getBoundingClientRect().top}:null;
 function restoreAnchor(anchor){if(!anchor||!editor)return;const adjust=()=>{editor.scrollTop+=anchor.field.getBoundingClientRect().top-anchor.top;const remaining=anchor.field.getBoundingClientRect().top-anchor.top;if(Math.abs(remaining)>.5)window.scrollBy({top:remaining,behavior:'instant'});};adjust();cancelAnimationFrame(anchorFrame);anchorFrame=requestAnimationFrame(adjust);}
 r.addEventListener('pointerdown',event=>{pointerAnchor=remember(event.target.closest('.ux-text-row')?.querySelector('[data-ux-text]'));pointerGesture={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};},true);
 r.addEventListener('pointermove',event=>{if(pointerGesture?.id===event.pointerId&&Math.hypot(event.clientX-pointerGesture.x,event.clientY-pointerGesture.y)>8)pointerGesture.moved=true;},true);
 const cancelPointerClick=()=>{if(pointerGesture)pointerGesture.moved=true;};
 r.addEventListener('pointercancel',cancelPointerClick,true);
 r.addEventListener('touchmove',cancelPointerClick,{capture:true,passive:true});
 function sizeFields(){for(const field of fields.querySelectorAll('[data-ux-text]')){const width=field.clientWidth;if(!width)continue;const prior=sizes.get(field);if(prior?.width===width&&prior.value===field.value)continue;field.style.height='auto';field.style.height=Math.max(44,field.scrollHeight+4)+'px';sizes.set(field,{width:field.clientWidth,value:field.value});}}
 const toggle=id=>{expanded=expanded===id?null:id;if(expanded)select(id);else update();};
 function revealSelected(){const object=selected();if(object?.type!=='text'||activeField()?.dataset.uxText===object.id)return;const field=[...fields.querySelectorAll('[data-ux-text]')].find(n=>n.dataset.uxText===object.id);if(field&&editor&&!r.querySelector('#ux-panel-text')?.hidden){const f=field.getBoundingClientRect(),e=editor.getBoundingClientRect();if(f.top<e.top||f.bottom>e.bottom)editor.scrollTo({top:Math.max(0,editor.scrollTop+f.top-e.top-24),behavior:'auto'});}}
 function update(){
  sizeFields();
  const object=selected();if(!object||object.type!=='text')expanded=null;else if(expanded)expanded=object.id;
  for(const row of fields.querySelectorAll('.ux-text-row')){
   let disclosure=row.querySelector('[data-text-options]');
   if(!disclosure){disclosure=document.createElement('button');disclosure.type='button';disclosure.dataset.textOptions=row.dataset.uxRow;disclosure.className='ux-text-options';disclosure.innerHTML='<span class="ux-text-options-title">Schrift &amp; Größe</span><span class="ux-inline-chevron" aria-hidden="true"></span>';row.append(disclosure);}
   const open=expanded===row.dataset.uxRow;disclosure.setAttribute('aria-expanded',String(open));disclosure.setAttribute('aria-controls','ux-inline-text-controls');
   const active=object?.type==='text'&&object.id===row.dataset.uxRow;row.classList.toggle('is-selected',active);if(active)row.setAttribute('aria-current','true');else row.removeAttribute('aria-current');
   if(open&&controls.parentNode!==row)row.append(controls);
  }
  controls.id='ux-inline-text-controls';controls.hidden=!expanded||object?.id!==expanded;
  if(object?.type==='text'&&object.id!==lastSelected)requestAnimationFrame(revealSelected);
  lastSelected=object?.id||null;
 }
 const openField=event=>{const field=event.target.closest('[data-ux-text]');if(!field)return;const anchor=pointerAnchor?.field===field?pointerAnchor:remember(field);expanded=field.dataset.uxText;if(selected()?.id!==expanded)select(expanded);else update();restoreAnchor(anchor);};
 r.addEventListener('focusin',openField);
 const closeOptions=()=>{if(expanded){expanded=null;update();}};
 r.addEventListener('click',event=>{
  const deliberate=event.detail===0||!pointerGesture?.moved,disclosure=event.target.closest('[data-text-options]');
  if(deliberate){
   if(disclosure){const anchor=pointerAnchor||remember(disclosure.closest('.ux-text-row')?.querySelector('[data-ux-text]'));toggle(disclosure.dataset.textOptions);restoreAnchor(anchor);}
   else if(event.target.closest('[data-ux-text]'))openField(event);
   else if(!event.target.closest('.ux-text-row,.ux-direct-edit,.ux-direct-input,dialog,[role="dialog"]'))closeOptions();
  }
  pointerAnchor=null;pointerGesture=null;
 },true);
 // Deliberate outside clicks dismiss the box; blur, scrolling and touch drags
 // do not. Font dialogs and the text toolbar remain part of the same edit.
 const outsideClick=event=>{if(!event.composedPath().includes(r.host))closeOptions();};
 document.addEventListener?.('click',outsideClick);
 el.uxUpdateTextUI=update;update();
 // Mobile preview animation resizes the editor on every frame. Re-revealing the
 // selected field then fights the user's scroll and repeatedly jumps the list.
 // The mobile navigation reveals fields once on selection/keyboard opening.
 const observer=new ResizeObserver(()=>{update();if(el.dataset.uxMobileTabs!=='true')revealSelected();});observer.observe(editor);window.addEventListener('pagehide',()=>{observer.disconnect();document.removeEventListener?.('click',outsideClick);},{once:true});
}
