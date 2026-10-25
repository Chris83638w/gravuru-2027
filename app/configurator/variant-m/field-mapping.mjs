const fieldKey = object => typeof object.fieldKey==='string' && object.fieldKey.trim() ? object.fieldKey : null;

// A fieldKey names a semantic customer field, not its position in the template.
// Returning unresolved items allows callers to request a new assignment. Never
// infer that the first empty slot means the same thing as the previous photo.
export function mapPersonalObjects(previous,next) {
  const objects=structuredClone(next),unmappedUploads=[];
  const templateSources=previous.filter(o=>o.type==='photoSlot'&&!o.uxPersonal);
  for(const source of templateSources.filter(o=>o.uxUploadId)){
    const key=fieldKey(source);
    const sources=templateSources.filter(o=>fieldKey(o)===key);
    const targets=objects.filter(o=>o.type==='photoSlot'&&!o.uxPersonal&&fieldKey(o)===key);
    const target=key&&sources.length===1&&targets.length===1?targets[0]:null;
    const reason=!key?'missing-field-key':sources.length>1||targets.length>1?'ambiguous-field-key':!target?'unmatched-field-key':target.customerEditable===false||target.technicalLocked===true?'read-only-field':target.uxUploadId&&target.uxUploadId!==source.uxUploadId?'occupied-field':null;
    if(reason){unmappedUploads.push({objectId:source.id,fieldKey:key,uploadId:source.uxUploadId,reason});continue;}
    Object.assign(target,{uxUploadId:source.uxUploadId,uxUploadKind:'photo',uxHidden:!!source.uxHidden});
    if(['original','grayscale','sepia'].includes(source.uxPhotoColor))target.uxPhotoColor=source.uxPhotoColor;
    if(source.uxPhotoCrop)target.uxPhotoCrop=structuredClone(source.uxPhotoCrop);
    if(['keep','remove'].includes(source.uxPhotoBackground))target.uxPhotoBackground=source.uxPhotoBackground;
  }
  // Only explicitly free customer elements travel independently of template
  // slots. A nonmatching template photograph must not become a floating image.
  for(const source of previous.filter(o=>o.uxPersonal||(o.uxUploadId&&o.type!=='photoSlot'))){
    if(objects.some(o=>o.id===source.id))continue;
    const copy=structuredClone(source);
    if(copy.type==='photoSlot'&&objects.some(o=>fieldKey(o)===fieldKey(copy))){
      let suffix=0;
      do{copy.fieldKey='photo-'+copy.id+(suffix?'-'+suffix:'');suffix++;}while(objects.some(o=>fieldKey(o)===copy.fieldKey));
    }
    objects.push(copy);
  }
  return {objects,unmappedUploads};
}

export const carryPersonalObjects=(previous,next)=>mapPersonalObjects(previous,next).objects;
