import {createHmac,timingSafeEqual} from 'node:crypto';
import {readReviewPackage} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
const BASE='/gestaltung/';
const ID=/^offer_[a-f0-9-]{36}$/;
const SNAPSHOT=/^proof_[a-f0-9-]{36}$/;
const HASH=/^[a-f0-9]{64}$/;
const fail=()=>{throw Object.assign(Error('Gestaltungsbild nicht gefunden.'),{status:404,code:'design_image_not_found'});};
// Capability contains no customer/offer token. It grants only this immutable PNG,
// never the private review archive, original photos, or an editor session.
export function createCustomerDesignImages({origin,shopDomain,secret,stores}){
 const tag=(storeId,offerId)=>createHmac('sha256',secret).update(JSON.stringify(['gravuru-customer-image/v1',shopDomain,storeId,offerId])).digest('hex');
 // A separate purpose binds only the immutable PNG, including its package and
 // output format. Like the existing offer capability it has no time extension:
 // it remains readable only while the immutable saved package exists.
 const snapshotTag=(storeId,snapshotId,hash)=>createHmac('sha256',secret).update(JSON.stringify(['gravuru-customer-snapshot-image/v1',shopDomain,storeId,snapshotId,hash,'.png'])).digest('hex');
 const url=(storeId,offerId)=>{if(!stores.some(s=>s.storeId===storeId)||!ID.test(offerId))fail();return origin+BASE+storeId+'/'+offerId+'/'+tag(storeId,offerId)+'.png';};
 const snapshotUrl=(storeId,snapshotId,hash)=>{if(!stores.some(s=>s.storeId===storeId)||!SNAPSHOT.test(snapshotId)||!HASH.test(hash))fail();return origin+BASE+storeId+'/'+snapshotId+'/'+hash+'/'+snapshotTag(storeId,snapshotId,hash)+'.png';};
 function image(store,saved){
  const archive=readReviewPackage(store.workshop.customerDrafts.downloadSnapshot(saved.snapshotId,'package'),saved.packageSha256,NATIVE_REVIEW_SCHEMAS);
  const png=archive.files.get('gestaltung-kundenansicht.png')||archive.files.get('gestaltung-referenz.png');
  if(!png||!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail();
  // A slow HTTP consumer must retain only its PNG, not the entire review ZIP
  // through this subarray's backing store. Hash verification above is unchanged.
  return Buffer.from(png);
 }
 return {url,snapshotUrl,matches:p=>p.startsWith(BASE),read(pathname){
  const snapshot=pathname.match(/^\/gestaltung\/([-A-Za-z0-9_]{1,100})\/(proof_[a-f0-9-]{36})\/([a-f0-9]{64})\/([a-f0-9]{64})\.png$/);
  if(snapshot){
   const [,storeId,snapshotId,hash,signature]=snapshot;
   if(!timingSafeEqual(Buffer.from(signature),Buffer.from(snapshotTag(storeId,snapshotId,hash))))fail();
   const store=stores.find(s=>s.storeId===storeId);
   if(typeof store?.workshop?.customerDrafts?.review!=='function')fail();
   const manifest=store.workshop.customerDrafts.review(snapshotId).manifest;
   if(manifest.id!==snapshotId||manifest.packageSha256!==hash)fail();
   return image(store,{snapshotId,packageSha256:hash});
  }
  const m=pathname.match(/^\/gestaltung\/([-A-Za-z0-9_]{1,100})\/(offer_[a-f0-9-]{36})\/([a-f0-9]{64})\.png$/);
  if(!m||!timingSafeEqual(Buffer.from(m[3]),Buffer.from(tag(m[1],m[2]))))fail();
  const store=stores.find(s=>s.storeId===m[1]);if(typeof store?.workshop?.orderIntake?.imageSnapshot!=='function')fail();
  const saved=store.workshop.orderIntake.imageSnapshot(m[2],shopDomain);
  return image(store,saved);
 }};
}
