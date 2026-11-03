// Issue #48 N36 (Chris, 31.10.2026): one-time assistance when choosing holes.
// This is never a validation constraint; subsequent manual placement stays free.
import {surfaceObjectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';
import {textOutlineBounds} from '../../platform/sources/app/shared/models/text-outline-fit.mjs';
import {surfaceGeometry} from './surfaces.mjs';
import {corners,overlaps} from './customer-tools-model.mjs';
import {SIGN_SCREW_HEAD_MM,SIGN_PLACEMENT_FAMILIES,SIGN_PLACEMENT_CLEARANCE_MM} from './mounting-dimensions.mjs';
export {SIGN_SCREW_HEAD_MM,SIGN_PLACEMENT_FAMILIES,SIGN_PLACEMENT_CLEARANCE_MM};
// Same customer-confirmed diameter as the screw preview (31.10). Reserve the
// head for both drilled and screwed options, so switching between them is stable.
const clone=v=>structuredClone(v),epsilon=1e-6;
const visible=o=>!o.uxHidden&&o.w>0&&o.h>0&&!(o.type==='text'&&!o.text?.trim());
const side=o=>o.surfaceId==='back'?'back':'front';
const movable=o=>visible(o)&&['text','motif','motif-raster'].includes(o.type)&&!o.uxLocked&&!o.technicalLocked&&o.customerEditable!==false;
export function signPlacementEnabled(config,profile){
 const id=profile.familySelection?.familyId||config.familyAcrylic?.familyId||config.mountingPlacementFamily;
 return SIGN_PLACEMENT_FAMILIES.includes(id)||SIGN_PLACEMENT_FAMILIES.some(f=>profile.id?.startsWith('family-'+f+'-')||new RegExp('^family-'+f+'-r[0-9]+$').test(profile.revision||''));
}
export function placementBox(o,resources={}){
 const ink=textOutlineBounds(o,resources.fonts);if(!ink)return o;
 const x=(ink.left+ink.right)/2,y=(ink.top+ink.bottom)/2,a=(o.rotation||0)*Math.PI/180;
 return {...o,x:o.x+x*Math.cos(a)-y*Math.sin(a),y:o.y+x*Math.sin(a)+y*Math.cos(a),w:ink.right-ink.left,h:ink.bottom-ink.top};
}
function touchesBox(o,profile){
 const holes=surfaceGeometry(profile.geometry,side(o)).holes||[],a=-(o.rotation||0)*Math.PI/180;
 const margin=Math.max(profile.mountingPreview?.keepoutMm??profile.geometry.holeKeepoutMm??0,SIGN_PLACEMENT_CLEARANCE_MM);
 return holes.some(h=>{const dx=h.x-o.x,dy=h.y-o.y,x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);
  return Math.hypot(Math.max(Math.abs(x)-o.w/2,0),Math.max(Math.abs(y)-o.h/2,0))<Math.max(h.diameter,SIGN_SCREW_HEAD_MM)/2+margin+epsilon;
 });
}
export function touchesMounting(o,profile,resources={}){return visible(o)&&touchesBox(placementBox(o,resources),profile);}
// Convex intersection area lets existing intentional overlaps remain, without
// accepting a new overlap or making an existing one larger while moving.
function overlapArea(a,b){
 if(side(a)!==side(b)||!overlaps(a,b))return 0;
 let points=corners(a);const clip=corners(b),cross=(u,v,w)=>(v.x-u.x)*(w.y-u.y)-(v.y-u.y)*(w.x-u.x);
 for(let i=0;i<4&&points.length;i++){
  const p=clip[i],q=clip[(i+1)%4],out=[];
  for(let j=0;j<points.length;j++){
   const u=points[j],v=points[(j+1)%points.length],cu=cross(p,q,u),cv=cross(p,q,v);
   if(cu>=-epsilon)out.push(u);
   if((cu>=0)!==(cv>=0)){const t=cu/(cu-cv);out.push({x:u.x+(v.x-u.x)*t,y:u.y+(v.y-u.y)*t});}
  }points=out;
 }
 return Math.abs(points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p.x*q.y-p.y*q.x;},0))/2;
}
const geometryKey=(state,p)=>JSON.stringify([state.designId,p.geometry.width,p.geometry.height,p.geometry.shape,p.geometry.outlinePath]);
const fields=['x','y','w','h','size','letterSpacing','lineHeight'];
function scaled(o,f){const n=clone(o);for(const k of fields.slice(2))if(Number.isFinite(n[k]))n[k]*=f;return n;}
function undoPlacement(state,profile){
 const cache=state.uxHolePlacement;if(!cache||cache.key!==geometryKey(state,profile))return state.objects.map(clone);
 return state.objects.map(raw=>{
  const saved=cache.changes.find(c=>c.id===raw.id);if(!saved)return clone(raw);
  const n=clone(raw);for(const k of fields)if(Number.isFinite(saved.before[k])&&Number.isFinite(saved.after[k])&&Number.isFinite(n[k])){
   // Exact restoration in the common case, but retain text/content and any
   // manual movement/resize performed after the automatic assistance.
   n[k]=Math.abs(n[k]-saved.after[k])<epsilon?saved.before[k]:k==='x'||k==='y'?n[k]+saved.before[k]-saved.after[k]:n[k]*saved.before[k]/saved.after[k];
  }return n;
 });
}
export function avoidMounting(objects,profile,resources={}){
 const result=objects.map(clone),changed=[],unresolved=[],originalBoxes=new Map(objects.map(o=>[o.id,placementBox(o,resources)]));
 const freeProfile={...profile,geometry:{...profile.geometry,holes:[]}};
 // Originally intersecting elements (e.g. STOP inside its octagon) move as one
 // component. Never detach lettering from an ornament or distort a motif.
 const pending=result.filter(movable),groups=[];
 while(pending.length){const group=[pending.shift()];for(let i=0;i<group.length;i++)for(let j=pending.length-1;j>=0;j--)if(overlapArea(originalBoxes.get(group[i].id),originalBoxes.get(pending[j].id))>epsilon)group.push(...pending.splice(j,1));groups.push(group);}
 groups.sort((a,b)=>(a.some(o=>o.type==='text')?0:1)-(b.some(o=>o.type==='text')?0:1));
 const place=(group,allowMove)=>{
  if(!group.some(o=>touchesMounting(o,profile,resources)))return true;
  const ids=new Set(group.map(o=>o.id)),neighbours=result.filter(o=>!ids.has(o.id)&&visible(o)).map(o=>placementBox(o,resources));
  const limits=new Map(group.map(o=>[o.id,new Map(neighbours.map(n=>[n.id,overlapArea(originalBoxes.get(o.id),originalBoxes.get(n.id))]))]));
  const points=group.flatMap(o=>corners(originalBoxes.get(o.id))),cx=(Math.min(...points.map(p=>p.x))+Math.max(...points.map(p=>p.x)))/2,cy=(Math.min(...points.map(p=>p.y))+Math.max(...points.map(p=>p.y)))/2;
  const orderPreserved=(n,o)=>{if(side(n)!==side(o))return true;const a=originalBoxes.get(n.id),b=originalBoxes.get(o.id);
   return !(a.y+a.h/2<=b.y-b.h/2&&n.y>o.y||a.y-a.h/2>=b.y+b.h/2&&n.y<o.y||a.x+a.w/2<=b.x-b.w/2&&n.x>o.x||a.x-a.w/2>=b.x+b.w/2&&n.x<o.x);
  };
  const dx=profile.geometry.width/2-cx,dy=profile.geometry.height/2-cy,base=Math.atan2(dy,dx);
  const angles=[base,...Array.from({length:48},(_,i)=>i*Math.PI/24)].filter((a,i,list)=>list.indexOf(a)===i);
  const directions=angles.map(a=>[Math.cos(a),Math.sin(a)]).sort((a,b)=>(b[0]*dx+b[1]*dy)-(a[0]*dx+a[1]*dy));
  const find=f=>{
   const scaledGroup=group.map(o=>({...scaled(o,f),x:cx+(o.x-cx)*f,y:cy+(o.y-cy)*f})),boxes=scaledGroup.map(o=>placementBox(o,resources));
   const cornersAll=boxes.flatMap(o=>corners(o)),left=Math.min(...cornersAll.map(p=>p.x)),right=Math.max(...cornersAll.map(p=>p.x)),top=Math.min(...cornersAll.map(p=>p.y)),bottom=Math.max(...cornersAll.map(p=>p.y));
   const minX=-left,maxX=profile.geometry.width-right,minY=-top,maxY=profile.geometry.height-bottom;
   if(minX>maxX||minY>maxY)return null;
   const valid=(x,y)=>{
    if(x<minX||x>maxX||y<minY||y>maxY)return false;
    for(const box of boxes){const n={...box,x:box.x+x,y:box.y+y};if(touchesBox(n,profile)||!neighbours.every(o=>{
     if(side(n)!==side(o))return true;
     const originalArea=limits.get(n.id).get(o.id);
     return orderPreserved(n,o)&&(originalArea>epsilon?overlapArea(n,o)<=originalArea+epsilon:!overlaps(n,o));
    }))return false;}
    return scaledGroup.every(o=>!surfaceObjectIssue({...o,x:o.x+x,y:o.y+y},freeProfile,resources));
   };
   const moved=(x,y)=>scaledGroup.map(o=>({...o,x:o.x+x,y:o.y+y}));
   if(valid(0,0))return moved(0,0);
   if(!allowMove)return null;
   const max=Math.hypot(Math.max(Math.abs(minX),Math.abs(maxX)),Math.max(Math.abs(minY),Math.abs(maxY)));
   for(let d=.25;d<=max+.25;d+=.25){let best;
    for(const [x,y] of directions){if(!valid(x*d,y*d))continue;let lo=Math.max(0,d-.25),hi=d;
     for(let i=0;i<16;i++){const mid=(lo+hi)/2;if(valid(x*mid,y*mid))hi=mid;else lo=mid;}
     if(!best||hi<best.distance)best={x:x*hi,y:y*hi,distance:hi};
    }if(best)return moved(best.x,best.y);
   }return null;
  };
  let candidate=find(1);
  const minimum=Math.max(...group.map(o=>o.type==='text'?Math.min(1,3/o.size):.1));
  for(let f=.99;!candidate&&f>=minimum-epsilon;f=Math.max(minimum,f-.01)){candidate=find(f);if(f<=minimum+epsilon)break;}
  if(candidate){for(let i=0;i<group.length;i++){const raw=group[i],before=clone(raw);Object.assign(raw,candidate[i]);changed.push({id:raw.id,before,after:clone(raw)});}return true;}
  if(allowMove)unresolved.push(...group.map(o=>o.id));
  return false;
 };
 // Chris, 03.11.2026: zuerst die ganze Gestaltung einer Seite gemeinsam kleiner machen und
 // einrücken (Mitte bleibt, nichts verschiebt sich gegeneinander). Nur wenn das nicht reicht
 // (Mindestschrift 3 mm), weichen die Teile wie bisher einzeln aus.
 const blocked=new Set();
 for(const s of ['front','back']){const block=result.filter(o=>movable(o)&&side(o)===s);if(block.length&&place(block,false))for(const o of block)blocked.add(o.id);}
 for(const group of groups)if(!group.some(o=>blocked.has(o.id)))place(group,true);
 return {objects:result,changed,unresolved};
}
export function mountingPlacementState(config,state,previousProfile,nextProfile,resources={}){
 if(!signPlacementEnabled(config,nextProfile))return state;
 const same=geometryKey(state,previousProfile)===geometryKey(state,nextProfile);
 const objects=same?undoPlacement(state,previousProfile):state.objects.map(clone);
 if(!nextProfile.geometry.holes?.length)return {...state,objects,uxHolePlacement:null};
 const result=avoidMounting(objects,nextProfile,resources);
 return {...state,objects:result.objects,uxHolePlacement:{key:geometryKey(state,nextProfile),changes:result.changed}};
}
