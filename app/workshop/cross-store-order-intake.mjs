import {verifyPaidWebhook} from './order-intake.mjs';
const fail=(status,code)=>{throw Object.assign(Error('Bestellnachricht nicht eindeutig zugeordnet.'),{status,code});};
const id=value=>{if(typeof value==='number'&&!Number.isSafeInteger(value))fail(422,'order_route_id');const text=String(value);if(!/^[1-9][0-9]{0,19}$/.test(text))fail(422,'order_route_id');return text;};

// Authenticate untouched bytes before any routing or write. Each scoped intake
// authenticates them again and records ONLY its prevalidated line IDs atomically.
// Two stores cannot share one SQL transaction: retries are safe through each
// store's existing durable event/body/line-selection journal.
export function createCrossStoreWebhookIntake({stores}){
 if(!Array.isArray(stores)||!stores.length||stores.length>8||new Set(stores.map(s=>s.storeId)).size!==stores.length||stores.some(s=>!s.storeId||typeof s.intake?.receive!=='function'||typeof s.intake?.ownsOfferToken!=='function'||typeof s.intake?.bindings!=='function'))fail(503,'order_route_config');
 const fixed=stores.map(s=>Object.freeze({...s}));
 return {receive(raw,headers,config){
  const verified=verifyPaidWebhook(raw,headers,config),routes=new Map(),seen=new Set();
  for(const line of verified.payload.line_items){
   const lineId=id(line.id);if(seen.has(lineId))fail(422,'order_route_duplicate_line');seen.add(lineId);
   if(line.properties!==undefined&&!Array.isArray(line.properties))fail(422,'order_route_properties');
   const refs=(line.properties||[]).filter(p=>p?.name==='_gravuru_offer');
   if(refs.length>1)fail(422,'order_route_offer');
   let owners;
   if(refs.length){
    if(typeof refs[0].value!=='string'||!/^[a-f0-9]{64}$/.test(refs[0].value))fail(422,'order_route_offer');
    owners=fixed.filter(s=>s.intake.ownsOfferToken(refs[0].value));
    if(!owners.length)fail(409,'order_route_unknown_offer');
   }else owners=line.variant_id==null?[]:fixed.filter(s=>s.intake.bindings().some(b=>b.shopDomain===verified.shopDomain&&b.variantId===id(line.variant_id)));
   if(owners.length>1)fail(409,'order_route_conflict');
   if(owners.length){const store=owners[0];if(!routes.has(store))routes.set(store,[]);routes.get(store).push(lineId);}
  }
  const results=[];
  for(const [store,acceptedLineIds]of routes)results.push(store.intake.receive(raw,headers,config,{acceptedLineIds}));
  return {duplicate:results.length>0&&results.every(r=>r.duplicate),lines:results.flatMap(r=>r.lines||[]),errors:results.flatMap(r=>r.errors||[])};
 }};
}
