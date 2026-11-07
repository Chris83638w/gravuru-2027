// Mikail, 07.11.2026: share identical baseplate/font payloads, while every
// design, immutable revision and its original document hash stays unchanged.
// This is an internal storage codec, never a new customer/product schema.
import {createHash} from 'node:crypto';
import {tenantOption} from './tenant.mjs';

const MARKER='$gravuruResource';
const digest=value=>createHash('sha256').update(value).digest('hex');
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const image=value=>typeof value==='string'&&/^data:image\/(?:png|jpeg|webp);base64,/.test(value);
const fail=(code,message,status=503)=>{throw Object.assign(Error(message),{status,code});};
const parse=text=>{
  if(typeof text!=='string')fail('product_resource_document','Der gespeicherte Produktstand ist ungültig.');
  try{return JSON.parse(text);}catch{fail('product_resource_document','Der gespeicherte Produktstand ist ungültig.');}
};

// Only these two already-embedded payloads are shared. Geometry, option images,
// motifs, scene backgrounds, customer photos, masks and all metadata stay inline.
function locations(document){
  const config=document?.config,result=[];
  if(!plain(config))return result;
  const fonts=config.localResources?.fonts;
  if(plain(fonts))for(const name of Object.keys(fonts))result.push({owner:fonts,key:name,kind:'font'});
  if(Object.hasOwn(config,'materialSurface'))result.push({owner:config,key:'materialSurface',kind:'material-image'});
  return result;
}
const marked=value=>plain(value)&&Object.hasOwn(value,MARKER);
function reference(value,kind){
  if(!marked(value))return null;
  if(Object.keys(value).sort().join(',')!=='$gravuruResource,kind,sha256'||value[MARKER]!==1||value.kind!==kind||!/^[a-f0-9]{64}$/.test(value.sha256||''))
    fail('product_resource_reference','Die gemeinsame Produktressource ist ungültig.');
  return value;
}

/** Idempotent schema setup only. The repository/migration owns user_version. */
export function initializeProductDocumentResources(database){
  database.exec(`CREATE TABLE IF NOT EXISTS product_document_resources (
    tenant_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('font','material-image')),
    sha256 TEXT NOT NULL CHECK(length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*'),
    value_json TEXT NOT NULL CHECK(json_valid(value_json)),
    PRIMARY KEY(tenant_id,kind,sha256));
    CREATE TRIGGER IF NOT EXISTS immutable_product_document_resource_update
      BEFORE UPDATE ON product_document_resources BEGIN SELECT RAISE(ABORT,'Product resources are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS immutable_product_document_resource_delete
      BEFORE DELETE ON product_document_resources BEGIN SELECT RAISE(ABORT,'Product resources are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS immutable_product_document_resource_replace
      BEFORE INSERT ON product_document_resources WHEN EXISTS(
        SELECT 1 FROM product_document_resources WHERE tenant_id=NEW.tenant_id
          AND kind=NEW.kind AND sha256=NEW.sha256 AND value_json IS NOT NEW.value_json)
      BEGIN SELECT RAISE(ABORT,'Product resources are immutable'); END;`);
}

/**
 * Encode an exact JSON.stringify document, without converting fonts or images.
 * Legacy noncanonical JSON remains inline: whitespace, escapes and key order
 * can be part of an existing approval hash and must never be normalized.
 * Existing caller transactions include the resource writes atomically.
 */
export function encodeStoredDocument(database,documentText,options={}){
  const tenant=tenantOption(options),document=parse(documentText),entries=locations(document);
  for(const {owner,key} of entries)if(marked(owner[key]))fail('product_resource_reference_forbidden','Interne Ressourcenverweise dürfen nicht als Produktinhalt gespeichert werden.',422);
  const eligible=entries.filter(({owner,key,kind})=>kind==='font'?plain(owner[key]):image(owner[key]));
  if(!eligible.length||JSON.stringify(document)!==documentText)return documentText;
  const own=!database.isTransaction;
  if(own)database.exec('BEGIN IMMEDIATE');
  try{
    const insert=database.prepare('INSERT OR IGNORE INTO product_document_resources(tenant_id,kind,sha256,value_json) VALUES(?,?,?,?)');
    const read=database.prepare('SELECT value_json FROM product_document_resources WHERE tenant_id=? AND kind=? AND sha256=?');
    for(const {owner,key,kind} of eligible){
      const value=JSON.stringify(owner[key]),sha256=digest(value);
      let stored=read.get(tenant,kind,sha256);
      if(!stored){insert.run(tenant,kind,sha256,value);stored=read.get(tenant,kind,sha256);}
      if(!stored||stored.value_json!==value)fail('product_resource_corrupt','Eine gemeinsame Produktressource stimmt nicht mit ihrem unveränderlichen Inhalt überein.');
      // Assign to an existing own property; special font names stay ordinary
      // JSON keys and cannot change another document or an object prototype.
      Object.defineProperty(owner,key,{value:{[MARKER]:1,kind,sha256},writable:true,enumerable:true,configurable:true});
    }
    const result=JSON.stringify(document);
    if(own)database.exec('COMMIT');
    return result;
  }catch(error){if(own)database.exec('ROLLBACK');throw error;}
}

function hydrate(database,storedText,options){
  const tenant=tenantOption(options),document=parse(storedText);let changed=false,read;
  for(const {owner,key,kind} of locations(document)){
    const ref=reference(owner[key],kind);if(!ref)continue;
    if(!read){
      try{read=database.prepare('SELECT value_json FROM product_document_resources WHERE tenant_id=? AND kind=? AND sha256=?');}
      catch{fail('product_resource_missing','Die gemeinsame Ressourcenablage dieses Produktstands fehlt.');}
    }
    const row=read.get(tenant,kind,ref.sha256);
    if(!row)fail('product_resource_missing','Eine gemeinsame Produktressource fehlt für diesen Mandanten.');
    if(typeof row.value_json!=='string'||digest(row.value_json)!==ref.sha256)fail('product_resource_corrupt','Eine gemeinsame Produktressource besteht die Inhaltsprüfung nicht.');
    const value=parse(row.value_json);
    if(marked(value)||(kind==='font'?!plain(value):!image(value)))fail('product_resource_corrupt','Die gemeinsame Produktressource hat einen ungültigen Inhalt.');
    Object.defineProperty(owner,key,{value,writable:true,enumerable:true,configurable:true});changed=true;
  }
  return {document,changed};
}

/** Read-only, tenant-bound hydration for raw JSON SHA/HMAC consumers. */
export function readStoredDocumentText(database,storedText,options={}){
  const result=hydrate(database,storedText,options);
  return result.changed?JSON.stringify(result.document):storedText;
}

/** Same read-only codec, without serializing and parsing the full object twice. */
export function parseStoredDocument(database,storedText,options={}){
  return hydrate(database,storedText,options).document;
}
