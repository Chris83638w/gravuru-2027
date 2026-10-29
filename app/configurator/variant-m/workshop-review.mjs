import {cleanObject} from './contract.mjs';
import {printArtwork} from './print-export.mjs';
import {createAcrylicDraftClient} from './acrylic-draft-client.mjs';
import {installShopCart} from './shop-cart.mjs';
import {logoMediaPayload} from './logo-upload.mjs';

const base64=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Die Bilddatei konnte nicht gelesen werden.'));reader.readAsDataURL(blob);});
async function referencePng(svg,geometry){
 const canvas=document.createElement('canvas');canvas.height=900;canvas.width=Math.round(900*geometry.width/geometry.height);
 const image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{image.src=url;await image.decode();canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png').split(',')[1];}finally{URL.revokeObjectURL(url);}
}

export function installWorkshopReview(api,footer){
 const binding=window.parent.GravuruWorkshopReview;
 const request=window.parent.GravuruMerchantRequest||fetch;
 const testGate=window.parent.GravuruConfiguratorTest;
 const universalTest=()=>typeof testGate?.submitCart==='function'&&testGate.productId===binding.productId&&testGate.productRevision===binding.productRevision;
 if(!binding||(!api.config?.acrylic&&!api.config?.doorbell&&!api.config?.familyAcrylic&&!['slate','steel'].includes(api.config?.profile?.material?.kind)))return;
 // Öffentlicher Shop-Einstieg (SHOP-ENTRY.txt): Kunden sehen „In den Warenkorb“ statt der Werkstatt-/Testknöpfe.
 if(window.parent.GravuruShopEntry)return void installShopCart(api,footer,window.parent.GravuruShopEntry);
 const button=document.createElement('button'),status=document.createElement('p'),link=document.createElement('a');
 button.type='button';button.textContent='Für die Werkstattprüfung sichern';button.dataset.acrylicReview='';status.setAttribute('role','status');status.setAttribute('aria-live','polite');link.textContent='Gesicherten Stand im Dashboard öffnen →';link.target='_blank';link.rel='noopener';link.hidden=true;link.dataset.acrylicReviewLink='';
 const testButton=document.createElement('button'),checkout=document.createElement('a');
 testButton.type='button';testButton.textContent='Test-Warenkorb erstellen';testButton.hidden=true;testButton.dataset.merchantTestCart='';
 checkout.textContent='Test-Checkout bei Shopify öffnen →';checkout.target='_blank';checkout.rel='noopener noreferrer';checkout.hidden=true;checkout.dataset.merchantTestCheckout='';
 footer.append(button,status,link,testButton,checkout);let busy=false,savePrivate,saved=null;
 const fingerprint=()=>JSON.stringify([api.el.state,Number(api.r.querySelector('[data-fk-quantity]').value||1)]);
 checkout.onclick=event=>{if(api.pending?.()||!saved||saved.fingerprint!==fingerprint()){event.preventDefault();checkout.hidden=true;checkout.removeAttribute('href');status.textContent='Die Gestaltung wurde geändert. Bitte zuerst erneut sichern.';}};
 // K8 (Ü9.1): Bearbeiten-Kontext aus dem Warenkorb-Link (cart-edit.mjs). Nur derselbe Entwurf kann seine Zeile ersetzen.
 const editContext=()=>{const edit=api.el.cartEdit;return edit&&saved&&edit.draftId===saved.result.draftId?edit:null;};
 const labelTestButton=()=>{testButton.textContent=editContext()?.cartLineId?'Warenkorb aktualisieren (Test)':'Test-Warenkorb erstellen';};
 testButton.onclick=async()=>{
  if(busy||!saved)return;busy=true;testButton.disabled=true;button.disabled=true;checkout.hidden=true;checkout.removeAttribute('href');
  try{
   if(api.pending?.()||saved.fingerprint!==fingerprint())throw Error('Die Gestaltung wurde geändert. Bitte zuerst erneut sichern.');
   const edit=editContext();
   status.textContent=edit?.cartLineId?'Warenkorbposition wird mit dem neuen Stand und Preis ersetzt …':'Test-Warenkorb wird mit dem gespeicherten Preis geprüft …';
   const body={draftId:saved.result.draftId,expectedRevision:saved.result.revision,...(edit?{configId:edit.configId,...(edit.cartLineId?{cartLineId:edit.cartLineId}:{})}:{})};
   let result;
   if(universalTest())result=await testGate.submitCart({...body,quantity:Number(api.r.querySelector('[data-fk-quantity]').value||1)},{draftToken:saved.result.draftToken});
   else {const response=await request('/api/workshop/merchant-test-cart',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':saved.csrfToken,'X-Gravuru-Draft':saved.result.draftToken},body:JSON.stringify(body)});
    result=await response.json();if(!response.ok)throw Error(result.error?.message||'Test-Warenkorb konnte nicht bestätigt werden.');}
   if(saved.fingerprint!==fingerprint())throw Error('Die Gestaltung wurde während der Übergabe geändert. Bitte zuerst erneut sichern.');
   const target=new URL(result.checkoutUrl);if(target.protocol!=='https:'||target.hostname!=='gravuru-design.myshopify.com'||target.port||target.username||target.password||result.testOnly!==true||result.productionReady!==false||result.paymentConfirmed!==false||!Number.isSafeInteger(result.totalCents))throw Error('Die Test-Checkout-Antwort ist nicht bestätigt.');
   checkout.href=target.href;checkout.hidden=false;
   if(result.configuration?.id&&result.lineId)api.el.cartEdit={configId:result.configuration.id,rev:result.configuration.rev,cartLineId:result.lineId,draftId:saved.result.draftId,draftToken:saved.result.draftToken,draftRevision:saved.result.revision};
   labelTestButton();
   status.textContent=(result.mode==='update'?'Warenkorbposition ersetzt (Revision '+result.configuration.rev+'): ':'Test-Warenkorb bestätigt'+(result.configuration?' (Revision '+result.configuration.rev+')':'')+': ')+new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(result.totalCents/100)+'. Nur im aktivierten Shopify-Zahlungstestmodus abschließen. Keine Fertigung freigegeben.';
  }catch(error){status.textContent=error.message;}finally{busy=false;testButton.disabled=false;button.disabled=false;}
 };
 button.onclick=async()=>{
  if(busy)return;busy=true;button.disabled=true;link.hidden=true;testButton.hidden=true;checkout.hidden=true;checkout.removeAttribute('href');saved=null;status.textContent='Gestaltung und Originalbilder werden gesichert …';
  try{
   if(api.pending?.())throw Error('Bitte warten, bis das Foto vollständig geladen ist.');
   const fingerprint=JSON.stringify(api.el.state),art=await printArtwork(api),used=new Set(api.el.state.objects.filter(o=>o.uxUploadId).map(o=>o.uxUploadId)),media=[];
   for(const id of used)media.push(await logoMediaPayload(api.files.get(id),id));
   const payload={...binding,designId:api.el.state.designId,objects:api.el.state.objects.map(cleanObject),options:api.el.state.mOptions,quantity:Number(api.r.querySelector('[data-fk-quantity]').value||1),media,preview:await referencePng(art.svg,art.geometry)};
   if(fingerprint!==JSON.stringify(api.el.state))throw Error('Die Gestaltung wurde während der Sicherung geändert. Bitte erneut sichern.');
   const session=await request('/api/workshop/session'),credentials=await session.json();if(!session.ok||!['local-operator','shopify-merchant-test'].includes(credentials.scope))throw Error('Die Werkstattprüfung benötigt eine geschützte Werkstattsitzung.');
   savePrivate??=createAcrylicDraftClient({storage:sessionStorage,fetchImpl:request});
   const result=await savePrivate(payload,credentials.csrfToken);
   saved={result,csrfToken:credentials.csrfToken,fingerprint:JSON.stringify([JSON.parse(fingerprint),payload.quantity])};
   testButton.hidden=!universalTest()&&(credentials.merchantTestCart?.productId!==binding.productId||credentials.merchantTestCart?.productRevision!==binding.productRevision);labelTestButton();
   if(api.el.cartEdit&&api.el.cartEdit.draftId!==result.draftId)status.textContent='Hinweis: Diese Gestaltung gehört zu einem neuen Entwurf; die alte Warenkorbposition bleibt bestehen. ';
   for(const item of footer.querySelectorAll('[data-unconnected-cart]'))item.hidden=!testButton.hidden;
   const target=new URL('/werkstatt/pruefstaende/',location.origin);target.searchParams.set('snapshot',result.id);if(window.parent.GravuruMerchantRequest){for(const key of ['shop','host','embedded']){const value=new URL(window.parent.location.href).searchParams.get(key);if(value)target.searchParams.set(key,value);}link.target='_parent';}link.href=target.pathname+target.search;link.hidden=false;
   status.textContent=(api.el.cartEdit&&api.el.cartEdit.draftId!==result.draftId?status.textContent:'')+'Gestaltung mit Originalbildern als Revision '+result.revision+' gesichert. Frühere Prüfstände bleiben erhalten. Dies ist noch keine Bestellung.'+(result.accessStored?'':' Der private Zugriff bleibt nur bis zum Schließen dieser Seite verfügbar; bitte den Dashboard-Link geöffnet lassen.')+(result.photoHints?.length?' '+[...new Set(result.photoHints.map(h=>h.text))].join(' '):'');
  }catch(error){status.textContent=error.message;}finally{busy=false;button.disabled=false;}
 };
}
