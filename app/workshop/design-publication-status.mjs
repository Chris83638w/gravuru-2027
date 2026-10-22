// Read-only facts: a local release or a variant binding is not evidence of Shopify publication.
export function designPublicationStatus({record,head,designId,bindings=[],transfers=[],verifiedShopify=null}){
 const links=bindings.filter(b=>b.productId===record.id),savedTransfers=transfers.filter(t=>t.productId===record.id),linked=links.length>0||savedTransfers.length>0;
 const confirmed=verifiedShopify?.liveVerified===true&&verifiedShopify.productId===record.id&&verifiedShopify.designId===designId;
 const online=confirmed?verifiedShopify.online:null,trafficLight=!linked?{color:'red',label:'Noch nicht bei Shopify veröffentlicht'}:!confirmed?{color:null,label:'Shopify-Status noch nicht bestätigt'}:!online?{color:'red',label:'Noch nicht bei Shopify veröffentlicht'}:verifiedShopify.matchesCurrentDesign?{color:'green',label:'Aktueller Stand bei Shopify veröffentlicht'}:{color:'blue',label:'Änderungen vorhanden · Update bereit'};
 return {trafficLight,productId:record.id,designId,editedProductRevision:record.revision,currentProductRevision:head.revision,workshopReleasedRevision:head.publishedRevision??null,shopify:{linked,online,liveVerified:confirmed,boundRevisions:[...new Set(links.map(b=>b.productRevision))],lastRecordedStatus:savedTransfers[0]?.status??null,label:linked?'Mit Shopify verknüpft · Online-Status nicht live geprüft':'Nicht mit Shopify verknüpft'},saveEffect:'local-correction-only',automaticShopifyUpdate:false,canPublish:false,publishReason:linked?'Dieser Korrektureditor überträgt keine Änderungen zu Shopify. Eine Veröffentlichung benötigt einen gesonderten, geprüften Übernahmeschritt.':'Für diese Ausführung ist keine Shopify-Verknüpfung hinterlegt.',templateEffect:'Die Designvorlage bleibt beim Speichern unverändert.'};
}

// A stored release hash confirms transfer, not public configurator acceptance.
export function acrylDesignTrafficLight(live,designId){
 if(live.error||!live.verified)return {color:null,label:'Shopify-Status derzeit nicht prüfbar'};
 if(!live.product)return {color:'red',label:'Noch nicht bei Shopify veröffentlicht'};
 const current=live.designHashes?.[designId],remote=live.product.release?.designs?.[designId];
 if(current&&current!==remote)return {color:'blue',label:'Designänderungen vorhanden · Shopify-Übernahme ausstehend'};
 if(live.product.status==='ACTIVE'&&live.product.onlineStoreUrl)return {color:null,label:'Artikel online · Designanbindung noch nicht bestätigt'};
 return {color:'red',label:'Shopify-Entwurf vorhanden · noch nicht veröffentlicht'};
}
