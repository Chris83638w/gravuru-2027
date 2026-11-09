import {isLayeredDoorbell} from './product-module-context.mjs';

export const EXECUTION_SCHEMA='gravuru-product-execution/v1';
export const UV_CROSS_FAMILY='uv-gedenkkreuze-acryl-klar';
export const MEMORIAL_FAMILIES=Object.freeze([
 'schiefer-tafeln-premium','schiefer-tafeln-geschnitten','schiefer-tafeln-natur','schiefer-tafeln-kordel',
 'gedenktafel-22x14-schiefer-natur','gedenktafel-22x14-schiefer-hunde-2027',
 'gedenktafel-30x20-schiefer-natur','gedenktafel-30x20-schiefer-premium',
 'gedenktafel-30x20-acryl-schwarz','gedenktafel-30x20-acryl-anthrazit',
 'gedenktafel-ae-acryl-schwarz','gedenktafel-ae-acryl-anthrazit','gedenktafel-30x20-edelstahl'
]);
const SIGNS=['steel-door-signs','acryl-3mm-tuerschilder-schwarz','acryl-3mm-tuerschilder-anthrazit'];
export function familyExecution(familyId){
 const kind=familyId===UV_CROSS_FAMILY?'uv-cross':familyId==='grabstecker-edelstahl'?'stake':MEMORIAL_FAMILIES.includes(familyId)?'memorial':SIGNS.includes(familyId)?'door-sign':null;
 return kind?{schema:EXECUTION_SCHEMA,kind,sourceFamilyId:familyId}:null;
}
// Source identifiers, never names, materials or guessed visual similarity.
export function executionKind(c){
 if(isLayeredDoorbell(c))return 'doorbell';
 const explicit=c?.productExecution;
 if(explicit?.schema===EXECUTION_SCHEMA&&familyExecution(explicit.sourceFamilyId)?.kind===explicit.kind)return explicit.kind==='memorial'&&explicit.enabled===false?'generic':explicit.kind;
 const families=c?.familyFormats?.formats?.flatMap(f=>f.variants.map(v=>v.familyId))||[];
 if(families.length){const kinds=new Set(families.map(id=>familyExecution(id)?.kind));if(kinds.size===1&&!kinds.has(undefined))return [...kinds][0];}
 return familyExecution(c?.familyAcrylic?.familyId)?.kind||'generic';
}
const sizeOnly=c=>['stake','uv-cross'].includes(executionKind(c));
export const executionHeading=c=>sizeOnly(c)?'Größe':({memorial:'Befestigung & Zubehör','door-sign':'Format & Größe'})[executionKind(c)]||'Material & Befestigung';
export const executionTabLabel=c=>sizeOnly(c)?'Größe':c?.familyFormats?'Format & Größe':'Ausführungen';
// Canonical options retain fixed catalogue values for existing drafts and prices.
export const executionOptionGroups=(c,groups=c?.profile?.optionGroups||[])=>sizeOnly(c)?groups.filter(g=>g.id==='size'):groups;
export const executionSummaryGroups=(c,groups)=>executionKind(c)==='uv-cross'?executionOptionGroups(c,groups):groups;
export function validateExecution(c){
 const tag=c.productExecution;
 if(tag!==undefined&&(tag?.schema!==EXECUTION_SCHEMA||!familyExecution(tag.sourceFamilyId)||familyExecution(tag.sourceFamilyId).kind!==tag.kind))throw Error('Ungültige Ausführungsquelle.');
 if(executionKind(c)==='stake'&&(c.photo?.enabled||c.logo?.enabled||(c.profile.optionGroups||[]).some(g=>g.id!=='size'&&(g.id!=='mounting'||g.values.length!==1||g.values[0].id!=='K00'))||c.profile.optionFields?.length))throw Error('Grabstecker erlauben ausschließlich Größenwahl.');
}
