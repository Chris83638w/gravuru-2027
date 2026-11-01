// Issue #48 N36 (Chris, 31.10.2026): one-time assistance when choosing holes.
// This is never a validation constraint; subsequent manual placement stays free.
import {surfaceObjectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';
import {surfaceGeometry} from './surfaces.mjs';
import {corners,overlaps} from './customer-tools-model.mjs';
import {SIGN_SCREW_HEAD_MM,SIGN_PLACEMENT_FAMILIES} from './mounting-dimensions.mjs';
export {SIGN_SCREW_HEAD_MM,SIGN_PLACEMENT_FAMILIES};
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
export function touchesMounting(o,profile){
 if(!visible(o))return false;
 const holes=surfaceGeometry(profile.geometry,side(o)).holes||[],a=-(o.rotation||0)*Math.PI/180;
 return holes.some(h=>{const dx=h.x-o.x,dy=h.y-o.y,x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);
  return Math.hypot(Math.max(Math.abs(x)-o.w/2,0),Math.max(Math.abs(y)-o.h/2,0))<Math.max(h.diameter,SIGN_SCREW_HEAD_MM)/2+epsilon;
 });
}
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
 const result=objects.map(clone),original=objects.map(clone),changed=[],unresolved=[];
 const freeProfile={...profile,geometry:{...profile.geometry,holes:[]}};
 // Text first: keep the source motif whenever moving text makes room for it.
 const targets=result.filter(movable).sort((a,b)=>(a.type==='text'?0:1)-(b.type==='text'?0:1));
 for(const raw of targets){
  if(!touchesMounting(raw,profile))continue;
  const neighbours=result.filter(o=>o.id!==raw.id&&visible(o)&&side(o)===side(raw));
  const limits=new Map(neighbours.map(o=>[o.id,overlapArea(original.find(v=>v.id===raw.id),original.find(v=>v.id===o.id))]));
  const orderPreserved=(n,o)=>{
   const a=original.find(v=>v.id===raw.id),b=original.find(v=>v.id===o.id);
   return !(a.y+a.h/2<=b.y-b.h/2&&n.y>o.y||a.y-a.h/2>=b.y+b.h/2&&n.y<o.y||a.x+a.w/2<=b.x-b.w/2&&n.x>o.x||a.x-a.w/2>=b.x+b.w/2&&n.x<o.x);
  };
  const valid=n=>!touchesMounting(n,profile)&&neighbours.every(o=>orderPreserved(n,o)&&overlapArea(n,o)<=(limits.get(o.id)||0)+epsilon)&&!surfaceObjectIssue(n,freeProfile,resources);
  const dx=profile.geometry.width/2-raw.x,dy=profile.geometry.height/2-raw.y,base=Math.atan2(dy,dx);
  const angles=[base,...Array.from({length:48},(_,i)=>i*Math.PI/24)].filter((a,i,list)=>list.indexOf(a)===i);
  // Prefer inward at equal distance. If the centre is occupied, use the nearest
  // free direction without jumping across neighbouring elements. A quarter-mm
  // radial search is followed by binary refinement (no visible snapping).
  const directions=angles.map(a=>[Math.cos(a),Math.sin(a)]).sort((a,b)=>(b[0]*dx+b[1]*dy)-(a[0]*dx+a[1]*dy));
  const max=Math.hypot(profile.geometry.width,profile.geometry.height);
  const find=o=>{
   if(valid(o))return o;
   for(let d=.25;d<=max;d+=.25){
    let best;
    for(const [x,y] of directions){const n={...o,x:o.x+x*d,y:o.y+y*d};if(!valid(n))continue;
     let lo=Math.max(0,d-.25),hi=d;for(let i=0;i<16;i++){const mid=(lo+hi)/2;if(valid({...o,x:o.x+x*mid,y:o.y+y*mid}))hi=mid;else lo=mid;}
     if(!best||hi<best.distance)best={object:{...o,x:o.x+x*hi,y:o.y+y*hi},distance:hi};
    }if(best)return best.object;
   }return null;
  };
  let candidate=find(raw);
  // Shrink uniformly only after trying every translation; the family minimum
  // text height is 3 mm. Existing smaller text is never made smaller here.
  const minimum=raw.type==='text'?Math.min(1,3/raw.size):.1;
  for(let f=.99;!candidate&&f>=minimum-epsilon;f=Math.max(minimum,f-.01)){
   candidate=find(scaled(raw,f));if(f<=minimum+epsilon)break;
  }
  if(candidate){const before=clone(raw);Object.assign(raw,candidate);changed.push({id:raw.id,before,after:clone(raw)});}else unresolved.push(raw.id);
 }
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
