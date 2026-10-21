// Editor-only controls: appended above the scene, never included in the model,
// saved thumbnail or production SVG. Dimensions stay constant in screen pixels.
const ns='http://www.w3.org/2000/svg';
export function drawSelection(stage,node,object,{editable=true}={}){
 stage.querySelector('[data-editor-selection]')?.remove();
 const svg=stage.querySelector(':scope > svg');
 if(!svg||!node||!object)return;
 const screen=node.getScreenCTM(),root=svg.getScreenCTM();if(!screen||!root)return;
 const matrix=root.inverse().multiply(screen),unit=1/Math.hypot(screen.a,screen.b);
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
