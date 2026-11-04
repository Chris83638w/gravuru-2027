// Small, self-contained option thumbnails survive product copies and exports.
export const MAX_THUMBNAIL_LENGTH=350000;
import {SPACER_FINISHES,spacerCap,screwHead} from './spacer-cap.mjs';
import {OPTION_STANDARD_IMAGES} from './option-standard-images.mjs';
export {SPACER_FINISHES};
export function validateThumbnail(value){
  if(value===undefined||value==='')return;
  if(typeof value!=='string'||value.length>MAX_THUMBNAIL_LENGTH||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('Optionsbild bitte als kleine PNG-Vorschau hochladen.');
  const raw=atob(value.slice(22)),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  if(bytes.length<45||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)||raw.slice(12,16)!=='IHDR'||raw.slice(-8,-4)!=='IEND')throw Error('Optionsbild ist keine gültige PNG-Vorschau.');
  const view=new DataView(bytes.buffer),w=view.getUint32(16),h=view.getUint32(20);
  if(!w||!h||w>320||h>320)throw Error('Optionsbilder dürfen höchstens 320 × 320 Pixel groß sein.');
}
export function hasSpacers(option){return option.spacers??['B02-AH02','B04-AH04'].includes(option.id);}
export function expandSpacerColors(rows){
  const existing=new Set(rows.map(o=>o.id));
  return rows.flatMap(o=>{
    if(!hasSpacers(o)||o.spacerFinish!==undefined)return [{...o}];
    const cents=Math.round(Number(String(o.price).replace(',','.'))*100);
    return SPACER_FINISHES.map((finish,index)=>({...o,id:index?o.id+'-'+finish.id.toUpperCase():o.id,label:o.label+' · '+finish.label,spacers:true,spacerFinish:finish.id,price:(cents+(index?100:0))/100,thumbnail:index?'':o.thumbnail||''})).filter((value,index)=>!index||!existing.has(value.id));
  });
}
export function optionThumbnail(option){
  if(option.thumbnailDisabled)return '';
  if(option.thumbnail)return option.thumbnail;
  const count=option.holeCount??option.holes?.length??0;
  const key=hasSpacers(option)?'AH'+count+'-'+(option.spacerFinish||'silver'):OPTION_STANDARD_IMAGES[option.id]?option.id:count===2?'B02':count===4?'B04':null;
  return OPTION_STANDARD_IMAGES[key]||'';
}
// Befestigungskacheln (Chris 22./23.10.2026): Universal-/Katalogprodukte zeigen dieselben Kacheln wie die
// alte Auswahl [data-fk-mount] (completion.mjs) – Icon, Bezeichnung, Aufpreis. Icons: hinterlegtes
// Optionsbild bzw. Standardbild (optionThumbnail), sonst das Strichsymbol je Befestigungsart; unbekannte
// Kennungen erhalten das Symbol „ohne Bohrung“. KGL (glatt) und KRA (rau, mit unebener Wand) haben eigene Klebesymbole.
export const MOUNT_ICONS=Object.freeze({
  K00:'<rect x="5" y="5" width="22" height="22" rx="2"/><path d="m10 22 12-12"/>',
  GWS:'<path d="M8 4v24m0-17h17m-17 10h17m-7-13v6m4-6v6m-4 4v6m4-6v6"/>',
  KGL:'<path d="M5 25V7h22v10L17 27H5m12 0V17h10M9 11h12M9 15h5"/>',
  // Raue Flächen (Chris 03.11.2026): gleicher Klebezettel, darunter eine unebene Wand.
  KRA:'<path d="M6 21V5h20v8l-8 8H6m12 0v-8h8M10 9h11M10 12.5h5"/><path d="M3 27.5l2.2-1.8 2.2 1.8 2.2-1.8 2.2 1.8 2.2-1.8 2.2 1.8 2.2-1.8 2.2 1.8 2.2-1.8 2.2 1.8 2.2-1.8"/><path d="M5 30.2h.01M10.5 30.2h.01M16 30.2h.01M21.5 30.2h.01M27 30.2h.01"/>',
  SIL:'<path d="m6 26 12-12 7 7-7 7m-1-15 3-3 7 7-3 3M6 26l-3 3m15-17 5-5 3 3-5 5M23 7l4-4 2 2-3 5"/>',
  B04S:'<rect x="4" y="4" width="24" height="24" rx="2"/><circle cx="10" cy="10" r="2"/><circle cx="22" cy="10" r="2"/><circle cx="10" cy="22" r="2"/><circle cx="22" cy="22" r="2"/>'
});
const MOUNT_ICON_ALIASES=Object.freeze({});
const attr=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const mountIconSvg=paths=>'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
// Shop cards use line art for all mounting choices, derived from the actual holes.
// Stored photos remain available to the workshop and to other option groups.
export function mountingTileIcon(option){
 const named=MOUNT_ICONS[option.id]||MOUNT_ICONS[MOUNT_ICON_ALIASES[option.id]];
 const holes=(option.holes||[]).filter(h=>Number.isFinite(h.x)&&Number.isFinite(h.y));
 if(!holes.length)return mountIconSvg(named||'<rect x="4" y="5" width="24" height="22" rx="2"/>');
 const xs=holes.map(h=>h.x),ys=holes.map(h=>h.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const screws=option.mountingRule?.accessory==='screws',spacers=hasSpacers(option);
 const point=(v,min,max)=>max===min?16:8+(v-min)/(max-min)*16;
 return mountIconSvg('<rect x="3" y="3" width="26" height="26" rx="3"/>'+holes.map(h=>{
  const x=point(h.x,minX,maxX),y=point(h.y,minY,maxY);
  return '<circle cx="'+x+'" cy="'+y+'" r="'+(screws||spacers?3:1.7)+'"/>'+(screws?'<path d="M'+(x-1.4)+' '+(y+1.4)+'l2.8-2.8"/>':spacers?'<circle cx="'+x+'" cy="'+y+'" r="1"/>':'');
 }).join(''));
}
export function optionTileIcon(option,{mounting=false}={}){
  if(mounting)return mountingTileIcon(option);
  const image=optionThumbnail(option);
  if(image)return '<img src="'+attr(image)+'" alt="">';
  return mountIconSvg(MOUNT_ICONS[option.id]||MOUNT_ICONS[MOUNT_ICON_ALIASES[option.id]]||MOUNT_ICONS.K00);
}
// Preistext der Kachel wie in der Auswahlliste: „+2,99 €“ oder „ohne Aufpreis“; Größen mit Komplettpreis
// (steelFormats) zeigen den Preis selbst. Reine Darstellung – die Preislogik bleibt im Vertrag (contract.mjs).
export function optionTilePrice(value,money,{fullPrice=false}={}){
  if(fullPrice)return money(value.priceCents);
  return value.priceCents?'+'+money(value.priceCents):'ohne Aufpreis';
}
export function validateOptionPresentation(option){
  if(option.thumbnailDisabled!==undefined&&typeof option.thumbnailDisabled!=='boolean')throw Error('Optionsbild-Anzeige prüfen.');
  if(option.spacers!==undefined&&typeof option.spacers!=='boolean')throw Error('Abstandshalter bitte ein- oder ausschalten.');
  if(option.spacerFinish!==undefined&&!SPACER_FINISHES.some(f=>f.id===option.spacerFinish))throw Error('Farbe der Abstandshalter prüfen.');
  validateThumbnail(option.thumbnail);
}
// Decorative hardware belongs only to the preview, never engraving geometry.
export function spacerPreview(svg,profile){
  if(!profile.mountingPreview?.spacers)return svg;
  const finish=profile.mountingPreview.finish||'silver';
  const cap=spacerCap(finish);
  const caps=(profile.geometry.holes||[]).map(({x,y})=>'<g transform="translate('+Number(x)+' '+Number(y)+')">'+cap+'</g>').join('');
  const end=svg.lastIndexOf('</svg>');
  return end<0?svg:svg.slice(0,end)+`<g data-m-spacers="true" data-role="guide" aria-label="Abstandshalter" pointer-events="none">${caps}</g>`+svg.slice(end);
}

// Schrauben (Befestigung „mit Schrauben“): Kopf in jedem Bohrloch, nur Vorschau.
export function screwPreview(svg,profile){
  if(!profile.mountingPreview?.screws)return svg;
  const heads=(profile.geometry.holes||[]).map(({x,y})=>'<g transform="translate('+Number(x)+' '+Number(y)+')">'+screwHead()+'</g>').join('');
  const end=svg.lastIndexOf('</svg>');
  return end<0||!heads?svg:svg.slice(0,end)+`<g data-m-screws="true" data-role="guide" aria-label="Schrauben" pointer-events="none">${heads}</g>`+svg.slice(end);
}

// Drill-hole protection zones: preview aid only, never part of production files.
export function keepoutPreview(svg,profile,{show=true,emphasis=false}={}){
  const holes=profile.geometry?.holes||[];if(!show||!holes.length)return svg;
  const k=profile.mountingPreview?.keepoutMm??0,stroke=emphasis?'#c0392b':'#d0453a',width=emphasis?0.4:0.3,dash=emphasis?'1 0.6':'0.8 0.6';
  const rings=holes.map(h=>'<circle cx="'+Number(h.x)+'" cy="'+Number(h.y)+'" r="'+(Number(h.diameter)/2+k)+'" fill="'+(emphasis?'rgba(192,57,43,.08)':'none')+'" stroke="'+stroke+'" stroke-width="'+width+'" stroke-dasharray="'+dash+'"/>').join('');
  const end=svg.lastIndexOf('</svg>');
  return end<0?svg:svg.slice(0,end)+'<g data-m-keepout="true" data-role="guide" aria-hidden="true" pointer-events="none">'+rings+'</g>'+svg.slice(end);
}
