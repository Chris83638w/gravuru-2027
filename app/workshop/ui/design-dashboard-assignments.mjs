import {designKey} from './design-dashboard-review.mjs';
const $=selector=>document.querySelector(selector);
const node=(tag,text,cls)=>{const item=document.createElement(tag);if(text!==undefined)item.textContent=text;if(cls)item.className=cls;return item;};
const button=(text,fn)=>{const item=node('button',text);item.type='button';item.addEventListener('click',fn);return item;};
export const assignmentChunks=(rows,size=500)=>Array.from({length:Math.ceil(rows.length/size)},(_,index)=>rows.slice(index*size,(index+1)*size));
const identity=row=>({reihe:row.lieferform2?.reihe??row.reihe,id:row.id});
const resultKey=row=>JSON.stringify([row.reihe,row.id]);

// Assignment is deliberately independent of the preview/release selection.
export function installDesignAssignments({request,getContext,onChanged=async()=>{},onBusy=()=>{}}){
 let active=false,selected=new Set(),kind=null,chosen=[],plans=[],token=0,controller=null,preparing=false,writing=false;
 const familyIds=new Set(),themeAdd=new Set(),themeRemove=new Set();
 const dialog=$('#assignment-dialog'),message=text=>{$('#assignment-status').textContent=text;};
 const eligible=()=>getContext().rows.filter(row=>row.lieferform2);
 const selectedRows=()=>eligible().filter(row=>selected.has(designKey(row)));
 const controls=()=>dialog.querySelectorAll('input, button');
 function resetPlan(){token++;controller?.abort();controller=null;plans=[];preparing=false;$('#assignment-plan').replaceChildren();$('#assignment-apply').disabled=true;$('#assignment-prepare').disabled=!chosen.length;}
 function change(){resetPlan();$('#assignment-results').replaceChildren();message(chosen.length+' Designs'+(chosen.length>500?' · '+assignmentChunks(chosen).length+' Teilpakete mit höchstens 500 Designs':'')+'. Auswahl geändert. Zuordnung zuerst prüfen.');}
 function sync(){
  const rows=eligible(),keys=new Set(rows.map(designKey));selected=new Set([...selected].filter(key=>keys.has(key)));
  for(const input of document.querySelectorAll('[data-assignment-key]')){input.checked=selected.has(input.dataset.assignmentKey);input.dataset.blocked=input.dataset.assignmentUnavailable;input.disabled=getContext().busy||input.dataset.assignmentUnavailable==='true';}
  const host=$('#assignment-toolbar');host.hidden=!active;if(!active)return;
  host.replaceChildren();const all=button('Alle '+rows.length+' gefilterten Designs auswählen',()=>{for(const row of rows)selected.add(designKey(row));sync();});all.id='assignment-select-all';all.dataset.blocked=String(!rows.length);all.disabled=!rows.length||getContext().busy;
  const clear=button('Auswahl aufheben',()=>{selected.clear();sync();});clear.id='assignment-clear';clear.dataset.blocked=String(!selected.size);clear.disabled=!selected.size||getContext().busy;
  const families=button('Materialien hinzufügen',()=>open('families')),themes=button('Unterkategorien (Themen) setzen',()=>open('themes'));families.id='assignment-families';themes.id='assignment-themes';families.dataset.blocked=themes.dataset.blocked=String(!selected.size);families.disabled=themes.disabled=!selected.size||getContext().busy;
  const count=node('p',selected.size+' Designs zur Zuordnung ausgewählt');count.id='assignment-count';host.append(count,all,clear,families,themes);
 }
 function selection(row){
  const label=node('label',undefined,'design-selection assignment-selection'),input=node('input');input.type='checkbox';input.dataset.assignmentKey=designKey(row);input.dataset.assignmentUnavailable=String(!row.lieferform2);input.dataset.blocked=String(!row.lieferform2);input.checked=selected.has(designKey(row));input.disabled=!row.lieferform2||getContext().busy;input.setAttribute('aria-label',row.id+' zur Zuordnung auswählen');
  input.addEventListener('change',()=>{if(!row.lieferform2||getContext().busy)return;if(input.checked)selected.add(designKey(row));else selected.delete(designKey(row));sync();});label.append(input,node('span',row.lieferform2?'Zuordnen':'Keine Lieferform 2'));return label;
 }
 function renderFamilies(){
  const host=$('#assignment-options'),groups=new Map();
  for(const family of getContext().families??[]){const lines=family.linien?.length?family.linien:[{id:'unassigned',name:'Ohne Linienzuordnung'}];for(const line of lines){if(!groups.has(line.id))groups.set(line.id,{name:line.name,families:[]});groups.get(line.id).families.push(family);}}
  for(const group of groups.values()){
   const field=node('fieldset');field.append(node('legend',group.name));
   for(const family of group.families){const label=node('label',undefined,'assignment-option'),input=node('input');input.type='checkbox';input.dataset.assignmentFamily=family.id;
    input.addEventListener('change',()=>{if(input.checked)familyIds.add(family.id);else familyIds.delete(family.id);for(const other of host.querySelectorAll('[data-assignment-family]'))if(other.dataset.assignmentFamily===family.id)other.checked=input.checked;change();});
    label.append(input,node('span',[family.name,family.material,family.process].filter(Boolean).join(' · ')));field.append(label);
    const readiness=family.readiness;
    if(readiness?.geometry?.complete===false)field.append(node('p','Geometrie / Stammdaten offen: '+readiness.geometry.issues.join(' · ')+' – Zielvorschau und Designfreigabe benötigen eine vollständige Prüfung.','notice'));
    if(readiness?.prices?.complete===false)field.append(node('p','Preise offen: '+readiness.prices.issues.join(' · ')+' – Import und Shop-Abgleich gesperrt, Designfreigabe möglich','notice'));
    if(readiness?.complete===false&&!readiness.geometry&&!readiness.prices)field.append(node('p','Familie unvollständig: '+(readiness.issues??[]).join(' · '),'notice'));
   }host.append(field);
  }
  if(!groups.size)host.append(node('p','Keine vorhandenen Familien verfügbar.','notice'));
 }
 function renderThemes(){
  const host=$('#assignment-options');host.append(node('p','Nur die markierten Änderungen werden angewendet. Andere Themen bleiben erhalten.','muted'));
  for(const theme of getContext().themes??[]){const field=node('fieldset');field.append(node('legend',theme.name));for(const [action,set,other]of [['add',themeAdd,themeRemove],['remove',themeRemove,themeAdd]]){
   const label=node('label',undefined,'assignment-option'),input=node('input');input.type='checkbox';input.dataset.assignmentTheme=theme.id;input.dataset.themeAction=action;
   input.addEventListener('change',()=>{if(input.checked){set.add(theme.id);other.delete(theme.id);for(const sibling of field.querySelectorAll('input'))if(sibling!==input)sibling.checked=false;}else set.delete(theme.id);change();});label.append(input,node('span',action==='add'?'Hinzufügen':'Entfernen'));field.append(label);
  }host.append(field);}
 }
 function open(nextKind){
  if(getContext().busy||!selected.size)return;resetPlan();kind=nextKind;chosen=selectedRows().map(identity);$('#assignment-prepare').disabled=!chosen.length;familyIds.clear();themeAdd.clear();themeRemove.clear();$('#assignment-options').replaceChildren();$('#assignment-results').replaceChildren();
  $('#assignment-title').textContent=kind==='families'?'Materialien zuordnen':'Unterkategorien (Themen) ändern';kind==='families'?renderFamilies():renderThemes();
  const chunks=assignmentChunks(chosen);message(chosen.length+' Designs ausgewählt'+(chunks.length>1?' · '+chunks.length+' Teilpakete mit höchstens 500 Designs':'')+'. Änderungen zuerst prüfen.');dialog.showModal();
 }
 const payload=()=>kind==='families'?{familyIds:[...familyIds]}:{themeAdd:[...themeAdd],themeRemove:[...themeRemove]};
 function describePlan(plan,host){
  for(const row of plan.designs??[]){const detail=node('details',undefined,'assignment-design-result');detail.append(node('summary',row.id+(row.status==='rejected'?' · abgelehnt':'')));
   if(row.error)detail.append(node('p',row.error.message,'notice'));
   for(const pair of row.pairs??[])detail.append(node('p',(pair.familyName??pair.familyId)+': '+({addable:'kompatible Größen vorhanden',existing:'bereits zugeordnet',incompatible:'keine passende Größe – Variante nötig'}[pair.status]??pair.status)+(pair.sizeKeys?.length?' · '+pair.sizeKeys.join(', '):'')+(pair.reasons?.length?' · '+pair.reasons.join(' · '):'')));
   if(kind==='themes')detail.append(node('p','Themen: '+(row.themesBefore??[]).join(', ')+' → '+(row.themesAfter??[]).join(', ')));host.append(detail);
  }
 }
 async function prepare(){
  if(preparing||writing||!chosen.length)return;resetPlan();const change=payload();if(kind==='families'?!change.familyIds.length:!change.themeAdd.length&&!change.themeRemove.length){message('Mindestens eine Änderung auswählen.');return;}
  const own=token;controller=new AbortController();preparing=true;$('#assignment-prepare').disabled=true;const chunks=assignmentChunks(chosen),prepared=[];
  try{
   for(let index=0;index<chunks.length;index++){message('Prüfe Teilpaket '+(index+1)+' von '+chunks.length+' …');const input={designs:chunks[index],change};const plan=await request('/api/workshop/designs/batch/prepare',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':getContext().csrf},body:JSON.stringify(input),signal:controller.signal});if(own!==token||!dialog.open)return;prepared.push({input,plan});}
   plans=prepared;const counts={designs:0,pairs:0,addable:0,existing:0,incompatible:0,rejected:0};for(const {plan}of plans)for(const key of Object.keys(counts))counts[key]+=plan.counts?.[key]??0;
   const summary=kind==='families'?counts.designs+' Designs × '+change.familyIds.length+' Familien: '+counts.addable+' neue passende Zuordnungen, '+counts.existing+' bereits vorhanden, '+counts.incompatible+' ohne passende Größe.':counts.designs+' Designs: ausgewählte Themen hinzufügen/entfernen.';
   message(summary+(plans.length>1?' '+plans.length+' Teilpakete mit höchstens 500 Designs.':'')+(counts.rejected?' '+counts.rejected+' Designs abgelehnt.':'')+' Bestätige die geprüften Änderungen.');const host=$('#assignment-plan');host.replaceChildren();for(const {plan}of plans)describePlan(plan,host);
   $('#assignment-apply').textContent='Änderungen an '+counts.designs+' Designs bestätigen';$('#assignment-apply').disabled=!plans.some(({plan})=>(plan.designs??[]).some(row=>row.status==='ready'&&(kind==='themes'||row.pairs?.some(pair=>pair.status==='addable'))));
  }catch(error){if(own===token){plans=[];message(error.message+' Es wurde nichts geschrieben.');}}
  finally{if(own===token){preparing=false;$('#assignment-prepare').disabled=false;}}
 }
 async function apply(){
  if(writing||preparing||!plans.length||$('#assignment-apply').disabled)return;
  const confirmed=plans;plans=[];writing=true;for(const control of controls())control.disabled=true;onBusy(true);const attempted=[],changed=[];let accepted=0,rejected=0;
  try{
   for(let index=0;index<confirmed.length;index++){
    const {input,plan}=confirmed[index];message('Speichere Teilpaket '+(index+1)+' von '+confirmed.length+' …');attempted.push(...input.designs);
    try{const result=await request('/api/workshop/designs/batch',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':getContext().csrf},body:JSON.stringify({designs:plan.designs.map(({reihe,id,sourceChecksum})=>({reihe,id,sourceChecksum})),change:input.change,checksum:plan.checksum})});
     for(const row of result.designs??[]){const ok=row.status==='ok';ok?accepted++:rejected++;if(ok)selected.delete(resultKey(row));if(row.changed)changed.push(identity(row));const item=node('p',row.id+': '+(ok?(row.changed?'gespeichert':'unverändert'):(row.error?.message??'abgelehnt')),ok?'':'notice');for(const pair of row.pairs??[])item.append(node('small',(pair.familyName??pair.familyId)+': '+({added:'hinzugefügt',existing:'bereits vorhanden',incompatible:'nicht hinzugefügt – '+(pair.reasons??[]).join(' · '),rejected:'nicht geschrieben – '+(row.error?.message??'abgelehnt')}[pair.status]??pair.status)));$('#assignment-results').append(item);}
    }catch(error){rejected+=input.designs.length;$('#assignment-results').append(node('p','Teilpaket '+(index+1)+': '+error.message+'. Ergebnis prüfen; fehlgeschlagene Designs bleiben ausgewählt.','notice'));}
   }
   // One aggregate refresh, including uncertain network outcomes; never N line reads.
   if(attempted.length)await onChanged({designs:attempted,changed,invalidatePreview:true});message(accepted+' Designs verarbeitet · '+rejected+' abgelehnt oder Ergebnis offen. Es wurde keine Freigabe erteilt.');
  }catch(error){message('Die Ansicht konnte nicht aktualisiert werden: '+error.message+'. Die gespeicherten Ergebnisse stehen unten.');}
  finally{writing=false;onBusy(false);for(const control of controls())control.disabled=false;$('#assignment-apply').disabled=true;chosen=selectedRows().map(identity);$('#assignment-prepare').disabled=!chosen.length;sync();}
 }
 function close(){if(writing)return;resetPlan();dialog.close();}
 $('#assignment-prepare').addEventListener('click',prepare);$('#assignment-apply').addEventListener('click',apply);$('#assignment-close').addEventListener('click',close);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{if(!writing)resetPlan();});
 return {get isOpen(){return dialog.open;},get active(){return active;},setMode(value){if(writing)return;active=value;selected.clear();resetPlan();sync();},selection,sync,reset(){selected.clear();resetPlan();sync();}};
}
