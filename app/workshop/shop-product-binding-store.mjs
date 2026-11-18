// Additive exact-ID activation over the EXISTING order-intake connection. No DB
// constructor, Shopify call, option register, price formula or production release.
import {createHash, randomUUID} from 'node:crypto';
import {withBindingReadSnapshot,registerBindingReadScope} from './shop-product-binding-read-snapshot.mjs';
import {isDeepStrictEqual} from 'node:util';
import {resolveShopProductBinding} from './shop-product-binding-plan.mjs';
import {prepareShopProduct,withShopPreparationSnapshot} from './shop-preparation.mjs';
import {createShopGalleryCache} from './shop-gallery-cache.mjs';
import {performance} from 'node:perf_hooks';
import {customerDatabaseRead,databaseEpoch} from './customer-read-scope.mjs';
import {cartTimingDetail,cartTimingRead,cartTimingCount,cartTimingBytes} from './shop-cart-timing.mjs';

const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v) && [Object.prototype,null].includes(Object.getPrototypeOf(v));
const positive = v => Number.isSafeInteger(v) && v > 0;
const productGid = /^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/;
const variantGid = /^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]{0,19}$/;
const fail = (code,message,status=409) => {throw Object.assign(new Error(message),{code,status});};
const sameOptions = (a,b) => isDeepStrictEqual(a??{},b??{});
// Same canonical document digest as the existing ID plan. No domain conversion.
function canonical(v) {
  if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);
  if(typeof v==='number'&&Number.isFinite(v))return JSON.stringify(v);
  if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
  if(plain(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
  fail('shop_binding_document','Der gespeicherte Produktbeleg ist ungültig.',422);
}
const digest = v => {const text=cartTimingDetail('registry_canonical',()=>canonical(v));return cartTimingDetail('registry_sha256',()=>createHash('sha256').update(text).digest('hex'));};
const clone = value => structuredClone(value);
function sync(fn,...args){const v=fn(...args);if(v&&typeof v.then==='function')fail('shop_binding_store_async','Die atomare Zuordnung benötigt synchrone Speicherzugriffe.',503);return v;}

export function createShopProductBindingStore({database:db,orderIntake,tenantId,storeId,shopDomain,adapter,clock=Date.now,personalizationPricingFor,legacySingleStore=false,readOnly=false,logger=entry=>console.warn('[shop-gallery]',JSON.stringify(entry))}={}) {
  if(!db||typeof db.prepare!=='function'||typeof db.exec!=='function'||!orderIntake||
    typeof orderIntake.bindVariants!=='function'||typeof orderIntake.bindings!=='function'||
    typeof tenantId!=='string'||!/^[a-z0-9][a-z0-9-]{0,39}$/.test(tenantId)||
    typeof storeId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(storeId)||
    typeof shopDomain!=='string'||!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)||
    !adapter||typeof adapter.getCurrentProduct!=='function'||typeof clock!=='function'||
    (personalizationPricingFor!==undefined&&typeof personalizationPricingFor!=='function')||
    typeof readOnly!=='boolean'||typeof legacySingleStore!=='boolean'||(legacySingleStore&&tenantId!=='gravuru'))
    fail('shop_binding_store_configuration','Die private ID-Speicherung ist nicht eingerichtet.',503);
  const scope={tenantId,storeId,shopDomain};
  // Pure raw JSON -> canonical SHA-256 memo, never a cached database decision.
  // Every phase still reads/parses the current bytes and checks its binding.
  // Only two short hashes per entry survive; no product tree, raw JSON or stamp.
  const documentDigests=new Map();
  function readDigest(raw,document){
    const key='json-canonical-v1:'+cartTimingDetail('registry_raw_digest',()=>createHash('sha256').update(raw).digest('hex'));
    if(documentDigests.has(key)){
      const value=documentDigests.get(key);documentDigests.delete(key);documentDigests.set(key,value);
      cartTimingCount('registry_digest_hits');return value;
    }
    const value=digest(document);cartTimingCount('registry_digest_misses');
    documentDigests.set(key,value);
    if(documentDigests.size>64)documentDigests.delete(documentDigests.keys().next().value);
    return value;
  }
  function ensureScope(){if(orderIntake.tenantId!==tenantId||Object.keys(scope).some(k=>adapter[k]!==scope[k]))fail('shop_binding_store_scope','Store, Shop und Mandant stimmen nicht überein.',503);}
  let revisionReadScope;
  function transaction(work){
    const nested=db.isTransaction,savepoint='id_binding_'+randomUUID().replaceAll('-','');
    const recursive=db.prepare('PRAGMA recursive_triggers').get().recursive_triggers,previousScope=revisionReadScope;
    if(!recursive)db.exec('PRAGMA recursive_triggers=ON');
    revisionReadScope??=new Map();
    try{
      db.exec(nested?'SAVEPOINT '+savepoint:readOnly?'BEGIN':'BEGIN IMMEDIATE');
      try{const value=sync(work);db.exec(nested?'RELEASE SAVEPOINT '+savepoint:'COMMIT');return value;}
      catch(error){if(nested){db.exec('ROLLBACK TO SAVEPOINT '+savepoint);db.exec('RELEASE SAVEPOINT '+savepoint);}else db.exec('ROLLBACK');throw error;}
    }finally{
      revisionReadScope=previousScope;
      db.exec('PRAGMA recursive_triggers='+(recursive?'ON':'OFF'));
    }
  }
  ensureScope();
  // Legacy is an explicit fixed server scope, never inferred from missing columns.
  // Reject mixed schemas instead of migrating or treating an old DB as multi-tenant.
  for(const table of ['products','product_revisions','form_shop_bindings','form_shop_binding_selections']){
    const columns=db.prepare('PRAGMA table_info('+table+')').all().map(c=>c.name);
    if(!columns.length||columns.includes('tenant_id')===legacySingleStore)
      fail('shop_binding_store_schema','Der Datenbestand entspricht nicht dem ausdrücklich festgelegten Store-Schema.',503);
  }
  if(!readOnly)transaction(()=>db.exec(`
    CREATE INDEX IF NOT EXISTS shop_gallery_revision_status_v1 ON product_revisions(product_id,revision,${legacySingleStore?'':'tenant_id,'}status);
    CREATE TABLE IF NOT EXISTS shop_product_binding_revisions(
      tenant_id TEXT NOT NULL,shop TEXT NOT NULL,variant_gid TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>0),
      product_gid TEXT NOT NULL,store_id TEXT NOT NULL,binding_id TEXT NOT NULL REFERENCES form_shop_bindings(id),
      cfg_id TEXT NOT NULL,cfg_revision INTEGER NOT NULL CHECK(cfg_revision>0),document_sha256 TEXT NOT NULL,
      evidence_read_at TEXT NOT NULL,created_at TEXT NOT NULL,
      PRIMARY KEY(tenant_id,shop,variant_gid,revision));
    CREATE TABLE IF NOT EXISTS shop_product_binding_heads(
      tenant_id TEXT NOT NULL,shop TEXT NOT NULL,variant_gid TEXT NOT NULL,revision INTEGER NOT NULL,
      PRIMARY KEY(tenant_id,shop,variant_gid),
      FOREIGN KEY(tenant_id,shop,variant_gid,revision) REFERENCES shop_product_binding_revisions(tenant_id,shop,variant_gid,revision));
    CREATE TRIGGER IF NOT EXISTS shop_product_binding_revision_fixed BEFORE UPDATE ON shop_product_binding_revisions
      BEGIN SELECT RAISE(ABORT,'Active binding revisions are immutable');END;
    CREATE TRIGGER IF NOT EXISTS shop_product_binding_revision_keep BEFORE DELETE ON shop_product_binding_revisions
      BEGIN SELECT RAISE(ABORT,'Active binding revisions are immutable');END;
    CREATE TRIGGER IF NOT EXISTS shop_product_binding_head_keep BEFORE DELETE ON shop_product_binding_heads
      BEGIN SELECT RAISE(ABORT,'Active binding heads require an explicit transition');END;
  `));
  function storedScope(){
    ensureScope();
    if(cartTimingRead('registry_scope_read',()=>db.prepare('SELECT 1 FROM shop_product_binding_revisions WHERE tenant_id=? AND shop=? AND store_id<>? LIMIT 1').get(tenantId,shopDomain,storeId)))
      fail('shop_binding_store_scope','Dieser private Datenbestand wurde einem anderen Store zugeordnet.',503);
  }
  const currentHead=variant=>db.prepare(`SELECT r.* FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r
    ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision
    WHERE h.tenant_id=? AND h.shop=? AND h.variant_gid=?`).get(tenantId,shopDomain,variant);
  function ids(value){if(!plain(value)||Object.keys(value).length!==2||!productGid.test(value.shopifyProductId)||!variantGid.test(value.shopifyVariantId))fail('shop_binding_identity','Beide vollständigen Shopify-IDs sind erforderlich.',422);return value;}
  function productRow(id,revision,{requireHead=false,withMetadata=true,withDocument=true}={}){
    const columns=`p.revision AS head,p.archived,p.kind,${withDocument?'r.document,':''}${withMetadata?'r.metadata,':''}r.status`;
    const row=cartTimingRead('registry_product_read',()=>legacySingleStore?db.prepare(`SELECT ${columns}
      FROM products p JOIN product_revisions r ON r.product_id=p.id WHERE p.id=? AND r.revision=?`).get(id,revision):db.prepare(`SELECT ${columns}
      FROM products p JOIN product_revisions r ON r.product_id=p.id AND r.tenant_id=p.tenant_id
      WHERE p.id=? AND p.tenant_id=? AND r.revision=?`).get(id,tenantId,revision));
    if(row){cartTimingBytes('registry_document_bytes',row.document);cartTimingBytes('registry_metadata_bytes',row.metadata);}
    if(!row||row.archived||row.kind!=='product'||row.status==='archived'||(requireHead&&row.head!==revision))
      fail('shop_binding_cfg_changed','Der bestätigte Produktstand ist nicht mehr verfügbar oder aktuell.');
    return row;
  }
  let checkedSchema;
  function immutableRevisionSchema(){
    const version=db.prepare('PRAGMA schema_version').get().schema_version;
    const tempVersion=db.prepare('PRAGMA temp.schema_version').get().schema_version;
    if(checkedSchema?.version!==version||checkedSchema?.tempVersion!==tempVersion){
      const rows=db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND tbl_name='product_revisions'").all();
      const native=event=>rows.some(row=>{
        const name='immutable_revision_'+event.toLowerCase(),sql=row.sql?.replace(/\s+/g,' ').trim().replace(/;$/,'').replace(/^CREATE TRIGGER IF NOT EXISTS /,'CREATE TRIGGER ');
        return row.name===name&&sql===`CREATE TRIGGER ${name} BEFORE ${event} ON product_revisions BEGIN SELECT RAISE(ABORT, 'Product revisions are immutable'); END`;
      });
      const headTriggers=db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND tbl_name IN ('shop_product_binding_revisions','shop_product_binding_heads') UNION ALL SELECT name,sql FROM sqlite_temp_master WHERE type='trigger' AND tbl_name IN ('shop_product_binding_revisions','shop_product_binding_heads')").all();
      const expectedHeadTriggers=new Map([
        ['shop_product_binding_revision_fixed',"CREATE TRIGGER shop_product_binding_revision_fixed BEFORE UPDATE ON shop_product_binding_revisions BEGIN SELECT RAISE(ABORT,'Active binding revisions are immutable');END"],
        ['shop_product_binding_revision_keep',"CREATE TRIGGER shop_product_binding_revision_keep BEFORE DELETE ON shop_product_binding_revisions BEGIN SELECT RAISE(ABORT,'Active binding revisions are immutable');END"],
        ['shop_product_binding_head_keep',"CREATE TRIGGER shop_product_binding_head_keep BEFORE DELETE ON shop_product_binding_heads BEGIN SELECT RAISE(ABORT,'Active binding heads require an explicit transition');END"],
      ]);
      const normalize=sql=>sql?.replace(/\s+/g,' ').trim().replace(/;$/,'').replace(/^CREATE (TABLE|TRIGGER) IF NOT EXISTS /,'CREATE $1 ');
      const expectedHeadTables=new Map([
        ['shop_product_binding_revisions',normalize(`CREATE TABLE shop_product_binding_revisions(
      tenant_id TEXT NOT NULL,shop TEXT NOT NULL,variant_gid TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>0),
      product_gid TEXT NOT NULL,store_id TEXT NOT NULL,binding_id TEXT NOT NULL REFERENCES form_shop_bindings(id),
      cfg_id TEXT NOT NULL,cfg_revision INTEGER NOT NULL CHECK(cfg_revision>0),document_sha256 TEXT NOT NULL,
      evidence_read_at TEXT NOT NULL,created_at TEXT NOT NULL,
      PRIMARY KEY(tenant_id,shop,variant_gid,revision))`)],
        ['shop_product_binding_heads',normalize(`CREATE TABLE shop_product_binding_heads(
      tenant_id TEXT NOT NULL,shop TEXT NOT NULL,variant_gid TEXT NOT NULL,revision INTEGER NOT NULL,
      PRIMARY KEY(tenant_id,shop,variant_gid),
      FOREIGN KEY(tenant_id,shop,variant_gid,revision) REFERENCES shop_product_binding_revisions(tenant_id,shop,variant_gid,revision))`)],
      ]);
      const headTables=db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name IN ('shop_product_binding_revisions','shop_product_binding_heads')").all();
      const extendedHeads=db.prepare("SELECT 1 FROM sqlite_temp_master WHERE name IN ('shop_product_binding_revisions','shop_product_binding_heads') UNION ALL SELECT 1 FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND tbl_name IN ('shop_product_binding_revisions','shop_product_binding_heads') LIMIT 1").get();
      const pureHeads=!extendedHeads&&headTriggers.length===expectedHeadTriggers.size&&headTriggers.every(row=>normalize(row.sql)===expectedHeadTriggers.get(row.name))&&headTables.length===expectedHeadTables.size&&headTables.every(row=>normalize(row.sql)===expectedHeadTables.get(row.name));
      checkedSchema={version,tempVersion,immutable:!legacySingleStore&&native('UPDATE')&&native('DELETE'),pureHeads};
    }
    return checkedSchema;
  }
  function revisionStamp(id,revision,{requireHead=false}={}){
    const schema=cartTimingDetail('registry_schema',()=>immutableRevisionSchema());
    // REPLACE executes delete triggers only with recursive_triggers enabled.
    // Check every write epoch too: OFF -> REPLACE -> ON must not evade the guard.
    const recursive=cartTimingRead('registry_pragma_read',()=>db.prepare('PRAGMA recursive_triggers').get()).recursive_triggers;
    const light=db.isTransaction&&revisionReadScope&&schema.immutable&&recursive===1;
    const row=productRow(id,revision,{requireHead,withMetadata:!light,withDocument:!light});
    if(light){
      const changes=db.prepare('SELECT total_changes() AS count').get().count,key=id+'@'+revision,previous=revisionReadScope.get(key);
      if(!previous||previous.changes!==changes){
        const raw=productRow(id,revision,{requireHead});
        if(previous&&(previous.document!==raw.document||previous.metadata!==raw.metadata))fail('shop_binding_cfg_changed','Der feste Produktbeleg wurde innerhalb der Prüfung ersetzt.');
        revisionReadScope.set(key,{changes,document:raw.document,metadata:raw.metadata});
      }
    }
    return {schema:light?schema.version:null,...row};
  }
  // Mutable head/archive/status is always reread. Unknown/legacy schemas keep
  // the full raw-document guard; no assumption about their immutability.
  const readProductStamp=id=>{
    if(!db.isTransaction)fail('shop_binding_snapshot_scope','Die Produktprüfung benötigt einen gesperrten Datenstand.',503);
    const head=legacySingleStore?db.prepare('SELECT revision FROM products WHERE id=?').get(id):db.prepare('SELECT revision FROM products WHERE id=? AND tenant_id=?').get(id,tenantId);
    if(!head)fail('shop_binding_cfg_changed','Der bestätigte Produktstand fehlt.');
    return revisionStamp(id,head.revision,{requireHead:true});
  };
  function withReadSnapshot(read){
    if(typeof read!=='function')fail('shop_binding_snapshot_scope','Eine synchrone Prüfung ist erforderlich.',422);
    return transaction(()=>withBindingReadSnapshot(adapter,()=>sync(read),{readProductStamp}));
  }
  // An audit registry must not replace an existing writable adapter's reader;
  // its temporary read-only connection may be closed immediately after audit.
  if(!readOnly)registerBindingReadScope(adapter,withReadSnapshot);
  function bindingFor(id){
    const row=cartTimingRead('registry_binding_read',()=>legacySingleStore?db.prepare(`SELECT b.*,s.options FROM form_shop_bindings b LEFT JOIN form_shop_binding_selections s
      ON s.binding_id=b.id WHERE b.id=?`).get(id):db.prepare(`SELECT b.*,s.options FROM form_shop_bindings b LEFT JOIN form_shop_binding_selections s
      ON s.binding_id=b.id AND s.tenant_id=b.tenant_id WHERE b.id=? AND b.tenant_id=?`).get(id,tenantId));
    if(!row)fail('shop_binding_active_integrity','Die feste Bindung fehlt.');
    return {...row,options:row.options==null?{}:parseDocument(row.options)};
  }
  function assertBinding(binding,entry){
    if(binding.shop!==shopDomain||binding.variant_id!==entry.shopifyVariantId.split('/').at(-1)||
      binding.product_id!==entry.productId||binding.product_revision!==entry.productRevision||
      binding.unit_cents!==entry.baseUnitCents||!sameOptions(binding.options,entry.options))
      fail('shop_binding_active_integrity','Bindung, Ausführung und fester Produktstand stimmen nicht überein.');
  }
  function parseDocument(text){try{return JSON.parse(text);}catch{fail('shop_binding_document','Der gespeicherte Produktbeleg ist ungültig.',422);}}
  function compactReadStamp(stamp){
    // Gallery scans keep one stamp per fixed product. Preserve the exact raw
    // byte comparison without retaining every embedded font/image document.
    // The write-side revisionStamp and its under-lock raw guard stay unchanged.
    if(stamp===null)return null;
    const result={...stamp};
    for(const field of ['document','metadata'])if(typeof result[field]==='string'){
      result[field]={rawSha256:cartTimingDetail('registry_raw_digest',()=>createHash('sha256').update(result[field]).digest('hex'))};
    }
    return result;
  }
  function result(row,records=new Map(),timings,memo=null,galleryMemo=null){
    if(row.store_id!==storeId)fail('shop_binding_store_scope','Die Zuordnung gehört zu einem anderen Store.',503);
    const key=row.cfg_id+'@'+row.cfg_revision;let record=records.get(key);
    // Only an asynchronous gallery scan opts in. Never reuse the write-side
    // transaction stamp, or retain document/metadata bytes across an await.
    const galleryEpoch=galleryMemo&&!db.isTransaction?databaseEpoch(db):null;
    const cached=galleryEpoch===null?null:galleryMemo.get(key);
    let at=performance.now();const stamp=cached?.epoch===galleryEpoch&&galleryEpoch!==null
      ?{...cached.stamp,...productRow(row.cfg_id,row.cfg_revision,{withMetadata:false,withDocument:false})}
      :memo&&!legacySingleStore?null:customerDatabaseRead(db,'binding-stamp:'+tenantId+':'+key,()=>cartTimingDetail('registry_stamp',()=>compactReadStamp(revisionStamp(row.cfg_id,row.cfg_revision))));if(timings)timings.documentReadMs+=performance.now()-at;
    if(record&&!isDeepStrictEqual(record.stamp,stamp))fail('shop_binding_cfg_changed','Der Produktbeleg wurde innerhalb der Prüfung geändert.');
    if(!record){
      const read=()=>customerDatabaseRead(db,'binding-document:'+tenantId+':'+key,()=>{
      let at=performance.now();const source=productRow(row.cfg_id,row.cfg_revision,{withMetadata:false});if(timings)timings.documentReadMs+=performance.now()-at;
      at=performance.now();const document=cartTimingDetail('registry_document_json',()=>parseDocument(source.document));if(timings)timings.documentParseMs+=performance.now()-at;
      at=performance.now();record={digest:cartTimingDetail('registry_document_digest',()=>readDigest(source.document,document)),productionStatus:document.productionProfile==null?'profile-assignment-pending':'not-released',status:source.status};if(timings){timings.documentHashMs+=performance.now()-at;timings.products++;}
      return record;
      });
      // Nur Kundenweg mit Antwortspeicher (memo): Ableitung (Prüfsumme) der unveränderlichen Revision wiederverwenden, wenn der
      // frische Beleg (rowid, Schema, Kopf) passt. Archivierung, Art und Status werden trotzdem bei jedem Aufruf entschieden –
      // mit denselben Bedingungen und demselben Fehler wie productRow; ohne Beleg oder bei Fehlschlag gilt der bisherige Weg.
      if(memo&&!legacySingleStore){
        const found=memo.derive({scope:storeId,kind:'binding-record',db,tenantId,productId:row.cfg_id,revision:row.cfg_revision,compute:read});
        record=found.value;
        if(found.hit&&(found.marker.archived||found.marker.kind!=='product'||record.status==='archived'))record=read();
      }else record=read();
      record={...record,stamp};
      // Retain only the digest, never all parsed documents of a large catalogue.
      if(galleryEpoch===null)records.set(key,record);
    }
    at=performance.now();const bound=bindingFor(row.binding_id);if(timings)timings.bindingReadMs+=performance.now()-at;
    if(record.digest!==row.document_sha256)fail('shop_binding_active_integrity','Der feste Produktbeleg wurde verändert.');
    assertBinding(bound,{shopifyVariantId:row.variant_gid,productId:row.cfg_id,productRevision:row.cfg_revision,baseUnitCents:bound.unit_cents,options:bound.options});
    if(galleryEpoch!==null){
      // Include the document/digest and binding reads in the same checked
      // epoch. Changes cause the next read to compare against the ORIGINAL
      // compact stamp; they never silently replace a gallery's baseline.
      if(databaseEpoch(db)!==galleryEpoch)fail('shop_binding_cfg_changed','Der Produktbeleg wurde während der Galerieprüfung geändert.');
      records.set(key,record);galleryMemo.set(key,{epoch:galleryEpoch,stamp});
    }
    return {...scope,shopifyProductId:row.product_gid,shopifyVariantId:row.variant_gid,
      bindingId:row.binding_id,productId:row.cfg_id,productRevision:row.cfg_revision,
      options:clone(bound.options),unitCents:bound.unit_cents,assignmentRevision:row.revision,
      documentSha256:row.document_sha256,evidenceReadAt:row.evidence_read_at,createdAt:row.created_at,
      productionStatus:record.productionStatus,
      productionReady:false,publicAccess:false,checkoutEnabled:false};
  }
  function persist({plan,expectedHeads}={}){
    if(readOnly)fail('shop_binding_read_only','Diese Datenkopie ist nur lesbar.',403);
    storedScope();
    if(!plan||plan.purpose!=='id-binding'||!positive(plan.maxEvidenceAgeMs)||plan.maxEvidenceAgeMs>60000||!Array.isArray(plan.entries)||!plan.entries.length||plan.entries.length>100||
      !Array.isArray(expectedHeads)||expectedHeads.length!==plan.entries.length)
      fail('shop_binding_store_plan','Ein frischer serverseitiger ID-Plan und ausdrückliche erwartete Zuordnungsstände sind erforderlich.',422);
    const expected=new Map();
    for(const item of expectedHeads){
      if(!plain(item)||Object.keys(item).length!==2||!variantGid.test(item.shopifyVariantId)||
        (item.revision!==null&&!positive(item.revision))||expected.has(item.shopifyVariantId))
        fail('shop_binding_expected_head','Erwartete Zuordnungsstände sind unvollständig oder ungültig.',422);
      expected.set(item.shopifyVariantId,item.revision);
    }
    return withReadSnapshot(()=>{
      storedScope();
      const now=clock();if(!Number.isSafeInteger(now)||now<0)fail('shop_binding_freshness','Ungültige Prüfzeit.',422);
      // All current heads and documents are checked AFTER BEGIN IMMEDIATE on the
      // exact connection which subsequently writes legacy bindings and ID heads.
      // Reuse only identical records inside this locked transaction; all per-variant checks still run.
      const checkedRecords=new Map();
      const checked=withBindingReadSnapshot(adapter,()=>plan.entries.map(entry=>{
        if(!expected.has(entry.shopifyVariantId))fail('shop_binding_expected_head','Ein erwarteter Zuordnungsstand fehlt.',422);
        const resolved=resolveShopProductBinding(plan,{...scope,shopifyProductId:entry.shopifyProductId,shopifyVariantId:entry.shopifyVariantId,adapter,now});
        const record=sync(adapter.getCurrentProduct,resolved.productId),stamp=revisionStamp(resolved.productId,resolved.productRevision,{requireHead:true});
        const recordKey=resolved.productId+'@'+resolved.productRevision,previous=checkedRecords.get(recordKey);
        if(previous){
          if(!isDeepStrictEqual(previous.stamp,stamp)||(previous.record!==record&&!isDeepStrictEqual(previous.record,record))||previous.digest!==resolved.documentSha256)
            fail('shop_binding_cfg_changed','Der Produktbeleg wurde innerhalb der atomaren Prüfung geändert.');
        }else{
          const row=productRow(resolved.productId,resolved.productRevision,{requireHead:true}),document=parseDocument(row.document),metadata=parseDocument(row.metadata),hash=digest(document);
          if(hash!==resolved.documentSha256||!isDeepStrictEqual(document,record.document)||!isDeepStrictEqual(metadata,record.metadata)||row.status!==record.status)
            fail('shop_binding_cfg_changed','Die bestehende Datenbank stimmt nicht mit dem bestätigten Produktbeleg überein.');
          checkedRecords.set(recordKey,{stamp,record,digest:hash});
        }
        const old=currentHead(resolved.shopifyVariantId),expectedRevision=expected.get(resolved.shopifyVariantId);
        if((old?.revision??null)!==expectedRevision)fail('shop_binding_head_conflict','Die aktive Zuordnung wurde inzwischen geändert.');
        if(old&&(old.product_gid!==resolved.shopifyProductId||old.store_id!==storeId||old.cfg_id!==resolved.productId))
          fail('shop_binding_active_conflict','Die Variante besitzt bereits eine andere aktive Produkt- oder Storezuordnung.');
        return {entry:resolved,record:previous?.record??record,old};
      }));
      let createdBindings=0,changedAssignments=0;
      const resultRecords=new Map();
      const assignmentRow=row=>{
        const schema=immutableRevisionSchema();
        // Only exact native head writes have no trigger callbacks/side effects.
        // A custom/legacy schema keeps the previous immediate complete check.
        return schema.immutable&&schema.pureHeads?{row}:{value:result(row,resultRecords)};
      };
      const preparedRecords=new Map(),sources=[...checkedRecords.entries()];
      const withinPrepared=(index,read)=>index===sources.length?read():withShopPreparationSnapshot(sources[index][1].record,record=>{preparedRecords.set(sources[index][0],record);return withinPrepared(index+1,read);});
      const assignmentRows=withinPrepared(0,()=>checked.map(({entry,record:sourceRecord,old})=>{
        const record=preparedRecords.get(entry.productId+'@'+entry.productRevision)??sourceRecord;
        let bindingId=entry.binding.id;
        if(entry.binding.mode==='reuse')assertBinding(bindingFor(bindingId),entry);
        else{
          const matches=prepareShopProduct(record).variants.filter(v=>sameOptions(v.options,entry.options));
          if(matches.length!==1||matches[0].priceCents!==entry.baseUnitCents)fail('shop_binding_selection','Die gespeicherte Ausführung ist nicht mehr eindeutig.');
          const personalization=personalizationPricingFor===undefined?undefined:sync(personalizationPricingFor,clone(entry));
          const saved=sync(orderIntake.bindVariants.bind(orderIntake),{record,shopDomain,mappings:[{key:matches[0].key,variantId:entry.variantId}],
            ...(personalization===undefined?{}:{personalizationPricing:personalization})});
          if(!Array.isArray(saved?.bindings)||saved.bindings.length!==1)fail('shop_binding_active_integrity','Die gespeicherte Bindung ist nicht eindeutig.');
          bindingId=saved.bindings[0].id;createdBindings+=saved.created;
          assertBinding(bindingFor(bindingId),entry);
        }
        // A provider/binding callback must not alter the product after its read.
        const verified=checkedRecords.get(entry.productId+'@'+entry.productRevision);
        if(!isDeepStrictEqual(revisionStamp(entry.productId,entry.productRevision,{requireHead:true}),verified.stamp))fail('shop_binding_cfg_changed','Der Produktstand wurde während der Speicherung geändert.');
        if(old&&old.binding_id===bindingId&&old.cfg_revision===entry.productRevision&&old.document_sha256===entry.documentSha256)return assignmentRow(old);
        const next=(old?.revision??0)+1;
        db.prepare(`INSERT INTO shop_product_binding_revisions(tenant_id,shop,variant_gid,revision,product_gid,store_id,binding_id,cfg_id,cfg_revision,document_sha256,evidence_read_at,created_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(tenantId,shopDomain,entry.shopifyVariantId,next,entry.shopifyProductId,storeId,bindingId,entry.productId,entry.productRevision,entry.documentSha256,plan.evidenceReadAt,new Date(now).toISOString());
        if(old){const update=db.prepare('UPDATE shop_product_binding_heads SET revision=? WHERE tenant_id=? AND shop=? AND variant_gid=? AND revision=?').run(next,tenantId,shopDomain,entry.shopifyVariantId,old.revision);if(update.changes!==1)fail('shop_binding_head_conflict','Die aktive Zuordnung wurde inzwischen geändert.');}
        else db.prepare('INSERT INTO shop_product_binding_heads(tenant_id,shop,variant_gid,revision) VALUES(?,?,?,?)').run(tenantId,shopDomain,entry.shopifyVariantId,next);
        changedAssignments++;return assignmentRow(currentHead(entry.shopifyVariantId));
      }));
      // Keep every provider/binding callback check above. Materialize the return
      // values only once the synchronous batch has finished writing its heads;
      // these internal result reads need no intermediate view of each head write.
      // Final source/binding integrity checks still run for every returned row.
      const assignments=assignmentRows.map(item=>item.value??result(item.row,resultRecords));
      const finished=clock(),readAt=Date.parse(plan.evidenceReadAt);
      if(!Number.isSafeInteger(finished)||finished<now||!Number.isFinite(readAt)||finished-readAt>plan.maxEvidenceAgeMs)
        fail('shop_binding_freshness','Die ID-Prüfung ist vor Abschluss der Speicherung abgelaufen.');
      return {schema:'gravuru-active-shop-product-bindings/v1',...scope,assignments,createdBindings,changedAssignments,
        written:createdBindings>0||changedAssignments>0,shopifyWrites:false,productionReady:false,publicAccess:false,checkoutEnabled:false};
    });
  }
  function resolve(input,{documentMemo=null}={}){cartTimingDetail('registry_scope',()=>storedScope());const pair=ids(input),row=cartTimingRead('registry_head_read',()=>currentHead(pair.shopifyVariantId));cartTimingCount('registry_entries_returned',row?1:0);if(!row||row.product_gid!==pair.shopifyProductId)fail('shop_binding_active_not_found','Keine ausdrückliche aktive Zuordnung für diese beiden Shopify-IDs.',404);return result(row,undefined,undefined,documentMemo);}
  function resolveMany(inputs){
    if(!Array.isArray(inputs)||!inputs.length||inputs.length>5000)fail('shop_binding_identity','Eine begrenzte Liste vollständiger Shopify-IDs ist erforderlich.',422);
    return transaction(()=>{storedScope();const records=new Map();return inputs.map(input=>{const pair=ids(input),row=currentHead(pair.shopifyVariantId);if(!row||row.product_gid!==pair.shopifyProductId)fail('shop_binding_active_not_found','Keine ausdrückliche aktive Zuordnung für diese beiden Shopify-IDs.',404);return result(row,records);});});
  }

  function activeRows(){
    storedScope();
    return db.prepare(`SELECT r.* FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r
      ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision
      WHERE h.tenant_id=? AND h.shop=? AND r.store_id=? ORDER BY r.cfg_id,r.variant_gid`).all(tenantId,shopDomain,storeId);
  }
  // SQLite otherwise prefers the unique revision key and reads overflow pages
  // just to reach status behind the document body. Use the covering index.
  const revisionIndex=db.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name='shop_gallery_revision_status_v1'").get()?' INDEXED BY shop_gallery_revision_status_v1':'';
  function galleryRevision(){
    storedScope();
    // No document bodies or customer data: only activation and product revision heads.
    const tenantJoin=legacySingleStore?'':' AND p.tenant_id=r.tenant_id';
    const revisionJoin=legacySingleStore?'':' AND pr.tenant_id=r.tenant_id';
    const rows=db.prepare(`SELECT h.variant_gid,h.revision,r.cfg_id,r.cfg_revision,r.binding_id,
      p.revision AS product_head,p.archived,p.kind,pr.status
      FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r
      ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision
      LEFT JOIN products p ON p.id=r.cfg_id${tenantJoin}
      LEFT JOIN product_revisions pr${revisionIndex} ON pr.product_id=r.cfg_id AND pr.revision=r.cfg_revision${revisionJoin}
      WHERE h.tenant_id=? AND h.shop=? AND r.store_id=? ORDER BY h.variant_gid`).all(tenantId,shopDomain,storeId);
    return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  }
  function galleryResult(row,records,timings,galleryMemo=null){
    try{return result(row,records,timings,null,galleryMemo);}
    catch(error){
      if(!['shop_binding_cfg_changed','shop_binding_active_integrity','shop_binding_document'].includes(error.code))throw error;
      // Fixed diagnostic codes only: never document text, tokens or customer fields.
      logger({event:'shop_gallery_binding_skipped',storeId,code:error.code});
      return null;
    }
  }
  function listActive(){
    const records=new Map();return activeRows().map(row=>galleryResult(row,records)).filter(Boolean);
  }
  async function listActiveForGallery({onMeasure=()=>{}}={}){
    const started=performance.now(),rows=activeRows(),records=new Map(),galleryMemo=new Map(),bindings=[];
    const timings={activeRowsMs:performance.now()-started,documentReadMs:0,documentParseMs:0,documentHashMs:0,bindingReadMs:0,products:0,bindings:rows.length};
    for(let i=0;i<rows.length;i++){
      if(i%8===0)await new Promise(resolve=>setImmediate(resolve));
      const binding=galleryResult(rows[i],records,timings,galleryMemo);if(binding)bindings.push(binding);
    }
    onMeasure({...timings,totalMs:performance.now()-started});return bindings;
  }
  function history(input){storedScope();const pair=ids(input);return db.prepare('SELECT * FROM shop_product_binding_revisions WHERE tenant_id=? AND shop=? AND variant_gid=? AND product_gid=? ORDER BY revision').all(tenantId,shopDomain,pair.shopifyVariantId,pair.shopifyProductId).map(row=>({...scope,shopifyProductId:row.product_gid,shopifyVariantId:row.variant_gid,assignmentRevision:row.revision,bindingId:row.binding_id,productId:row.cfg_id,productRevision:row.cfg_revision,documentSha256:row.document_sha256,evidenceReadAt:row.evidence_read_at,createdAt:row.created_at,productionReady:false}));}
  const galleryCache=createShopGalleryCache({database:db,...scope,readOnly});
  return Object.freeze({...scope,persist,resolve,resolveMany,withReadSnapshot,history,listActive,galleryRevision,listActiveForGallery,galleryCache});
}
