// Labels come from the unedited template, never from the customer's input.
export function customerFieldLabel(object,index,design){
 const explicit=design?.customerFields?.find(f=>f.id===object.id)?.label;
 const template=design?.objects?.find(o=>o.id===object.id);
 // Added fields have no immutable sample: their label must never track typed text.
 const source=template||{fieldKey:object.fieldKey},sample=String(source.text||'').trim();
 if(explicit&&!/^Text\s*\d+$/i.test(explicit)&&explicit!=='Name')return explicit;
 if(source.fieldKey==='name'&&design?.objects?.some(o=>o.type==='text'&&/\s&\s/.test(o.text||'')))return 'Nachname';
 if(explicit==='Name')return explicit;
 const named={heading:'Überschrift',names:'Namen',name:'Name',place:'Ort',date:'Datum',daten:'Lebensdaten',slogan:'Spruch',spruch:'Spruch'}[source.fieldKey];
 if(named)return named;
 if(/^von$/i.test(sample))return 'Zeile „von“';
 if(/\s&\s/.test(sample))return 'Vornamen';
 if(/(?:straße|strasse|str\.|weg|gasse|platz)\s*\d/i.test(sample))return 'Adresse';
 return sample?'Text „'+sample.replace(/\s+/g,' ').slice(0,28)+(sample.length>28?'…':'')+'“':explicit||'Text '+(index+1);
}

export function installTextFields({el,r,selected,select}){
 const fields=r.querySelector('.ux-fields'),controls=r.querySelector('.ux-controls');let expanded=null;
 const toggle=id=>{expanded=expanded===id?null:id;if(expanded)select(id);else update();};
 function update(){
  const object=selected();if(!object||object.type!=='text'||expanded&&object.id!==expanded)expanded=null;
  for(const row of fields.querySelectorAll('.ux-text-row')){
   let disclosure=row.querySelector('[data-text-options]');
   if(!disclosure){disclosure=document.createElement('button');disclosure.type='button';disclosure.dataset.textOptions=row.dataset.uxRow;disclosure.className='ux-text-options';disclosure.innerHTML='<span class="ux-text-options-title">Schrift &amp; Größe</span><span class="ux-inline-chevron" aria-hidden="true"></span>';row.append(disclosure);}
   const open=expanded===row.dataset.uxRow;disclosure.setAttribute('aria-expanded',String(open));disclosure.setAttribute('aria-controls','ux-inline-text-controls');
   if(open&&controls.parentNode!==row)row.append(controls);
  }
  controls.id='ux-inline-text-controls';controls.hidden=!expanded||object?.id!==expanded;
 }
 r.addEventListener('click',event=>{const disclosure=event.target.closest('[data-text-options]');if(disclosure)toggle(disclosure.dataset.textOptions);});
 // Disclosure state changes explicitly, never on blur. iOS does not always focus
 // a tapped button; closing on textarea blur can remove it before its click fires.
 el.uxUpdateTextUI=update;update();
}
