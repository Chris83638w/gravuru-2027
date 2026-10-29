// Prepares an ordinary Shopify theme cart line from the private immutable review.
// No cart mutation or payment/production confirmation takes place here.
import {prepareBoundCartOffer} from './bound-test-cart.mjs';
import {readReviewPackage} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {cartLineInput} from './storefront-cart.mjs';
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
export function prepareThemeCart({workshop,registry,shopDomain,proxyPath,customerImageUrl},binding,input,{draftToken}={}){
 const {cartRevision,...offerInput}=input;
 const prepared=prepareBoundCartOffer({workshop,registry,shopDomain},binding,offerInput,{draftToken});
 const {draft,manifest,offer,resolve}=prepared,ledger=workshop.customerDrafts.cartConfigurations;
 const known=ledger.forDraft(draft.id);
 if(input.configId!==undefined&&(!known||known.id!==input.configId))fail(404,'cart_private','Diese Gestaltung gehört nicht zum zugänglichen Entwurf.');
 if(input.configId!==undefined&&(!Number.isSafeInteger(cartRevision)||cartRevision<1||ledger.revision(input.configId,cartRevision).draftId!==draft.id))fail(422,'theme_cart_revision','Bitte die ursprüngliche Warenkorbposition erneut öffnen.');
 const saved=readReviewPackage(workshop.customerDrafts.downloadSnapshot(manifest.id,'package'),manifest.packageSha256,NATIVE_REVIEW_SCHEMAS);
 const design=JSON.parse(saved.files.get('produkt-und-gestaltung.json')).state.design;
 const preview=saved.files.get('gestaltung-kundenansicht.png')||saved.files.get('gestaltung-referenz.png');
 if(!preview||preview.length>6*1024*1024||!preview.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail(422,'theme_cart_preview','Die gesicherte Gestaltungsvorschau fehlt.');
 const assigned=ledger.assign({draftId:draft.id,draftRevision:draft.revision,snapshotId:manifest.id,offerId:offer.id,productId:draft.productId});
 const configuration={id:assigned.id,rev:assigned.rev};
 const properties=Object.fromEntries(cartLineInput({...offer,configuration}).attributes.map(a=>[a.key,a.value]));
 properties.Design=String(design.name||design.id).slice(0,240);
 properties.Format=manifest.product.widthMm+' × '+manifest.product.heightMm+' mm';
 const text=design.objects.filter(o=>o.type==='text'&&!o.uxHidden&&o.role!=='guide').map(o=>o.text).join(' · ');
 // Full text remains in the private review; visible text properties are split, never silently truncated.
 const chunks=Array.from(text).reduce((a,c)=>{if(!a.length||Array.from(a.at(-1)).length>=240)a.push('');a[a.length-1]+=c;return a;},[]);
 if(chunks.length>50)fail(422,'theme_cart_text','Die Texte sind für die Warenkorbanzeige zu umfangreich.');
 chunks.forEach((part,i)=>{properties[i?'Gravurtext '+(i+1):'Gravurtext']=part;});
 const edit=new URL('https://'+shopDomain+proxyPath+'/start');
 edit.search=new URLSearchParams({product:binding.shopifyProductId.split('/').at(-1),variant:binding.shopifyVariantId.split('/').at(-1),config:configuration.id,rev:String(configuration.rev),line:'theme'});
 properties._gravuru_bearbeiten=edit.href;
 if(customerImageUrl)properties._gravuru_bild=customerImageUrl(offer.id);
 // The edit link identifies the actual cart revision, not the last prepared offer.
 const previousRevision=input.configId?cartRevision:null;
 return {
  offerId:offer.id,resolve,claim:nonce=>{resolve();return ledger.claimThemeTransfer(offer.id,nonce);},
  payload:{schema:'gravuru-theme-cart/v1',shopDomain,variantId:offer.variantId,productId:binding.shopifyProductId.split('/').at(-1),quantity:offer.quantity,unitCents:offer.unitCents,totalCents:offer.unitCents*offer.quantity,currency:offer.currency,
   configuration,mode:input.configId?'update':'create',previousRevision,properties,preview:{name:'gravuru-gestaltung.png',type:'image/png',base64:preview.toString('base64')},paymentConfirmed:false,productionReady:false}
 };
}
