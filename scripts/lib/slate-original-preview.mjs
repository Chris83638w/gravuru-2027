import {productPreview} from '../../app/workshop/product-preview.mjs';
// Offline comparison: embed native immutable photo masks as well as examples.
// Interactive upload hints stay in the real editor, not in the artwork sheet.
export function originalPreview(config,designId,assets){
 const examples=(config.localResources.photoExamples||[]).filter(e=>e.designId===designId).map(e=>({...e,url:'data:image/svg+xml;base64,'+assets.read(e.assetId).toString('base64')}));
 const previewConfig={...config,photo:{...config.photo,hints:examples.map(e=>({designId,slotId:e.slotId,enabled:false}))}};
 return productPreview({universal:previewConfig},{designId,examples,keepout:false,mountingPlacement:false}).replace(/href="\/api\/workshop\/design-assets\/([a-f0-9]{64})\/preview\.svg"/g,(_,id)=>'href="data:image/svg+xml;base64,'+assets.read(id).toString('base64')+'"');
}
