// Chris' follow-up to direction 6. Existing controls keep their own handlers.
export function installReviewLayout({el,r}){
 const preview=r.querySelector('.ux-preview'),entry=r.querySelector('.workflow-motif-entry'),best=r.querySelector('[data-bestseller-grid]');
 const designs=document.createElement('button');designs.type='button';designs.className='ux-design-entry';designs.textContent='Design auswählen';
 designs.addEventListener('click',()=>{r.querySelector('#ux-tab-design')?.click();el.uxMobileSteps?.show('design',{scroll:false});});
 r.querySelector('.ux-canvas-toolbar')?.append(designs);
 // More choices are native, allowed library motifs, never invented bestsellers.
 if(entry&&best){
  const section=document.createElement('section');section.className='ux-more-motifs';
  section.innerHTML='<h3>Weitere Motive</h3><div class="motifs" data-review-more-motifs></div><button type="button" class="ux-motif-library-link">Alle Motive entdecken →</button>';
  entry.querySelector('.ux-extra-motif')?.before(section);
  section.querySelector('button').addEventListener('click',()=>entry.querySelector('[data-ux=discover-motifs]')?.click());
  const grid=section.querySelector('[data-review-more-motifs]');let signature='';
  function update(){
   const used=new Set([...best.querySelectorAll('[data-motif]')].map(n=>n.dataset.motif)),allowed=new Set(el.uxMotifChoiceIds||[]);
   const choices=(window.GravuruMotifCategories||[]).filter(m=>allowed.has(m.key)&&!used.has(m.key)&&el.motifs[m.key]).slice(0,12);
   const next=choices.map(m=>m.key).join('|');if(next===signature)return;signature=next;grid.replaceChildren();
   for(const motif of choices){const b=document.createElement('button');b.type='button';b.dataset.motif=motif.key;b.title=motif.name;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('aria-hidden','true');svg.innerHTML=el.motifs[motif.key];
    b.append(svg,document.createTextNode(motif.name));grid.append(b);
   }
  }
  new MutationObserver(update).observe(best,{childList:true});update();
 }
 return preview;
}
