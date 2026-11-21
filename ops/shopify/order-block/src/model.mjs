// #265 Stufe C, ENTSCHEIDUNGEN 3.53 (6)/3.57 (1): Block in der Bestellseite des Shopify-Admin – je Position mit
// Gravuru-Eigenschaften das Bild der Gestaltung und die Verweise „Gestaltung ansehen“ und „Fertigungsdatei“.
// Bei Shopify liegt keine Datei (3.52/3.53): Bild und Verweise zeigen auf den eigenen Server. Gelesen werden nur die
// Eigenschaften der Position; nichts wird gespeichert, kein fremder Host angenommen.
const HOST='https://app-2027.gravuru-designwerkstatt.de';
// Dieselbe Adressprüfung wie auf der Danke-Seite (thank-you-preview/src/model.mjs); Gleichheit prüft
// app/workshop/shopify-order-block.test.mjs. Nur das unveränderliche PNG der bestellten Gestaltung.
const IMAGE=/^https:\/\/app-2027\.gravuru-designwerkstatt\.de\/gestaltung\/[-A-Za-z0-9_]{1,100}\/offer_[a-f0-9-]{36}\/[a-f0-9]{64}\.png$/;
// `_gravuru_fertigung` (3.57 Punkt 1: Fertigungsdatei nur nach Anmeldung) entsteht parallel; ihre genaue Form steht noch nicht
// fest. Angenommen wird deshalb nur eine Adresse der anmeldepflichtigen Werkstatt am eigenen Server (`/werkstatt/…`),
// ohne Zugangsdaten, ohne Sprung in ein anderes Verzeichnis. Liegt die endgültige Form vor: hier und im Test enger fassen.
const PRODUCTION=/^\/werkstatt\/[-A-Za-z0-9_.~/]{0,300}$/;
const PRODUCTION_REST=/^[-A-Za-z0-9_.~=&%:,+]{0,600}$/;
const text=(value,fallback)=>typeof value==='string'&&value.trim()?value.trim().slice(0,255):fallback;

export function productionLink(value){
 if(typeof value!=='string'||value.length>1200||!value.startsWith(HOST+'/werkstatt/'))return null;
 const rest=value.slice(HOST.length),hash=rest.indexOf('#'),head=hash<0?rest:rest.slice(0,hash),query=head.indexOf('?');
 const path=query<0?head:head.slice(0,query);
 if(!PRODUCTION.test(path)||path.includes('//')||path.split('/').some(part=>part==='.'||part==='..'))return null;
 if(!PRODUCTION_REST.test(query<0?'':head.slice(query+1))||!PRODUCTION_REST.test(hash<0?'':rest.slice(hash+1)))return null;
 // Zweite, unabhängige Lesart derselben Adresse: gleicher Host, gleicher Pfad, keine Zugangsdaten.
 try{const parsed=new URL(value);if(parsed.origin!==HOST||parsed.username||parsed.password||parsed.pathname!==path)return null;}catch{return null;}
 return value;
}

// Eine Position der Admin-Abfrage: {title, quantity, customAttributes:[{key,value}]}. Ohne `_gravuru_config` oder ohne
// eine einzige vertrauenswürdige Adresse zeigt die Position nichts (null).
export function orderBlockLine(line){
 const entries=Array.isArray(line?.customAttributes)?line.customAttributes:[],value=key=>entries.find(a=>a?.key===key)?.value;
 if(!value('_gravuru_config'))return null;
 const src=value('_gravuru_bild'),title=text(line.title,'Personalisiertes Produkt');
 const image=typeof src==='string'&&IMAGE.test(src)?{src,alt:'Gestaltung: '+title}:null;
 const production=productionLink(value('_gravuru_fertigung'));
 if(!image&&!production)return null;
 return {title,quantity:Number.isSafeInteger(line.quantity)&&line.quantity>0?line.quantity:null,image,
  // „Gestaltung ansehen“ öffnet genau das geprüfte Bild groß; „Fertigungsdatei“ gibt es nur mit geprüfter Adresse.
  actions:[...(image?[{label:'Gestaltung ansehen',href:image.src}]:[]),...(production?[{label:'Fertigungsdatei',href:production}]:[])]};
}

export function orderBlockModel(order){
 const nodes=Array.isArray(order?.lineItems?.nodes)?order.lineItems.nodes:[];
 return {lines:nodes.map(orderBlockLine).filter(Boolean)};
}

// Lesende Abfrage der Admin-API (vorhandene Berechtigung `read_orders`); keine Mutation, keine Kundendaten.
export const ORDER_BLOCK_QUERY='query GravuruOrderBlock($id:ID!){order(id:$id){lineItems(first:250){nodes{id title quantity customAttributes{key value}}}}}';
export const orderGid=value=>typeof value==='string'&&/^gid:\/\/shopify\/Order\/[1-9][0-9]{0,19}$/.test(value)?value:null;
