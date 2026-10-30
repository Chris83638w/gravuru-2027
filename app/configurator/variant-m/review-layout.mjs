// Chris' follow-up to direction 6. Existing controls keep their own handlers.
export function installReviewLayout({el,r}){
 const preview=r.querySelector('.ux-preview');
 const designs=document.createElement('button');designs.type='button';designs.className='ux-design-entry';designs.textContent='Design auswählen';
 designs.addEventListener('click',()=>{r.querySelector('#ux-tab-design')?.click();el.uxMobileSteps?.show('design',{scroll:false});});
 r.querySelector('.ux-canvas-toolbar')?.append(designs);
 return preview;
}
