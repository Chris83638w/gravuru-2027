import {installDesignSearchControl} from './design-search-control.mjs';
import {searchDesigns} from './design-search.mjs';
import {moduleEnabled} from './module-profile.mjs';

// Preview/native editors hold a complete, already projected design set. They use
// the same metadata matching, without borrowing customer/shop gallery access.
export async function installNativeDesignSearch({el,r,config}={}){
 if(typeof r?.querySelector!=='function'||typeof el?.sync!=='function'||!moduleEnabled(config,'designs'))return;
 const panel=r.querySelector('#ux-panel-design'),gallery=r.querySelector('.c-gallery');if(!panel||!gallery)return;
 const response=await fetch('/configurator/variant-m/product-design-gallery.css');if(!response.ok)throw Error('Designsuche konnte nicht geladen werden.');
 const style=document.createElement('style');style.textContent=await response.text();r.append(style);
 gallery.id='ux-design-search-results';
 const status=document.createElement('p');status.className='ux-design-search-status';status.setAttribute('role','status');status.hidden=true;
 const before=panel.querySelector('.ux-design-reveal')||gallery;
 let reportedKey=null;
 const control=installDesignSearchControl({container:panel,before,onInvalidate:()=>{reportedKey=null;el.uxReportDesignSearch?.('',0);},onChange:()=>{el.sync();el.uxRefreshThumbnails?.();}});control.element.after(status);
 el.uxApplyDesignSearch=()=>{
  const query=control.query;if(!query){for(const card of gallery.querySelectorAll('[data-design-search-hidden]')){card.removeAttribute('data-design-search-hidden');card.removeAttribute('aria-hidden');card.inert=false;}status.hidden=true;reportedKey=null;return false;}
  const profile=el.uxSelectedProfile?.()||config.profile;
  const filters=Object.fromEntries([...r.querySelectorAll('[data-m-filter]')].map(f=>[f.dataset.mFilter,f.value]));
  const eligible=profile.designs.filter(d=>(!filters.category||d.category===filters.category)&&(!filters.collection||d.collections?.includes(filters.collection)));
  const found=searchDesigns(eligible,query,config),ids=new Set(found.map(d=>d.id)),cards=new Map([...gallery.querySelectorAll('[data-c-design]')].map(card=>[card.dataset.cDesign,card]));
  for(const [id,card]of cards){const excluded=!ids.has(id);card.hidden=excluded;card.toggleAttribute('data-design-search-hidden',excluded);card.inert=excluded;if(excluded)card.setAttribute('aria-hidden','true');else card.removeAttribute('aria-hidden');}
  const ordered=[...found.map(d=>cards.get(d.id)).filter(Boolean),...[...cards].filter(([id])=>!ids.has(id)).map(([,card])=>card)];if(ordered.some((card,i)=>gallery.children[i]!==card))for(const card of ordered)gallery.append(card);
  const more=r.querySelector('[data-ux=more-designs]');if(more)more.hidden=true;
  status.hidden=false;status.textContent=found.length===1?'1 Design gefunden':found.length?found.length+' Designs gefunden':'Keine passenden Designs gefunden. Versuche einen anderen Begriff oder leere die Suche.';
  const count=r.querySelector('[data-c-count]');if(count)count.textContent=found.length===1?'1 Design':found.length+' Designs';
  const key=JSON.stringify([query,el.state.mOptions,found.map(d=>d.id)]);if(key!==reportedKey){reportedKey=key;el.uxReportDesignSearch?.(query,found.length);}
  return true;
 };
 const sync=el.sync;el.sync=function(...args){const result=sync.apply(this,args);el.uxApplyDesignSearch();return result;};
 window.addEventListener('pagehide',()=>control.dispose(),{once:true});
}
