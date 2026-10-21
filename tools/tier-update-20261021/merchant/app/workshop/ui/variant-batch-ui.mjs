import {merchantRequest as fetch} from './merchant-request.mjs';
import {readVariantImport} from './variant-batch-reader.mjs';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let csrf='',prepared=null,checkedInput=null,busy=false,hasErrors=false;
function notice(message,error=false){$('#notice').textContent=message;$('#notice').classList.toggle('error',error);}
function lock(value){
 busy=value;for(const id of ['file','check','skip-errors','job-name','saved-jobs'])$('#'+id).disabled=value;
 $('#apply').disabled=value||!prepared||(hasErrors&&!$('#skip-errors').checked);
 for(const id of ['save-job','download-report'])$('#'+id).disabled=value||!checkedInput;
 $('#download-errors').disabled=value||!checkedInput||!hasErrors;
 for(const id of ['open-job','remove-job'])$('#'+id).disabled=value||!$('#saved-jobs').value;
}
async function api(route,data){
 if(data&&!csrf)csrf=(await(await fetch('/api/workshop/session')).json()).csrfToken;
 const r=await fetch('/api/workshop/variants/batch/'+route,{method:data?'POST':'GET',...(data?{headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrf},body:JSON.stringify(data)}:{})}),b=await r.json();
 if(!r.ok)throw Error(b.error?.message||'Aktion fehlgeschlagen.');return b;
}
function invalidate(){checkedInput=null;$('#report-status').textContent='';prepared=null;hasErrors=false;$('#skip-errors').checked=false;$('#review').hidden=true;$('#result').hidden=true;$('#partial').hidden=true;lock(false);notice('');}
$('#file').onchange=invalidate;$('#skip-errors').onchange=()=>lock(busy);
function renderPlan(input,plan){
 checkedInput=input;prepared=null;
 const errors=plan.report.filter(r=>r.status==='error').length;
 hasErrors=errors>0;$('#review').hidden=false;$('#partial').hidden=!hasErrors||!plan.token;
 $('#summary').textContent=plan.report.length+' Gruppen · '+errors+' Fehler · '+plan.report.filter(r=>r.status==='existing').length+' bereits ausgeführt';
 $('#rows').innerHTML=plan.report.map(r=>'<article class="variant-import-row"><h3>'+esc(r.name||r.key)+'</h3><p class="help">Datensatz '+r.row+' · '+esc(r.key)+'</p>'+(r.status==='error'?'<p class="unavailable">'+esc(r.message)+'</p>':'<p>'+(r.status==='existing'?'Bereits ausgeführt':r.status==='unchanged'?'Unverändert · wird übersprungen':r.action==='update'?'Aktualisieren · Gruppenstand '+r.expectedRevision+' → '+(r.expectedRevision+1):'Neue Gruppe')+' · '+r.variants.length+' Ausführungen</p><details><summary>Ausführungen und gespeicherte Produktstände prüfen</summary><ul>'+r.variants.map(v=>'<li><strong>'+esc(v.label)+(v.id===r.defaultVariantId?' · Standard':'')+'</strong><small>'+esc(v.id)+(r.changedIds.includes(v.id)?' · Zugeordnet':' · Unverändert')+'</small><a href="/werkstatt/formprodukt/?configuration='+encodeURIComponent(v.productId)+'" target="_blank" rel="noopener">'+esc(v.productId)+'</a> · Stand '+v.productRevision+' · <a href="/api/workshop/products/'+encodeURIComponent(v.productId)+'/preview.svg?revision='+v.productRevision+'" target="_blank" rel="noopener">Genau diese Vorschau</a></li>').join('')+'</ul></details>')+'</article>').join('');
 if(plan.token)prepared={...input,token:plan.token};notice(plan.valid?(plan.token?'Prüfung bestanden. Noch keine Gruppe verändert.':'Alles unverändert. Keine Übernahme erforderlich.'):'Fehler korrigieren oder ausdrücklich nur gültige Gruppen übernehmen.',!plan.valid);
}
$('#check').onclick=async()=>{if(busy)return;invalidate();lock(true);try{
 const input=await readVariantImport($('#file').files[0]),plan=await api('plan',input);
 renderPlan(input,plan);$('#job-name').value=$('#file').files[0]?.name||'Ausführungsserie';
}catch(e){notice(e.message,true);}finally{lock(false);}};
$('#apply').onclick=async()=>{if(busy||!prepared||hasErrors&&!$('#skip-errors').checked)return;lock(true);try{const result=await api('commit',{...prepared,skipErrors:$('#skip-errors').checked});$('#result').hidden=false;$('#results').innerHTML=result.groups.map(g=>'<p><a href="/werkstatt/ausfuehrungen/?group='+g.id+'">'+esc(g.key)+'</a> · '+(g.created?'Neu angelegt':g.updated?'Aktualisiert · Stand '+g.revision:'Bereits ausgeführt')+'</p>').join('');notice(result.groups.filter(g=>g.created).length+' neue Gruppen · '+result.groups.filter(g=>g.updated).length+' Aktualisierungen · '+result.errors.length+' Fehler offen.');prepared=null;hasErrors=result.errors.length>0;await loadExportGroups();}catch(e){notice(e.message,true);}finally{lock(false);}};

let exporting=false;
const selections=()=>[...document.querySelectorAll('#export-groups input:checked')].map(el=>el.value);
function exportCount(){const n=selections().length;$('#export-count').textContent=n+' Gruppen ausgewählt · bis zu 100 möglich';$('#export').disabled=exporting||n>100;}
async function loadExportGroups(){
 try{const r=await fetch('/api/workshop/variants');if(!r.ok)throw Error('Gruppen konnten nicht geladen werden.');const {groups}=await r.json(),active=groups.filter(g=>!g.document.archived);
 $('#export-groups').innerHTML=active.length?active.map(g=>'<label class="check"><input type="checkbox" value="'+esc(g.id)+'"><span><strong>'+esc(g.document.name)+'</strong><small>Stand '+g.revision+' · '+g.document.variants.length+' Ausführungen</small></span></label>').join(''):'<p class="help">Noch keine aktive Gruppe vorhanden. Du kannst die Produktliste bereits herunterladen.</p>';
 $('#export-groups').onchange=exportCount;exportCount();
 }catch(e){$('#export-notice').textContent=e.message;$('#export').disabled=true;}
}
$('#export-all').onclick=()=>{const inputs=[...document.querySelectorAll('#export-groups input')],select=inputs.some(i=>!i.checked);inputs.forEach(i=>i.checked=select);exportCount();};
$('#export').onclick=async()=>{if(exporting)return;exporting=true;exportCount();$('#export-notice').textContent='Excel-Datei wird vorbereitet …';try{
 if(!csrf)csrf=(await(await fetch('/api/workshop/session')).json()).csrfToken;
 const r=await fetch('/api/workshop/variants/batch/export',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrf},body:JSON.stringify({groupIds:selections()})});
 if(!r.ok)throw Error((await r.json()).error?.message||'Download fehlgeschlagen.');
 const href=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=href;a.download='Gravuru-Ausfuehrungen-Bestand.xlsx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
 $('#export-notice').textContent='Datei bereit. Änderungen in Gruppen und Varianten eintragen, dann unten prüfen. Der Bestand wurde nicht verändert.';
 }catch(e){$('#export-notice').textContent=e.message;}finally{exporting=false;exportCount();}};
loadExportGroups();


async function refreshJobs(selected=$('#saved-jobs').value){
 const {jobs}=await api('jobs');
 $('#saved-jobs').innerHTML='<option value="">Gespeicherte Prüfung auswählen</option>'+jobs.map(job=>'<option value="'+esc(job.id)+'">'+esc(job.name)+' · '+job.rowCount+' Gruppen · '+esc(new Date(job.createdAt).toLocaleString('de-DE'))+'</option>').join('');
 if(jobs.some(job=>job.id===selected))$('#saved-jobs').value=selected;lock(busy);
}
$('#saved-jobs').onchange=()=>lock(busy);
$('#save-job').onclick=async()=>{if(busy||!checkedInput)return;lock(true);try{
 const job=await api('jobs',{name:$('#job-name').value,input:checkedInput});await refreshJobs(job.id);
 $('#job-status').textContent=job.existing?'Diese Prüfung ist bereits gespeichert.':'Ausführungsprüfung privat gespeichert. Gruppen und Produkte wurden dadurch nicht verändert.';
}catch(e){$('#job-status').textContent=e.message;}finally{lock(false);}};
$('#open-job').onclick=async()=>{const id=$('#saved-jobs').value;if(busy||!id)return;prepared=null;lock(true);try{
 const job=await api('jobs/'+encodeURIComponent(id));invalidate();lock(true);$('#file').value='';renderPlan(job.input,job.plan);$('#job-name').value=job.name;
 $('#job-status').textContent='Gespeicherte Zuordnungen frisch geprüft. Bereits ausgeführte Gruppen und zwischenzeitliche Änderungen werden berücksichtigt.';
}catch(e){$('#job-status').textContent=e.message+' Die bisherigen Eingaben bleiben erhalten. Vor der Übernahme die gespeicherte Prüfung erneut öffnen oder die Tabelle erneut prüfen.';notice('Öffnen fehlgeschlagen. Übernahme bis zur erneuten Prüfung gesperrt.',true);}finally{lock(false);}};
$('#remove-job').onclick=async()=>{const id=$('#saved-jobs').value;if(busy||!id||!window.confirm('Nur diese gespeicherte Prüfung entfernen? Ausführungsgruppen, Produkte und Importhistorie bleiben erhalten.'))return;lock(true);try{
 await api('jobs/'+encodeURIComponent(id)+'/remove',{});await refreshJobs('');$('#job-status').textContent='Prüfung entfernt. Gruppen und Produkte bleiben erhalten.';
}catch(e){$('#job-status').textContent=e.message;}finally{lock(false);}};
for(const [id,mode] of [['download-report','report'],['download-errors','errors']])$('#'+id).onclick=async()=>{
 if(busy||!checkedInput)return;lock(true);$('#report-status').textContent='Zuordnungen werden aktuell geprüft und als Excel-Datei vorbereitet …';
 try{
  if(!csrf)csrf=(await(await fetch('/api/workshop/session')).json()).csrfToken;
  const r=await fetch('/api/workshop/variants/batch/report',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrf},body:JSON.stringify({...checkedInput,mode})});
  if(!r.ok)throw Error((await r.json()).error?.message||'Bericht konnte nicht erstellt werden.');
  if(!(r.headers.get('content-type')||'').startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))throw Error('Keine gültige Excel-Antwort erhalten.');
  const href=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=href;a.download=mode==='errors'?'Gravuru-Ausfuehrungen-Korrektur.xlsx':'Gravuru-Ausfuehrungen-Pruefbericht.xlsx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
  $('#report-status').textContent=mode==='errors'?'Korrekturdatei bereit. Betroffene Gruppen und Varianten korrigieren, dann erneut prüfen.':'Prüfbericht bereit. Gruppen und Produkte bleiben unverändert.';
 }catch(e){$('#report-status').textContent=e.message;}finally{lock(false);}
};
refreshJobs().catch(e=>$('#job-status').textContent='Gespeicherte Prüfungen nicht verfügbar: '+e.message);
