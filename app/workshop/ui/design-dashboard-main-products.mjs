const $=selector=>document.querySelector(selector);
const node=(tag,text,cls)=>{const item=document.createElement(tag);if(text!==undefined)item.textContent=text;if(cls)item.className=cls;return item;};
const choose=(select,items,preferred)=>{select.replaceChildren(...items.map(item=>{const option=node('option',item.name??item.label??item.id??item.key);option.value=item.id??item.key;option.disabled=item.eligible===false;return option;}));select.value=items.some(item=>(item.id??item.key)===preferred&&item.eligible!==false)?preferred:(items.find(item=>item.eligible!==false)?.id??items.find(item=>item.eligible!==false)?.key??items[0]?.id??items[0]?.key??'');};
const identity=row=>({reihe:row.lieferform2?.reihe??row.reihe,id:row.id});

export function installDesignMainProducts({request,getContext,onChanged=async()=>{},onBusy=()=>{}}){
 let source=null,options=null,token=0,previewToken=0,controller=null,previewController=null,previewUrl=null,writing=false,deleting=null;
 const dialog=$('#main-product-dialog'),message=text=>{$('#main-product-status').textContent=text;};
 const currentLine=()=>options?.lines.find(line=>line.id===$('#main-product-line').value);
 const currentFamily=()=>currentLine()?.families.find(family=>family.id===$('#main-product-family').value);
 const currentGroup=()=>currentFamily()?.groups.find(group=>group.key===$('#main-product-group').value);
 const currentSub=()=>currentLine()?.subcategories.find(sub=>sub.id===$('#main-product-subcategory').value);
 const sizeKeys=()=>[...$('#main-product-sizes').querySelectorAll('input')].filter(input=>input.checked).map(input=>input.value);
 const headers=()=>({'Content-Type':'application/json','X-Gravuru-CSRF':getContext().csrf});
 function clearPreview(){previewToken++;previewController?.abort();previewController=null;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;const image=$('#main-product-image');image.onload=null;image.onerror=null;image.removeAttribute('src');image.hidden=true;$('#main-product-preview-status').textContent='';}
 function ready(){
  const group=currentGroup(),sub=currentSub(),name=$('#main-product-name').value.trim();
  $('#main-product-create').disabled=writing||!group||group.eligible===false||!sub||sub.eligible===false||!sizeKeys().length||!name||name.length>160;
 }
 function renderExisting(){
  const host=$('#main-product-existing');host.replaceChildren();
  if(!options?.existing?.length)return;host.append(node('h3','Vorhandene Hauptprodukte dieses Designs'));
  for(const product of options.existing){const item=node('section',undefined,'main-product-existing');item.append(node('strong',product.id),node('p',[product.name,product.lineName,product.subcategoryName].filter(Boolean).join(' · ')));
   const action=node('button','Hauptprodukt entfernen');action.type='button';action.dataset.deleteMainProduct=JSON.stringify([product.lineId,product.subcategoryId,product.id]);action.disabled=!product.canDelete||writing;action.addEventListener('click',()=>{if(!product.canDelete||writing)return;deleting=product;$('#main-product-delete-question').textContent='Hauptprodukt '+product.id+' aus '+product.lineName+' / '+product.subcategoryName+' entfernen? Das Design bleibt erhalten.';$('#main-product-delete-confirmation').hidden=false;$('#main-product-delete-confirm').focus();});item.append(action);
   if(!product.canDelete)item.append(node('p',product.deleteReason||'Dieses Hauptprodukt kann nicht entfernt werden.','notice'));host.append(item);
  }
 }
 function renderSizes(){
  clearPreview();deleting=null;$('#main-product-delete-confirmation').hidden=true;const group=currentGroup(),host=$('#main-product-sizes');host.replaceChildren();
  $('#main-product-id').textContent=group?.proposedId||'Kennung offen';$('#main-product-name').value=group?.suggestedName??'';
  $('#main-product-name-basis').textContent=group?.nameBasis?'Namensvorschlag nach „'+group.nameBasis.name+'“ ('+group.nameBasis.productId+'). '+group.nameBasis.rule:'Kein eindeutiges Namensmuster vorhanden. Bitte einen Namen eingeben.';
  $('#main-product-group-hint').textContent=group?.eligible===false?(group.reason||'Diese Formgruppe ist nicht verfügbar.'):(group?'Standard: alle kompatiblen Größen dieser Formgruppe.':'Keine kompatible Formgruppe vorhanden.');
  for(const size of group?.sizes??[]){const label=node('label',undefined,'main-product-size'),input=node('input');input.type='checkbox';input.value=size.key;input.checked=true;input.dataset.mainProductSize=size.key;input.addEventListener('change',()=>{ready();void loadPreview();});label.append(input,node('span',size.label));host.append(label);}
  ready();void loadPreview();
 }
 function renderGroups(){const family=currentFamily();choose($('#main-product-group'),family?.groups??[]);renderSizes();}
 function renderFamily(){const line=currentLine();choose($('#main-product-family'),line?.families??[],getContext().familyId);renderGroups();}
 function renderLine(){
  const line=currentLine();choose($('#main-product-subcategory'),line?.subcategories??[]);
  const missing=(line?.subcategories??[]).filter(sub=>sub.eligible===false);$('#main-product-theme-hint').textContent=missing.length?missing.map(sub=>sub.name+': '+(sub.reason||'Thema fehlt – erst zuordnen.')).join(' · '):'';
  renderFamily();
 }
 async function loadPreview(){
  clearPreview();const family=currentFamily(),size=sizeKeys()[0];if(!family?.previewUrl||!size)return;const own=previewToken;previewController=new AbortController();$('#main-product-preview-status').textContent='Zielvorschau wird geladen …';
  try{const url=new URL(family.previewUrl,location.href);url.searchParams.set('size',size);const result=await request(url.pathname+url.search,{signal:previewController.signal});if(own!==previewToken||!dialog.open)return;
   const fit=result.reviewFit??result.fit;$('#main-product-preview-status').textContent='Passung: '+(fit?.status??'offen')+'. '+(fit?.issues??[]).join(' ');
   if(!result.svg){$('#main-product-preview-status').textContent+=' Vorschau nicht verfügbar. Das Anlegen erteilt keine Freigabe.';return;}
   previewUrl=URL.createObjectURL(new Blob([result.svg],{type:'image/svg+xml'}));const image=$('#main-product-image'),urlValue=previewUrl;image.alt=source.id+' · '+family.name+' · '+size;
   image.onload=()=>{if(own===previewToken&&dialog.open&&image.getAttribute('src')===urlValue&&image.naturalWidth)image.hidden=false;};image.onerror=()=>{if(own===previewToken)$('#main-product-preview-status').textContent='Die Zielvorschau konnte nicht geladen werden.';};image.src=previewUrl;
  }catch(error){if(own===previewToken)$('#main-product-preview-status').textContent=error.message;}
 }
 async function loadOptions(){
  const own=++token;controller?.abort();controller=new AbortController();clearPreview();options=null;$('#main-product-create').disabled=true;message('Hauptprodukt-Möglichkeiten werden geladen …');
  try{const result=await request('/api/workshop/designs/main-products/options?'+new URLSearchParams(source),{signal:controller.signal});if(own!==token||!dialog.open)return;options=result;choose($('#main-product-line'),options.lines??[],getContext().lineId);renderLine();renderExisting();message(options.lines?.length?'Das Hauptprodukt wird nur im Katalog angelegt. Die Zielfreigabe bleibt unverändert.':'Kein bestätigtes Familienziel mit passender Linie vorhanden.');return true;}
  catch(error){if(own===token)message(error.message);return false;}
 }
 function open(row){if(writing||getContext().busy)return;source=identity(row);options=null;deleting=null;$('#main-product-title').textContent=row.id+' · Als Hauptprodukt anlegen';$('#main-product-existing').replaceChildren();$('#main-product-delete-confirmation').hidden=true;for(const id of ['line','family','subcategory','group'])$('#main-product-'+id).replaceChildren();$('#main-product-sizes').replaceChildren();$('#main-product-name').value='';$('#main-product-id').textContent='Kennung wird geprüft';dialog.showModal();void loadOptions();}
 function setWriting(value){writing=value;onBusy(value);for(const control of dialog.querySelectorAll('input,select,button'))control.disabled=value;if(!value){ready();renderExisting();}}
 async function create(){
  if(writing||$('#main-product-create').disabled||!options)return;const line=currentLine(),family=currentFamily(),group=currentGroup(),sub=currentSub();
  const input={source:{reihe:options.source.reihe,id:options.source.id,checksum:options.source.checksum},lineId:line.id,lineChecksum:line.lineChecksum,subcategoryId:sub.id,familyId:family.id,groupKey:group.key,sizeKeys:sizeKeys(),name:$('#main-product-name').value.trim()};setWriting(true);message('Hauptprodukt wird im Katalog angelegt …');
  try{const result=await request('/api/workshop/designs/main-products',{method:'POST',headers:headers(),body:JSON.stringify(input)});let refreshError=null;try{await onChanged({designs:[source],invalidatePreview:false});}catch(error){refreshError=error.message;}const updated=await loadOptions();message('Hauptprodukt '+result.productId+' im Katalog angelegt. Keine Freigabe und kein Shop-Abgleich ausgeführt.'+(refreshError||!updated?' Ansicht noch nicht vollständig aktualisiert. Bitte Möglichkeiten neu laden.'+(refreshError?' '+refreshError:''):''));}
  catch(error){message(error.message+' Bitte Möglichkeiten neu laden, wenn sich der Katalog geändert hat.');}
  finally{setWriting(false);}
 }
 async function remove(){
  if(writing||!deleting?.canDelete)return;const product=deleting;setWriting(true);message('Hauptprodukt '+product.id+' wird entfernt …');
  try{await request('/api/workshop/designs/main-products',{method:'DELETE',headers:headers(),body:JSON.stringify({lineId:product.lineId,lineChecksum:product.lineChecksum,subcategoryId:product.subcategoryId,productId:product.id})});deleting=null;$('#main-product-delete-confirmation').hidden=true;let refreshError=null;try{await onChanged({designs:[source],invalidatePreview:false});}catch(error){refreshError=error.message;}const updated=await loadOptions();message('Hauptprodukt '+product.id+' entfernt. Das Design bleibt erhalten.'+(refreshError||!updated?' Ansicht noch nicht vollständig aktualisiert. Bitte Möglichkeiten neu laden.'+(refreshError?' '+refreshError:''):''));}
  catch(error){message(error.message);}
  finally{setWriting(false);}
 }
 function close(){if(writing)return;token++;controller?.abort();clearPreview();dialog.close();}
 $('#main-product-line').addEventListener('change',renderLine);$('#main-product-family').addEventListener('change',renderGroups);$('#main-product-group').addEventListener('change',renderSizes);$('#main-product-subcategory').addEventListener('change',ready);$('#main-product-name').addEventListener('input',ready);$('#main-product-create').addEventListener('click',create);$('#main-product-close').addEventListener('click',close);$('#main-product-reload').addEventListener('click',()=>{if(!writing)void loadOptions();});$('#main-product-delete-confirm').addEventListener('click',remove);$('#main-product-delete-cancel').addEventListener('click',()=>{deleting=null;$('#main-product-delete-confirmation').hidden=true;});dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{if(!writing){token++;controller?.abort();clearPreview();}});
 return {get isOpen(){return dialog.open;},button(row){if(!row.lieferform2||!row.ziele?.some(target=>!target.missing))return null;const action=node('button','Als Hauptprodukt anlegen');action.type='button';action.dataset.mainProductDesign=JSON.stringify([row.lieferform2.reihe,row.id]);action.disabled=getContext().busy;action.addEventListener('click',()=>open(row));return action;}};
}
