// Server-side import of the product's JSON metafield. The browser cannot pick
// another theme, starter or size after a product revision has been bound.
export const SHOP_PRODUCT_CUT={namespace:'custom',key:'gravuru_product_cut',type:'json'};
export function readShopProductCut(field){
 if(!field||Object.entries(SHOP_PRODUCT_CUT).some(([k,v])=>field[k]!==v)||typeof field.value!=='string')throw Error('Produkt-Metafeld custom.gravuru_product_cut (JSON) fehlt.');
 let value;try{value=JSON.parse(field.value);}catch{throw Error('Produktschnitt ist kein gültiges JSON.');}
 return validateShopProductCut(value);
}
// Optional „zielgruppe“ (Chris 02.11.2026, Grabstecker): das Produkt bietet nur die Designs dieser Zielgruppe an
// (zweites Glied des Designnamens „<Produkt> · <Zielgruppe> · …“). Ohne Feld bleiben alle Designs wählbar.
// Optional „groessenWahl“:"form" (Chris 02.11.2026: „zwei Herzen … skalierbare Größen … unter Ausführung kann ich die
// Größe auswählen“): alle Größen derselben Form (groupKey) sind wählbar, sizeKey ist die Startgröße.
// „alle“ (Chris 03.11.2026, Türschilder: „alle Türschilder ohne Zielgruppen in einen Konfi … erst die Form und dann die
// Größe“): jede Form und Größe der Familie ist wählbar, sizeKey ist die Startgröße.
// Optional „motive“:"ohne" (Chris 03.11.2026 13:36: Motiv-Designs „erstmal nicht“ im Türschild-Konfi): nur Designs ohne
// Motiv; Zierlinien und Rahmen zählen nicht als Motiv (siehe isDecorativeMotif).
// Optional „vorlagen“:"leer" (Chris 03.11.2026 13:45: „erstellst du die Konfiguratoren erstmal ohne Designs und wir laden
// die nach“, nur mit groessenWahl "alle"): keine Katalogdesigns, je Größe ein leeres Schild mit einer Textzeile.
export const designZielgruppe=d=>{const p=String(d?.name||'').split(' · ');return p.length>2?p[1].trim():null;};
export function validateShopProductCut(value){
 const keys=['sizeKey','themeId','defaultDesignId'],optional=['zielgruppe','groessenWahl','motive','vorlagen'];
 const ok=v=>typeof v==='string'&&v.trim()&&v.length<=200&&!/[\x00-\x1f\x7f]/.test(v);
 if(!value||Array.isArray(value)||keys.some(k=>!ok(value[k]))||Object.keys(value).some(k=>!keys.includes(k)&&!optional.includes(k))||(value.zielgruppe!==undefined&&!ok(value.zielgruppe))||(value.groessenWahl!==undefined&&!['form','alle'].includes(value.groessenWahl))||(value.motive!==undefined&&value.motive!=='ohne')||(value.vorlagen!==undefined&&(value.vorlagen!=='leer'||value.groessenWahl!=='alle')))throw Error('Produktschnitt benötigt genau sizeKey, themeId und defaultDesignId (optional zielgruppe, groessenWahl:"form"|"alle", motive:"ohne", vorlagen:"leer").');
 return Object.fromEntries([...keys,...optional].filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
}
// Zierlinie (sehr schmal, Seitenverhältnis ≥ 6) oder Rahmen (umfasst ≥ 80 % der Platte in Breite und Höhe).
export function isDecorativeMotif(o,plate){
 const w=Math.abs(Number(o.w)),h=Math.abs(Number(o.h));
 if(!(w>0&&h>0))return false;
 return Math.max(w,h)/Math.min(w,h)>=6||!!plate&&w>=.8*plate[0]&&h>=.8*plate[1];
}
export const hasFigureMotif=(template,plate)=>template.objects.some(o=>o.type==='motif'&&!isDecorativeMotif(o,plate));
export function shopProductCutMetafield(value){return {...SHOP_PRODUCT_CUT,value:JSON.stringify(validateShopProductCut(value))};}
