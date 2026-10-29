// Paint order is explicit in each newly saved design. Historic snapshots keep
// their original order; element IDs, rights and source ordering are untouched.
export function designPaintOrder(design){
 const objects=design.objects||[];
 return design.textOnTop===true?[...objects.filter(o=>o.type!=='text'),...objects.filter(o=>o.type==='text')]:objects;
}
