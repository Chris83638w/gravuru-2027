import {createHmac} from 'node:crypto';
import {createShopifySessionVerifier} from './shopify-session.mjs';
import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {createLegacyShopBindingReadAdapter} from './shop-product-binding-legacy.mjs';
import {createBoundTestCart} from './bound-test-cart.mjs';
import {createConfiguratorTestGateway} from './configurator-test-gateway.mjs';
import {createCrossStoreWebhookIntake} from './cross-store-order-intake.mjs';
import {createOrderWebhookHandler} from './shopify-order-webhook.mjs';

// Activation is an explicit host option, not an environment-variable fallback.
// All services reuse the two ALREADY LOCKED runtime instances supplied here.
export function createConfiguratorIntegration({settings,legacy,acryl,origin,shopifySessions,orderWebhook=null}){
 if(settings===null||settings===undefined)return null;
 if(settings.mode!=='merchant-test-only'||Object.keys(settings).some(k=>!['mode','legacyStoreId','acrylStoreId'].includes(k))||!/^[-A-Za-z0-9_]{1,100}$/.test(settings.legacyStoreId||'')||!/^[-A-Za-z0-9_]{1,100}$/.test(settings.acrylStoreId||'')||settings.legacyStoreId===settings.acrylStoreId||!legacy||!acryl||legacy===acryl||legacy.repository===acryl.repository||legacy.customerDrafts===acryl.customerDrafts)throw Error('Eindeutige private Test-Stores fehlen.');
 const shopDomain=shopifySessions.shopDomain;
 const stores=[{storeId:settings.legacyStoreId,workshop:legacy,apiPrefix:'/api/workshop/',nativeEditorPath:'/_merchant-editor.html',formEditorPath:'/_merchant-form-editor.html'},{storeId:settings.acrylStoreId,workshop:acryl,apiPrefix:'/api/workshop/acryl/',nativeEditorPath:'/_merchant-acryl-editor.html',formEditorPath:'/_merchant-acryl-form-editor.html'}].map(store=>{
  const {storeId,workshop}=store,isLegacy=workshop===legacy;
  const adapter=isLegacy?createLegacyShopBindingReadAdapter({storeId,shopDomain,workshop,legacySingleStore:true}):createShopBindingReadAdapter({storeId,tenantId:workshop?.tenantId,shopDomain,productionProfileScope:{storeId,tenantId:workshop?.tenantId},workshop});
  const registry=workshop.orderIntake.idBindings({storeId,shopDomain,adapter,...(isLegacy?{legacySingleStore:true}:{})});
  // This fixed routing assertion does NOT make the old single-store database
  // tenant aware. Its dedicated legacy adapter validates that narrower scope.
  const scopedWorkshop=isLegacy?Object.freeze({...workshop,tenantId:'gravuru',legacySingleStore:true}):workshop;
  const cart=createBoundTestCart({workshop:scopedWorkshop,registry,shopDomain});
  return {...store,workshop:scopedWorkshop,registry,cart};
 });
 const csrfToken=createHmac('sha256',shopifySessions.secret).update(JSON.stringify(['gravuru-configurator-test-csrf/v1',origin,shopifySessions.clientId])).digest('hex');
 const gateway=createConfiguratorTestGateway({mode:'merchant-test-only',origin,shopDomain,verifyMerchant:createShopifySessionVerifier(shopifySessions),csrfToken,stores});
 const webhook=orderWebhook?createOrderWebhookHandler({config:orderWebhook,intake:createCrossStoreWebhookIntake({stores:stores.map(s=>({storeId:s.storeId,intake:s.workshop.orderIntake}))})}):null;
 return Object.freeze({gateway,webhook});
}
