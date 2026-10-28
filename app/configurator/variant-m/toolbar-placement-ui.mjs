import {resolveToolbarPlacement,toolbarPlacementQuery} from './toolbar-placement-model.mjs';

// Apply presentation metadata at startup and after a later account/cart restore.
// The draft itself must reach the original validator untouched: a comparison URL
// cannot turn malformed metadata or a foreign product into an accepted draft.
export function installToolbarPlacementUi(el,{config,embedded=false,search='',storage,random}={}){
 el.state.ui={textToolbarPlacement:resolveToolbarPlacement({config,embedded,search,savedUi:el.state.ui,storage,random})};
 const explicit=toolbarPlacementQuery(search,{embedded});
 if(explicit&&typeof el.restoreDraft==='function'){
  const restore=el.restoreDraft;
  el.restoreDraft=function(draft,...args){
   const restored=restore.call(this,draft,...args);
   this.state.ui={textToolbarPlacement:explicit};
   this.sync();
   return restored;
  };
 }
 return el.state.ui.textToolbarPlacement;
}
