const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let group=null,selected=null;const params=new URLSearchParams(location.search),id=params.get('group'),revision=params.get('revision');
async function api(path){const r=await fetch(path),b=await r.json();if(!r.ok)throw Error(b.error?.message||'Ausführung nicht verfügbar.');return b;}
function choose(value){selected=value;document.querySelectorAll('[data-variant]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.variant===value)));const v=group.variants.find(v=>v.id===value);$('#selected-label').textContent=v?.label||'Bitte eine verfügbare Ausführung auswählen.';$('#continue').disabled=!v?.available;}
try{
 if(!id||!revision)throw Error('Bitte die gespeicherte Ausführungsgruppe aus der Werkstatt öffnen.');
 group=await api('/api/workshop/variants/'+encodeURIComponent(id)+'/options?revision='+encodeURIComponent(revision));$('#title').textContent=group.document.name;
 if(group.variants.length===1)$('#intro').textContent='Deine Ausführung ist vorbereitet.';
 $('#choices').innerHTML=group.variants.map(v=>'<button class="variant-choice" data-variant="'+esc(v.id)+'" aria-pressed="false" '+(!v.available?'disabled':'')+'><img src="'+esc(v.previewUrl)+'" alt="'+esc(v.label)+'"><span class="choice-body"><strong>'+esc(v.label)+'</strong><span>'+esc(v.materialName)+' · '+v.material.thicknessMm+' mm</span><small>'+v.geometry.widthMm+' × '+v.geometry.heightMm+' mm · '+(v.method==='print'?'UV-Druck':'Gravur')+' · '+v.designs.length+' '+(v.designs.length===1?'Design':'Designs')+'</small><span class="price">'+new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v.basePriceCents/100)+'</span>'+(!v.available?'<small class="unavailable">Derzeit nicht verfügbar</small>':'')+'</span></button>').join('');
 $('#footer').hidden=false;choose(group.document.defaultVariantId);
}catch(e){$('#title').textContent='Auswahl nicht verfügbar';$('#notice').textContent=e.message;}
$('#choices').onclick=e=>{const b=e.target.closest('[data-variant]');if(b&&!b.disabled)choose(b.dataset.variant);};
$('#continue').onclick=async()=>{if(!selected)return;$('#continue').disabled=true;try{const result=await api('/api/workshop/variants/'+encodeURIComponent(id)+'/select?revision='+encodeURIComponent(revision)+'&variant='+encodeURIComponent(selected));location.assign(result.href);}catch(e){$('#notice').textContent=e.message;$('#continue').disabled=false;}};
