// Shared physical dimensions; no device positions or product-specific options.
export function updateProductViewport(el,geometry){
 const {width,height}=geometry,r=el.shadowRoot;
 el.style.setProperty('--m-plate-width',String(width));
 el.style.setProperty('--m-plate-height',String(height));
 el.style.setProperty('--m-plate-ratio',width+'/'+height);
 el.style.setProperty('--ux-ratio',width+'/'+height);
 for(const node of r.querySelectorAll('.ux-preview'))node.style.setProperty('--ux-ratio',width+'/'+height);
 for(const node of r.querySelectorAll('.stage')){
  node.style.setProperty('--ux-preview-ratio',width+'/'+height);
  node.style.setProperty('--ux-product-width',String(width));
  node.style.setProperty('--ux-product-height',String(height));
 }
 const label=new Intl.NumberFormat('de-DE',{maximumFractionDigits:3});
 for(const [selector,value]of [['.dimension-x span',width],['.dimension-y span',height]]){
  for(const node of r.querySelectorAll(selector))node.textContent=label.format(value)+' mm';
 }
}
