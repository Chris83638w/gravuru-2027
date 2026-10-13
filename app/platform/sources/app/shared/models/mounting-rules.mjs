import {validateGeometryHoles} from './design-content.mjs';

// A drill pattern is stored as a rule, not as coordinates. Every size and shape
// derives its holes from the same rule, so diameter and edge distance stay in
// millimetres when a plate is resized (never proportionally shifted).
export const MOUNTING_LAYOUTS=Object.freeze({
 'left-right':{count:2,label:'mittig links und rechts'},
 'top-bottom':{count:2,label:'mittig oben und unten'},
 'corners':{count:4,label:'in den vier Ecken'},
 'top-center':{count:1,label:'oben mittig'}
});
const fail=message=>{throw Error(message);};
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const round=v=>Math.round(v*1e6)/1e6;

export function validateMountingRule(rule){
 if(!rule||typeof rule!=='object'||Array.isArray(rule))fail('Ungültige Bohrbild-Regel.');
 const layout=MOUNTING_LAYOUTS[rule.layout];
 if(!layout)fail('Unbekannte Anordnung der Bohrlöcher.');
 if(rule.count!==layout.count)fail(`Die Anordnung „${layout.label}“ benötigt ${layout.count} Bohrloch/Bohrlöcher.`);
 if(!finite(rule.diameterMm,1,12))fail('Bohrlochdurchmesser: 1 bis 12 mm.');
 if(!finite(rule.edgeMm,rule.diameterMm/2,200))fail('Randabstand bis Bohrlochmitte muss mindestens den halben Durchmesser betragen.');
 if(rule.keepoutMm!==undefined&&!finite(rule.keepoutMm,0,20))fail('Schutzzone: 0 bis 20 mm.');
 return rule;
}

// geometry: {width,height,shape:'rect'|'ellipse',cornerRadiusMm}
export function holesFor(geometry,rule){
 validateMountingRule(rule);
 const {width:w,height:h,shape='rect'}=geometry,e=rule.edgeMm,d=rule.diameterMm;
 if(!finite(w,1,3000)||!finite(h,1,3000))fail('Ungültige Schildmaße.');
 // On an ellipse the edge distance is measured along the axis through the
 // centre, where the contour meets the plate's bounding box.
 if(shape==='ellipse'&&rule.layout==='corners')fail('Vier Eckbohrungen sind auf einer ovalen Form nicht eindeutig. Bitte „mittig links und rechts“ oder „oben und unten“ wählen.');
 const points={
  'left-right':[[e,h/2],[w-e,h/2]],
  'top-bottom':[[w/2,e],[w/2,h-e]],
  'corners':[[e,e],[w-e,e],[e,h-e],[w-e,h-e]],
  'top-center':[[w/2,e]]
 }[rule.layout];
 const holes=points.map(([x,y])=>({x:round(x),y:round(y),diameter:d}));
 validateGeometryHoles({geometry:{width:w,height:h,shape,cornerRadiusMm:geometry.cornerRadiusMm||0,holes}});
 for(let i=0;i<holes.length;i++)for(let j=i+1;j<holes.length;j++)if(Math.hypot(holes[i].x-holes[j].x,holes[i].y-holes[j].y)<d+2)fail('Die Bohrlöcher liegen zu dicht beieinander (mindestens 2 mm Steg).');
 return holes;
}

// Preview-only protection zones (hole edge + keepout). Never production geometry.
export function keepoutZones(holes,keepoutMm=0){
 return (holes||[]).map(h=>({x:h.x,y:h.y,r:h.diameter/2+keepoutMm}));
}

// Infer a rule from stored coordinates and accept it only if it reproduces them.
export function ruleFromHoles(geometry,holes){
 if(!Array.isArray(holes)||!holes.length)return null;
 const d=holes[0].diameter,{width:w,height:h}=geometry;
 const candidates=holes.length===2?(Math.abs(holes[0].y-holes[1].y)<1e-6?[['left-right',Math.min(holes[0].x,holes[1].x)]]:[['top-bottom',Math.min(holes[0].y,holes[1].y)]]):holes.length===4?[['corners',Math.min(...holes.map(p=>p.x))]]:holes.length===1?[['top-center',holes[0].y]]:[];
 for(const [layout,edgeMm] of candidates){
  const rule={layout,count:holes.length,diameterMm:d,edgeMm};
  try{
   const derived=holesFor(geometry,rule),key=p=>p.x.toFixed(3)+'|'+p.y.toFixed(3)+'|'+p.diameter;
   if(JSON.stringify(derived.map(key).sort())===JSON.stringify(holes.map(key).sort()))return rule;
  }catch{}
 }
 return null;
}
