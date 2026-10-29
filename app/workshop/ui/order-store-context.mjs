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

export function selectedOrder(rows,key){
 const matches=rows.filter(row=>orderKey(row)===key||!key?.includes(':')&&row.id===key);
 return matches.length===1?matches[0]:null;
}
