// F02 (#239): Schlüssel des Kassen-Nachweises in das App-eigene Metafeld der Prüfregel schreiben und
// blockOnFailure einschalten (Fehler/Zeitüberschreitung der Prüfung sperren die Kasse, statt sie freizugeben).
// Nur mit ausdrücklicher Freigabe von Chris und nur mit dem Admin-Token derselben App, die die Prüfregel besitzt.
//
//   node scripts/checkout-proof-key.mjs --shop <x.myshopify.com> --validation <gid://shopify/Validation/…> \
//        --secret-file <Datei mit App-Geheimnis> --token-file <Datei mit Admin-Token> [--api 2026-07] [--pruefen]
//
// Der Schlüssel wird wie im Server (app/workshop/checkout-proof-signer.mjs) aus App-Geheimnis und Shop
// abgeleitet. Ausgegeben wird nur ein Fingerabdruck (SHA-256, 12 Zeichen), nie der Schlüssel selbst.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {checkoutProofKeyHex} from '../app/workshop/checkout-proof-signer.mjs';

const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,all)=>{if(v.startsWith('--'))a.push([v.slice(2),all[i+1]?.startsWith('--')||all[i+1]===undefined?true:all[i+1]]);return a;},[]));
const fail=m=>{console.error(JSON.stringify({event:'checkout_proof_key',fehler:m}));process.exit(1);};
if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(args.shop||''))fail('--shop fehlt');
if(!/^gid:\/\/shopify\/Validation\/[0-9]+$/.test(args.validation||''))fail('--validation fehlt');
const read=f=>{if(typeof f!=='string')fail('Datei fehlt');const v=fs.readFileSync(f,'utf8').trim();if(!v)fail('Datei leer');return v;};
const key=checkoutProofKeyHex({secret:read(args['secret-file']),shopDomain:args.shop});
const fingerprint=createHash('sha256').update(key).digest('hex').slice(0,12);
const mutation=`mutation($id:ID!,$validation:ValidationUpdateInput!){validationUpdate(id:$id,validation:$validation){validation{id blockOnFailure enable metafield(namespace:"$app",key:"checkout-proof-key"){id}}userErrors{field message}}}`;
const variables={id:args.validation,validation:{blockOnFailure:true,metafields:[{namespace:'$app',key:'checkout-proof-key',type:'single_line_text_field',value:key}]}};
if(args.pruefen){console.log(JSON.stringify({event:'checkout_proof_key',schritt:'pruefung',shop:args.shop,validation:args.validation,fingerabdruck:fingerprint}));process.exit(0);}
const res=await fetch(`https://${args.shop}/admin/api/${args.api||'2026-07'}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':read(args['token-file'])},body:JSON.stringify({query:mutation,variables})});
const body=await res.json().catch(()=>null),result=body?.data?.validationUpdate;
if(!res.ok||body?.errors||!result||result.userErrors.length||result.validation?.blockOnFailure!==true||!result.validation?.metafield?.id)fail({status:res.status,userErrors:result?.userErrors,errors:body?.errors?.map(e=>e.message)});
console.log(JSON.stringify({event:'checkout_proof_key',schritt:'fertig',shop:args.shop,validation:result.validation.id,blockOnFailure:true,fingerabdruck:fingerprint}));
