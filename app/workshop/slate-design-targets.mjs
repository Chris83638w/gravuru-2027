// #85, Claude 6626324410: source formats only; this is no design approval.
export const SLATE_DESIGN_DECISION='https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6626324410';
const n='schiefer-tafeln-natur',p='schiefer-tafeln-premium',g='schiefer-tafeln-geschnitten',k='schiefer-tafeln-kordel';
const spec={
 'rechteck-3-2':[[n,'RE',[150,100],[300,200]],[p,'RE',[300,200]]],
 'rechteck-2-1':[[n,'RE',[400,200],[600,300]]],
 'rechteck-3-1':[[n,'RE',[300,100],[380,130],[560,180]]],
 'rechteck-2-3':[[n,'RE',[200,300]],[p,'RE',[200,300]]],
 'rechteck-3-4':[[p,'RE',[150,200],[300,400]]],
 'rechteck-4-3':[[n,'RE',[400,300]],[p,'RE',[200,150],[400,300]]],
 quadrat:[[n,'QU']],rund:[[n,'R']],herz:[[n,'HR']],
 'herz-geschnitten-24x19':[[g,'HR']], 'herz-schief':[[g,'HS']], kreuz:[[g,'KR']],knochen:[[g,'KN']],stern:[[g,'ST']],
 'kordel-rechteck-20x10':[[k,'RE',[200,100]]],
 'kordel-rechteck-20x25':[[k,'RE',[200,250]]],
 'kordel-rechteck-25x20':[[k,'RE',[250,200]]],
 'kordel-rechteck-22x14':[[k,'RE',[220,140]]],
 'kordel-rechteck-30x20':[[k,'RE',[300,200]]],
 'kordel-quadrat-20x20':[[k,'QU',[200,200]]],
 'kordel-herz-10x10':[[k,'HR',[102,102]]],
 'herz-kordel-225x267':[[k,'HR',[227,271.1]]]
};
export function slateFormatSizes(json,family){
 if(family.material?.kind!=='slate'||String(json.material).toLowerCase()!=='schiefer')return [];
 const rules=(spec[json.formatreihe]||[]).filter(r=>r[0]===family.id);
 return family.sizes.filter(s=>rules.some(([,group,...mm])=>s.groupKey===group&&(!mm.length||mm.some(([w,h])=>Math.abs(w-s.widthMm)<.001&&Math.abs(h-s.heightMm)<.001))));
}
export function assignedSlateSizes(json,family){
 if(!json.ziele?.some(t=>t.familie===family.id)||!Array.isArray(json.sizes))return [];
 const all=slateFormatSizes(json,family),format=json.formatreihe,form=String(json.form).toLowerCase();
 const expected=format?.includes('herz-schief')?'herz schief':format?.includes('herz')?'herz':format?.includes('quadrat')?'quadrat':format?.includes('rechteck')?'rechteck':format;
 const plate=json.plateMm??[json.plate?.widthMm,json.plate?.heightMm];
 if(form!==expected||!plate.every(v=>Number.isFinite(v)&&v>0)||!all.some(s=>Math.abs((plate[0]/plate[1])/(s.widthMm/s.heightMm)-1)<.01))return [];
 return all.filter(s=>json.sizes.includes(s.key));
}
export function slateDesignGroup(json){
 const v=String(json.katalog?.zielgruppe??json.targetGroup??'').toLowerCase();
 if(['tiere','hund','hunde','katze','katzen'].includes(v))return 'Tiere';
 return ({menschen:'Menschen',sternenkinder:'Sternenkinder',familie:'Familie',monogramme:'Monogramme'})[v]??null;
}
