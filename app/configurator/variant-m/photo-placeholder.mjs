// Editor-only illustration. Never add this markup to a design or export source.
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

export function decorateEmptyPhotoSlots(root,objects,ink,surface,assets=[],designId=''){
  for(const slot of objects.filter(o=>o.type==='photoSlot'&&!o.uxUploadId&&!o.uxHidden)){
    const group=root.querySelector('[data-object="'+CSS.escape(slot.id)+'"]');
    const hit=group?.querySelector(':scope > rect[fill="transparent"]');
    const asset=assets.find(a=>a.designId===designId&&a.slotId===slot.id);
    const markup=emptyPhotoMarkup(slot,ink,surface,asset);
    if(!hit||!markup||group.hasAttribute('data-ux-empty-photo-slot')||group.hasAttribute('data-ux-static-photo'))continue;
    for(const child of [...group.children])if(child!==hit&&!child.hasAttribute('data-resize')&&child.getAttribute('stroke')!=='#16845d')child.remove();
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
