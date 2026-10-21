import {ed25519} from '@noble/curves/ed25519.js';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex,hexToBytes,utf8ToBytes} from '@noble/hashes/utils.js';
import {quantityTiersIssue,quantityTiersOpen,quantityTierFor,applyQuantityTier} from './quantity-tiers.mjs';

export const PRICE_SCHEMA='gravuru-personalization-pricing/v2';
export const QUOTE_FIELDS=['version','productId','variantId','revision','quantity','motifs','uploads','fieldCents','backCents','unitCents','totalCents','snapshotId','snapshotSha256','pricingSha256','keyId'];
export const CHUNK_KEYS=['_gravuru_q0','_gravuru_q1','_gravuru_q2','_gravuru_q3'];
const fail=message=>{throw Error(message);};
export const cents=value=>Number.isSafeInteger(value)&&value>=0&&value<=100000000;
const count=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
const identifier=value=>typeof value==='string'&&/^[A-Za-z0-9_:.\/-]{1,100}$/.test(value);
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function canonical(value){
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
export const digest=value=>bytesToHex(sha256(utf8ToBytes(canonical(value))));
export function validatePricing(p){
 if(p?.schema!==PRICE_SCHEMA||p.enabled!==true||p.currency!=='EUR'||!/^gid:\/\/shopify\/Product\/\d+$/.test(p.productId)||!identifier(String(p.revision)))fail('Unconfirmed product pricing');
 if(![p.baseCents,p.extraMotifCents,p.extraPhotoCents].every(cents)||!p.variants||typeof p.variants!=='object'||Array.isArray(p.variants)||!Object.keys(p.variants).length)fail('Missing authoritative cent prices');
 for(const [id,price] of Object.entries(p.variants))if(!/^\d+$/.test(id)||!cents(price))fail('Invalid variant price');
 const issue=quantityTiersIssue(p.quantityTiers);
 // Publishing/issuing a new signed contract is deliberately stricter than the
 // editor: its unknown tier silently disables discounts; a pending shop offer
 // must not silently promise undiscounted pricing under an agreed tier scheme.
 if(issue||quantityTiersOpen(p.quantityTiers))fail(issue||'Unconfirmed quantity tier');
 return p;
}
export function validateQuote(q){
 if(!q||Object.keys(q).sort().join('|')!==[...QUOTE_FIELDS].sort().join('|')||q.version!==2||
    !/^gid:\/\/shopify\/Product\/\d+$/.test(q.productId)||!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(q.variantId)||
    !identifier(q.revision)||!count(q.quantity,99)||q.quantity<1||!count(q.motifs,200)||!count(q.uploads,4)||
    ![q.fieldCents,q.backCents,q.unitCents,q.totalCents].every(cents)||
    !identifier(q.snapshotId)||!hex(q.snapshotSha256)||!hex(q.pricingSha256)||!identifier(q.keyId))fail('Invalid price quote');
 return q;
}
export function calculate(p,q){
 validatePricing(p);validateQuote(q);
 if(q.productId!==p.productId||q.revision!==String(p.revision)||q.pricingSha256!==digest(p))fail('Stale product price contract');
 const base=p.variants[q.variantId.split('/').pop()];if(!cents(base))fail('Unknown variant');
 const list=base+q.motifs*p.extraMotifCents+q.fieldCents+q.backCents;
 if(!cents(list))fail('Invalid discount basis');
 const tier=quantityTierFor(p,q.quantity),discounted=applyQuantityTier(list,tier,p.baseCents);
 const unit=discounted+q.uploads*p.extraPhotoCents,total=unit*q.quantity;
 if(!cents(unit)||!cents(total))fail('Invalid computed price');
 return {baseCents:base,listBeforePhotoCents:list,photoCents:q.uploads*p.extraPhotoCents,fieldCents:q.fieldCents,backCents:q.backCents,tier,discountCents:list-discounted,unitCents:unit,totalCents:total};
}
export function encode(q){
 validateQuote(q);
 const payload=JSON.stringify(QUOTE_FIELDS.map(key=>q[key]));
 if(payload.length>960||/[^\x20-\x7e]/.test(payload))fail('Quote exceeds the compact ASCII contract');
 return payload;
}
export function decode(payload){
 if(typeof payload!=='string'||payload.length>960)fail('Invalid serialized quote');
 let values;try{values=JSON.parse(payload);}catch{fail('Invalid serialized quote');}
 if(!Array.isArray(values)||values.length!==QUOTE_FIELDS.length)fail('Invalid serialized quote');
 const q=Object.fromEntries(QUOTE_FIELDS.map((key,i)=>[key,values[i]]));
 validateQuote(q);if(encode(q)!==payload)fail('Non-canonical quote');return q;
}
export function quoteAttributes(payload,signature){
 const q=decode(payload);if(!/^[a-f0-9]{128}$/.test(signature||''))fail('Invalid signature encoding');
 return [...CHUNK_KEYS.map((key,i)=>({key,value:payload.slice(i*240,(i+1)*240)||'.'})),
  {key:'_gravuru_qsig',value:signature},
  {key:'Bearbeitbarer Entwurf',value:q.snapshotId+':'+q.snapshotSha256},
  {key:'_gravuru_revision',value:q.revision}];
}
export function verifySignedQuote(payload,signature,keyRing){
 const q=decode(payload);
 if(keyRing?.schema!=='gravuru-quote-public-keys/v1'||!/^[a-f0-9]{128}$/.test(signature||''))fail('Price signature missing');
 const key=keyRing.keys?.[q.keyId];if(!hex(key))fail('Unknown signing key');
 if(!ed25519.verify(hexToBytes(signature),utf8ToBytes(payload),hexToBytes(key),{zip215:false}))fail('Price signature mismatch');
 return q;
}
export function assertQuotePrice(p,q){
 const result=calculate(p,q);
 if(q.unitCents!==result.unitCents||q.totalCents!==result.totalCents)fail('Signed price differs from authoritative rules');
 return result;
}
export function moneyCents(value){
 if(typeof value!=='string'||!/^\d+(?:\.\d{1,2})?$/.test(value))fail('Invalid Shopify money');
 const [whole,fraction='']=value.split('.'),n=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!cents(n))fail('Invalid Shopify money');return n;
}
export function verifyReturnedLine(line,q,expectedSignature){
 validateQuote(q);
 if(line?.merchandise?.id!==q.variantId||line.quantity!==q.quantity)fail('Shopify line identity/quantity mismatch');
 const attributes=line.attributes;
 if(!Array.isArray(attributes))fail('Shopify price attributes missing');
 for(const expected of quoteAttributes(encode(q),expectedSignature)){
  const matches=attributes.filter(a=>a.key===expected.key);
  if(matches.length!==1||matches[0].value!==expected.value)fail('Shopify price attribute mismatch');
 }
 const cost=line.cost;
 if(cost?.amountPerQuantity?.currencyCode!=='EUR'||cost?.totalAmount?.currencyCode!=='EUR'||
    moneyCents(cost.amountPerQuantity.amount)!==q.unitCents||moneyCents(cost.totalAmount.amount)!==q.totalCents)fail('Shopify actual amount mismatch');
 return true;
}

