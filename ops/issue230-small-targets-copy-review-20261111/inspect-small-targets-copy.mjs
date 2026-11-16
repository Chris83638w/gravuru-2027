// Exact positive ID scope only. No app constructors, import, mutation, network,
// orders, customer records, token tables or resource/library dumps.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {copyPath,argumentsOf,isCLI,printResult} from './copy-guard.mjs';

export const AUDIT_SHA256='d2cb6cac1149da13db9ed9c2af83f27f3060a4531840636542e9fe95f4d6346f';
export const ALIAS_SOURCE_SHA256='2ddc13a66c323ece8228867e1e8bf32388f7d82b129ff37128d37fb12a79f694';
const SHOP='gravuru-design.myshopify.com',TENANT='gravuru';
const GROUPS=['acrylic-5x2','acrylic-6x2','acrylic-8x2','steel-5x2','steel-6x2','steel-8x2'];
const productGid=/^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/,variantGid=/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]{0,19}$/;
const sha=b=>createHash('sha256').update(b).digest('hex');
const must=(ok,message)=>{if(!ok)throw Error(message);};
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
export const bindingHash=v=>sha(canonical(v));
export function hashFile(file){const h=createHash('sha256'),b=Buffer.allocUnsafe(1024*1024),fd=fs.openSync(file,'r');try{let n;while((n=fs.readSync(fd,b,0,b.length,null))>0)h.update(b.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
const parse=(s,label)=>{try{return JSON.parse(s);}catch{throw Error('Invalid JSON: '+label);}};
const bounded=(rows,limit,label)=>{must(rows.length<=limit,'Unexpected scope size; no truncated success: '+label);return rows;};
const uniq=items=>[...new Set(items)];
export function readScope(groupsFile,aliasesFile){
 const bytes=fs.readFileSync(groupsFile);must(sha(bytes)===AUDIT_SHA256,'Six-group audit bytes do not match the approved ID scope.');
 const groups=parse(bytes,'group audit');must(Array.isArray(groups)&&groups.length===6&&groups.every((g,i)=>g.group===GROUPS[i]),'Unexpected six-group scope.');
 const variants=new Map(),products=new Set();let occurrences=0;
 for(const g of groups)for(const p of g.candidates){
  must(productGid.test(p.productId),'Invalid scoped product ID.');products.add(p.productId);occurrences++;
  for(const v of p.matchingVariants){must(variantGid.test(v.id)&&!variants.has(v.id),'Invalid/duplicate scoped variant ID.');variants.set(v.id,{group:g.group,shopProductId:p.productId,variantId:v.id,shopStatusAtAudit:p.status,classification:p.classification});}
 }
 must(products.size===22&&variants.size===126&&occurrences===32,'Unexpected approved ID counts.');
 const aliasBytes=fs.readFileSync(aliasesFile);must(sha(aliasBytes)===ALIAS_SOURCE_SHA256,'Native alias evidence bytes mismatch.');
 const aliasEvidence=parse(aliasBytes,'native alias evidence');
 must(aliasEvidence.readOnly===true&&Array.isArray(aliasEvidence.rows),'Unsupported native alias evidence.');
 const aliases={groups:aliasEvidence.rows.map(a=>({...a,profileId:a.profileAlias,sourceSha256:a.sourceProductGroupSha256}))};
 // The final evidence adapter is deliberately narrow: only one exact alias and
 // local source UUID per audited group; provenance is not a live-target claim.
 must(Array.isArray(aliases.groups)&&aliases.groups.length===6,'Six exact native aliases required.');
 for(const g of groups){const a=aliases.groups.filter(a=>a.group===g.group);must(a.length===1&&a[0].localProvenanceOnly===true&&typeof a[0].profileId==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(a[0].profileId)&&a[0].sourceId===g.nativeTarget.source.id&&a[0].sourceRevision===g.nativeTarget.source.revision&&a[0].sourceSha256===g.nativeTarget.source.sha256,'Native alias must match the exact audited source pin.');}
 return {groups,variants,products:[...products],aliases:aliases.groups,auditSha256:sha(bytes),aliasesSha256:sha(aliasBytes),candidateOccurrences:occurrences};
}

export function inspectSmallTargetsCopy({copy,groupsFile,aliasesFile,tenantId,storeId,legacySingleStore=false}){
 must(tenantId===TENANT,'Explicit --tenant gravuru is required for this pinned scope.');
 must(['acryl','legacy'].includes(storeId),'Explicit --store-id acryl or legacy is required.');
 const scope=readScope(groupsFile,aliasesFile),file=copyPath(copy);
 must(/\.copy\.sqlite$/i.test(file),'A sealed .copy.sqlite file is required.');
 must(!/[\\/]private[\\/](?:acryl-employee-20261021-v1|mika-r15-resume-20261108-v1)[\\/]data[\\/]/i.test(file),'Known live directories are excluded.');
 for(const suffix of ['-wal','-journal'])must(!fs.existsSync(file+suffix)||fs.statSync(file+suffix).size===0,'Uncheckpointed sidecar; obtain a consistent standalone backup first.');
 const before=hashFile(file),db=new DatabaseSync(file,{readOnly:true});let result;
 try{
  db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000; BEGIN');
  const cols=t=>db.prepare('PRAGMA table_info('+t+')').all().map(x=>x.name);
  const need=(t,required)=>{const c=cols(t);must(required.every(x=>c.includes(x)),'Unsupported or missing schema: '+t);return c;};
  const p=need('products',['id','revision','published_revision','archived','kind']),r=need('product_revisions',['product_id','revision','status','document']),b=need('form_shop_bindings',['id','shop','variant_id','product_id','product_revision']);
  const modes=[p,r,b].map(c=>c.includes('tenant_id'));must(modes.every(x=>x===modes[0]),'Mixed tenant/legacy schema.');
  const scoped=modes[0];must(typeof legacySingleStore==='boolean'&&(scoped?!legacySingleStore:legacySingleStore),'Old single-store schema requires explicit --legacy-single-store true; tenant schema requires it absent.');
  const variants=[...scope.variants.keys()],marks=variants.map(()=>'?').join(','),numeric=variants.map(x=>x.split('/').at(-1)),issues=[],native=new Map();
  const scopedWhere=scoped?' AND tenant_id=?':'',tenantArgs=scoped?[tenantId]:[];
  function nativeRecord(id,revision){
   const key=JSON.stringify([id,revision]);if(native.has(key))return native.get(key);
   const heads=db.prepare('SELECT id,revision,published_revision,archived,kind FROM products WHERE id=?'+scopedWhere+' LIMIT 2').all(id,...tenantArgs);
   const rows=db.prepare('SELECT revision,status,document FROM product_revisions WHERE product_id=? AND revision=?'+scopedWhere+' LIMIT 2').all(id,revision,...tenantArgs);
   const out={cfgId:id,cfgRevision:revision,headFound:heads.length===1,revisionFound:rows.length===1,head:heads.length===1?heads[0]:null,revisionStatus:rows.length===1?rows[0].status:null};
   if(heads.length!==1||rows.length!==1)issues.push({code:'native_identity_missing_or_ambiguous',cfgId:id,cfgRevision:revision,headMatches:heads.length,revisionMatches:rows.length});
   if(rows.length===1){
    out.storedDocumentBytesSha256=sha(rows[0].document);
    try{const d=JSON.parse(rows[0].document);out.documentValidJson=true;out.documentSchema=typeof d?.schema==='string'?d.schema:null;out.idBindingDocumentSha256=bindingHash(d);}catch{out.documentValidJson=false;out.idBindingDocumentSha256=null;issues.push({code:'invalid_native_document_json',cfgId:id,cfgRevision:revision});}
   }
   native.set(key,out);return out;
  }
  const hcols=cols('shop_product_binding_heads'),brcols=cols('shop_product_binding_revisions');
  must(Boolean(hcols.length)===Boolean(brcols.length),'Incomplete active-binding schema; one required table is missing.');
  let heads=[],history=[];
  if(hcols.length){
   need('shop_product_binding_heads',['tenant_id','shop','variant_gid','revision']);need('shop_product_binding_revisions',['tenant_id','shop','variant_gid','revision','product_gid','store_id','binding_id','cfg_id','cfg_revision','document_sha256']);
   heads=bounded(db.prepare(`SELECT h.variant_gid AS requested_variant_gid,h.revision AS head_revision,r.product_gid,r.variant_gid,r.store_id,r.binding_id,r.cfg_id,r.cfg_revision,r.document_sha256,r.revision AS assignment_revision FROM shop_product_binding_heads h LEFT JOIN shop_product_binding_revisions r ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision WHERE h.tenant_id=? AND h.shop=? AND h.variant_gid IN (${marks}) ORDER BY h.variant_gid LIMIT 1001`).all(tenantId,SHOP,...variants),1000,'active heads');
   history=bounded(db.prepare(`SELECT product_gid,variant_gid,store_id,binding_id,cfg_id,cfg_revision,document_sha256,revision AS assignment_revision FROM shop_product_binding_revisions WHERE tenant_id=? AND shop=? AND variant_gid IN (${marks}) ORDER BY variant_gid,revision LIMIT 10001`).all(tenantId,SHOP,...variants),10000,'binding revision history');
  }
  const fixedVariants=[...numeric,...variants],fixedMarks=fixedVariants.map(()=>'?').join(',');
  const fixed=bounded(db.prepare(`SELECT id,shop,variant_id,product_id,product_revision FROM form_shop_bindings WHERE shop=? AND variant_id IN (${fixedMarks})${scopedWhere} ORDER BY variant_id,product_revision,id LIMIT 10001`).all(SHOP,...fixedVariants,...tenantArgs),10000,'historical fixed bindings');
  const fixedById=new Map();for(const row of fixed){if(!fixedById.has(row.id))fixedById.set(row.id,[]);fixedById.get(row.id).push(row);}
  const activeBindings=heads.map(row=>{
   const expected=scope.variants.get(row.requested_variant_gid),problems=[];
   if(row.assignment_revision===null)problems.push('head_revision_missing');
   else{
    if(row.product_gid!==expected.shopProductId)problems.push('shop_product_identity_mismatch');
    if(row.store_id!==storeId)problems.push('store_mismatch');
    const doc=nativeRecord(row.cfg_id,row.cfg_revision);if(!doc.revisionFound||!doc.headFound)problems.push('native_identity_unresolved');
    if(doc.idBindingDocumentSha256!==row.document_sha256)problems.push('native_document_hash_mismatch');
    const rows=fixedById.get(row.binding_id)||[];
    if(rows.length!==1)problems.push('fixed_binding_missing_or_ambiguous');
    else{const fixed=rows[0];if(fixed.variant_id!==row.variant_gid.split('/').at(-1)||fixed.product_id!==row.cfg_id||fixed.product_revision!==row.cfg_revision)problems.push('fixed_binding_identity_mismatch');}
   }
   if(problems.length)issues.push({code:'active_binding_conflict',variantId:row.requested_variant_gid,problems});
   return {group:expected.group,expectedShopProductId:expected.shopProductId,variantId:row.requested_variant_gid,headRevision:row.head_revision,shopProductId:row.product_gid,storeId:row.store_id,bindingId:row.binding_id,cfgId:row.cfg_id,cfgRevision:row.cfg_revision,documentSha256:row.document_sha256,assignmentRevision:row.assignment_revision,identityAndHashConsistent:problems.length===0,problems};
  });
  const activeKey=new Set(activeBindings.filter(x=>x.assignmentRevision!==null).map(x=>JSON.stringify([x.variantId,x.assignmentRevision])));
  const bindingRevisionHistory=history.map(row=>{nativeRecord(row.cfg_id,row.cfg_revision);return {group:scope.variants.get(row.variant_gid).group,expectedShopProductId:scope.variants.get(row.variant_gid).shopProductId,variantId:row.variant_gid,shopProductId:row.product_gid,storeId:row.store_id,bindingId:row.binding_id,cfgId:row.cfg_id,cfgRevision:row.cfg_revision,documentSha256:row.document_sha256,assignmentRevision:row.assignment_revision,isCurrentHead:activeKey.has(JSON.stringify([row.variant_gid,row.assignment_revision]))};});
  const historicalFixedBindings=fixed.map(row=>{const gid=row.variant_id.startsWith('gid://')?row.variant_id:'gid://shopify/ProductVariant/'+row.variant_id;nativeRecord(row.product_id,row.product_revision);return {group:scope.variants.get(gid).group,auditedShopProductId:scope.variants.get(gid).shopProductId,variantId:gid,storedVariantId:row.variant_id,bindingId:row.id,cfgId:row.product_id,cfgRevision:row.product_revision,referencedByCurrentHead:activeBindings.some(x=>x.bindingId===row.id&&x.variantId===gid),shopProductOwnershipProvenByThisRow:false};});
  // One exact current-revision alias query, plus six exact local source UUIDs.
  // No title, size, SKU or broad historical JSON scan; valid JSON CASE protects
  // malformed rows. Matches remain candidates, including archived/multiple ones.
  const aliases=uniq(scope.aliases.map(x=>x.profileId)),amarks=aliases.map(()=>'?').join(',');
  const aliasExpr="CASE WHEN json_valid(r.document) THEN CASE WHEN json_extract(r.document,'$.schema')='gravuru-product/v1' THEN json_extract(r.document,'$.config.profile.id') ELSE NULL END ELSE NULL END";
  const aliasRows=bounded(db.prepare(`SELECT p.id,p.revision,p.published_revision,p.archived,p.kind,r.status AS revision_status,${aliasExpr} AS profile_alias FROM products p JOIN product_revisions r ON r.product_id=p.id AND r.revision=p.revision ${scoped?'AND r.tenant_id=p.tenant_id':''} WHERE ${aliasExpr} IN (${amarks}) ${scoped?'AND p.tenant_id=? AND r.tenant_id=?':''} ORDER BY p.id LIMIT 601`).all(...aliases,...(scoped?[tenantId,tenantId]:[])),600,'exact native aliases');
  const nativeAliasCandidates=aliasRows.map(row=>{nativeRecord(row.id,row.revision);return {match:'current_exact_profile_alias',groups:scope.aliases.filter(x=>x.profileId===row.profile_alias).map(x=>x.group),profileAlias:row.profile_alias,cfgId:row.id,cfgRevision:row.revision,publishedRevision:row.published_revision,archived:row.archived,kind:row.kind,revisionStatus:row.revision_status};});
  for(const alias of aliases)must(nativeAliasCandidates.filter(x=>x.profileAlias===alias).length<=100,'More than 100 exact alias matches; no implicit winner.');
  const nativeSourceIdCandidates=[];
  for(const a of scope.aliases){const rows=db.prepare('SELECT id,revision,published_revision,archived,kind FROM products WHERE id=?'+scopedWhere+' LIMIT 2').all(a.sourceId,...tenantArgs);must(rows.length<=1,'Ambiguous exact source UUID.');if(rows.length){const row=rows[0];nativeRecord(row.id,row.revision);nativeSourceIdCandidates.push({match:'exact_local_v9_source_uuid',group:a.group,cfgId:row.id,cfgRevision:row.revision,publishedRevision:row.published_revision,archived:row.archived,kind:row.kind,liveTargetIdentityNotAssumed:true});}}
  const perGroup=scope.groups.map(g=>({group:g.group,auditedCandidateProducts:g.candidates.map(p=>({shopProductId:p.productId,shopStatusAtAudit:p.status,classification:p.classification,relevantVariantCount:p.matchingVariants.length})),relevantVariants:[...scope.variants.values()].filter(x=>x.group===g.group).length,activeHeadRows:activeBindings.filter(x=>x.group===g.group).length,consistentActiveBindingRows:activeBindings.filter(x=>x.group===g.group&&x.identityAndHashConsistent).length,activeCfgRevisions:uniq(activeBindings.filter(x=>x.group===g.group&&x.cfgId).map(x=>JSON.stringify([x.cfgId,x.cfgRevision]))).map(x=>JSON.parse(x)),historicalFixedBindingRows:historicalFixedBindings.filter(x=>x.group===g.group).length,nativeAliasCandidates:nativeAliasCandidates.filter(x=>x.groups.includes(g.group)).map(x=>({cfgId:x.cfgId,cfgRevision:x.cfgRevision,archived:x.archived})),exactLocalSourceIdCandidates:nativeSourceIdCandidates.filter(x=>x.group===g.group).map(x=>({cfgId:x.cfgId,cfgRevision:x.cfgRevision})),decision:'No winner selected; this inventory does not authorize creation, update or activation.'}));
  result={schema:'gravuru-small-native-target-copy-inventory/v1',readOnly:true,inventoryCompleted:true,readyForImport:false,storeWrites:0,shopifyWrites:0,tenantId,storeId,shopDomain:SHOP,productScope:scoped?'tenant-filtered':'explicit-single-store-gravuru-legacy',scope:{auditSha256:scope.auditSha256,aliasesSha256:scope.aliasesSha256,groups:6,uniqueShopProducts:22,groupCandidateOccurrences:32,relevantVariants:126,otherProductVariantsInspected:false},activeBindingSchemaAvailable:Boolean(hcols.length),missingBindingTables:hcols.length?[]:['shop_product_binding_heads','shop_product_binding_revisions'],activeBindings,bindingRevisionHistory,historicalFixedBindings,nativeAliasCandidates,nativeSourceIdCandidates,nativeCfgRevisions:[...native.values()],perGroup,variantsWithoutCurrentHead:variants.filter(v=>!activeBindings.some(x=>x.variantId===v)),issues,limits:['No live database or current Shopify inventory was read.','No current head is NOT proof of no existing native product or historical assignment.','Historical fixed bindings do not prove current Shopify product ownership.','Six exact current profile aliases and local source UUIDs identify candidates only; multiple matches never select a winner.','Only the 126 relevant variants are inspected, not all 2477 variants of the 22 products.','This is no native resolveMany execution, full asset validation, permission, price approval or import capability.']};
 }finally{if(db.isTransaction)db.exec('ROLLBACK');db.close();const after=hashFile(file);must(after===before,'Copy changed during the read; result cannot be used.');}
 return {...result,copyEvidence:{fileName:path.basename(file),sha256:before,unchanged:true,hashReadChunkBytes:1024*1024}};
}
if(isCLI(import.meta.url))try{
 const a=argumentsOf(process.argv.slice(2),['--copy','--groups','--native-aliases','--tenant','--store-id','--legacy-single-store']);
 for(const key of ['--copy','--groups','--native-aliases','--tenant','--store-id'])must(a[key],'Missing argument: '+key);
 must(a['--legacy-single-store']===undefined||a['--legacy-single-store']==='true','Only explicit --legacy-single-store true is allowed.');
 printResult(inspectSmallTargetsCopy({copy:a['--copy'],groupsFile:a['--groups'],aliasesFile:a['--native-aliases'],tenantId:a['--tenant'],storeId:a['--store-id'],legacySingleStore:a['--legacy-single-store']==='true'}));
}catch(error){console.error(JSON.stringify({readOnly:true,inventoryCompleted:false,error:error.message}));process.exitCode=1;}
