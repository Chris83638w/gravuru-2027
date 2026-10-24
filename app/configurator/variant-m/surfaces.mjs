export {surfaceGeometry} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {processProfile} from '../../workshop/process-profiles.mjs';

// K14 / Ü15.1: Flächen eines Produkts. Ohne Angabe hat jedes Produkt genau eine
// Fläche `front` (abwärtskompatibel); Objekte ohne `surfaceId` liegen vorn.
// Eine zweite Fläche `back` gibt es nur, wo das Produkt physisch eine Rückseite hat
// (Entscheidung Chris 19.10.2026: Brettchen, Schlüsselanhänger, Autoanhänger,
// Lesezeichen). Acryl „von hinten“ ist Spiegelung im Verfahrensprofil, keine Fläche.
// Die Rückseite wird seitenrichtig gestaltet; Bohrlöcher erscheinen von hinten
// gespiegelt (x → Breite − x). `mirror` spiegelt zusätzlich die Fertigungsdatei.
// `priceCents` ist der Aufpreis „Rückseite gestalten“; null = offen → nicht buchbar.
export const SURFACE_IDS=Object.freeze(['front','back']);
export const SURFACE_LABELS=Object.freeze({front:'Vorderseite',back:'Rückseite'});
export const SURFACE_FILE_SUFFIX=Object.freeze({front:'-vorderseite',back:'-rueckseite'});
const fail=message=>{throw Error(message);};
const cents=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;

export const objectSurface=o=>o?.surfaceId==='back'?'back':'front';
export const profileSurfaces=profile=>Array.isArray(profile?.surfaces)&&profile.surfaces.length?profile.surfaces:[{id:'front'}];
export const backSurface=profile=>profileSurfaces(profile).find(s=>s.id==='back')||null;
export const hasBack=profile=>backSurface(profile)!==null;
// Buchbar erst mit Preisangabe (auch 0 Cent ist eine Angabe).
export const backBookable=profile=>cents(backSurface(profile)?.priceCents);
export const surfaceObjects=(objects,surfaceId)=>(objects||[]).filter(o=>objectSurface(o)===surfaceId);
// „Rückseite gestaltet“ = mindestens ein sichtbares Fertigungsobjekt auf der Rückseite.
export const backDesigned=objects=>(objects||[]).some(o=>objectSurface(o)==='back'&&!o.uxHidden&&o.role!=='guide');
// Flächen, für die eine eigene Produktionsdatei entsteht: vorn immer, hinten nur gestaltet.
export const producedSurfaces=(profile,objects)=>hasBack(profile)&&backDesigned(objects)?['front','back']:['front'];

export function validateSurfaces(profile){
  const list=profile.surfaces;
  if(list===undefined)return;
  if(!Array.isArray(list)||!list.length||list.length>2||list[0]?.id!=='front')fail('Flächen: zuerst „front“, höchstens eine Rückseite „back“.');
  const ids=new Set();
  for(const s of list){
    if(!s||typeof s!=='object'||Array.isArray(s)||!SURFACE_IDS.includes(s.id)||ids.has(s.id))fail('Flächen: Kennungen front und back, jede höchstens einmal.');
    ids.add(s.id);
    const allowed=s.id==='front'?['id','label']:['id','label','processingProfileId','mirror','priceCents'];
    const extra=Object.keys(s).filter(k=>!allowed.includes(k));if(extra.length)fail('Fläche '+s.id+': unbekannte Felder '+extra.join(', '));
    if(s.label!==undefined&&(typeof s.label!=='string'||!s.label.trim()||s.label.length>40))fail('Fläche '+s.id+': Bezeichnung prüfen.');
    if(s.id==='back'){
      if(!Object.hasOwn(s,'priceCents')||!(s.priceCents===null||cents(s.priceCents)))fail('Rückseite: Aufpreis in ganzen Cent oder offen (null) angeben.');
      if(s.mirror!==undefined&&typeof s.mirror!=='boolean')fail('Rückseite: Spiegelung ja oder nein.');
      if(s.processingProfileId!==undefined)processProfile(s.processingProfileId);
    }
  }
  for(const d of profile.designs||[])for(const o of d.objects||[])if(o.surfaceId!==undefined&&(!SURFACE_IDS.includes(o.surfaceId)||!ids.has(o.surfaceId)))fail((d.name||d.id)+': Element liegt auf einer Fläche, die das Produkt nicht hat.');
}
export const surfaceLabel=(profile,id)=>profileSurfaces(profile).find(s=>s.id===id)?.label||SURFACE_LABELS[id];
// Verfahrensprofil je Fläche (K10): Rückseite optional mit eigenem Profil, sonst das des Produkts.
export function surfaceProcess(config,surfaceId){
  const s=surfaceId==='back'?backSurface(config.profile):null;
  return processProfile(s?.processingProfileId??config.profile);
}
// Spiegelung der Fertigungsdatei je Fläche: Rückseite nach ihrem `mirror`, sonst wie die
// Vorderseite (Ausgabeeinstellung bzw. Fertigungsprofil). Nie geraten.
export function surfaceMirror(config,surfaceId,frontMirror){
  if(surfaceId!=='back')return frontMirror;
  const s=backSurface(config.profile);
  return typeof s?.mirror==='boolean'?s.mirror:frontMirror;
}
// Dateiname je Fläche: „name.pdf“ → „name-vorderseite.pdf“ / „name-rueckseite.pdf“.
export const surfaceFileName=(name,surfaceId)=>name.replace(/(\.[a-z0-9]+)?$/i,m=>SURFACE_FILE_SUFFIX[surfaceId]+m);
// Geometrie von hinten gesehen: freie Kontur und Bohrlöcher seitenrichtig spiegeln.
// Aufpreis der Rückseite für ein Design; offener Preis sperrt eine gestaltete Rückseite.
export function backSurcharge(config,objects){
  if(!backDesigned(objects))return 0;
  if(!hasBack(config.profile))fail('Dieses Produkt hat keine Rückseite.');
  if(!backBookable(config.profile))fail('Die Rückseite ist noch nicht buchbar: Aufpreis „Rückseite gestalten“ ist offen.');
  return backSurface(config.profile).priceCents;
}
