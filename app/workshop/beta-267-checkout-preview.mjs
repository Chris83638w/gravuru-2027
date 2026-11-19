// Beta #267, Team B. The customer cart must not wait for Shopify fileCreate
// when a secured personal preview already exists. The default shop entry keeps
// the previous blocking wait unless checkoutPreviewFirst is set.
const pending=()=>Object.assign(Error('Die Gestaltungsvorschau wird noch für den Warenkorb vorbereitet. Bitte erneut versuchen.'),{status:502,code:'checkout_image_pending'});

export async function resolveCheckoutPreview({checkoutImage,source,hasSecuredPreview,previewFirst,budgetMs=0}){
 if(typeof checkoutImage!=='function')throw pending();
 const settled=Promise.resolve().then(()=>checkoutImage(source)).then(url=>({url}),err=>({err}));
 if(!previewFirst){
  const outcome=await settled;
  if(outcome.err)throw outcome.err;
  return {hosted:outcome.url,status:'shopify_bereit'};
 }
 const outcome=await Promise.race([settled,new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),budgetMs))]);
 if(outcome.url)return {hosted:outcome.url,status:'shopify_bereit'};
 if(outcome.timeout)settled.catch(()=>{});
 if(!outcome.timeout&&outcome.err&&outcome.err.code!=='checkout_image_pending')throw outcome.err;
 if(hasSecuredPreview)return {hosted:null,status:'persoenlich_gesichert'};
 if(outcome.err)throw outcome.err;
 throw pending();
}

export async function attachCheckoutPreview({checkoutImage,source,payload,previewFirst,budgetMs=0}){
 const hasSecuredPreview=typeof payload?.preview?.base64==='string'&&payload.preview.base64.length>0;
 const resolved=await resolveCheckoutPreview({checkoutImage,source,hasSecuredPreview,previewFirst,budgetMs});
 if(resolved.hosted)payload.properties._gravuru_checkout_image=resolved.hosted;
 else payload.properties._gravuru_vorschau_status='persoenlich_gesichert';
 return resolved;
}
