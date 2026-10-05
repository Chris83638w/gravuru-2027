const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mm=n=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:3}).format(n)+' mm';
const holes=n=>n+' '+(n===1?'Ausschnitt':'Ausschnitte');
let token='',busy=false,selected='',selectedName='',serial=0;
function status(message,error=false){$('#contour-status').textContent=message;$('#contour-status').classList.toggle('error',error);$('#contour-status').setAttribute('role',error?'alert':'status');}
function controls(){ $('#create-form-product').disabled=busy||!selected;$('#contour-import').disabled=busy||!token||!$('#contour-file').files[0];$('#contour-file').disabled=busy;$('#contour-import').textContent=busy?'Kontur wird geprüft …':'Kontur prüfen und speichern';$('.contour-detail').setAttribute('aria-busy',String(busy));}
async function api(url,data){const r=await fetch(url,data?{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':token},body:JSON.stringify(data)}:{});const value=await r.json();if(!r.ok)throw Error(value.error?.message||'Die Anfrage ist fehlgeschlagen.');return value;}
function show(record){
  selected=record.id;selectedName=record.name;const g=record.geometry;
  $('#preview-title').textContent=record.name;$('#contour-preview').src='/api/workshop/contours/'+record.id+'/preview.svg';$('#contour-preview').alt=`Formkontur ${mm(g.widthMm)} × ${mm(g.heightMm)}, ${holes(g.holeCount)}`;
  $('#contour-empty').hidden=true;$('#contour-preview').hidden=false;$('#contour-details').hidden=false;$('#contour-badge').hidden=false;
  $('#contour-width').textContent=mm(g.widthMm);$('#contour-height').textContent=mm(g.heightMm);$('#contour-holes').textContent=g.holeCount;
  $('#contour-name').textContent=record.format.toUpperCase()+' · unverändertes Original';$('#contour-original').href='/api/workshop/contours/'+record.id+'/original';
  $('#contour-source-size').textContent=`Dateiseite: ${mm(g.pageWidthMm)} × ${mm(g.pageHeightMm)}. Bauteilmaß entlang der Pfadmitte, ohne Seitenränder.`;
  $('#contour-hash').textContent=record.sourceSha256;$('#contour-warnings').innerHTML=g.warnings.map(w=>'<li>'+esc(w)+'</li>').join('');
  for(const button of document.querySelectorAll('[data-contour]'))button.setAttribute('aria-pressed',String(button.dataset.contour===selected));
}
async function list(){const {contours}=await api('/api/workshop/contours');$('#contour-count').textContent=contours.length+' '+(contours.length===1?'Vorlage':'Vorlagen');$('#contour-list').innerHTML=contours.length?contours.map(c=>`<button type="button" class="contour-card" data-contour="${c.id}" aria-pressed="${c.id===selected}"><img src="/api/workshop/contours/${c.id}/preview.svg" alt="" loading="lazy"><span><strong>${esc(c.name)}</strong><small>${esc(mm(c.widthMm))} × ${esc(mm(c.heightMm))} · ${holes(c.holeCount)}</small></span><span class="contour-format">${esc(c.format.toUpperCase())}</span></button>`).join(''):'<p class="contour-no-files">Noch keine Formvorlagen gespeichert. Lade deine erste Kontur oben hoch.</p>';return contours;}
$('#contour-file').addEventListener('change',()=>{$('#contour-filename').textContent=$('#contour-file').files[0]?.name||'Noch keine Datei ausgewählt';status('');controls();});
$('#contour-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;const file=$('#contour-file').files[0];if(!file)return;
  if(!/\.(svg|pdf)$/i.test(file.name)||!file.size||file.size>15*1024*1024){status('Bitte eine SVG- oder PDF-Datei zwischen 1 Byte und 15 MB auswählen.',true);return;}
  serial++;busy=true;controls();status('Pfadmaße und Ausschnitte werden geprüft …');
  try{
    const bytes=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Die Datei konnte nicht gelesen werden.'));reader.readAsDataURL(file);});
    const record=await api('/api/workshop/contours',{name:file.name,bytes});show(record);
    status(record.alreadyExists?'Diese Originaldatei ist bereits gespeichert.':'Formkontur geprüft und gespeichert. Bestehende Produkte bleiben unverändert.');
    $('#contour-file').value='';$('#contour-filename').textContent='Noch keine Datei ausgewählt';
    try{await list();}catch{status('Kontur gespeichert; die Vorlagenliste konnte nicht aktualisiert werden. Bitte die Seite neu laden.',true);}
  }catch(e){status(e.message,true);}finally{busy=false;controls();}
});
$('#contour-list').addEventListener('click',async event=>{const button=event.target.closest('[data-contour]');if(!button||busy)return;const ticket=++serial;try{const record=await api('/api/workshop/contours/'+button.dataset.contour);if(ticket===serial)show(record);}catch(e){if(ticket===serial)status(e.message,true);}});
try{token=(await api('/api/workshop/session')).csrfToken;const rows=await list();if(rows[0])show(await api('/api/workshop/contours/'+rows[0].id));}catch(e){status(e.message,true);}finally{controls();}

$('#create-form-product').addEventListener('click',()=>{if(busy||!selected)return;$('#form-create-name').value=selectedName.replace(/\.(svg|pdf)$/i,'');$('#form-create-error').textContent='';$('#form-create-dialog').showModal();$('#form-create-name').focus();});
$('#form-create-cancel').addEventListener('click',()=>{if(!busy)$('#form-create-dialog').close();});
$('#form-create-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('#form-create-form').addEventListener('submit',async e=>{e.preventDefault();if(busy||!e.currentTarget.reportValidity())return;busy=true;controls();$('#form-create-submit').disabled=true;$('#form-create-cancel').disabled=true;try{const r=await api('/api/workshop/form-products',{name:$('#form-create-name').value.trim(),contourId:selected});location.href='/werkstatt/formprodukt/?configuration='+encodeURIComponent(r.id);}catch(e){$('#form-create-error').textContent=e.message;busy=false;controls();$('#form-create-submit').disabled=false;$('#form-create-cancel').disabled=false;}});
