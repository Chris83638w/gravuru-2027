import {MOBILE_QUERY,previewHeight,revealEditorField} from './mobile-steps.mjs';

// Same product tabs and guarded checkout as desktop; no separate mobile wizard.
export async function installModernMobileNavigation({el,r,showTab}){
 const style=document.createElement('style');const css=await fetch('/configurator/variant-m/mobile.css');
 if(!css.ok)throw Error('Mobile Oberfläche fehlt.');style.textContent=await css.text();r.append(style);
 const media=matchMedia(MOBILE_QUERY),vv=window.visualViewport,editor=r.querySelector('.ux-editor');
 const dock=r.querySelector('.fk-buy-dock'),dockHome=document.createComment('desktop price bar');dock?.before(dockHome);
 let active=false,viewportOverride=null;
 const selected=()=>r.querySelector('[data-ux-tab][aria-selected=true]')?.dataset.uxTab||'design';
 const step=()=>selected()==='upload'?'media':selected();
 const fieldFocused=()=>!!r.activeElement?.matches('textarea,input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=color])');
 function viewport(){
  if(!active)return;const height=viewportOverride?.height??vv?.height??innerHeight,top=viewportOverride?.top??vv?.offsetTop??0;
  const keyboard=viewportOverride?.keyboardOpen===true||(fieldFocused()&&height<innerHeight*.75);
  r.host.style.setProperty('--ux-vv-height',Math.round(height)+'px');r.host.style.setProperty('--ux-vv-top',Math.round(top)+'px');
  r.host.style.setProperty('--ux-mobile-preview-h',previewHeight({viewportHeight:height,keyboardOpen:keyboard})+'px');
  r.host.dataset.uxKeyboard=String(keyboard);el.uxRefreshTextToolbar?.();
 }
 function show(id,{scroll=true}={}){
  if(!active)return;
  if(id==='review'){r.querySelector('.completion-finish')?.click();return;}
  const tab=id==='media'?'upload':id,button=r.querySelector('#ux-tab-'+tab);
  if(!button||button.hidden||button.disabled)return;
  showTab(tab);r.host.dataset.uxStep=step();if(scroll)editor.scrollTop=0;
 }
 function apply(){
  active=media.matches;
  if(active){if(dock)r.querySelector('.ux-shell').append(dock);r.host.dataset.uxMobile='true';r.host.dataset.uxMobileTabs='true';r.host.dataset.uxStep=step();viewport();}
  else{if(dock)dockHome.after(dock);for(const name of ['uxMobile','uxMobileTabs','uxKeyboard','uxStep'])delete r.host.dataset[name];for(const name of ['--ux-vv-height','--ux-vv-top','--ux-mobile-preview-h'])r.host.style.removeProperty(name);}
 }
 el.uxMobileSteps={get active(){return active;},get current(){return step();},show,applyViewport:(override=null)=>{viewportOverride=override;viewport();}};
 new MutationObserver(()=>{const next=step();if(active&&r.host.dataset.uxStep!==next){r.host.dataset.uxStep=next;editor.scrollTop=0;}}).observe(r.querySelector('.ux-tabs'),{subtree:true,attributes:true,attributeFilter:['aria-selected']});
 media.addEventListener('change',apply);for(const event of ['resize','scroll'])vv?.addEventListener(event,viewport);window.addEventListener('resize',viewport);
 r.addEventListener('focusin',e=>{if(!active)return;viewport();if(e.target.closest('.ux-direct-input'))show('text',{scroll:false});if(e.target.closest('.ux-editor')&&fieldFocused())setTimeout(()=>{if(r.activeElement===e.target)revealEditorField(e.target,editor);},280);});
 r.addEventListener('focusout',()=>{if(active)setTimeout(viewport,0);});
 if(typeof el.updateMobilePreview==='function'){const original=el.updateMobilePreview;el.updateMobilePreview=function(...args){if(!active)return original.apply(this,args);};}
 apply();
}
