import {createCrossStoreOrders} from './cross-store-orders.mjs';
import {createHmac} from 'node:crypto';
import {createShopifySessionVerifier} from './shopify-session.mjs';
import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {createLegacyShopBindingReadAdapter} from './shop-product-binding-legacy.mjs';
import {createBoundTestCart} from './bound-test-cart.mjs';
import {createConfiguratorTestGateway} from './configurator-test-gateway.mjs';
import {createCrossStoreWebhookIntake} from './cross-store-order-intake.mjs';
import {createOrderWebhookHandler} from './shopify-order-webhook.mjs';
import {createShopEntry} from './shop-entry.mjs';
import {createShopifyCheckoutImages} from './shopify-checkout-image.mjs';
import {createDraftTokenProvider} from './shopify-draft-token.mjs';
import {createDoorbellStatusWebhookHandler} from './doorbell-status-webhook.mjs';
import {verifyPaidWebhook} from './order-intake.mjs';
import {orderReviewIntakes} from './shopify-order-review-tag.mjs';

// Authenticated routing only; persisted per-product release is enforced by the
// actual acryl intake. No live body is handed to the legacy implementation.
export function createDoorbellLiveIntake(stores){
 const live=stores.filter(s=>s.storeId==='acryl');
 if(live.length!==1)throw Error('Eindeutiger vorhandener Acryl-Speicher für Funkklingeln fehlt.');
 const testIntake=createCrossStoreWebhookIntake({stores});
 const liveIntake=createCrossStoreWebhookIntake({stores:live});
 return {receive(raw,headers,config){
  const verified=verifyPaidWebhook(raw,headers,config);
  return verified.payload.test===true?testIntake.receive(raw,headers,{...config,mode:'test-only'}):liveIntake.receive(raw,headers,config);
 }};
}

// Activation is an explicit host option, not an environment-variable fallback.
// All services reuse the two ALREADY LOCKED runtime instances supplied here.
// `settings.shopEntry` (optional, SHOP-ENTRY.txt) schaltet zusätzlich den öffentlichen Kundeneinstieg
// über den App-Proxy ein: {proxyPath, pagePath?, ttlMs?}. Ohne diesen Schlüssel bleibt alles beim Händlertest.
export function createConfiguratorIntegration({settings,legacy,acryl,origin,shopifySessions,orderWebhook=null}){
 if(settings===null||settings===undefined)return null;
 if(settings.mode!=='merchant-test-only'||Object.keys(settings).some(k=>!['mode','legacyStoreId','acrylStoreId','shopEntry','doorbellLiveOrders','catalogLiveOrders','orderReviewTags'].includes(k))||!/^[-A-Za-z0-9_]{1,100}$/.test(settings.legacyStoreId||'')||!/^[-A-Za-z0-9_]{1,100}$/.test(settings.acrylStoreId||'')||settings.legacyStoreId===settings.acrylStoreId||!legacy||!acryl||legacy===acryl||legacy.repository===acryl.repository||legacy.customerDrafts===acryl.customerDrafts)throw Error('Eindeutige private Test-Stores fehlen.');
 if(settings.catalogLiveOrders!==undefined&&typeof settings.catalogLiveOrders!=='boolean')throw Error('Die Katalog-Livefreigabe muss ausdrücklich ein- oder ausgeschaltet sein.');
 if(settings.catalogLiveOrders===true&&(!orderWebhook||typeof acryl.orderIntake?.approveCatalogLiveProducts!=='function'))throw Error('Katalog-Livefreigabe benötigt den signierten Eingang und geprüfte Produktfreigaben.');
 if(settings.doorbellLiveOrders!==undefined&&typeof settings.doorbellLiveOrders!=='boolean')throw Error('Die Funkklingel-Livefreigabe muss ausdrücklich ein- oder ausgeschaltet sein.');
 if(settings.doorbellLiveOrders===true&&!orderWebhook)throw Error('Funkklingel-Livefreigabe benötigt den eingerichteten signierten Bestelleingang.');
 if(settings.doorbellLiveOrders===true&&typeof acryl.orderIntake?.approveDoorbellLiveProducts!=='function')throw Error('Der bestehende Acryl-Speicher unterstützt keine geprüften Funkklingel-Livefreigaben.');
 // #265 Stufe C, ENTSCHEIDUNGEN 3.57 (2): „Bitte prüfen“ als Tag an der Shopify-Bestellung – standardmäßig AUS. Nur die
 // ausdrückliche Einstellung `orderReviewTags: true` schaltet das Schreiben ein; das Aufspielen des Servers allein schreibt
 // nichts an Shopify. Voraussetzung am Shop ist die Berechtigung `write_orders` (neue App-Version, Freigabe durch Chris).
 if(settings.orderReviewTags!==undefined&&typeof settings.orderReviewTags!=='boolean')throw Error('Der Prüfvermerk an der Shopify-Bestellung muss ausdrücklich ein- oder ausgeschaltet sein.');
 if(settings.orderReviewTags===true&&!orderWebhook)throw Error('Der Prüfvermerk an der Shopify-Bestellung benötigt den eingerichteten signierten Bestelleingang.');
 const entry=settings.shopEntry===undefined?null:settings.shopEntry;
 if(entry!==null&&(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).some(k=>!['proxyPath','pagePath','ttlMs','publicPreviewDirectory','publicPreviewPrepare','modelResponseCache','shopifyCartImages'].includes(k))||typeof entry.proxyPath!=='string'||entry.modelResponseCache!==undefined&&entry.modelResponseCache!==true))throw Error('Der Kundeneinstieg ist nicht eindeutig eingerichtet.');
 const shopDomain=shopifySessions.shopDomain;
 const stores=[{storeId:settings.legacyStoreId,workshop:legacy,apiPrefix:'/api/workshop/',nativeEditorPath:'/_merchant-editor.html',formEditorPath:'/_merchant-form-editor.html'},{storeId:settings.acrylStoreId,workshop:acryl,apiPrefix:'/api/workshop/acryl/',nativeEditorPath:'/_merchant-acryl-editor.html',formEditorPath:'/_merchant-acryl-form-editor.html'}].map(store=>{
  const {storeId,workshop}=store,isLegacy=workshop===legacy;
  const adapter=isLegacy?createLegacyShopBindingReadAdapter({storeId,shopDomain,workshop,legacySingleStore:true}):createShopBindingReadAdapter({storeId,tenantId:workshop?.tenantId,shopDomain,productionProfileScope:{storeId,tenantId:workshop?.tenantId},workshop});
  const registry=workshop.orderIntake.idBindings({storeId,shopDomain,adapter,...(isLegacy?{legacySingleStore:true}:{})});
  // This fixed routing assertion does NOT make the old single-store database
  // tenant aware. Its dedicated legacy adapter validates that narrower scope.
  const scopedWorkshop=isLegacy?Object.freeze({...workshop,tenantId:'gravuru',legacySingleStore:true}):workshop;
  const cart=createBoundTestCart({workshop:scopedWorkshop,registry,shopDomain});
  return {...store,workshop:scopedWorkshop,registry,cart,...(!isLegacy&&settings.doorbellLiveOrders===true?{doorbellLiveOrders:true}:{}),...(!isLegacy&&settings.catalogLiveOrders===true?{catalogLiveOrders:true}:{})};
 });
 const csrfToken=createHmac('sha256',shopifySessions.secret).update(JSON.stringify(['gravuru-configurator-test-csrf/v1',origin,shopifySessions.clientId])).digest('hex');
 const gateway=createConfiguratorTestGateway({mode:'merchant-test-only',origin,shopDomain,verifyMerchant:createShopifySessionVerifier(shopifySessions),csrfToken,stores});
 // Existing test deliveries retain both stores. Actual paid events are routed
 // exclusively to the new store, whose persisted per-product release ledger is
 // checked again before admitting any line. Legacy never receives a live event.
 // #265 Stufe C, ENTSCHEIDUNGEN 3.57 (2): Ohne die Einstellung bleibt je Speicher genau der bisherige Bestelleingang. Mit ihr
 // meldet ein Aufsatz abgelehnte Positionen und fehlgeschlagene Ausgabeaufträge an shopify-order-review-tag.mjs; Eingang,
 // Antwort an Shopify und Fertigung bleiben dieselben. Eigener Zugang, damit ein Fehler dort nie den Kundeneinstieg berührt.
 const storeIntakes=orderReviewIntakes({enabled:settings.orderReviewTags===true,stores,client:()=>({shopDomain,getAccessToken:createDraftTokenProvider({shopDomain,clientId:shopifySessions.clientId,clientSecret:shopifySessions.secret})})});
 const testIntake=orderWebhook?createCrossStoreWebhookIntake({stores:storeIntakes}):null;
 const liveEnabled=settings.doorbellLiveOrders===true||settings.catalogLiveOrders===true;
 const webhookConfig=orderWebhook&&liveEnabled?{...orderWebhook,mode:settings.catalogLiveOrders===true?'catalog-live-approved':'doorbell-live-approved'}:orderWebhook;
 const intake=liveEnabled?createDoorbellLiveIntake(storeIntakes):testIntake;
 const webhook=webhookConfig?createOrderWebhookHandler({config:webhookConfig,intake}):null;
 // Derselbe Store-Satz (Registry, Modell, bound-test-cart) wie das Gateway; eigene Routen, eigene Kundensitzung.
 // The existing session verifier uses `test-only` even for the public shop
 // entry. The explicit shop-entry activation controls this lazy image adapter;
 // the session label must not silently disable checkout previews.
 const getCheckoutAccess=entry?createDraftTokenProvider({shopDomain,clientId:shopifySessions.clientId,clientSecret:shopifySessions.secret}):null;
 const checkoutImage=entry?createShopifyCheckoutImages({origin,shopDomain,getAccessToken:getCheckoutAccess}):null;
 const shopEntry=entry?createShopEntry({origin,shopDomain,secret:shopifySessions.secret,stores,checkoutImage,shopifyCartImages:entry.shopifyCartImages===true,warmCheckoutAccess:getCheckoutAccess,proxyPath:entry.proxyPath,...(entry.pagePath===undefined?{}:{pagePath:entry.pagePath}),...(entry.ttlMs===undefined?{}:{ttlMs:entry.ttlMs}),...(entry.publicPreviewDirectory===undefined?{}:{publicPreviewDirectory:entry.publicPreviewDirectory}),...(entry.publicPreviewPrepare===undefined?{}:{publicPreviewPrepare:entry.publicPreviewPrepare}),...(entry.modelResponseCache===true?{modelResponseCache:true}:{})}):null;
 const statusWebhook=liveEnabled?createDoorbellStatusWebhookHandler({config:webhookConfig,intake:acryl.orderIntake}):null;
 const orders=createCrossStoreOrders({stores,origin,shopDomain,verifyMerchant:createShopifySessionVerifier(shopifySessions),enabled:Boolean(orderWebhook)});
 return Object.freeze({gateway,webhook,statusWebhook,shopEntry,orders});
}

