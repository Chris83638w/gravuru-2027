// Inverse of katalogDesignToTemplate/scaleTemplate. Coordinates remain master mm;
// only the existing vector path commands are transformed, never polygonized.
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {parseDesignSvg,pathBounds,transformEmbeddedPath} from './katalog-convert.mjs';
const PT=25.4/72;
const fail=m=>{throw Object.assign(Error(m),{status:422,code:'design_edit'});};
const clone=v=>structuredClone(v),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const n=v=>Math.round(v*1e8)/1e8,fmt=v=>String(n(v));
const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const finite=v=>Number.isFinite(v)&&Math.abs(v)<100000;
const factor=a=>a==='start'?-.5:a==='end'?.5:0;
const picked=o=>o.type==='text'?{type:o.type,text:o.text,font:o.font,size:o.size,x:o.x,y:o.y,textAnchor:o.textAnchor??'middle',letterSpacing:o.letterSpacing??0}:{type:o.type,x:o.x,y:o.y,w:o.w,h:o.h};
function spans(svg){
 const out=new Map(),stack=[];const tags=/<(?:!--[\s\S]*?--|\?[\s\S]*?\?|[^>"']*(?:"[^"]*"|'[^']*')?[^>]*?)>/g;let m;
 while((m=tags.exec(svg))){const raw=m[0];if(/^<[!?]/.test(raw))continue;const closing=/^<\//.test(raw),self=/\/\s*>$/.test(raw);
  if(closing){const entry=stack.pop();if(entry?.depth===1&&entry.id)out.set(entry.id,{start:entry.start,end:tags.lastIndex,raw:svg.slice(entry.start,tags.lastIndex)});}
  else{const id=/\bid\s*=\s*["']([^"']+)["']/.exec(raw)?.[1],entry={depth:stack.length,id,start:m.index};if(self){if(entry.depth===1&&id)out.set(id,{start:m.index,end:tags.lastIndex,raw});}else stack.push(entry);}
 }
 return out;
}
function textMarkup(id,t,source){
 const layout=masterTextLayout(t),size=layout.sizeMm,[x,y]=t.anchorMm,anchor=t.align==='center'?'middle':t.align==='right'?'end':'start';
 const field=source?.fieldKey?' data-feld="'+esc(source.fieldKey)+'"':'';
 const rotation=source?.rotation?' transform="rotate('+fmt(source.rotation)+' '+fmt(x)+' '+fmt(y)+')"':'';
 return '<text xml:space="preserve" id="'+esc(id)+'"'+field+' x="'+fmt(x)+'" y="'+fmt(y)+'" font-family="'+esc(t.font)+'" font-size="'+fmt(size)+'" text-anchor="'+anchor+'" letter-spacing="'+fmt(t.letterSpacingMm)+'" fill="'+esc(t.color||'#000000')+'"'+rotation+'>'+layout.spans+'</text>';
}
const textEntry=(source,id)=>({...source,layerId:id});
const sourceText=l=>({text:l.text,font:l.font,sizePt:n(l.size/PT),sizeMm:l.size,anchorMm:[l.x,l.y],align:l.anchor==='middle'?'center':l.anchor==='end'?'right':'left',lineHeightMm:n(l.lineHeight??l.size*1.2),letterSpacingMm:l.letterSpacing??0,color:l.fill||'#000000'});
function measured(o,fonts){
 const c=clone(o);try{measureText(c,fonts);}catch(e){fail(e.message);}return c;
}
export function planTemplateWriteback({master,template,originalTemplate,fonts={}}){
 if(!master?.json||typeof master.svgText!=='string'||!Array.isArray(template?.objects)||!Array.isArray(originalTemplate?.objects))fail('Vorlage oder Katalogquelle fehlt.');
 if(template.objects.length>20)fail('Höchstens 20 Elemente je Design.');
 const original=originalTemplate,scale=original.katalog?.scale??1;
 if(!(scale>0&&Number.isFinite(scale)))fail('Ungültige Master-Umrechnung.');
 const layers=parseDesignSvg(master.svgText).layers,sourceById=new Map(layers.map(l=>[l.id,l])),oldById=new Map(original.objects.map(o=>[o.id,o])),nextById=new Map();
 const svgSpans=spans(master.svgText),changes=[],replacements=[],json=clone(master.json),textLayers=layers.filter(l=>l.kind==='text'),motifLayers=layers.filter(l=>['motiv','deko'].includes(l.kind));
 const textMap=new Map(textLayers.map((l,i)=>[l.id,clone((json.texts||[]).find(t=>t.layerId===l.id)??json.texts?.[i]??sourceText(l))]));
 const motifMap=new Map(motifLayers.map((l,i)=>[l.id,clone((json.motifs||[]).find(t=>t.layerId===l.id)??json.motifs?.[i]??{})]));
 const replace=(id,value)=>{const span=svgSpans.get(id);if(!span)fail('SVG-Ebene fehlt: '+id);replacements.push({...span,value});};
 for(const o of template.objects){
  if(!o||typeof o.id!=='string'||!/^[-a-zA-Z0-9_.]+$/.test(o.id)||nextById.has(o.id))fail('Elementkennung ungültig oder doppelt.');
  nextById.set(o.id,o);const before=oldById.get(o.id),src=sourceById.get(o.id);
  if(before&&(o.type!==before.type||o.motif!==before.motif||o.rotation!==before.rotation||Boolean(o.bold)!==Boolean(before.bold)||Boolean(o.italic)!==Boolean(before.italic)||o.color!==before.color))fail('Elementart, Motiv, Drehung oder Farbe kann hier nicht geändert werden.');
  if(before&&equal(picked(o),picked(before)))continue;
  if(before&&(before.role==='guide'||!['text','motif'].includes(before.type)))fail('Hilfslinien und Fotofelder bleiben unverändert.');
  if(![o.x,o.y].every(finite))fail('Position muss in Millimetern angegeben werden.');
  if(o.type==='text'){
   if(!before&&(!/^text-/.test(o.id)||sourceById.has(o.id)||o.rotation||o.bold||o.italic))fail('Neue Texte benötigen eine neue text-Kennung ohne Drehung.');
   if(typeof o.text!=='string'||!o.text.trim()||o.text.length>5000||/[\x00-\x08\x0b-\x1f]/.test(o.text))fail('Text: 1 bis 5000 Zeichen.');
   const anchor=o.textAnchor??'middle';if(!['start','middle','end'].includes(anchor))fail('Textausrichtung prüfen.');
   const after=measured(o,fonts),prev=before?measured(before,fonts):null,geometry=editorTextToMaster({source:src,before:prev,after,scale,offset:original.katalog?.offsetMm??[0,0]});
   const current=textMap.get(o.id)||{},entry={...textEntry(current,o.id),...geometry,color:current.color||src?.fill||'#000000'};
   textMap.set(o.id,entry);const markup=textMarkup(o.id,entry,src);
   if(before)replace(o.id,markup);else replacements.push({start:master.svgText.lastIndexOf('</svg>'),end:master.svgText.lastIndexOf('</svg>'),value:markup+'\n'});
   changes.push({layer:o.id,from:before?sourceText(src):null,to:sourceText({...src,text:entry.text,font:entry.font,size:entry.sizeMm,x:entry.anchorMm[0],y:entry.anchorMm[1],anchor,letterSpacing:entry.letterSpacingMm,lineHeight:entry.lineHeightMm,fill:entry.color})});
  }else if(o.type==='motif'&&before&&src&&['motiv','deko'].includes(src.kind)){
   if(![o.w,o.h].every(v=>finite(v)&&v>0))fail('Motivmaße müssen positiv sein.');
   const sx=o.w/before.w,sy=o.h/before.h;if(Math.abs(sx-sy)>Math.max(.0001,Math.abs(sx)*.0001))fail('Motive nur seitenverhältnistreu skalieren.');
   if(src.rotation)fail('Gedrehte Motivquellen benötigen eine manuelle Quellkorrektur.');
   const box=src.bounds,cx=box[0]+box[2]/2,cy=box[1]+box[3]/2,dx=(o.x-before.x)/scale+cx*(1-sx),dy=(o.y-before.y)/scale+cy*(1-sx);
   const paths=src.paths.map(d=>transformEmbeddedPath(d,sx,dx+(src.translation?.[0]??0)*sx,dy+(src.translation?.[1]??0)*sx)),boxes=paths.map(pathBounds),left=Math.min(...boxes.map(b=>b[0])),top=Math.min(...boxes.map(b=>b[1])),right=Math.max(...boxes.map(b=>b[0]+b[2])),bottom=Math.max(...boxes.map(b=>b[1]+b[3])),current=motifMap.get(o.id)||{};
   const entry={...current,layerId:o.id,box:[left,top,right-left,bottom-top].map(n),paths:paths.map((d,i)=>({...current.paths?.[i],...src.pathAttributes?.[i],d,fill:src.pathAttributes?.[i]?.fill||current.paths?.[i]?.fill||src.fill||'#000000',strokeMm:n((src.pathAttributes?.[i]?.strokeMm??current.paths?.[i]?.strokeMm??0)*sx)}))};motifMap.set(o.id,entry);
   replace(o.id,'<g id="'+esc(o.id)+'">'+entry.paths.map(p=>'<path d="'+esc(p.d)+'" fill="'+esc(p.fill)+'" fill-rule="'+(p.evenodd?'evenodd':'nonzero')+'"'+(p.stroke?' stroke="'+esc(p.stroke)+'" stroke-width="'+fmt(p.strokeMm)+'" stroke-linecap="'+esc(p.linecap||'butt')+'" stroke-linejoin="'+esc(p.linejoin||'miter')+'" stroke-miterlimit="'+fmt(p.miterlimit??4)+'"':'')+(p.opacity!==undefined?' opacity="'+fmt(p.opacity)+'"':'')+'/>').join('')+'</g>');
   changes.push({layer:o.id,from:{box:src.bounds,paths:src.paths},to:{box:entry.box,paths:entry.paths.map(p=>p.d)}});
  }else fail('Neue Motive oder andere Elementarten sind hier nicht erlaubt.');
 }
 for(const before of original.objects)if(!nextById.has(before.id)){
  const src=sourceById.get(before.id);if(before.role==='guide'||!src||!['text','motif'].includes(before.type))fail('Hilfslinien und Fotofelder können nicht entfernt werden.');
  replace(before.id,'');textMap.delete(before.id);motifMap.delete(before.id);changes.push({layer:before.id,from:before.type==='text'?sourceText(src):{box:src.bounds,paths:src.paths},to:null});
 }
 if(!changes.length)return {changed:false,json:clone(master.json),svgText:master.svgText,changes:[]};
 json.texts=[...textMap].map(([id,t])=>textEntry(t,id));json.motifs=[...motifMap].map(([id,m])=>({...m,layerId:id}));
 json.fonts=[...new Set([...json.texts.map(t=>t.font),...layers.filter(l=>l.kind==='guide'&&l.font).map(l=>l.font)].filter(Boolean))];
 if(json.fields)for(const id of Object.keys(json.fields))if(!nextById.has(id))delete json.fields[id];
 let svgText=master.svgText;for(const r of replacements.sort((a,b)=>b.start-a.start))svgText=svgText.slice(0,r.start)+r.value+svgText.slice(r.end);
 parseDesignSvg(svgText);
 return {changed:true,json,svgText:svgText.replace(/\r\n/g,'\n'),changes};
}

/** Shared center/baseline inverse for both dashboard templates and the historical
 * correction-field CLI adapter. source/before preserve source precision on deltas. */
export function editorTextToMaster({source,before,after,scale=1,offset=[0,0]}){
 const anchor=after.textAnchor??'middle',size=before?source.size+(after.size-before.size)/scale:after.size/scale;
 const oldLines=before?before.text.split('\n').length:0,newLines=after.text.split('\n').length,beforeLine=before?(before.lineHeight??before.size*1.2):0,afterLine=before?beforeLine*after.size/before.size:(after.lineHeight??after.size*1.2);
 const lineHeight=before?(source.lineHeight??source.size*1.2)+(afterLine-beforeLine)/scale:afterLine/scale;
 const x=before?source.x+(after.x-before.x+factor(anchor)*after.w-factor(before.textAnchor??source.anchor)*before.w)/scale:(after.x+factor(anchor)*after.w-offset[0])/scale;
 const y=before?source.y+(after.y-before.y+.35*(after.size-before.size)-.5*((newLines-1)*afterLine-(oldLines-1)*beforeLine))/scale:(after.y+.35*after.size-.5*(newLines-1)*afterLine-offset[1])/scale;
 const spacing=before?(source.letterSpacing??0)+((after.letterSpacing??0)-(before.letterSpacing??0))/scale:(after.letterSpacing??0)/scale;
 return {text:after.text,font:after.font,sizePt:n(size/PT),sizeMm:n(size),anchorMm:[n(x),n(y)],align:anchor==='middle'?'center':anchor==='end'?'right':'left',lineHeightMm:n(lineHeight),letterSpacingMm:n(spacing)};
}
export function masterTextLayout(t,{precision=8}={}){
 const round=v=>Math.round(v*10**precision)/10**precision,format=v=>precision===2?round(v).toFixed(2):String(round(v));
 const sizeMm=round(t.sizeMm??t.sizePt*PT),lineHeightMm=t.lineHeightMm??sizeMm*1.2,[x,y]=t.anchorMm;
 return {sizeMm,x,y,format,spans:String(t.text).split('\n').map((line,i)=>'<tspan x="'+format(x)+'" dy="'+format(i?lineHeightMm:0)+'">'+esc(line)+'</tspan>').join('')};
}
