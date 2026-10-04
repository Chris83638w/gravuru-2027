import {installCompletion} from './completion.mjs';
import {transformedCorners} from './usability-model.mjs';
import {fitText,freePosition,transferTexts,alignGroup} from './workflow-model.mjs';
import {textPaths,measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';

export async function installWorkflow(api){
 const {el,r,profile,config,button,esc,mutate,selected,showTab,say,dialog}=api;
 const $=s=>r.querySelector(s),all=s=>[...r.querySelectorAll(s)];
 const style=document.createElement('style');style.textContent=await fetch('/configurator/variant-m/workflow.css').then(res=>{if(!res.ok)throw Error('Bedienung fehlt');return res.text();});r.append(style);
 const surface=()=>config?{x:0,y:0,...profile.geometry}:profile.frames.find(f=>f.key===el.state.fkFrame).acrylic;
 const obstacles=()=>!config&&profile.geometry.bell?[{x:profile.geometry.bell.x+profile.geometry.bell.width/2,y:profile.geometry.bell.y+profile.geometry.bell.height/2,w:profile.geometry.bell.width,h:profile.geometry.bell.height}]:[];
 function rename(){const tab=$('#ux-tab-options');if(tab)tab.lastChild.textContent='Ausführungen';const contents=$('[data-ux=contents]');if(contents)contents.innerHTML='Ebenenverwaltung <span data-ux-count>('+el.state.objects.length+')</span>';const d=$('.ux-contents-dialog');d?.setAttribute('aria-label','Ebenenverwaltung');if(d)d.querySelector('h2').textContent='Ebenenverwaltung';}
 rename();$('.fk-scope-note')?.setAttribute('hidden','');const mounting=$('[data-fk-mount-note]');if(mounting)mounting.classList.add('workflow-mount-note');
 const mountSelect=$('[data-fk-mount]');if(mountSelect){const label=mountSelect.closest('label');if(label){const caption=label.querySelector('span');if(caption)caption.textContent='Befestigungsart wählen';else if(label.firstChild?.nodeType===3)label.firstChild.textContent='Befestigungsart wählen ';}mountSelect.setAttribute('aria-label','Befestigungsart wählen');}
 $('.ux-preview-size>span:last-child').textContent='Zoom';$('.ux-preview-size input').setAttribute('aria-label','Zoom – Produktvorschau vergrößern');
 // Guides no longer need a customer switch. Snapping is always available.
 $('.ux-guides-row').hidden=true;$('[data-setting=guides]').checked=false;$('[data-ux-guides]').checked=false;
 el.uxSuggestCenter=()=>{};$('.ux-center-proposal').hidden=true;
 let activeGuides=false;
 el.uxGuideGesture=active=>{activeGuides=active;};
 function guides(){const scene=$('.scene');if(!scene)return;scene.querySelectorAll('.ux-alignment-guides,.guided-alignment,.center-guides,[data-workflow-guides]').forEach(n=>n.remove());if(!activeGuides||!selected())return;
  const o=selected(),targets=window.GravuruGuided.alignmentTargets({...el.state,objects:el.state.objects.filter(x=>!x.uxHidden)},o),ns='http://www.w3.org/2000/svg';const g=document.createElementNS(ns,'g');g.dataset.workflowGuides='';g.setAttribute('pointer-events','none');
  for(const axis of ['x','y'])for(const t of targets[axis].filter(t=>t.key.startsWith('plate-')||Math.abs(t.value-o[axis])<.05)){const l=document.createElementNS(ns,'line'),vertical=axis==='x';for(const [k,v]of Object.entries({x1:vertical?t.line:0,y1:vertical?0:t.line,x2:vertical?t.line:el.state.width,y2:vertical?el.state.height:t.line,stroke:'#278a72','stroke-width':1,'stroke-dasharray':'4 3','vector-effect':'non-scaling-stroke'}))l.setAttribute(k,v);g.append(l);}scene.append(g);
 }
 // Capture before the old gesture listeners, including blank SVG/plate areas.
 r.addEventListener('pointerdown',e=>{if(e.button!==0||!e.target.closest('.stage,.c-large-preview'))return;if(e.target.closest('[data-object],[data-ux-handle],button,input,label,select,textarea,a'))return;el.state.selected=null;activeGuides=false;el.sync();},true);
 document.addEventListener('pointerdown',e=>{if(e.composedPath().includes(el))return;el.state.selected=null;activeGuides=false;el.sync();});
 function editText(id){if(el.uxEditText)return el.uxEditText(id);const o=el.state.objects.find(o=>o.id===id&&o.type==='text');if(!o||o.uxLocked)return;const full=$('.c-large-preview');if(full.open)full.close();showTab('text');el.state.selected=id;el.sync();const field=all('[data-ux-text]').find(f=>f.dataset.uxText===id);field?.scrollIntoView({block:'center',behavior:'smooth'});field?.focus({preventScroll:true});field?.setSelectionRange(0,field.value.length);}
 let tap=null;
 el.uxTextTap=id=>{const now=performance.now();if(tap?.id===id&&now-tap.time<900){tap=null;editText(id);}else tap={id,time:now};};
 r.addEventListener('dblclick',e=>{const id=e.target.closest('[data-object]')?.dataset.object||(e.target.closest('.plate-holder')?selected()?.id:null);if(id)editText(id);},true);
 // Direct group alignment, independent of guide visibility.
 $('[data-ux=multi-center]').insertAdjacentHTML('beforebegin',button('multi-left','Links bündig')+button('multi-right','Rechts bündig'));
 r.addEventListener('click',e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;if(!['multi-left','multi-right'].includes(key))return;const ids=all('[data-align-id]:checked').map(n=>n.dataset.alignId);mutate(()=>alignGroup(el.state.objects,ids,key==='multi-left'?'left':'right',surface()));});
 const boundsCache=new Map();
 function bounds(o){const key=JSON.stringify([o.text,o.font,o.size,o.bold]);if(boundsCache.has(key))return boundsCache.get(key);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.style.cssText='position:absolute;visibility:hidden;width:1px;height:1px';svg.innerHTML='<g>'+textPaths(o,el.fontData)+'</g>';r.append(svg);const b=svg.firstElementChild.getBBox(),value={x:b.x,y:b.y,width:b.width,height:b.height};svg.remove();if(boundsCache.size>100)boundsCache.clear();boundsCache.set(key,value);return value;}
 el.uxAlign=mode=>{const o=selected();if(!o||o.uxLocked)return;mutate(()=>{const xs=transformedCorners(o,bounds(o)).map(p=>p.x),a=surface();o.x+=(mode==='left'?a.x-Math.min(...xs):mode==='right'?a.x+a.width-Math.max(...xs):a.x+a.width/2-(Math.min(...xs)+Math.max(...xs))/2);});};
 const fitted=new Map(),signature=o=>JSON.stringify([o.text,o.font,o.bold,o.size,el.state.fkFrame,el.uxTextScale?.()||1]);
 const normalize=el.normalize;
 el.normalize=function(...args){const result=normalize.apply(this,args);for(const o of this.state.objects.filter(o=>o.type==='text'&&el.uxCanEdit?.(o,'scale')!==false&&!o.uxLocked&&!o.technicalLocked&&!o.uxHidden&&o.text.trim())){try{if(fitted.get(o.id)===signature(o))continue;const size=fitText(o,bounds(o),surface(),config?.workbench?.embedded?1:4/(el.uxTextScale?.()||1));if(size!==null&&size<o.size){o.size=size;measureText(o,this.fontData);say('Text automatisch auf '+(size*(el.uxTextScale?.()||1)).toLocaleString('de-DE',{maximumFractionDigits:2})+' mm eingepasst.');}else if(size===null)say('Dieser Text passt bei lesbarer Mindestgröße nicht auf die Fläche. Bitte Text kürzen oder verschieben.');}catch{say('Text konnte noch nicht automatisch eingepasst werden. Bitte Position prüfen.');}fitted.set(o.id,signature(o));}return result;};
 r.addEventListener('input',e=>{if(e.target.dataset.uxText){const o=el.state.objects.find(o=>o.id===e.target.dataset.uxText);if(o)o.uxCustomerText=true;}},true);
 function place(o){const p=freePosition(o,surface(),el.state.objects,obstacles());if(p)Object.assign(o,p);else say('Kein ausreichend freier Platz gefunden. Das neue Element ist ausgewählt; bitte positioniere oder verkleinere es.');}
 const add=el.add;el.add=function(...args){const before=new Set(this.state.objects.map(o=>o.id));const result=add.apply(this,args);for(const o of this.state.objects.filter(o=>!before.has(o.id))){place(o);if(o.type==='text')o.uxCustomerText=true;}this.sync();return result;};
 // New uploads use the same free-space search; replacements keep their position.
 let known=new Set(el.state.objects.map(o=>o.id));
 const transfer=dialog('design-transfer','Design wechseln','<p>Deine Texte im neuen Design verwenden? Schrift und Anordnung kommen von der neuen Vorlage.</p>'+button('transfer-yes','Deine Texte übernehmen','class="ux-primary"')+button('transfer-no','Beispieltexte verwenden')+button('close','Abbrechen'));
 let requestedDesign=null,changing=false;
 const choose=el.chooseDesign;
 function finishChange(carry){const source=el.state.objects.filter(o=>o.type==='text'),id=requestedDesign;requestedDesign=null;if(!id)return;transfer.close();changing=true;try{choose.call(el,id);if(carry){const target=el.state.objects;const unmatched=transferTexts(source,target);const kept=[];for(const old of unmatched){let existing=target.find(o=>o.id===old.id);if(!existing){existing={...old,id:el.id(),uxPersonal:true,uxCustomerText:true};target.push(existing);place(existing);}kept.push(old.text);}if(kept.length)say('Zusätzliche Texte erhalten: '+kept.map(t=>'„'+t+'“').join(', ')+'. Bitte die Position prüfen.');}known=new Set(el.state.objects.map(o=>o.id));el.normalize();el.sync();}finally{changing=false;}}
 el.chooseDesign=function(id){if(id===this.state.designId)return;const template=profile.designs.find(d=>d.id===this.state.designId);const changed=this.state.objects.some(o=>o.type==='text'&&(o.uxCustomerText||o.uxPersonal||o.text!==template?.objects.find(t=>t.fieldKey&&t.fieldKey===o.fieldKey)?.text));if(changed){requestedDesign=id;transfer.showModal();return;}changing=true;try{return choose.call(this,id);}finally{known=new Set(this.state.objects.map(o=>o.id));changing=false;}};
 r.addEventListener('click',e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;if(key==='transfer-yes'||key==='transfer-no')finishChange(key==='transfer-yes');});
 transfer.addEventListener('close',()=>{requestedDesign=null;});
 // Full motif browser: existing controls and event handlers move intact.
 const panel=$('#panel-motif'),home=panel.parentElement,bestsellers=$('[data-bestsellers]');
 const browser=dialog('motif-browser','Motive entdecken','<div class="workflow-motif-body"></div>');
 const entry=document.createElement('section');entry.className='workflow-motif-entry';entry.innerHTML='<h2>Dein passendes Motiv</h2><p>Suche nach einem Begriff oder entdecke die Kategorien.</p>'+button('discover-motifs','Alle Motive entdecken','class="ux-primary"');home.append(entry);const count=$('[data-library-count]')?.textContent.match(/von\s+(\d+)/)?.[1];if(count)entry.querySelector('button').textContent='Alle '+count+' Motive entdecken';if(bestsellers)entry.prepend(bestsellers);browser.querySelector('.workflow-motif-body').append(panel);
 const grid=$('[data-library-grid]'),more=$('[data-library-more]');grid.classList.remove('ux-scroll-list');grid.classList.add('workflow-motif-grid');grid.removeAttribute('tabindex');
 let browserScroll=0;browser.addEventListener('close',()=>{browserScroll=browser.scrollTop;});
 const openBrowser=()=>{browser.showModal();requestAnimationFrame(()=>{browser.scrollTop=browserScroll;loadMore();});};
 const loadMore=()=>{if(browser.open&&!more.hidden&&browser.scrollTop+browser.clientHeight>=browser.scrollHeight-250)more.click();};
 browser.addEventListener('scroll',loadMore,{passive:true});let refill=false;new MutationObserver(()=>{if(refill)return;refill=true;requestAnimationFrame(()=>{refill=false;loadMore();});}).observe(grid,{childList:true});
 r.addEventListener('click',e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;if(key==='discover-motifs')openBrowser();if(key==='category-pick')browserScroll=0;if(e.target.closest('[data-motif]')&&browser.open){browser.close();el.state.selected=selected()?.id;el.sync();}});
 const categoryDialog=$('.ux-categories-dialog');
 // Category chooser temporarily replaces the browser; reopen it after selection/cancel.
 categoryDialog.addEventListener('close',()=>{if(home.closest('[hidden]'))return;openBrowser();});
 // Previews use existing rendered vectors, never newly generated design artwork.
 const designPreview=dialog('design-preview','Designvorschau','<div data-design-preview-art></div>'+button('preview-use','Dieses Design verwenden','class="ux-primary"'));
 let previewId=null,hoverTimer;const hover=document.createElement('div');hover.className='workflow-hover-preview';hover.hidden=true;r.append(hover);
 function previewCard(card){previewId=card.dataset.cDesign;$('[data-design-preview-art]').innerHTML=card.querySelector('svg')?.outerHTML||'';designPreview.showModal();}
 function decorate(){for(const card of all('[data-c-design]'))if(!card.querySelector('[data-design-enlarge]')){const span=document.createElement('span');span.dataset.designEnlarge='';span.setAttribute('role','button');span.tabIndex=0;span.setAttribute('aria-label','Design vergrößern: '+(card.querySelector('span')?.textContent||''));span.textContent='↗ Vorschau';card.append(span);}}
 r.addEventListener('click',e=>{const trigger=e.target.closest('[data-design-enlarge]');if(trigger){e.preventDefault();e.stopImmediatePropagation();previewCard(trigger.closest('[data-c-design]'));}},true);
 r.addEventListener('keydown',e=>{if(e.target.matches('[data-design-enlarge]')&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();previewCard(e.target.closest('[data-c-design]'));}},true);
 r.addEventListener('pointerover',e=>{const card=e.target.closest('[data-c-design]');if(!card||!matchMedia('(hover:hover)').matches)return;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{hover.innerHTML=card.querySelector('svg')?.outerHTML||'';hover.hidden=false;const b=card.getBoundingClientRect();hover.style.left=Math.max(8,Math.min(innerWidth-260,b.left-270))+'px';hover.style.top=Math.max(8,Math.min(innerHeight-330,b.top))+'px';},400);});
 r.addEventListener('pointerout',e=>{const card=e.target.closest('[data-c-design]');if(card&&!card.contains(e.relatedTarget)){clearTimeout(hoverTimer);hover.hidden=true;}});
 r.addEventListener('click',e=>{hover.hidden=true;if(e.target.closest('[data-ux=preview-use]')){designPreview.close();el.chooseDesign(previewId);}});
 new MutationObserver(decorate).observe($('.c-gallery'),{childList:true});decorate();
 const render=el.render;el.render=function(...args){const v=render.apply(this,args);guides();return v;};
 const sync=el.sync;el.sync=function(...args){if(!changing)for(const o of this.state.objects)if(!known.has(o.id)&&o.uxUploadId)place(o);known=new Set(this.state.objects.map(o=>o.id));const v=sync.apply(this,args);rename();if($('#ux-size')){$('#ux-size').step='.01';if(r.activeElement!==$('#ux-size')&&selected()?.type==='text')$('#ux-size').value=el.uxDisplayTextSize(selected());}guides();return v;};
 for(const d of [transfer,browser,designPreview])d.addEventListener('click',e=>{if(e.target!==d)return;const b=d.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)d.close();});
 await installCompletion(api);
 el.sync();
}
