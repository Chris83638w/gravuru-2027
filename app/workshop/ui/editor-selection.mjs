import {selectionArrowMarkup,positionSelectionArrows,selectionArrowStyles} from '../../configurator/variant-m/selection-arrows.mjs';
// Editor-only controls: appended above the scene, never included in the model,
// saved thumbnail or production SVG. Dimensions stay constant in screen pixels.
const ns='http://www.w3.org/2000/svg';
export function drawSelection(stage,node,object,{editable=true,arrows=false}={}){
 const previous=stage.querySelector('[data-editor-selection]');
 const svg=stage.querySelector(':scope > svg');
 if(!svg||!node||!object){previous?.remove();return;}
 const screen=node.getScreenCTM(),root=svg.getScreenCTM();if(!screen||!root){previous?.remove();return;}
 const matrix=root.inverse().multiply(screen),unit=1/Math.hypot(screen.a,screen.b);
 if(arrows){
  if(!editable){previous?.remove();return;}
  let handles=previous;
  if(handles?.dataset.editorArrows!=='true'||handles.dataset.editorSelection!==object.id){
   previous?.remove();handles=document.createElement('div');handles.className='ux-selection-handles';handles.dataset.editorSelection=object.id;handles.dataset.editorArrows='true';
   const style=document.createElement('style');style.textContent=selectionArrowStyles;handles.append(style);handles.insertAdjacentHTML('beforeend',selectionArrowMarkup());
   for(const handle of handles.querySelectorAll('[data-corner]'))handle.dataset.editorResize=handle.dataset.corner;
   stage.append(handles);
  }
  const box=stage.getBoundingClientRect();
  const point=(x,y)=>({x:screen.a*x+screen.c*y+screen.e-box.left,y:screen.b*x+screen.d*y+screen.f-box.top});
  positionSelectionArrows(handles,object,point,14*unit);return;
 }
 previous?.remove();
 const make=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
 const group=make('g',{'data-editor-selection':object.id,transform:`matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`,'pointer-events':'none','aria-hidden':'true'});
 group.append(make('rect',{x:-object.w/2,y:-object.h/2,width:object.w,height:object.h,fill:'none',stroke:'#087bce','stroke-width':1.5,'vector-effect':'non-scaling-stroke'}));
 if(editable)for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
  const x=sx*object.w/2,y=sy*object.h/2;
  const handle=make('g',{'data-editor-resize':`${sx},${sy}`,transform:`translate(${x} ${y})`,style:`cursor:${sx===sy?'nwse':'nesw'}-resize;touch-action:none`});
  handle.append(make('rect',{x:-14*unit,y:-14*unit,width:28*unit,height:28*unit,fill:'transparent','pointer-events':'all'}),make('rect',{x:-5*unit,y:-5*unit,width:10*unit,height:10*unit,fill:'#fff',stroke:'#087bce','stroke-width':1.5,'vector-effect':'non-scaling-stroke'}));group.append(handle);
 }
 svg.append(group);
}

// Keep HTML arrow controls mounted when an asynchronous glyph preview arrives.
export function replaceEditorPreview(stage,markup,{arrows=false}={}){
 const current=arrows&&stage.querySelector(':scope > svg');
 if(!current){stage.innerHTML=markup;return;}
 const template=document.createElement('template');template.innerHTML=markup;
 const next=template.content.firstElementChild;if(next?.localName!=='svg')throw Error('Die Designvorschau ist unvollständig.');
 current.replaceWith(next);
}
