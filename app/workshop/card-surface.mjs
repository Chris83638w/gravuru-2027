// Galerie-Karten zeigen die Rohlingtextur nur etwa 170 CSS-Pixel breit (Audit 17.11.2026).
// Bisher stand in jeder Karten-SVG die volle Vorschautextur (Edelstahl 1536×1024 WebP, 98 KB).
// Gibt es neben `<name>.png` eine `<name>.karte.webp`, ersetzt diese Datei für Karten sowohl die PNG-
// als auch die WebP-Fassung (`<name>.webp`). Das gilt nur für die Bildschirmvorschau. Editor, Export
// und Produktion behalten die Originaladresse. Ohne passende Datei bleibt die Adresse unverändert.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';

export const CARD_SURFACE_DIR=path.join(path.dirname(fileURLToPath(import.meta.url)),'../designs/aosu-labrador/runtime/images');

export function cardSurfaceSwapsFrom(directory){
 const swaps=new Map();
 let names=[];try{names=fs.readdirSync(directory);}catch{return swaps;}
 for(const card of names.filter(n=>n.endsWith('.karte.webp'))){
  const base=card.slice(0,-'.karte.webp'.length);
  try{
   const target='data:image/webp;base64,'+fs.readFileSync(path.join(directory,card)).toString('base64');
   if(names.includes(base+'.png'))swaps.set('data:image/png;base64,'+fs.readFileSync(path.join(directory,base+'.png')).toString('base64'),target);
   if(names.includes(base+'.webp'))swaps.set('data:image/webp;base64,'+fs.readFileSync(path.join(directory,base+'.webp')).toString('base64'),target);
  }catch{}
 }
 return swaps;
}

let defaults=null;
export function cardSurface(url,swaps=null){
 if(typeof url!=='string'||!url.startsWith('data:'))return url;
 const map=swaps||(defaults??=cardSurfaceSwapsFrom(CARD_SURFACE_DIR));
 return map.get(url)??url;
}
