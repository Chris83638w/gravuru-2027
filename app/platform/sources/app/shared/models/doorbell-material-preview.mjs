import {escapeXml as esc} from './design-content.mjs';

// Existing empty AOSU surface, documented in MATERIALREFERENZEN.md. Preview only:
// never copy the lettering from the steel-reference-v4 specimen into a product.
export const DOORBELL_STEEL_SURFACE='/_runtime/images/gravuru-edelstahl-feine-maserung-vorschau.png';
export function doorbellMaterialPreview(profile,acrylic,id){
 const {width:w,height:h}=profile.geometry,a=acrylic;
 const source=profile.admin?.steelImageUrl||DOORBELL_STEEL_SURFACE;
 const depth=Number.isFinite(a.thicknessMm)&&a.thicknessMm>0?a.thicknessMm:0;
 const dx=depth*.25,dy=depth*.38;
 // Oblique edge projection is a 2D visual approximation of the stored thickness.
 // The front face, bell and holes retain their exact original millimetres.
 const steel='<g data-role="guide" data-doorbell-steel="textured" pointer-events="none"><defs><clipPath id="'+id+'-steel-face"><rect width="'+w+'" height="'+h+'"/></clipPath></defs><image href="'+esc(source)+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid slice" clip-path="url(#'+id+'-steel-face)"/><path d="M.3 '+(h-.3)+'V.3H'+(w-.3)+'" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width=".6"/><path d="M'+(w-.3)+' .3V'+(h-.3)+'H.3" fill="none" stroke="#596168" stroke-width=".55"/></g>';
 const glass='<g data-role="guide" data-doorbell-acrylic="polished" pointer-events="none"><defs><linearGradient id="'+id+'-glass-edge" x2="0" y2="1"><stop stop-color="#828b93"/><stop offset=".3" stop-color="#1a1e22"/><stop offset="1" stop-color="#080a0c"/></linearGradient><linearGradient id="'+id+'-glass-reflection" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".15"/><stop offset=".27" stop-color="#fff" stop-opacity=".025"/><stop offset=".28" stop-color="#fff" stop-opacity=".07"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".025"/></linearGradient></defs><rect x="'+(a.x+dx)+'" y="'+(a.y+dy)+'" width="'+a.width+'" height="'+a.height+'" fill="url(#'+id+'-glass-edge)"/><rect x="'+a.x+'" y="'+a.y+'" width="'+a.width+'" height="'+a.height+'" fill="url(#'+id+'-acrylic)" filter="url(#'+id+'-shadow)"/><rect x="'+a.x+'" y="'+a.y+'" width="'+a.width+'" height="'+a.height+'" fill="url(#'+id+'-glass-reflection)"/><path d="M'+a.x+' '+(a.y+a.height)+'V'+a.y+'H'+(a.x+a.width)+'" fill="none" stroke="#c5cdd3" stroke-opacity=".55" stroke-width=".4"/><path d="M'+(a.x+a.width)+' '+a.y+'V'+(a.y+a.height)+'H'+a.x+'" fill="none" stroke="#07090b" stroke-width=".55"/></g>';
 return {steel,glass};
}
