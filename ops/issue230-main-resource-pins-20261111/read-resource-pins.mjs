// Pure adapter over existing native instances. No DB/host construction or writes.
import {digest} from '../issue230-main-update-review-20261111/update-review.mjs';

const types=['fonts','motifs','colors','bestsellers'];
const fail=code=>{throw Object.assign(Error(code),{code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const sync=value=>{need(!value||typeof value.then!=='function','resource_reader_async');return value;};
const positive=value=>Number.isSafeInteger(value)&&value>0;
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

export function createNativeUpdateResourcePinReader({profiles,productionProfiles}={}){
 need(profiles&&['settings','get','resolve'].every(key=>typeof profiles[key]==='function')&&typeof productionProfiles?.resolve==='function','resource_reader_context');
 function project(document){
  const settings=sync(profiles.settings()),resolved=sync(profiles.resolve(document));
  need(settings&&positive(settings.revision)&&resolved?.settingsRevision===settings.revision,'resource_reader_settings_changed');
  const refs=new Map();
  const add=(type,assignment)=>{if(assignment?.mode==='override')refs.set(type+':'+assignment.profileId,{type,id:assignment.profileId});};
  for(const type of types){
   add(type,settings.defaults[type]);
   for(const category of document.categoryIds)if(Object.hasOwn(settings.categories,category))add(type,settings.categories[category][type]);
   add(type,document.profileAssignments[type]);
  }
  const pinned=[...refs.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,ref])=>{
   const p=sync(profiles.get(ref.id));
   need(p?.id===ref.id&&p.type===ref.type&&positive(p.revision),'resource_reader_profile_changed');
   return {type:p.type,id:p.id,revision:p.revision,sha256:digest({name:p.name,type:p.type,items:p.items})};
  });
  for(const type of types){
   const source=resolved.sources?.[type];need(source,'resource_reader_source_missing');
   if(source.profileId!==null){const pin=pinned.find(p=>p.type===type&&p.id===source.profileId);need(pin&&pin.revision===source.profileRevision,'resource_reader_profile_changed');}
  }
  const manufacturing=sync(productionProfiles.resolve(document));
  if(manufacturing!==null)need(manufacturing?.id===document.productionProfile?.id&&manufacturing.revision===document.productionProfile?.revision&&positive(manufacturing.revision)&&hash(manufacturing.sha256),'resource_reader_production_changed');
  else need(!document.productionProfile,'resource_reader_production_changed');
  return {
   categoryIds:[...document.categoryIds],
   categoryAssignments:document.categoryIds.map(id=>({id,present:Object.hasOwn(settings.categories,id),sha256:Object.hasOwn(settings.categories,id)?digest(settings.categories[id]):null})),
   settings:{revision:settings.revision,sha256:digest({defaults:settings.defaults,categories:settings.categories})},
   profiles:pinned,
   resolutionSha256:digest(resolved),
   // Native SHA of stored manufacturing JSON bytes, not a canonical rehash.
   productionProfile:manufacturing===null?null:{id:manufacturing.id,revision:manufacturing.revision,sha256:manufacturing.sha256}
  };
 }
 return function readResourcePins(document){
  const first=project(document),second=project(document);
  need(digest(first)===digest(second),'resource_reader_drift');
  return second;
 };
}
