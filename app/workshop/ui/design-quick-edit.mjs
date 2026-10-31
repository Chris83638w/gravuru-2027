// Schnellbearbeitung direkt in der Designkachel: Texte und Motive verschieben,
// vergrößern/verkleinern und speichern, ohne den großen Editor zu öffnen.
// Nutzt ausschließlich die bestehenden Katalog-Editor-Endpunkte (öffnen, Vorschau,
// Größenprüfung, Speichern). Es gibt keine eigene Fachlogik: Prüfung, Rückrechnung
// in den Master und Freigabe-Rücksetzung bleiben serverseitig.
import {merchantRequest} from './merchant-request.mjs';

const editable=o=>o&&!o.technicalLocked&&o.role!=='guide'&&o.type!=='photoSlot';
const notFitting=fit=>(fit?.sizes??[]).filter(row=>!['ok','fits','pass','passt','prüfen','warning','review'].includes(row.status));

export function installQuickEdit({csrf,onSaved=()=>{},onOpenEditor=()=>{},onChange=()=>{},documentImpl=globalThis.document}={}){
 let active=null,helpers=null;
 async function call(url,{method='GET',body}={}){
  const response=await merchantRequest(url,{method,headers:body?{'Content-Type':'application/json','X-Gravuru-CSRF':csrf()}:{},body:body?JSON.stringify(body):undefined});
  const value=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(Error(value.error?.message||'Die Schnellbearbeitung ist fehlgeschlagen.'),{status:response.status});
  return value;
 }
 async function load(){
  // Lazy: nur die Kachel im Bearbeitungsmodus braucht Auswahlrahmen und Textmaße.
  if(!helpers){
   const [selection,arrows,text]=await Promise.all([import('./editor-selection.mjs'),import('../../configurator/variant-m/selection-arrows.mjs'),import('../../platform/sources/app/shared/models/doorbell-preview.mjs')]);
   helpers={drawSelection:selection.drawSelection,scaleFactor:arrows.selectionScaleFactor,measureText:text.measureText,setTextSize:text.setTextSize};
  }
  return helpers;
 }
 const el=(tag,text,cls)=>{const n=documentImpl.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;};

 function body(a){return {reihe:a.reihe,id:a.id,checksum:a.checksum,document:a.draft};}
 const design=a=>a.draft.config.profile.designs[0];
 function say(a,text,error=false){a.status.textContent=text;a.status.classList.toggle('error',error);}
 function sync(a){
  a.save.disabled=a.busy||!a.dirty;a.discard.disabled=a.busy;a.undo.disabled=a.busy||!a.history.length;
  a.save.textContent=a.confirm?'Trotzdem speichern':'Speichern';
  a.card.classList.toggle('quick-dirty',a.dirty);onChange();
 }
 function select(a,id){
  a.selected=id;const node=[...a.stage.querySelectorAll('[data-object]')].find(n=>n.dataset.object===id),o=design(a).objects.find(x=>x.id===id);
  for(const n of a.stage.querySelectorAll('[data-object]'))n.classList.toggle('selected-element',n.dataset.object===id);
  helpers.drawSelection(a.stage,node,o,{editable:editable(o)});
 }
 async function preview(a){
  const serial=++a.serial;
  try{
   const result=await call('/api/workshop/designs/editor/preview',{method:'POST',body:body(a)});
   if(active!==a||serial!==a.serial||a.drag)return;
   a.stage.innerHTML=result.svg;
   for(const n of a.stage.querySelectorAll('[data-object]')){const o=design(a).objects.find(x=>x.id===n.dataset.object);n.style.cursor=editable(o)?'move':'default';}
   if(a.selected)select(a,a.selected);
   if(!a.busy&&!a.confirm)say(a,a.dirty?'Geändert · noch nicht gespeichert':'Element anklicken und ziehen. Ecken ändern die Größe.');
  }catch(error){if(active===a&&serial===a.serial)say(a,'Vorschau nicht aktuell: '+error.message,true);}
 }
 function remember(a){a.history.push(structuredClone(design(a).objects));if(a.history.length>50)a.history.shift();}
 function changed(a){a.dirty=true;a.confirm=false;sync(a);void preview(a);}
 function candidates(a,x,y){
  const ids=[...new Set(documentImpl.elementsFromPoint(x,y).map(n=>n.closest?.('[data-object]')).filter(n=>n&&a.stage.contains(n)).map(n=>n.dataset.object))];
  return ids.map(id=>design(a).objects.find(o=>o.id===id)).filter(editable).sort((p,q)=>p.w*p.h-q.w*q.h);
 }
 function wire(a){
  const stage=a.stage;
  stage.addEventListener('pointerdown',e=>{
   if(e.button!==0||a.busy||active!==a)return;
   const handle=e.target.closest('[data-editor-resize]'),list=handle?[]:candidates(a,e.clientX,e.clientY);
   const id=handle?a.selected:list[0]?.id;if(!id){a.selected=null;helpers.drawSelection(stage,null,null);return;}
   const o=design(a).objects.find(x=>x.id===id),node=[...stage.querySelectorAll('[data-object]')].find(n=>n.dataset.object===id);if(!editable(o)||!node)return;
   select(a,id);const matrix=node.parentNode.getScreenCTM()?.inverse();if(!matrix)return;
   a.serial++;a.drag={node,object:o,original:structuredClone(o),start:new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix),matrix,resize:!!handle,pointer:e.pointerId,moved:false};
   stage.setPointerCapture?.(e.pointerId);stage.focus({preventScroll:true});e.preventDefault();
  });
  stage.addEventListener('pointermove',e=>{
   const d=a.drag;if(!d||d.pointer!==e.pointerId)return;
   const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(d.matrix),dx=point.x-d.start.x,dy=point.y-d.start.y;
   if(!d.moved&&Math.hypot(dx,dy)<.3)return;
   const next=structuredClone(d.original);
   try{
    if(d.resize){
     const scale=Math.max(.05,helpers.scaleFactor(d.original,d.start,point));
     if(next.type==='text'){helpers.setTextSize(next,Math.min(100,Math.max(1,d.original.size*scale)));helpers.measureText(next,a.draft.config.localResources.fonts);}
     else{next.w=d.original.w*scale;next.h=d.original.h*scale;}
    }else{next.x=d.original.x+dx;next.y=d.original.y+dy;}
    if(!d.moved){remember(a);d.moved=true;}
    Object.assign(d.object,next);
    d.node.setAttribute('transform',`translate(${next.x} ${next.y}) rotate(${next.rotation||0}) scale(${next.w/d.original.w} ${next.h/d.original.h})`);
    helpers.drawSelection(stage,d.node,d.original,{editable:true});
    say(a,d.resize?'Größe ändern · loslassen zum Übernehmen':'Verschieben · loslassen zum Übernehmen');
   }catch(error){say(a,error.message,true);}
  });
  const finish=e=>{
   const d=a.drag;if(!d||d.pointer!==e.pointerId)return;a.drag=null;
   if(e.type==='pointercancel'&&d.moved){Object.assign(d.object,d.original);a.history.pop();void preview(a);return;}
   if(d.moved)changed(a);
  };
  stage.addEventListener('pointerup',finish);stage.addEventListener('pointercancel',finish);stage.addEventListener('lostpointercapture',finish);
  stage.addEventListener('keydown',e=>{
   if(a.busy)return;
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(a);return;}
   if(e.key==='Escape'){e.preventDefault();void close({discard:!a.dirty});return;}
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();void save(a);return;}
   const o=design(a).objects.find(x=>x.id===a.selected);if(!editable(o))return;
   const step=e.shiftKey?5:.5,delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
   const grow={'+':1.03,'=':1.03,'-':1/1.03}[e.key];
   if(!delta&&!grow)return;e.preventDefault();
   try{
    const next=structuredClone(o);
    if(delta){next.x+=delta[0];next.y+=delta[1];}
    else if(next.type==='text'){helpers.setTextSize(next,Math.min(100,Math.max(1,next.size*grow)));helpers.measureText(next,a.draft.config.localResources.fonts);}
    else{next.w*=grow;next.h*=grow;}
    remember(a);Object.assign(o,next);changed(a);
   }catch(error){say(a,error.message,true);}
  });
 }
 function undo(a){if(!a.history.length||a.busy)return;design(a).objects=a.history.pop();a.dirty=a.history.length>0;a.confirm=false;sync(a);void preview(a);}
 async function save(a){
  if(a.busy||!a.dirty)return;a.busy=true;sync(a);
  try{
   if(!a.confirm){
    say(a,'Alle Größen werden geprüft …');
    const failing=notFitting(await call('/api/workshop/designs/editor/fit',{method:'POST',body:body(a)}));
    if(failing.length){a.confirm=true;say(a,'Passt nicht: '+failing.map(row=>row.label||row.key).join(', ')+'. Nochmals klicken, um trotzdem zu speichern.',true);return;}
   }
   say(a,'Wird gespeichert …');
   const data=await call('/api/workshop/designs/editor',{method:'PUT',body:body(a)});
   try{localStorage.setItem('gravuru-katalog-design-updated',JSON.stringify({reihe:a.reihe,id:a.id,checksum:data.checksum}));}catch{}
   a.dirty=false;a.busy=false;const saved={reihe:a.reihe,id:a.id,checksum:data.checksum,changed:data.changed===true};
   await close({discard:true});
   onSaved(saved);
  }catch(error){
   if(error.status===409)say(a,'Das Design wurde inzwischen woanders geändert. Bitte „Verwerfen“ und neu öffnen.',true);
   else say(a,error.message,true);
  }finally{if(active===a){a.busy=false;sync(a);}}
 }
 async function close({discard=false}={}){
  const a=active;if(!a)return true;
  if(a.dirty&&!discard){say(a,'Erst speichern oder verwerfen.',true);return false;}
  active=null;a.serial++;a.panel.remove();a.preview.hidden=false;a.card.classList.remove('quick-editing','quick-dirty');onChange();
  return true;
 }
 async function open({card,row,preview:previewNode}){
  if(active?.card===card)return;
  if(active&&!await close())return;
  const panel=el('div',undefined,'quick-edit'),stage=el('div',undefined,'quick-stage'),bar=el('div',undefined,'quick-bar'),status=el('p','Design wird geöffnet …','quick-status');
  stage.tabIndex=0;stage.setAttribute('aria-label','Schnellbearbeitung '+row.id+': Element anklicken und ziehen, Ecken ändern die Größe, Pfeiltasten verschieben, Plus/Minus skalieren.');
  status.setAttribute('role','status');
  const a={card,row,reihe:row.lieferform2.reihe,id:row.id,panel,stage,status,preview:previewNode,draft:null,checksum:null,selected:null,history:[],dirty:false,busy:true,confirm:false,serial:0,drag:null};
  a.save=button('Speichern',()=>void save(a),'release');a.discard=button('Verwerfen',()=>void close({discard:true}),'quiet');a.undo=button('↶',()=>undo(a),'quiet');a.undo.title='Rückgängig (Strg+Z)';a.undo.setAttribute('aria-label','Rückgängig');
  const big=button('Groß',()=>{if(!a.dirty)void close({discard:true}).then(()=>onOpenEditor(row));else say(a,'Erst speichern oder verwerfen, dann im großen Editor öffnen.',true);},'quiet');big.title='Im großen Editor öffnen';
  bar.append(a.save,a.undo,a.discard,big);panel.append(stage,bar,status);
  previewNode.hidden=true;previewNode.after(panel);card.classList.add('quick-editing');active=a;sync(a);
  try{
   await load();
   const data=await call('/api/workshop/designs/editor?'+new URLSearchParams({reihe:a.reihe,id:a.id}));
   if(active!==a)return;
   a.draft=structuredClone(data.document);a.checksum=data.checksum;a.busy=false;wire(a);sync(a);
   await preview(a);stage.focus({preventScroll:true});
  }catch(error){if(active===a){a.busy=false;sync(a);a.save.disabled=true;say(a,error.message,true);}}
 }
 // Die Übersicht rendert Kacheln neu (Auswahl, Filter). Eine offene Bearbeitung
 // zieht samt Entwurf in die neue Kachel desselben Designs um.
 function adopt(card,previewNode){const a=active;if(!a||a.card===card)return;previewNode.hidden=true;previewNode.after(a.panel);a.card=card;a.preview=previewNode;card.classList.add('quick-editing');card.classList.toggle('quick-dirty',a.dirty);}
 return {open,close,adopt,get active(){return active?{reihe:active.reihe,id:active.id,dirty:active.dirty}:null;}};
}
