// Binds an explicit immutable manufacturing revision, never silently follows latest.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installNativeProduction({state,api,markDirty}){
 const host=document.createElement('section');host.id='native-production';host.className='card';document.querySelector('#panel-production').prepend(host);
 let serial=0,choices=[],loading=false;
 const key=p=>p.id+':'+p.revision;
 function sync(){for(const el of host.querySelectorAll('select,button'))el.disabled=loading||state.busy||state.record?.status==='archived';}
 function summary(){
  const ref=state.draft?.productionProfile,p=choices.find(p=>ref&&key(p)===key(ref)),node=host.querySelector('[data-profile-summary]');if(!node)return;
  node.textContent=p?[p.document.method==='print'?'UV-Druck':'Gravur',p.document.output.dpi+' dpi',p.document.method==='print'?(p.document.output.profile==='mimaki'?'Mimaki · getrennte PDFs':'Roland · gemeinsame PDF'):p.document.output.mode,p.document.machine||'Maschine noch offen','Stand '+p.revision].join(' · '):ref?'Der gebundene Profilstand konnte nicht geladen werden. Bitte erneut laden.':'Ohne Zuordnung gelten die bisherigen Standardwerte. Eine Maschinenfreigabe ist damit nicht verbunden.';
 }
 async function render(){
  const ticket=++serial,record=state.record,draft=state.draft;if(!record||!draft?.config)return;
  loading=true;host.innerHTML='<h3>Fertigungsprofil</h3><p>Profilstände werden geladen …</p>';
  try{
   const data=await api('/api/workshop/production-profiles'),ref=draft.productionProfile;
   let pinned=ref?data.profiles.find(p=>key(p)===key(ref)):null;
   if(ref&&!pinned)pinned=await api('/api/workshop/production-profiles/'+encodeURIComponent(ref.id)+'?revision='+ref.revision);
   if(ticket!==serial||state.draft!==draft||state.record!==record)return;
   const profile=draft.config.profile,method=profile.processing?.profileId==='color-print'?'print':'engraving',thickness=profile.material.thicknessMm;
   const slate=profile.material.kind==='slate',materialId=slate?'slate':'acrylic-clear';
   choices=data.profiles.filter(p=>!p.document.archived&&p.document.method===method&&p.document.materialId===materialId&&p.document.thicknessMm===thickness);
   if(pinned&&!choices.some(p=>key(p)===key(pinned)))choices.unshift(pinned);
   host.innerHTML='<h3>Fertigungsprofil</h3><p>'+(slate?'Schiefer · ':'Acrylglas · klar · ')+esc(thickness)+' mm · '+(method==='print'?'UV-Druck':'Gravur')+'</p><label>Gesicherter Profilstand<select id="native-production-profile"><option value="">Standardwerte ohne Profilzuordnung</option>'+choices.map(p=>'<option value="'+esc(key(p))+'" '+(ref&&key(p)===key(ref)?'selected':'')+'>'+esc(p.document.name)+' · Stand '+p.revision+(p===pinned&&!data.profiles.some(c=>key(c)===key(p))?' · bisher gebunden':'')+'</option>').join('')+'</select></label><p data-profile-summary role="status"></p><p class="field-help">Die Zuordnung wird mit dem Produkt gespeichert. Bereits gesicherte Gestaltungen behalten ihren Profilstand. Ein neuerer Profilstand wird nur durch deine Auswahl übernommen; echte Druck-/Gravurfreigaben bleiben separat.</p><p><button type="button" data-profile-reload>Profile neu laden</button> <a href="/werkstatt/fertigung/" target="_blank" rel="noopener">Fertigungsprofile verwalten</a></p>';
   summary();
  }catch(e){if(ticket===serial&&state.draft===draft)host.innerHTML='<h3>Fertigungsprofil</h3><p role="alert">'+esc(e.message)+'</p><button type="button" data-profile-reload>Erneut laden</button>';}
  finally{if(ticket===serial){loading=false;sync();}}
 }
 host.addEventListener('click',e=>{if(e.target.closest('[data-profile-reload]')&&!state.busy)render();});
 host.addEventListener('change',e=>{if(e.target.id!=='native-production-profile'||loading||state.busy||state.record?.status==='archived')return;const p=choices.find(p=>key(p)===e.target.value);if(e.target.value&&!p)return;state.draft.productionProfile=p?{id:p.id,revision:p.revision}:null;summary();markDirty();});
 return {render,sync};
}
