import {alignmentContent} from './ui-icons.mjs';
import {showOverlapWarnings,editableTexts,centerTexts,mechanicalHints,hintKey,motifScore,templateOverlap} from './customer-tools-model.mjs';
import {themeDefinition,orderMotifCategories} from './design-gallery-model.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';

export async function installCustomerTools(api){
 const {el,r,profile,config,button,esc,mutate,selected,say,dialog}=api;
 const $=s=>r.querySelector(s),all=s=>[...r.querySelectorAll(s)];
 const response=await fetch('/configurator/variant-m/customer-tools.css');if(!response.ok)throw Error('Neue Bedienoberfläche fehlt.');
 const style=document.createElement('style');style.textContent=await response.text();r.append(style);
 $('.ux-alignment-help')?.remove();
 const name=o=>o.type==='text'?`Text „${o.text||'Leer'}“`:o.uxUploadKind==='photo'?'Dein Foto':o.uxUploadKind==='logo'?'Dein Logo':o.type==='photoSlot'?'Foto':el.catalog.motif_labels?.[o.motif]||'Motiv';
 // White engraving is visible on dark materials too. Make vector ink black only
 // for the existing collision mask; uploaded photo paper keeps its own pixels.
 // Leerer Fotobereich (nur Platzhalter/Musterfoto) wird nicht graviert: keine Überlagerung melden – erst das
 // hochgeladene Foto zählt (Chris 20.10.2026: Warnhinweis nur pixelgenau).
 el.uxCollisionSVG=o=>{if(o.uxHidden||o.uxDecoration||o.type==='photoSlot'&&!o.uxUploadId)return '';const svg=el.objectSVG(o);return o.uxUploadId?svg:svg.replace(/(fill|stroke)="(?:#fff(?:fff)?|white|#f[0-9a-f]{5})"/gi,'$1="#000000"');};
 let multi=false;const ids=new Set();
 const alignment=document.createElement('section');alignment.className='ux-multi-align';
 alignment.innerHTML=button('multi-texts','Mehrere Texte auswählen','aria-pressed="false"')+'<div data-multi-body hidden><p>Texte hier oder auf dem Schild auswählen. Höhen und Abstände bleiben erhalten.</p><div data-multi-list></div>'+'<div class="ux-group-align" role="group" aria-label="Ausgewählte Texte ausrichten">'+button('multi-center',alignmentContent('center'),'aria-label="Ausgewählte Texte mittig ausrichten" disabled')+'</div>'+'</div>';
 $('[data-ux=add-text]').after(alignment);
 const proposal=document.createElement('div');proposal.className='ux-center-proposal';proposal.hidden=true;proposal.innerHTML='<span>Dieses Element genau mittig ausrichten?</span>'+button('suggest-center','Ja, mittig ausrichten')+button('keep-center','Position beibehalten');$('.ux-preview').append(proposal);let proposedId=null;
 el.uxSuggestCenter=o=>{proposedId=o&&Math.abs(o.x-el.state.width/2)<=4&&Math.abs(o.x-el.state.width/2)>.05?o.id:null;proposal.hidden=!proposedId;};
 r.addEventListener('click',e=>{const action=e.target.closest('[data-ux]')?.dataset.ux;if(action==='keep-center'||action==='suggest-center'){const o=el.state.objects.find(o=>o.id===proposedId);if(action==='suggest-center'&&o&&!o.uxLocked)mutate(()=>o.x=el.state.width/2);proposedId=null;proposal.hidden=true;}});
 function toggleText(id){if(!multi||!editableTexts(el.state.objects).some(o=>o.id===id))return false;ids.has(id)?ids.delete(id):ids.add(id);el.sync();return true;}
 el.uxToggleTextSelection=toggleText;
 function updateAlignment(){const texts=editableTexts(el.state.objects);for(const id of ids)if(!texts.some(o=>o.id===id))ids.delete(id);
  $('[data-multi-list]').innerHTML=texts.map(o=>`<label><input type="checkbox" data-align-id="${esc(o.id)}" ${ids.has(o.id)?'checked':''}>${esc(name(o))}</label>`).join('');
  for(const control of all('.ux-group-align button'))control.disabled=ids.size<2;
 }
 r.addEventListener('change',e=>{if(e.target.matches('[data-align-id]'))toggleText(e.target.dataset.alignId);});
 r.addEventListener('click',e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;
  if(key==='multi-texts'){multi=!multi;ids.clear();$('[data-multi-body]').hidden=!multi;$('[data-ux=multi-texts]').setAttribute('aria-pressed',String(multi));el.sync();}
  if(key==='multi-center'&&ids.size>1){mutate(()=>centerTexts(el.state.objects,[...ids],el.state.width/2));say('Ausgewählte Texte mittig ausgerichtet. Höhen und Abstände bleiben erhalten.');}
 });

 // Ask after applying the chosen font to the original text. Keep locked/hidden texts unchanged.
 const fontDialog=dialog('font-transfer','Schrift auf weitere Texte übertragen?', '<p>Wähle die Texte, die dieselbe Schrift erhalten sollen.</p><label class="ux-font-all"><input type="checkbox" data-font-all checked>Alle auswählen</label><div data-font-targets></div><div class="ux-font-transfer-actions">'+button('close','Nur diesen Text ändern')+button('font-transfer-apply','Auf ausgewählte Texte übertragen','class="ux-primary"')+'</div>');
 r.addEventListener('change',event=>{if(event.target.matches('[data-font-all]'))for(const input of all('[data-font-target]'))input.checked=event.target.checked;else if(event.target.matches('[data-font-target]')){const inputs=all('[data-font-target]'),selected=inputs.filter(input=>input.checked).length,master=$('[data-font-all]');master.checked=selected===inputs.length;master.indeterminate=selected>0&&selected<inputs.length;}});
 let transferFont='';
 r.addEventListener('click',e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;
  if(key==='font-apply'){const source=selected();if(!source||source.type!=='text')return;transferFont=source.font;const others=editableTexts(el.state.objects).filter(o=>o.id!==source.id);if(!others.length)return;
   $('[data-font-targets]').innerHTML=others.map(o=>`<label><input type="checkbox" data-font-target="${esc(o.id)}" checked>${esc(name(o))}</label>`).join('');$('[data-font-all]').checked=true;$('[data-font-all]').indeterminate=false;fontDialog.showModal();
  }
  if(key==='font-transfer-apply'){const targets=new Set(all('[data-font-target]:checked').map(n=>n.dataset.fontTarget));let skipped=0;mutate(()=>{for(const o of editableTexts(el.state.objects).filter(o=>targets.has(o.id))){try{const next={...o,font:transferFont};measureText(next,el.fontData);Object.assign(o,next);}catch{skipped++;}}});fontDialog.close();say(skipped?`Schrift übernommen. ${skipped} Text(e) enthalten nicht unterstützte Zeichen und bleiben unverändert.`:'Schrift auf die ausgewählten Texte übertragen.');}
 });

 // A blank click is dismissal; controls and active gestures keep their selection.
 function blank(e){if(e.button!==0||e.target.closest('button,input,textarea,select,label,a,summary,dialog,.ux-editor,[data-object],[data-ux-handle]'))return;
  if(!e.target.closest('.ux-preview,.stage,.stage-wrap,.plate-holder,.ux-shell,.c-large-preview'))return;
  el.state.selected=null;el.centerSuggestion=null;ids.clear();el.sync();
  proposedId=null;proposal.hidden=true;
 }
 r.addEventListener('pointerdown',blank);
 for(const d of all('.ux-dialog')){let outside=false;const isOutside=e=>{const b=d.getBoundingClientRect();return e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom;};d.addEventListener('pointerdown',e=>{outside=e.target===d&&isOutside(e);});d.addEventListener('click',e=>{if(outside&&e.target===d&&isOutside(e))d.close();outside=false;});}

 const search=$('[data-library-search]'),category=$('[data-library-category]');
 category?.addEventListener('change',()=>{search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));},true);
 // Renderer supplies semantic matching through this callback; no upload or paid API.
 // K9/V4: Motivkategorien des Produktthemas (`config.themes` aus themen.json) zuerst.
 const theme=themeDefinition(config,profile);
 el.uxMotifScore=(entry,query)=>motifScore(entry,query,theme);
 if(category&&theme?.motifCategories?.length){
  const options=[...category.options],ordered=orderMotifCategories(options.map(o=>o.value),theme);
  const byValue=new Map(options.map(o=>[o.value,o])),current=category.value;
  for(const value of ordered){const option=byValue.get(value);if(option&&option.value!==''){category.append(option);}}
  const empty=options.find(o=>o.value==='');if(empty)category.prepend(empty);
  category.value=current;
 }

 const hintsPanel=document.createElement('section');hintsPanel.className='ux-conflict-hints';hintsPanel.setAttribute('aria-label','Hinweise zur Gestaltung');$('.ux-preview').append(hintsPanel);
 const ignored=new Set();let hints=[],shown=null;
 r.addEventListener('click',e=>{if(!e.target.closest('.completion-finish,.fk-buy-button'))return;const issue=mechanicalHints(profile,el.state)[0];if(!issue)return;e.preventDefault();e.stopImmediatePropagation();say(issue.message);},true);
 let requested='',timer,serial=0,checkError='';
 function scheduleCheck(){if(!showOverlapWarnings(config?.profile||profile)){clearTimeout(timer);serial++;checkError='';return;}const key=JSON.stringify([el.state.width,el.state.height,el.state.objects]);if(key===requested)return;requested=key;checkError='';clearTimeout(timer);const run=++serial;
  timer=setTimeout(async()=>{const objects=el.state.objects.map(o=>({...o})),w=el.state.width,h=el.state.height,scale=Math.min(12,1400/Math.max(w,h)),pw=Math.ceil(w*scale),ph=Math.ceil(h*scale);const svgs=objects.map(o=>`<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${w} ${h}">${el.uxCollisionSVG(o)}</svg>`);
   try{const masks=[];for(const svg of svgs){if(run!==serial||!el.isConnected)return;const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=pw;canvas.height=ph;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,pw,ph);masks.push(window.GravuruEditorRefinement.inkMask(ctx.getImageData(0,0,pw,ph).data));}finally{URL.revokeObjectURL(url);}}
    if(run!==serial)return;const pairs=window.GravuruEditorRefinement.collisions(masks,Math.max(4,Math.ceil(scale*scale*.015)));el.uxOverlapResult={key,ids:pairs.map(pair=>pair.map(i=>objects[i].id))};updateHints();
   }catch{if(run!==serial)return;checkError='Überlagerungen konnten nicht geprüft werden. Bitte die Vorschau kontrollieren.';updateHints();}
  },180);
 }
 function currentHints(){const key=JSON.stringify([el.state.width,el.state.height,el.state.objects]);const overlaps=showOverlapWarnings(config?.profile||profile)&&el.uxOverlapResult?.key===key?el.uxOverlapResult.ids.filter(ids=>ids.every(id=>el.state.objects.some(o=>o.id===id&&!o.uxHidden))&&!(config?.acrylic&&ids.includes("photo-frame")&&ids.includes("photo-main"))&&!templateOverlap(ids,el.state.objects,(config?.profile||profile)?.designs?.find(d=>d.id===el.state.designId))).map(ids=>({code:'overlap',ids,message:'Die markierten Elemente überlagern sich. Ist das beabsichtigt, kannst du diesen Hinweis ignorieren.'})):[];
  return [...overlaps,...mechanicalHints(profile,el.state)].map(h=>({...h,key:hintKey(h,el.state.objects,[el.state.designId,el.state.fkFrame,el.state.fkMounting])}));}
 function draw(){const scene=$('.scene');scene?.querySelector('[data-customer-highlights]')?.remove();if(!scene)return;const ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g');group.dataset.customerHighlights='';group.setAttribute('pointer-events','none');
  const marked=new Set([...(multi?ids:[]),...(shown?.ids||[])]);
  for(const o of el.state.objects.filter(o=>marked.has(o.id))){const rect=document.createElementNS(ns,'rect');for(const [key,v]of Object.entries({x:-o.w/2-1,y:-o.h/2-1,width:o.w+2,height:o.h+2,transform:`translate(${o.x} ${o.y}) rotate(${o.rotation||0})`,fill:'none',stroke:multi&&ids.has(o.id)?'#17745b':'#c47a13','stroke-width':2,'vector-effect':'non-scaling-stroke','stroke-dasharray':'5 3'}))rect.setAttribute(key,v);group.append(rect);}
  if(shown?.hole){const circle=document.createElementNS(ns,'circle');for(const [key,v]of Object.entries({cx:shown.hole.x,cy:shown.hole.y,r:shown.hole.radius+1,fill:'none',stroke:'#c47a13','stroke-width':2,'vector-effect':'non-scaling-stroke'}))circle.setAttribute(key,v);group.append(circle);}scene.append(group);
 }
 function updateHints(){hints=currentHints();const valid=new Set(hints.map(h=>h.key));const checked=el.uxOverlapResult?.key===JSON.stringify([el.state.width,el.state.height,el.state.objects]);for(const key of ignored)if(!valid.has(key)&&checked)ignored.delete(key);if(shown&&!valid.has(shown.key))shown=null;
  const active=hints.filter(h=>h.code==='mounting-access'||!ignored.has(h.key));hintsPanel.hidden=!hints.length&&!checkError;
  hintsPanel.innerHTML=(checkError?`<p role="status">${esc(checkError)}</p>`:'')+active.map(h=>{const i=hints.indexOf(h);return `<div class="ux-conflict"><strong>${h.code==='overlap'?'Überlagerung':'Befestigung prüfen'}</strong><p>${esc(h.ids.map(id=>name(el.state.objects.find(o=>o.id===id))).join(' und '))}</p><p>${esc(h.message)}</p><div>${button('show-conflict','Betroffene Stellen anzeigen',`data-hint="${i}"`)}${h.code==='mounting-access'?'':button('ignore-conflict','Warnung ignorieren',`data-hint="${i}"`)}</div></div>`;}).join('')+(ignored.size?button('restore-conflicts',`${ignored.size} ignorierte Hinweise wieder anzeigen`):'');draw();
 }
 r.addEventListener('click',e=>{const b=e.target.closest('[data-ux]');if(!b)return;
  if(b.dataset.ux==='show-conflict'){shown=hints[Number(b.dataset.hint)];draw();}
  if(b.dataset.ux==='ignore-conflict'){const hint=hints[Number(b.dataset.hint)];if(hint&&hint.code!=='mounting-access')ignored.add(hint.key);shown=null;updateHints();}
  if(b.dataset.ux==='restore-conflicts'){ignored.clear();updateHints();}
 });
 const sync=el.sync;el.sync=function(...args){const value=sync.apply(this,args);updateAlignment();updateHints();scheduleCheck();return value;};
 const render=el.render;el.render=function(...args){const value=render.apply(this,args);draw();return value;};
 updateAlignment();updateHints();scheduleCheck();
}

