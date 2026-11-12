import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export const groupHash=x=>sha(JSON.stringify(canonical(x))); // Native ProductGroup, NOT ID-binding hash.
export const writeNew=(p,b)=>fs.writeFile(p,b,{flag:'wx'});
export const writeJson=(p,v)=>writeNew(p,JSON.stringify(v,null,2)+'\n');
export function argumentsFor(argv,required,flags=[]){const result={};for(let i=0;i<argv.length;i++){const k=argv[i].replace(/^--/,'');assert(required.includes(k)||flags.includes(k),'Unknown argument '+argv[i]);assert(!(k in result),'Duplicate argument');result[k]=flags.includes(k)?true:argv[++i];}for(const k of required)assert.equal(typeof result[k],'string','Missing --'+k);return result;}
const isSha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)&&x!=='0'.repeat(64);
const pin=(p,prefix)=>{assert(p&&typeof p.id==='string'&&p.id.startsWith(prefix));assert(Number.isSafeInteger(p.revision)&&p.revision>0);};
const same=(a,b,message)=>assert.equal(groupHash(a),groupHash(b),message);
function normalized(d){d=structuredClone(d);d.profileAssignments.motifs.profileId=null;if(d.config.moduleProfile)d.config.moduleProfile.id=null;return d;}
async function jsonPin(base,p){assert(p&&isSha(p.sha256)&&typeof p.path==='string','Actual file pin required');const filename=path.resolve(base,p.path);assert(filename.startsWith(path.resolve(base)+path.sep),'Input must remain inside input package');const b=await fs.readFile(filename);assert.equal(sha(b),p.sha256,'Input bytes differ: '+p.path);return JSON.parse((p.path.endsWith('.gz')?gunzipSync(b):b).toString('utf8'));}
export async function loadInputs(args){
 const workspace=path.resolve(args.workspace),input=path.resolve(args.input),bytes=await fs.readFile(input);
 assert(isSha(args['input-sha256']),'Real received input index SHA required');assert.equal(sha(bytes),args['input-sha256']);
 const pack=JSON.parse(bytes),base=path.resolve(workspace,pack.recordsRoot),referencePath=new URL('./v9-reference.json',import.meta.url);
 assert(base.startsWith(workspace+path.sep),'Received records must remain in workspace');
 const referenceBytes=await fs.readFile(referencePath),reference=JSON.parse(referenceBytes);
 assert.equal(pack.schema,'gravuru-six-copy-plan-excel-input/v1');assert.equal(pack.environment,'isolated-copy');
 assert.equal(pack.confirmations,0);assert.equal(pack.executions,0);assert.equal(pack.shopifyWrites,0);assert.equal(pack.approvalHash,null);
 assert.equal(pack.tenantId,'gravuru');assert(typeof pack.storeId==='string'&&pack.storeId.length>0);
 assert(/^https:\/\/github\.com\/Chris83638w\/gravuru-2027\/issues\/(168|230)#issuecomment-\d+$/.test(pack.evidenceSource),'Actual operator evidence URL required');
 assert(/^[0-9a-f]{40}$/.test(pack.sourceCommit),'Actual full operator source commit required');
 const report=await jsonPin(base,pack.nativePins),compact=await jsonPin(base,pack.compactServerValues); // Pinned operator reconstruction evidence, not a new DB check.
 assert.equal(report.schema,'gravuru-sechsgruppen-kopienrecords/v1');assert.equal(report.confirm,0);assert.equal(report.execute,0);
 assert.equal(compact.confirm,0);assert.equal(compact.execute,0);assert.equal(compact.tenant,'gravuru');
 assert.equal(report.herkunft.kompaktSha256,pack.compactServerValues.sha256);
 assert.equal(report.herkunft.testbelegSha256,compact.belegSha256);assert.equal(report.zuordnung.length,6);
 assert.equal(pack.recordProvenance,'local-reconstruction-matched-to-server-canonical-hashes');
 const module=await jsonPin(base,pack.moduleProfile),motif=await jsonPin(base,pack.motifProfile);
 pin(module,'cmp_');pin(motif,'prf_');assert.equal(module.sha256,groupHash(module.document));
 same(module.document,reference.records[0].moduleDocument,'Confirmed module contents changed');
 assert.equal(motif.type,'motifs');same({name:motif.name,type:motif.type,items:motif.items},reference.motifDocument,'Confirmed 13-motif profile changed');
 const motifStoredHash=sha(JSON.stringify({name:motif.name,type:motif.type,items:motif.items})); // Native profileData/appendProfile field order.
 assert.equal(motifStoredHash,reference.motifStoredDocumentSha256);
 assert.equal(pack.records?.length,6);assert.equal(new Set(pack.records.map(x=>x.key)).size,6);
 const records=[];
 for(const ref of reference.records){
  const row=pack.records.find(x=>x.key===ref.key);assert(row,'Missing exact v9 product key '+ref.key);
  assert.equal(row.originalWorkbookSha256,ref.originalSha256);assert.equal(row.creationKey,ref.creationKey);
  assert.equal(ref.creationKey,'issue230-'+ref.originalSha256);
  assert.equal(sha(await fs.readFile(path.join(workspace,ref.previous))),ref.previousSha256,'Previous workbook changed');
  assert.equal(sha(await fs.readFile(path.join(workspace,ref.original))),ref.originalSha256,'Original price workbook changed');
  const plan=await jsonPin(base,row.plan),template=await jsonPin(base,row.template),source=await jsonPin(base,row.sourceDocument),metadataFile=await jsonPin(base,row.sourceMetadata);
  assert(metadataFile.revisionMetadata&&metadataFile.kennzeichnung?.startsWith('KOPIEN-ID'),'Received metadata wrapper required');
  const metadata=metadataFile.revisionMetadata;
  const operator=report.zuordnung.find(x=>x.gruppe===ref.key),server=compact.g.find(x=>x.o===ref.key);assert(operator&&server,'Missing actual operator group evidence');
  assert.equal(operator.originalWorkbookSha256,ref.originalSha256);assert.equal(operator.creationKey,ref.creationKey);
  assert.equal(operator.kopie.plan.id,plan.id);assert.equal(operator.kopie.plan.planHash,plan.planHash);assert.equal(server.p.id,plan.id);assert.equal(server.p.planHash,plan.planHash);
  assert.equal(plan.schema,'gravuru-product-group-creation-plan/v1');assert.equal(plan.valid,true);same(plan.issues,[]);
  assert.equal(plan.localOnly,true);assert.equal(plan.published,false);assert.equal(plan.shopifyWrites,0);assert(plan.id?.startsWith('pgp_'));
  const {id,planHash,createdAt,...body}=plan;assert(isSha(planHash));assert.equal(groupHash(body),planHash,'Native planHash differs');
  assert.equal(Buffer.byteLength(JSON.stringify(canonical(body))),operator.kopie.plan.dokumentBytes,'Native plan document byte length');
  assert.equal(operator.kopie.plan.dokumentBytes,server.p.dokumentBytes);
  assert.equal(plan.creationKey,ref.creationKey);assert.equal(plan.products.length,1);assert.equal(plan.sources.length,1);assert.equal(plan.moduleProfiles.length,1);
  pin(template,'pgt_');assert.equal(template.id,plan.templateId);assert.equal(template.revision,plan.templateRevision);
  assert.equal(groupHash(template.document),template.sha256);assert.equal(template.sha256,plan.templateHash);same(template.document.openQuestions,[]);
  assert.equal(template.document.targets.length,1);same(template.document.scope,plan.scope);
  const src=plan.sources[0];pin({id:src.productId,revision:src.revision},'cfg_');assert.equal(groupHash(source),src.sha256);
  assert.equal(operator.kopie.quelle.id,src.productId);assert.equal(operator.kopie.quelle.revision,src.revision);assert.equal(operator.kopie.quelle.sha256,src.sha256);
  assert.equal(operator.kopie.vorlage.id,template.id);assert.equal(operator.kopie.vorlage.revision,template.revision);assert.equal(operator.kopie.vorlage.sha256,template.sha256);
  assert.equal(pickOperatorPin(operator.kopie.modulprofil),pickOperatorPin(module));
  assert.equal(pickOperatorPin(operator.kopie.motivprofil),pickOperatorPin(motif));
  same(template.document.targets[0].source,{productId:src.productId,revision:src.revision});
  same(template.document.targets[0].moduleProfile,{id:module.id,revision:module.revision});
  assert.equal(groupHash(normalized(source)),ref.sourceNormalizedSha256,'Source changes exceed motif-ID mapping');
  assert.equal(source.profileAssignments.motifs.profileId,motif.id);
  const resolved=metadata.profiles;assert(resolved,'Actual native source metadata required');same(resolved.selections.motifs,motif.items);
  assert.equal(resolved.sources.motifs.profileId,motif.id);assert.equal(resolved.sources.motifs.profileRevision,motif.revision);
  const p=plan.products[0];assert.equal(p.key,ref.key);assert.equal(p.importKey,ref.importKey);assert.equal(p.existingProductId,null);
  assert.equal(p.targetKey,template.document.targets[0].key);assert.equal(p.targetKey,src.key);assert.equal(p.sourceRevision,src.revision);
  same(plan.requestedProducts,[{key:p.key,targetKey:p.targetKey,name:p.name}]);
  assert.equal(p.fingerprint,groupHash(p.document));assert.equal(groupHash(normalized(p.document)),ref.compiledNormalizedSha256,'Compiled changes exceed motif/module ID mapping');
  for(const field of ['variantReview','geometry','material','optionGroups','optionFields','price','options'])same(p[field],ref[field],'Unchanged v9 '+field+' differs');
  assert.equal(p.combinationCount,ref.variantReview.length);same(p.moduleProfile.modules,module.document.modules);
  same(plan.moduleProfiles,[{id:module.id,revision:module.revision,sha256:module.sha256}]);
  assert.equal(p.document.config.moduleProfile.id,module.id);assert.equal(p.document.config.moduleProfile.revision,module.revision);
  assert.equal(p.document.config.photo.enabled,false);assert.equal(p.document.config.logo.enabled,false);
  assert.equal(source.config.profile.designs.length,27);same(source.config.profile.designs.map(x=>x.id),ref.designs);
  records.push({ref,plan:{id:plan.id,planHash:planHash,creationKey:plan.creationKey},template,sourcePin:src,metadata,module,motif,motifStoredHash,input:row,variantReview:p.variantReview,
    sourceMetadataGroupSha256:groupHash(metadata),resourceResolutionGroupSha256:groupHash(resolved),
    modulePin:{id:module.id,revision:module.revision,sha256:module.sha256},motifPin:{id:motif.id,revision:motif.revision,storedDocumentSha256:motifStoredHash}});
 }
 assert.equal(records.reduce((n,r)=>n+r.variantReview.length,0),45);
 return {pack,inputSha256:sha(bytes),referenceSha256:sha(referenceBytes),records};
}
const pickOperatorPin=p=>`${p.id}@${p.revision}`;
