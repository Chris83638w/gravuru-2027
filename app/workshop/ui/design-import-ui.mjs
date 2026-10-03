const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mm=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(value);

export function importedDesignInfo(design){
  const source=design.importedSource;if(!source)return '';
  return `<div class="import-source"><strong>Importiertes Design · ${escape(source.originalName)}</strong><p>Feste Vorlage. Texte und Fotos innerhalb der Datei sind noch keine austauschbaren Kundenfelder.</p><a href="/api/workshop/design-assets/${escape(source.assetId)}/original" download>Originaldatei herunterladen ↓</a></div>`;
}

export function installDesignImport({state,api,setBusy,onSaved,notify}){
  const dialog=document.createElement('dialog');dialog.className='design-import-dialog';dialog.setAttribute('aria-labelledby','design-import-title');
  dialog.innerHTML=`<header class="dialog-header"><div><p class="eyebrow">DESIGN ERSETZEN</p><h2 id="design-import-title">Deine Datei, im Konfigurator.</h2></div><button type="button" class="icon-button" data-import-close aria-label="Fenster schließen">×</button></header>
  <p id="design-import-target"></p><p class="field-help">SVG oder PDF · bis 15 MB. Das ausgewählte Design wird vollständig ersetzt. Preise, Größen, Zubehör und die übrigen Designs bleiben erhalten.</p>
  <form id="design-import-form"><label>Designdatei<input id="design-import-file" type="file" accept=".svg,.pdf,image/svg+xml,application/pdf" required></label>
  <div class="form-grid"><label>PDF-Seite<input id="design-import-page" type="number" value="1" min="1" max="1000" step="1" required></label>
  <label>Platzierung<select id="design-import-fit"><option value="visible">Proportional einpassen · vollständig sichtbar</option><option value="original">Originalmaß · 1:1</option></select></label></div>
  <p class="field-help">Beim Einpassen bleiben die Proportionen erhalten. Die Vorschau zeigt Maß und Skalierung. SVG-Schriften müssen bereits als Pfade vorliegen.</p>
  <button type="submit" id="design-import-check">Datei prüfen & Vorschau anzeigen</button></form>
  <p id="design-import-error" class="form-error" role="alert" hidden></p><p id="design-import-progress" role="status" aria-live="polite"></p>
  <div id="design-import-review" hidden></div><div class="dialog-actions"><button type="button" data-import-close>Abbrechen</button><button type="button" class="primary" id="design-import-apply" disabled>Design ersetzen und speichern</button></div>`;
  document.body.append(dialog);
  const $=s=>dialog.querySelector(s),file=$('#design-import-file'),page=$('#design-import-page'),fit=$('#design-import-fit');
  let target=null,plan=null,busy=false;
  function working(value,message=''){busy=value;setBusy(value);$('#design-import-progress').textContent=message;for(const control of dialog.querySelectorAll('button,input,select'))control.disabled=value;$('#design-import-apply').disabled=value||!plan;page.disabled=value||!file.files[0]?.name.toLowerCase().endsWith('.pdf');}
  function resetReview(){plan=null;$('#design-import-review').hidden=true;$('#design-import-apply').disabled=true;$('#design-import-error').hidden=true;}
  function showError(error){$('#design-import-error').textContent=error.message;$('#design-import-error').hidden=false;}
  function close(){if(!busy)dialog.close();}
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.querySelectorAll('[data-import-close]').forEach(b=>b.addEventListener('click',close));
  for(const input of [file,page,fit])input.addEventListener('change',()=>{resetReview();if(input===file){page.value='1';page.max='1000';}working(false);});
  $('#design-import-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!event.currentTarget.reportValidity())return;
    resetReview();working(true,'Die Datei wird geprüft. Dein gespeichertes Design bleibt bis zur Übernahme erhalten.');
    try{
      const source=file.files[0];if(!source||source.size>15*1024*1024)throw Error('Bitte eine SVG- oder PDF-Datei mit höchstens 15 MB auswählen.');
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Datei konnte nicht gelesen werden.'));reader.readAsDataURL(source);});
      plan=await api(`/api/workshop/products/${target.productId}/design-import/preview`,{method:'POST',body:{name:source.name,bytes:data,page:Number(page.value),fit:fit.value,designId:target.designId,expectedRevision:target.revision}});
      const a=plan.asset,p=plan.placement;
      page.max=String(a.pageCount);
      $('#design-import-review').innerHTML=`<div class="import-review-grid"><div class="import-preview-board"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 200" role="img" aria-label="Vorschau auf der Acrylglasfläche"><rect x=".25" y=".25" width="149.5" height="199.5" rx="2" fill="none" stroke="#aebbb5" stroke-width=".5"/><image href="/api/workshop/design-assets/${a.assetId}/preview.svg" x="${p.x-p.widthMm/2}" y="${p.y-p.heightMm/2}" width="${p.widthMm}" height="${p.heightMm}" preserveAspectRatio="none"/><path d="M0 193H150" stroke="#576d63" stroke-width=".25" stroke-dasharray="1 1"/></svg></div><div><h3>${escape(source.name)}</h3><p>Seite ${a.page} von ${a.pageCount}</p><dl class="import-measures"><dt>Dateimaß</dt><dd>${mm(a.widthMm)} × ${mm(a.heightMm)} mm</dd><dt>Im kleinen Produkt</dt><dd>${mm(p.widthMm)} × ${mm(p.heightMm)} mm</dd><dt>Skalierung</dt><dd>${mm(p.scale*100)} % · proportional</dd></dl><p class="field-help">Das große Produkt skaliert dieselbe Gestaltung mit. Karomuster = transparent. Die gestrichelte Linie zeigt den verdeckten Bereich im massiven Sockel.</p><a href="/api/workshop/design-assets/${a.assetId}/original" download>Unverändertes Original herunterladen ↓</a></div></div><div class="import-notes"><strong>Bitte vor der Übernahme prüfen</strong><ul>${plan.warnings.map(w=>`<li>${escape(w)}</li>`).join('')}</ul><p>Der bisherige Stand bleibt im Verlauf wiederherstellbar.</p></div>`;
      $('#design-import-review').hidden=false;
    }catch(error){plan=null;showError(error);}finally{working(false);}
  });
  $('#design-import-apply').addEventListener('click',async()=>{
    if(!plan||busy)return;working(true,'Design wird ersetzt und als neuer Stand gespeichert.');
    try{
      const record=await api(`/api/workshop/products/${target.productId}/design-import/apply`,{method:'POST',body:{expectedRevision:plan.expectedRevision,designId:plan.designId,assetId:plan.asset.assetId,fit:plan.fit,originalName:plan.originalName,token:plan.token}});
      await onSaved(record);dialog.close();notify('Design ersetzt und gespeichert. Die Kundenansicht verwendet jetzt deine hochgeladene Vorlage.');
    }catch(error){showError(error);if(error.status===409)plan=null;}finally{working(false);}
  });
  return {open(designId){
    if(state.busy||!state.record||state.record.status==='archived')return;
    if(state.dirty){notify('Bitte zuerst deine Änderungen speichern. Danach kannst du ein Design ersetzen.','info');return;}
    const design=state.draft.config.profile.designs.find(d=>d.id===designId);if(!design)return;
    target={productId:state.record.id,revision:state.record.revision,designId};file.value='';page.value='1';page.max='1000';fit.value='visible';resetReview();working(false);
    $('#design-import-target').textContent=`Ersetzt „${design.name}“ in „${state.record.document.name}“.`;
    dialog.showModal();file.focus();
  }};
}
