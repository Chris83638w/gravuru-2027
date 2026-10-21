// Contract transport for a future merchant pilot. Not attached to any editor.
// Caller supplies the existing authenticated merchantRequest closure. No ambient
// fetch, tokens in URLs, second datastore or public-route bypass is introduced.
const cfg=/^cfg_[a-f0-9-]{36}$/, draftPattern=/^adraft_[a-f0-9-]{36}$/;
const stop=(code,message)=>{throw Object.assign(new Error(message),{code});};
export function createPilotTransport({request,productId,productRevision}){
  if(typeof request!=='function'||!cfg.test(productId)||!Number.isSafeInteger(productRevision)||productRevision<1)stop('pilot_binding','Feste Produktbindung und vorhandenen Händlertransport angeben.');
  let session=null, loaded=false, access=null, active=false, uncertain=false;
  const identity=input=>input?.productId===productId&&input?.productRevision===productRevision;
  async function read(path){
    const response=await request(path,{method:'GET',redirect:'error'});
    if(!response.ok)stop('read_rejected',`Lesender Zugriff abgewiesen (${response.status}).`);
    return response.json();
  }
  async function write(path,body,validate){
    if(active)stop('pilot_busy','Eine Übertragung läuft bereits.');
    if(uncertain)stop('pilot_unknown','Vor einem weiteren Versuch muss der unklare Sicherungsstand abgeglichen werden.');
    active=true;
    try{
      let response,result;
      try{
        response=await request(path,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':session.csrfToken,...(access?{'X-Gravuru-Draft':access.token}:{})},body:JSON.stringify(body)});
        result=await response.json();
      }catch{uncertain=true;stop('pilot_unknown','Die Übertragung wurde nicht eindeutig bestätigt. Kein automatischer Neuversand.');}
      if(!response.ok){
        // These are validated pre-write refusals in the pinned server contract.
        const safe=new Set(['invalid_session','review_busy','stale_customer_draft','acrylic_draft_fields','acrylic_draft_identity','test_cart_disabled','test_cart_stale','test_cart_product','test_cart_binding']);
        if(!safe.has(result?.error?.code))uncertain=true;
        stop(result?.error?.code||'pilot_rejected',`Übertragung abgewiesen (${response.status}).`);
      }
      try{return validate(result);}catch{uncertain=true;stop('pilot_unknown','Die Bestätigung passt nicht zum erwarteten Stand.');}
    }finally{active=false;}
  }
  return Object.freeze({
    async load(){
      if(active||access||uncertain)stop('pilot_state','Produktbindung einer begonnenen Sicherung nicht austauschen.');
      const s=await read('/api/workshop/session');
      if(s.scope!=='shopify-merchant-test'||!identity(s.merchantTestCart)||typeof s.csrfToken!=='string'||!s.csrfToken)stop('pilot_scope','Die bestehende Händlersitzung gibt diesen Produktstand nicht für den Test frei.');
      const model=await read(`/api/workshop/customer-model/${productId}?revision=${productRevision}`);
      if(model?.configuration?.id!==productId||model.configuration.revision!==productRevision)stop('pilot_model','Der geladene Produktstand weicht ab.');
      session=s;loaded=true;return model;
    },
    async savePrepared(prepared){
      if(!loaded)stop('pilot_not_loaded','Zuerst den festen Produktstand laden.');
      if(prepared?.gates?.nativeSendAllowed!==true)stop('pilot_adapter_blocked','Die verlustfreie Übertragung wurde vom Adapter nicht bestätigt.');
      const input=structuredClone(prepared.input);
      if(!identity(input))stop('pilot_binding','Produkt oder Revision weichen ab.');
      if(access&&input.designId!==access.designId)stop('pilot_design','Ein gespeicherter Entwurf ist an sein Design gebunden.');
      const previous=access;
      return write('/api/workshop/acrylic-drafts'+(previous?'/'+previous.id:''),{input,...(previous?{expectedRevision:previous.revision}:{})},result=>{
        const token=previous?.token||result.token;
        if(!identity(result)||result.designId!==input.designId||!draftPattern.test(result.id)||!/^[a-f0-9]{64}$/.test(token)||result.revision!==(previous?previous.revision+1:1)||previous&&result.id!==previous.id||typeof result.snapshotId!=='string'||!result.snapshotId)throw Error();
        access={id:result.id,revision:result.revision,token,designId:input.designId,snapshotId:result.snapshotId};
        return {draftId:access.id,revision:access.revision,snapshotId:access.snapshotId};
      });
    },
    // Read-only reconciliation is possible when an earlier confirmed draft exists.
    // Initial ambiguous creates have no credential; operator reconciliation remains required.
    async inspectSaved(){
      if(!access)stop('pilot_no_access','Für diesen unklaren Erstversuch liegt keine bestätigte Entwurfskennung vor.');
      const response=await request(`/api/workshop/acrylic-drafts/${access.id}`,{method:'GET',redirect:'error',headers:{'X-Gravuru-Draft':access.token}});
      if(!response.ok)stop('read_rejected','Gesicherter Entwurf konnte nicht geprüft werden.');
      return response.json();
    },
    status(){return {loaded,busy:active,uncertain,saved:access?{draftId:access.id,revision:access.revision}:null,cartEnabled:false};}
  });
}
