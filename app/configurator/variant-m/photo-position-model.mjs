const clamp=(v,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):fallback));
export const photoCrop=v=>({zoom:clamp(v?.zoom,1,4,1),x:clamp(v?.x,-1,1,0),y:clamp(v?.y,-1,1,0)});
// Cover the fixed slot; pan is a fraction of the available overhang in each axis.
export function photoPlacement(slot,asset,crop=slot.uxPhotoCrop){
  const v=photoCrop(crop),iw=asset?.width>0?asset.width:slot.w,ih=asset?.height>0?asset.height:slot.h;
  const scale=Math.max(slot.w/iw,slot.h/ih)*v.zoom,w=iw*scale,h=ih*scale;
  const dx=Math.max(0,(w-slot.w)/2),dy=Math.max(0,(h-slot.h)/2);
  return {x:-w/2+v.x*dx,y:-h/2+v.y*dy,w,h,dx,dy};
}
export function panPhoto(slot,asset,start,dx,dy){
  const v=photoCrop(start),p=photoPlacement(slot,asset,v),a=(slot.rotation||0)*Math.PI/180;
  return photoCrop({...v,x:v.x+(p.dx?(dx*Math.cos(a)+dy*Math.sin(a))/p.dx:0),y:v.y+(p.dy?(-dx*Math.sin(a)+dy*Math.cos(a))/p.dy:0)});
}
