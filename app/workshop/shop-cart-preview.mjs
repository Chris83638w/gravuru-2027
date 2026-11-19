// The cart already has the revision-bound preview saved with the draft.
// Checkout needs a READY Shopify MediaImage. The file is started when the
// draft is saved. cart/data overlaps the remaining wait with the price check
// and only answers a hosted client once that file is ready.
const pending=()=>Object.assign(Error('Die Gestaltungsvorschau wird noch für den Warenkorb vorbereitet. Bitte erneut versuchen.'),{status:503,code:'checkout_image_pending'});

export async function attachRevisionPreview({checkoutImage,source,payload,waitMs=0}){
 const secured=typeof payload?.preview?.base64==='string'&&payload.preview.base64.length>0||typeof payload?.properties?._gravuru_bild==='string';
 if(typeof checkoutImage!=='function'){if(secured){payload.properties._gravuru_vorschau_status='persoenlich_gesichert';return {hosted:null,status:'persoenlich_gesichert'};}throw pending();}
 const settled=Promise.resolve().then(()=>checkoutImage(source)).then(url=>({url}),err=>({err}));
 const outcome=await Promise.race([settled,new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),waitMs))]);
 if(outcome.timeout)settled.catch(()=>{});
 if(outcome.url){payload.properties._gravuru_checkout_image=outcome.url;return {hosted:outcome.url,status:'shopify_bereit'};}
 // A hosted client must not receive the PNG. The device would upload it, and
 // that upload is not a checkout image. The background file keeps running.
 if(waitMs>0)return {hosted:null,status:'checkout_image_pending',pending:true};
 if(secured){payload.properties._gravuru_vorschau_status='persoenlich_gesichert';return {hosted:null,status:'persoenlich_gesichert'};}
 if(outcome.err)throw outcome.err;
 throw pending();
}
