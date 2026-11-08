// Mikail, 06.11.2026: before EACH new product, show and confirm all actual
// options for that exact scope. Examples are not product rules. See the central
// handoff sections 12/13. Reuse native geometry/pricing/validation; no shop IO.
import {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import {tenantOption} from './tenant.mjs';
import {resolvedOptions,quote,variantCombinations,selectedProfile} from '../configurator/variant-m/contract.mjs';
import {isFamilyFormats,familyFormatSelection,FAMILY_FORMS,customerForm} from '../configurator/variant-m/family-formats.mjs';
import {applyModuleProfile,nativeModuleAvailability} from '../configurator/variant-m/module-profile.mjs';

export const PRODUCT_GROUP_TEMPLATE_SCHEMA='gravuru-product-group-template/v1';
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const copy=v=>structuredClone(v);
const canonical=v=>Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const json=v=>JSON.stringify(canonical(v));
const hash=v=>createHash('sha256').update(json(v)).digest('hex');
const same=(a,b)=>json(a)===json(b);
function keys(v,required,optional=[]){if(!plain(v)||required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>![...required,...optional].includes(k)))fail(422,'group_fields','Felder fehlen oder sind unbekannt.');}
function label(v,max=160){if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x1f]/.test(v))fail(422,'group_label','Bitte eine gültige Bezeichnung angeben.');return v.trim();}
function identifier(v){if(typeof v!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v))fail(422,'group_identifier','Eine eindeutige Kennung fehlt.');return v;}
function version(v){if(!Number.isSafeInteger(v)||v<1)fail(422,'group_revision','Ein fester Versionsstand fehlt.');return v;}
const optionalId=v=>v===null?null:identifier(v);
const actorName=({actor}={})=>label(actor||'werkstatt',160);
const omit=(value,names)=>Object.fromEntries(Object.entries(value).filter(([key])=>!names.includes(key)));
function subset(values,source,mutable,what){
 if(!Array.isArray(values)||values.length>source.length)fail(422,'group_option_source',what+': nur vorhandene Möglichkeiten auswählen.');
 const ids=new Set();
 for(const value of values){
  const original=source.find(v=>v.id===value?.id);
  if(!original||ids.has(value.id)||!same(omit(value,mutable),omit(original,mutable)))fail(422,'group_option_source',what+': Preise, Regeln und technische Werte müssen aus der gespeicherten Quelle stammen.');
  ids.add(value.id);
 }
}

// The confirmation must show the complete offered product, including formats
// outside the root preview. Use the same combinations and quote as the cart.
export function productGroupVariantReview(config,combinations=variantCombinations(config)){
 if(combinations.length>10000)fail(422,'group_combinations_limit','Mehr als 10.000 Kombinationen: den Anlageumfang für die vollständige Prüfung aufteilen.');
 return combinations.map(options=>{
  const p=selectedProfile(config,options),family=isFamilyFormats(config)?familyFormatSelection(config,options):null;
  const choices=Object.entries(options).map(([id,value])=>{
   const group=p.optionGroups.find(g=>g.id===id),choice=group?.values.find(v=>v.id===value);
   const label=family&&id==='mounting'?family.mounting.label:family&&id==='size'?family.format.label:family&&id==='color'?config.familyFormats.colors.find(c=>c.id===value)?.label:null;
   return {id,label:group?.name||id,value,display:label||choice?.label||String(value)};
  });
  return {options:copy(options),form:family?{id:family.format.form,label:FAMILY_FORMS.find(([id])=>id===customerForm(family.format.form))?.[1]||family.format.form}:null,
   sizeKey:family?.format.key??options.size??null,widthMm:p.geometry.width,heightMm:p.geometry.height,material:copy(p.material),choices,
   unitCents:quote(config,[],p.defaultDesignId,options).unitCents};
 });
}

/** All targets are supplied by the authoritative family/gallery adapter. A
 * profile name, SKU, material label or design slug is never parsed for IDs.
 * The template/plan tables share the repository file, but use a separate read
 * connection during its guarded write transaction. Product writes go through
 * the existing repository/import journal, not a second product store. */
export function createProductGroupTemplates({filename,repository,tenantId,targets=()=>[],offeringFor=()=>null,moduleProfiles=null}={}){
 const tenant=tenantOption({tenantId:tenantId??repository?.tenantId});
 if(!repository||repository.tenantId!==tenant||typeof repository.validate!=='function'||typeof repository.importBatch!=='function')throw Error('Tenant-scoped native repository required');
 if(typeof filename!=='string'||!filename)throw Error('Product group database filename required');
 if(moduleProfiles&&moduleProfiles.tenantId!==tenant)throw Error('Module profiles must belong to the same tenant');
 const db=new DatabaseSync(filename);db.exec(`PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS product_group_templates(tenant_id TEXT NOT NULL,id TEXT NOT NULL,revision INTEGER NOT NULL,PRIMARY KEY(tenant_id,id));
 CREATE TABLE IF NOT EXISTS product_group_template_revisions(tenant_id TEXT NOT NULL,id TEXT NOT NULL,revision INTEGER NOT NULL,document TEXT NOT NULL,sha256 TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(tenant_id,id,revision));
 CREATE TABLE IF NOT EXISTS product_group_creation_plans(tenant_id TEXT NOT NULL,id TEXT NOT NULL,document TEXT NOT NULL,sha256 TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(tenant_id,id));
 CREATE TABLE IF NOT EXISTS product_group_confirmations(tenant_id TEXT NOT NULL,id TEXT NOT NULL,plan_id TEXT NOT NULL,plan_hash TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(tenant_id,id),UNIQUE(tenant_id,plan_id,plan_hash));
 CREATE TABLE IF NOT EXISTS product_group_creation_results(tenant_id TEXT NOT NULL,plan_id TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(tenant_id,plan_id));
 CREATE TRIGGER IF NOT EXISTS product_group_revision_immutable BEFORE UPDATE ON product_group_template_revisions BEGIN SELECT RAISE(ABORT,'Template revisions are immutable');END;
 CREATE TRIGGER IF NOT EXISTS product_group_revision_retained BEFORE DELETE ON product_group_template_revisions BEGIN SELECT RAISE(ABORT,'Template revisions are immutable');END;
 CREATE TRIGGER IF NOT EXISTS product_group_plan_immutable BEFORE UPDATE ON product_group_creation_plans BEGIN SELECT RAISE(ABORT,'Creation plans are immutable');END;
 CREATE TRIGGER IF NOT EXISTS product_group_confirmation_immutable BEFORE UPDATE ON product_group_confirmations BEGIN SELECT RAISE(ABORT,'Creation confirmations are immutable');END;`);
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
 function offering(scope){
  const value=offeringFor(copy(scope));if(value===null||value===undefined)return null;
  if(!plain(value)||!Array.isArray(value.familyIds)||value.familyIds.some(id=>typeof id!=='string')||new Set(value.familyIds).size!==value.familyIds.length||typeof value.fingerprint!=='string'||!value.fingerprint||value.fingerprint.length>200)fail(422,'group_offering_invalid','Die bestätigte Materialauswahl der Unterkategorie ist nicht vollständig.');
  return {familyIds:value.familyIds.map(identifier).sort(),fingerprint:value.fingerprint};
 }
 function registry(){
  const rows=typeof targets==='function'?targets():targets;
  if(!Array.isArray(rows))throw Error('Authoritative product target list required');
  const map=new Map();
  for(const raw of rows){
   const key=identifier(raw.key),target={key,productId:identifier(raw.productId),familyId:optionalId(raw.familyId??null),sizeKey:optionalId(raw.sizeKey??null)};
   if(map.has(key)&&!same(map.get(key),target))fail(409,'group_target_ambiguous','Eine Produktquelle ist mehrdeutig zugeordnet.');map.set(key,target);
  }
  return map;
 }
 function sourceLookup(){
  // One operation owns its compact registry and at most TWO native records in
  // total (current + historical share the limit). Fonts/images can be large:
  // source listings must never retain a full document for every gallery product.
  // Confirm and both execute checks create fresh lookups, never a service cache.
  let targets;const records=new Map(),recordLimit=2;
  const read=(key,load)=>{
   let entry=records.get(key);
   if(entry){records.delete(key);records.set(key,entry);}
   else{
    // Evict before loading so a third full native document is not accumulated.
    if(records.size>=recordLimit)records.delete(records.keys().next().value);
    try{entry={value:load()};}catch(error){entry={error};}records.set(key,entry);
   }
   if(Object.hasOwn(entry,'error'))throw entry.error;return entry.value;
  };
  return {get targets(){return targets??=registry();},source(key,revision){
   const target=(targets??=registry()).get(key);if(!target)fail(404,'group_source_missing','Die Produktquelle ist nicht mehr zugeordnet.');
   const current=read('head:'+target.productId,()=>repository.get(target.productId));
   const requested=revision===undefined?current.revision:version(revision);
   const record=requested===current.revision?current:read('revision:'+target.productId+':'+requested,()=>repository.get(target.productId,{revision:requested})),document=record.document,p=document.config?.profile;
   if(current.status==='archived'||current.document.kind!=='product'||!p||!Array.isArray(p.optionGroups))fail(422,'group_source_unsupported','Für diese Quelle fehlt ein aktiver nativer Produktstand mit Optionsbereichen.');
   return {target,current,record,document};
  }};
 }
 function sourceView(key,lookup){
  const {target,record,document}=lookup.source(key),p=document.config.profile;
  let currentOptions=null,currentPrice=null,issue=null;
  try{currentOptions=resolvedOptions(document.config,{});currentPrice=quote(document.config,[],p.defaultDesignId,currentOptions);}catch(error){issue=error.message;}
  return {...target,name:document.name,label:document.name,source:{productId:record.id,revision:record.revision},material:copy(p.material),geometry:copy(p.geometry),
   optionGroups:copy(p.optionGroups),optionFields:copy(p.optionFields||[]),optionsManagedByFormat:!!(document.config.familyFormats||document.config.scalableSizes||document.config.steelFormats||document.config.doorbell?.formats),moduleAvailability:nativeModuleAvailability(document.config),currentOptions,currentPrice,
   issues:[...(!target.familyId?['Familienzuordnung offen.']:[]),...(!target.sizeKey?['Größenzuordnung offen.']:[]),...(issue?[issue]:[])]};
 }
 function pinnedModule(reference){
  if(reference===undefined)return null;
  keys(reference,['id','revision']);identifier(reference.id);version(reference.revision);
  if(!moduleProfiles)fail(503,'group_module_library_missing','Die Modulbibliothek ist noch nicht verbunden.');
  return moduleProfiles.get(reference.id,{revision:reference.revision});
 }
 function validateWithSources(input,lookup){
  keys(input,['schema','name','scope','targets','openQuestions']);
  if(input.schema!==PRODUCT_GROUP_TEMPLATE_SCHEMA)fail(422,'group_schema','Unbekanntes Vorlagenformat.');
  const d=copy(input);d.name=label(d.name);keys(d.scope,['lineId','subcategoryId']);identifier(d.scope.lineId);identifier(d.scope.subcategoryId);
  if(!Array.isArray(d.targets)||!d.targets.length||d.targets.length>100)fail(422,'group_targets','Bitte 1 bis 100 konkrete Material-/Größenstände zuordnen.');
  if(!Array.isArray(d.openQuestions)||d.openQuestions.length>100)fail(422,'group_questions','Offene Angaben als Liste führen.');d.openQuestions=d.openQuestions.map(v=>label(v,1000));
  const seen=new Set();
  for(const t of d.targets){
   keys(t,['key','source','familyId','sizeKey','material','optionGroups','optionFields'],['moduleProfile']);identifier(t.key);keys(t.source,['productId','revision']);version(t.source.revision);
   if(seen.has(t.key))fail(422,'group_targets','Eine Material-/Größenzuordnung ist doppelt.');seen.add(t.key);
   const {target,document}=lookup.source(t.key,t.source.revision),p=document.config.profile;
   if(t.source.productId!==target.productId||t.familyId!==target.familyId||t.sizeKey!==target.sizeKey||!same(t.material,p.material))fail(409,'group_source_changed','Material, Familie oder Größe widersprechen der gespeicherten Produktquelle.');
   const selectedModule=pinnedModule(t.moduleProfile);if(selectedModule)applyModuleProfile(document.config,selectedModule.profile);
   subset(t.optionGroups,p.optionGroups,['name','required','defaultValueId','values'],'Optionsbereiche');
   for(const g of t.optionGroups){const base=p.optionGroups.find(v=>v.id===g.id);label(g.name,100);subset(g.values,base.values,['label'],'Auswahlmöglichkeiten');if(typeof g.required!=='boolean'||!g.values.length||!g.values.some(v=>v.id===g.defaultValueId))fail(422,'group_option_selection','Jeder Bereich braucht eine ausdrückliche Standardauswahl aus seinen angebotenen Werten.');for(const v of g.values)label(v.label,100);}
   subset(t.optionFields,p.optionFields||[],['label','required','choices'],'Zusatzfelder');
   for(const f of t.optionFields){label(f.label,80);if(f.required!==undefined&&typeof f.required!=='boolean')fail(422,'group_option_selection','Pflichtangabe prüfen.');if(f.kind==='select'){const base=p.optionFields.find(v=>v.id===f.id);subset(f.choices,base.choices,['label'],'Feldauswahl');for(const c of f.choices)label(c.label,100);}}
  }
  return d;
 }
 function validate(input){return validateWithSources(input,sourceLookup());}
 function compile(t,name,lookup){
  const {record,document}=lookup.source(t.key,t.source.revision),d=copy(document);
  // Older format selectors keep additional option definitions inside their
  // format records. A profile-only edit must never appear saved while those
  // records still offer the removed values. Their existing adapters remain
  // authoritative; this service does not manufacture a second format model.
  const c=d.config,p=c.profile,dynamic=c.familyFormats||c.scalableSizes||c.steelFormats||c.doorbell?.formats;
  if(dynamic&&(!same(t.optionGroups,p.optionGroups)||!same(t.optionFields,p.optionFields||[])))fail(422,'group_options_adapter_required','Diese Mehrformat-Vorlage verwaltet Ausführungen auch in ihren Formatdaten. Die gewünschte Einschränkung muss zuerst im zugehörigen Produktadapter hinterlegt werden. Es wurde nichts angelegt.');
  d.kind='product';d.name=label(name,200);d.seo.title=d.name.slice(0,70);
  d.config.profile.optionGroups=copy(t.optionGroups);
  if(t.optionFields.length)d.config.profile.optionFields=copy(t.optionFields);else delete d.config.profile.optionFields;
  const selectedModule=pinnedModule(t.moduleProfile);if(selectedModule)d.config=applyModuleProfile(d.config,selectedModule.profile);
  // These are local drafts even if the source has a separately published head.
  // Existing geometry, source assets, designs, prices, metadata and rights remain
  // on the normal document validator path. No direct customer capability edits.
  const validated=repository.validate(d),options=resolvedOptions(validated.config,{});
  if(!same(validated.config.profile.optionGroups,t.optionGroups)||!same(validated.config.profile.optionFields||[],t.optionFields))fail(422,'group_option_normalization','Der Produktadapter verändert die angebotenen Optionen. Den tatsächlichen Ausgangsstand zuerst prüfen.');
  // A bounded preflight avoids materialising an exponential Cartesian product;
  // this is a technical batch limit, not a new product/pricing rule.
  if(validated.config.profile.optionGroups.reduce((n,g)=>n*g.values.length,1)>10000)fail(422,'group_combinations_limit','Mehr als 10.000 mögliche Kombinationen: den konkreten Anlageplan für die vollständige Prüfung aufteilen.');
  const combinations=variantCombinations(validated.config),variantReview=productGroupVariantReview(validated.config,combinations);
  if(selectedModule&&!same(validated.config.moduleProfile,selectedModule.profile))fail(422,'group_module_normalization','Das Produktmodell hat die Modulfreigabe nicht vollständig übernommen.');
  return {document:validated,sourceRevision:record.revision,options,combinationCount:combinations.length,variantReview,price:quote(validated.config,[],validated.config.profile.defaultDesignId,options),...(selectedModule?{moduleProfile:{id:selectedModule.id,revision:selectedModule.revision,sha256:selectedModule.sha256,name:selectedModule.document.name,modules:copy(selectedModule.profile.modules)}}:{})};
 }
 function get(id,{revision}={}){
  identifier(id);if(revision!==undefined)version(revision);
  const r=db.prepare('SELECT r.* FROM product_group_template_revisions r JOIN product_group_templates h ON h.tenant_id=r.tenant_id AND h.id=r.id WHERE r.tenant_id=? AND r.id=? AND r.revision=COALESCE(?,h.revision)').get(tenant,id,revision??null);
  if(!r)fail(404,'group_template_missing','Produktgruppen-Vorlage nicht gefunden.');
  return {id:r.id,revision:r.revision,document:JSON.parse(r.document),sha256:r.sha256,actor:r.actor,createdAt:r.created_at};
 }
 function append(id,revision,document,actor){db.prepare('INSERT INTO product_group_template_revisions VALUES(?,?,?,?,?,?,?)').run(tenant,id,revision,json(document),hash(document),actor,new Date().toISOString());return get(id,{revision});}
 function readPlan(id){
  identifier(id);const r=db.prepare('SELECT * FROM product_group_creation_plans WHERE tenant_id=? AND id=?').get(tenant,id);
  if(!r)fail(404,'group_plan_missing','Anlageplan nicht gefunden.');return {id:r.id,planHash:r.sha256,...JSON.parse(r.document),createdAt:r.created_at};
 }
 function currentPlan(plan){
  const template=get(plan.templateId);
  if(template.revision!==plan.templateRevision||template.sha256!==plan.templateHash)fail(409,'group_confirmation_stale','Die Vorlage wurde geändert. Den neuen konkreten Anlageplan erneut bestätigen.');
  for(const ref of plan.moduleProfiles||[]){const latest=moduleProfiles?.get(ref.id);if(!latest||latest.revision!==ref.revision||latest.sha256!==ref.sha256)fail(409,'group_module_profile_changed','Ein Modulprofil wurde geändert. Den neuen Stand auswählen und die Optionen erneut bestätigen.');}
  if(!plan.offering||!same(offering(plan.scope),plan.offering))fail(409,'group_offering_changed','Die Materialauswahl der Unterkategorie wurde geändert oder ist noch offen. Den Anlageplan neu prüfen und bestätigen.');
  const lookup=sourceLookup();validateWithSources(template.document,lookup);
  for(const s of plan.sources){const {current,record}=lookup.source(s.key,s.revision);if(current.revision!==s.revision||hash(record.document)!==s.sha256)fail(409,'group_source_changed','Eine Produktquelle wurde geändert. Den Anlageplan neu erstellen und bestätigen.');}
  if(!plan.valid)fail(422,'group_plan_open','Offene Angaben oder ungültige Kombinationen zuerst klären.');
 }
 const resultRow=id=>db.prepare('SELECT document FROM product_group_creation_results WHERE tenant_id=? AND plan_id=?').get(tenant,id);
 const service={tenantId:tenant,
  sources(){const lookup=sourceLookup();return [...lookup.targets.keys()].map(key=>{try{return sourceView(key,lookup);}catch(e){return {...lookup.targets.get(key),label:key,issues:[e.message],unsupported:true};}});},
  draft(input){keys(input,['name','scope','sourceKeys']);if(!Array.isArray(input.sourceKeys))fail(422,'group_targets','Produktquellen auswählen.');const lookup=sourceLookup();return validateWithSources({schema:PRODUCT_GROUP_TEMPLATE_SCHEMA,name:input.name,scope:input.scope,targets:input.sourceKeys.map(key=>{const s=sourceView(key,lookup);return {key:s.key,source:s.source,familyId:s.familyId,sizeKey:s.sizeKey,material:s.material,optionGroups:s.optionGroups,optionFields:s.optionFields};}),openQuestions:[]},lookup);},
  validate,get,
  list:()=>db.prepare('SELECT id FROM product_group_templates WHERE tenant_id=? ORDER BY rowid DESC').all(tenant).map(r=>get(r.id)),
  history:id=>{get(id);return db.prepare('SELECT revision FROM product_group_template_revisions WHERE tenant_id=? AND id=? ORDER BY revision DESC').all(tenant,id).map(r=>get(id,{revision:r.revision}));},
  create:(input,options={})=>transaction(()=>{const d=validate(input),id='pgt_'+randomUUID();db.prepare('INSERT INTO product_group_templates VALUES(?,?,1)').run(tenant,id);return append(id,1,d,actorName(options));}),
  save:(id,input,expectedRevision,options={})=>transaction(()=>{const old=get(id);version(expectedRevision);if(old.revision!==expectedRevision)fail(409,'group_revision_conflict','Die Produktgruppen-Vorlage wurde zwischenzeitlich geändert.');const d=validate(input);if(old.sha256===hash(d))return old;db.prepare('UPDATE product_group_templates SET revision=revision+1 WHERE tenant_id=? AND id=?').run(tenant,id);return append(id,old.revision+1,d,actorName(options));}),
  plan(input){
   keys(input,['templateId','templateRevision','creationKey','products']);version(input.templateRevision);identifier(input.creationKey);
   if(!Array.isArray(input.products)||!input.products.length||input.products.length>100)fail(422,'group_creation_scope','Der konkrete Anlageumfang muss 1 bis 100 Produkte enthalten.');
   return transaction(()=>{
    const template=get(input.templateId);if(template.revision!==input.templateRevision)fail(409,'group_revision_conflict','Die Vorlage wurde geändert. Bitte den aktuellen Stand prüfen.');const lookup=sourceLookup();validateWithSources(template.document,lookup);
    const selectedOffering=offering(template.document.scope),issues=template.document.openQuestions.map(message=>({code:'open_question',message})),products=[],sources=new Map(),modules=new Map(),ids=new Set();
    if(!selectedOffering)issues.push({code:'offering_open',message:'Angebotene Materialien der Unterkategorie zuerst festlegen.'});
    for(const item of input.products){
     keys(item,['key','targetKey','name']);identifier(item.key);identifier(item.targetKey);label(item.name,200);
     if(ids.has(item.key))fail(422,'group_creation_scope','Ein Produkt ist im Anlageumfang doppelt.');ids.add(item.key);
     const t=template.document.targets.find(t=>t.key===item.targetKey);if(!t)fail(422,'group_creation_scope','Der Material-/Größenstand gehört nicht zur Vorlage.');
     const {record,current}=lookup.source(t.key,t.source.revision);sources.set(t.key,{key:t.key,productId:record.id,revision:record.revision,sha256:hash(record.document)});
     const selectedModule=pinnedModule(t.moduleProfile);
     if(selectedModule){modules.set(selectedModule.id,{id:selectedModule.id,revision:selectedModule.revision,sha256:selectedModule.sha256});if(moduleProfiles.get(selectedModule.id).revision!==selectedModule.revision)issues.push({key:item.key,code:'module_profile_changed',message:'Das Modulprofil hat einen neueren Stand. Bitte die Vorlage aktualisieren.'});}
     if(current.revision!==record.revision)issues.push({key:item.key,code:'source_changed',message:'Die Quelle hat einen neueren Stand. Vorlage aktualisieren.'});
     if(!t.familyId||!t.sizeKey)issues.push({key:item.key,code:'target_open',message:'Familien- oder Größenzuordnung noch offen.'});
     if(selectedOffering&&t.familyId&&!selectedOffering.familyIds.includes(t.familyId))issues.push({key:item.key,code:'family_not_offered',message:'Diese Familie wird in der Unterkategorie nicht angeboten.'});
     try{
      const compiled=compile(t,item.name,lookup),importKey='product-group:'+hash([input.creationKey,item.key]),fingerprint=hash(compiled.document),prior=repository.importItem(importKey);
      if(prior&&prior.fingerprint!==fingerprint)issues.push({key:item.key,code:'creation_conflict',message:'Dieser Anlageumfang wurde bereits mit anderen Produktdaten verwendet.'});
      products.push({...copy(item),familyId:t.familyId,sizeKey:t.sizeKey,material:copy(t.material),geometry:copy(compiled.document.config.profile.geometry),optionGroups:copy(t.optionGroups),optionFields:copy(t.optionFields),...compiled,importKey,fingerprint,existingProductId:prior?.id||null});
     }catch(error){issues.push({key:item.key,code:error.code||'native_validation',message:error.message});}
    }
    const d={schema:'gravuru-product-group-creation-plan/v1',templateId:template.id,templateRevision:template.revision,templateHash:template.sha256,scope:copy(template.document.scope),offering:selectedOffering,creationKey:input.creationKey,requestedProducts:copy(input.products),sources:[...sources.values()],moduleProfiles:[...modules.values()],products,issues,valid:issues.length===0&&products.length===input.products.length,localOnly:true,published:false,shopifyWrites:0};
    const id='pgp_'+randomUUID();db.prepare('INSERT INTO product_group_creation_plans VALUES(?,?,?,?,?)').run(tenant,id,json(d),hash(d),new Date().toISOString());return readPlan(id);
   });
  },
  getPlan:readPlan,
  confirm(input,options={}){
   keys(input,['planId','planHash','accepted']);if(input.accepted!==true)fail(422,'group_confirmation_required','Die vollständig angezeigten Optionen und genau diese Produkte müssen ausdrücklich bestätigt werden.');
   return transaction(()=>{const plan=readPlan(input.planId);if(plan.planHash!==input.planHash)fail(409,'group_plan_changed','Der angezeigte Anlageplan stimmt nicht mehr überein.');currentPlan(plan);
    const existing=db.prepare('SELECT * FROM product_group_confirmations WHERE tenant_id=? AND plan_id=? AND plan_hash=?').get(tenant,plan.id,plan.planHash);
    const id=existing?.id||'pgc_'+randomUUID(),actor=existing?.actor||actorName(options),at=existing?.created_at||new Date().toISOString();
    if(!existing)db.prepare('INSERT INTO product_group_confirmations VALUES(?,?,?,?,?,?)').run(tenant,id,plan.id,plan.planHash,actor,at);
    return {confirmationId:id,planId:plan.id,planHash:plan.planHash,templateRevision:plan.templateRevision,products:plan.requestedProducts.length,actor,confirmedAt:at,localOnly:true};
   });
  },
  execute(input){
   keys(input,['planId','planHash','confirmationId']);const plan=readPlan(input.planId);
   const confirmation=db.prepare('SELECT * FROM product_group_confirmations WHERE tenant_id=? AND id=? AND plan_id=? AND plan_hash=?').get(tenant,input.confirmationId,plan.id,input.planHash);
   if(!confirmation||plan.planHash!==input.planHash)fail(409,'group_confirmation_required','Für genau diesen Anlageplan fehlt die ausdrückliche Bestätigung.');
   const prior=resultRow(plan.id);if(prior)return {...JSON.parse(prior.document),replayed:true};
   currentPlan(plan);
   if(repository.transactionalImportGuards!==true)fail(503,'group_creation_guard_missing','Der transaktionsgeschützte Anlageanschluss ist noch nicht verfügbar. Es wurde nichts angelegt.');
   const entries=plan.products.map(p=>({key:p.importKey,fingerprint:p.fingerprint,document:p.document}));
   const saved=repository.importBatch(entries,{beforeWrite:()=>currentPlan(plan)});
   const products=saved.map((s,i)=>{const record=repository.get(s.id,{revision:1});if(record.publishedRevision!==null||record.status!=='draft'||hash(record.document)!==plan.products[i].fingerprint)fail(409,'group_creation_readback','Der angelegte Entwurf stimmt nicht mit dem bestätigten Plan überein.');return {key:plan.products[i].key,targetKey:plan.products[i].targetKey,productId:s.id,revision:record.revision,created:s.created};});
   const result={planId:plan.id,planHash:plan.planHash,confirmationId:confirmation.id,templateId:plan.templateId,templateRevision:plan.templateRevision,creationKey:plan.creationKey,products,created:products.filter(p=>p.created).length,existing:products.filter(p=>!p.created).length,localOnly:true,published:false,shopifyWrites:0};
   transaction(()=>db.prepare('INSERT OR IGNORE INTO product_group_creation_results VALUES(?,?,?,?)').run(tenant,plan.id,json(result),new Date().toISOString()));
   return JSON.parse(resultRow(plan.id).document);
  },
  close:()=>db.close()
 };
 return service;
}
