import {contourSafeAreaSvg} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {ACRYLIC_SAFE_AREA} from './acrylic-product.mjs';
import {objectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';

// Import, resizing and validation use the same contour test (including the
// constant-distance inset of an ellipse). Never fit to another product's box.
export function designArea(config,profile=config.profile){
 if(config.acrylic)return {...ACRYLIC_SAFE_AREA};
 const g=profile.geometry,m=g.safeMarginMm??2;
 if(config.doorbell?.schema==='gravuru-doorbell/v1'&&g.designArea)return {...g.designArea};
 if(g.shape==='contour')return contourSafeAreaSvg(g,'design-area-bounds').bounds;
 return {left:m,top:m,right:g.width-m,bottom:config.doorbell?g.bell.y-m:g.height-m};
}
const n=v=>Number(v.toFixed(3));
let contourAreaSerial=0;
// Outline of the design area as SVG markup in mm (same inset rules as objectIssue:
// rounded rectangle with reduced radius, constant-distance inset of an ellipse).
// Empty when nothing is hidden (margin 0 on a plain plate).
export function designAreaOutline(config,profile=config.profile){
 const g=profile.geometry;
 if(config.doorbell?.schema==='gravuru-doorbell/v1'&&g.designArea){const a=g.designArea;return `<rect x="${n(a.left)}" y="${n(a.top)}" width="${n(a.right-a.left)}" height="${n(a.bottom-a.top)}"/>`;}
 if(g.shape==='contour'){
  const area=contourSafeAreaSvg(g,'m-design-area-'+(++contourAreaSerial));
  return '<defs>'+area.defs+'</defs><g '+area.attribute+'><path d="'+g.outlinePath+'" fill="#278a72" fill-opacity=".08" stroke="none"/></g>';
 }
 if(config.acrylic){const a=ACRYLIC_SAFE_AREA;return `<rect x="${a.left}" y="${a.top}" width="${a.right-a.left}" height="${a.bottom-a.top}"/>`;}
 const m=g.safeMarginMm??2,bottom=config.doorbell&&g.bell?g.bell.y-m:g.height-m;
 if(!(m>0)&&bottom>=g.height)return '';
 if(m*2>=Math.min(g.width,g.height)||bottom<=m)return '';
 if(g.shape==='ellipse'){
  const a=g.width/2,b=g.height/2,cx=a,cy=b,points=[];
  for(let i=0;i<120;i++){
   const t=i/120*2*Math.PI,px=a*Math.cos(t),py=b*Math.sin(t),nx=b*Math.cos(t),ny=a*Math.sin(t),len=Math.hypot(nx,ny)||1;
   points.push(n(cx+px-m*nx/len)+','+n(cy+py-m*ny/len));
  }
  return `<polygon points="${points.join(' ')}"/>`;
 }
 const r=Math.max(0,(g.cornerRadiusMm||0)-m);
 return `<rect x="${n(m)}" y="${n(m)}" width="${n(g.width-2*m)}" height="${n(bottom-m)}"${r?` rx="${n(r)}"`:''}/>`;
}
// Visible design boundary: a 1 px dashed preview line. Never part of production
// files – the production SVG is rendered without this layer (show=false).
export function designAreaPreview(svg,config,profile=config.profile,{show=true}={}){
 if(!show)return svg;
 // A doorbell's largest free rectangle only helps initial placement. Drawing
 // it as a permanent border wrongly suggests the remaining acrylic is unusable.
 if(config.doorbell?.schema==='gravuru-doorbell/v1')return svg;
 const outline=designAreaOutline(config,profile);if(!outline)return svg;
 const end=svg.lastIndexOf('</svg>');
 return end<0?svg:svg.slice(0,end)+'<g data-m-design-area="true" aria-label="Gestaltungsrand" pointer-events="none" fill="none" stroke="#a0a8a3" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="1.5 1">'+outline.replace('/>',' vector-effect="non-scaling-stroke"/>')+'</g>'+svg.slice(end);
}
export function fittedArtwork(config,width,height,{original=false}={}){
 if(![width,height].every(n=>Number.isFinite(n)&&n>0))throw Error('Die Datei benötigt gültige Maße.');
 const a=designArea(config),x=(a.left+a.right)/2,y=(a.top+a.bottom)/2;
 const at=scale=>({x,y,w:width*scale,h:height*scale,rotation:0});
 let scale=original?1:Math.min((a.right-a.left)/width,(a.bottom-a.top)/height);
 if(objectIssue(at(scale),config.profile)){
  if(original)throw Object.assign(Error('Das Originalmaß passt nicht vollständig in die Kontur. Wähle „Proportional einpassen“.'),{status:422,code:'original_does_not_fit'});
  let low=0,high=scale;
  for(let i=0;i<60;i++){const mid=(low+high)/2;if(objectIssue(at(mid),config.profile))high=mid;else low=mid;}
  scale=low*(1-1e-9);
 }
 if(!(scale>0)||objectIssue(at(scale),config.profile))throw Error('In dieser Kontur ist keine freie Gestaltungsfläche verfügbar.');
 return {...at(scale),scale};
}

