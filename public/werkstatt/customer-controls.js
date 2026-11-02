'use strict';
// The existing inputs and handlers stay intact; only their presentation changes.
if(new URLSearchParams(location.search).has('kompakt')){
 const fields=document.querySelector('.construction-fields'),form=document.querySelector('#template-form');
 // The outer step navigation owns scrolling; loading a plate must not jump past it.
 document.querySelector('#form-section').scrollIntoView=()=>{};
 const label=id=>document.getElementById(id)?.closest('label');
 function group(id,title,nodes,open=false){
  const detail=document.createElement('details');detail.id=id;detail.className='customer-section';detail.open=open;
  const summary=document.createElement('summary'),heading=document.createElement('span'),value=document.createElement('small'),body=document.createElement('div');
  heading.textContent=title;summary.append(heading,value);body.className='customer-section-body';for(const node of nodes)if(node)body.append(node);detail.append(summary,body);fields.append(detail);return{detail,value,body};
 }
 const basic=group('customer-size','Material & Maße',[document.querySelector('#base-acrylic-options'),label('shape'),label('widthMm'),label('heightMm'),label('cornerRadiusMm')],true);
 const mounting=group('customer-mounting','Befestigung',[label('holeCount'),label('holeDiameterMm'),label('edgeMm'),label('spacer-count'),document.querySelector('#spacer-note'),document.querySelector('#individual-holes')]);
 const bell=group('customer-bell','Funkklingel',[document.querySelector('#klingel-section')]);
 const acrylicNode=document.querySelector('#acrylic-section'),acrylic=group('customer-acrylic','Acrylauflage',[acrylicNode]);
 // Reuse the original add/select handlers so all geometry and bell checks apply.
 const acrylicAction=document.querySelector('#select-acrylic'),acrylicEnabled=document.querySelector('#acrylic-enabled'),selectAcrylic=acrylicAction.onclick;
 acrylicAction.classList.add('customer-acrylic-action','customer-layer-action');
 acrylicAction.setAttribute('aria-controls','customer-acrylic');
 acrylicAction.onclick=function(event){
  if(busy||!window.workshopReady||!parentConfigurationLoaded||acrylicNode.hidden)return;
  acrylic.detail.open=true;
  if(!acrylicEnabled.checked)document.querySelector('#add-acrylic').click();
  else selectAcrylic.call(this,event);
  if(acrylicEnabled.checked)activateSection(acrylic);
  refresh();
 };
 acrylic.detail.addEventListener('toggle',()=>acrylicAction.setAttribute('aria-expanded',String(acrylic.detail.open)));
 // A compact model picker sits above the preview; the original select owns validation.
 const bellAction=document.createElement('button'),bellPicker=document.createElement('section'),bellChoice=document.createElement('select'),bellNote=document.createElement('p'),bellRemove=document.createElement('button'),bellClose=document.createElement('button'),bellHeading=document.createElement('div'),bellTitle=document.createElement('strong'),bellLabel=document.createElement('label');
 bellAction.id='select-bell';bellAction.type='button';bellAction.className='customer-layer-action';bellAction.setAttribute('aria-controls','customer-bell-picker');
 const toolbar=document.querySelector('.layer-selection');toolbar.append(bellAction);
 bellPicker.id='customer-bell-picker';bellPicker.hidden=true;bellPicker.setAttribute('role','group');bellPicker.setAttribute('aria-labelledby','customer-bell-title');toolbar.after(bellPicker);
 bellHeading.className='customer-bell-heading';bellTitle.id='customer-bell-title';bellTitle.textContent='Funkklingel auswählen';bellClose.type='button';bellClose.textContent='×';bellClose.setAttribute('aria-label','Klingelauswahl schließen');bellHeading.append(bellTitle,bellClose);
 bellChoice.id='customer-bell-model';bellChoice.append(...[...modelSelect.options].map(option=>option.cloneNode(true)));bellLabel.htmlFor=bellChoice.id;bellLabel.textContent='Ihr Klingelmodell';
 bellNote.id='customer-bell-note';bellNote.setAttribute('role','status');bellChoice.setAttribute('aria-describedby',bellNote.id);
 bellRemove.id='customer-remove-bell';bellRemove.type='button';bellRemove.textContent='Funkklingel entfernen';bellPicker.append(bellHeading,bellLabel,bellChoice,bellNote,bellRemove);
 bellAction.onclick=()=>{if(busy||!window.workshopReady||!parentConfigurationLoaded)return;bellPicker.hidden=!bellPicker.hidden;refresh();if(!bellPicker.hidden&&!bellChoice.disabled)bellChoice.focus({preventScroll:true});};
 bellClose.onclick=()=>{bellPicker.hidden=true;refresh();bellAction.focus({preventScroll:true});};
 bellChoice.addEventListener('input',event=>{event.stopPropagation();modelSelect.value=bellChoice.value;modelSelect.dispatchEvent(new Event('input',{bubbles:true}));if(document.querySelector('#bell-enabled').checked){bellPicker.hidden=true;selectedLayer='bell';layerOptionsHidden=false;preview()}refresh();});
 modelSelect.addEventListener('change',refresh);
 bellRemove.onclick=()=>document.querySelector('#remove-bell').click();
 const downloads=group('customer-downloads','Maßzeichnung herunterladen',[document.querySelector('.draft-download')]);
 const submit=document.querySelector('#save-template');fields.append(submit);submit.classList.add('customer-continue');
 const designAction=document.createElement('button');designAction.id='customer-start-design';designAction.type='button';designAction.className='customer-layer-action is-add';toolbar.append(designAction);
 designAction.onclick=()=>{if(busy||!window.workshopReady||!parentConfigurationLoaded||!form.reportValidity())return;try{const geometry=plates.validate(input());parent.postMessage({type:'gravuru-material-start-design',geometry},location.origin)}catch(error){status(error.message,true)}};
 // Product choices use the parent's existing validated material/process handlers.
 const productChoices=document.createElement('div');productChoices.className='customer-product-choices';
 productChoices.innerHTML='<h2>Material & Ausführung</h2><label>Material<select id="customer-material"><option value="edelstahl">Edelstahl</option><option value="acryl">Acrylglas</option></select></label><label>Bearbeitung<select id="customer-method"><option value="gravur">Mit Gravur</option><option value="druck">Farbdruck auf Acrylglas</option><option value="zuschnitt">Nur Zuschnitt · ohne Gestaltung</option></select></label>';
 basic.body.prepend(productChoices);
 const productMaterial=productChoices.querySelector('#customer-material'),productMethod=productChoices.querySelector('#customer-method');
 productMaterial.value=new URLSearchParams(location.search).get('material')||'edelstahl';productMethod.value=new URLSearchParams(location.search).get('bearbeitung')||'gravur';
 productMaterial.onchange=()=>parent.postMessage({type:'gravuru-product-change',material:productMaterial.value},location.origin);
 productMethod.onchange=()=>parent.postMessage({type:'gravuru-product-change',method:productMethod.value},location.origin);
 const series=document.createElement('details');series.className='customer-series';series.innerHTML='<summary>Für Unternehmen · Seriengestaltung</summary><label>Gestaltung der Serie<select id="customer-repeat"><option value="gleich">Gleiche Gestaltung für alle Stücke</option><option value="nummern">Fortlaufende Nummerierung</option></select></label>';fields.append(series);
 series.querySelector('select').onchange=event=>parent.postMessage({type:'gravuru-product-change',repeat:event.target.value},location.origin);
 const printInfo=document.createElement('details');printInfo.className='customer-series';printInfo.innerHTML='<summary>Hinweise zum Druckbild</summary><p>Beim Druck können leichte Streifenbildungen (Banding) auftreten. Bildschirm, Lichtquelle und Betrachtungswinkel beeinflussen die Farbdarstellung; das Druckergebnis kann abweichen.</p>';fields.append(printInfo);
 window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='gravuru-product-settings')return;const d=event.data;if(['edelstahl','acryl'].includes(d.material))productMaterial.value=d.material;if(['gravur','druck','zuschnitt'].includes(d.method))productMethod.value=d.method;if(['gleich','nummern'].includes(d.repeat))series.querySelector('select').value=d.repeat;series.hidden=!!d.b2c;printInfo.hidden=d.method!=='druck'});
 printInfo.hidden=productMethod.value!=='druck';
 function activateSection(section){for(const item of [basic,acrylic,bell])item.detail.open=item===section;if(fields.firstElementChild!==section.detail)fields.prepend(section.detail);}
 // Remove the now-empty original grid without removing any field.
 for(const grid of fields.querySelectorAll(':scope > .fields'))if(!grid.children.length)grid.remove();
 const dimensionHost=document.createElement('div');document.querySelector('#preview').after(dimensionHost);const dimensions=window.GravuruDimensions(dimensionHost,{read:input,material:productMaterial.value,select:key=>document.querySelector(key==='base'?'#select-steel':'#select-acrylic').click(),change:(key,axis,value)=>{const source=document.querySelector('#'+(key==='base'?(axis==='width'?'widthMm':'heightMm'):'acrylic-'+axis));source.value=value;source.dispatchEvent(new Event('input',{bubbles:true}))}});
 const removeBell=document.querySelector('#remove-bell');document.querySelector('#klingel-section').append(removeBell);
 let loaded=false,lastSelectedLayer=null;
 function refresh(){
  dimensions.refresh();
  basic.value.textContent=document.querySelector('#widthMm').value+' × '+document.querySelector('#heightMm').value+' mm';
  const count=document.querySelector('#holeCount').value,spacers=document.querySelector('#spacer-count').value;
  mounting.value.textContent=(count==='0'?'Ohne Bohrungen':count+' Bohrungen')+(spacers!=='0'?' · '+spacers+' Abstandshalter':'');
  const selected=document.querySelector('#bell-model');bell.value.textContent=selected.value?selected.selectedOptions[0]?.textContent:'Optional · Modell wählen';
  const hasBell=document.querySelector('#bell-enabled').checked,compatibility=document.querySelector('#bell-compatibility');
  bellAction.disabled=busy||!window.workshopReady||!parentConfigurationLoaded;bellAction.textContent=hasBell?'Funkklingel bearbeiten':'+ Funkklingel hinzufügen';bellAction.classList.toggle('is-add',!hasBell);bellAction.setAttribute('aria-expanded',String(!bellPicker.hidden));
  bellChoice.value=selected.value;bellChoice.disabled=selected.disabled||busy||!window.workshopReady||!parentConfigurationLoaded;
  bellRemove.hidden=!hasBell;bellRemove.disabled=busy||!window.workshopReady||!parentConfigurationLoaded;
  bellNote.textContent=!compatibility.hidden?compatibility.textContent:document.querySelector('#bell-selection-note').textContent||document.querySelector('#bell-model-size').textContent;
  bellNote.classList.toggle('error',!compatibility.hidden||!!document.querySelector('#bell-selection-note').textContent);
  acrylic.detail.hidden=acrylicNode.hidden;acrylic.value.textContent=acrylicEnabled.checked?'Mit Acrylauflage':'Optional · zweite Platte';
  acrylicAction.hidden=acrylicNode.hidden;
  acrylicAction.disabled=busy||!window.workshopReady||!parentConfigurationLoaded||acrylicNode.hidden;
  acrylicAction.textContent=acrylicEnabled.checked?'Acrylauflage bearbeiten':'+ Acrylauflage hinzufügen';
  acrylicAction.classList.toggle('is-add',!acrylicEnabled.checked);
  acrylicAction.setAttribute('aria-expanded',String(acrylic.detail.open));
  designAction.textContent=new URLSearchParams(location.search).get('bearbeitung')==='zuschnitt'?'Gravur hinzufügen':'Gestalten';designAction.disabled=busy||!window.workshopReady||!parentConfigurationLoaded||document.querySelector('#preview').classList.contains('invalid');
  if(selectedLayer!==lastSelectedLayer){lastSelectedLayer=selectedLayer;if(selectedLayer==='acrylic'&&acrylicEnabled.checked)activateSection(acrylic);else if(selectedLayer==='steel')activateSection(basic);else if(selectedLayer==='bell')activateSection(bell);}
  if(!loaded&&window.workshopReady){loaded=true;}
 }
 const originalPreview=preview;preview=function(){const result=originalPreview.apply(this,arguments);refresh();return result};
 new MutationObserver(refresh).observe(acrylicNode,{attributes:true,attributeFilter:['hidden']});
 form.addEventListener('invalid',event=>{let node=event.target.parentElement;while(node){if(node.tagName==='DETAILS')node.open=true;node=node.parentElement}},true);
 window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='gravuru-material-continue')form.requestSubmit(submit)});
 window.addEventListener('workshop-ready',refresh);refresh();
}
