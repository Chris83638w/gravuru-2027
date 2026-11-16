// Display only: never changes prices, quantities, releases or order bindings.
// Shopify requires a READY MediaImage, not the Ajax cart's /uploads/ PNG.
// The server registers the immutable preview before supplying this attribute.
export function checkoutDesignImage(line){
 if(!/^konfig_[a-f0-9-]{36}$/.test(line.configuration?.value||'')||!/^[1-9][0-9]*$/.test(line.configRevision?.value||'')||!/^[a-f0-9]{64}$/.test(line.offer?.value||''))return null;
 const url=line.checkoutImage?.value;
 if(typeof url!=='string'||url.length>2048||!/^https:\/\/cdn\.shopify\.com\/s\/files\/1\/0920\/5550\/3228\/files\/gravuru-gestaltung-[a-f0-9]{64}\.png(?:\?v=[0-9]+)?$/.test(url))return null;
 return {url};
}
export function withCheckoutDesignImages(input,result){
 const operations=result.operations.map(o=>o.lineUpdate?{...o,lineUpdate:{...o.lineUpdate}}:o);
 for(const line of input.cart.lines){
  const image=checkoutDesignImage(line);if(!image)continue;
  const existing=operations.find(o=>o.lineUpdate?.cartLineId===line.id);
  if(existing)existing.lineUpdate.image=image;
  else if(!operations.some(o=>o.lineExpand?.cartLineId===line.id||o.linesMerge?.cartLines?.some(x=>x.cartLineId===line.id)))operations.push({lineUpdate:{cartLineId:line.id,image}});
 }
 return {...result,operations};
}
