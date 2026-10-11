import {merchantImageAttribute} from './merchant-media.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mm=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(value);

export function importedDesignInfo(design){
  const source=design.importedSource;if(!source)return '';
  if(design.preparedTemplate)return `<div class="import-source"><strong>Vorbereitetes Design · ${escape(design.name)}</strong><p>${design.objects.length} Ebenen · ${design.customerFields?.length||0} zugeordnete Kundenfelder. Dekoration und Kundenfelder sind getrennt gespeichert.</p></div>`;
  return `<div class="import-source"><strong>Importiertes Design · ${escape(source.originalName)}</strong><p>${design.customerFields?.length?escape(design.customerFields.length)+' ausdrücklich zugeordnete Kundenfelder.':'Noch keine Kundenfelder zugeordnet.'} Die Originalgrafik bleibt unverändert.</p><a href="/api/workshop/design-assets/${escape(source.assetId)}/original" download>Originaldatei herunterladen ↓</a></div>`;
}

export function installDesignImport({state,api,setBusy,onSaved,notify}){
  const dialog=document.createElement('dialog');dialog.className='design-import-dialog';dialog.setAttribute('aria-labelledby','design-import-title');
  dialog.innerHTML=`<header class="dialog-header"><div><p class="eyebrow" id="design-import-mode">DESIGN IMPORTIEREN</p><h2 id="design-import-title">Deine Datei, im Konfigurator.</h2></div><button type="button" class="icon-button" data-import-close aria-label="Fenster schließen">×</button></header>
  <p id="design-import-target"></p><p class="field-help">SVG/PDF ersetzen das ausgewählte Design. Ein vorbereitetes JSON-Vorlagenpaket fügt ein neues Design mit Kundenfeldern hinzu. Bis 15 MB. Preise, Größen, Zubehör und die übrigen Designs bleiben erhalten.</p>
  <form id="design-import-form"><label>Designdatei<input id="design-import-file" type="file" accept=".svg,.pdf,.json,image/svg+xml,application/pdf,application/json" required></label>
  <div class="form-grid"><label>PDF-Seite<input id="design-import-page" type="number" value="1" min="1" max="1000" step="1" required></label>
  <label>Platzierung<select id="design-import-fit"><option value="visible">Proportional einpassen · vollständig sichtbar</option><option value="original">Originalmaß · 1:1</option></select></label></div>
  <label class="element-check"><input type="checkbox" id="design-import-editable" checked> Texte, Fotos und Motive zur Bearbeitung aufbereiten</label>
  <p class="field-help">PDF-Schriftkonturen bleiben zunächst originalgetreu. Über „Text bearbeiten“ kannst du ihren Inhalt mit einer vollständigen Werkstatt-Schrift ändern. Text innerhalb eines flachen Fotos benötigt eine eigene Aufbereitung.</p>
  <p class="field-help">Beim Einpassen bleiben die Proportionen erhalten. Die Vorschau zeigt Maß und Skalierung. SVG-Schriften müssen bereits als Pfade vorliegen.</p>
  <button type="submit" id="design-import-check">Datei prüfen & Vorschau anzeigen</button></form>
  <p id="design-import-error" class="form-error" role="alert" hidden></p><p id="design-import-progress" role="status" aria-live="polite"></p>
  <div id="design-import-review" hidden></div><div class="dialog-actions"><button type="button" data-import-close>Abbrechen</button><button type="button" class="primary" id="design-import-apply" disabled>Design ersetzen und speichern</button></div>`;
  document.body.append(dialog);
  const $=s=>dialog.querySelector(s),file=$('#design-import-file'),page=$('#design-import-page'),fit=$('#design-import-fit');
  let target=null,plan=null,busy=false;
  function working(value,message=''){busy=value;setBusy(value);$('#design-import-progress').textContent=message;for(const control of dialog.querySelectorAll('button,input,select'))control.disabled=value;$('#design-import-apply').disabled=value||!plan;page.disabled=value||!file.files[0]?.name.toLowerCase().endsWith('.pdf');fit.disabled=value||file.files[0]?.name.toLowerCase().endsWith('.json');}
  function mode(){const prepared=file.files[0]?.name.toLowerCase().endsWith('.json');$('#design-import-apply').textContent=prepared?'Neues Design hinzufügen':'Design ersetzen und speichern';fit.disabled=prepared;$('#design-import-mode').textContent=prepared?'NEUES DESIGN':'DESIGN ERSETZEN';$('#design-import-target').textContent=prepared?'Vorbereitetes Paket wird als zusätzliches Design angelegt. Bestehende Designs bleiben erhalten.':target?.label||'';}
  function resetReview(){plan=null;$('#design-import-review').hidden=true;$('#design-import-apply').disabled=true;$('#design-import-error').hidden=true;}
  function showError(error){$('#design-import-error').textContent=error.message;$('#design-import-error').hidden=false;}
  function close(){if(!busy)dialog.close();}
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.querySelectorAll('[data-import-close]').forEach(b=>b.addEventListener('click',close));
  for(const input of [file,page,fit,$('#design-import-editable')])input.addEventListener('change',()=>{resetReview();if(input===file){page.value='1';page.max='1000';}working(false);mode();});
  $('#design-import-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!event.currentTarget.reportValidity())return;
    resetReview();working(true,'Die Datei wird geprüft. Dein gespeichertes Design bleibt bis zur Übernahme erhalten.');
    try{
      const source=file.files[0];if(!source||source.size>15*1024*1024)throw Error('Bitte SVG, PDF oder ein Vorlagenpaket mit höchstens 15 MB auswählen.');
      if(source.name.toLowerCase().endsWith('.json')){
        const preparedPackage=JSON.parse(await source.text());
        const reviewed=await api(`/api/workshop/products/${target.productId}/prepared-design/preview`,{method:'POST',body:{expectedRevision:target.revision,package:preparedPackage,makeDefault:true}});
        plan={...reviewed,preparedPackage};
        $('#design-import-review').innerHTML=`<div class="import-review-grid"><div class="import-preview-board">${reviewed.svg}</div><div><h3>${escape(reviewed.name)}</h3><p>${reviewed.layers} Ebenen · ${reviewed.fields} Kundenfelder</p><p>Neues Standarddesign · Originalproportionen erhalten · Skalierung ${mm(reviewed.scale*100)} %</p><ul>${reviewed.warnings.map(w=>`<li>${escape(w)}</li>`).join('')}</ul></div></div>`;
        $('#design-import-review').hidden=false;return;
      }
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Datei konnte nicht gelesen werden.'));reader.readAsDataURL(source);});
      plan=await api(`/api/workshop/products/${target.productId}/design-import/preview`,{method:'POST',body:{name:source.name,bytes:data,page:Number(page.value),fit:fit.value,designId:target.designId,expectedRevision:target.revision,editable:$('#design-import-editable').checked}});
      const a=plan.asset,p=plan.placement,g=state.draft.config.profile.geometry,acrylic=Boolean(state.draft.config.acrylic);
      page.max=String(a.pageCount);
      $('#design-import-review').innerHTML=`<div class="import-review-grid"><div class="import-preview-board"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.width} ${g.height}" role="img" aria-label="Vorschau auf der Produktfläche"><rect x=".25" y=".25" width="${g.width-.5}" height="${g.height-.5}" rx="2" fill="none" stroke="#aebbb5" stroke-width=".5"/><image ${merchantImageAttribute(`/api/workshop/design-assets/${a.assetId}/preview.svg`,true)} x="${p.x-p.widthMm/2}" y="${p.y-p.heightMm/2}" width="${p.widthMm}" height="${p.heightMm}" preserveAspectRatio="none"/>${acrylic?'<path d="M0 193H150" stroke="#576d63" stroke-width=".25" stroke-dasharray="1 1"/>':''}</svg></div><div><h3>${escape(source.name)}</h3><p>Seite ${a.page} von ${a.pageCount}</p><dl class="import-measures"><dt>Dateimaß</dt><dd>${mm(a.widthMm)} × ${mm(a.heightMm)} mm</dd><dt>Auf der Produktfläche</dt><dd>${mm(p.widthMm)} × ${mm(p.heightMm)} mm</dd><dt>Skalierung</dt><dd>${mm(p.scale*100)} % · proportional</dd></dl><p class="field-help">${acrylic?'Das große Produkt skaliert dieselbe Gestaltung mit. Die gestrichelte Linie zeigt den verdeckten Bereich im massiven Sockel. ':''}Karomuster = transparent.</p><a href="/api/workshop/design-assets/${a.assetId}/original" download>Unverändertes Original herunterladen ↓</a></div></div><div class="import-notes"><strong>Bitte vor der Übernahme prüfen</strong><ul>${plan.warnings.map(w=>`<li>${escape(w)}</li>`).join('')}</ul><p>Der bisherige Stand bleibt im Verlauf wiederherstellbar.</p></div>`;
      if(plan.editable){
        if(plan.editableSvg)$('#design-import-review .import-preview-board').innerHTML=plan.editableSvg;
        $('#design-import-review').insertAdjacentHTML('beforeend',`<p><strong>${plan.editableFields} getrennte Bestandteile:</strong> ${plan.parts.map(p=>escape(p.label)).join(', ')}</p>`);
      }
      $('#design-import-review').hidden=false;
    }catch(error){plan=null;showError(error);}finally{working(false);}
  });
  $('#design-import-apply').addEventListener('click',async()=>{
    if(!plan||busy)return;working(true,plan.preparedPackage?'Neues Design wird als weiterer Stand gespeichert.':'Design wird ersetzt und als neuer Stand gespeichert.');
    try{
      const record=plan.preparedPackage?await api(`/api/workshop/products/${target.productId}/prepared-design/apply`,{method:'POST',body:{expectedRevision:target.revision,package:plan.preparedPackage,makeDefault:true,token:plan.token}}):await api(`/api/workshop/products/${target.productId}/design-import/apply`,{method:'POST',body:{expectedRevision:plan.expectedRevision,designId:plan.designId,assetId:plan.asset.assetId,fit:plan.fit,originalName:plan.originalName,token:plan.token,editable:plan.editable===true}});
      await onSaved(record);dialog.close();notify(plan.preparedPackage?'Neues Design mit Kundenfeldern hinzugefügt.':'Design ersetzt und gespeichert. Die Kundenansicht verwendet jetzt deine hochgeladene Vorlage.');
    }catch(error){showError(error);if(error.status===409)plan=null;}finally{working(false);}
  });
  return {open(designId){
    if(state.busy||!state.record||state.record.status==='archived')return;
    if(state.dirty){notify('Bitte zuerst deine Änderungen speichern. Danach kannst du ein Design ersetzen.','info');return;}
    const design=state.draft.config.profile.designs.find(d=>d.id===designId);if(!design)return;
    target={productId:state.record.id,revision:state.record.revision,designId,label:`Ersetzt „${design.name}“ in „${state.record.document.name}“.`};file.value='';page.value='1';page.max='1000';fit.value='visible';resetReview();working(false);
    $('#design-import-target').textContent=`Ersetzt „${design.name}“ in „${state.record.document.name}“.`;
    mode();dialog.showModal();file.focus();
  }};
}
