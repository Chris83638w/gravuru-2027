// Display-only copy of the currently selected product, never a production export.
export function productScenePreview(stage){
 const rect=stage.getBoundingClientRect(),copy=document.createElement('div');
 copy.className='completion-product-scene';copy.setAttribute('role','img');
 copy.setAttribute('aria-label','Deine Gestaltung auf Acrylglas mit der gewählten Sockelausführung');
 copy.style.aspectRatio=rect.width+'/'+rect.height;
 for(const source of stage.children){
  if(!source.matches('.acryl-backdrop,.plate-holder,.acryl-base')||source.hidden)continue;
  const node=source.cloneNode(true),bounds=source.getBoundingClientRect(),css=getComputedStyle(source);
  node.className=source.matches('.plate-holder')?'completion-product-plate':'completion-product-image';
  node.setAttribute('aria-hidden','true');
  node.querySelectorAll('.object-controls,.dimension-x,.dimension-y,[data-resize],.resize-handle,.rotate-object,[data-customer-highlights],[data-workflow-guides],.ux-alignment-guides').forEach(n=>n.remove());
  for(const n of node.querySelectorAll('[data-preview-only]')){
   if(n.querySelector('image'))n.querySelectorAll('g[transform]').forEach(h=>h.remove());else n.remove();
  }
  for(const n of node.querySelectorAll('[data-direct-active]')){n.style.visibility='';delete n.dataset.directActive;}
  for(const n of [node,...node.querySelectorAll('*')])for(const a of ['data-object','tabindex','data-ux','data-ux-namespace'])n.removeAttribute(a);
  const svg=node.querySelector('svg.scene');
  if(svg){svg.classList.remove('scene');svg.classList.add('completion-product-artwork');svg.style.cssText='display:block;width:100%!important;height:100%!important;max-height:none!important;background:transparent;overflow:visible';}
  // A newly selected base may still be loading and report a zero layout height.
  // Its intrinsic ratio must remain live so it appears when decoding completes.
  const height=source.matches('.acryl-base')?'auto':bounds.height/rect.height*100+'%';
  node.style.cssText=`position:absolute;left:${(bounds.left-rect.left)/rect.width*100}%;top:${(bounds.top-rect.top)/rect.height*100}%;width:${bounds.width/rect.width*100}%;height:${height};margin:0;padding:0;max-width:none;z-index:${css.zIndex};clip-path:${css.clipPath};pointer-events:none;background:transparent;box-shadow:none;`;
  copy.append(node);
 }
 return copy;
}
