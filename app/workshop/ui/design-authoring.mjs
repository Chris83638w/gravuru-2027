// Merchant composition changes use the same native objects and mm geometry as
// preview, customer configuration and export. Customer rights are separate.
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {objectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';
const uid=prefix=>prefix+'-'+crypto.randomUUID();
export function fitPosition(object,geometry){
 const a=(object.rotation||0)*Math.PI/180,halfW=(Math.abs(object.w*Math.cos(a))+Math.abs(object.h*Math.sin(a)))/2,halfH=(Math.abs(object.w*Math.sin(a))+Math.abs(object.h*Math.cos(a)))/2,m=geometry.safeMarginMm??2;
 if(halfW*2>geometry.width-2*m+.001||halfH*2>geometry.height-2*m+.001)throw Error('Das Element ist zu groß. Bitte Breite, Höhe oder Schriftgröße verkleinern.');
 object.x=Math.max(m+halfW,Math.min(geometry.width-m-halfW,object.x));object.y=Math.max(m+halfH,Math.min(geometry.height-m-halfH,object.y));
 if(geometry.shape==='ellipse'||geometry.cornerRadiusMm>m){
  const profile={kind:'universal-product',geometry},center={...object,x:geometry.width/2,y:geometry.height/2};
  if(objectIssue(center,profile))throw Error('Das Element ist für diese Kontur zu groß. Bitte verkleinern.');
  if(objectIssue(object,profile)){let low=0,high=1;const x=object.x,y=object.y;for(let i=0;i<55;i++){const v=(low+high)/2,test={...object,x:center.x+(x-center.x)*v,y:center.y+(y-center.y)*v};if(objectIssue(test,profile))high=v;else low=v;}object.x=center.x+(x-center.x)*low;object.y=center.y+(y-center.y)*low;}
 }
 return object;
}
function cleanup(document,design){
 const config=document.config,has=id=>design.objects.some(o=>o.id===id&&o.type==='photoSlot');
 for(const key of ['photoExamples','photoPlaceholders'])if(config.localResources[key])config.localResources[key]=config.localResources[key].filter(e=>e.designId!==design.id||has(e.slotId));
 if(config.photo.hints)config.photo.hints=config.photo.hints.filter(e=>e.designId!==design.id||has(e.slotId));
 if(design.customerFields)design.customerFields=design.customerFields.filter(f=>design.objects.some(o=>o.id===f.id));
 if(design.sourceElements)design.sourceElements=design.sourceElements.filter(f=>design.objects.some(o=>o.id===f.id));
 // The original is immutable in the asset store and older revisions. Removing
 // its artwork deliberately ends the fixed-source composition in this draft.
 if(design.importedSource&&!design.objects.some(o=>o.motif==='artwork-'+design.importedSource.assetId)){
  delete design.importedSource;delete design.customerFields;delete design.preparedTemplate;
 }
}
export function authorDesign(input,designId,action,value={}){
 const document=structuredClone(input),c=document.config,p=c.profile;
 let design=p.designs.find(d=>d.id===designId);if(!design)throw Error('Design nicht gefunden.');
 let object=design.objects.find(o=>o.id===value.objectId),selectedId=object?.id;
 if(['remove','replace','back','front','textify'].includes(action)&&(!object||object.technicalLocked))throw Error('Dieses technische Element kann hier nicht geändert werden.');
 if(action==='new'){
  const name=value.name?.trim();if(!name||name.length>200)throw Error('Bitte einen Designnamen eingeben.');
  design={id:uid('design'),name,objects:[],marks:[]};p.designs.push(design);p.defaultDesignId=design.id;document.elementRights[design.id]={};action='text';
 }
 const rights=document.elementRights[design.id];
 if(['text','photo','motif'].includes(action)){
  if(design.objects.length>=20)throw Error('Ein Design kann höchstens 20 Elemente enthalten.');
  const id=uid('element'),g=p.geometry;
  object={id,type:action==='photo'?'photoSlot':action,x:g.width/2,y:g.height/2,w:Math.min(40,g.width/3),h:Math.min(40,g.height/3),rotation:0,templateOrigin:true,customerEditable:true,color:'#000000'};
  if(action==='text'){
   Object.assign(object,{text:'Dein Text',font:value.font,size:6,bold:false,italic:false,fieldKey:id});
   measureText(object,c.localResources.fonts);
  }
  if(action==='photo'){
   Object.assign(object,{fieldKey:uid('photo'),photoShape:'rect',required:true});delete object.color;c.photo.enabled=true;
   if(value.exampleAssetId)(c.localResources.photoExamples??=[]).push({designId:design.id,slotId:id,assetId:value.exampleAssetId});
   (c.photo.hints??=[]).push({designId:design.id,slotId:id,text:'Hier eigenes Foto hochladen',enabled:true});
  }
  if(action==='motif')setMotif(c,object,value.motif);
  if(p.kind==='layered-doorbell')object.y=g.bell.y/2;
  fitPosition(object,g);design.objects.push(object);
  rights[id]={content:action==='text',color:false,replace:action==='photo',move:false,scale:false,delete:false};selectedId=id;
 }else if(action==='textify'){
  const font=c.localResources.fonts[value.font];
  if(!value.text?.trim()||!font?.regular||[...value.text].some(ch=>!font.regular.glyphs[ch]))throw Error('Bitte den Text prüfen und eine vollständige Schrift mit allen benötigten Zeichen auswählen.');
  const target={w:object.w,h:object.h},replacement={id:object.id,type:'text',text:value.text,font:value.font,size:Math.max(1,Math.min(100,Math.round(object.h))),x:object.x,y:object.y,w:1,h:1,rotation:object.rotation,fieldKey:object.id,color:object.color||'#000000',templateOrigin:true,customerEditable:true,bold:false,italic:false};
  measureText(replacement,c.localResources.fonts);
  while(replacement.size>1&&(replacement.w>target.w||replacement.h>target.h)){replacement.size--;measureText(replacement,c.localResources.fonts);}
  fitPosition(replacement,p.geometry);design.objects[design.objects.indexOf(object)]=replacement;object=replacement;
  rights[object.id]={content:true,color:false,replace:false,move:false,scale:false,delete:false};
 }else if(action==='remove'){
  if(design.objects.length===1)throw Error('Füge zuerst ein Text-, Motiv- oder Fotofeld hinzu, bevor du das letzte Element entfernst.');
  design.objects=design.objects.filter(o=>o!==object);delete rights[object.id];selectedId=design.objects.at(-1).id;cleanup(document,design);
 }else if(action==='replace'){
  if(object.type!=='motif')throw Error('Bitte ein Motiv auswählen.');
  setMotif(c,object,value.motif);fitPosition(object,p.geometry);cleanup(document,design);
 }else if(action==='front'||action==='back'){
  design.objects=design.objects.filter(o=>o!==object);design.objects[action==='front'?'push':'unshift'](object);
 }else throw Error('Unbekannte Gestaltungsaktion.');
 const issue=object&&action!=='remove'?objectIssue(object,p):'';if(issue)throw Error(issue);
 return {document,designId:design.id,objectId:selectedId};
}
function setMotif(config,object,motif){
 if(!motif||!Array.isArray(motif.bounds)||motif.bounds.length!==4||!motif.bounds.every(Number.isFinite)||motif.bounds[2]<=0||motif.bounds[3]<=0)throw Error('Die Motivquelle fehlt oder hat ungültige Maße.');
 if(!config.localResources.motifs.some(m=>m.key===motif.key))config.localResources.motifs.push(structuredClone(motif));
 const maxW=object.w,maxH=object.h,scale=Math.min(maxW/motif.bounds[2],maxH/motif.bounds[3]);
 Object.assign(object,{motif:motif.key,w:motif.bounds[2]*scale,h:motif.bounds[3]*scale,preserveColors:true,templateOrigin:true});
}
