import {contourContainsPoint} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {printArtwork,physicalGeometry} from './print-export.mjs';
import {acrylicSelection,acrylicOptions} from './acrylic-product.mjs';
import {insideContour} from './print-export-model.mjs';
import {PLACEMENT_STEP,NO_FREE_SPACE_MESSAGE} from './workflow-model.mjs';

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
export function emptyPixelPosition(alpha,width,height,boxWidth,boxHeight,allowed=()=>true){
 const integral=new Uint32Array((width+1)*(height+1)),stride=width+1;
 for(let y=0;y<height;y++){let row=0;for(let x=0;x<width;x++){row+=alpha[(y*width+x)*4+3]>0||!allowed(x,y)?1:0;integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+row;}}
 const hw=Math.ceil(boxWidth/2)+2,hh=Math.ceil(boxHeight/2)+2;let best=null,distance=Infinity;
 for(let y=hh;y<=height-hh;y+=2)for(let x=hw;x<=width-hw;x+=2){
  if(!allowed(x-hw,y-hh)||!allowed(x+hw,y-hh)||!allowed(x-hw,y+hh)||!allowed(x+hw,y+hh))continue;
  const occupied=integral[(y+hh)*stride+x+hw]-integral[(y-hh)*stride+x+hw]-integral[(y+hh)*stride+x-hw]+integral[(y-hh)*stride+x-hw];
  const d=(x-width/2)**2+(y-height/2)**2;if(!occupied&&d<distance){distance=d;best={x,y};}
 }
 return best;
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
 for(const s of placementScales(minScale)){
  const position=emptyPixelPosition(alpha,canvas.width,canvas.height,object.w*s*sx*scale,object.h*s*sy*scale,allowed);
  if(!position)continue;
  object.x=position.x/scale/sx;object.y=position.y/scale/sy;
  if(s<1){object.w*=s;object.h*=s;}
  el.sync();say('');return;
 }
 object.x=area?(area.left+area.right)/2:config.profile.geometry.width/2;object.y=area?(area.top+area.bottom)/2:config.profile.geometry.height/2;el.state.selected=object.id;el.sync();say(NO_FREE_SPACE_MESSAGE);
}

