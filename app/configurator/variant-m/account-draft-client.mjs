// Ü8.2 Entwürfe im Kundenkonto (K7): Transport zum Werkstattserver.
// Die Kundenidentität liefert ausschließlich der Server (App-Proxy-Signatur mit
// `logged_in_customer_id` oder Kundenkonto-Sitzungstoken). Dieser Client trägt
// keine Anmeldedaten, speichert nichts im Browser und entscheidet nichts selbst:
// 401 `customer_login_required` heißt „bitte anmelden“, 503 heißt „nicht angebunden“.
export const ACCOUNT_DRAFT_PATH='/api/workshop/account-drafts';
const ID=/^cdraft_[a-f0-9-]{36}$/;
export class AccountDraftError extends Error{constructor(message,{status,code}){super(message);this.status=status;this.code=code;}}
export const loginRequired=error=>error?.status===401&&error.code==='customer_login_required';
export const accountUnavailable=error=>error?.status===503;
// Rückkehradresse für `/account/login?return_url=…`: nur ein relativer Pfad desselben Shops.
export function loginUrl(loginPath,returnUrl){
  const base=typeof loginPath==='string'&&loginPath.startsWith('/')?loginPath:'/account/login';
  let target='/';
  try{const u=new URL(returnUrl,'https://shop.invalid');if(u.origin==='https://shop.invalid')target=u.pathname+u.search;}catch{}
  return base+(base.includes('?')?'&':'?')+'return_url='+encodeURIComponent(target);
}
export function createAccountDraftClient({fetchImpl=globalThis.fetch,base=''}={}){
  if(typeof base!=='string'||base&&!/^\/[A-Za-z0-9_./-]*$/.test(base))throw Error('Ungültiger Pfad zur Kontoverbindung.');
  const endpoint=base.replace(/\/+$/,'')+ACCOUNT_DRAFT_PATH;
  const check=id=>{if(!ID.test(id))throw new AccountDraftError('Ungültige Entwurfskennung.',{status:422,code:'account_draft_id'});return id;};
  async function call(path,init={}){
    let response;
    try{response=await fetchImpl(endpoint+path,{...init,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json',...(init.headers||{})}});}
    catch{throw new AccountDraftError('Die Kontoverbindung ist gerade nicht erreichbar.',{status:0,code:'network'});}
    let body=null;try{body=await response.json();}catch{}
    if(!response.ok)throw new AccountDraftError(body?.error?.message||'Die Anfrage an das Kundenkonto ist fehlgeschlagen.',{status:response.status,code:body?.error?.code||'account_draft'});
    if(!body||typeof body!=='object')throw new AccountDraftError('Die Antwort des Kundenkontos ist unvollständig.',{status:502,code:'account_draft_response'});
    return body;
  }
  const json=()=>({'Content-Type':'application/json'});
  return {
    endpoint,
    list:()=>call('',{method:'GET'}),
    get:async id=>call('/'+check(id),{method:'GET'}),
    create:payload=>call('',{method:'POST',headers:json(),body:JSON.stringify(payload)}),
    update:async(id,payload)=>call('/'+check(id),{method:'POST',headers:json(),body:JSON.stringify(payload)}),
    remove:async id=>call('/'+check(id),{method:'DELETE'}),
    previewUrl:id=>endpoint+'/'+check(id)+'/preview.png',
    photoUrl:(id,uploadId,variant='original')=>endpoint+'/'+check(id)+'/photos/'+encodeURIComponent(uploadId)+(variant==='edited'?'?variant=edited':''),
  };
}
