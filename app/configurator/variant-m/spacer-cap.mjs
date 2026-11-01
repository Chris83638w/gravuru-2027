import {SCREW_HEAD_IMAGE} from './screw-head-image.mjs';
import {SIGN_SCREW_HEAD_MM} from './mounting-dimensions.mjs';
// Native 12 mm preview geometry. Visual reference: Christopher's attachment, 2026-09-27.
export const SPACER_FINISHES=[{id:'silver',label:'Silber',base:'#55595b',face:'#a6abad',shine:'#f2f4f5'},{id:'black',label:'Schwarz',base:'#101214',face:'#363a3d',shine:'#767d81'},{id:'rose-gold',label:'Roségold',base:'#81544b',face:'#c59082',shine:'#f9ddd1'},{id:'bronze',label:'Bronze',base:'#67442c',face:'#a78051',shine:'#e7c997'},{id:'white',label:'Weiß',base:'#b7b9b7',face:'#e6e7e3',shine:'#ffffff'}];
function blend(a,b,t){const rgb=v=>[1,3,5].map(i=>parseInt(v.slice(i,i+2),16));return '#'+rgb(a).map((v,i)=>Math.round(v+(rgb(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');}
export function spacerCap(finishId='silver'){
 const finish=SPACER_FINISHES.find(f=>f.id===finishId)||SPACER_FINISHES[0];let sectors='';const n=180,r=5.7;
 for(let i=0;i<n;i++){const a=i*2*Math.PI/n,b=(i+1.12)*2*Math.PI/n;
  const light=Math.max(0,Math.min(1,.5+.36*Math.cos(2*a-.7)+.1*Math.cos(6*a+1.2)+.04*Math.sin(i*17)));
  const color=light<.5?blend(finish.base,finish.face,light*2):blend(finish.face,finish.shine,(light-.5)*2);
  sectors+=`<path d="M0 0L${(r*Math.cos(a)).toFixed(4)} ${(r*Math.sin(a)).toFixed(4)}A${r} ${r} 0 0 1 ${(r*Math.cos(b)).toFixed(4)} ${(r*Math.sin(b)).toFixed(4)}Z" fill="${color}"/>`;
 }
 const rings=Array.from({length:27},(_,i)=>`<circle r="${(.4+i*.19).toFixed(2)}" fill="none" stroke="${i%2?finish.shine:finish.base}" stroke-width=".018" opacity=".15"/>`).join('');
 return `<circle cy=".55" r="6" fill="#000" opacity=".2"/><circle r="6" fill="${finish.base}"/><circle r="5.85" fill="${finish.face}"/>${sectors}${rings}<circle r="5.78" fill="none" stroke="${finish.shine}" stroke-width=".08" opacity=".55"/>`;
}


// Customer-confirmed head diameter: 4.5 mm. Preview only; drilling stays source-bound.
export function screwHead(diameterMm=SIGN_SCREW_HEAD_MM){
 // Original alpha bounds: (11,10)-(390,390). Square viewBox keeps proportions;
 // the visible head fits exactly in the requested physical diameter.
 return '<svg data-screw-head-mm="'+diameterMm+'" x="'+(-diameterMm/2)+'" y="'+(-diameterMm/2)+'" width="'+diameterMm+'" height="'+diameterMm+'" viewBox="10.5 10 380 380"><image width="400" height="400" href="'+SCREW_HEAD_IMAGE+'"/></svg>';
}
