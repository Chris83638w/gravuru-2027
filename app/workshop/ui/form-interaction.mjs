// Presentation-only geometry. Saved field permissions are also enforced on the server.
export function resizeField(field, source, geometry, corner='se', dx=0, dy=0) {
  if (!source.allowScale) return {...field};
  if (!source.allowMove) corner='se';
  const west=corner.endsWith('w'), north=corner.startsWith('n');
  const maxW=west?field.xMm+field.widthMm:geometry.widthMm-field.xMm;
  const maxH=north?field.yMm+field.heightMm:geometry.heightMm-field.yMm;
  const clamp=(n,max)=>Math.max(Math.min(1,max),Math.min(max,n));
  let widthMm=clamp(field.widthMm+(west?-dx:dx),maxW);
  let heightMm=clamp(field.heightMm+(north?-dy:dy),maxH);
  if(source.type==='photo'&&source.shape==='circle')widthMm=heightMm=Math.min(widthMm,heightMm);
  const next={...field,widthMm,heightMm,xMm:west?field.xMm+field.widthMm-widthMm:field.xMm,yMm:north?field.yMm+field.heightMm-heightMm:field.yMm};
  if(source.type==='text')next.sizeMm=Math.max(1,Math.min(100,Math.round(field.sizeMm*Math.min(widthMm/field.widthMm,heightMm/field.heightMm))));
  return next;
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
