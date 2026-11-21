import {merchantRequest} from './merchant-request.mjs';
// A row's store comes from the authenticated index. Never infer it from an order ID.
const prefixes=new Map([['/api/workshop/','/werkstatt/'],['/api/workshop/acryl/','/werkstatt/acryl/']]);
export function orderScope(row){
 const apiPrefix=row?.apiPrefix||'/api/workshop/';
 if(!prefixes.has(apiPrefix)||row?.pagePrefix&&row.pagePrefix!==prefixes.get(apiPrefix))throw Error('Bestellspeicher nicht eindeutig.');
 return {apiPrefix,pagePrefix:prefixes.get(apiPrefix)};
}
export const orderKey=row=>row.viewKey||row.id;
export const orderApi=(row,path)=>orderScope(row).apiPrefix+path;
export const orderPage=(row,path)=>orderScope(row).pagePrefix+path;

export async function orderRequest(row,path,data,request=merchantRequest){
 const prefix=orderScope(row).apiPrefix;
 let options={};
 if(data!==undefined){
  const session=await request(prefix+'session'),value=await session.json();
  if(!session.ok||!value.csrfToken)throw Error(value.error?.message||'Freigabesitzung nicht erreichbar.');
  options={method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':value.csrfToken},body:JSON.stringify(data)};
 }
 return request(prefix+path,options);
}

// #265, ENTSCHEIDUNGEN 3.61/3.62: zwei Downloads je Position (bei gestalteter Rückseite je Fläche) – PDF und SVG, beide immer
// mit Kontur und nie gespiegelt, im Aufbau der Musterdatei von Chris; Dateien ohne Kontur gibt es hier nicht mehr. Ein Knopf ist nur aktiv, wenn das Kennzeichen „fertig“ lautet und die
// Ausgabe diese Datei führt; sonst sagt der Hinweis, woran es liegt (z. B. Ausgabe alter Art: „für diese Position neu
// erstellen“), statt beim Klick einen Fehler zu zeigen.
export const ORDER_FILE_LABELS=Object.freeze({pdf:'PDF',svg:'SVG'});
export function orderFileButtons(outputState,downloads){
 const ready=outputState?.state==='fertig',surfaces=downloads?.surfaces?.length?downloads.surfaces:[{id:'front',formats:[]}];
 return surfaces.map(s=>({surface:s.id,label:surfaces.length>1?(s.id==='back'?'Rückseite':'Vorderseite'):'',buttons:Object.entries(ORDER_FILE_LABELS).map(([format,label])=>({format,label,enabled:ready&&s.formats.includes(format)}))}));
}
export function orderFilesNote(outputState,downloads){
 if(downloads?.note)return downloads.note;
 if(outputState?.state!=='fertig')return 'PDF und SVG sind aktiv, sobald die Fertigungsdatei fertig ist.';
 return orderFileButtons(outputState,downloads).some(s=>s.buttons.some(b=>!b.enabled))?'PDF oder SVG liegt für diese Position nicht vor. Bitte die Ausgabe für diese Position neu erstellen.':'';
}

// #265, ENTSCHEIDUNGEN 3.53 (6) und 3.57: Der Link „Fertigungsdatei“ an der Shopify-Zeile nennt die Gestaltung (Konfigurations-
// Kennung und Revision, wie `_gravuru_config`/`_gravuru_rev` der Zeile). Der Bestelleingang hält genau diese Zuordnung je Position
// fest (`configuration`); vor der Zahlung gibt es die Position noch nicht – dann ein Hinweis statt eines Fehlers.
export const ORDER_NOT_PAID_NOTE='Zu dieser Gestaltung gibt es noch keine bezahlte Bestellposition. Die Fertigungsdatei entsteht mit der Zahlung; danach erscheint die Position hier.';
export function orderForConfiguration(rows,config,rev){
 if(typeof config!=='string'||!/^konfig_[a-f0-9-]{36}$/.test(config)||!/^[1-9][0-9]{0,8}$/.test(String(rev??'')))return null;
 const matches=rows.filter(row=>row.configuration?.id===config&&row.configuration.rev===Number(rev));
 return matches.length===1?matches[0]:null;
}
export function selectedOrder(rows,key){
 const matches=rows.filter(row=>orderKey(row)===key||!key?.includes(':')&&row.id===key);
 return matches.length===1?matches[0]:null;
}
