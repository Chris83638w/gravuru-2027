// F02 (#239): Server-Seite des Kassen-Nachweises. Der Schlüssel wird aus dem App-Geheimnis und der
// Shop-Domain abgeleitet; er verlässt den Server nur über das Admin-API in das App-eigene Metafeld der
// Prüfregel (scripts/checkout-proof-key.mjs). Nie in Browser, Warenkorb, Log, Git oder Issue.
import {createHmac} from 'node:crypto';
import {proofKey,proofTag,proofWords} from '../../ops/shopify/master-release/checkout-proof.mjs';
export {PROOF_ATTRIBUTE} from '../../ops/shopify/master-release/checkout-proof.mjs';

export function checkoutProofKeyHex({secret,shopDomain}){
 if(typeof secret!=='string'||secret.length<16||typeof shopDomain!=='string'||!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain))throw Error('Kassen-Nachweis ist nicht eingerichtet.');
 return createHmac('sha256',secret).update('gravuru-checkout-proof/v1|'+shopDomain).digest('hex').slice(0,32);
}
// Liefert für eine Position den Nachweis oder null, wenn die Angaben keinen gültigen Nachweis zulassen.
export function createCheckoutProofSigner({secret,shopDomain}){
 const key=proofKey(checkoutProofKeyHex({secret,shopDomain}));
 return fields=>{const words=proofWords(fields);return words?proofTag(key,words):null;};
}
