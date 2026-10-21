import {ACRYLIC_SAFE_AREA} from './acrylic-product.mjs';
import {objectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';

// Import, resizing and validation use the same contour test (including the
// constant-distance inset of an ellipse). Never fit to another product's box.
export function designArea(config){
 if(config.acrylic)return {...ACRYLIC_SAFE_AREA};
 const g=config.profile.geometry,m=g.safeMarginMm??2;
 return {left:m,top:m,right:g.width-m,bottom:config.doorbell?g.bell.y-m:g.height-m};
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
