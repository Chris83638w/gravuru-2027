const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let group=null,selected=null,choices={};const params=new URLSearchParams(location.search),id=params.get('group'),revision=params.get('revision');
async function api(path){const r=await fetch(path),b=await r.json();if(!r.ok)throw Error(b.error?.message||'Ausführung nicht verfügbar.');return b;}
function choose(value){selected=value;document.querySelectorAll('[data-variant]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.variant===value)));const v=group.variants.find(v=>v.id===value);$('#selected-label').textContent=v?.label||'Bitte eine verfügbare Ausführung auswählen.';$('#continue').disabled=!v?.available;}
function card(v){return '<button class="variant-choice" data-variant="'+esc(v.id)+'" aria-pressed="false" '+(!v.available?'disabled':'')+'><img src="'+esc(v.previewUrl)+'" alt="'+esc(v.label)+'"><span class="choice-body"><strong>'+esc(v.materialName)+' · '+v.material.thicknessMm+' mm</strong><small>'+v.geometry.widthMm.toLocaleString('de-DE',{maximumFractionDigits:1})+' × '+v.geometry.heightMm.toLocaleString('de-DE',{maximumFractionDigits:1})+' mm · '+v.designs.length+' Designs</small><span class="price">'+new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v.basePriceCents/100)+'</span></span></button>';}
function renderAxes(){
 const axes=group.document.axes;let pool=group.variants.filter(v=>v.available);
 $('#series-options').innerHTML=axes.map(axis=>{
  const values=axis.values.filter(value=>pool.some(v=>v.choices[axis.id]===value.id));
  if(!values.some(v=>v.id===choices[axis.id]))choices[axis.id]=values[0]?.id;
  pool=pool.filter(v=>v.choices[axis.id]===choices[axis.id]);
  return '<label>'+esc(axis.label)+'<select data-axis="'+esc(axis.id)+'">'+values.map(value=>'<option value="'+esc(value.id)+'" '+(choices[axis.id]===value.id?'selected':'')+'>'+esc(value.label)+'</option>').join('')+'</select></label>';
 }).join('');
 $('#choices').innerHTML=pool.map(card).join('');choose(pool[0]?.id);
}
try{
 if(!id||!revision)throw Error('Bitte die gespeicherte Ausführungsgruppe aus der Werkstatt öffnen.');
 group=await api('/api/workshop/variants/'+encodeURIComponent(id)+'/options?revision='+encodeURIComponent(revision));$('#title').textContent=group.document.name;
 if(group.document.axes){
  const initial=group.variants.find(v=>v.id===(params.get('variant')||group.document.defaultVariantId))||group.variants[0];choices={...initial.choices};
  $('#intro').textContent='Wähle Form, Größe, Farbe und Befestigung. Schwarz und Anthrazit kosten gleich viel.';
  const controls=document.createElement('div');controls.id='series-options';controls.className='series-options';$('#choices').before(controls);
  controls.onchange=e=>{if(e.target.dataset.axis){choices[e.target.dataset.axis]=e.target.value;renderAxes();}};renderAxes();
 }else{$('#choices').innerHTML=group.variants.map(card).join('');choose(group.document.defaultVariantId);}
 $('#footer').hidden=false;
 // This isolated series installation intentionally keeps price approval visible.
 if(group.document.name==='Acryl-Türschilder · 3 mm')$('#notice').textContent='Lokale Vorschau';
}catch(e){$('#title').textContent='Auswahl nicht verfügbar';$('#notice').textContent=e.message;}
$('#choices').onclick=e=>{const b=e.target.closest('[data-variant]');if(b&&!b.disabled)choose(b.dataset.variant);};
$('#continue').onclick=async()=>{if(!selected)return;$('#continue').disabled=true;try{const result=await api('/api/workshop/variants/'+encodeURIComponent(id)+'/select?revision='+encodeURIComponent(revision)+'&variant='+encodeURIComponent(selected));location.assign(result.href);}catch(e){$('#notice').textContent=e.message;$('#continue').disabled=false;}};
