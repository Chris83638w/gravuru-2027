// K10 / Ü1.1, Ü1.2: Das Verfahrensprofil ist die eine Quelle für Werkzeuge,
// Farbpalette, Mindestschriftgröße, Mindestlinienstärke, Soll-DPI, Spiegelung
// und Ausgabeformat. Es erweitert die fünf Darstellungsprofile aus
// processing-profiles.mjs (Tinte, Farbmodus) um Fertigungsregeln, die bisher
// im Editor (usability-model.mjs: 4 mm, PRINT_PALETTES), im Vertrag und in der
// Ausgabe verstreut lagen. Echte Maschinenwerte stehen weiterhin nur im
// gebundenen Fertigungsprofil (production-profiles.mjs); dieses Modul ist der
// Rückfall, wenn kein Maschinenprofil gebunden ist. Unbekanntes bleibt null
// („offen“) und wird nicht geraten. Läuft im Browser und auf dem Server.
import {PROCESSING_PROFILES,getProcessingProfile,validColor} from '../platform/sources/app/shared/models/processing-profiles.mjs';

// Bisherige Editor-Palette für UV-Druck (zuvor usability-model.mjs PRINT_PALETTES).
// Vorgabe aus dem bestehenden Editor, vom Nutzer zu bestätigen (Maschinenfarben/ICC offen).
export const UV_PRINT_PALETTE=Object.freeze([
 ['Standardfarben',[['Schwarz','#191919'],['Weiß','#ffffff'],['Grau','#7b8385'],['Rot','#c93232'],['Orange','#e78626'],['Gelb','#efca37'],['Grün','#28734b'],['Blau','#245cac'],['Violett','#7847a6'],['Pink','#d8498a'],['Braun','#795137'],['Türkis','#21958f']]],
 ['Pastellfarben',[['Rosé','#edc4cf'],['Pfirsich','#f2ceba'],['Vanille','#f4e6b5'],['Mint','#c5e2cf'],['Salbei','#b9cdbc'],['Himmelblau','#bed9ed'],['Lavendel','#d5c9e9'],['Sand','#ded1bc']]]
].map(([name,colors])=>Object.freeze([name,Object.freeze(colors.map(Object.freeze))])));
const UV_HEX=Object.freeze(UV_PRINT_PALETTE.flatMap(([,colors])=>colors.map(([,hex])=>hex)));

// Mindestschriftgröße: Vorgabe Benchmark (Gravur 4 mm, Druck 3 mm), vom Nutzer zu bestätigen.
// Mindestlinienstärke: offen (null) – kein Maschinenwert bekannt.
// Soll-DPI: Druck 300 und Rastergravur (Foto) 300 nach bestehender Ausgabe
// (formEngravingSettings/formPrintSettings Standard 300); kein Maschinenwert.
// Spiegelung: Acrylglas wird von hinten graviert (Familien AA/AS, engravingSide 'back');
// eine Familie mit engravingSide 'front' (S/S) überschreibt das über processMirror().
// Ausgabeformat: beschreibt die bestehende Ausgabe (Proof-PDF), ändert sie nicht.
const ENGRAVING={tools:{textColor:false,photo:true,motifRecolor:false},palette:[],minTextMm:4,minStrokeMm:null,targetDpi:300,mirror:false,outputFormat:'pdf'};
const RULES=Object.freeze({
 'steel-engraving':{...ENGRAVING},
 'wood-engraving':{...ENGRAVING},
 'slate-engraving':{...ENGRAVING},
 'acrylic-engraving':{...ENGRAVING,mirror:true},
 'color-print':{tools:{textColor:true,photo:true,motifRecolor:true},palette:UV_HEX,minTextMm:3,minStrokeMm:null,targetDpi:300,mirror:false,outputFormat:'pdf'}
});
const deepFreeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const k of Object.keys(v))deepFreeze(v[k]);}return v;};
export const PROCESS_PROFILES=Object.freeze(PROCESSING_PROFILES.map(p=>{
 const rules=RULES[p.id];if(!rules)throw Error('Verfahrensprofil ohne Regeln: '+p.id);
 return deepFreeze({...p,...structuredClone(rules)});
}));
export const PROCESS_PROFILE_IDS=Object.freeze(PROCESS_PROFILES.map(p=>p.id));

// Verfahrensprofil zu einer Kennung oder zu einem Produktprofil (universal-product,
// über getProcessingProfile). Unbekannte Kennung: Fehler, nie ein stiller Rückfall.
export function processProfile(source){
 const id=typeof source==='string'?source:source&&typeof source==='object'?getProcessingProfile(source).id:null;
 const profile=PROCESS_PROFILES.find(p=>p.id===id);
 if(!profile)throw Error('Unbekanntes Verfahrensprofil.');
 return profile;
}
export const isProcessProfileId=id=>PROCESS_PROFILE_IDS.includes(id);

// Spiegelung aus Profil und – wenn die Familie sie kennt – der Gravurseite.
export function processMirror(profile,engravingSide=undefined){
 if(engravingSide==='front')return false;
 if(engravingSide==='back')return true;
 return profile.mirror===true;
}

// Wirksame Palette: null = freie Farbwahl; [] = keine Farbwahl (Gravur). Eine
// Produktauswahl (workshopProfiles.selections.colors) grenzt die Profilpalette ein,
// erweitert sie aber nicht.
export function processPalette(profile,selection=null){
 if(!profile.tools.textColor)return [];
 if(profile.palette===null)return selection==null?null:[...new Set(selection.map(c=>String(c).toLowerCase()))];
 const base=profile.palette.map(c=>c.toLowerCase());
 if(selection==null)return base;
 const wanted=new Set(selection.map(c=>String(c).toLowerCase()));
 return base.filter(c=>wanted.has(c));
}

// Serverseitige Farbprüfung (Ü1.2): Gravur erlaubt keine Farbänderung gegenüber der
// Vorlage; Druck erlaubt die Profilpalette, die Farben der Vorlage (templateColor des
// Elements, designColors aller Vorlagenelemente) und die Profiltinte.
// Rückgabe: Fehlertext oder '' (ohne Änderung nie ein Fehler).
export function processColorIssue(profile,color,{templateColor=undefined,designColors=[],selection=null}={}){
 if(color===undefined||color===templateColor)return '';
 if(typeof color!=='string'||!validColor(color))return 'Ungültige Farbe.';
 // Gravur: neue Elemente tragen die Profiltinte (newEditableObject) oder eine
 // Editorfarbe, die die Ausgabe ohnehin durch die Tinte ersetzt (elementColor);
 // nur eine Abweichung von der Vorlagenfarbe ist eine Farbwahl.
 if(!profile.tools.textColor)return templateColor===undefined?'':'Dieses Verfahren erlaubt keine Farbwahl.';
 const palette=processPalette(profile,selection);
 if(palette===null)return '';
 const allowed=new Set([...palette,profile.ink.toLowerCase(),...[templateColor,...designColors].filter(validColor).map(c=>c.toLowerCase())]);
 return allowed.has(color.toLowerCase())?'':'Farbe nicht in der Palette.';
}
