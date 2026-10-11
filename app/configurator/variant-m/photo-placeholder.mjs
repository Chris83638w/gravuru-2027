import {previewResourceURL} from './preview-resource.mjs';
import {photoShape,photoClip,photoMaskURL} from '../../platform/sources/app/shared/models/photo-shape.mjs';
// Editor-only illustration. Never add this markup to a design or export source.
export function examplePhotoMarkup(slot,assetId,hint,sourceUrl){
  if(!/^[a-f0-9]{64}$/.test(assetId||'')||!(slot.w>0&&slot.h>0))return '';
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const words=String(hint?.text||'Hier eigenes Foto hochladen').split(/\s+/),lines=[''];
  for(const word of words){const i=lines.length-1;if(lines[i]&&(lines[i]+' '+word).length>21)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}
  const {w,h}=slot,clip='photo-example-'+String(slot.id).replace(/[^a-zA-Z0-9_-]/g,'_');
  const url=typeof sourceUrl==='string'&&/^data:image\/(?:svg\+xml|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(sourceUrl)?sourceUrl:previewResourceURL('/api/workshop/design-assets/'+assetId+'/preview.svg');
  const buttonWidth=Math.min(w*.9,98),font=Math.min(4.5,w/12),height=lines.length*font*1.25+4,y=-h*.24;
  const text=lines.map((line,i)=>`<tspan x="0" y="${-height/2+2+font+i*font*1.25}">${escape(line)}${i<lines.length-1?' ':''}</tspan>`).join('');
  const mask=photoClip(slot,clip,previewResourceURL(photoMaskURL(slot)));
  return `<g data-preview-only="true" data-ux-placeholder="true"><defs>${mask.defs}</defs><g ${mask.attribute}><image href="${url}" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>${hint?.enabled===false?'':`<g transform="translate(0 ${y})"><rect x="${-buttonWidth/2}" y="${-height/2}" width="${buttonWidth}" height="${height}" rx="2" fill="white" fill-opacity=".94"/><text text-anchor="middle" font-family="Arial,sans-serif" font-size="${font}" fill="#244d3c">${text}</text></g>`}</g></g>`;
}
export function emptyPhotoMarkup(slot, ink, surface, asset) {
  const w=Number(slot.w),h=Number(slot.h);
  if(!(w>0&&h>0)||!/^#[0-9a-f]{6}$/i.test(ink)||!/^#[0-9a-f]{6}$/i.test(surface))return '';
  if(asset){
    const {x,y,w:aw,h:ah}=asset.placement,href=String(asset.url).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
    const r=Math.min(w,h)*.41;
    return `<svg data-ux-placeholder="true" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" viewBox="${-w/2} ${-h/2} ${w} ${h}" overflow="visible" aria-hidden="true"><image x="${x}" y="${y}" width="${aw}" height="${ah}" href="${href}" preserveAspectRatio="none"/><circle r="${r}" fill="${surface}" fill-opacity=".36" stroke="${ink}" stroke-width="${Math.max(.5,r*.06)}"/><text y="${-r*.08}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${r*.37}" font-weight="bold" fill="${ink}">Foto-Upload</text><text y="${r*.37}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${r*.33}" fill="${ink}">hier klicken</text></svg>`;
  }
  const oval=slot.photoShape==='circle'||slot.photoShape==='ellipse';
  const shape=slot.photoShape==='arch'?`<path d="M1 99V${1+49*w/h}a49 ${49*w/h} 0 0 1 98 0V99Z"/>`:oval?`<ellipse cx="50" cy="50" rx="49" ry="49"/>`:'<rect x="1" y="1" width="98" height="98" rx="4"/>';
  const id='ux-empty-photo-'+String(slot.id).replace(/[^a-zA-Z0-9_-]/g,'_');
  return `<svg data-ux-placeholder="true" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <defs><clipPath id="${id}">${shape}</clipPath></defs>
    <g clip-path="url(#${id})">
      <rect width="100" height="100" fill="${surface}"/>
      <path d="M11 85c3-20 17-29 39-29s36 9 39 29" fill="${ink}" opacity=".62"/>
      <path d="M29 63c5 7 13 11 21 11s16-4 21-11" fill="${surface}" opacity=".5"/>
      <ellipse cx="50" cy="39" rx="19" ry="24" fill="${ink}" opacity=".27"/>
      <path d="M31 38c-2-17 8-27 20-27 16 0 23 12 18 29-4-6-7-12-9-17-8 8-17 11-29 15Z" fill="${ink}" opacity=".82"/>
      <path d="M38 43h7m10 0h7M46 55q4 3 8 0" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>
      <rect x="0" y="68" width="100" height="32" fill="${ink}" opacity=".94"/>
      <path d="M50 78v-7m-4 4 4-4 4 4m-6 4h4" fill="none" stroke="${surface}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="50" y="88" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="bold" fill="${surface}">Foto hochladen</text>
    </g>${shape.replace('/>',' fill="none" stroke="'+ink+'" stroke-width="2"/>')}
  </svg>`;
}

export function decorateEmptyPhotoSlots(root,objects,ink,surface,assets=[],designId='',examples=[],hints=[]){
  for(const slot of objects.filter(o=>o.type==='photoSlot'&&!o.uxUploadId&&!o.uxHidden)){
    const group=root.querySelector('[data-object="'+CSS.escape(slot.id)+'"]');
    const hit=group?.querySelector(':scope > rect[fill="transparent"]');
    const asset=assets.find(a=>a.designId===designId&&a.slotId===slot.id);
    const example=examples.find(e=>e.designId===designId&&e.slotId===slot.id);
    const markup=example?examplePhotoMarkup(slot,example.assetId,hints.find(h=>h.designId===designId&&h.slotId===slot.id)):emptyPhotoMarkup(slot,ink,surface,asset);
    if(!hit||!markup||group.hasAttribute('data-ux-empty-photo-slot')||group.hasAttribute('data-ux-static-photo'))continue;
    for(const child of [...group.children])if(child!==hit)child.remove();
    const illustration=new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">'+markup+'</svg>','image/svg+xml').documentElement.firstElementChild;
    group.insertBefore(group.ownerDocument.importNode(illustration,true),hit.nextSibling);
    group.setAttribute('data-ux-empty-photo-slot','true');
    group.setAttribute('role','button');group.setAttribute('tabindex','0');group.setAttribute('aria-label','Foto hochladen');
    group.style.cursor='pointer';
    // Some templates draw an opaque photo frame after the slot.
    const frame=root.querySelector('[data-object="'+CSS.escape(slot.id+'-frame')+'"]');
    if(frame?.parentNode===group.parentNode)frame.after(group);
  }
}
