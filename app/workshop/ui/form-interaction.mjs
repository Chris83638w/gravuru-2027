// Geometry shared by the inline editor and its enlarged editing view.
export function scaleField(field,source,geometry,scale,corner='se'){
 if(!source.allowScale||!Number.isFinite(scale))return {...field};
 if(!source.allowMove)corner='se';
 const west=corner.endsWith('w'),north=corner.startsWith('n'),maxW=west?field.xMm+field.widthMm:geometry.widthMm-field.xMm,maxH=north?field.yMm+field.heightMm:geometry.heightMm-field.yMm;
 const lower=Math.max(1/field.widthMm,1/field.heightMm,source.type==='text'?1/field.sizeMm:0),upper=Math.min(maxW/field.widthMm,maxH/field.heightMm,source.type==='text'?100/field.sizeMm:Infinity);
 scale=Math.min(upper,Math.max(Math.min(lower,upper),scale));
 const widthMm=field.widthMm*scale,heightMm=field.heightMm*scale;
 return {...field,widthMm,heightMm,xMm:west?Math.max(0,field.xMm+field.widthMm-widthMm):field.xMm,yMm:north?Math.max(0,field.yMm+field.heightMm-heightMm):field.yMm,...(source.type==='text'?{sizeMm:field.sizeMm*scale}:{})};
}
export function resizeField(field,source,geometry,corner='se',dx=0,dy=0){
 if(!source.allowScale)return {...field};if(!source.allowMove)corner='se';
 const west=corner.endsWith('w'),north=corner.startsWith('n'),dw=(west?-dx:dx)/field.widthMm,dh=(north?-dy:dy)/field.heightMm;
 if(['text','motif'].includes(source.type))return scaleField(field,source,geometry,1+(Math.abs(dw)>=Math.abs(dh)?dw:dh),corner);
 const maxW=west?field.xMm+field.widthMm:geometry.widthMm-field.xMm,maxH=north?field.yMm+field.heightMm:geometry.heightMm-field.yMm,clamp=(n,max)=>Math.max(Math.min(1,max),Math.min(max,n));
 let widthMm=clamp(field.widthMm+(west?-dx:dx),maxW),heightMm=clamp(field.heightMm+(north?-dy:dy),maxH);if(source.type==='photo'&&source.shape==='circle')widthMm=heightMm=Math.min(widthMm,heightMm);
 return {...field,widthMm,heightMm,xMm:west?field.xMm+field.widthMm-widthMm:field.xMm,yMm:north?field.yMm+field.heightMm-heightMm:field.yMm};
}
// Each simultaneous product preview needs its own clip/filter IDs. The SVG comes
// from the validated server renderer; this does not replace SVG import validation.
export function scopedSvg(svg, scope) {
  if(!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(scope))throw Error('Ungültiger Vorschau-Identifier.');
  const ids=new Set(Array.from(svg.matchAll(/\bid="([^"]+)"/g),m=>m[1]));
  return svg.replace(/\bid="([^"]+)"/g,(_,id)=>`id="${scope}-${id}"`)
    .replace(/url\(#([^)]+)\)/g,(all,id)=>ids.has(id)?`url(#${scope}-${id})`:all)
    .replace(/(\bhref=")#([^"]+)"/g,(all,start,id)=>ids.has(id)?`${start}#${scope}-${id}"`:all);
}
