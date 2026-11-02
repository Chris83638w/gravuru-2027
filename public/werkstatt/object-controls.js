'use strict';
// Browsers do not reliably chain scrolling out of a height-fitted iframe.
// Keep a single outer scroll area, while preserving scrolling inside textareas.
if(parent!==window){
 const editable=target=>target?.closest?.('input,textarea,select,[contenteditable=true]');
 function ownsScroll(event,dy){return event.composedPath().some(node=>node?.nodeType===1&&['auto','scroll'].includes(getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight+1&&(dy<0?node.scrollTop>0:node.scrollTop+node.clientHeight<node.scrollHeight-1))}
 const forward=dy=>parent.postMessage({type:'gravuru-workspace-scroll',deltaY:dy},location.origin);
 window.addEventListener('wheel',e=>{if(e.ctrlKey||!e.deltaY||ownsScroll(e,e.deltaY))return;e.preventDefault();forward(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?600:1))},{passive:false});
 let touchY=null,touchTarget=null;
 window.addEventListener('touchstart',e=>{touchY=e.touches.length===1?e.touches[0].clientY:null;touchTarget=e.composedPath()[0]},{passive:true});
 window.addEventListener('touchmove',e=>{if(touchY===null||e.touches.length!==1)return;const y=e.touches[0].clientY,dy=touchY-y;touchY=y;if(touchTarget?.closest?.('[data-drag-bell],[data-acrylic-resize],[data-steel-resize],[data-customer-bell],[data-object],.resize-handle,.movable')||ownsScroll(e,dy))return;e.preventDefault();forward(dy)},{passive:false});
 window.addEventListener('keydown',e=>{if(editable(e.composedPath()[0])||!['PageDown','PageUp','Home','End'].includes(e.key))return;e.preventDefault();forward(e.key==='Home'?-16000:e.key==='End'?16000:e.key==='PageUp'?-400:400)});
}
// A typed number is a draft until Enter or blur. Synthetic input events retain
// the original geometry handlers, including validation and dependent fields.
window.GravuruNumberInputs=function(root,selector){
 let pending=null;const original=new WeakMap();
 const match=target=>target?.matches?.(selector);
 function commit(){const field=pending;if(!field)return;pending=null;if(!field.isConnected)return;if(Number.isFinite(field.valueAsNumber))field.value=String(Math.round(field.valueAsNumber*100)/100);original.set(field,field.value);field.dispatchEvent(new Event('input',{bubbles:true}));}
 root.addEventListener('focusin',event=>{if(match(event.target))original.set(event.target,event.target.value)},true);
 root.addEventListener('input',event=>{if(!event.isTrusted||!match(event.target))return;pending=event.target;event.stopImmediatePropagation()},true);
 root.addEventListener('focusout',event=>{if(event.target===pending)commit()},true);
 root.addEventListener('pointerdown',event=>{if(pending&&event.target!==pending)commit()},true);
 root.addEventListener('keydown',event=>{if(!match(event.target))return;if(event.key==='Enter'){event.preventDefault();event.stopPropagation();commit()}else if(event.key==='Escape'&&pending===event.target){event.preventDefault();pending.value=original.get(pending)??pending.value;pending=null}},true);
 return{commit};
};
window.GravuruDimensions=function(container,{read,change,material,select}){
 const panel=document.createElement('section');panel.className='object-dimensions';panel.setAttribute('aria-label','Plattenmaße direkt bearbeiten');
 const rows=new Map();for(const [key,title] of [['base',material==='acryl'?'Acrylglas · Grundplatte':material==='sonder'?'Gestaltungsfläche':'Edelstahl · Grundplatte'],['acrylic','Acrylauflage']]){
  const row=document.createElement('div');row.className='object-dimension-row';const name=document.createElement(select?'button':'strong');name.textContent=title;if(select){name.type='button';name.onclick=()=>select(key)}row.append(name);
  for(const [axis,label] of [['width','Breite'],['height','Höhe']]){const field=document.createElement('input'),wrap=document.createElement('label');field.type='number';field.step='0.01';field.min='1';field.inputMode='decimal';field.setAttribute('aria-label',title+' '+label+' in mm');field.dataset.dimension=key+':'+axis;wrap.append(document.createTextNode(label+' (mm)'),field);row.append(wrap);field.addEventListener('input',()=>{change(key,axis,field.value);refresh()})}panel.append(row);rows.set(key,row);
 }
 const hint=document.createElement('p');hint.textContent='Maß eingeben · mit Enter oder beim Verlassen übernehmen';panel.append(hint);container.append(panel);
 function refresh(){const g=read();for(const [key,row] of rows){const a=key==='base'?{width:g.widthMm,height:g.heightMm}:g.assembly?.acrylic;row.hidden=!a;if(!a)continue;for(const input of row.querySelectorAll('input'))if(input.getRootNode().activeElement!==input)input.value=a[input.dataset.dimension.split(':')[1]]}}
 refresh();return{panel,refresh};
};
