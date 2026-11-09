import {embeddedMotifFits} from './embedded-motif-fit.mjs';
// Shared by workshop, customer preview and future exports. Coordinates are centred mm.
export function photoMaskGeometryIssue(o){
 const m=o.photoMaskGeometry;if(m===undefined)return '';
 if(o.photoShape!=='template'||!m||Object.keys(m).sort().join(',')!=='fillRule,path,viewBox'||typeof m.path!=='string'||!m.path||m.path.length>500000||!/[Mm]/.test(m.path[0])||!/^[MmLlHhVvCcSsQqTtAaZz\d.,+eE\s-]+$/.test(m.path)||!['evenodd','nonzero'].includes(m.fillRule)||!Array.isArray(m.viewBox)||m.viewBox.length!==4||!m.viewBox.every(Number.isFinite)||m.viewBox[2]<=0||m.viewBox[3]<=0)return 'Ungültige native Fotomasken-Geometrie.';
 return '';
}
const maskResources=new WeakMap();
export function photoMaskFits(o,geometry){
 if(o?.type!=='photoSlot'||!o.photoMaskGeometry||photoMaskGeometryIssue(o))return null;
 const m=o.photoMaskGeometry,signature=JSON.stringify(m);let cached=maskResources.get(m);
 if(cached?.signature!==signature){cached={signature,resource:{key:'native-photo-mask',embeddedOnly:true,bounds:[...m.viewBox],svgFragment:`<path d="${m.path}" fill="currentColor" fill-rule="${m.fillRule}"/>`}};maskResources.set(m,cached);}
 const resource=cached.resource;
 return embeddedMotifFits({...o,type:'motif',motif:resource.key,templateOrigin:true},geometry,resource);
}
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
  if(o.photoMaskGeometry){
   const issue=photoMaskGeometryIssue(o);if(issue)throw Error(issue);
   const m=o.photoMaskGeometry,[x,y,w,h]=m.viewBox;
   return {defs:`<clipPath id="${id}" data-template-photo-mask="true" data-native-photo-mask="true"><path d="${m.path}" clip-rule="${m.fillRule}" transform="translate(${-o.w/2} ${-o.h/2}) scale(${o.w/w} ${o.h/h}) translate(${-x} ${-y})"/></clipPath>`,attribute:`clip-path="url(#${id})"`};
  }
  const href=String(url).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  return {defs:`<mask id="${id}" data-template-photo-mask="true" maskUnits="userSpaceOnUse" x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" mask-type="luminance"><image href="${href}" x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}" preserveAspectRatio="none"/></mask>`,attribute:`mask="url(#${id})"`};
 }
 return {defs:`<clipPath id="${id}">${photoShape(o)}/></clipPath>`,attribute:`clip-path="url(#${id})"`};
}
