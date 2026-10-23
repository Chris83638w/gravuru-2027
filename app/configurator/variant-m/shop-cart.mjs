// Kundenabschluss im öffentlichen Shop-Einstieg (app/workshop/SHOP-ENTRY.txt): „In den Warenkorb“ sichert die
// Gestaltung mit Originalbildern als privaten Entwurf/Prüfstand (gleicher Weg wie die Werkstattprüfung) und
// übergibt sie dem Server, der die echte Shopify-Variante, Menge und den geprüften Preis in den Warenkorb legt.
// Der Preis kommt nie aus dem Browser; die Seite zeigt nur das Ergebnis und leitet zur Shopify-Checkout-Adresse.
import {cleanObject} from './contract.mjs';
import {printArtwork} from './print-export.mjs';
import {createAcrylicDraftClient} from './acrylic-draft-client.mjs';

const base64=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Die Bilddatei konnte nicht gelesen werden.'));reader.readAsDataURL(blob);});
async function referencePng(svg,geometry){
 const canvas=document.createElement('canvas');canvas.height=900;canvas.width=Math.round(900*geometry.width/geometry.height);
 const image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{image.src=url;await image.decode();canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png').split(',')[1];}finally{URL.revokeObjectURL(url);}
}
const euro=cents=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);
// K8: Nur die Warenkorbzeile desselben Entwurfs wird ersetzt; eine andere Gestaltung wird neu hinzugefügt.
export function shopCartRequest({saved,cartEdit,quantity}){
 const edit=cartEdit&&cartEdit.draftId===saved.draftId?cartEdit:null;
 return {draftId:saved.draftId,expectedRevision:saved.revision,quantity,...(edit?{configId:edit.configId,...(edit.cartLineId?{cartLineId:edit.cartLineId}:{})}:{})};
}
// Weiterleitung nur zur Checkout-Adresse des bestätigten Shops; Zahlung ist damit nicht bestätigt.
export function checkoutTarget(result,shopDomain){
 let target;try{target=new URL(result?.checkoutUrl);}catch{throw Error('Der Warenkorb wurde nicht bestätigt. Bitte erneut versuchen.');}
 if(target.protocol!=='https:'||target.hostname!==shopDomain||target.port||target.username||target.password||result.paymentConfirmed!==false||!Number.isSafeInteger(result.totalCents))throw Error('Der Warenkorb wurde nicht bestätigt. Bitte erneut versuchen.');
 return target.href;
}

export function installShopCart(api,footer,gate){
 const binding=window.parent.GravuruWorkshopReview;
 if(!binding||typeof gate?.submitCart!=='function'||typeof gate.request!=='function'||gate.productId!==binding.productId||gate.productRevision!==binding.productRevision)return null;
 for(const item of footer.querySelectorAll('[data-unconnected-cart]'))item.remove();
 const button=document.createElement('button'),status=document.createElement('p');
 button.type='button';button.className='completion-cart';button.dataset.shopCart='';
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.dataset.shopCartStatus='';status.hidden=true;
 footer.append(button,status);
 let busy=false,save=null;
 const quantity=()=>Number(api.r.querySelector('[data-fk-quantity]')?.value||1);
 const say=text=>{status.textContent=text;status.hidden=!text;};
 const label=()=>{button.textContent=busy?'Wird vorbereitet …':api.el.cartEdit?.cartLineId?'Warenkorb aktualisieren':'In den Warenkorb';button.disabled=busy;};
 button.addEventListener('click',async()=>{
  if(busy)return;busy=true;label();
  try{
   if(api.pending?.())throw Error('Bitte warten, bis das Foto vollständig geladen ist.');
   const fingerprint=JSON.stringify(api.el.state),count=quantity();
   if(!Number.isSafeInteger(count)||count<1||count>99)throw Error('Bitte eine Menge zwischen 1 und 99 wählen.');
   say('Deine Gestaltung wird gesichert …');
   const art=await printArtwork(api),used=new Set(api.el.state.objects.filter(o=>o.uxUploadId).map(o=>o.uxUploadId)),media=[];
   for(const id of used){const asset=api.files.get(id);if(!asset?.file)throw Error('Ein Originalfoto fehlt. Bitte erneut hochladen.');media.push({id,original:await base64(asset.file),...(asset.blob?{edited:await base64(asset.blob)}:{})});}
   const payload={...binding,designId:api.el.state.designId,objects:api.el.state.objects.map(cleanObject),options:api.el.state.mOptions,quantity:count,media,preview:await referencePng(art.svg,art.geometry)};
   if(fingerprint!==JSON.stringify(api.el.state))throw Error('Die Gestaltung wurde während der Sicherung geändert. Bitte erneut in den Warenkorb legen.');
   save??=createAcrylicDraftClient({storage:sessionStorage,fetchImpl:gate.request});
   const saved=await save(payload,gate.csrfToken||'shop-entry');
   const body=shopCartRequest({saved,cartEdit:api.el.cartEdit,quantity:count});
   say(body.cartLineId?'Deine Warenkorbposition wird mit dem neuen Stand ersetzt …':'Dein Warenkorb wird vorbereitet …');
   const result=await gate.submitCart(body,{draftToken:saved.draftToken});
   if(fingerprint!==JSON.stringify(api.el.state)||count!==quantity())throw Error('Die Gestaltung wurde während der Übergabe geändert. Bitte erneut in den Warenkorb legen.');
   const target=checkoutTarget(result,gate.shopDomain);
   if(result.configuration?.id&&result.lineId)api.el.cartEdit={configId:result.configuration.id,rev:result.configuration.rev,cartLineId:result.lineId,draftId:saved.draftId,draftToken:saved.draftToken,draftRevision:saved.revision};
   say((result.mode==='update'?'Warenkorbposition aktualisiert: ':'Im Warenkorb: ')+euro(result.totalCents)+'. Weiter zu Shopify …');
   window.top.location.assign(target);
  }catch(error){say(error.message||'Der Warenkorb konnte nicht vorbereitet werden.');}
  finally{busy=false;label();}
 });
 const sync=api.el.sync;api.el.sync=function(...args){const result=sync.apply(this,args);label();return result;};label();
 return {button,status};
}
