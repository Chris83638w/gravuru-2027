// Narrow SQL projection of the pinned native resolver. Never instantiate the
// native library here: its constructor can migrate the supplied database.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

export const MAIN_CATEGORIES=Object.freeze(['extern-shopifyproductid-16190784602492','linie-acryl-tuerschilder']);
export const RESOLVER_SOURCE=Object.freeze({path:'app/workshop/profile-library.mjs',commit:'630adcc0ee6dcdbb04e4345452d07604b83f59cb',gitBlob:'c67b4b3cbdcee96b497fa8a3f429afac0d75cfb5',normalizedLfSha256:'d3aa96dd7800f3e98bd2706b20bb2a0eb5b47adc9172099547453225e8460e51',lines:[180,203]});
const TYPES=['fonts','motifs','colors','bestsellers'];
const fail=message=>{throw Error(message);};
const must=(ok,message)=>{if(!ok)fail(message);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const valueHash=v=>hash(JSON.stringify(canonical(v)));
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const validId=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
const parse=(s,label)=>{try{return JSON.parse(s);}catch{fail('Invalid JSON: '+label);}};
const one=(rows,label)=>{must(rows.length===1,'Expected one '+label);return rows[0];};
const positive=v=>Number.isSafeInteger(v)&&v>0;
function assignment(a){
 must(exact(a,['mode','profileId'])&&['inherit','empty','override'].includes(a.mode)&&(a.mode==='override'?validId(a.profileId):a.profileId===null),'Invalid resource assignment.');
 return a;
}
export function assertResolverSource(file){
 must(typeof file==='string'&&file,'Explicit --resolver-source is required for category comparison.');
 const bytes=fs.readFileSync(file);must(bytes.length<1024*1024,'Unexpected resolver source size.');
 must(hash(bytes.toString('utf8').replace(/\r\n/g,'\n'))===RESOLVER_SOURCE.normalizedLfSha256,'Native resource resolver source hash mismatch.');
 return {...RESOLVER_SOURCE,checked:true};
}
export function summarizeResolution(s){
 return {settingsRevision:s.settingsRevision??null,sources:Object.fromEntries(TYPES.map(type=>{
  const p=s.sources?.[type],items=s.selections?.[type];
  must(items===null||Array.isArray(items),'Invalid resource selection snapshot.');
  return [type,{level:p?.level??null,categoryId:p?.categoryId??null,mode:p?.mode??null,profileId:p?.profileId??null,profileRevision:p?.profileRevision??null,count:items===null?null:items.length,sha256:items===null?null:valueHash(items)}];
 }))};
}

export function resolveMainCategoryProfilesReadOnly({db,tenantId,document,resolverSource}){
 const source=assertResolverSource(resolverSource);
 must(db.prepare('PRAGMA query_only').get().query_only===1,'A query_only database connection is required.');
 must(typeof tenantId==='string'&&/^[a-z0-9][a-z0-9-]{0,39}$/.test(tenantId),'Explicit tenant required.');
 must(isDeepStrictEqual(document.categoryIds,MAIN_CATEGORIES),'Only the two exact ordered existing main categories are supported.');
 must(exact(document.profileAssignments,TYPES)&&TYPES.every(t=>{const a=assignment(document.profileAssignments[t]);return a.mode==='inherit';}),'Only the four inherited product assignments are supported.');
 const settings=one(db.prepare('SELECT revision,document FROM profile_library_settings WHERE tenant_id=?').all(tenantId),'scoped profile settings');
 must(positive(settings.revision),'Invalid settings revision.');
 const config=parse(settings.document,'resource settings');must(exact(config.defaults,TYPES)&&object(config.categories),'Unsupported resource settings.');
 const profilePins=new Map();
 function loadProfile(type,id){
  const p=one(db.prepare('SELECT p.id,p.revision,p.type,r.document FROM profiles p JOIN profile_revisions r ON r.profile_id=p.id AND r.revision=p.revision AND r.tenant_id=p.tenant_id WHERE p.tenant_id=? AND p.id=?').all(tenantId,id),'scoped current resource profile');
  const d=parse(p.document,'resource profile');
  must(p.type===type&&positive(p.revision)&&exact(d,['name','type','items'])&&d.type===type&&typeof d.name==='string'&&d.name.trim()&&d.name.length<=200&&Array.isArray(d.items)&&d.items.length<=2000,'Resource profile type/revision/items mismatch.');
  must(d.items.every(v=>typeof v==='string'&&v.trim()===v&&v.length>0&&v.length<=256&&!/[\u0000-\u001f\u007f]/.test(v)&&(type!=='colors'||/^#[0-9a-f]{6}$/i.test(v)))&&new Set(type==='colors'?d.items.map(x=>x.toLowerCase()):d.items).size===d.items.length,'Invalid or duplicate resource items.');
  const pin={type,profileId:p.id,profileRevision:p.revision,storedDocumentSha256:hash(p.document),canonicalDocumentSha256:valueHash(d),selectionCount:d.items.length,selectionSha256:valueHash(d.items)};
  profilePins.set(type+':'+p.id+':'+p.revision,pin);return {items:d.items,pin};
 }
 function project(categories){
  const selections={},sources={},trace=[];
  for(const type of TYPES){
   selections[type]=null;sources[type]={level:'unbound',categoryId:null,mode:'inherit',profileId:null,profileRevision:null};
   function apply(raw,level,categoryId=null){
    const a=assignment(raw),entry={type,level,categoryId,mode:a.mode,profileId:a.profileId,applied:a.mode!=='inherit'};
    if(a.mode==='inherit'){trace.push(entry);return;}
    const p=a.mode==='override'?loadProfile(type,a.profileId):null;
    selections[type]=p?[...p.items]:[];
    sources[type]={level,categoryId,mode:a.mode,profileId:p?.pin.profileId??null,profileRevision:p?.pin.profileRevision??null};
    trace.push({...entry,profileRevision:p?.pin.profileRevision??null,profileDocumentSha256:p?.pin.storedDocumentSha256??null});
   }
   apply(config.defaults[type],'default');
   for(const categoryId of categories)if(Object.hasOwn(config.categories,categoryId)){
    must(exact(config.categories[categoryId],TYPES),'Incomplete category assignments.');apply(config.categories[categoryId][type],'category',categoryId);
   }
   apply(document.profileAssignments[type],'product');
  }
  let filteredBestsellers=0;
  if(selections.motifs!==null&&selections.bestsellers!==null){const allowed=new Set(selections.motifs),before=selections.bestsellers.length;selections.bestsellers=selections.bestsellers.filter(id=>allowed.has(id));filteredBestsellers=before-selections.bestsellers.length;}
  return {snapshot:summarizeResolution({settingsRevision:settings.revision,selections,sources}),filteredBestsellers,trace};
 }
 const defaultsOnly=project([]),withCategories=project(MAIN_CATEGORIES);
 const differentSelections=TYPES.filter(t=>defaultsOnly.snapshot.sources[t].count!==withCategories.snapshot.sources[t].count||defaultsOnly.snapshot.sources[t].sha256!==withCategories.snapshot.sources[t].sha256);
 const differentSources=TYPES.filter(t=>!isDeepStrictEqual(defaultsOnly.snapshot.sources[t],withCategories.snapshot.sources[t]));
 return {resolverSource:source,categoryPriority:'last-non-inherit-wins',categoryIds:[...MAIN_CATEGORIES],categoryAssignments:MAIN_CATEGORIES.map(id=>({id,present:Object.hasOwn(config.categories,id),assignmentSha256:Object.hasOwn(config.categories,id)?valueHash(config.categories[id]):null})),productAssignmentsSha256:valueHash(document.profileAssignments),settingsPin:{tenantId,revision:settings.revision,storedDocumentSha256:hash(settings.document),canonicalDocumentSha256:valueHash(config)},profilePins:[...profilePins.values()],defaultsOnly,withCategories,categoryChangesSelections:differentSelections,categoryChangesSources:differentSources,catalogAvailabilityValidated:false,limits:['Exact native source-priority projection only; the native constructor was not run on this copy.','Existing current profile heads are pinned by revision and stored/canonical hashes.','Actual catalogue membership/font or SVG availability remains native runtime validation.','No library items or unrelated category assignments are returned.']};
}
