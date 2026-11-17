// Kundenabschluss im öffentlichen Shop-Einstieg (app/workshop/SHOP-ENTRY.txt): „In den Warenkorb“ sichert die
// Gestaltung mit Originalbildern als privaten Entwurf/Prüfstand (gleicher Weg wie die Werkstattprüfung) und
// übergibt sie dem Server, der die echte Shopify-Variante, Menge und den geprüften Preis festlegt.
// Im Shop-Einstieg überträgt die Shop-Seite Vorschau und Eigenschaften in den normalen Warenkorb und prüft ihn zurück.
import {prepareCartImages} from './cart-preparation.mjs';
import {cleanObject} from './contract.mjs';
import {printArtwork} from './print-export.mjs';
import {createAcrylicDraftClient} from './acrylic-draft-client.mjs';
import {editorUi} from './toolbar-placement-model.mjs';
import {logoMediaPayload} from './logo-upload.mjs';
import {canonicalCartDraft,createCartDraftPreparation,changedCartDraft} from './cart-draft-preparation.mjs';

// Customer preview for the cart: WebP keeps the upload small (PNG with material texture ≈3 MB);
// browsers without WebP encoding return PNG, which the server accepts unchanged.
export async function customerPreviewBlob(el){const blob=await el.png({type:'image/webp',quality:.9});return blob?.type==='image/webp'||blob?.type==='image/png'?blob:el.png();}
const base64=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Die Bilddatei konnte nicht gelesen werden.'));reader.readAsDataURL(blob);});
async function referencePng(svg,geometry){
 const canvas=document.createElement('canvas');canvas.height=900;canvas.width=Math.round(900*geometry.width/geometry.height);
 const image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{image.src=url;await image.decode();canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png').split(',')[1];}finally{URL.revokeObjectURL(url);}
}
const euro=cents=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);
// K8: Nur die Warenkorbzeile desselben Entwurfs wird ersetzt; eine andere Gestaltung wird neu hinzugefügt.
export function shopCartRequest({saved,cartEdit,quantity,cartMode,presentation}){
 const edit=cartEdit&&cartEdit.draftId===saved.draftId?cartEdit:null;
 return {draftId:saved.draftId,expectedRevision:saved.revision,quantity,...(edit?{configId:edit.configId,...(edit.cartLineId?{cartLineId:edit.cartLineId,...(edit.cartLineId==='theme'?{cartRevision:edit.rev}:{})}:{})}:{}),...(cartMode==='theme'&&presentation==='prio-r15'?{presentation:'prio-r15'}:{})};
}
// Weiterleitung nur zur Checkout-Adresse des bestätigten Shops; Zahlung ist damit nicht bestätigt.
export function checkoutTarget(result,shopDomain){
 let target;try{target=new URL(result?.checkoutUrl);}catch{throw Error('Der Warenkorb wurde nicht bestätigt. Bitte erneut versuchen.');}
 if(target.protocol!=='https:'||target.hostname!==shopDomain||target.port||target.username||target.password||result.paymentConfirmed!==false||!Number.isSafeInteger(result.totalCents))throw Error('Der Warenkorb wurde nicht bestätigt. Bitte erneut versuchen.');
 return target.href;
}


export function themeCartTarget(result,shopDomain,path){
 let target;try{target=new URL(result?.handoffUrl);}catch{throw Error('Die Warenkorbübergabe wurde nicht bestätigt.');}
 if(typeof path!=='string'||!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/cart$/.test(path)||target.protocol!=='https:'||target.hostname!==shopDomain||target.port||target.username||target.password||target.pathname!==path||target.search||!/^#handoff=[a-f0-9]{64}$/.test(target.hash)||result.mode!=='theme'||result.paymentConfirmed!==false||!Number.isSafeInteger(result.totalCents))throw Error('Die Warenkorbübergabe wurde nicht bestätigt.');
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
 // V4: laufende Schritte zeigen ein Ladesymbol; dauert ein Schritt länger, erscheint ein Hinweis statt Stillstand.
 let slow=null;
 const say=(text,{busy:running=false}={})=>{clearTimeout(slow);status.textContent=text;status.hidden=!text;if(running)status.dataset.busy='';else delete status.dataset.busy;
  if(running)slow=setTimeout(()=>{if('busy' in status.dataset)status.textContent=text+' Bei langsamer Verbindung dauert das etwas länger – bitte das Fenster geöffnet lassen.';},12000);};
 const label=()=>{button.textContent=busy?'Bitte warten …':api.el.cartEdit?.cartLineId?'Warenkorb aktualisieren':'Jetzt in den Warenkorb';button.disabled=busy;};
 const preSave=gate.preSaveOnReview===true&&gate.presentation==='prio-r15';
 const mediaIds=new WeakMap();let nextMediaId=0;
 const mediaId=value=>{if(!value||typeof value!=='object')return null;if(!mediaIds.has(value))mediaIds.set(value,++nextMediaId);return mediaIds.get(value);};
 const usedMedia=()=>[...new Set(api.el.state.objects.filter(o=>o.uxUploadId).map(o=>o.uxUploadId))];
 const draftKey=()=>canonicalCartDraft({binding,designId:api.el.state.designId,objects:api.el.state.objects.map(cleanObject),options:api.el.state.mOptions,ui:editorUi(api.el.state.ui),quantity:quantity(),cartEdit:api.el.cartEdit||null,
  media:usedMedia().sort().map(id=>{const asset=api.files.get(id);return {id,file:mediaId(asset?.file),edited:mediaId(asset?.blob),vectorLogo:asset?.vectorLogo};})});
 async function prepareDraft(expected){
  if(api.pending?.())throw Error('Bitte warten, bis das Foto vollständig geladen ist.');
  const count=quantity(),cartEdit=api.el.cartEdit;
  if(!Number.isSafeInteger(count)||count<1||count>99)throw Error('Bitte eine Menge zwischen 1 und 99 wählen.');
  if(busy)say('1 von 4 · Vorschau wird erstellt …',{busy:true});
  await api.el.uxEnsureDraftResources?.({design:{objects:api.el.state.objects}});
  const prepared=await prepareCartImages({artwork:()=>printArtwork(api),media:()=>Promise.all(usedMedia().map(id=>logoMediaPayload(api.files.get(id),id))),reference:art=>referencePng(art.svg,art.geometry),customer:async()=>base64(await customerPreviewBlob(api.el))});
  const ui=editorUi(api.el.state.ui);
  const payload={...binding,textOnTop:true,designId:api.el.state.designId,objects:api.el.state.objects.map(cleanObject),options:api.el.state.mOptions,quantity:count,media:prepared.media,preview:prepared.preview,customerPreview:prepared.customerPreview,...(ui?{ui}:{})};
  if(expected!==draftKey())throw changedCartDraft();
  save??=createAcrylicDraftClient({storage:cartEdit?null:sessionStorage,fetchImpl:gate.request});
  if(busy)say('2 von 4 · Gestaltung wird gesichert …',{busy:true});
  return save(payload,gate.csrfToken||'shop-entry',cartEdit);
 }
 const preparation=preSave?createCartDraftPreparation({key:draftKey,prepare:prepareDraft}):null;
 if(preparation){
  // Called only after the existing overview has passed its visible checks.
  // No status/button mutation and no cart/offer request on this path.
  api.el.uxPrepareShopCart=()=>{if(!busy&&!api.pending?.()&&!api.el.uxTextIssues?.().length&&(!gate.expiresAt||Date.now()<gate.expiresAt))preparation.prefetch();};
  window.addEventListener?.('pagehide',event=>{if(!event.persisted)preparation.close();});
 }
 button.addEventListener('click',async()=>{
  if(busy)return;busy=true;label();
  try{
   api.el.uxAttemptTextValidation?.();api.el.sync();
   const issue=api.el.uxTextIssues?.()[0];
   if(issue){api.el.uxRevealTextIssue?.(issue.id);throw Error(issue.message);}
   if(api.el.uxCheckLayout&&!await api.el.uxCheckLayout())return;
   if(api.pending?.())throw Error('Bitte warten, bis das Foto vollständig geladen ist.');
   const fingerprint=JSON.stringify(api.el.state),count=quantity();
   if(!Number.isSafeInteger(count)||count<1||count>99)throw Error('Bitte eine Menge zwischen 1 und 99 wählen.');
   const cartEdit=api.el.cartEdit;
   const expected=draftKey();
   say('1 von 4 · Vorschau wird erstellt …',{busy:true});
   const saved=await (preparation?preparation.get():prepareDraft(expected));
   if(expected!==draftKey())throw changedCartDraft();
   const body=shopCartRequest({saved,cartEdit,quantity:count,cartMode:gate.cartMode,presentation:gate.presentation});
   say('3 von 4 · Warenkorb wird vorbereitet …',{busy:true});
   const result=await gate.submitCart(body,{draftToken:saved.draftToken});
   if(fingerprint!==JSON.stringify(api.el.state)||count!==quantity())throw Error('Die Gestaltung wurde während der Übergabe geändert. Bitte erneut in den Warenkorb legen.');
   const target=gate.cartMode==='theme'?themeCartTarget(result,gate.shopDomain,gate.themeCartPath):checkoutTarget(result,gate.shopDomain);
   if(result.configuration?.id&&result.lineId)api.el.cartEdit={configId:result.configuration.id,rev:result.configuration.rev,cartLineId:result.lineId,draftId:saved.draftId,draftToken:saved.draftToken,draftRevision:saved.revision};
   say(gate.cartMode==='theme'?'4 von 4 · Deine Gestaltung ist gesichert und wird in den Warenkorb gelegt …':(result.mode==='update'?'Warenkorbposition aktualisiert: ':'Im Warenkorb: ')+euro(result.totalCents)+'. Weiter zu Shopify …',{busy:true});
   window.top.location.assign(target);
  }catch(error){say(error.message||'Der Warenkorb konnte nicht vorbereitet werden.');}
  finally{busy=false;label();}
 });
 const sync=api.el.sync;api.el.sync=function(...args){const result=sync.apply(this,args);label();return result;};label();
 return {button,status};
}
