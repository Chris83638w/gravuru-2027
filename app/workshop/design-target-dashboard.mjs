import {designTargets,resolveDesignTargets} from './design-targets.mjs';
import {FAMILY_MATERIALS,familyProcess} from './product-families.mjs';
const familyLabel=family=>({familie:family.id,name:family.name,material:FAMILY_MATERIALS[family.material.kind]?.name||family.material.kind,process:familyProcess(family)?.method==='print'?'Druck':familyProcess(family)?.method==='engraving'?'Gravur':'Verfahren offen',outdoorSuitable:family.outdoorSuitable??null});
export function dashboardDesignTargets(master,katalog,line,{checksumFor=()=>null}={}){
 const resolved=resolveDesignTargets(master,katalog),targets=resolved.targets.map(target=>{const family=katalog.families.get(target.familie);return {...(family?familyLabel(family):{familie:target.familie,name:target.familie,material:null,process:null,outdoorSuitable:null}),freigabe:target.freigabe,released:target.freigabe?.status==='freigegeben',missing:!family,inLine:line.families.includes(target.familie),sourceRevision:family?checksumFor(family):null,previewUrl:family?'/api/workshop/designs/target-preview?'+new URLSearchParams({reihe:master.seriesFolder,id:master.id,familie:target.familie}):null};});
 return {ziele:targets,zielHinweise:resolved.issues.map(issue=>issue.message),zielVorschlaege:targetSuggestions(master,katalog),released:targets.some(t=>t.inLine)&&targets.filter(t=>t.inLine).every(t=>t.released)};
}
export function targetSuggestions(master,katalog){
 const assigned=new Set(designTargets(master,katalog).map(t=>t.familie)),themes=new Set(master.themes||master.json?.themes||[]),suggestions=new Map();
 for(const line of katalog.lines.values()){
  const matched=line.subcategories.filter(sub=>themes.has(sub.themeId));if(!matched.length)continue;
  const reason=[...new Set(matched.map(sub=>sub.themeId))],families=line.families.map(id=>katalog.families.get(id)).filter(Boolean);
  if(!families.length)suggestions.set('line:'+line.id,{familie:null,linie:line.id,name:line.name,missing:true,reason,status:'Familie fehlt'});
  for(const family of families){if(assigned.has(family.id))continue;const old=suggestions.get(family.id);suggestions.set(family.id,{...familyLabel(family),missing:false,linien:[...new Set([...(old?.linien||[]),line.id])],reason:[...new Set([...(old?.reason||[]),...reason])]});}
  // Both processes are product requirements; absent families remain explicit gaps.
  for(const material of new Set(families.map(f=>f.material.kind)))for(const method of ['engraving','print']){
   if(families.some(f=>f.material.kind===material&&familyProcess(f)?.method===method))continue;
   const key='missing:'+line.id+':'+material+':'+method;suggestions.set(key,{familie:null,linie:line.id,name:line.name,material:FAMILY_MATERIALS[material]?.name||material,process:method==='print'?'Druck':'Gravur',missing:true,reason,status:'Familie fehlt'});
  }
 }
 return [...suggestions.values()];
}
