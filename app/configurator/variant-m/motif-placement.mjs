import {contourContainsPoint} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {printArtwork,physicalGeometry} from './print-export.mjs';
import {acrylicSelection,acrylicOptions} from './acrylic-product.mjs';
import {insideContour} from './print-export-model.mjs';
import {PLACEMENT_STEP,NO_FREE_SPACE_MESSAGE} from './workflow-model.mjs';
import {textOutlineBounds} from '../../platform/sources/app/shared/models/text-outline-fit.mjs';

// Mindestgröße eines Motivs bei der Platzsuche (Chris 22./23.10.2026): 10 mm längste Seite, physisch.
// Begründung: Motive sind Strichzeichnungen; die Mindestlinienstärke der Verfahren ist offen (null), die
// Mindestschriftgröße 3 mm. Bei 10 mm bleiben Konturen gravier-/druckbar erkennbar (etwa dreifache
// Mindesttexthöhe), und das Motiv bleibt in der Vorschau antippbar (ca. 5–6 px/mm → ≥ 50 px, über dem
// üblichen Touch-Ziel von 44 px). Kleiner darf der Kunde selbst skalieren; die Suche geht nicht darunter.
export const MOTIF_MIN_MM=10;
// Verkleinerungsstufen 1, 0.9, 0.81 … bis minScale (letzter Schritt genau minScale); minScale ≥ 1 → nur [1].
export function placementScales(minScale,step=PLACEMENT_STEP){
 const floor=Number.isFinite(minScale)?Math.min(1,Math.max(0.01,minScale)):1,scales=[1];
 for(let s=1;s>floor+1e-9;){s=Math.max(floor,s*step);scales.push(s);}
 return scales;
}

// Search the actual visible artwork, including transparent template layers.
export function emptyPixelPosition(alpha,width,height,boxWidth,boxHeight,allowed=()=>true,{preferred={x:width/2,y:height/2},candidate=()=>true}={}){
 const integral=new Uint32Array((width+1)*(height+1)),stride=width+1;
 for(let y=0;y<height;y++){let row=0;for(let x=0;x<width;x++){row+=alpha[(y*width+x)*4+3]>0||!allowed(x,y)?1:0;integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+row;}}
 const hw=Math.ceil(boxWidth/2)+2,hh=Math.ceil(boxHeight/2)+2;let best=null,distance=Infinity;
 for(let y=hh;y<=height-hh;y+=2)for(let x=hw;x<=width-hw;x+=2){
  if(!candidate(x,y))continue;
  if(!allowed(x-hw,y-hh)||!allowed(x+hw,y-hh)||!allowed(x-hw,y+hh)||!allowed(x+hw,y+hh))continue;
  const occupied=integral[(y+hh)*stride+x+hw]-integral[(y-hh)*stride+x+hw]-integral[(y+hh)*stride+x-hw]+integral[(y-hh)*stride+x-hw];
  const d=(x-preferred.x)**2+(y-preferred.y)**2;if(!occupied&&d<distance){distance=d;best={x,y};}
 }
 return best;
}

// Chris, #230 comment 6772716646 (10.11.2026 17:16): these thirteen original
// motifs on the six fixed small signs belong large beside text; the two lines
// may be centred. IDs from catalogue 8236b8bf, motive/motive.json. No other
// product, existing template element, uploaded SVG/logo or motif is affected.
const SMALL_SIGN_MOTIFS=new Set(['import-6abda909c44bc599330856dd','import-0073ea6aa7103bb1e8ec9088','import-9373218480c87a6ad167f3cb','import-41fb65efd1d8996ac305f6ab','import-1abd6f06096e47c66b0b4e00','import-286db893566ced2e6bd75bad','import-d94f1406fde432cf9dd70389','import-9c76c3476a406eaac7f05e42','import-10edf8a5dd07bd1035ba508d','import-4269dbda54a15a99e178f00a','import-0f3193fd49e254bb5975e74d','import-54b3b489bbebe12119deda9a','import-8239d6c658366716f578c984']);
const SMALL_SIGN_LINES=new Set(['import-9373218480c87a6ad167f3cb','import-0f3193fd49e254bb5975e74d']);
export function smallSignMotifMode(config,object){
 if(object?.type!=='motif'||object.templateOrigin||object.uxUploadId||object.rotation||!SMALL_SIGN_MOTIFS.has(object.motif))return null;
 const f=config?.familyFormats,s=f?.source;
 if(f?.schema!=='gravuru-family-formats/v1'||config.productExecution?.kind!=='door-sign'||s?.subcategoryId!=='familienschilder')return null;
 const steel=s.lineId==='edelstahl-tuerschilder'&&/^GR-ES-RE-(50|60|80)X20-T15$/.test(f.fixedSize||''),acrylic=s.lineId==='acryl-tuerschilder'&&/^TS-Acryl-RE-(50|60|80)X20-T30-SW$/.test(f.fixedSize||'');
 if(!steel&&!acrylic)return null;
 return SMALL_SIGN_LINES.has(object.motif)?'center':'side';
}
// Same pixel collision test, spacing and scale steps as the general placement.
// Larger first; try both sides at each scale, with right as deterministic tie.
// Only the new object changes. A full text block never triggers text shrinking.
export function smallSignMotifPosition({mode,object,objects,fonts,alpha,width,height,sx=1,sy=1,pixelsPerMm=2,minScale=1,allowed=()=>true}){
 if(!['side','center'].includes(mode)||!(object.w>0&&object.h>0))return null;
 const texts=objects.filter(o=>o.type==='text'&&!o.uxHidden&&o.role!=='guide'&&o.surfaceId!=='back'&&String(o.text||'').trim()),corners=texts.flatMap(o=>{
  const b=textOutlineBounds(o,fonts)||{left:-o.w/2,top:-o.h/2,right:o.w/2,bottom:o.h/2},a=(o.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return [[b.left,b.top],[b.right,b.top],[b.right,b.bottom],[b.left,b.bottom]].map(([x,y])=>({x:(o.x+x*c-y*s)*sx*pixelsPerMm,y:(o.y+x*s+y*c)*sy*pixelsPerMm}));
 });
 if(!corners.length&&mode==='side')return null;
 const left=Math.min(...corners.map(p=>p.x)),right=Math.max(...corners.map(p=>p.x)),centerY=corners.length?(Math.min(...corners.map(p=>p.y))+Math.max(...corners.map(p=>p.y)))/2:height/2;
 const upper=Math.min(width/(object.w*sx*pixelsPerMm),height/(object.h*sy*pixelsPerMm));
 if(!Number.isFinite(upper)||upper<minScale)return null;
 for(const step of placementScales(minScale/upper)){
  const factor=upper*step,bw=object.w*factor*sx*pixelsPerMm,bh=object.h*factor*sy*pixelsPerMm;
  const regions=mode==='center'?[{allow:allowed,preferred:{x:width/2,y:height/2},candidate:x=>Math.abs(x-width/2)<=1}]:[
   {allow:(x,y)=>x>=right&&allowed(x,y),preferred:{x:(right+width)/2,y:centerY}},
   {allow:(x,y)=>x<=left&&allowed(x,y),preferred:{x:left/2,y:centerY}}
  ];
  for(const region of regions){const p=emptyPixelPosition(alpha,width,height,bw,bh,region.allow,region);if(p)return {x:p.x/pixelsPerMm/sx,y:p.y/pixelsPerMm/sy,w:object.w*factor,h:object.h*factor};}
 }
 return null;
}
// Chris 22./23.10.2026: Platzsuche über die ganze Gestaltungsfläche innerhalb des Randes (safeMarginMm) in
// Originalgröße, danach schrittweise kleiner bis zur Mindestgröße (minScale, vom Aufrufer aus MOTIF_MIN_MM).
// Bestehende Elemente werden nie verschoben. Erst wenn selbst bei Mindestgröße nichts frei ist: mittig,
// ausgewählt und kurzer Hinweis NO_FREE_SPACE_MESSAGE (ersetzt die Regel vom 21.10.2026 „kein Hinweis“).
export async function placeNewMotif({el,config,files,say},object,{minScale=1}={}){
 const before=JSON.stringify(el.state.objects),state={...el.state,selected:null,objects:el.state.objects.filter(o=>o.id!==object.id)};
 const facade={state,fontData:el.fontData,objectSVG:o=>el.objectSVG(o),uxObjectSVG:o=>el.uxObjectSVG(o)};
 const art=await printArtwork({el:facade,config,files}),g={...physicalGeometry(config,state),holes:[]},scale=2;
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(g.width*scale);canvas.height=Math.ceil(g.height*scale);
 const ctx=canvas.getContext('2d',{willReadFrequently:true}),url=URL.createObjectURL(new Blob([art.svg],{type:'image/svg+xml'})),img=new Image();
 try{img.src=url;await img.decode();ctx.drawImage(img,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}
 if(before!==JSON.stringify(el.state.objects))return say('Die Gestaltung wurde während der Platzsuche geändert. Bitte die Position des neuen Motivs prüfen.');
 const doorbell=config.doorbell?.schema==='gravuru-doorbell/v1',area=doorbell?g.designArea:null;
 const sx=doorbell?1:g.width/config.profile.geometry.width,sy=doorbell?1:g.height/config.profile.geometry.height;
 const insertion=config.acrylic?acrylicSelection(acrylicOptions(state.mOptions),config.acrylic.pricing).base.insertionMm:0;
 const margin=Number.isFinite(g.safeMarginMm)?Math.max(0,g.safeMarginMm):2; // Gestaltungsrand wie objectIssue/designArea (Standard 2 mm)
 const allowed=(x,y)=>(!area||(x/scale>=area.left&&x/scale<=area.right&&y/scale>=area.top&&y/scale<=area.bottom))&&y/scale<g.height-insertion&&(g.shape==='contour'?contourContainsPoint(g,x/scale,y/scale,{marginMm:margin,holes:false}):insideContour(g,x/scale,y/scale,-margin));
 const alpha=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 const smallMode=smallSignMotifMode(config,object);
 if(smallMode){
  const position=smallSignMotifPosition({mode:smallMode,object,objects:state.objects,fonts:el.fontData,alpha,width:canvas.width,height:canvas.height,sx,sy,pixelsPerMm:scale,minScale,allowed});
  if(position){Object.assign(object,position);el.sync();say('');return;}
 }else for(const s of placementScales(minScale)){
  const position=emptyPixelPosition(alpha,canvas.width,canvas.height,object.w*s*sx*scale,object.h*s*sy*scale,allowed);
  if(!position)continue;
  object.x=position.x/scale/sx;object.y=position.y/scale/sy;
  if(s<1){object.w*=s;object.h*=s;}
  el.sync();say('');return;
 }
 object.x=area?(area.left+area.right)/2:config.profile.geometry.width/2;object.y=area?(area.top+area.bottom)/2:config.profile.geometry.height/2;el.state.selected=object.id;el.sync();say(NO_FREE_SPACE_MESSAGE);
}

