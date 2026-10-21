const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const presets=['#202824','#731c19','#17614f','#ffffff','#c49a50'];

export function installCustomerFields({state,api,setBusy,onSaved,notify}){
  const dialog=document.createElement('dialog');
  dialog.className='customer-field-editor';dialog.setAttribute('aria-labelledby','customer-fields-title');
  dialog.innerHTML=`<header class="dialog-header"><div><p class="eyebrow">DESIGNS & ELEMENTE</p><h2 id="customer-fields-title">Kundenfelder festlegen</h2><p id="customer-fields-design"></p></div><button type="button" class="icon-button" data-fields-close aria-label="Kundenfelder schließen">×</button></header>
  <p class="field-source-note">Die importierte Grafik bleibt erhalten. Lege Felder nur auf dafür vorbereiteten freien Flächen an. Pfadtexte und eingebettete Fotos werden nicht automatisch ersetzt.</p>
  <div class="customer-fields-layout"><nav class="customer-fields-list" aria-label="Kundenfelder"><h3>Elemente</h3><p class="field-help">Design und Fotomaske · fest</p><div id="customer-field-list"></div><div class="field-add"><button type="button" data-add-field="text">Textfeld hinzufügen</button><button type="button" data-add-field="photoSlot">Fotobereich hinzufügen</button></div></nav>
  <section class="customer-fields-preview" aria-label="Gestaltungsvorschau"><div class="field-preview-heading"><strong>Gestaltung · 150 × 200 mm</strong><span id="field-preview-state" role="status"></span></div><div id="field-preview-board"></div><p class="field-help">Maße beziehen sich auf das kleine Produkt. Das große Format verwendet dieselbe skalierte Gestaltung. Die Kundenansicht zeigt die Produktszene nach dem Speichern.</p></section>
  <form id="customer-field-properties" class="customer-field-properties"><p>Wähle ein Feld oder lege ein neues an.</p></form></div>
  <p id="customer-fields-error" class="form-error" role="alert" hidden></p>
  <label class="field-prepared"><input type="checkbox" id="field-source-prepared"> Die Originalgrafik ist vorbereitet: An den neuen Feldpositionen sind keine alten Texte oder Fotos zu ersetzen.</label>
  <footer class="field-editor-footer"><p id="customer-fields-progress" role="status" aria-live="polite"></p><div class="button-row"><button type="button" data-fields-close>Abbrechen</button><button type="button" id="customer-fields-check">Vorschau prüfen</button><button type="button" class="primary" id="customer-fields-save" disabled>Felder speichern</button></div></footer>`;
  document.body.append(dialog);
  const $=s=>dialog.querySelector(s);
  let target=null,fields=[],selected=null,plan=null,busy=false,changed=false,fonts=[];
  const selectedField=()=>fields.find(f=>f.id===selected);
  function working(value){busy=value;setBusy(value);for(const control of dialog.querySelectorAll('button,input,select,textarea'))control.disabled=value;$('#customer-fields-save').disabled=value||!plan;}
  function invalidate(){plan=null;changed=true;$('#customer-fields-save').disabled=true;$('#field-preview-state').textContent='Änderungen noch nicht geprüft';$('#customer-fields-progress').textContent='Bitte die aktuelle Vorschau prüfen, bevor du speicherst.';}
  function error(err){$('#customer-fields-error').textContent=err.message;$('#customer-fields-error').hidden=false;}
  function list(){
    $('#customer-field-list').innerHTML=fields.length?fields.map(f=>`<button type="button" class="field-list-item" data-field-id="${escape(f.id)}" aria-pressed="${f.id===selected}"><strong>${escape(f.label)}</strong><small>${f.type==='text'?'Text':'Foto'} · ${escape(f.fieldKey)}</small></button>`).join(''):'<p class="field-help">Noch keine Kundenfelder zugeordnet.</p>';
  }
  const number=(label,key,value)=>`<label>${label}<input type="number" step="any" data-field="${key}" value="${escape(Math.round(value*1000)/1000)}" required></label>`;
  function properties(){
    const f=selectedField();list();
    if(!f){$('#customer-field-properties').innerHTML='<p>Wähle ein Feld oder lege ein neues an.</p>';return;}
    $('#customer-field-properties').innerHTML=`<h3>${f.type==='text'?'Textfeld':'Fotobereich'}</h3><label>Bezeichnung<input data-field="label" value="${escape(f.label)}" maxlength="80" required></label><label>Feldschlüssel<input data-field="fieldKey" value="${escape(f.fieldKey)}" pattern="[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}" required></label><p class="field-help">Gleiche Schlüssel verbinden dieselben Kundeninhalte über Designs hinweg. Für Fotos: photo-…</p><div class="field-measures">${number('Mitte X · mm','x',f.x)}${number('Mitte Y · mm','y',f.y)}</div>`+
      (f.type==='text'?`<label>Beispieltext<textarea data-field="text" rows="2" maxlength="180" required>${escape(f.text)}</textarea></label><label>Schrift<select data-field="font">${fonts.map(font=>`<option ${font===f.font?'selected':''}>${escape(font)}</option>`).join('')}</select></label>${number('Schriftgröße · mm','size',f.size)}<label>Ausgewählte Farbe<input type="color" data-field="color" value="${escape(f.color)}"></label><div class="field-colors" role="group" aria-label="Farbvorschläge">${presets.map(color=>`<button type="button" class="field-color" style="background-color:${color}" data-field-color="${color}" aria-label="Farbe ${color}" aria-pressed="${color===f.color}"></button>`).join('')}</div><label class="field-check"><input type="checkbox" data-field="allowColor" ${f.allowColor?'checked':''}> Kunde darf Farbe ändern</label><label>Kundenbedienung<select data-field="allowMove"><option value="false" ${!f.allowMove?'selected':''}>Feste Textposition</option><option value="true" ${f.allowMove?'selected':''}>Frei verschiebbar · Text ändern und ausrichten</option></select></label><label class="field-check"><input type="checkbox" data-field="allowScale" ${f.allowScale?'checked':''}> Kunde darf die Textgröße ändern</label><label class="field-check"><input type="checkbox" data-field="allowDelete" ${f.allowDelete?'checked':''}> Kunde darf das Textfeld entfernen</label><p class="field-help">Diese Backend-Freigaben steuern die gewohnten Griffe im Konfigurator. Das eigentliche Design bleibt fest.</p>`:
      `<div class="field-measures">${number('Breite · mm','widthMm',f.widthMm)}${number('Höhe · mm','heightMm',f.heightMm)}</div><label>Form<select data-field="shape"><option value="rect" ${f.shape==='rect'?'selected':''}>Rechteck</option><option value="circle" ${f.shape==='circle'?'selected':''}>Kreis</option><option value="arch" ${f.shape==='arch'?'selected':''}>Bogen</option></select></label><label class="field-check"><input type="checkbox" data-field="required" ${f.required?'checked':''}> Eigenes Foto erforderlich</label><p class="field-help">Kunde darf das Foto ersetzen und hinter der festen Maske ausrichten. Die Fotomaske bleibt an ihrer Position.</p>`)+`<button type="button" class="text-button field-remove" data-remove-field>Feld entfernen</button>`;
  }
  function input(){return {expectedRevision:target.revision,designId:target.designId,fields:structuredClone(fields),sourcePrepared:$('#field-source-prepared').checked};}
  async function review(initial=false){
    if(busy)return;
    if(!initial&&!$('#customer-field-properties').reportValidity())return;
    working(true);plan=null;$('#customer-fields-error').hidden=true;
    $('#customer-fields-progress').textContent='Gestaltung und Kundenrechte werden geprüft …';
    try{
      const request=input();if(initial)request.sourcePrepared=true;
      const checked=await api(`/api/workshop/products/${target.productId}/customer-fields/preview`,{method:'POST',body:request});
      // SVG comes from the same validated renderer as the existing product preview.
      $('#field-preview-board').innerHTML=checked.svg;
      $('#field-preview-state').textContent=initial?'Gespeicherter Stand':'Aktuelle Vorschau geprüft';
      if(!initial)plan={...request,token:checked.token};
      $('#customer-fields-progress').textContent=initial?'Felder ergänzen, Vorschau prüfen und als neuen Stand speichern.':'Vorschau geprüft. Speichern legt einen neuen, wiederherstellbaren Stand an.';
    }catch(err){error(err);$('#customer-fields-progress').textContent='Bitte die Eingaben korrigieren.';}finally{working(false);}
  }
  function close(){if(busy)return;if(changed&&!window.confirm('Ungespeicherte Kundenfelder verwerfen?'))return;dialog.close();}
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.querySelectorAll('[data-fields-close]').forEach(button=>button.addEventListener('click',close));
  $('#customer-field-properties').addEventListener('submit',event=>{event.preventDefault();review();});
  $('#customer-field-properties').addEventListener('input',event=>{
    const f=selectedField(),node=event.target,key=node.dataset.field;if(!f||!key||busy)return;
    f[key]=key==='allowMove'?node.value==='true':node.type==='checkbox'?node.checked:node.type==='number'?node.valueAsNumber:node.value;invalidate();list();
    if(key==='color')dialog.querySelectorAll('[data-field-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fieldColor===f.color)));
  });
  $('#field-source-prepared').addEventListener('change',invalidate);
  dialog.addEventListener('click',event=>{
    if(busy)return;
    const item=event.target.closest('[data-field-id]');if(item){selected=item.dataset.fieldId;properties();return;}
    const color=event.target.closest('[data-field-color]');if(color&&selectedField()){selectedField().color=color.dataset.fieldColor;invalidate();properties();return;}
    const add=event.target.closest('[data-add-field]');
    if(add){
      if(fields.length>=19){error(Error('Höchstens 19 Kundenfelder pro Design.'));return;}
      const type=add.dataset.addField,n=fields.length+1,id='customer-'+crypto.randomUUID();
      let key=(type==='text'?'text-':'photo-')+n;while(fields.some(f=>f.fieldKey===key))key+='-neu';
      fields.push({id,type,label:type==='text'?'Namen':'Foto',fieldKey:key,x:75,y:type==='text'?155:65,...(type==='text'?{text:'Anna & Lukas',font:fonts.includes('Montserrat')?'Montserrat':fonts[0],size:5,color:'#731c19',allowColor:false,allowMove:true,allowScale:true,allowDelete:true}:{widthMm:90,heightMm:80,shape:'rect',required:true})});
      selected=id;invalidate();properties();$('#customer-field-properties input')?.focus();return;
    }
    if(event.target.closest('[data-remove-field]')){fields=fields.filter(f=>f.id!==selected);selected=fields[0]?.id;invalidate();properties();}
  });
  $('#customer-fields-check').addEventListener('click',()=>review());
  $('#customer-fields-save').addEventListener('click',async()=>{
    if(!plan||busy)return;working(true);$('#customer-fields-error').hidden=true;
    try{
      const saved=await api(`/api/workshop/products/${target.productId}/customer-fields/apply`,{method:'POST',body:plan});
      await onSaved(saved);changed=false;dialog.close();notify('Kundenfelder gespeichert. Text und Fotoersatz sind in der Kundenansicht verfügbar.');
    }catch(err){error(err);plan=null;}finally{working(false);}
  });
  return {async open(designId){
    if(state.busy||!state.record||state.record.status==='archived')return;
    if(state.dirty){notify('Bitte die bisherigen Änderungen zuerst speichern.','info');return;}
    const design=state.record.document.config.profile.designs.find(d=>d.id===designId);if(!design?.importedSource)return;
    target={productId:state.record.id,revision:state.record.revision,designId};
    fonts=Object.keys(state.record.document.config.localResources.fonts);
    fields=(design.customerFields||[]).map(meta=>{
      const o=design.objects.find(o=>o.id===meta.id),r=state.record.document.elementRights[designId][o.id];
      return {id:o.id,label:meta.label,type:o.type,fieldKey:o.fieldKey,x:o.x,y:o.y,...(o.type==='text'?{text:o.text,font:o.font,size:o.size,color:o.color,allowColor:r.color,allowMove:r.move===true,allowScale:r.scale===true,allowDelete:r.delete===true,...(o.letterSpacing!==undefined?{letterSpacing:o.letterSpacing}:{})}:{widthMm:o.w,heightMm:o.h,shape:o.photoShape,required:o.required})};
    });
    selected=fields[0]?.id;plan=null;changed=false;$('#field-source-prepared').checked=false;$('#customer-fields-error').hidden=true;$('#field-preview-board').replaceChildren();
    $('#customer-fields-design').textContent=state.record.document.name+' · '+design.name;
    properties();working(false);dialog.showModal();await review(true);
  }};
}
