import {createHmac,timingSafeEqual} from 'node:crypto';
import {readReviewPackage} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
const BASE='/gestaltung/';
const ID=/^offer_[a-f0-9-]{36}$/;
const fail=()=>{throw Object.assign(Error('Gestaltungsbild nicht gefunden.'),{status:404,code:'design_image_not_found'});};
// Capability contains no customer/offer token. It grants only this immutable PNG,
// never the private review archive, original photos, or an editor session.
export function createCustomerDesignImages({origin,shopDomain,secret,stores}){
 const tag=(storeId,offerId)=>createHmac('sha256',secret).update(JSON.stringify(['gravuru-customer-image/v1',shopDomain,storeId,offerId])).digest('hex');
 const url=(storeId,offerId)=>{if(!stores.some(s=>s.storeId===storeId)||!ID.test(offerId))fail();return origin+BASE+storeId+'/'+offerId+'/'+tag(storeId,offerId)+'.png';};
 return {url,matches:p=>p.startsWith(BASE),read(pathname){
  const m=pathname.match(/^\/gestaltung\/([-A-Za-z0-9_]{1,100})\/(offer_[a-f0-9-]{36})\/([a-f0-9]{64})\.png$/);
  if(!m||!timingSafeEqual(Buffer.from(m[3]),Buffer.from(tag(m[1],m[2]))))fail();
  const store=stores.find(s=>s.storeId===m[1]);if(typeof store?.workshop?.orderIntake?.imageSnapshot!=='function')fail();
  const saved=store.workshop.orderIntake.imageSnapshot(m[2],shopDomain);
  const archive=readReviewPackage(store.workshop.customerDrafts.downloadSnapshot(saved.snapshotId,'package'),saved.packageSha256,NATIVE_REVIEW_SCHEMAS);
  const png=archive.files.get('gestaltung-kundenansicht.png')||archive.files.get('gestaltung-referenz.png');
  if(!png||!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail();
  return png;
 }};
}
