// Explicit compatibility for the verified tenantless d18 single-store release.
// SERVER FACTORY ONLY. No constructor, tenant migration, new database or UI edit.
import {createHash} from 'node:crypto';
import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {createShopProductBindingStore} from './shop-product-binding-store.mjs';
const fail=(message,status=503)=>{throw Object.assign(Error(message),{status,code:'legacy_single_store_scope'});};
const hash=v=>createHash('sha256').update(v).digest('hex');
const domain=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(v);
const id=v=>{if(typeof v==='number'&&!Number.isSafeInteger(v))fail('Unsichere Shop-ID.',422);const s=String(v);if(!/^[1-9][0-9]{0,19}$/.test(s))fail('Ungültige Shop-ID.',422);return s;};
// New cart revisions are optional for historical offers, mandatory once assigned.
export function legacyConfigurationFor(configurations,properties,offerId){
 const value=name=>{const matches=properties.filter(p=>p?.name===name);if(matches.length>1)fail('Konfigurations-Revision der Position ist nicht eindeutig.',422);return matches[0]?.value;};
 const configId=value('_gravuru_config'),rev=value('_gravuru_rev'),known=configurations?.byOffer(offerId)||null;
 if(configId===undefined&&rev===undefined){if(known)fail('Die Position nennt ihre Konfigurations-Revision nicht.',422);return null;}
 if(!known||typeof configId!=='string'||typeof rev!=='string'||!/^[1-9][0-9]{0,8}$/.test(rev)||known.id!==configId||known.rev!==Number(rev))fail('Die Konfigurations-Revision gehört nicht zu diesem Angebot.',422);
 return {id:known.id,rev:known.rev};
}
function oldTables(db,names){for(const table of names){const c=db.prepare('PRAGMA table_info('+table+')').all();if(!c.length||c.some(row=>row.name==='tenant_id'))fail('Nur der ausdrücklich bestätigte mandantenlose Altbestand ist zulässig.');}}
function owns(db,token,{shopDomain}={}){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||(shopDomain!==undefined&&!domain(shopDomain)))return false;
 return Boolean(db.prepare('SELECT 1 FROM form_order_offers o JOIN form_shop_bindings b ON b.id=o.binding_id WHERE o.token_hash=?'+(shopDomain===undefined?'':' AND b.shop=?')).get(hash(token),...(shopDomain===undefined?[]:[shopDomain])));
}
export function createLegacyOrderIntakeAccess({database:db,orderIntake,clock=Date.now}={}){
 oldTables(db,['form_shop_bindings','form_shop_binding_selections','form_order_offers']);
 if(!orderIntake||orderIntake.tenantId!==undefined||typeof orderIntake.bindVariants!=='function')fail('Die unveränderte alte Bestellinstanz ist erforderlich.');
 const facade={...orderIntake,tenantId:'gravuru',legacySingleStore:true,
  idBindings({storeId,shopDomain,adapter,personalizationPricingFor}={}){
   return createShopProductBindingStore({database:db,orderIntake:facade,tenantId:'gravuru',legacySingleStore:true,storeId,shopDomain,adapter,clock,personalizationPricingFor});
  },
  ownsOfferToken(token,options){return owns(db,token,options);},
  offerSummary({offerId,snapshotId,productId,productRevision}={}){
   if(typeof offerId!=='string'||typeof snapshotId!=='string'||typeof productId!=='string'||!Number.isSafeInteger(productRevision)||productRevision<1)fail('Dieses Angebot ist nicht zugänglich.',404);
   const row=db.prepare('SELECT o.quantity FROM form_order_offers o JOIN form_shop_bindings b ON b.id=o.binding_id WHERE o.id=? AND o.snapshot_id=? AND b.product_id=? AND b.product_revision=?').get(offerId,snapshotId,productId,productRevision);
   if(!row)fail('Dieses Angebot ist nicht zugänglich.',404);return {quantity:row.quantity};
  }
 };
 return facade;
}
export function createLegacyShopBindingReadAdapter({storeId,shopDomain,workshop,legacySingleStore}={}){
 if(legacySingleStore!==true||!workshop||!domain(shopDomain))fail('Der Server muss den alten einzelnen Store ausdrücklich bestätigen.');
 const {repository,orderIntake,productionProfiles}=workshop;
 if(!repository||!orderIntake||!productionProfiles||repository.tenantId!==undefined||orderIntake.tenantId!=='gravuru'||orderIntake.legacySingleStore!==true||
   (workshop.tenantId!==undefined&&workshop.tenantId!=='gravuru')||(productionProfiles.tenantId!==undefined&&productionProfiles.tenantId!=='gravuru'))fail('Die tatsächlichen alten Storeinstanzen sind erforderlich.');
 const check=()=>{if(workshop.repository!==repository||workshop.orderIntake!==orderIntake||workshop.productionProfiles!==productionProfiles||
   workshop.sessionContext?.shopDomain!==shopDomain||repository.tenantId!==undefined||orderIntake.tenantId!=='gravuru'||orderIntake.legacySingleStore!==true||
   (workshop.tenantId!==undefined&&workshop.tenantId!=='gravuru'))fail('Der festgelegte alte Storekontext wurde verändert.');};
 check();
 const repo={tenantId:'gravuru',get(...args){check();return repository.get(...args);}},orders={tenantId:'gravuru',bindings(){check();return orderIntake.bindings();}},profiles={resolve(...args){check();return productionProfiles.resolve(...args);}};
 const facade={tenantId:'gravuru',repository:repo,orderIntake:orders,productionProfiles:profiles,sessionContext:{shopDomain}};
 const adapter=createShopBindingReadAdapter({storeId,tenantId:'gravuru',shopDomain,workshop:facade,productionProfileScope:{storeId,tenantId:'gravuru'}});
 // Every public call checks original instance identity, including readiness calls
 // that otherwise might turn a server configuration problem into a soft blocker.
 return Object.freeze({...adapter,...Object.fromEntries(['getCurrentProduct','resolveSelection','resolveProductionProfile','getBindings','readiness'].map(k=>[k,(...args)=>{check();return adapter[k](...args);}])),legacySingleStore:true});
}
export function createLegacyOrderRouting({database:db}={}){
 oldTables(db,['form_shop_bindings','form_order_offers','form_order_events']);
 db.exec(`CREATE TABLE IF NOT EXISTS form_order_event_selections(shop TEXT NOT NULL,event_id TEXT NOT NULL,line_ids TEXT NOT NULL,PRIMARY KEY(shop,event_id));
 CREATE TRIGGER IF NOT EXISTS form_order_event_selection_fixed BEFORE UPDATE ON form_order_event_selections BEGIN SELECT RAISE(ABORT,'Event routing is immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_order_event_selection_keep BEFORE DELETE ON form_order_event_selections BEGIN SELECT RAISE(ABORT,'Event routing is immutable');END;`);
 return {
  prepare(verified,routing){
   if(routing===undefined)return null;
   if(!routing||typeof routing!=='object'||Array.isArray(routing)||Object.keys(routing).length!==1||!Array.isArray(routing.acceptedLineIds)||!routing.acceptedLineIds.length||routing.acceptedLineIds.length>250)fail('Interne Positionszuordnung fehlt oder ist ungültig.',422);
   const accepted=new Set(routing.acceptedLineIds.map(id));if(accepted.size!==routing.acceptedLineIds.length)fail('Interne Positionszuordnung ist nicht eindeutig.',422);
   const seen=new Set();for(const line of verified.payload.line_items){const lineId=id(line.id);if(seen.has(lineId))fail('Doppelte Bestellposition.',422);seen.add(lineId);
    if(accepted.has(lineId)){const refs=Array.isArray(line.properties)?line.properties.filter(p=>p?.name==='_gravuru_offer'):[];
     const owned=refs.length===1&&owns(db,refs[0].value,{shopDomain:verified.shopDomain});
     const known=!refs.length&&line.variant_id&&db.prepare('SELECT 1 FROM form_shop_bindings WHERE shop=? AND variant_id=?').get(verified.shopDomain,id(line.variant_id));
     if(!owned&&!known)fail('Die ausgewählte Position gehört nicht zu diesem Datenspeicher.',422);
    }}
   if([...accepted].some(v=>!seen.has(v)))fail('Eine ausgewählte Position fehlt in der unveränderten Nachricht.',422);
   return accepted;
  },
  replay(v,accepted){const saved=db.prepare('SELECT line_ids FROM form_order_event_selections WHERE shop=? AND event_id=?').get(v.shopDomain,v.eventId)?.line_ids??null;
   if(saved!==(accepted?JSON.stringify([...accepted].sort()):null))fail('Die gespeicherte Positionsauswahl darf nicht wechseln.',409);},
  complete(v,accepted){if(accepted)db.prepare('INSERT INTO form_order_event_selections(shop,event_id,line_ids) VALUES(?,?,?)').run(v.shopDomain,v.eventId,JSON.stringify([...accepted].sort()));},
  assertProduct(binding,line,shop){
   if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='shop_product_binding_revisions'").get())return;
   const found=db.prepare('SELECT DISTINCT product_gid FROM shop_product_binding_revisions WHERE tenant_id=? AND shop=? AND binding_id=?').all('gravuru',shop,binding.id);
   if(found.length&&(found.length!==1||found[0].product_gid!=='gid://shopify/Product/'+id(line.product_id)))fail('Das Shopify-Produkt passt nicht zur festen Entwurfsbindung.',422);
  }
 };
}
