import {createShopEntryClient} from '/konfigurator/shop/shop-entry-client.mjs';

export const betaEntry = 'https://konfi-beta.gravuru-designwerkstatt.de/prio-stufe-1/';
const editor = '/konfi-demo/prio-claude-stufe1-267/editor.html';
const store = 'gravuru-design.myshopify.com';
const productId = 'gid://shopify/Product/16190784438652';
const configuration = 'cfg_ac514214-a313-4738-8008-00445ee1befd';

function isolate(model) {
  if (model.shopDomain !== store ||
      model.binding?.shopifyProductId !== productId ||
      model.model?.configuration?.id !== configuration ||
      model.model.configuration.revision !== 4 ||
      model.editorPath !== '/_merchant-acryl-editor.html') {
    throw Error('Die aktuell freigegebene Edelstahl-Ausführung ist für diesen Test erforderlich.');
  }
  return {...model, editorPath:editor};
}

export function pilotClient(options) {
  const client=createShopEntryClient(options);
  return {
    ...client,
    loadInitialModel: (...args)=>client.loadInitialModel(...args).then(isolate),
    loadModel: (...args)=>client.loadModel(...args).then(isolate)
  };
}

export function cartForPilot(client,data,test) {
  return async (body,access)=>{
    const prepared=await client.submitThemeCart(body,access);
    const handoff=new URL(prepared.handoffUrl);
    if(handoff.origin!=='https://'+store || handoff.pathname!==data.themeCartPath ||
       !/^#handoff=[a-f0-9]{64}$/.test(handoff.hash)) {
      throw Error('Der Warenkorb hat die Übergabe nicht bestätigt.');
    }
    const url=new URL('https://'+store+'/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen');
    url.search=new URLSearchParams({preview_theme_id:'191449661820',view:'warenkorb-cst1',pb:'0'});
    url.hash=handoff.hash+'&test='+test;
    window.location.assign(url);
    return new Promise(()=>{});
  };
}
