import {contourContainsPolygon,contourObjectCorners,contourSafeAreaSvg} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
let contourGuideSerial=0;
const bounds=o=>{const a=(o.rotation||0)*Math.PI/180,w=Math.abs(o.w*Math.cos(a))+Math.abs(o.h*Math.sin(a)),h=Math.abs(o.w*Math.sin(a))+Math.abs(o.h*Math.cos(a));return {x:[o.x-w/2,o.x,o.x+w/2],y:[o.y-h/2,o.y,o.y+h/2]};};
export function alignedPosition(object,geometry,others,{threshold=1,snap=true}={}){
 const result={...object},lines=[],b=bounds(object);
 for(const [axis,extent] of [['x',geometry.width],['y',geometry.height]]){
  const m=geometry.safeMarginMm??2,targets=[{value:extent/2,kind:'center'},{value:m,kind:'margin'},{value:extent-m,kind:'margin'},...others.filter(o=>o.id!==object.id&&!o.uxHidden).flatMap(o=>bounds(o)[axis].map(value=>({value,kind:'element'})))];
  let best=null;
  for(const from of b[axis])for(const target of targets){const delta=target.value-from;if(geometry.shape==='contour'&&!contourContainsPolygon(geometry,contourObjectCorners({...result,[axis]:result[axis]+delta})))continue;if(Math.abs(delta)<=threshold&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={...target,delta};}
  if(best){if(snap)result[axis]+=best.delta;lines.push({axis,value:best.value,kind:best.kind});}
 }
 return {object:result,lines};
}
export function clearGuides(stage){stage.querySelector('[data-editor-guides]')?.remove();}
export function drawGuides(stage,parent,geometry,lines){
 clearGuides(stage);const ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g');group.dataset.editorGuides='true';group.setAttribute('pointer-events','none');
 // Both the geometry and parent transform are those used by the artwork.
 const unique=new Map([['x:center',{axis:'x',value:geometry.width/2,kind:'center'}],['y:center',{axis:'y',value:geometry.height/2,kind:'center'}]]);
 for(const line of lines)unique.set(line.axis+':'+line.value,line);
 for(const {axis,value,kind} of unique.values()){
  const line=document.createElementNS(ns,'line');
  for(const [key,v] of Object.entries(axis==='x'?{x1:value,x2:value,y1:0,y2:geometry.height}:{y1:value,y2:value,x1:0,x2:geometry.width}))line.setAttribute(key,v);
  line.setAttribute('stroke',kind==='center'?'#187361':'#bc3985');line.setAttribute('stroke-width','1');line.setAttribute('stroke-dasharray','5 4');line.setAttribute('vector-effect','non-scaling-stroke');group.append(line);
 }
 if(geometry.shape==='contour'){const area=contourSafeAreaSvg(geometry,'editor-contour-guides-'+(++contourGuideSerial));group.innerHTML='<defs>'+area.defs+'</defs><g '+area.attribute+'>'+group.innerHTML+'</g>';}
 parent.append(group);
}

// Native form-customer adapter. Coordinates are millimetres; overlays are UI-only.
const formObject=f=>({id:f.id,x:f.xMm+f.widthMm/2,y:f.yMm+f.heightMm/2,w:f.widthMm,h:f.heightMm,rotation:f.rotation||0,uxHidden:!!f.deleted});
export function alignedFormPosition(field,geometry,fields,options={}){
 const g={width:geometry.widthMm,height:geometry.heightMm,safeMarginMm:2};
 const aligned=alignedPosition(formObject(field),g,fields.filter(f=>!f.deleted).map(formObject),options);
 return {position:options.snap===false?{xMm:field.xMm,yMm:field.yMm}:{xMm:Math.max(0,Math.min(geometry.widthMm-field.widthMm,aligned.object.x-field.widthMm/2)),yMm:Math.max(0,Math.min(geometry.heightMm-field.heightMm,aligned.object.y-field.heightMm/2))},lines:aligned.lines};
}
export function installFormGuides({stages,getGeometry,getFields,getSelected,getSource,isBusy,alignSelected}){
 let settings={guides:true,snap:true,dimensions:false},lines=[];try{settings={...settings,...JSON.parse(localStorage.getItem('gravuru-form-guides-v1')||'{}')};}catch{}
 const controls=[];
 const style=document.createElement('style');style.textContent='.form-guide-tools{display:flex;gap:8px 14px;align-items:center;flex-wrap:wrap;padding:10px 0;font-size:13px}.form-guide-tools label{display:flex;gap:5px;align-items:center;margin:0}.form-guide-tools input{width:auto!important;margin:0}.form-guide-tools button{padding:6px 9px;font-size:12px}.form-guide-help{font-size:12px;color:#586963;margin:3px 0 8px}';document.head.append(style);
 for(const stage of stages){const tools=document.createElement('div');tools.className='form-guide-tools';tools.setAttribute('aria-label','Ausrichthilfen');tools.innerHTML='<label><input type="checkbox" data-guide-setting="guides"> Hilfslinien</label><label><input type="checkbox" data-guide-setting="snap"> Einrasten</label><label><input type="checkbox" data-guide-setting="dimensions"> Maße</label><button type="button" data-form-align="x" title="Waagerecht in der Schildmitte ausrichten">↔ Mitte</button><button type="button" data-form-align="y" title="Senkrecht in der Schildmitte ausrichten">↕ Mitte</button>';stage.after(tools);const help=document.createElement('p');help.className='form-guide-help';help.textContent='Grün: Schildmitte · Rosa: Ausrichtung · Rot: 4 mm Abstand zum Bohrloch. Hilfslinien werden nicht exportiert.';tools.after(help);controls.push(tools);
  tools.onchange=e=>{const key=e.target.dataset.guideSetting;if(!key)return;settings[key]=e.target.checked;try{localStorage.setItem('gravuru-form-guides-v1',JSON.stringify(settings));}catch{}sync();render();};
  tools.onclick=e=>{const axis=e.target.closest('[data-form-align]')?.dataset.formAlign;if(!axis||isBusy()||!getSelected()||!getSource()?.allowMove)return;alignSelected(axis);};
 }
 function sync(){for(const tools of controls){for(const input of tools.querySelectorAll('[data-guide-setting]')){input.checked=!!settings[input.dataset.guideSetting];input.disabled=isBusy();}for(const button of tools.querySelectorAll('[data-form-align]'))button.disabled=isBusy()||!getSelected()||getSelected().deleted||!getSource()?.allowMove;}}
 function render(){const g=getGeometry();if(!g)return;for(const stage of stages){const svg=stage.querySelector('svg');if(!svg)continue;clearGuides(stage);stage.querySelector('[data-form-guide-zones]')?.remove();
  if(settings.guides){drawGuides(stage,svg,{width:g.widthMm,height:g.heightMm},lines);const group=document.createElementNS('http://www.w3.org/2000/svg','g'),clip='guide-interior-'+stage.id,outer=(g.contours||[]).filter(c=>c.role==='outer').map(c=>c.d).join(' ');group.dataset.formGuideZones='true';group.setAttribute('pointer-events','none');group.innerHTML='<defs><clipPath id="'+clip+'"><path d="'+outer+'"/></clipPath></defs><g clip-path="url(#'+clip+')"><path d="'+outer+'" fill="none" stroke="#b87535" stroke-width="4" stroke-opacity=".12"/>'+(g.contours||[]).filter(c=>c.role==='hole').map(c=>'<path data-hole-safety-mm="4" d="'+c.d+'" fill="none" stroke="#de4b4b" stroke-width="8" stroke-opacity=".2"/>').join('')+'</g>'+getFields().filter(f=>!f.deleted).map(f=>'<circle cx="'+(f.xMm+f.widthMm/2)+'" cy="'+(f.yMm+f.heightMm/2)+'" r="'+Math.max(.18,g.widthMm/500)+'" fill="#c83e8e" stroke="white" stroke-width=".08"/>').join('');svg.append(group);}
  if(settings.dimensions){const f=getSelected();if(f&&!f.deleted){let group=svg.querySelector('[data-form-guide-zones]');if(!group){group=document.createElementNS('http://www.w3.org/2000/svg','g');group.dataset.formGuideZones='true';group.setAttribute('pointer-events','none');svg.append(group);}const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',f.xMm+f.widthMm/2);text.setAttribute('y',Math.max(2,f.yMm-1));text.setAttribute('text-anchor','middle');text.setAttribute('font-size',Math.max(1.5,g.widthMm/65));text.setAttribute('fill','#177560');text.setAttribute('stroke','white');text.setAttribute('stroke-width','.25');text.setAttribute('paint-order','stroke');text.textContent=f.widthMm.toFixed(1)+' × '+f.heightMm.toFixed(1)+' mm';group.append(text);}}
 }sync();}
 function align(field,geometry,fields,event,stage){const scale=stage.querySelector('svg')?.getScreenCTM()?.a||1;const value=alignedFormPosition(field,geometry,fields,{threshold:Math.min(2,6/scale),snap:settings.snap&&!event.altKey});lines=settings.guides?value.lines:[];render();return value.position;}
 return {render,sync,align,clearAlignment(){lines=[];render();}};
}
