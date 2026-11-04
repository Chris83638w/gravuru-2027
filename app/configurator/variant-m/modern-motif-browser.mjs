import {installCategoryPicker} from './category-picker.mjs';
// Reuse the native library controls and listeners; no second motif or price state.
export function installModernMotifBrowser({r,el}){
 const entry=r.querySelector('.workflow-motif-entry'),panel=r.querySelector('#panel-motif');
 const category=r.querySelector('[data-library-category]'),search=r.querySelector('[data-library-search]');
 if(!entry||!panel||!category||!search)return;
 const nav=entry.querySelector('.completion-motif-nav'),help=nav?.querySelector('[data-ux-info=motif]');
 const heading=document.createElement('h2');heading.className='ux-info-heading';heading.textContent='Motive';if(help)heading.append(help);
 nav?.remove();entry.querySelector('[data-ux=discover-motifs]')?.remove();
 const best=entry.querySelector('[data-bestsellers]');if(best)best.hidden=true;
 entry.prepend(heading);panel.hidden=el.uxMotifChoiceIds?.length===0;category.hidden=false;
 panel.querySelector('h3')?.remove();
 category.setAttribute('aria-label','Motivkategorie');category.closest('label').classList.add('ux-modern-category');
 panel.querySelector('.ux-category-control')?.remove();
 search.placeholder='Was suchst du? Zum Beispiel ein Herz';
 const price=entry.querySelector('.ux-motif-pricing');if(price)category.closest('label').after(price);
 const less=panel.querySelector('[data-library-less]');if(less)less.hidden=true;
 entry.classList.add('ux-modern-motifs');
 const refreshCategory=installCategoryPicker(category);
 const sync=el.sync;el.sync=function(...args){const result=sync.apply(this,args);refreshCategory();return result;};
}
