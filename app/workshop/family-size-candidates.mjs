// Issue 48 / 01.11: fill explicit size-list gaps only within an already evidenced
// source format series. Returns copies; never edits catalogue data or approvals.
import {assignTargetSeries,designTargets,designTargetCompatibility} from './design-targets.mjs';
import {SERIES_TOLERANCE} from './katalog-convert.mjs';

const form=(family,size)=>{
 const g=family.groups.find(g=>g.key===size.groupKey);
 return g?.shape==='contour'?'contour:'+g.key:g?.shape==='rect'?(Number(g.cornerRadiusMm)>0?'rounded-rect':'rect'):g?.shape;
};
export function familySizeCandidates(katalog,masters,{sourceFamilyId='steel-door-signs'}={}){
 const family=katalog.families.get(sourceFamilyId);
 if(!family)return {masters:[...masters],additions:[]};
 const assignments=new Map(assignTargetSeries(family,masters,katalog).map(a=>[a.design.id,a]));
 const additions=[];
 const expanded=masters.map(master=>{
  if(!designTargets(master,katalog).some(t=>t.familie===family.id))return master;
  const assigned=assignments.get(master.id),anchors=family.sizes.filter(s=>assigned.sizes.includes(s.key));
  if(!anchors.length)return master;
  const candidates=family.sizes.filter(s=>!assigned.sizes.includes(s.key)&&anchors.some(a=>form(family,a)===form(family,s)&&Math.abs((a.widthMm/a.heightMm)/(s.widthMm/s.heightMm)-1)<=SERIES_TOLERANCE));
  if(!candidates.length)return master;
  const proposed={...master,json:{...master.json,sizes:[...new Set([...(master.json.sizes||[]),...assigned.sizes,...candidates.map(s=>s.key)])]}};
  const valid=candidates.filter(size=>designTargetCompatibility(proposed,family,size,{katalog}).status==='passt');
  if(!valid.length)return master;
  const result={...master,json:{...master.json,sizes:[...new Set([...(master.json.sizes||[]),...assigned.sizes,...valid.map(s=>s.key)])]}};
  additions.push({designId:master.id,familyId:family.id,sizeKeys:valid.map(s=>s.key)});
  return result;
 });
 return {masters:expanded,additions};
}
