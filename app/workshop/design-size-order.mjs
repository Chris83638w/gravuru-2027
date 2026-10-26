// Presentation order only: catalog size/group keys and dimensions stay unchanged.
const square=s=>s.widthMm===s.heightMm;
export function formGroupLabel(group,sizes=[]){
 if(group.shape!=='rect'||!sizes.some(square))return group.name;
 if(!sizes.every(square))return group.name+' / Quadrat';
 if(/quadrat/i.test(group.name))return group.name;
 return /rechteck/i.test(group.name)?group.name.replace(/rechteck/i,'Quadrat'):'Quadrat'+(group.cornerRadiusMm?' · '+group.name:'');
}
function ratio(size){
 // Integer micromillimetres preserve decimal dimensions without ratio rounding.
 const w=Math.round(size.widthMm*1e6),h=Math.round(size.heightMm*1e6);
 const gcd=(a,b)=>b?gcd(b,a%b):a,d=gcd(w,h);
 return {key:w/d+':'+h/d,value:size.widthMm/size.heightMm};
}
export function orderedFamilySizes(family,{compatible=new Set(family.sizes.map(s=>s.key))}={}){
 return family.sizes.map(size=>{
  const group=family.groups.find(g=>g.key===size.groupKey),r=ratio(size),isSquare=group.shape==='rect'&&square(size);
  const displayGroupKey=group.key+(isSquare?':square':''),fits=compatible.has(size.key);
  return {...size,groupName:formGroupLabel(group,[size]),displayGroupKey,ratioLabel:r.key,seriesKey:displayGroupKey+':'+r.key+':'+fits,compatible:fits,_group:family.groups.indexOf(group),_ratio:r.value};
 }).sort((a,b)=>Number(b.compatible)-Number(a.compatible)||a._group-b._group||a._ratio-b._ratio||(a.widthMm*a.heightMm-b.widthMm*b.heightMm)||a.widthMm-b.widthMm||a.heightMm-b.heightMm||a.key.localeCompare(b.key))
 .map(({_group,_ratio,...size})=>size);
}
