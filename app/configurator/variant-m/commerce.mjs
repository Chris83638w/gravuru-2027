import {validateCommerce,selectCommerceVariant} from './commerce-model.mjs';
import {designFromState,validateDesign,money} from './contract.mjs';
import {exportCommerce} from './commerce-export.mjs';

export function installCommerce({el,config,files,pending}){
 const bridge=window.parent.GravuruCommerce;if(!bridge)return;
 const binding=validateCommerce(config,bridge.binding),r=el.shadowRoot,button=r.querySelector('.fk-buy-button'),status=r.querySelector('.fk-order-status');
 let busy=false,message='';
 const update=()=>{button.disabled=busy;button.textContent=busy?'Wird vorbereitet …':'In den Warenkorb';status.textContent=message;status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.style.setProperty('display',message?'block':'none','important');};
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
   const quantity=Number(r.querySelector('[data-fk-quantity]').value||1),selection=selectCommerceVariant(config,binding,el.state,quantity);
   const design=designFromState(config,el.state);design.objects=design.objects.filter(o=>!o.uxHidden);
   validateDesign(config,design,el.state.mOptions,el.fontData,Object.entries(el.motifs).map(([key,svgFragment])=>({key,svgFragment})));
   busy=true;message='Gestaltung und Bilder werden vorbereitet …';update();
   const fingerprint=JSON.stringify(el.state),{assets}=await exportCommerce({el,config,files,selection,binding});
   if(fingerprint!==JSON.stringify(el.state))throw Error('Die Gestaltung wurde während der Vorbereitung geändert. Bitte erneut in den Warenkorb legen.');
   const properties={Design:el.state.designId,Format:config.profile.geometry.width+' × '+config.profile.geometry.height+' mm',Ausführung:config.profile.optionGroups.map(g=>g.values.find(v=>v.id===selection.options[g.id]).label).join(' · '),'Zusätzliche Motive':String(selection.additionalMotifs),'Kostenpflichtige Bilder':String(selection.chargedUploads),'Einzelpreis':money(selection.unitCents),'_Gravuru Stand':String(binding.revision),'_Gravuru Vorgang':crypto.randomUUID()};
   Object.assign(properties,{_gravuru_motifs:String(selection.additionalMotifs),_gravuru_uploads:String(selection.chargedUploads),_gravuru_revision:String(binding.revision)});
   window.parent.postMessage({type:'gravuru-cart-submit',session:bridge.session,productId:binding.productId,variantId:selection.variantId,priceCents:selection.unitCents,baseVariantCents:selection.baseVariantCents,quantity,properties,assets},location.origin);
   message='Bilder werden an Shopify übertragen …';update();
  }catch(error){fail(error);}
 },true);
 update();
}

