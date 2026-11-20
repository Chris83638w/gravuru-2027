// Original Edelstahl-Variante C, archived loader v9b2ad51e101b7. The signed product
// supplies the thumbnail and price. Search, the six-card batches and selection use C.
export function installCards({gallery, el, thumb, esc}) {
  let shown = 6;
  function renderGallery(){const list=el.catalog.designs.filter(d=>d.name.toLocaleLowerCase('de').includes(gallery.querySelector('input').value.trim().toLocaleLowerCase('de')));
   gallery.querySelector('.c-gallery').innerHTML=list.slice(0,shown).map(d=>{return '<button type="button" class="c-design-card" data-c-design="'+d.id+'" aria-label="Design '+esc(d.name)+'" aria-pressed="'+(d.id===el.state.designId)+'">'+thumb(d)+'<span>'+esc(d.name)+'</span></button>';}).join('');
   gallery.querySelector('[data-c-count]').textContent=Math.min(shown,list.length)+' von '+list.length+' Designs';const more=gallery.querySelector('[data-c-more]');more.hidden=shown>=list.length;more.textContent='Mehr Designs anzeigen';const expanded=shown>6;gallery.querySelector('[data-c-less]').hidden=!expanded;gallery.querySelector('.c-gallery').classList.toggle('is-expanded',expanded);more.setAttribute('aria-expanded',String(expanded));}
  gallery.querySelector('input').addEventListener('input',()=>{shown=6;renderGallery();});gallery.querySelector('[data-c-more]').addEventListener('click',()=>{const total=el.catalog.designs.filter(d=>d.name.toLocaleLowerCase('de').includes(gallery.querySelector('input').value.trim().toLocaleLowerCase('de'))).length;shown=shown>=total?6:shown+6;renderGallery();});
  gallery.querySelector('[data-c-less]').addEventListener('click',()=>{shown=6;gallery.querySelector('.c-gallery').scrollTop=0;renderGallery();const more=gallery.querySelector('[data-c-more]');more.focus({preventScroll:true});gallery.scrollIntoView({block:'nearest',behavior:'smooth'});});gallery.querySelector('.c-gallery').tabIndex=0;
  gallery.addEventListener('click',e=>{const b=e.target.closest('[data-c-design]');if(b)el.chooseDesign(b.dataset.cDesign);});
  return () => { shown = 6; renderGallery(); };
}
