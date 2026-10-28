import {selectionArrowStyles} from './selection-arrows.mjs';

const tileSelector='[data-c-design],[data-fk-frame],[data-fk-color],[data-ux-font],[data-ux=category-pick],[data-ux=upload-kind],[data-ux=mount-choice],[data-picture-option],[data-motif]';

// Hover is presentation only. Motif selection follows the actual selected object,
// including Undo, deletion and switching to another object, never the last click.
export function motifTileSelected(state,id){
 const object=state?.objects?.find(o=>o.id===state.selected);
 return !!object&&object.type==='motif'&&!object.uxHidden&&object.motif===id;
}

export function installRestoredNotice(note,{schedule=setTimeout,cancel=clearTimeout,Observer=MutationObserver}={}){
 if(!note)return ()=>{};
 const summary=note.querySelector('.ux-restored>summary'),label=summary||note.querySelector(':scope > span');
 if(label){label.textContent='✓ Stand wiederhergestellt';label.setAttribute('aria-label','Stand wiederhergestellt');}
 note.classList.add('ux-restored-notice');
 let timer=null,shown=false;
 const stop=()=>{if(timer!==null)cancel(timer);timer=null;};
 const sync=()=>{
  if(note.hidden){shown=false;stop();return;}
  if(shown)return;
  shown=true;stop();
  timer=schedule(()=>{timer=null;note.hidden=true;note.querySelector('.ux-restored')?.removeAttribute('open');},4000);
 };
 const observer=new Observer(sync);observer.observe(note,{attributes:true,attributeFilter:['hidden']});sync();
 return ()=>{stop();observer.disconnect();};
}

export async function installUxDetails({el,r}){
 const response=await fetch('/configurator/variant-m/ux-details.css');
 if(!response.ok)throw Error('Details der Bedienoberfläche fehlen.');
 const style=document.createElement('style');style.textContent=selectionArrowStyles+'\n'+await response.text();r.append(style);
 const stopNotice=installRestoredNotice(r.querySelector('[data-ux-session]'));
 function markTiles(){
  for(const card of r.querySelectorAll(tileSelector)){
   card.classList.add('ux-choice-tile');
   if(card.hasAttribute('data-motif')){
    const pressed=String(motifTileSelected(el.state,card.dataset.motif));
    if(card.getAttribute('aria-pressed')!==pressed)card.setAttribute('aria-pressed',pressed);
   }
   let badge=card.querySelector(':scope > .completion-check');
   if(!badge){badge=document.createElement('span');badge.className='completion-check';badge.setAttribute('aria-hidden','true');badge.textContent='✓';card.append(badge);}
   const hidden=card.getAttribute('aria-pressed')!=='true';if(badge.hidden!==hidden)badge.hidden=hidden;
  }
 }
 let queued=false;
 const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;markTiles();});});
 observer.observe(r,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed']});
 for(const name of ['render','sync']){const original=el[name];el[name]=function(...args){const value=original.apply(this,args);markTiles();return value;};}
 markTiles();
 window.addEventListener('pagehide',()=>{observer.disconnect();stopNotice();},{once:true});
}
