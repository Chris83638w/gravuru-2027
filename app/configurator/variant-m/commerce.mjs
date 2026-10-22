import {validateCommerce,selectCommerceVariant} from './commerce-model.mjs';
import {designFromState,validateDesign,money,optionFieldEntries} from './contract.mjs';
import {exportCommerce} from './commerce-export.mjs';

export function installCommerce({el,config,files,pending}){
 const bridge=window.parent.GravuruCommerce;if(!bridge)return;
 const binding=validateCommerce(config,bridge.binding),r=el.shadowRoot,button=r.querySelector('.fk-buy-button'),status=r.querySelector('.fk-order-status');
 let busy=false,message='';
 // K1 (Ü2.2/Ü3.1): Pflichtfeld mit Mustertext oder Text über dem Limit sperrt den Warenkorb; der Kunde sieht welches Feld.
 const blockedBy=()=>{try{return el.uxTextIssues?.()[0]||null;}catch{return null;}};
 const update=()=>{const blocked=busy?null:blockedBy();button.disabled=busy||!!blocked;button.textContent=busy?'Wird vorbereitet …':el.cartEdit?.cartLineId?'Warenkorb aktualisieren':'In den Warenkorb';const text=message||blocked?.message||'';status.textContent=text;status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.style.setProperty('display',text?'block':'none','important');};
 const sync=el.sync;el.sync=function(...args){const result=sync.apply(this,args);update();return result;};
 const fail=error=>{busy=false;message=error.message||'Übertragung fehlgeschlagen. Deine Gestaltung bleibt geöffnet.';update();};
 window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==window.parent||event.data?.session!==bridge.session)return;if(event.data.type==='gravuru-cart-error')fail(Error(event.data.message));});
 button.addEventListener('click',async event=>{
  event.preventDefault();event.stopImmediatePropagation();if(busy)return;
  try{
   if(pending())throw Error('Bitte warten, bis das Bild vollständig geladen ist.');
   if(r.querySelector('dialog[open]:not([data-commerce-review])'))throw Error('Bitte die Bildbearbeitung zuerst abschließen.');
   const missing=el.state.objects.filter(o=>!o.uxHidden&&o.type==='photoSlot'&&o.required&&!files.has(o.uxUploadId));
   if(missing.length)throw Error('Bitte zuerst dein Foto im Bereich „Foto / Logo“ hochladen.');
   const blocked=blockedBy();if(blocked){el.uxRevealTextIssue?.(blocked.id);throw Error(blocked.message);}
   const quantity=Number(r.querySelector('[data-fk-quantity]').value||1),selection=selectCommerceVariant(config,binding,el.state,quantity);
   const design=designFromState(config,el.state);design.objects=design.objects.filter(o=>!o.uxHidden);
   validateDesign(config,design,el.state.mOptions,el.fontData,Object.entries(el.motifs).map(([key,svgFragment])=>({key,svgFragment})));
   busy=true;message='Gestaltung und Bilder werden vorbereitet …';update();
   const fingerprint=JSON.stringify(el.state),{assets}=await exportCommerce({el,config,files,selection,binding});
   if(fingerprint!==JSON.stringify(el.state))throw Error('Die Gestaltung wurde während der Vorbereitung geändert. Bitte erneut in den Warenkorb legen.');
   const properties={Design:el.state.designId,Format:config.profile.geometry.width+' × '+config.profile.geometry.height+' mm',Ausführung:config.profile.optionGroups.filter(g=>selection.options[g.id]!==undefined).map(g=>g.values.find(v=>v.id===selection.options[g.id]).label).join(' · '),'Zusätzliche Motive':String(selection.additionalMotifs),'Kostenpflichtige Bilder':String(selection.chargedUploads),'Einzelpreis':money(selection.unitCents),'_Gravuru Stand':String(binding.revision),'_Gravuru Vorgang':crypto.randomUUID()};
   // K14 / Ü12.1: Zusatzfelder sichtbar (ohne Unterstrich) unter ihrer Bezeichnung; feste Schlüssel bleiben vorrangig.
   for(const entry of optionFieldEntries(config,selection.options))if(!Object.hasOwn(properties,entry.label))properties[entry.label]=entry.display;
   Object.assign(properties,{_gravuru_motifs:String(selection.additionalMotifs),_gravuru_uploads:String(selection.chargedUploads),_gravuru_revision:String(binding.revision)});
   // K8 (Ü9.1): Bearbeiten-Kontext für das Theme (Zeile ersetzen statt neu anlegen); die Konfigurations-Revision vergibt der Server.
   const edit=el.cartEdit?{configId:el.cartEdit.configId,rev:el.cartEdit.rev,cartLineId:el.cartEdit.cartLineId||null}:null;
   window.parent.postMessage({type:'gravuru-cart-submit',session:bridge.session,productId:binding.productId,variantId:selection.variantId,priceCents:selection.unitCents,baseVariantCents:selection.baseVariantCents,quantity,properties,assets,edit},location.origin);
   message='Bilder werden an Shopify übertragen …';update();
  }catch(error){fail(error);}
 },true);
 update();
}

