import {createPrivateKey,createPublicKey} from 'node:crypto';
import {commerce,contract} from '../load-pricing.mjs';
import {observedConfig,observedState} from '../observed-product.mjs';
import {PRICE_SCHEMA} from './proposed/price-contract.mjs';
import {createServerPriceAdapter} from './proposed/server-price-quote.mjs';
// PUBLICLY KNOWN TEST SEED ONLY. Never provision this key in a real store.
const privateKey=createPrivateKey({key:Buffer.from('302e020100300506032b657004220420'+'11'.repeat(32),'hex'),format:'der',type:'pkcs8'});
const publicKey=createPublicKey(privateKey).export({format:'der',type:'spki'}).subarray(-32).toString('hex');
export const keyRing={schema:'gravuru-quote-public-keys/v1',keys:{'public-test-key':publicKey}};
const issue=createServerPriceAdapter({...contract,...commerce});
export function setup({quantity=2,mounting='observed-none',photo=true,edit=()=>{}}={}){
 const config=observedConfig(),state=observedState(mounting,photo);
 edit(config,state);
 // These numeric identities are isolated test IDs, never a live mapping.
 const productId='gid://shopify/Product/123456789',variantId='gid://shopify/ProductVariant/987654321',revision='5';
 const base=contract.quote(config,[],config.profile.defaultDesignId,{mounting},1).unitCents;
 const pricing={schema:PRICE_SCHEMA,enabled:true,productId,revision,currency:'EUR',baseCents:config.basePriceCents,
  variants:{'987654321':base},extraMotifCents:config.extraMotifCents,extraPhotoCents:config.photo.extraPriceCents,quantityTiers:config.quantityTiers??[]};
 const args={config,state,quantity,productId,variantId,revision,snapshot:{id:'proof_isolated_test',sha256:'a'.repeat(64)},publishedPricing:pricing,keyId:'public-test-key',privateKey};
 const offer=issue(args);
 const a=Object.fromEntries(offer.attributes.map(x=>[x.key,{value:x.value}]));
 const line={id:'gid://shopify/CartLine/test',quantity,cost:{amountPerQuantity:{currencyCode:'EUR'}},revision:a._gravuru_revision,designFile:a['Bearbeitbarer Entwurf'],
  q0:a._gravuru_q0,q1:a._gravuru_q1,q2:a._gravuru_q2,q3:a._gravuru_q3,signature:a._gravuru_qsig,
  merchandise:{__typename:'ProductVariant',id:variantId,product:{id:productId,pricing:{jsonValue:pricing}}}};
 const input={presentmentCurrencyRate:'1.0',shop:{quoteKeys:{jsonValue:keyRing}},
  cart:{lines:[line]}};
 return {config,state,pricing,args,offer,input,line,issue};
}

