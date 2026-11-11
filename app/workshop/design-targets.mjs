// Family targets are authoritative once ziele exists, including an explicit [].
// Legacy freigabe is retained as history, never as a cross-family approval.
import {assignSeries,sourceContourSizes,SERIES_TOLERANCE} from './katalog-convert.mjs';
import {FAMILY_MATERIALS,familyProcess,geometryOf} from './product-families.mjs';
import {assignedSlateSizes} from './slate-design-targets.mjs';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const jsonOf=design=>record(design?.json)?design.json:design;
const id=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9_.-]{0,79}$/i.test(v);
const fail=(file,message)=>{throw Object.assign(Error(file+': '+message),{status:422,code:'design_targets_invalid',file});};
const values=v=>v instanceof Map?[...v.values()]:Array.isArray(v)?v:[];
const unique=v=>[...new Set(v)];
const normalize=v=>String(v??'').trim().toLocaleLowerCase('de');
const materialKind=value=>({edelstahl:'steel',v2a:'steel',stahl:'steel',schiefer:'slate',acryl:'acrylic',acrylglas:'acrylic',holz:'wood'}[normalize(value)]||normalize(value));
const processKind=value=>{const v=normalize(value);return ['gravur','engraving'].includes(v)||v.endsWith('-engraving')?'engraving':['druck','uv-druck','farbdruck','print','color-print'].includes(v)?'print':v;};
const issue=(code,message,candidates=[])=>({code,message,candidates});
export function validateDesignTargets(design,{families,file='design.json'}={}){
 const json=jsonOf(design);if(!record(json))fail(file,'Designdaten fehlen.');
 if(!Object.hasOwn(json,'ziele'))return null;
 if(!Array.isArray(json.ziele)||json.ziele.length>100)fail(file,'ziele ist eine Liste mit höchstens 100 Familienzielen.');
 const seen=new Set(),known=families?new Set(values(families).map(f=>f.id)):null;
 for(const target of json.ziele){
  if(!record(target)||Object.keys(target).some(k=>!['familie','freigabe'].includes(k))||!id(target.familie))fail(file,'Ein Ziel braucht eine vorhandene Familienkennung in familie und eine freigabe.');
  if(seen.has(target.familie))fail(file,'Familienziel „'+target.familie+'“ ist doppelt.');seen.add(target.familie);
  if(known&&!known.has(target.familie))fail(file,'Familie fehlt: '+target.familie+'.');
  if(!Object.hasOwn(target,'freigabe')||target.freigabe!==null&&(!record(target.freigabe)||!['offen','freigegeben'].includes(target.freigabe.status)))fail(file,'Ziel-freigabe ist null oder {status: offen|freigegeben, am, von}.');
 }
 return json.ziele;
}
function shapeMatches(form,group){
 const value=normalize(form);if(!value)return true;
 if(['oval','ellipse','rund','kreis','circle'].includes(value))return group?.shape==='ellipse';
 if(['rechteck','quadrat','rect','rechteck abgerundete ecken'].includes(value))return group?.shape==='rect';
 const retro=/^retro\s*([12])$/.exec(value);if(retro)return group?.shape==='contour'&&group.key==='RT'+retro[1];
 if(['kontur','contour','herz','heart','kreuz','cross','plaque'].includes(value))return group?.shape===({kontur:'contour',herz:'heart',kreuz:'cross'}[value]||value);
 return null;
}
function preparedDesign(design){
 const json=jsonOf(design),plateMm=design.plateMm??json.plateMm??(record(json.plate)?[json.plate.widthMm,json.plate.heightMm]:null);
 return {...design,json,id:design.id??json.id,plateMm,themes:design.themes??json.themes??[]};
}
export function resolveOwnFamilies(design,katalog={}){
 const master=preparedDesign(design),json=master.json,families=values(katalog.families),lines=values(katalog.lines);
 if(!Array.isArray(master.plateMm)||master.plateMm.length!==2||master.plateMm.some(n=>!Number.isFinite(n)||n<=0))return {families:[],issues:[issue('family_geometry_missing','Die Mastermaße fehlen; die eigene Familie ist nicht sicher bestimmbar.')],evidence:[]};
 const sourceMaterial=materialKind(json.material),sourceProcess=processKind(json.process??json.processingProfileId),sourceVariant=normalize(json.materialVariant??json.variant);
 const candidates=families.filter(f=>{
  const familyMaterial=materialKind(FAMILY_MATERIALS[f.material.kind]?.name??f.material.kind),method=familyProcess(f)?.method;
  return (!sourceMaterial||sourceMaterial===familyMaterial)&&(!sourceProcess||sourceProcess===method||sourceProcess===f.material.processingProfileId)&&(!sourceVariant||sourceVariant===normalize(f.material.variant));
 }).map(f=>{
  const assigned=assignSeries(f,[master])[0],contour=sourceContourSizes(f,master),keys=unique([...(Array.isArray(json.sizes)?json.sizes:[]),...(json.masterSheet?.familySize?[json.masterSheet.familySize]:[]),...contour]);
  const explicit=f.sizes.filter(s=>keys.includes(s.key)),suitable=f.sizes.filter(s=>shapeMatches(json.form,f.groups.find(g=>g.key===s.groupKey))!==false);
  return {family:f,assigned,explicit:explicit.filter(s=>suitable.includes(s)),shapeUnknown:suitable.some(s=>shapeMatches(json.form,f.groups.find(g=>g.key===s.groupKey))===null)};
 });
 let selected=candidates.filter(c=>c.explicit.length),evidence=[];
 const hasExplicit=selected.length>0;
 if(hasExplicit)evidence.push({type:'sizes',families:selected.map(c=>c.family.id),keys:unique(selected.flatMap(c=>c.explicit.map(s=>s.key)))});
 else{
  // An explicit list must not silently become a different geometry when all keys are unknown.
  if(Array.isArray(json.sizes)&&json.sizes.length||json.masterSheet?.familySize)return {families:[],issues:[issue('family_size_missing','Die expliziten Größen passen zu keiner Familie mit demselben Material, Verfahren und derselben Form.')],evidence};
  selected=candidates.filter(c=>!c.assigned.oldSize&&c.assigned.sizes.some(key=>{const size=c.family.sizes.find(s=>s.key===key);return shapeMatches(json.form,c.family.groups.find(g=>g.key===size.groupKey))===true;}));
  evidence.push({type:'geometry-material-process',families:selected.map(c=>c.family.id)});
 }
 const distinctExplicit=selected.length>1&&selected.every(c=>c.explicit.some(s=>selected.filter(other=>other.explicit.some(os=>os.key===s.key)).length===1));
 if(selected.length>1&&!distinctExplicit){
  const direct=lines.filter(line=>line.subcategories.some(s=>s.startDesign===master.id||s.mainProducts?.some(p=>p.startDesign===master.id)));
  const related=direct.length?direct:lines.filter(line=>line.subcategories.some(s=>master.themes.includes(s.themeId)));
  if(related.length){const ids=new Set(related.flatMap(l=>l.families)),bound=selected.filter(c=>ids.has(c.family.id));if(bound.length){selected=bound;evidence.push({type:direct.length?'start-design':'line-theme',lines:related.map(l=>l.id),families:bound.map(c=>c.family.id)});}}
 }
 // More than one own family is only established by explicit, unambiguous size keys.
 // A duplicate key or a shared aspect ratio is not authority to multiply approvals.
 const explicitMultiple=hasExplicit&&selected.length>1&&selected.every(c=>c.explicit.some(s=>selected.filter(other=>other.explicit.some(os=>os.key===s.key)).length===1));
 if(!selected.length)return {families:[],issues:[issue('family_missing','Keine eigene Familie mit passendem Material, Verfahren und Formatreihe gefunden.')],evidence};
 if(selected.length>1&&!explicitMultiple)return {families:[],issues:[issue('family_ambiguous','Die eigene Familie ist mehrdeutig. Eine eindeutige Größen- oder Linienzuordnung ist erforderlich.',selected.map(c=>c.family.id))],evidence};
 return {families:selected.map(c=>c.family.id).sort(),issues:[],evidence};
}
export function resolveDesignTargets(design,katalog={}){
 const json=jsonOf(design),explicit=validateDesignTargets(design,{families:katalog.families});
 if(explicit!==null)return {targets:structuredClone(explicit),source:'explicit',issues:[],ownFamilies:[]};
 const own=resolveOwnFamilies(design,katalog),approval=json.freigabe??null;
 if(approval!==null&&(!record(approval)||!['offen','freigegeben'].includes(approval.status)))fail('design.json','Legacy-freigabe ist ungültig.');
 return {targets:own.families.map(familie=>({familie,freigabe:structuredClone(approval)})),source:'legacy',issues:own.issues,ownFamilies:own.families,evidence:own.evidence};
}
export const designTargets=(design,katalog)=>resolveDesignTargets(design,katalog).targets;
export const approvedForFamily=(design,familyId,katalog)=>designTargets(design,katalog).some(t=>t.familie===familyId&&t.freigabe?.status==='freigegeben');
export function planDesignTargetMigration(katalog){
 const rows=katalog.designs.masters.map(design=>{
  const resolved=resolveDesignTargets(design,katalog),legacyApproved=design.json.freigabe?.status==='freigegeben';
  return {id:design.id,reihe:design.seriesFolder,source:resolved.source,status:resolved.source==='explicit'?'unchanged':resolved.issues.length?'blocked':'ready',targets:resolved.targets,issues:resolved.issues,evidence:resolved.evidence??[],legacyApproved,approvedBefore:resolved.targets.filter(t=>t.freigabe?.status==='freigegeben').map(t=>t.familie),approvedAfter:resolved.targets.filter(t=>t.freigabe?.status==='freigegeben').map(t=>t.familie)};
 });
 return {schema:'gravuru-design-target-migration/v1',counts:{masters:rows.length,ready:rows.filter(r=>r.status==='ready').length,unchanged:rows.filter(r=>r.status==='unchanged').length,blocked:rows.filter(r=>r.status==='blocked').length,legacyApproved:rows.filter(r=>r.legacyApproved).length,blockedLegacyApproved:rows.filter(r=>r.legacyApproved&&r.status==='blocked').length,approvedBefore:rows.reduce((n,r)=>n+r.approvedBefore.length,0),approvedAfter:rows.reduce((n,r)=>n+r.approvedAfter.length,0)},rows};
}

// Shape/format changes belong to a separately reviewed variant. Same-form family
// transfers can use existing proportional sizes; explicit source-size restrictions
// inside the original family remain binding.
const groupForm=group=>group?.shape==='rect'?(Number(group.cornerRadiusMm)>0?'rounded-rect':'rect'):group?.shape==='contour'?'contour:'+group.key:group?.shape??null;
const namedForm=value=>{
 const name=normalize(value),retro=/^retro\s*([12])$/.exec(name);if(retro)return 'contour:RT'+retro[1];
 if(['oval','ellipse','rund','kreis','circle'].includes(name))return 'ellipse';
 if(['rechteck abgerundete ecken','roundedrectangle','rounded-rect'].includes(name))return 'rounded-rect';
 if(['rechteck','quadrat','rect'].includes(name))return 'rect';
 return ({herz:'heart',heart:'heart',kreuz:'cross',cross:'cross',plaque:'plaque'})[name]??null;
};
function sourceFormOf(master,katalog,family){
 const slate=assignedSlateSizes(master.json,family);
 if(slate.length)return groupForm(family.groups.find(g=>g.key===slate[0].groupKey));
 const named=namedForm(master.json.form);if(named)return named;
 const all=values(katalog.families);if(!all.length)all.push(family);
 const primary=master.json.masterSheet?.familySize,explicit=Array.isArray(master.json.sizes)?master.json.sizes:[];
 let sources=all.flatMap(f=>f.sizes.filter(s=>primary?s.key===primary:explicit.includes(s.key)||sourceContourSizes(f,master).includes(s.key)).map(s=>({f,s})));
 if(!sources.length){
  const own=resolveOwnFamilies(master,{...katalog,families:all}),ids=new Set(own.families.length?own.families:own.issues.flatMap(i=>i.candidates));
  sources=all.filter(f=>ids.has(f.id)).flatMap(f=>{const a=assignSeries(f,[master])[0];return f.sizes.filter(s=>a.sizes.includes(s.key)).map(s=>({f,s}));});
  const exact=sources.filter(({s})=>Math.abs(s.widthMm-master.plateMm[0])<.01&&Math.abs(s.heightMm-master.plateMm[1])<.01);if(exact.length)sources=exact;
 }
 const forms=unique(sources.map(({f,s})=>groupForm(f.groups.find(g=>g.key===s.groupKey))).filter(Boolean));return forms.length===1?forms[0]:null;
}
function targetAssignment(family,master,katalog){
 const slate=assignedSlateSizes(master.json,family);
 if(slate.length)return {assignment:{...assignSeries(family,[master])[0],sizes:slate.map(s=>s.key),oldSize:false,proportionalFit:true},contourKeys:[],slateKeys:slate.map(s=>s.key)};
 // A family explicitly derived from another catalogue family keeps that
 // source's size restrictions. Compare the actual plate geometry as well:
 // the provenance path alone must never authorize a different plate.
 const root=String(katalog.root??'').replaceAll('\\','/').replace(/\/$/,''),relative=family.source?.path;
 const source=typeof relative==='string'&&relative.startsWith('familien/')&&!relative.split('/').some(p=>p==='..'||p==='.')
  ?values(katalog.families).find(f=>f.id!==family.id&&String(katalog.files?.get('familie:'+f.id)??'').replaceAll('\\','/')===root+'/'+relative):null;
 if(source){
  const allowed=new Set(assignSeries(source,[master])[0].sizes);
  const sizes=family.sizes.filter(target=>source.sizes.some(s=>allowed.has(s.key)&&JSON.stringify(geometryOf(source,s))===JSON.stringify(geometryOf(family,target)))).map(s=>s.key);
  return {assignment:assignSeries(family,[{...master,json:{...master.json,sizes}}])[0],contourKeys:sizes.filter(key=>family.groups.find(g=>g.key===family.sizes.find(s=>s.key===key).groupKey)?.shape==='contour'),shared:true};
 }
 return {assignment:assignSeries(family,[master])[0],contourKeys:sourceContourSizes(family,master)};
}
export function designTargetCompatibility(design,family,size,{katalog={}}={}){
 const master=preparedDesign(design);return targetCompatibility(master,family,size,katalog,targetAssignment(family,master,katalog));
}
function targetCompatibility(master,family,size,katalog,{assignment,contourKeys,shared,slateKeys=[]}){
 const json=master.json,targetForm=groupForm(family.groups.find(g=>g.key===size.groupKey)),sourceForm=sourceFormOf(master,katalog,family),issues=[];
 if(!sourceForm)issues.push('Die Quellform ist nicht eindeutig. Vor einer Ziel-Freigabe muss sie an der Quelle geklärt werden.');
 else if(sourceForm!==targetForm)issues.push('Andere Form ('+sourceForm+' → '+targetForm+'): Eine eigene Variante mit Vorschau und Freigabe ist erforderlich.');
 const keys=Array.isArray(json.sizes)?json.sizes:[],known=new Set(family.sizes.map(s=>s.key)),ownKeys=keys.filter(k=>known.has(k));
 if((shared||Array.isArray(json.sizes)&&!keys.length||ownKeys.length||contourKeys.length)&&!assignment.sizes.includes(size.key))issues.push('Die Zielgröße '+size.key+' ist für diesen Master nicht freigegeben; die explizite Größenliste bleibt bindend.');
 const all=values(katalog.families);if(keys.length&&!ownKeys.length&&(!all.length||!keys.some(key=>all.some(f=>f.sizes.some(s=>s.key===key)))))issues.push('Die expliziten Quellgrößen sind keiner vorhandenen Familie zugeordnet.');
 const from=master.plateMm,to=[size.widthMm,size.heightMm],valid=Array.isArray(from)&&from.length===2&&from.every(n=>Number.isFinite(n)&&n>0);
 // Historical Retro canvases carry exact, source-authorized contour size mappings.
 // Their existing contain fit is preserved; this exception cannot open a new form.
 const sourceContour=targetForm?.startsWith('contour:')&&sourceForm===targetForm&&(contourKeys.includes(size.key)||ownKeys.includes(size.key));
 if(!valid)issues.push('Mastermaße fehlen; das Zielformat ist nicht prüfbar.');
 else if(!sourceContour&&!slateKeys.includes(size.key)&&Math.abs((from[1]*(to[0]/from[0]))/to[1]-1)>SERIES_TOLERANCE)issues.push('Anderes Seitenverhältnis: Eine eigene eingepasste Variante mit Vorschau und Freigabe ist erforderlich.');
 if(slateKeys.includes(size.key)&&size.photoDesignCents===undefined&&(json.withPhoto===true||json.photos?.length))issues.push('Diese Zieltafel ist ohne Foto freigegeben; das vorhandene Fotodesign bleibt unverändert und kann hier nicht angeboten werden.');
 return {status:issues.length?'passt nicht':'passt',variantRequired:issues.length>0,issues,sourceForm,targetForm};
}
export function assignTargetSeries(family,designs,katalog={}){
 return designs.map(design=>{
  const master=preparedDesign(design),target=targetAssignment(family,master,katalog),{assignment:base,shared}=target,keys=Array.isArray(master.json.sizes)?master.json.sizes:[],known=new Set(family.sizes.map(s=>s.key));
  const foreignKeys=!shared&&keys.length&&!keys.some(k=>known.has(k))&&keys.some(k=>values(katalog.families).some(f=>f.sizes.some(s=>s.key===k)));
  const candidate=foreignKeys?assignSeries(family,[{...master,json:{...master.json,sizes:undefined}}])[0]:base;
  const checks=family.sizes.map(size=>({size:size.key,...targetCompatibility(master,family,size,katalog,target)}));
  const sizes=candidate.sizes.filter(key=>checks.find(c=>c.size===key)?.status==='passt');
  return {...candidate,design,sizes,excludedTargets:checks.filter(c=>candidate.sizes.includes(c.size)&&c.status!=='passt')};
 });
}
