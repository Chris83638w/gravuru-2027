import {isLayeredDoorbell} from './doorbell-selection.mjs';
export function designResourcesReady(design,fonts={},motifs={}){
 return (design?.objects||[]).every(o=>o.type==='text'?!!fonts[o.font]:o.type==='motif'?typeof motifs[o.motif]==='string'||o.motif?.startsWith('ux-line-'):true);
}
// Installed after the synchronous design/transfer wrappers. The current design
// stays intact until every requested outline is present; stale clicks cannot win.
export function installDoorbellDesignLoading(el,config,say=()=>{}){
 if(!isLayeredDoorbell(config)||typeof el.uxEnsureDesignResources!=='function')return null;
 const designs=()=>el.uxSelectedProfile?.().designs||config.profile.designs;
 const choose=el.chooseDesign;let sequence=0;
 el.chooseDesign=function(id,...args){
  const request=++sequence,design=designs().find(d=>d.id===id);
  if(!design||designResourcesReady(design,this.fontData,this.motifs)){this.uxDesignResourcePending=false;return choose.call(this,id,...args);}
  this.uxDesignResourcePending=true;say('Design wird geladen …');this.sync?.();
  return this.uxEnsureDesignResources(design).then(()=>{
   if(request!==sequence)return;
   if(!designResourcesReady(design,this.fontData,this.motifs))throw Error('Designressourcen fehlen.');
   say('');return choose.call(this,id,...args);
  }).catch(()=>{if(request===sequence)say('Das Design konnte nicht geladen werden. Bitte erneut wählen.');}).finally(()=>{if(request===sequence){this.uxDesignResourcePending=false;this.sync?.();}});
 };
 return async()=>{
  await Promise.all(designs().map(d=>el.uxEnsureDesignResources(d)));
  el.uxRefreshThumbnails?.();el.sync();
 };
}
