// The model already names these previews. Carrying the small SVG bytes with the
// model removes one private round trip per graphic. The allow-list is unchanged.
export function inlineDesignPreviews(universal,allowed,read){
 if(!universal?.localResources||typeof read!=='function'||!(allowed instanceof Set))return {};
 const hashes=[...new Set([...JSON.stringify(universal).matchAll(/\/api\/workshop\/design-assets\/([a-f0-9]{64})\/preview\.svg/g)].map(match=>match[1]))];
 const inline={};let total=0;
 for(const hash of hashes){
  if(!allowed.has(hash))continue;
  let bytes;try{bytes=read(hash);}catch{continue;}
  if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>8192||total+bytes.length>65536)continue;
  inline[hash]='data:image/svg+xml;base64,'+bytes.toString('base64');
  total+=bytes.length;
 }
 if(Object.keys(inline).length)universal.localResources.inlinePreviews=inline;
 return inline;
}
