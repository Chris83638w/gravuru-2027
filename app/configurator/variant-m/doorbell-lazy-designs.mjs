import {isLayeredDoorbell} from './doorbell-selection.mjs';
import {observeVisibleResources} from './visible-resource-loader.mjs';
export function designResourcesReady(design,fonts={},motifs={}){
 return (design?.objects||[]).every(o=>o.type==='text'?!!fonts[o.font]:o.type==='motif'?typeof motifs[o.motif]==='string'||o.motif?.startsWith('ux-line-'):true);
}
// Installed after the synchronous design/transfer wrappers. The current design
// stays intact until every requested outline is present; stale clicks cannot win.
export function installDoorbellDesignLoading(el,config,say=()=>{}){
 if(!isLayeredDoorbell(config)||typeof el.uxEnsureDesignResources!=='function')return null;
 const designs=()=>el.uxSelectedProfile?.().designs||config.profile.designs;
 const gallery=el.shadowRoot?.querySelector('.c-gallery');
 if(gallery){
  // The same card ID may use different outlines in a different physical format.
  // Read the immutable template resources; customer text/placement is rendered by the usual thumbnail path.
  const templates=new Map();
  for(const format of config.doorbell.formats){
   for(const design of format.profile.designs)templates.set(format.key+'/'+design.id,design);
  }
  const view=gallery.ownerDocument.defaultView;
  const visible=observeVisibleResources({
   root:gallery,win:view,selector:'[data-c-design]',rootMargin:'0px',
   key:card=>(el.state.mOptions?.format||config.doorbell.defaultFormatKey)+'/'+card.dataset.cDesign,
   ready:key=>designResourcesReady(templates.get(key),el.fontData,el.motifs),
   load:key=>el.uxEnsureDesignResources(templates.get(key),{priority:'low'}),
   changed:()=>el.uxRefreshThumbnails?.()
  });
  view.addEventListener('pagehide',event=>{if(!event.persisted)visible.disconnect();});
 }
 const choose=el.chooseDesign;let sequence=0,foreground=null;
 el.chooseDesign=function(id,...args){
  const request=++sequence,design=designs().find(d=>d.id===id);
  if(!design||designResourcesReady(design,this.fontData,this.motifs)){foreground=null;this.uxDesignResourcePending=false;return choose.call(this,id,...args);}
  this.uxDesignResourcePending=true;say('Design wird geladen …');this.sync?.();
  foreground=this.uxEnsureDesignResources(design,{priority:'high'}).then(()=>{
   if(request!==sequence)return;
   if(!designResourcesReady(design,this.fontData,this.motifs))throw Error('Designressourcen fehlen.');
   say('');return choose.call(this,id,...args);
  }).catch(()=>{if(request===sequence)say('Das Design konnte nicht geladen werden. Bitte erneut wählen.');}).finally(()=>{if(request===sequence){foreground=null;this.uxDesignResourcePending=false;this.sync?.();}});
  return foreground;
 };
 return async()=>{
  for(const design of designs()){
   while(foreground)await foreground;
   try{await el.uxEnsureDesignResources(design,{priority:'low'});}catch{/* One unavailable preview must not stop the other cards. */}
  }
  el.uxRefreshThumbnails?.();el.sync();
 };
}
