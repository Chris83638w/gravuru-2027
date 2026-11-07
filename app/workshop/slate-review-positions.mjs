import {surfaceObjectIssue} from '../platform/sources/app/shared/models/design-content.mjs';
import {setTextSize,measureText} from '../platform/sources/app/shared/models/text-paths.mjs';
import {validatedDesignReviewTargets,designReviewMaterialMatches} from '../../scripts/lib/design-review-targets.mjs';

const fail=(status,code,message,extra={})=>{throw Object.assign(Error(message),{status,code,...extra});};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const exact=(value,keys)=>plain(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
// Operator editing has the same rights as the full workshop. Customer locks
// and elementRights.move are preserved, not reinterpreted as operator locks.
const movable=object=>['text','motif','photoSlot','graphic'].includes(object.type)&&object.technicalLocked!==true&&object.role!=='guide'&&Number.isFinite(object.x)&&Number.isFinite(object.y);
const resizable=object=>movable(object)&&[object.w,object.h].every(value=>Number.isFinite(value)&&value>0)&&(object.type!=='text'||Number.isFinite(object.size)&&object.size>0);

// Native repository/renderer/placement rules. Only x/y and proportional size of prepared targets are
// mutable; no full document, text, resource, price or comment comes from the UI.
export function createSlateReviewPositions({workshop,pack,imported}){
  if(!workshop?.repository||typeof workshop.editorPreview!=='function'||workshop.sessionContext)throw Error('Private native workshop required');
  const allowed=new Map();
  for(const target of validatedDesignReviewTargets(pack,imported)){
    if(!allowed.has(target.productId))allowed.set(target.productId,new Map());
    allowed.get(target.productId).set(target.designId,target);
  }
  const select=(productId,designId)=>{
    const target=allowed.get(productId)?.get(designId);
    if(!target)fail(404,'review_target_missing','Diese vorbereitete Vorlage gehört nicht zu diesem Format.');
    const {mm,material}=target;
    const record=workshop.repository.get(productId),document=record.document,profile=document.config?.profile,design=profile?.designs?.find(row=>row.id===designId);
    if(!design||!designReviewMaterialMatches(profile.material,material)||document.config.reviewOnly!==true||Math.abs(profile.geometry.width-mm[0])>1e-6||Math.abs(profile.geometry.height-mm[1])>1e-6||material.key!=='slate'&&design.katalog?.designId!==target.originalId||target.familyId&&design.katalog?.target?.familyId!==target.familyId)fail(409,'review_target_changed','Die Vorlage oder ihr Format wurde geändert. Bitte die Übersicht neu laden.');
    return {record,design};
  };
  const response=(record,designId,rendered)=>{
    const profile=record.document.config.profile,design=profile.designs.find(row=>row.id===designId);
    return {productId:record.id,designId,revision:record.revision,
      geometry:{width:profile.geometry.width,height:profile.geometry.height},
      objects:design.objects.map(object=>({id:object.id,type:object.type,x:object.x,y:object.y,w:object.w,h:object.h,size:object.type==='text'?object.size:undefined,rotation:object.rotation||0,
        movable:record.status!=='archived'&&movable(object),resizable:record.status!=='archived'&&resizable(object),label:object.type==='text'?String(object.text||'Text').slice(0,160):object.type==='photoSlot'?'Foto':object.type==='motif'?'Motiv':object.id})),
      svg:rendered.svg,previewUrl:'/api/workshop/products/'+encodeURIComponent(record.id)+'/preview.svg?'+new URLSearchParams({designId,revision:String(record.revision)})};
  };
  return {
    open(productId,designId){const {record}=select(productId,designId);return response(record,designId,workshop.editorPreview(record.document,designId));},
    save(input){
      if(!exact(input,['productId','designId','expectedRevision','positions'])||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1||!Array.isArray(input.positions)||input.positions.length>200)fail(422,'review_positions_invalid','Bitte nur Positionen, Größenfaktoren und den geladenen Stand senden.');
      const {record}=select(input.productId,input.designId);
      if(record.revision!==input.expectedRevision)fail(409,'stale_revision','Eine Vorlage dieser Gruppe wurde inzwischen gespeichert. Deine Änderungen bleiben erhalten. Bitte den aktuellen Stand neu laden.',{actualRevision:record.revision});
      if(record.status==='archived')fail(409,'archived_product','Diese Vorlage wurde archiviert. Bitte die Übersicht neu laden.');
      const document=structuredClone(record.document),profile=document.config.profile,design=profile.designs.find(row=>row.id===input.designId),seen=new Set();let changed=false;
      for(const position of input.positions){
        if(!(exact(position,['objectId','x','y'])||exact(position,['objectId','x','y','scale']))||typeof position.objectId!=='string'||seen.has(position.objectId)||!Number.isFinite(position.x)||!Number.isFinite(position.y)||Object.hasOwn(position,'scale')&&(!Number.isFinite(position.scale)||position.scale<=0))fail(422,'review_position_invalid','Jedes Element benötigt eine eindeutige Position in Millimetern und gegebenenfalls einen positiven Größenfaktor.');
        seen.add(position.objectId);
        const object=design.objects.find(row=>row.id===position.objectId);
        if(!object||!movable(object))fail(422,'review_object_fixed','Dieses Element gehört nicht zur Vorlage oder ist technisch geschützt.');
        const scale=position.scale??1;
        if(scale!==1&&!resizable(object))fail(422,'review_size_invalid','Die Größe dieses Elements kann hier nicht geändert werden.');
        if(object.x===position.x&&object.y===position.y&&scale===1)continue;
        const next={...object,x:position.x,y:position.y};
        if(scale!==1){
          if(next.type==='text'){
            // The shared native helper also scales explicit line spacing. Scale
            // tracking too, so letter/line proportions and the text anchor stay intact.
            setTextSize(next,object.size*scale);
            if(next.letterSpacing!==undefined)next.letterSpacing*=scale;
            try{measureText(next,document.config.localResources.fonts);}catch(error){fail(422,'review_size_invalid',error.message);}
          }else{
            next.w=object.w*scale;next.h=object.h*scale;
            // Match graphicMarkup's effective stroke, including its 0.5 mm
            // fallback, so a saved outline matches the uniformly scaled SVG.
            if(next.type==='graphic')next.strokeWidth=(object.strokeWidth||.5)*scale;
          }
        }
        const issue=surfaceObjectIssue(next,profile,document.config.localResources);
        if(issue)fail(422,'review_position_outside',issue);
        Object.assign(object,next);changed=true;
      }
      // Preview/normal validation precede commit. The native repository applies
      // its transactional CAS again at the actual save, including other designs
      // sharing this product group. Stale requests never overwrite a head.
      const rendered=workshop.editorPreview(document,input.designId);
      const saved=changed?workshop.repository.save(record.id,document,input.expectedRevision):record;
      return response(saved,input.designId,rendered);
    },
  };
}
