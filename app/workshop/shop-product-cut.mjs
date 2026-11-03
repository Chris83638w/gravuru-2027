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
export const designZielgruppe=d=>{const p=String(d?.name||'').split(' · ');return p.length>2?p[1].trim():null;};
export function validateShopProductCut(value){
 const keys=['sizeKey','themeId','defaultDesignId'],optional=['zielgruppe','groessenWahl'];
 const ok=v=>typeof v==='string'&&v.trim()&&v.length<=200&&!/[\x00-\x1f\x7f]/.test(v);
 if(!value||Array.isArray(value)||keys.some(k=>!ok(value[k]))||Object.keys(value).some(k=>!keys.includes(k)&&!optional.includes(k))||(value.zielgruppe!==undefined&&!ok(value.zielgruppe))||(value.groessenWahl!==undefined&&value.groessenWahl!=='form'))throw Error('Produktschnitt benötigt genau sizeKey, themeId und defaultDesignId (optional zielgruppe, groessenWahl:"form").');
 return Object.fromEntries([...keys,...optional].filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
}
export function shopProductCutMetafield(value){return {...SHOP_PRODUCT_CUT,value:JSON.stringify(validateShopProductCut(value))};}
