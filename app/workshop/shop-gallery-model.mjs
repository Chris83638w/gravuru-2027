// Only fixed, already validated product documents reach this projection via the
// active-binding registry. Keep the shared quote/geometry inputs, never load
// material images, font outlines, motif artwork or customer drafts for cards.
export function galleryProductLine(record){
 const document=record.document,doorbell=document?.config?.doorbell;
 // A doorbell model owns its three entry formats; other models stay separate.
 if(doorbell){
  if(doorbell.schema==='gravuru-doorbell/v1'&&typeof doorbell.modelKey==='string'&&doorbell.modelKey.trim())return JSON.stringify(['doorbell',doorbell.modelKey]);
  return JSON.stringify(['product',record.id]);
 }
 const lines=[...new Set((Array.isArray(document?.categoryIds)?document.categoryIds:[]).filter(id=>typeof id==='string'&&id.startsWith('linie-')))];
 return JSON.stringify(lines.length===1&&/^linie-[a-z0-9._:-]+$/.test(lines[0])?['line',lines[0]]:['product',record.id]);
}

export function shopGalleryModel(record){
 const document=record.document,config=document?.config;
 if(document?.schema!=='gravuru-product/v1'||!config?.profile)throw Object.assign(Error('Dieses Produkt ist nicht für die Designauswahl verfügbar.'),{status:404,code:'shop_gallery_product'});
 const {materialSurface,sceneBackground,localResources,...universal}=config;
 universal.localResources={motifs:(localResources?.motifs||[]).map(({key,embeddedOnly})=>({key,embeddedOnly}))};
 return {key:'acryl',name:document.name,configuration:{id:record.id,revision:record.revision},galleryProductLine:galleryProductLine(record),universal};
}
