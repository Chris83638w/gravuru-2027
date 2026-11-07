// Family selection is independent of visual approvals. Only saved native
// sources and the server's revision-bound plan can be submitted.
export const MAX_ASSIGNMENT_SOURCES=60;
export function assignmentSource(card) {
  const revision=Number(card.classList.contains('inline-active')?card.dataset.inlineRevision:card.dataset.sourceRevision);
  if(!card.dataset.productId||!card.dataset.designId||!card.dataset.approvalKey||!Number.isSafeInteger(revision)||revision<1||
    card.classList.contains('inline-dirty')||card.getAttribute('aria-busy')==='true')return null;
  return {key:card.dataset.approvalKey,expectedRevision:revision,originalId:card.dataset.originalId};
}
export function assignmentPlanInput(sources,targets) {
  if(!Array.isArray(sources)||!sources.length||sources.length>MAX_ASSIGNMENT_SOURCES||!targets.length)throw Error('Bitte gespeicherte Vorlagen und mindestens einen Rohling wählen.');
  const seen=new Set();
  return {sources:sources.map(source=>{
    if(typeof source.key!=='string'||seen.has(source.key)||!Number.isSafeInteger(source.expectedRevision)||source.expectedRevision<1)throw Error('Die Quellauswahl ist nicht eindeutig.');
    seen.add(source.key);return {key:source.key,expectedRevision:source.expectedRevision};
  }),targets:targets.map(({lineId,subcategoryId,familyId,sizeKey})=>({lineId,subcategoryId,familyId,sizeKey}))};
}
export function assignmentCanExecute(plan) {
  return !!plan&&typeof plan.id==='string'&&typeof plan.planHash==='string'&&plan.valid===true&&plan.counts?.blocked===0&&
    Array.isArray(plan.entries)&&plan.entries.length>0&&plan.entries.every(e=>['create','existing'].includes(e.status));
}
export function installAssignmentReview({cards,onApplied=()=>{},remember=()=>{},fetchImpl=globalThis.fetch}={}) {
  const panel=document.querySelector('[data-assignment-panel]');if(!panel)return null;
  const find=selector=>document.querySelector(selector),inside=selector=>panel.querySelector(selector);
  const toolbarStatus=find('[data-assignment-status]'),status=inside('[data-assignment-panel-status]');
  const open=find('[data-assignment-open]'),clear=find('[data-assignment-clear]'),all=find('[data-assignment-select-page]');
  const cancel=inside('[data-assignment-cancel]'),planButton=inside('[data-assignment-plan]'),execute=inside('[data-assignment-execute]');
  const line=inside('[data-assignment-line]'),subcategory=inside('[data-assignment-subcategory]'),family=inside('[data-assignment-family]');
  const sourceList=inside('[data-assignment-sources]'),sizes=inside('[data-assignment-size-options]'),preview=inside('[data-assignment-preview]');
  const selection=new Map(),targets=new Map(),storageKey='gravuru-gallery-family-selection-v1',disabledBeforeBusy=new WeakMap();
  let busy=false,context=null,activeSources=[],plan=null,applied=false,previewPage=0,previousFocus=null;
  const imageUrls=[];
  const text=(tag,value,className)=>{const n=document.createElement(tag);n.textContent=value??'';if(className)n.className=className;return n;};
  const mm=values=>Array.isArray(values)?values.map(v=>Number((v/10).toFixed(2))).join(' × ')+' cm':'';
  const message=value=>{status.textContent=value;};
  const hasDirty=()=>cards.some(card=>card.classList.contains('inline-dirty')||card.getAttribute('aria-busy')==='true');
  try{const saved=JSON.parse(sessionStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))for(const item of saved.slice(0,MAX_ASSIGNMENT_SOURCES))if(typeof item?.key==='string'&&typeof item.originalId==='string'&&Number.isSafeInteger(item.expectedRevision)&&item.expectedRevision>0)selection.set(item.originalId,item);}catch{}
  function persist(){try{sessionStorage.setItem(storageKey,JSON.stringify([...selection.values()]));}catch{}remember();}
  function revokeImages(){for(const url of imageUrls)URL.revokeObjectURL(url);imageUrls.length=0;}
  function sync(){
    const eligible=cards.filter(card=>!card.hidden&&assignmentSource(card));let checked=0;
    for(const card of cards){const source=assignmentSource(card),chosen=source&&selection.get(source.originalId),checkbox=card.querySelector('[data-assignment-select]'),button=card.querySelector('[data-assignment-single]');
      if(checkbox){checkbox.disabled=busy||!source;checkbox.checked=!!chosen&&chosen.key===source.key&&chosen.expectedRevision===source.expectedRevision;}
      if(button)button.disabled=busy||!source;
      if(eligible.includes(card)&&checkbox?.checked)checked++;
    }
    all.disabled=busy||!eligible.length;all.checked=!!eligible.length&&checked===eligible.length;all.indeterminate=checked>0&&checked<eligible.length;
    open.disabled=busy||!selection.size;clear.disabled=busy||!selection.size;find('[data-assignment-count]').textContent=String(selection.size);
  }
  function setBusy(value){busy=value;for(const control of panel.querySelectorAll('button,select,input')){
      if(value){disabledBeforeBusy.set(control,control.disabled);control.disabled=true;}
      else if(disabledBeforeBusy.has(control)){control.disabled=disabledBeforeBusy.get(control);disabledBeforeBusy.delete(control);}}
    if(!value){planButton.disabled=!context||!targets.size;execute.disabled=applied||!assignmentCanExecute(plan);}sync();}
  function invalidate(){plan=null;applied=false;execute.hidden=true;execute.disabled=true;revokeImages();preview.replaceChildren();message('');}
  function selectCard(card,enabled){const source=assignmentSource(card);if(!source)return;
    if(enabled&&selection.size>=MAX_ASSIGNMENT_SOURCES&&!selection.has(source.originalId)){toolbarStatus.textContent='Bis zu 60 Vorlagen je Zuordnung. Bitte diese Auswahl zuerst übernehmen.';sync();return;}
    enabled?selection.set(source.originalId,source):selection.delete(source.originalId);persist();sync();
  }
  async function request(action,body){
    let url='/originale/assignments?action='+action;
    const options={method:action==='context'?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'X-Slate-Review-CSRF':find('meta[name="slate-review-csrf"]').content}};
    if(action==='context')url+='&sourceKeys='+encodeURIComponent(JSON.stringify(body.sourceKeys));
    else{options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
    const response=await fetchImpl(url,options),result=await response.json();
    if(!response.ok)throw Object.assign(Error(result.error||'Die Zuordnung konnte nicht bestätigt werden.'),{status:response.status});
    return result;
  }
  function choices(select,items,label='Bitte auswählen'){
    select.replaceChildren();const empty=text('option',label);empty.value='';select.append(empty);
    for(const item of items){const option=text('option',item.label||item.name||item.id);option.value=item.id;select.append(option);}
    if(items.length===1)select.value=items[0].id;
  }
  function selectedSubcategory(){return context?.lines.find(item=>item.id===line.value)?.subcategories?.find(item=>item.id===subcategory.value);}
  function renderTargetSelection(){
    const host=inside('[data-assignment-targets]');host.replaceChildren(text('h3',targets.size+' Rohling'+(targets.size===1?'':'e')+' gewählt'));
    for(const [key,target] of targets){const row=text('p',target.label+' '),remove=text('button','Entfernen');remove.type='button';
      remove.addEventListener('click',()=>{targets.delete(key);renderSizes();});row.append(remove);host.append(row);}
    if(context?.limits)host.append(text('p','Bis zu '+(context.limits.sources||60)+' Vorlagen und '+(context.limits.targetEntries||120)+' konkrete Design-/Zielkombinationen je Plan.','help'));
  }
  function renderSizes(){
    invalidate();sizes.replaceChildren();const selected=context?.families.find(item=>item.id===family.value);
    for(const size of selected?.sizes||[]){
      const label=text('label',''),input=document.createElement('input');input.type='checkbox';input.value=size.key;
      const existing=activeSources.filter(source=>source.existingTargets?.some(target=>target.familyId===selected.id&&target.sizeKey===size.key)).length;
      const key=JSON.stringify([selected.id,size.key]);input.checked=targets.has(key);
      label.append(input,text('span',(size.label||mm(size.mm))+(size.form?' · '+size.form:'')+(existing?' · bereits '+existing+'/'+activeSources.length+' zugeordnet':'')));
      input.addEventListener('change',()=>{invalidate();if(input.checked)targets.set(key,{lineId:line.value,subcategoryId:subcategory.value,familyId:selected.id,sizeKey:size.key,label:(selectedSubcategory()?.label||'')+' · '+(selected.label||selected.id)+' · '+(size.label||mm(size.mm))});else targets.delete(key);renderTargetSelection();planButton.disabled=!targets.size;});sizes.append(label);
    }
    if(!selected?.sizes?.length)sizes.append(text('p','Für diese Auswahl sind noch keine bestätigten Rohlinge verfügbar.'));
    renderTargetSelection();planButton.disabled=!targets.size;
  }
  function renderFamilies(){const allowed=selectedSubcategory()?.familyIds||[];choices(family,(context?.families||[]).filter(item=>allowed.includes(item.id)));renderSizes();}
  function renderSubcategories(){choices(subcategory,context?.lines.find(item=>item.id===line.value)?.subcategories||[]);renderFamilies();}
  line.addEventListener('change',renderSubcategories);subcategory.addEventListener('change',renderFamilies);family.addEventListener('change',renderSizes);
  async function begin(sources){
    if(busy)return;if(hasDirty()){toolbarStatus.textContent='Bitte die offene Schnellbearbeitung zuerst speichern oder zurücksetzen.';return;}
    if(!sources.length)return;
    previousFocus=document.activeElement;panel.hidden=false;panel.focus();panel.scrollIntoView({block:'start'});invalidate();context=null;activeSources=[];targets.clear();sizes.replaceChildren();sourceList.replaceChildren();inside('[data-assignment-targets]').replaceChildren();setBusy(true);message('Gespeicherte Quellen und Familien werden geladen …');
    try{
      const result=await request('context',{sourceKeys:sources.map(source=>source.key)});
      if(!Array.isArray(result.sources)||result.sources.length!==sources.length||!Array.isArray(result.lines)||!Array.isArray(result.families))throw Error('Unvollständiger Familienkontext.');
      for(const source of sources){const current=result.sources.find(item=>item.key===source.key);if(!current||current.revision!==source.expectedRevision)throw Error('Eine gewählte Quelle wurde inzwischen geändert. Bitte Galerie neu laden und diese Vorlage erneut auswählen.');}
      context=result;activeSources=result.sources;sourceList.replaceChildren(text('h3',activeSources.length+' gespeicherte Vorlage'+(activeSources.length===1?'':'n')));
      const list=document.createElement('ul');for(const source of activeSources)list.append(text('li',source.originalId+' · '+mm(source.mm)+' · Stand '+source.revision));sourceList.append(list);
      choices(line,context.lines);renderSubcategories();message('Produktlinie, Familie und gewünschte Rohlinge wählen.');
    }catch(error){message(error.message);context=null;}finally{setBusy(false);}
  }
  function renderPlan(){
    revokeImages();preview.replaceChildren();if(!plan)return;
    preview.append(text('h3','Zuordnungsplan'),text('p',`${plan.counts.create} neue Ziele · ${plan.counts.existing} bereits vorhanden · ${plan.counts.blocked} offen`));
    preview.append(text('p','Die neuen Ziele werden als ungeprüfte native Entwürfe angelegt. Diese Aktion erteilt keine Sichtfreigabe und veröffentlicht nichts.','help'));
    const grid=text('div','','assignment-preview-grid');
    for(const entry of plan.entries.slice(previewPage*24,previewPage*24+24)){
      const card=text('article','','assignment-preview-card'),target=entry.target||{};
      card.append(text('h4',entry.originalId),text('p',(target.reviewMaterial?.label||target.familyId||'')+' · '+mm(target.mm)),text('strong',{create:'Neu zuordnen',existing:'Bereits vorhanden · bleibt erhalten',blocked:'Offen · wird nicht übernommen'}[entry.status]||'Offen'));
      if(typeof entry.previewSvg==='string'&&entry.previewSvg){const image=document.createElement('img'),url=URL.createObjectURL(new Blob([entry.previewSvg],{type:'image/svg+xml'}));imageUrls.push(url);image.src=url;image.alt=entry.originalId+' · Zielvorschau';image.loading='lazy';card.append(image);}
      if(entry.reason)card.append(text('p',entry.reason));
      for(const warning of entry.warnings||[])card.append(text('p',typeof warning==='string'?warning:warning.message,'note'));
      grid.append(card);
    }
    preview.append(grid);
    if(plan.entries.length>24){const nav=text('div','','assignment-preview-pages');
      for(const [label,page] of [['Vorherige Vorschauen',previewPage-1],['Weitere Vorschauen',previewPage+1]]){const b=text('button',label);b.type='button';b.disabled=page<0||page*24>=plan.entries.length;b.addEventListener('click',()=>{previewPage=page;renderPlan();});nav.append(b);}
      nav.append(text('span',`${previewPage*24+1}–${Math.min((previewPage+1)*24,plan.entries.length)} von ${plan.entries.length}`));preview.append(nav);
    }
    if(plan.options?.length){const details=document.createElement('details');details.append(text('summary','Ausführungen und Preise der Ziele'));
      for(const group of plan.options){details.append(text('h4',group.label||[group.target?.reviewMaterial?.label||group.target?.familyLabel||group.familyId,mm(group.target?.mm)||group.sizeKey].filter(Boolean).join(' · ')));
        for(const variant of group.variants||[]){const label=variant.title||variant.label||Object.values(variant.options||{}).join(' · ');details.append(text('p',label+' · '+(Number.isSafeInteger(variant.priceCents)?(variant.priceCents/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'}):'Preis offen')));}}
      preview.append(details);
    }
    execute.hidden=false;execute.disabled=!assignmentCanExecute(plan);execute.textContent=plan.counts.create?'Geprüfte Zuordnung übernehmen':'Vorhandene Zuordnungen bestätigen';
  }
  planButton.addEventListener('click',async()=>{
    if(busy||!context)return;if(hasDirty()){message('Bitte zuerst die Schnellbearbeitung speichern oder zurücksetzen.');return;}
    invalidate();setBusy(true);message('Ziele und native Vorschauen werden geprüft …');
    try{const result=await request('plan',assignmentPlanInput(activeSources.map(source=>({key:source.key,expectedRevision:source.revision})),[...targets.values()]));
      if(!Array.isArray(result.entries)||!result.counts)throw Error('Unvollständiger Zuordnungsplan.');plan=result;previewPage=0;renderPlan();message(plan.valid?'Plan prüfen und anschließend übernehmen.':'Offene Ziele zuerst korrigieren oder aus der Auswahl nehmen.');
    }catch(error){message(error.message);}finally{setBusy(false);}
  });
  execute.addEventListener('click',async()=>{
    if(busy||applied||!assignmentCanExecute(plan))return;if(hasDirty()){message('Bitte zuerst die Schnellbearbeitung speichern oder zurücksetzen.');return;}
    setBusy(true);message('Geprüfte Zuordnung wird übernommen …');
    try{const result=await request('execute',{planId:plan.id,planHash:plan.planHash});applied=true;
      for(const source of activeSources)selection.delete(source.originalId);persist();message('Zuordnung gespeichert. Die Galerie wird aktualisiert.');onApplied({result,originalId:activeSources[0]?.originalId});
    }catch(error){if(error.status===409||error.status===422){plan=null;message(error.message+' Bitte einen neuen Plan prüfen.');}
      else{message('Ergebnis noch nicht bestätigt. Deine Auswahl bleibt erhalten. Erneut prüfen verwendet denselben Plan und legt nichts doppelt an.');execute.textContent='Ergebnis erneut prüfen';}}
    finally{setBusy(false);}
  });
  cancel.addEventListener('click',()=>{if(busy)return;panel.hidden=true;invalidate();context=null;previousFocus?.focus?.();});
  open.addEventListener('click',()=>begin([...selection.values()]));clear.addEventListener('click',()=>{if(busy)return;selection.clear();persist();sync();});
  all.addEventListener('change',()=>{if(busy)return;const enabled=all.checked;for(const card of cards)if(!card.hidden)selectCard(card,enabled);});
  for(const card of cards){card.querySelector('[data-assignment-select]')?.addEventListener('change',event=>selectCard(card,event.target.checked));card.querySelector('[data-assignment-single]')?.addEventListener('click',()=>{const source=assignmentSource(card);if(source)void begin([source]);});}
  sync();return {sync,beforeNavigation(){if(busy&&!applied){toolbarStatus.textContent='Bitte den laufenden Zuordnungsabgleich abwarten.';return false;}return true;}};
}
