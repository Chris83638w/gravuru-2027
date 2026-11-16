const $=s=>document.querySelector(s);
const materialNames={steel:'Edelstahl',acrylic:'Acrylglas',slate:'Schiefer',oak:'Eiche',beech:'Buche',cherry:'Kirsche','leather-brown':'Leder','acrylic-clear':'Acrylglas · klar','acrylic-anthracite':'Acrylglas · anthrazit',wood:'Holz',other:'Sonstiges',print:'Druck'};
// Selection dialogs need names/IDs/revisions, never every product's embedded
// font and photo document. Read the existing compact catalogue in full pages.
export async function loadCatalogChoices(api,{kinds=['product','master']}={}){
 if(typeof api!=='function'||!Array.isArray(kinds)||!kinds.length||new Set(kinds).size!==kinds.length||kinds.some(kind=>!['product','master'].includes(kind)))throw Error('Ungültige Produktauswahl.');
 const products=[],seen=new Set();
 for(const kind of kinds){
  let total=null,pages=1;
  for(let page=1;page<=pages;page++){
   const query=new URLSearchParams({catalog:'1',kind,filter:'all',sort:'oldest',page:String(page),pageSize:'100'});
   const data=await api('/api/workshop/products?'+query);
   if(!Array.isArray(data.products)||!Number.isSafeInteger(data.total)||data.total<0||data.page!==page||data.pageSize!==100||data.pages!==Math.max(1,Math.ceil(data.total/100))||total!==null&&total!==data.total||data.products.length!==Math.min(100,Math.max(0,data.total-(page-1)*100)))throw Error('Die Produktauswahl wurde geändert oder ist unvollständig. Bitte erneut laden.');
   total=data.total;pages=data.pages;
   for(const product of data.products){
    if(typeof product.id!=='string'||seen.has(product.id)||product.kind!==kind||product.status==='archived'||'document' in product)throw Error('Die Produktauswahl wurde geändert. Bitte erneut laden.');
    seen.add(product.id);products.push(product);
   }
  }
 }
 return products;
}
export function installCatalog({state,loadList,notify,api,selection,setBusy}){
 state.catalogFilters={material:'',category:'',sort:'updated',page:1,pageSize:24};
 try{const saved=localStorage.getItem('gravuru-catalog-layout');if(['list','cards'].includes(saved))$('#catalog-layout').value=saved;}catch{}
 const layout=()=>{$('#product-list').dataset.layout=$('#catalog-layout').value;};layout();
 const reload=()=>loadList().catch(e=>notify(e.message,'error'));
 for(const [selector,key] of [['#catalog-material','material'],['#catalog-category','category'],['#catalog-sort','sort'],['#catalog-page-size','pageSize']])$(selector).addEventListener('change',()=>{state.catalogFilters[key]=key==='pageSize'?Number($(selector).value):$(selector).value;state.catalogFilters.page=1;reload();});
 $('#catalog-layout').addEventListener('change',()=>{layout();try{localStorage.setItem('gravuru-catalog-layout',$('#catalog-layout').value);}catch{}});
 $('#catalog-previous').onclick=()=>{if(state.catalogFilters.page>1){state.catalogFilters.page--;reload();}};
 $('#catalog-next').onclick=()=>{if(state.catalogFilters.page<state.catalog?.pages){state.catalogFilters.page++;reload();}};
 function render(){
  const c=state.catalog;if(!c)return;
  state.catalogFilters.page=c.page;
  for(const [selector,key,rows,label] of [['#catalog-material','material',c.facets.materials,'Alle Materialien'],['#catalog-category','category',c.facets.categories,'Alle Kategorien']]){
   const selected=state.catalogFilters[key],node=$(selector),items=[new Option(label,'')];
   if(key==='category')items.push(new Option('Ohne Kategorie','__none__'));
   for(const r of rows)if(r.id){const l=c.categoryLabels?.[r.id];items.push(new Option((key==='material'?materialNames[r.id]||r.id:l?l.label+(l.known?'':' (Kürzel ohne Klarnamen)'):r.id.replaceAll('-',' '))+' ('+r.count+')',r.id));}
   if(selected&&!items.some(o=>o.value===selected))items.push(new Option(selected,selected));
   node.replaceChildren(...items);node.value=selected;
  }
  $('#catalog-page-status').textContent=`Seite ${c.page} von ${c.pages} · ${c.total} Treffer`;
  $('#catalog-previous').disabled=c.page<=1;$('#catalog-next').disabled=c.page>=c.pages;
 }
 $('#selection-bar').insertAdjacentHTML('beforeend','<button id="catalog-group-selection" type="button">Kategorie zuweisen</button>');
 const modal=document.createElement('dialog');modal.id='catalog-group-dialog';modal.innerHTML='<h2>Auswahl einer Kategorie zuweisen</h2><p>Vorhandene Kategorien bleiben erhalten. Verwende kurze Namen, zum Beispiel hausschilder, hochzeit oder tiermotive.</p><label>Kategorie<input id="catalog-group-name" maxlength="100" pattern="[a-z0-9][a-z0-9-]*" required placeholder="hausschilder"></label><p data-group-status role="status"></p><button type="button" data-group-cancel>Abbrechen</button> <button type="button" data-group-apply>Zuordnen</button>';document.body.append(modal);
 let pending=[];
 $('#catalog-group-selection').onclick=()=>{if(state.busy)return;pending=selection();if(!pending.length)return;modal.querySelector('[data-group-status]').textContent=pending.length+' Produkte ausgewählt.';modal.showModal();$('#catalog-group-name').focus();};
 modal.querySelector('[data-group-cancel]').onclick=()=>{if(!state.busy)modal.close();};modal.addEventListener('cancel',e=>{if(state.busy)e.preventDefault();});
 modal.querySelector('[data-group-apply]').onclick=async()=>{
  if(state.busy||!$('#catalog-group-name').reportValidity())return;
  const category=$('#catalog-group-name').value.trim(),failures=[];let completed=0;setBusy(true);for(const n of modal.querySelectorAll('button,input'))n.disabled=true;
  try{for(const p of pending){try{const record=await api('/api/workshop/products/'+p.productId);if(record.revision!==p.expectedRevision)throw Error('inzwischen geändert');const document=record.document;if(!document.categoryIds.includes(category)){document.categoryIds.push(category);await api('/api/workshop/products/'+p.productId,{method:'PATCH',body:{expectedRevision:p.expectedRevision,document}});}completed++;}catch(e){failures.push(p.productId+': '+e.message);}modal.querySelector('[data-group-status]').textContent=completed+' zugeordnet …';}
   modal.close();await loadList();notify(completed+' Produkte zugeordnet.'+(failures.length?' Nicht übernommen: '+failures.join(' · '):''),failures.length?'error':'success');
  }finally{setBusy(false);for(const n of modal.querySelectorAll('button,input'))n.disabled=false;}
 };
 return {render};
}
