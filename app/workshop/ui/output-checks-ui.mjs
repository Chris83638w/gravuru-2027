const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(v));
export function installOutputChecks(api){
 const form=$('#check-form'),field=n=>form.elements.namedItem(n);
 let jobId=null,files=[],serial=0,saving=false,loading=false,requestId=crypto.randomUUID(),nextBefore=null,shown=0;
 const url=id=>'/api/workshop/export-jobs/'+id+'/checks';
 function message(value,error=false){$('#check-status').textContent=value;$('#check-status').classList.toggle('error',error);}
 function sync(){for(const element of form.elements)element.disabled=saving||loading||!files.length;$('#reload-checks').disabled=saving||loading;for(const el of document.querySelectorAll('#more-checks,#check-filter-format,#check-filter-stage'))el.disabled=saving||loading;field('machine').required=field('stage').value==='print';field('notes').required=field('result').value==='failed';const file=files.find(f=>f.format===field('format').value);$('#check-hash').textContent=file?'PDF SHA-256: '+file.sha256:'';}
 function history(value,append){
  shown=append?shown+value.checks.length:value.checks.length;nextBefore=value.nextBefore;$('#more-checks').hidden=!nextBefore;
  $('#check-count').textContent=value.total?shown+' von '+value.total+' passenden Vermerken angezeigt. Neuere Einträge über „Vermerke neu laden“ abrufen.':'Keine passenden Prüfvermerke.';
  if(!append)$('#check-history').replaceChildren();
  $('#check-history').insertAdjacentHTML('beforeend',value.checks.map(c=>'<li><strong>'+esc(c.result==='passed'?'Bestanden':'Fehler festgestellt')+' · '+esc(c.stage==='import'?'Dateiimport':'Probedruck / Probegravur')+'</strong><p>'+esc(c.software)+(c.machine?' · '+esc(c.machine):'')+'</p><p>'+esc(c.filename)+' · Eingetragen '+esc(date(c.createdAt))+'</p>'+(c.notes?'<p>'+esc(c.notes)+'</p>':'')+'<details><summary>Dateinachweis</summary><p class="plate-hash">SHA-256: '+esc(c.sha256)+'</p><p class="help">Manueller Prüfvermerk · keine Fertigungsfreigabe</p></details></li>').join(''));
 }
 async function load(append=false){
  if(!jobId||saving||append&&(loading||!nextBefore))return;const id=jobId,ticket=++serial;const query=new URLSearchParams({format:$('#check-filter-format').value,stage:$('#check-filter-stage').value});if(append)query.set('before',nextBefore);else{shown=0;nextBefore=null;$('#check-history').replaceChildren();$('#check-count').textContent='';$('#more-checks').hidden=true;}loading=true;sync();message('Prüfvermerke werden geladen …');
  try{const value=await api(url(id)+'?'+query);if(id!==jobId||ticket!==serial)return;const previous=field('format').value;files=value.files;field('format').innerHTML=files.map(f=>'<option value="'+esc(f.format)+'">'+esc(f.name)+'</option>').join('');if(files.some(f=>f.format===previous))field('format').value=previous;$('#check-machines').innerHTML=value.machines.map(m=>'<option value="'+esc(m)+'"></option>').join('');history(value,append);message('');}
  catch(e){if(id===jobId&&ticket===serial){files=[];message(e.message,true);}}
  finally{if(ticket===serial){loading=false;sync();}}
 }
 form.oninput=form.onchange=()=>{requestId=crypto.randomUUID();sync();};
 form.onsubmit=async e=>{
  e.preventDefault();if(saving||loading||!jobId)return;const file=files.find(f=>f.format===field('format').value);if(!file)return;
  const id=jobId,data={requestId,format:file.format,sha256:file.sha256,...Object.fromEntries(['stage','result','machine','software','notes'].map(k=>[k,field(k).value]))};
  saving=true;sync();message('Prüfvermerk wird gespeichert …');
  try{await api(url(id),data);if(id===jobId){requestId=crypto.randomUUID();field('notes').value='';field('result').value='';saving=false;await load();if(id===jobId)message('Prüfvermerk zur gewählten PDF gespeichert. Keine Fertigungsfreigabe erteilt.');}}
  catch(e){if(id===jobId)message(e.message,true);}
  finally{saving=false;if(id!==jobId&&jobId)await load();sync();}
 };
 $('#reload-checks').onclick=()=>load();
 $('#more-checks').onclick=()=>load(true);
 for(const el of document.querySelectorAll('#check-filter-format,#check-filter-stage'))el.onchange=()=>load();
 return {select(job){const next=job.status==='completed'?job.id:null;$('#output-checks').hidden=!next;if(next===jobId)return;jobId=next;++serial;files=[];nextBefore=null;shown=0;$('#more-checks').hidden=true;$('#check-filter-format').value='';$('#check-filter-stage').value='';loading=false;requestId=crypto.randomUUID();form.reset();$('#check-history').replaceChildren();$('#check-count').textContent='';message('');sync();if(jobId)void load();}};
}
