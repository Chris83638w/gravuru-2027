import {ACRYLIC_SAFE_AREA} from '../configurator/variant-m/acrylic-product.mjs';
import {validateProductDocument} from './product-model.mjs';
import {sha256} from './design-assets.mjs';
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};

export function replaceDesignArtwork(input,assets,{designId,assetId,fit='visible',originalName}){
  if(!['visible','original'].includes(fit))fail(422,'invalid_fit','Bitte eine gültige Platzierung auswählen.');
  const document=structuredClone(input),config=document.config,design=config.profile.designs.find(d=>d.id===designId);
  if(!design)fail(422,'design_missing','Dieses Design gehört nicht zur Konfiguration.');
  if(typeof originalName!=='string'||originalName.length>200||/[\x00-\x1f\\/]/.test(originalName))fail(422,'invalid_name','Ungültiger Dateiname.');
  const asset=assets.get(assetId),area=ACRYLIC_SAFE_AREA;
  const availableWidth=area.right-area.left,availableHeight=area.bottom-area.top;
  const scale=fit==='original'?1:Math.min(availableWidth/asset.widthMm,availableHeight/asset.heightMm);
  const w=asset.widthMm*scale,h=asset.heightMm*scale;
  if(w>availableWidth+.001||h>availableHeight+.001)fail(422,'original_does_not_fit','Das Originalmaß passt nicht vollständig in die sichtbare Fläche. Wähle „Proportional einpassen“.');
  const object={id:'imported-artwork',type:'motif',motif:'artwork-'+assetId,x:(area.left+area.right)/2,y:(area.top+area.bottom)/2,w,h,rotation:0,color:'#000000',preserveColors:true,templateOrigin:true,customerEditable:false,locked:true,acrylicFixed:true};
  design.objects=[object];design.marks=[];delete design.customerFields;
  design.importedSource={assetId,originalName,fit,scale};
  document.elementRights[designId]={[object.id]:{content:false,color:false,replace:false,move:false,scale:false,delete:false}};
  if(config.localResources.photoPlaceholders)config.localResources.photoPlaceholders=config.localResources.photoPlaceholders.filter(a=>a.designId!==designId);
  const used=new Set(config.profile.designs.flatMap(d=>d.objects.filter(o=>o.type==='motif').map(o=>o.motif)));
  config.localResources.motifs=config.localResources.motifs.filter(m=>!m.artwork||used.has(m.key)).map(m=>m.artwork?assets.resource(m.artwork.assetId):m);
  if(!config.localResources.motifs.some(m=>m.key===object.motif))config.localResources.motifs.push(assets.resource(assetId));
  const checked=validateProductDocument(document);assets.validateDocument(checked);
  return {document:checked,asset,designId,designName:design.name,originalName,fit,placement:{x:object.x,y:object.y,widthMm:w,heightMm:h,scale},warnings:[...asset.warnings,'Die importierte Datei ist ein festes Design. Texte und Fotos darin sind noch keine einzeln bearbeitbaren Kundenfelder.'],editableFields:0};
}

export function planDesignImport(repository,assets,id,{expectedRevision,designId,assetId,fit='visible',originalName}){
  const record=repository.get(id);
  if(record.revision!==expectedRevision)fail(409,'stale_revision','Die Konfiguration wurde geändert. Bitte den aktuellen Stand laden.');
  if(record.status==='archived')fail(422,'archived_product','Bitte die Konfiguration zuerst wieder aktivieren.');
  const plan=replaceDesignArtwork(record.document,assets,{designId,assetId,fit,originalName});
  const token=sha256(JSON.stringify({id,expectedRevision,designId,assetId,fit,originalName,document:plan.document}));
  return {...plan,token,expectedRevision};
}

export function applyDesignImport(repository,assets,id,input){
  const plan=planDesignImport(repository,assets,id,input);
  if(plan.token!==input.token)fail(409,'review_changed','Die Importvorschau hat sich geändert. Bitte die Datei erneut prüfen.');
  return repository.save(id,plan.document,input.expectedRevision);
}
