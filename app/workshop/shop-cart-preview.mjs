// The cart already has the revision-bound preview saved with the draft.
// Shopify's file creation may still be polling; that wait must not hold the response.
const pending=()=>Object.assign(Error('Die Gestaltungsvorschau wird noch für den Warenkorb vorbereitet. Bitte erneut versuchen.'),{status:502,code:'checkout_image_pending'});

export async function attachRevisionPreview({checkoutImage,source,payload}){
 const secured=typeof payload?.preview?.base64==='string'&&payload.preview.base64.length>0||typeof payload?.properties?._gravuru_bild==='string';
 if(typeof checkoutImage!=='function'){if(secured){payload.properties._gravuru_vorschau_status='persoenlich_gesichert';return {hosted:null,status:'persoenlich_gesichert'};}throw pending();}
 const settled=Promise.resolve().then(()=>checkoutImage(source)).then(url=>({url}),err=>({err}));
 const outcome=await Promise.race([settled,new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),0))]);
 if(outcome.timeout)settled.catch(()=>{});
 if(outcome.url){payload.properties._gravuru_checkout_image=outcome.url;return {hosted:outcome.url,status:'shopify_bereit'};}
 if(secured){payload.properties._gravuru_vorschau_status='persoenlich_gesichert';return {hosted:null,status:'persoenlich_gesichert'};}
 if(outcome.err)throw outcome.err;
 throw pending();
}
