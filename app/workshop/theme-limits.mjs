// Zeichen- und Zeilenlimits je Textfeld (Benchmark 19.10.2026, Ü3.1/Ü2.2).
// Standard kommt aus dem Thema; Reihenfolge: Objekt (maxLength/maxLines) vor
// Design (themes[0] bzw. themeId) vor Produkt (themeId) vor Standard. Dieses
// Modul hat keine Abhängigkeiten, weil Vertrag (Server) und Editor (Browser)
// dieselben Regeln ausführen.
const limit=(maxLength,maxLines)=>Object.freeze({maxLength,maxLines});
export const DEFAULT_TEXT_LIMITS=limit(40,2);
export const THEME_TEXT_LIMITS=Object.freeze({
 namensschilder:limit(32,2),familienschilder:limit(32,2),hausnummern:limit(32,2),
 gedenktafeln:limit(78,4),tiergedenktafeln:limit(78,4),
 hinweisschilder:limit(52,3),firmenschilder:limit(52,3)
});
export const TEXT_LIMIT_RANGES=Object.freeze({maxLength:Object.freeze([1,500]),maxLines:Object.freeze([1,10])});
const fail=message=>{throw Error(message);};
const themeOf=value=>{
 const id=typeof value==='string'?value:value&&typeof value==='object'&&typeof value.id==='string'?value.id:'';
 return id.trim()?id.trim().toLowerCase():null;
};
export function themeId(design,product){
 return themeOf(Array.isArray(design?.themes)?design.themes[0]:undefined)??themeOf(design?.themeId)??themeOf(product?.themeId)??null;
}
export function themeTextLimits(theme){return THEME_TEXT_LIMITS[themeOf(theme)??'']??DEFAULT_TEXT_LIMITS;}
// Zeichen ohne führende/folgende Leerzeichen; Zeilen über Zeilenumbruch.
export const textLength=text=>[...String(text??'').trim()].length;
export const lineCount=text=>{const value=String(text??'').trim();return value?value.split('\n').length:0;};
// `object` ist das Vorlagenelement (Mustertext, optional maxLength/maxLines).
// Ohne ausdrücklichen Objektwert bleibt der Mustertext der Vorlage immer
// zulässig: bestehende Designs ohne Thema werden nicht unbestellbar.
export function textLimits(object,design,product,config){
 const result={...themeTextLimits(themeId(design,product))};
 for(const key of ['maxLength','maxLines']){
  const value=object?.[key],[min,max]=TEXT_LIMIT_RANGES[key];
  if(value===undefined){
   const sample=key==='maxLength'?textLength(object?.text):lineCount(object?.text);
   result[key]=Math.max(result[key],Math.min(sample,max));continue;
  }
  if(!Number.isInteger(value)||value<min||value>max)fail((key==='maxLength'?'Zeichenlimit':'Zeilenlimit')+': ganze Zahl von '+min+' bis '+max+'.');
  result[key]=value;
 }
 // New product revisions opt into Chris' 50-character-per-line rule. Existing
 // saved revisions retain their original whole-field contract.
 if(config?.textRules?.maxCharsPerLine!==undefined){
  const max=config.textRules.maxCharsPerLine;
  if(!Number.isInteger(max)||max<1||max>500)fail('Zeichenlimit je Zeile: ganze Zahl von 1 bis 500.');
  result.maxLength=max;result.perLine=true;
 }
 return result;
}
export const longestTextLine=text=>Math.max(0,...String(text??'').replace(/\r\n?/g,'\n').split('\n').map(line=>[...line].length));
export const textLimitCount=(text,limits)=>limits?.perLine?longestTextLine(text):textLength(text);
export function textLimitIssue(text,limits){
 if(limits.perLine&&longestTextLine(text)>limits.maxLength)return 'Text zu lang: höchstens '+limits.maxLength+' Zeichen je Zeile.';
 if(!limits.perLine&&textLength(text)>limits.maxLength)return 'Text zu lang: höchstens '+limits.maxLength+' Zeichen.';
 if(lineCount(text)>limits.maxLines)return 'Höchstens '+limits.maxLines+' Zeilen.';
 return '';
}
// Pflichtfeld: Mustertext der Vorlage gilt nicht als Eingabe (getrimmt, Groß/Klein egal).
export const sameSampleText=(text,sample)=>String(text??'').trim().toLocaleLowerCase('de')===String(sample??'').trim().toLocaleLowerCase('de');
// Kundensichtbare Feldnamen statt technischer Schlüssel (Katalog-Designs: name/daten/spruch).
export const FIELD_LABELS={heading:'Überschrift',names:'Namen',name:'Name',place:'Ort',date:'Datum',daten:'Lebensdaten',slogan:'Spruch',spruch:'Spruch'};
export const requiredFieldMessage=template=>'Bitte das Feld „'+(FIELD_LABELS[template.fieldKey]||template.fieldKey||template.id)+'“ ausfüllen.';
// Editor-Eingabe: nie mehr Zeichen annehmen, zusätzliche Zeilen abweisen.
export function clampText(value,limits,previous=''){
 const text=String(value??'');
 if(text.split('\n').length>limits.maxLines)return previous;
 if(limits.perLine)return text.replace(/\r\n?/g,'\n').split('\n').map(line=>[...line].slice(0,limits.maxLength).join('')).join('\n');
 const chars=[...text];
 return chars.length>limits.maxLength?chars.slice(0,limits.maxLength).join(''):text;
}
