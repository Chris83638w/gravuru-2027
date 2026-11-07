import {designReviewMaterial,designReviewMaterials,designReviewCategory,designReviewApprovalKey} from './design-review-targets.mjs';
import {reviewThemes,reviewProcessLabel,reviewSourceHierarchy} from './slate-review-gallery-page.mjs';

export const GALLERY_PAGE_SIZE=60;
const compare=(a,b)=>String(a??'').localeCompare(String(b??''),'de',{numeric:true});
const fail=message=>{throw Object.assign(Error(message),{status:422});};
const filterNames=['search','view','material','theme','category','form','process','approval'];
export function galleryReviewPage(pack,parameters=new URLSearchParams(),states={}){
  const allowed=new Set([...filterNames,'page','originalId']);
  for(const name of parameters.keys())if(!allowed.has(name)||parameters.getAll(name).length!==1)fail('Bitte eindeutige Galeriefilter verwenden.');
  const filters=Object.fromEntries(filterNames.map(name=>[name,parameters.get(name)||'']));
  filters.view=filters.view||'designs';
  if(!['designs','blanks','all'].includes(filters.view)||Object.values(filters).some(v=>v.length>500)||!['','Gravur','UV-Druck','Verfahren offen'].includes(filters.process)||!['','unreviewed','approved','changed','unavailable'].includes(filters.approval))fail('Ungültige Galeriefilter.');
  const pageText=parameters.get('page')||'1';if(!/^[1-9]\d{0,6}$/.test(pageText))fail('Bitte eine gültige Seite wählen.');
  const materials=new Map(),categories=new Map(),themes=new Map(),forms=new Set();
  const materialEntry=m=>{if(!materials.has(m.key))materials.set(m.key,{...m,originals:0,editable:0,blanks:0});return materials.get(m.key);};
  const sorted=[...pack.originals].sort((a,b)=>{
    const am=designReviewMaterial(a),bm=designReviewMaterial(b),ac=designReviewCategory(a),bc=designReviewCategory(b);
    return Number(bm.key==='slate')-Number(am.key==='slate')||(Number.isFinite(a.reviewOrder)&&Number.isFinite(b.reviewOrder)?a.reviewOrder-b.reviewOrder:0)||compare(am.label,bm.label)||ac.rank-bc.rank||compare(ac.key,bc.key)||compare(a.id,b.id);
  });
  const search=filters.search.toLocaleLowerCase('de').trim();
  const designs=sorted.filter(row=>{
    const category=designReviewCategory(row),ms=designReviewMaterials(row),ts=reviewThemes(row,category),process=reviewProcessLabel(row);
    categories.set(category.key,category);for(const theme of ts)themes.set(theme.key,theme);
    for(const m of ms){const entry=materialEntry(m);entry.originals++;if(row.targets?.some(t=>t.status==='prepared'&&designReviewMaterial(row,t).key===m.key))entry.editable++;}
    const searchable=[row.id,row.group,row.subcategory,reviewSourceHierarchy(row),...ms.map(m=>m.label),category.label,...ts.map(t=>t.label),process].join(' ').toLocaleLowerCase('de');
    const targets=(row.targets?.length?row.targets:[{}]).filter(t=>!filters.material||designReviewMaterial(row,t).key===filters.material);
    const statusMatches=!filters.approval||targets.some(t=>(states[designReviewApprovalKey(row,t.sizeKey,t)]?.status||(t.status==='prepared'?'unreviewed':'unavailable'))===filters.approval);
    return filters.view!=='blanks'&&searchable.includes(search)&&(!filters.material||ms.some(m=>m.key===filters.material))&&(!filters.theme||ts.some(t=>t.key===filters.theme))&&(!filters.category||category.key===filters.category)&&(!filters.process||process===filters.process)&&statusMatches;
  });
  const blanks=(pack.blanks||[]).filter(blank=>{
    materialEntry({key:blank.materialKey,label:blank.materialLabel,kind:blank.materialKind}).blanks++;forms.add(blank.form);
    const searchable=[blank.key,blank.materialLabel,blank.form,blank.label,...(blank.mm||[]).map(n=>n/10)].join(' ').toLocaleLowerCase('de');
    return filters.view!=='designs'&&searchable.includes(search)&&(!filters.material||blank.materialKey===filters.material)&&(!filters.form||blank.form===filters.form);
  });
  const focusOriginalId=parameters.get('originalId')||null;
  if(focusOriginalId&&!pack.originals.some(row=>row.id===focusOriginalId))fail('Die gewählte Vorlage wurde nicht gefunden.');
  // A saved editor return is kept visible even if its previous filter no longer
  // matches. No filters or native format selections are silently discarded.
  if(focusOriginalId&&!designs.some(row=>row.id===focusOriginalId))designs.unshift(pack.originals.find(row=>row.id===focusOriginalId));
  const items=[...designs.map(row=>({row,type:'design'})),...blanks.map(row=>({row,type:'blank'}))],pages=Math.max(1,Math.ceil(items.length/GALLERY_PAGE_SIZE));
  const focused=focusOriginalId?items.findIndex(item=>item.type==='design'&&item.row.id===focusOriginalId):-1;
  const page=focused>=0?Math.floor(focused/GALLERY_PAGE_SIZE)+1:Math.min(Number(pageText),pages),slice=items.slice((page-1)*GALLERY_PAGE_SIZE,page*GALLERY_PAGE_SIZE);
  const urlFor=value=>{const q=new URLSearchParams();for(const [key,value]of Object.entries(filters))if(value)q.set(key,value);q.set('page',String(value));return '/originale/?'+q;};
  return {pack:{...pack,originals:slice.filter(i=>i.type==='design').map(i=>i.row),blanks:slice.filter(i=>i.type==='blank').map(i=>i.row)},paging:{page,pages,pageSize:GALLERY_PAGE_SIZE,totalMatches:items.length,totalOriginals:pack.originals.length,totalBlanks:(pack.blanks||[]).length,matchingOriginals:designs.length,matchingBlanks:blanks.length,filters,facets:{materials:[...materials.values()],categories:[...categories.values()],themes:[...themes.values()],blankForms:[...forms].filter(Boolean).sort(compare)},previousUrl:page>1?urlFor(page-1):null,nextUrl:page<pages?urlFor(page+1):null,focusOriginalId}};
}
