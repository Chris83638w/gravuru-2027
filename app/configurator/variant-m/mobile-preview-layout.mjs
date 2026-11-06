// Viewport-only sizing. Selection and artwork geometry never enter this calculation.
export function mobilePreviewHeight({height,width,ratio=1.5,scrollTop=0,keyboardOpen=false,galleryOpen=false,textEditing=false}){
 const h=Math.max(0,Number(height)||0),w=Math.max(0,Number(width)||0);
 const aspect=Number.isFinite(ratio)&&ratio>0?ratio:1.5;
 // Only text editing needs a toolbar slot above the plate.
 const expanded=Math.max(156,Math.min(h*.5,(textEditing?48:0)+18+Math.max(0,w-60)/aspect+26));
 const compact=Math.min(expanded,Math.max(156,Math.min(200,h*.3))+(textEditing?48:0));
 // Give the first design row room immediately, before the customer scrolls.
 if(keyboardOpen)return compact;
 if(galleryOpen)return Math.round(compact);
 return expanded-(expanded-compact)*Math.min(1,Math.max(0,Number(scrollTop)||0)/160);
}
