export const ELEMENT_RIGHT_FIELDS=Object.freeze({
  content:['text','font','bold'], color:['color','preserveColors','opacity'],
  replace:['motif','uxUploadId','uxUploadKind','uxPhotoBackground','uxPhotoCrop'],
  move:['x','y','rotation'], scale:['w','h','size'],
});
const structural=['letterSpacing','type','fieldKey','photoShape','shape','filled','strokeWidth','assetId','required','templateOrigin','customerEditable','locked','technicalLocked','acrylicFixed'];
export const rightForProperty=key=>Object.entries(ELEMENT_RIGHT_FIELDS).find(([,fields])=>fields.includes(key))?.[0];

export function canEditElement(config,designId,object,right){
  if(!object)return false;
  if(!config?.workshopElementRights||config?.workbench?.embedded)return true;
  const source=config.profile.designs.find(d=>d.id===designId)?.objects.find(o=>o.id===object.id);
  if(!source)return !object.technicalLocked&&!object.locked;
  return config.workshopElementRights[designId]?.[source.id]?.[right]===true;
}

// Mirrors the persisted document's six independent rights. It does not validate
// price/media, grant new-object capabilities, or replace server validation.
// Previous accepted objects preserve allowed edits when a forbidden deletion is undone.
export function restoreElementRights(source,objects,rights,previous=[]){
  const result=objects.map(object=>structuredClone(object)),blocked=new Set();
  const restore=(object,original,key)=>{if(object[key]===original[key])return;blocked.add(original.id);if(Object.hasOwn(original,key))object[key]=structuredClone(original[key]);else delete object[key];};
  for(const original of source){
    const permission=rights[original.id]??{};
    let index=result.findIndex(object=>object.id===original.id),object=result[index];
    for(let i=result.length-1;i>index&&index>=0;i--)if(result[i].id===original.id){result.splice(i,1);blocked.add(original.id);}
    if(!object&&!permission.delete){
      object=structuredClone(previous.find(item=>item.id===original.id)??original);
      index=Math.min(source.indexOf(original),result.length);result.splice(index,0,object);blocked.add(original.id);
    }
    if(!object)continue;
    for(const key of structural)restore(object,original,key);
    for(const [right,fields] of Object.entries(ELEMENT_RIGHT_FIELDS))if(!permission[right]){
      for(const key of fields){
        // Text width/height follow its permitted content; point size does not.
        if(right==='scale'&&original.type==='text'&&permission.content&&['w','h'].includes(key))continue;
        restore(object,original,key);
      }
    }
    if(!permission.delete){
      if(object.uxHidden===true&&original.uxHidden!==true)restore(object,original,'uxHidden');
      if(object.opacity===0&&original.opacity!==0){
        const prior=previous.find(item=>item.id===original.id);
        restore(object,{...original,opacity:prior?.opacity>0?prior.opacity:original.opacity},'opacity');
      }
    }
  }
  return {objects:result,blockedIds:[...blocked]};
}
