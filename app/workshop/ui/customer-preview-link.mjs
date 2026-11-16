export function customerPreviewLink(id,revision,{formEditor=false,designId}={}){
 const merchant=globalThis.document?.querySelector('meta[name=gravuru-merchant-auth]')?.content==='required';
 const query=new URLSearchParams({configuration:id,revision});
 if(typeof designId==='string'&&designId)query.set('design',designId);
 if(merchant&&globalThis.location?.href){const context=new URL(globalThis.location.href).searchParams;for(const key of ['shop','host','embedded'])if(context.has(key))query.set(key,context.get(key));}
 return {href:(formEditor?'/werkstatt/formprodukt/':merchant?'/werkstatt/kundenansicht/':'/')+'?'+query,target:merchant?'_self':'_blank'};
}
