// Viewport-only sizing. Selection and artwork geometry never enter this calculation.
export function mobilePreviewHeight({height,width,ratio=1.5,scrollTop=0,keyboardOpen=false}){
 const h=Math.max(0,Number(height)||0),w=Math.max(0,Number(width)||0);
 const aspect=Number.isFinite(ratio)&&ratio>0?ratio:1.5;
 // A permanent 48 px toolbar slot, then the plate and its dimension gutters.
 const expanded=Math.max(156,Math.min(h*.5,48+18+Math.max(0,w-60)/aspect+26));
 const compact=Math.min(expanded,Math.max(156,Math.min(200,h*.3)));
 if(keyboardOpen)return compact;
 return Math.round(expanded-(expanded-compact)*Math.min(1,Math.max(0,Number(scrollTop)||0)/96));
}
