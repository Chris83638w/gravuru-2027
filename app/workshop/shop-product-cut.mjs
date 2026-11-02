// Server-side import of the product's JSON metafield. The browser cannot pick
// another theme, starter or size after a product revision has been bound.
export const SHOP_PRODUCT_CUT={namespace:'custom',key:'gravuru_product_cut',type:'json'};
export function readShopProductCut(field){
 if(!field||Object.entries(SHOP_PRODUCT_CUT).some(([k,v])=>field[k]!==v)||typeof field.value!=='string')throw Error('Produkt-Metafeld custom.gravuru_product_cut (JSON) fehlt.');
 let value;try{value=JSON.parse(field.value);}catch{throw Error('Produktschnitt ist kein gültiges JSON.');}
 return validateShopProductCut(value);
}
export function validateShopProductCut(value){
 const keys=['sizeKey','themeId','defaultDesignId'];
 if(!value||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>typeof value[k]!=='string'||!value[k].trim()||value[k].length>200||/[\x00-\x1f\x7f]/.test(value[k])))throw Error('Produktschnitt benötigt genau sizeKey, themeId und defaultDesignId.');
 return Object.fromEntries(keys.map(k=>[k,value[k]]));
}
export function shopProductCutMetafield(value){return {...SHOP_PRODUCT_CUT,value:JSON.stringify(validateShopProductCut(value))};}
