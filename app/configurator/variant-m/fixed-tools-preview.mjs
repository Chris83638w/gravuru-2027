// Opt-in review only. Remove tools=fixed from the URL to restore the existing UI.
export const fixedToolsRequested=(config,search='')=>(config?.productPreview===true||config?.reviewOnly===true)&&new URLSearchParams(search).get('tools')==='fixed';

export async function installFixedToolsPreview({el,r,config,search=location.search}){
 if(!fixedToolsRequested(config,search))return false;
 const response=await fetch('/configurator/variant-m/fixed-tools-preview.css');
 if(!response.ok)throw Error('Testansicht der Werkzeuge fehlt.');
 const style=document.createElement('style');style.textContent=await response.text();r.append(style);
 const rail=document.createElement('aside');rail.className='ux-fixed-tools';rail.setAttribute('aria-label','Werkzeuge für die Tafel');
 const actions=document.createElement('div');actions.className='ux-fixed-tools-actions';
 const size=document.createElement('div');size.className='ux-fixed-tools-size';
 const footer=document.createElement('div');footer.className='ux-fixed-tools-footer';
 rail.append(actions,size,footer);r.querySelector('.stage').append(rail);
 // Move the original controls, keeping their listeners, selection and undo.
 for(const [selector,home] of [['.ux-direct-edit',actions],['.ux-photo-size',size],['.ux-design-reset',footer],['.ux-view-zoom',footer]]){
  const node=r.querySelector(selector);if(node)home.append(node);
 }
 el.uxFixedToolsHost=actions;el.dataset.uxFixedTools='true';
 el.uxRefreshTextToolbar?.();
 return true;
}
