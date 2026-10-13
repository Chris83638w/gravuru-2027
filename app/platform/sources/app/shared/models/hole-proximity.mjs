import {measureText} from './doorbell-preview.mjs';

// Texts that touch a drill hole's protection zone (hole edge + keepout). Motifs
// and photos may cross holes by decision of 13.10.2026; only texts get a hint.
// Same rule for customer view, merchant editor and order snapshot.
export function textsNearHoles(design,profile,fonts,keepoutMm=profile?.mountingPreview?.keepoutMm??0){
 const holes=profile?.geometry?.holes||[];if(!holes.length||!design)return [];
 const result=[];
 for(const raw of design.objects||[]){
  if(raw.type!=='text'||raw.uxHidden||!String(raw.text||'').trim())continue;
  let o=raw;try{if(fonts)o=measureText(structuredClone(raw),fonts);}catch{}
  if(![o.x,o.y,o.w,o.h].every(Number.isFinite))continue;
  const a=-(o.rotation||0)*Math.PI/180,hw=o.w/2,hh=o.h/2;
  for(const h of holes){
   // Hole centre in the text's local, unrotated frame; distance to its box.
   const dx=h.x-o.x,dy=h.y-o.y,lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a);
   const ex=Math.max(Math.abs(lx)-hw,0),ey=Math.max(Math.abs(ly)-hh,0);
   if(Math.hypot(ex,ey)<h.diameter/2+keepoutMm){result.push({id:raw.id,text:raw.text,hole:{x:h.x,y:h.y}});break;}
  }
 }
 return result;
}
export function holeHintText(near){
 if(!near.length)return '';
 const names=near.map(n=>'„'+String(n.text).trim().slice(0,40)+'“').join(', ');
 return (near.length===1?'Der Text ':'Die Texte ')+names+(near.length===1?' liegt':' liegen')+' im Bereich eines Bohrlochs. Dort wird gebohrt; Teile des Textes können fehlen. Bitte etwas verschieben oder bewusst so bestellen.';
}
