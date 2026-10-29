// Only fixed, already validated product documents reach this projection via the
// active-binding registry. Keep the shared quote/geometry inputs, never load
// material images, font outlines, motif artwork or customer drafts for cards.
export function shopGalleryModel(record){
 const document=record.document,config=document?.config;
 if(document?.schema!=='gravuru-product/v1'||!config?.profile)throw Object.assign(Error('Dieses Produkt ist nicht für die Designauswahl verfügbar.'),{status:404,code:'shop_gallery_product'});
 const {materialSurface,sceneBackground,localResources,...universal}=config;
 universal.localResources={motifs:(localResources?.motifs||[]).map(({key,embeddedOnly})=>({key,embeddedOnly}))};
 return {key:'acryl',name:document.name,configuration:{id:record.id,revision:record.revision},galleryCategoryIds:[...(document.categoryIds||[])],universal};
}
