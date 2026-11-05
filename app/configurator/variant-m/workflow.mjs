import {executionTabLabel} from './execution-registry.mjs';
import {installInlineMotifBrowser} from './inline-motif-browser.mjs';
import {installEditorOutsidePointer} from './editor-document-listener.mjs';
import {installRotationPolicy} from './rotation-policy.mjs';
import {customerLayoutIssue} from './contract.mjs';
import {canEditElement,legacyElementRights} from './element-rights.mjs';
import {layoutReviewIssues} from './layout-review.mjs';
import {objectSurface} from './surfaces.mjs';
import {captureDesignContent,carryDesignContent} from './design-content-transfer.mjs';
import {alignmentContent,uiIcon} from './ui-icons.mjs';
import {maskContourGuides} from './contour-guides.mjs';
import {placeNewMotif,MOTIF_MIN_MM} from './motif-placement.mjs';
import {installCompletion} from './completion.mjs';
import {transformedCorners} from './usability-model.mjs';
import {designArea} from './design-area.mjs';
import {doorbellTextSurface} from './product-view-module.mjs';
import {clampToAcrylic} from './edge-clamp.mjs';
import {createDragSnap,alignmentLabel} from './drag-assistance-model.mjs';
import {fitText,freePlacement,transferTexts,changedCustomerTexts,alignGroup,NO_FREE_SPACE_MESSAGE} from './workflow-model.mjs';
import {galleryOrder,productTheme,customerTexts,thumbnailSignature,thumbnailDesign,designLink} from './design-gallery-model.mjs';
import {textPaths,measureText,setTextSize} from '../../platform/sources/app/shared/models/text-paths.mjs';

export async function installWorkflow(api){
 const {el,r,profile,config,button,esc,mutate,selected,showTab,say,dialog}=api;
 const $=s=>r.querySelector(s),all=s=>[...r.querySelectorAll(s)];
 const style=document.createElement('style');style.textContent=await fetch('/configurator/variant-m/workflow.css').then(res=>{if(!res.ok)throw Error('Bedienung fehlt');return res.text();});r.append(style);
 installRotationPolicy(api);
 const chosenProfile=()=>el.uxSelectedProfile?.()||profile;
 // Existing layouts also put house numbers beside the device. The largest
 // free rectangle is an initial-placement aid, not the text resizing boundary.
 const textSurface=()=>config?.doorbell?.schema==='gravuru-doorbell/v1'
  ? doorbellTextSurface(chosenProfile()) : surface();
 const surface=()=>{const geometry=el.uxProfileGeometry?.()||profile.geometry;if(config?.doorbell?.schema==='gravuru-doorbell/v1'&&geometry.designArea){const a=geometry.designArea;return {...geometry,x:a.left,y:a.top,width:a.right-a.left,height:a.bottom-a.top};}return config?{x:0,y:0,...geometry}:profile.frames.find(f=>f.key===el.state.fkFrame).acrylic;};
 const obstacles=()=>{const bell=(el.uxProfileGeometry?.()||profile.geometry).bell;return (!config||config.doorbell)&&bell?[{x:bell.x+bell.width/2,y:bell.y+bell.height/2,w:bell.width,h:bell.height}]:[];};
 function rename(){const tab=$('#ux-tab-options');if(tab)tab.lastChild.textContent=executionTabLabel(config);const contents=$('[data-ux=contents]');if(contents)contents.innerHTML=uiIcon('layers')+'<span class="ux-tool-label">Ebenen</span> <span data-ux-count>('+el.state.objects.length+')</span>';if(contents){contents.setAttribute('aria-label','Ebenen ('+el.state.objects.length+')');contents.title='Ebenen ('+el.state.objects.length+')';}const d=$('.ux-contents-dialog');d?.setAttribute('aria-label','Ebenenverwaltung');if(d)d.querySelector('h2').textContent='Ebenenverwaltung';}
 rename();$('.fk-scope-note')?.setAttribute('hidden','');const mounting=$('[data-fk-mount-note]');if(mounting)mounting.classList.add('workflow-mount-note');
 const mountSelect=$('[data-fk-mount]');if(mountSelect){const label=mountSelect.closest('label');if(label){const caption=label.querySelector('span');if(caption)caption.textContent='Befestigungsart wählen';else if(label.firstChild?.nodeType===3)label.firstChild.textContent='Befestigungsart wählen ';}mountSelect.setAttribute('aria-label','Befestigungsart wählen');}
 // Guides no longer need a customer switch. Snapping is always available.
 $('.ux-guides-row').hidden=true;$('[data-setting=guides]').checked=false;$('[data-ux-guides]').checked=false;
 el.uxSuggestCenter=()=>{};$('.ux-center-proposal').hidden=true;
 let activeGuides=false,guideDetails={};
 el.uxGuideGesture=(active,details={})=>{activeGuides=active;guideDetails=details;};
 const guideGeometry=()=>el.uxProfileGeometry?.()||profile.geometry;
 const guideArea=()=>config?designArea(config,{geometry:guideGeometry()}):{left:surface().x,top:surface().y,right:surface().x+surface().width,bottom:surface().y+surface().height};
 if(window.GravuruGuided)el.uxDragSnap=createDragSnap(window.GravuruGuided,guideArea,guideGeometry);
 function guides(){
  const scene=$('.scene');if(!scene)return;scene.querySelectorAll('.ux-alignment-guides,.guided-alignment,.center-guides,[data-workflow-guides]').forEach(n=>n.remove());if(!activeGuides||guideDetails.kind!=='move'||!selected())return;
  const o=selected(),ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g');g.dataset.workflowGuides='';g.setAttribute('pointer-events','none');
  const line=(a,b)=>{const l=document.createElementNS(ns,'line');for(const [k,v]of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#e0457b','stroke-width':1,'vector-effect':'non-scaling-stroke'}))l.setAttribute(k,v);g.append(l);};
  const labels=[];
  for(const axis of ['x','y']){const t=guideDetails.locks?.[axis];if(!t||Math.abs(t.value-o[axis])>.05)continue;line(axis==='x'?{x:t.line,y:0}:{x:0,y:t.line},axis==='x'?{x:t.line,y:el.state.height}:{x:el.state.width,y:t.line});labels.push({text:alignmentLabel(t),point:axis==='x'?{x:t.line,y:o.y+o.h/2+4}:{x:o.x,y:t.line-4}});}
  maskContourGuides(g,surface());scene.append(g);
  const matrix=scene.getScreenCTM();if(!matrix)return;const inverse=matrix.inverse(),px=Math.hypot(matrix.a,matrix.b)||1,s=$('.stage').getBoundingClientRect();
  const point=(p,m)=>{const v=scene.createSVGPoint();v.x=p.x;v.y=p.y;return v.matrixTransform(m);};
  for(let i=0;i<labels.length;i++){
   const item=labels[i],width=Math.min(s.width-20,item.text.length*5.6+12),height=20,at=point(item.point,matrix);
   const screen={x:Math.max(s.left+width/2+6,Math.min(s.right-width/2-6,at.x)),y:Math.max(s.top+65,Math.min(s.bottom-height-6,at.y+i*23))},p=point(screen,inverse);
   const bg=document.createElementNS(ns,'rect');for(const [k,v]of Object.entries({x:p.x-width/2/px,y:p.y-height/2/px,width:width/px,height:height/px,rx:3/px,fill:'#c92d64'}))bg.setAttribute(k,v);g.append(bg);
   const text=document.createElementNS(ns,'text');for(const [k,v]of Object.entries({x:p.x,y:p.y+3.5/px,'text-anchor':'middle','font-size':11/px,'font-family':'Arial,sans-serif',fill:'white'}))text.setAttribute(k,v);text.textContent=item.text;g.append(text);
  }
 }
 // Capture before the old gesture listeners, including blank SVG/plate areas.
 r.addEventListener('pointerdown',e=>{if(e.button!==0||!e.target.closest('.stage,.c-large-preview'))return;if(e.target.closest('[data-object],[data-ux-handle],button,input,label,select,textarea,a'))return;el.state.selected=null;activeGuides=false;el.sync();},true);
 installEditorOutsidePointer(el,()=>{el.state.selected=null;activeGuides=false;el.sync();});
 function editText(id){if(el.uxEditText)return el.uxEditText(id);const o=el.state.objects.find(o=>o.id===id&&o.type==='text');if(!o||o.uxLocked)return;const full=$('.c-large-preview');if(full.open)full.close();showTab('text');el.state.selected=id;el.sync();const field=all('[data-ux-text]').find(f=>f.dataset.uxText===id);field?.scrollIntoView({block:'center',behavior:'smooth'});field?.focus({preventScroll:true});field?.setSelectionRange(0,field.value.length);}
 let tap=null;
 el.uxTextTap=id=>{const now=performance.now();if(tap?.id===id&&now-tap.time<900){tap=null;editText(id);}else tap={id,time:now};};
 r.addEventListener('dblclick',e=>{const id=e.target.closest('[data-object]')?.dataset.object;if(id)editText(id);},true);
 // Direct group alignment, independent of guide visibility.
 $('[data-ux=multi-center]').insertAdjacentHTML('beforebegin',button('multi-left',alignmentContent('left'),'aria-label="Ausgewählte Texte links bündig ausrichten" disabled'));
 $('[data-ux=multi-center]').insertAdjacentHTML('afterend',button('multi-right',alignmentContent('right'),'aria-label="Ausgewählte Texte rechts bündig ausrichten" disabled'));
 r.addEventListener('click',e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;if(!['multi-left','multi-right'].includes(key))return;const ids=all('[data-align-id]:checked').map(n=>n.dataset.alignId);if(ids.length<2)return;mutate(()=>alignGroup(el.state.objects,ids,key==='multi-left'?'left':'right',surface()));});
 const boundsCache=new Map();
 function bounds(o){const key=JSON.stringify([o.text,o.font,o.size,o.bold,o.italic,o.letterSpacing,o.textAnchor,o.lineHeight,o.w]);if(boundsCache.has(key))return boundsCache.get(key);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.style.cssText='position:absolute;visibility:hidden;width:1px;height:1px';svg.innerHTML='<g>'+textPaths(o,el.fontData)+'</g>';r.append(svg);const b=svg.firstElementChild.getBBox(),value={x:b.x,y:b.y,width:b.width,height:b.height};svg.remove();if(boundsCache.size>100)boundsCache.clear();boundsCache.set(key,value);return value;}
 el.uxAlign=mode=>{const o=selected();if(!o||o.uxLocked)return;mutate(()=>{const xs=transformedCorners(o,bounds(o)).map(p=>p.x),a=surface();o.x+=(mode==='left'?a.x-Math.min(...xs):mode==='right'?a.x+a.width-Math.max(...xs):a.x+a.width/2-(Math.min(...xs)+Math.max(...xs))/2);});};
 const fitted=new Map(),signature=o=>JSON.stringify([o.text,o.font,o.bold,o.italic,o.size,o.letterSpacing,o.textAnchor,o.lineHeight,o.w,el.state.fkFrame,el.state.mOptions,el.uxTextScale?.()||1]);
 const normalize=el.normalize;
 // Ü3.2: Autofit verkleinert bis zur Mindestgröße (K10: minTextMm des Verfahrensprofils, sonst 4 mm;
 // im Werkstatt-Editor 1 mm). Reicht das nicht, bleibt die Mindestgröße stehen und das Feld meldet
 // „Text zu lang“ (uxTextOverflow='length').
 el.normalize=function(...args){const result=normalize.apply(this,args);for(const o of this.state.objects.filter(o=>o.type==='text'&&el.uxCanEdit?.(o,'scale')!==false&&!o.uxLocked&&!o.technicalLocked&&!o.uxHidden&&o.text.trim())){try{if(config?.doorbell?.schema==='gravuru-doorbell/v1')clampToAcrylic(o,chosenProfile(),bounds(o));if(fitted.get(o.id)===signature(o))continue;const min=config?.workbench?.embedded?1:(el.uxMinTextMm||4)/(el.uxTextScale?.()||1),size=fitText(o,bounds(o),textSurface(),min,this.fontData);if(size!==null&&size<o.size){setTextSize(o,size);measureText(o,this.fontData);say('Text automatisch auf '+(size*(el.uxTextScale?.()||1)).toLocaleString('de-DE',{maximumFractionDigits:2})+' mm eingepasst.');}else if(size===null){if(o.size>min){setTextSize(o,min);measureText(o,this.fontData);}say('Text zu lang: Passt auch in der Mindestgröße von '+(min*(el.uxTextScale?.()||1)).toLocaleString('de-DE',{maximumFractionDigits:2})+' mm nicht auf die Fläche. Bitte kürzen.');}if(size===null)o.uxTextOverflow='length';else delete o.uxTextOverflow;}catch{say('Text konnte noch nicht automatisch eingepasst werden. Bitte Position prüfen.');}fitted.set(o.id,signature(o));}return result;};
 r.addEventListener('input',e=>{if(e.target.dataset.uxText){const o=el.state.objects.find(o=>o.id===e.target.dataset.uxText);if(o)o.uxCustomerText=true;}},true);
 let placementJob=Promise.resolve();
 // Chris 22./23.10.2026: Ein neues Element bekommt immer einen freien Platz – Suche über die ganze
 // Gestaltungsfläche innerhalb des Randes, danach schrittweise kleiner bis zur Mindestgröße (Text:
 // Mindestschriftgröße des Verfahrens, 3 mm; Motiv/Foto/Logo: MOTIF_MIN_MM längste Seite). Bestehende
 // Elemente werden nie verschoben. Erst wenn selbst bei Mindestgröße nichts frei ist: mittig, ausgewählt
 // und kurzer Hinweis (ersetzt die Regel vom 21.10.2026 „kein Hinweis“).
 const physicalScale=()=>el.uxTextScale?.()||1;
 function placementMinScale(o){
  if(o.type==='text'){const min=config?.workbench?.embedded?1:(el.uxMinTextMm||4)/physicalScale();return o.size>0?Math.min(1,min/o.size):1;}
  const longest=Math.max(o.w||0,o.h||0)*physicalScale();return longest>0?Math.min(1,MOTIF_MIN_MM/longest):1;
 }
 // Gestaltungsfläche innerhalb des Randes (design-area.mjs); Klingelschild-Altpfad: Acrylfläche des Rahmens.
 function placementSurface(){if(!config)return surface();const current=el.uxProfileGeometry?.()||surface(),geometry={...current,holes:[],shape:current.shape??profile.geometry.shape},a=designArea(config,{geometry});return {x:a.left,y:a.top,width:a.right-a.left,height:a.bottom-a.top,shape:geometry.shape,...(geometry.shape==='contour'||geometry.cornerRadiusMm>0?{geometry}:{})};}
 function shrinkTo(o,scale){if(o.type==='text')setTextSize(o,o.size*scale);o.w*=scale;o.h*=scale;}
 function place(o){
  if(o.type==='motif'&&config){say('Freie Fläche für das Motiv wird gesucht …');placementJob=placementJob.then(()=>placeNewMotif({...api},o,{minScale:placementMinScale(o)})).catch(()=>say('Freie Fläche konnte nicht geprüft werden. Bitte die Motivposition prüfen.'));return;}
  const hit=freePlacement(o,placementSurface(),el.state.objects,obstacles(),{minScale:placementMinScale(o)});
  if(hit){o.x=hit.x;o.y=hit.y;if(hit.scale<1){shrinkTo(o,hit.scale);say((o.type==='text'?'Text':'Element')+' in einer freien Fläche platziert – dafür verkleinert.');}}
  else{const f=surface();o.x=f.x+f.width/2;o.y=f.y+f.height/2;el.state.selected=o.id;say(NO_FREE_SPACE_MESSAGE);}
 }
 const may=(o,right)=>!o.uxLocked&&(config?.workshopElementRights?canEditElement(config,el.state.designId,o,right):legacyElementRights(o)[right]);
 const add=el.add;el.add=function(...args){
  if(args[0]?.type==='motif'&&Array.isArray(this.uxMotifChoiceIds)&&!this.uxMotifChoiceIds.includes(args[0].motif)){say('Dieses Motiv ist hier nicht verfügbar.');return;}
  const before=new Set(this.state.objects.map(o=>o.id));const result=add.apply(this,args);
  for(const o of this.state.objects.filter(o=>!before.has(o.id))){place(o);if(o.type==='text')o.uxCustomerText=true;}
  this.sync();return result;};
 // Gate progression on the completed placement and the current geometry.
 const layoutDialog=dialog('layout-check','Bitte Gestaltung prüfen','<div data-layout-problems></div>'+button('layout-fit','Automatisch einpassen')+button('close','Weiter bearbeiten'));
 const reviewIssues=()=>layoutReviewIssues({config,profile:chosenProfile(),objects:el.state.objects,design:chosenProfile().designs.find(d=>d.id===el.state.designId),resources:{motifs:config?.localResources?.motifs||[],fonts:el.fontData}});
 el.uxCheckLayout=async()=>{await placementJob;const issues=config?reviewIssues():[];if(!issues.length)return true;$('[data-layout-problems]').innerHTML=issues.map(i=>'<p>'+esc(i.message)+'</p>').join('');if(!layoutDialog.open)layoutDialog.showModal();return false;};
 r.addEventListener('click',event=>{if(event.target.closest('[data-ux=layout-fit]')){
  const issues=reviewIssues(),copies=el.state.objects.map(o=>({...o})),changed=new Set();
  // Keep motifs in place where possible: move text first; never rewrite the master.
  const ids=[...new Set(issues.flatMap(i=>i.code==='overlap'?[i.ids.find(id=>copies.find(o=>o.id===id)?.type==='text')||i.ids.at(-1)]:i.ids))];
  let failed=false;
  for(const id of ids){const o=copies.find(o=>o.id===id);if(!o||!may(o,'move')){failed=true;break;}
   const hit=freePlacement(o,placementSurface(),copies.filter(v=>objectSurface(v)===objectSurface(o)),obstacles(),{minScale:el.uxCanEdit?.(o,'scale')===false?1:placementMinScale(o)});
   if(!hit){failed=true;break;}o.x=hit.x;o.y=hit.y;if(hit.scale<1)shrinkTo(o,hit.scale);changed.add(id);
  }
  if(failed)return say('Nicht alles passt automatisch. Bitte den Text kürzen oder einzelne Elemente verschieben.');
  mutate(()=>{for(const o of el.state.objects)if(changed.has(o.id))Object.assign(o,copies.find(c=>c.id===o.id));});
  if(!reviewIssues().length){layoutDialog.close();say('Gestaltung eingepasst. Bitte noch einmal prüfen.');}else say('Bitte die übrigen markierten Elemente prüfen.');
 }});
 // New uploads use the same free-space search; replacements keep their position.
 let known=new Set(el.state.objects.map(o=>o.id));
 let changing=false;
 const choose=el.chooseDesign;
 el.chooseDesign=function(id){
  if(id===this.state.designId)return;
  const template=chosenProfile().designs.find(d=>d.id===id);if(!template)return;
  let next;
  try{next=carryDesignContent(captureDesignContent(this.state.objects,chosenProfile().designs.find(d=>d.id===this.state.designId)),template,config,{id:()=>this.id()});}
  catch(error){say(error.message);return false;}
  changing=true;
  try{choose.call(this,id,{carry:false});this.state.objects=next.objects;for(const key of next.added)place(this.state.objects.find(o=>o.id===key));known=new Set(this.state.objects.map(o=>o.id));this.normalize();this.sync();return true;}
  finally{changing=false;}
 };
 // The existing library replaces the Bestseller grid in the same panel.
 const panel=$('#panel-motif'),home=panel.parentElement,bestsellers=$('[data-bestsellers]');
 const entry=document.createElement('section');entry.className='workflow-motif-entry';entry.innerHTML='<h2>Dein passendes Motiv</h2><p>Suche nach einem Begriff oder entdecke die Kategorien.</p>'+button('discover-motifs','Alle Motive entdecken');home.append(entry);
 const count=$('[data-library-count]')?.textContent.match(/von\s+(\d+)/)?.[1];if(count)entry.querySelector('button').textContent='Alle '+count+' Motive entdecken';
 if(bestsellers)entry.prepend(bestsellers);panel.classList.add('workflow-motif-body');entry.append(panel);
 const pricing=$('.ux-motif-pricing');if(pricing)entry.prepend(pricing);
 const grid=$('[data-library-grid]');grid.classList.remove('ux-scroll-list');grid.classList.add('workflow-motif-grid');grid.removeAttribute('tabindex');
 panel.querySelector('.ux-list-edge')?.remove();const more=$('[data-library-more]');if(more)more.parentElement.hidden=false;
 const search=$('[data-library-search]'),searchHint=document.createElement('p');searchHint.id='ux-motif-search-hint';searchHint.className='ux-motif-search-hint';searchHint.textContent='Beschreibe einfach, was du suchst – du musst den genauen Motivnamen nicht kennen.';search.after(searchHint);search.setAttribute('aria-describedby',searchHint.id);
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
 // K9/Ü10.1: Designs des Produktthemas zuerst (Bestseller vorn, sonst Reihenfolge im Profil),
 // Designs anderer Themen eingeklappt unter „Weitere Designs“; Designs ohne Thema bleiben sichtbar.
 const gallery=$('.c-gallery');let moreExpanded=false,arranging=false;
 const moreToggle=document.createElement('button');moreToggle.type='button';moreToggle.className='workflow-more-designs';moreToggle.dataset.ux='more-designs';moreToggle.hidden=true;moreToggle.setAttribute('aria-expanded','false');
 ($('.ux-design-reveal')||gallery).after(moreToggle);
 function arrangeGallery(){if(arranging||!gallery)return;arranging=true;try{
  const order=galleryOrder(profile.designs,config?.designSelection==='all-approved'?null:productTheme(profile)),cards=new Map(all('.c-gallery [data-c-design]').map(c=>[c.dataset.cDesign,c]));
  const ordered=[...order.primary,...order.more].map(id=>cards.get(id)).filter(Boolean);
  if(ordered.some((card,i)=>gallery.children[i]!==card))for(const card of ordered)gallery.append(card);
  const more=new Set(order.more);let hiddenMore=0;
  for(const [id,card] of cards){
   const design=chosenProfile().designs.find(d=>d.id===id),bestseller=design?.bestseller===true;
   card.classList.toggle('is-bestseller',bestseller);
   if(bestseller&&!card.querySelector('[data-design-bestseller]')){const badge=document.createElement('span');badge.dataset.designBestseller='';badge.textContent='Bestseller';card.prepend(badge);}
   const tucked=more.has(id)&&!moreExpanded&&id!==el.state.designId;
   card.classList.toggle('is-more-design',more.has(id));
   if(tucked){card.hidden=true;hiddenMore++;}
  }
  moreToggle.hidden=!more.size;moreToggle.setAttribute('aria-expanded',String(moreExpanded));
  moreToggle.textContent=moreExpanded?'Weitere Designs ausblenden':'Weitere Designs anzeigen ('+(hiddenMore||more.size)+')';
 }finally{arranging=false;}}
 r.addEventListener('click',e=>{if(e.target.closest('[data-ux]')?.dataset.ux!=='more-designs')return;moreExpanded=!moreExpanded;el.sync();if(moreExpanded)requestAnimationFrame(()=>refreshThumbnails());});
 // Ü10.1: Miniaturen zeigen den aktuellen Kundentext (Textübernahme wie beim Designwechsel),
 // werden erst bei Sichtbarkeit gezeichnet und höchstens 24 je Durchlauf.
 const THUMBNAIL_BATCH=24;const seen=new Set();let thumbnailTimer=0,commitTimer=0;
 const currentTemplate=()=>chosenProfile().designs.find(d=>d.id===el.state.designId);
 const sourceTexts=()=>customerTexts(el.state.objects,currentTemplate());
 // Tippen zeichnet nicht bei jedem Zeichen neu: der Schlüssel folgt dem Kundentext mit 250 ms Verzögerung.
 let committed=thumbnailSignature(sourceTexts());
 el.uxThumbnailSignature=()=>{const live=thumbnailSignature(sourceTexts());if(live!==committed){clearTimeout(commitTimer);commitTimer=setTimeout(()=>{committed=live;refreshThumbnails();},250);}return committed;};
 el.uxThumbnailBudget=THUMBNAIL_BATCH;
 el.uxThumbnailDesign=design=>thumbnailDesign(design,sourceTexts(),o=>{measureText(o,el.fontData);try{const size=fitText(o,bounds(o),surface(),config?.workbench?.embedded?1:4/(el.uxTextScale?.()||1),el.fontData);if(size!==null&&size<o.size){setTextSize(o,size);measureText(o,el.fontData);}}catch{}});
 el.uxThumbnailDeferred=card=>!seen.has(card);
 const watcher=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{let due=false;for(const entry of entries){if(entry.isIntersecting){seen.add(entry.target);due=true;}else seen.delete(entry.target);}if(due)refreshThumbnails();},{rootMargin:'160px'}):null;
 function watchCards(){for(const card of all('[data-c-design]')){if(watcher){if(!card.dataset.thumbWatched){card.dataset.thumbWatched='';watcher.observe(card);}}else seen.add(card);}}
 function refreshThumbnails(){clearTimeout(thumbnailTimer);if(!el.isConnected)return;const pending=el.uxRefreshThumbnails?.()||0;if(pending>0)thumbnailTimer=setTimeout(refreshThumbnails,120);}
 new MutationObserver(()=>{watchCards();requestAnimationFrame(arrangeGallery);}).observe(gallery,{childList:true});watchCards();
 // Ü10.2: „Link zu diesem Design“ – Direktlink ohne Kundentext.
 const linkDialog=dialog('design-link','Link zu diesem Design','<p>Dieser Link öffnet den Editor mit dem gewählten Design und der gewählten Größe. Deine Texte werden nicht mitgeschickt.</p><input type="text" readonly data-design-link aria-label="Link zu diesem Design"><div class="ux-actions">'+button('copy-design-link','Link kopieren','class="ux-primary"')+button('close','Schließen')+'</div><p class="ux-small" data-design-link-status role="status"></p>');
 const shareButton=document.createElement('button');shareButton.type='button';shareButton.className='workflow-share-design';shareButton.dataset.ux='share-design';shareButton.textContent='Link zu diesem Design';
 // Chris 21.10.2026 („Wozu Link kopieren?“): Knopf wird nicht mehr angezeigt; Direktlinks (?design=) gelten weiter.
 void shareButton;
 function hostHref(){try{if(window.parent!==window&&window.parent.location.origin===location.origin)return window.parent.location.href;}catch{}return location.href;}
 r.addEventListener('click',async e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;
  if(key==='share-design'){const link=designLink(hostHref(),{designId:el.state.designId,sizeId:el.state.mOptions?.size||null});$('[data-design-link]').value=link;$('[data-design-link-status]').textContent='';linkDialog.showModal();$('[data-design-link]').select();}
  if(key==='copy-design-link'){const field=$('[data-design-link]');try{await navigator.clipboard.writeText(field.value);$('[data-design-link-status]').textContent='Link kopiert.';}catch{field.select();$('[data-design-link-status]').textContent='Bitte den Link markieren und kopieren.';}}
 });
 const render=el.render;el.render=function(...args){const v=render.apply(this,args);guides();return v;};
 const sync=el.sync;el.sync=function(...args){if(!changing)for(const o of this.state.objects)if(!known.has(o.id)&&o.uxUploadId)place(o);known=new Set(this.state.objects.map(o=>o.id));const v=sync.apply(this,args);rename();arrangeGallery();if($('#ux-size')){$('#ux-size').step=config?.workbench?.embedded?'.01':'1';if(r.activeElement!==$('#ux-size')&&selected()?.type==='text')$('#ux-size').value=el.uxDisplayTextSize(selected());}guides();return v;};
 await installCompletion(api);
 installInlineMotifBrowser({root:r,panel,bestsellers});
 el.sync();
}

