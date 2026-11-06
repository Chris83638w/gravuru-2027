import {selectedProfile,resolvedOptions} from './contract.mjs';
import {mountingPlacementState,placementBox} from './mounting-placement.mjs';
import {corners} from './customer-tools-model.mjs';
import {surfaceObjectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';
import {measureText} from '../../platform/sources/app/shared/models/text-paths.mjs';
const clone=v=>structuredClone(v);
const free=p=>({...p,geometry:{...p.geometry,holes:[]}});
function containTransferred(objects,beforeObjects,before,after,resources){
 const measured=list=>list.map(o=>o.type==='text'&&resources.fonts?.[o.font]?measureText(clone(o),resources.fonts):o);
 objects=measured(objects);beforeObjects=measured(beforeObjects);
 // A change of aspect ratio can remove the old side gutters. Keep a previously
 // valid composition together if its customer's longer text used those gutters.
 if(after.geometry.shape!=='rect'||beforeObjects.some(o=>!o.uxHidden&&surfaceObjectIssue(o,free(before),resources))||!objects.some(o=>!o.uxHidden&&surfaceObjectIssue(o,free(after),resources)))return objects;
 const points=objects.filter(o=>!o.uxHidden).flatMap(o=>corners(placementBox(o,resources)));
 if(!points.length)return objects;
 const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
 const margin=after.geometry.safeMarginMm||0,w=after.geometry.width,h=after.geometry.height,f=Math.min(1,(w-2*margin)/(right-left),(h-2*margin)/(bottom-top));
 const cx=(left+right)/2,cy=(top+bottom)/2,hw=(right-left)*f/2,hh=(bottom-top)*f/2;
 const x=Math.max(margin+hw,Math.min(w-margin-hw,cx)),y=Math.max(margin+hh,Math.min(h-margin-hh,cy));
 return objects.map(o=>{const n={...o,x:x+(o.x-cx)*f,y:y+(o.y-cy)*f};for(const key of ['w','h','size','lineHeight','letterSpacing','strokeWidth'])if(Number.isFinite(n[key]))n[key]*=f;return n;});
}
export function scalableSizeState(config,state,nextOptions,resources={}){
 const before=selectedProfile(config,state.mOptions),after=selectedProfile(config,nextOptions);
 const options=resolvedOptions(config,nextOptions);
 if((state.mOptions?.size??config.scalableSizes.defaultSizeId)===options.size)return {...state,mOptions:options};
 const oldTemplate=before.designs.find(d=>d.id===state.designId),newTemplate=after.designs.find(d=>d.id===state.designId);
 if(!oldTemplate||!newTemplate)throw Error('Design ist in der gewählten Größe nicht vorhanden.');
 // Remove only unchanged automatic insets before changing physical size.
 const unfitted=mountingPlacementState(config,state,before,free(before),resources);
 const factor=newTemplate.katalog?.scale&&oldTemplate.katalog?.scale?newTemplate.katalog.scale/oldTemplate.katalog.scale:Math.min(after.geometry.width/before.geometry.width,after.geometry.height/before.geometry.height);
 const oldOffset=oldTemplate.katalog?.offsetMm||[0,0],newOffset=newTemplate.katalog?.offsetMm||[(after.geometry.width-before.geometry.width*factor)/2,(after.geometry.height-before.geometry.height*factor)/2];
 let objects=unfitted.objects.map(o=>{
  const a=oldTemplate.objects.find(v=>v.id===o.id),b=newTemplate.objects.find(v=>v.id===o.id),n=clone(o);
  n.x=a&&b?b.x+(o.x-a.x)*factor:(o.x-oldOffset[0])*factor+newOffset[0];
  n.y=a&&b?b.y+(o.y-a.y)*factor:(o.y-oldOffset[1])*factor+newOffset[1];
  for(const key of ['w','h','size','letterSpacing','lineHeight','strokeWidth'])if(Number.isFinite(o[key]))n[key]=a&&b&&Number.isFinite(b[key])&&a[key]?o[key]*b[key]/a[key]:o[key]*factor;
  return n;
 });
 objects=containTransferred(objects,unfitted.objects,before,after,resources);
 const next={...state,width:after.geometry.width,height:after.geometry.height,objects,mOptions:options,uxHolePlacement:null};
 return mountingPlacementState(config,next,free(after),after,resources);
}
