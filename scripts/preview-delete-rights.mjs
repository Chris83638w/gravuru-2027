// Explicitly authorized by Mikail, 2026-11-05, for the two 43-design dog
// previews. This pure migration is not an automatic change to saved products.
export function approvePreviewDeletion(config){
 let changed=0;
 for(const design of config.profile.designs)for(const o of design.objects){
  if(!['text','motif','photoSlot'].includes(o.type)||o.technicalLocked||o.locked||o.acrylicFixed||o.role==='guide')continue;
  const rights=config.workshopElementRights?.[design.id]?.[o.id];
  if(rights&&rights.delete!==true){rights.delete=true;changed++;}
 }
 return changed;
}
export function previewHtmlDeletion(html){
 const marker='window.UniversalConfig=',start=html.indexOf(marker)+marker.length,end=html.indexOf(';window.',start);
 if(start<marker.length||end<start)throw Error('Preview config marker missing');
 const cfg=JSON.parse(html.slice(start,end));approvePreviewDeletion(cfg);
 return html.slice(0,start)+JSON.stringify(cfg).replaceAll('<','\\u003c')+html.slice(end);
}
