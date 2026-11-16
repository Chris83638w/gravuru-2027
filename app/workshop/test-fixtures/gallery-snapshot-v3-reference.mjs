import {createHmac,timingSafeEqual} from 'node:crypto';

const schema='gravuru-shop-gallery-cache/v3';
const bindingFields=['storeId','tenantId','shopDomain','shopifyProductId','shopifyVariantId','productId','productRevision','bindingId','assignmentRevision','options','unitCents'];
const pick=(value,fields)=>Object.fromEntries(fields.map(k=>[k,value[k]]));
const contextScope=context=>[context.store.workshop.tenantId,context.store.storeId,context.binding.shopDomain];

export function gallerySnapshotCodec(secret){
 const mac=payload=>createHmac('sha256',secret).update(schema+'\0').update(payload).digest('hex');
 return {
  encode(context,revision,snapshot){
   // Explicit projections keep any future binding/session fields out of storage.
   const scopes=[...snapshot.scopes].map(([key,rows])=>[key,rows.map(row=>({
    binding:pick(row.binding,bindingFields),scope:pick(row.scope,['key','lineId','familyId']),process:row.process,
    design:{katalog:{target:row.design.katalog.target?pick(row.design.katalog.target,['lineId','familyId','explicit','released']):undefined}},
    availability:{universal:{doorbell:{schema:row.availability.universal.doorbell.schema}}},designId:row.designId,dedupe:row.dedupe,
    search:pick(row.search,['text','number','rank','unnamedMotifs']),
    card:pick(row.card,['productId','productRevision','designId','productName','designName','themes','widthMm','heightMm','shape','unitCents','currency','shopifyProductId','shopifyVariantId'])
   }))]);
   const sources=[...snapshot.sources].map(([key,value])=>[key,{scope:pick(value.scope,['key','lineId','familyId']),process:value.process,theme:value.theme}]);
   const payload=JSON.stringify({schema,scope:contextScope(context),revision,scopes,sources});return {payload,mac:mac(payload)};
  },
  decode(context,revision,saved){
   if(!saved||typeof saved.payload!=='string'||!/^[a-f0-9]{64}$/.test(saved.mac||'')||!timingSafeEqual(Buffer.from(mac(saved.payload)),Buffer.from(saved.mac)))return null;
   try{
    const data=JSON.parse(saved.payload);
    if(data.schema!==schema||data.revision!==revision||JSON.stringify(data.scope)!==JSON.stringify(contextScope(context))||!Array.isArray(data.scopes)||!Array.isArray(data.sources))return null;
    return {scopes:new Map(data.scopes),sources:new Map(data.sources)};
   }catch{return null;}
  }
 };
}
