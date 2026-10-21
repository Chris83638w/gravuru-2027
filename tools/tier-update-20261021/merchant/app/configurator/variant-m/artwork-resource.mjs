// Imported designs are passive, immutable SVG images served by the workbench.
// Never interpolate a uploaded SVG fragment into the customer's live DOM.
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function artworkFragment(assetId,width=1,height=1){
  if(!hash(assetId))throw Error('Ungültige Designressource.');
  if(![width,height].every(v=>Number.isFinite(v)&&v>0&&v<=2000))throw Error('Ungültige Designabmessungen.');
  return `<image href="/api/workshop/design-assets/${assetId}/preview.svg" width="${width}" height="${height}" preserveAspectRatio="none"/>`;
}
export function isArtworkResource(item){
  const a=item?.artwork;
  return !!a&&a.schema==='gravuru-imported-artwork/v1'&&hash(a.assetId)&&hash(a.sourceSha256)&&hash(a.previewSha256)&&
    ['svg','pdf'].includes(a.format)&&Number.isInteger(a.page)&&a.page>=1&&Number.isInteger(a.pageCount)&&a.pageCount>=a.page&&
    [a.widthMm,a.heightMm].every(v=>Number.isFinite(v)&&v>0&&v<=2000)&&
    item.key==='artwork-'+a.assetId&&item.embeddedOnly===true&&(
      JSON.stringify(item.bounds)===JSON.stringify([0,0,a.widthMm,a.heightMm])&&item.svgFragment===artworkFragment(a.assetId,a.widthMm,a.heightMm)||
      // Early local import revisions used a unit-square envelope; the server
      // resolves those from the immutable source dimensions before rendering.
      JSON.stringify(item.bounds)==='[0,0,1,1]'&&item.svgFragment===artworkFragment(a.assetId));
}
