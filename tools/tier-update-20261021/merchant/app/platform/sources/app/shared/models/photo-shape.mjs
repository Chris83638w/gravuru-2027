// Shared by workshop, customer preview and future exports. Coordinates are centred mm.
export function photoArchCurves({w,h}){
 const r=w/2,top=-h/2,spring=top+r,k=.5522847498307936*r;
 return [[[-r,spring],[-r,spring-k],[-k,top],[0,top]],[[0,top],[k,top],[r,spring-k],[r,spring]]];
}
export function photoShape(o){
 const {w,h}=o;
 if(o.photoShape==='arch'){
  const curves=photoArchCurves(o);
  return `<path d="M${-w/2} ${h/2}V${curves[0][0][1]}${curves.map(points=>'C'+points.slice(1).map(p=>p.join(' ')).join(' ')).join('')}V${h/2}Z"`;
 }
 return ['circle','ellipse'].includes(o.photoShape)?`<ellipse rx="${w/2}" ry="${h/2}"`:`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}"`;
}

// A source mask is an immutable, sanitized SVG asset, never customer photo data.
export const photoMaskURL=o=>'/api/workshop/design-assets/'+o.photoMaskAssetId+'/preview.svg';
export function photoClip(o,id,url=photoMaskURL(o)){
 if(o.photoShape==='template'){
  if(!/^[a-f0-9]{64}$/.test(o.photoMaskAssetId||''))throw Error('Die Original-Fotomaske fehlt.');
  const href=String(url).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  return {defs:`<mask id="${id}" data-template-photo-mask="true" maskUnits="userSpaceOnUse" x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" mask-type="luminance"><image href="${href}" x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" preserveAspectRatio="none"/></mask>`,attribute:`mask="url(#${id})"`};
 }
 return {defs:`<clipPath id="${id}">${photoShape(o)}/></clipPath>`,attribute:`clip-path="url(#${id})"`};
}
