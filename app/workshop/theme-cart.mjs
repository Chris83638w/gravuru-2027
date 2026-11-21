// Prepares an ordinary Shopify theme cart line from the private immutable review.
// No cart mutation or payment/production confirmation takes place here.
import {customerTextLine} from '../configurator/variant-m/text-summary.mjs';
import {prepareBoundCartOffer} from './bound-test-cart.mjs';
import {readReviewPackage} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {cartLineInput} from './storefront-cart.mjs';
import {cartTimingStep} from './shop-cart-timing.mjs';
import {merchantNavigation} from './ui/merchant-navigation.mjs';
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
// #265, ENTSCHEIDUNGEN 3.53 (6) und 3.57 (1): „Fertigungsdatei“ an der Shopify-Zeile. Die Adresse nennt nur die Gestaltung
// (Konfigurations-Kennung und Revision) und führt auf die Bestellansicht der Werkstatt im Shopify-Admin – dieselbe Form, mit der die
// Werkstatt eigene Seiten in einem neuen Tab öffnet (ui/merchant-navigation.mjs). Dort ist die Anmeldung als Mitarbeiter nötig;
// eine Datei liefert erst der Download der angemeldeten Sitzung aus, nie diese Adresse. Ohne Händleranmeldung der Werkstatt für
// diesen Shop (`sessionContext`) gibt es keine solche Seite – dann auch keine Eigenschaft.
export function productionOrderLink(office,shopDomain,configuration){
 if(!office||office.shopDomain!==shopDomain||typeof office.clientId!=='string')return null;
 const link=merchantNavigation('/werkstatt/bestellungen/?'+new URLSearchParams({config:configuration.id,rev:String(configuration.rev)}),'https://'+shopDomain+'/',{newTab:true,apiKey:office.clientId,shop:shopDomain});
 return link.startsWith('https://'+shopDomain+'/admin/apps/'+office.clientId+'/werkstatt/bestellungen/?')?link:null;
}
export function prepareThemeCart({workshop,registry,shopDomain,proxyPath,customerImageUrl,checkoutImageSource,presentation},binding,input,{draftToken}={}){
 const {cartRevision,...offerInput}=input;
 const prepared=cartTimingStep('bound_offer',()=>prepareBoundCartOffer({workshop,registry,shopDomain},binding,offerInput,{draftToken}));
 const {draft,manifest,offer,resolve}=prepared,ledger=workshop.customerDrafts.cartConfigurations;
 const known=ledger.forDraft(draft.id);
 if(input.configId!==undefined&&(!known||known.id!==input.configId))fail(404,'cart_private','Diese Gestaltung gehört nicht zum zugänglichen Entwurf.');
 if(input.configId!==undefined&&(!Number.isSafeInteger(cartRevision)||cartRevision<1||ledger.revision(input.configId,cartRevision).draftId!==draft.id))fail(422,'theme_cart_revision','Bitte die ursprüngliche Warenkorbposition erneut öffnen.');
 const saved=cartTimingStep('review_package',()=>readReviewPackage(workshop.customerDrafts.downloadSnapshot(manifest.id,'package'),manifest.packageSha256,NATIVE_REVIEW_SCHEMAS));
 const source=JSON.parse(saved.files.get('produkt-und-gestaltung.json')),design=source.state.design;
 const config=JSON.parse(saved.files.get('konfigurator-quellen.json'));
 const template=config.profile.designs.find(d=>d.id===design.id);
 const preview=saved.files.get('gestaltung-kundenansicht.png')||saved.files.get('gestaltung-referenz.png');
 if(!preview||preview.length>6*1024*1024||!preview.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail(422,'theme_cart_preview','Die gesicherte Gestaltungsvorschau fehlt.');
 const assigned=cartTimingStep('cart_assign',()=>ledger.assign({draftId:draft.id,draftRevision:draft.revision,snapshotId:manifest.id,offerId:offer.id,productId:draft.productId}));
 const configuration={id:assigned.id,rev:assigned.rev};
 const properties=Object.fromEntries(cartLineInput({...offer,configuration}).attributes.map(a=>[a.key,a.value]));
 properties.Design=String(design.name||design.id).slice(0,240);
 properties.Format=manifest.product.widthMm+' × '+manifest.product.heightMm+' mm';
 const text=customerTextLine(design.objects,template);
 // Full text remains in the private review; visible text properties are split, never silently truncated.
 const chunks=Array.from(text).reduce((a,c)=>{if(!a.length||Array.from(a.at(-1)).length>=240)a.push('');a[a.length-1]+=c;return a;},[]);
 if(chunks.length>50)fail(422,'theme_cart_text','Die Texte sind für die Warenkorbanzeige zu umfangreich.');
 chunks.forEach((part,i)=>{properties[i?'Gravurtext '+(i+1):'Gravurtext']=part;});
 const edit=new URL('https://'+shopDomain+proxyPath+'/start');
 edit.search=new URLSearchParams({product:binding.shopifyProductId.split('/').at(-1),variant:binding.shopifyVariantId.split('/').at(-1),config:configuration.id,rev:String(configuration.rev),line:'theme'});
 if(presentation==='prio-r15')edit.searchParams.set('ui','prio-r15');
 properties._gravuru_bearbeiten=edit.href;
 if(customerImageUrl)properties._gravuru_bild=cartTimingStep('customer_image_url',()=>customerImageUrl(offer.id));
 // #265, ENTSCHEIDUNGEN 3.53 (6): „Fertigungsdatei“ für das Büro; „Gestaltung ansehen“ ist die vorhandene Eigenschaft `_gravuru_bild`.
 const production=productionOrderLink(workshop.sessionContext,shopDomain,configuration);
 if(production)properties._gravuru_fertigung=production;
 // The edit link identifies the actual cart revision, not the last prepared offer.
 const previousRevision=input.configId?cartRevision:null;
 // Only the Shopify media job uses this immutable source. Old offers keep their existing image URL.
 let imageSource;
 try{imageSource=checkoutImageSource?.(manifest.id,manifest.packageSha256);}catch{}
 return {
  checkoutImageSource:imageSource,
  offerId:offer.id,resolve,claim:nonce=>{resolve();return ledger.claimThemeTransfer(offer.id,nonce);},
  payload:{schema:'gravuru-theme-cart/v1',shopDomain,variantId:offer.variantId,productId:binding.shopifyProductId.split('/').at(-1),quantity:offer.quantity,unitCents:offer.unitCents,totalCents:offer.unitCents*offer.quantity,currency:offer.currency,
   configuration,mode:input.configId?'update':'create',previousRevision,properties,preview:{name:'gravuru-gestaltung.png',type:'image/png',base64:preview.toString('base64')},paymentConfirmed:false,productionReady:false}
 };
}
