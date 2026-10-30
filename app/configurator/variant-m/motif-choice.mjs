// Explicit add mode is the only way to append beside an existing motif.
export function motifChoiceTarget(objects,selectedId,templateObjects=[]){
 const motifs=objects.filter(o=>o.type==='motif'&&!o.uxHidden&&!o.uxDecoration&&o.role!=='guide'&&!o.uxUploadId);
 return motifs.find(o=>o.id===selectedId)||motifs.find(o=>templateObjects.some(t=>t.id===o.id))||motifs[0]||null;
}
export function replacedMotif(object,key,bounds){
 if(!bounds||bounds.length!==4||!(bounds[2]>0&&bounds[3]>0))throw Error('Die Motivgeometrie fehlt.');
 const scale=Math.min(object.w/bounds[2],object.h/bounds[3]);
 return {...object,motif:key,w:bounds[2]*scale,h:bounds[3]*scale};
}
