import {merchantRequest as fetch} from './merchant-request.mjs';
import {readBatchImport} from './batch-reader.mjs';
import {merchantImageAttribute} from './merchant-media.mjs';
const $=s=>document.querySelector(s),escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let prepared=null,csrf=null,busy=false,hasErrors=false,cancelled=false,formKeys=new Set();
let exportBusy=false;
let checkedInput=null;
const uploadCache=new WeakMap();
async function api(path,data){
  if(data&&!csrf)csrf=(await api('/api/workshop/session')).csrfToken;
  const res=await fetch(path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json','X-Gravuru-CSRF':csrf}:{},...(data?{body:JSON.stringify(data)}:{})});
  const body=await res.json();if(!res.ok)throw Error(body.error?.message||'Aktion fehlgeschlagen.');return body;
}
function status(message,error=false){$('#status').textContent=message;$('#status').style.color=error?'#a32828':'#183e35';}
function disabled(value){
  busy=value;for(const id of ['check','master','file','design-files','skip-errors','job-name','saved-jobs'])$('#'+id).disabled=value;
  $('#import').disabled=value||!prepared||hasErrors&&!$('#skip-errors').checked;
  $('#download-report').disabled=value||!checkedInput;
  $('#download-errors').disabled=value||!checkedInput||!hasErrors;
  $('#save-job').disabled=value||!checkedInput;
  $('#open-job').disabled=value||!$('#saved-jobs').value;
  $('#remove-job').disabled=value||!$('#saved-jobs').value;
}
function invalidate(){
  checkedInput=null;$('#save-job').disabled=true;$('#download-report').disabled=true;$('#download-errors').disabled=true;$('#report-status').textContent='';
  prepared=null;formKeys.clear();hasErrors=false;$('#skip-errors').checked=false;$('#partial-label').hidden=true;$('#review').hidden=true;$('#result').hidden=true;$('#import').disabled=true;$('#upload-report').textContent='';status('');
}
const base64=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Die Datei konnte nicht gelesen werden.'));reader.readAsDataURL(file);});
async function uploadDesigns(rows){
  const files=Array.from($('#design-files').files),byName=new Map();
  if(files.length>100)throw Error('Bitte höchstens 100 Design-Dateien auswählen.');
  for(const file of files){if(byName.has(file.name))throw Error('Der Dateiname „'+file.name+'“ ist doppelt. Bitte die Dateien eindeutig benennen.');byName.set(file.name,file);}
  const requests=new Map();
  for(const row of rows){
    const name=String(row.design_file||'').trim(),rawPage=String(row.design_page??'').trim()||'1';
    if(name&&/^[1-9][0-9]*$/.test(rawPage)&&Number(rawPage)<=1000)requests.set(JSON.stringify([name,Number(rawPage)]),{name,page:Number(rawPage)});
  }
  if(requests.size>100)throw Error('Bitte höchstens 100 verschiedene Datei-/Seitenzuordnungen verwenden.');
  const designFiles=[],issues=[];let index=0;
  for(const {name,page} of requests.values()){
    if(cancelled)throw Error('Prüfung abgebrochen. Es wurden keine Produkte angelegt.');
    status('Design '+(++index)+' von '+requests.size+' wird geprüft: '+name+' · Seite '+page);
    const file=byName.get(name);if(!file)continue;
    try{
      if(file.size>15*1024*1024)throw Error('Die Datei ist größer als 15 MB.');
      let pages=uploadCache.get(file);if(!pages){pages=new Map();uploadCache.set(file,pages);}
      let asset=pages.get(page);
      if(!asset){asset=await api('/api/workshop/design-assets/import',{name,bytes:await base64(file),page});pages.set(page,asset);}
      designFiles.push({name,page,assetId:asset.assetId});
    }catch(error){issues.push(name+', Seite '+page+': '+error.message);}
  }
  if(cancelled)throw Error('Prüfung abgebrochen. Es wurden keine Produkte angelegt.');
  const used=new Set(Array.from(requests.values(),r=>r.name)),unused=files.filter(f=>!used.has(f.name)).length;
  $('#upload-report').replaceChildren();
  for(const message of [designFiles.length+' Design-Seiten geprüft.'+(unused?' '+unused+' ausgewählte Dateien werden in der Tabelle nicht verwendet.':''),...issues]){
    const line=document.createElement('p');line.textContent=message;$('#upload-report').append(line);
  }
  return designFiles;
}
const money=cents=>Number.isInteger(cents)?new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100):'–';
function artworkCell(row){
  if(row.designAssignments?.length)return '<ul>'+row.designAssignments.map(d=>'<li>'+escape(d.name)+(d.designId===row.defaultDesignId?' · Standard':'')+'<small>Original und Kundenfelder bleiben erhalten</small></li>').join('')+'</ul>'+(row.artworks?.length?artworkCell({...row,designAssignments:[]}):'');
  if(row.artworks?.length)return '<strong>'+row.designCount+' Designs im Produkt</strong><small>Standard: '+escape(row.defaultDesignName)+'</small><details open><summary>'+row.artworks.length+' Designzuordnungen</summary><div class="batch-design-list">'+row.artworks.map(a=>'<div class="batch-design-item">'+artworkCell({artwork:a})+(a.default?'<strong>Standarddesign</strong>':'')+'</div>').join('')+'</div></details>';
  const a=row.artwork;if(!a)return row.status==='error'?'–':row.action==='update'?'Vorhandenes Design bleibt':'Masterdesign';
  const url='/api/workshop/design-assets/'+a.assetId+'/preview.svg',mm=v=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(v);
  return '<a href="'+url+'" target="_blank" rel="noopener" class="batch-preview"><img '+merchantImageAttribute(url)+' alt="Vorschau '+escape(a.name)+'" loading="lazy"></a><span>'+escape(a.name)+' · Seite '+a.page+'</span><small>'+escape(a.designName)+' · '+mm(a.placement.widthMm)+' × '+mm(a.placement.heightMm)+' mm</small><details><summary>Hinweise zur Vorlage</summary><ul>'+a.warnings.map(w=>'<li>'+escape(w)+'</li>').join('')+'</ul></details>';
}
$('#skip-errors').addEventListener('change',()=>disabled(busy));
for(const id of ['file','master','design-files'])$('#'+id).addEventListener('change',invalidate);
$('#cancel-check').addEventListener('click',()=>{cancelled=true;$('#cancel-check').disabled=true;status('Abbruch angefordert. Die laufende Datei wird noch abgeschlossen.');});
function renderPlan(data,plan){
    checkedInput=data;
    formKeys=new Set(plan.report.filter(r=>r.formProduct).map(r=>r.key));$('#review').hidden=false;
    const updates=plan.report.filter(r=>r.action==='update'&&r.status==='ready').length;
    const errors=plan.report.filter(r=>r.status==='error').length,existing=plan.report.filter(r=>r.status==='existing').length;
    hasErrors=errors>0;$('#partial-label').hidden=!hasErrors||!plan.token;
    $('#summary').textContent=plan.report.length+' Produkte · '+errors+' Fehler · '+existing+' bereits ausgeführt · '+updates+' Aktualisierungen';
    $('#rows').innerHTML=plan.report.map(row=>'<tr><td>'+row.row+'</td><td><strong>'+escape(row.name)+'</strong><small>'+escape(row.key)+'</small>'+(row.action==='update'?'<small>'+(row.status==='unchanged'?'Unverändert · ':'Aktualisieren · ')+escape(row.productId)+' · Stand '+row.expectedRevision+' → '+(row.status==='unchanged'?row.expectedRevision:row.expectedRevision+1)+'</small><small>Felder: '+escape(row.changes.join(', '))+'</small>':'')+ (row.formProduct?'<small>'+escape(row.material||'Material offen')+' · '+(row.method==='print'?'Druck':row.method==='engraving'?'Gravur':'Verfahren offen')+' · '+row.geometry.widthMm+' × '+row.geometry.heightMm+' mm</small>':'')+'</td><td>'+artworkCell(row)+'</td><td>'+money(row.formProduct?row.prices?.base:row.prices?.small)+'</td><td>'+money(row.prices?.large)+'</td><td>'+escape(row.message||(row.status==='existing'?'Bereits ausgeführt':row.status==='unchanged'?'Unverändert · wird übersprungen':row.action==='update'?'Aktualisierung bereit':'Neuanlage bereit'))+'</td></tr>').join('');
    for(const row of $('#rows').rows)Array.from(row.cells).forEach((cell,i)=>cell.dataset.label=['Datensatz','Produkt / Importschlüssel','Design','Grundpreis / klein','Acryl groß','Ergebnis'][i]);
    if(plan.token)prepared={...data,token:plan.token};
    status(plan.valid?(plan.token?'Prüfung abgeschlossen. Kontrolliere Neuanlagen und Aktualisierungen, bevor du die Tabelle anwendest.':'Alles unverändert. Keine Übernahme erforderlich.'):'Noch nichts geändert. Fehler korrigieren oder ausdrücklich nur gültige Datensätze anwenden.',!plan.valid);
}
$('#check').addEventListener('click',async()=>{
  if(busy)return;invalidate();disabled(true);cancelled=false;$('#cancel-check').hidden=false;$('#cancel-check').disabled=false;
  try{
    const option=$('#master').selectedOptions[0];
    const {rows,designRows}=await readBatchImport($('#file').files[0]);if(!option&&rows.some(r=>String(r.action||'create').trim()!=='update'&&!r.master_id))throw Error('Für neue Produkte eine Mastervorlage auswählen. Aktualisierungen benötigen keinen Master.');const designFiles=await uploadDesigns([...rows,...designRows]);
    const data={rows,designRows,masterId:option?.value,masterRevision:option?Number(option.dataset.revision):undefined,designFiles};
    const plan=await api('/api/workshop/batch/plan',data);if(cancelled)throw Error('Prüfung abgebrochen. Es wurden keine Produkte angelegt.');
    renderPlan(data,plan);$('#job-name').value=$('#file').files[0]?.name||'Produktserie';
  }catch(error){status(error.message,true);}finally{$('#cancel-check').hidden=true;disabled(false);}
});
$('#import').addEventListener('click',async()=>{
  if(busy||!prepared||hasErrors&&!$('#skip-errors').checked)return;disabled(true);
  try{
    const result=await api('/api/workshop/batch/commit',{...prepared,skipErrors:$('#skip-errors').checked});
    $('#result').hidden=false;
    $('#result-list').innerHTML=result.products.map(item=>'<p><a href="'+(formKeys.has(item.key)?'/werkstatt/formprodukt/':'/werkstatt/')+'?configuration='+encodeURIComponent(item.id)+'">'+escape(item.key)+'</a> · <code>'+escape(item.id)+'</code> · '+(item.created?'Neu angelegt':item.updated?'Aktualisiert · Stand '+item.revision:'Bereits ausgeführt')+'</p>').join('');
    const saved=new Map(result.products.map(item=>[item.key,item]));
    for(const row of $('#rows').rows){const item=saved.get(row.cells[1]?.querySelector('small')?.textContent);if(item)row.cells[5].textContent=item.created?'Neu gespeichert':item.updated?'Aktualisiert · Stand '+item.revision:'Bereits ausgeführt';}
    $('#summary').textContent=result.products.length+' Konfigurationen gespeichert · '+(result.errors?.length||0)+' Fehler';
    hasErrors=(result.errors?.length||0)>0;
    status(result.products.filter(p=>p.created).length+' neue Konfigurationen · '+result.products.filter(p=>p.updated).length+' Aktualisierungen gespeichert. '+(result.errors?.length||0)+' fehlerhafte Datensätze bleiben zur Korrektur offen.');prepared=null;
    try{setupDesignExport((await api('/api/workshop/products')).products);$('#export-status').textContent='Produktauswahl nach der Übernahme aktualisiert.';}
    catch(error){$('#export-status').textContent='Die Tabelle wurde gespeichert. Die Produktauswahl konnte nicht aktualisiert werden: '+error.message+' Bitte die Seite neu laden.';}
  }catch(error){status(error.message,true);}finally{disabled(false);}
});
try{
  const {products}=await api('/api/workshop/products');
  setupDesignExport(products);
  $('#master').innerHTML=products.filter(p=>p.kind==='master'&&p.status!=='archived').map(p=>'<option value="'+escape(p.id)+'" data-revision="'+p.revision+'">'+escape(p.name)+(p.overview?.formProduct?' · Freie Form':' · Acrylvorlage')+' · Stand '+p.revision+'</option>').join('');
  if(!$('#master').options.length)status('Für Neuanlagen zuerst einen Master anlegen. Bestehende Produkte können mit action=update auch ohne Master aktualisiert werden.',true);
}catch(error){status(error.message,true);}


function selectedProducts(){return [...document.querySelectorAll('#export-products input:checked')].map(el=>el.value);}
function countExport(){const count=selectedProducts().length;$('#export-count').textContent=count+' Produkte ausgewählt · bis zu 100 möglich';$('#export-designs').disabled=exportBusy||count<1||count>100;}
function setupDesignExport(products){
 const selected=new Set(selectedProducts());
 const forms=products.filter(p=>p.kind==='product'&&p.status!=='archived'&&p.overview?.formProduct);
 $('#export-products').innerHTML=forms.length?forms.map(p=>'<label class="export-choice"><input type="checkbox" value="'+escape(p.id)+'"'+(selected.has(p.id)?' checked':'')+'><span><strong>'+escape(p.name)+'</strong><small>Stand '+p.revision+'</small></span></label>').join(''):'<p>Noch keine aktiven Formprodukte vorhanden.</p>';
 $('#export-products').onchange=countExport;countExport();
}
$('#export-select-all').onclick=()=>{const inputs=[...document.querySelectorAll('#export-products input')],check=inputs.some(i=>!i.checked);inputs.forEach(i=>i.checked=check);countExport();};
$('#export-designs').onclick=async()=>{if(exportBusy)return;exportBusy=true;countExport();$('#export-status').textContent='Excel-Datei wird erstellt …';try{
 if(!csrf)csrf=(await api('/api/workshop/session')).csrfToken;
 const res=await fetch('/api/workshop/batch/export',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrf},body:JSON.stringify({productIds:selectedProducts()})});
 if(!res.ok)throw Error((await res.json()).error?.message||'Export fehlgeschlagen.');
 const href=URL.createObjectURL(await res.blob()),a=document.createElement('a');a.href=href;a.download='Gravuru-Designzuordnungen.xlsx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);$('#export-status').textContent='Datei bereit. Bearbeiten und unten zur Prüfung auswählen. Es wurden keine Produkte verändert.';
 }catch(e){$('#export-status').textContent=e.message;}finally{exportBusy=false;countExport();}};


for(const [id,mode] of [['download-report','report'],['download-errors','errors']])$('#'+id).addEventListener('click',async()=>{
  if(busy||!checkedInput)return;
  disabled(true);$('#report-status').textContent='Aktueller Importstand wird geprüft und als Excel-Datei vorbereitet …';
  try{
    if(!csrf)csrf=(await api('/api/workshop/session')).csrfToken;
    const res=await fetch('/api/workshop/batch/report',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrf},body:JSON.stringify({...checkedInput,mode})});
    if(!res.ok)throw Error((await res.json()).error?.message||'Bericht konnte nicht erstellt werden.');
    if(!(res.headers.get('content-type')||'').startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))throw Error('Keine gültige Excel-Antwort erhalten.');
    const href=URL.createObjectURL(await res.blob()),a=document.createElement('a');a.href=href;a.download=mode==='errors'?'Gravuru-Fehlerkorrektur.xlsx':'Gravuru-Pruefbericht.xlsx';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
    $('#report-status').textContent=mode==='errors'?'Korrekturdatei bereit. Fehler im Blatt Produkte oder Designs korrigieren und erneut prüfen. Benötigte SVG-/PDF-Dateien zusätzlich auswählen.':'Prüfbericht bereit. Der Download verändert keine Produkte.';
  }catch(error){$('#report-status').textContent=error.message;}finally{disabled(false);}
});


async function refreshJobs(selected=$('#saved-jobs').value){
  const {jobs}=await api('/api/workshop/batch/jobs');
  $('#saved-jobs').innerHTML='<option value="">Gespeicherte Prüfung auswählen</option>'+jobs.map(job=>'<option value="'+escape(job.id)+'">'+escape(job.name)+' · '+job.rowCount+' Produkte · '+escape(new Date(job.createdAt).toLocaleString('de-DE'))+'</option>').join('');
  if(jobs.some(job=>job.id===selected))$('#saved-jobs').value=selected;
  disabled(busy);
}
$('#saved-jobs').addEventListener('change',()=>disabled(busy));
$('#save-job').addEventListener('click',async()=>{
  if(busy||!checkedInput)return;disabled(true);
  try{
    const job=await api('/api/workshop/batch/jobs',{name:$('#job-name').value,input:checkedInput});
    await refreshJobs(job.id);$('#job-status').textContent=job.existing?'Diese Importprüfung ist bereits gespeichert.':'Importprüfung privat gespeichert. Nach dem Öffnen wird erneut geprüft; Produkte wurden dadurch nicht angelegt.';
  }catch(error){$('#job-status').textContent=error.message;}finally{disabled(false);}
});
$('#open-job').addEventListener('click',async()=>{
  const id=$('#saved-jobs').value;if(busy||!id)return;disabled(true);
  try{
    const job=await api('/api/workshop/batch/jobs/'+encodeURIComponent(id));
    invalidate();$('#file').value='';$('#design-files').value='';renderPlan(job.input,job.plan);$('#job-name').value=job.name;
    $('#job-status').textContent='Gespeicherte Prüfung geöffnet und aktuell geprüft. Bereits ausgeführte Zeilen werden erkannt. Verknüpfte Design-Dateien kommen aus dieser privaten Ablage.';
  }catch(error){$('#job-status').textContent=error.message;}finally{disabled(false);}
});
$('#remove-job').addEventListener('click',async()=>{
  const id=$('#saved-jobs').value;if(busy||!id||!window.confirm('Nur diese gespeicherte Importprüfung entfernen? Produkte, Designs und bereits ausgeführte Importe bleiben erhalten.'))return;disabled(true);
  try{await api('/api/workshop/batch/jobs/'+encodeURIComponent(id)+'/remove',{});await refreshJobs('');$('#job-status').textContent='Gespeicherte Importprüfung entfernt. Produkte und Designs bleiben erhalten.';}
  catch(error){$('#job-status').textContent=error.message;}finally{disabled(false);}
});
try{await refreshJobs();}catch(error){$('#job-status').textContent='Gespeicherte Prüfungen konnten nicht geladen werden: '+error.message;}
