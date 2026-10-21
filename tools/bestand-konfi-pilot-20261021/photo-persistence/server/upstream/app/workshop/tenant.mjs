// K13 (S1, S2): Mandantenfähigkeit in der Architektur. gravuru ist Mandant 1
// (`DEFAULT_TENANT`); jede mandantenrelevante Tabelle trägt `tenant_id`, jede
// Abfrage filtert danach. Kein Abo-Modell, kein Billing, kein Onboarding –
// nur die Trennung der Daten und die Auflösung des Mandanten je Anfrage.
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_TENANT='gravuru';
export const TENANT_ID=/^[a-z0-9][a-z0-9-]{0,39}$/;
export const SHOP_DOMAIN=/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
/** Spaltendefinition für neue `CREATE TABLE`; bestehende Tabellen bekommen sie per `ensureTenantColumn`. */
export const TENANT_COLUMN=`tenant_id TEXT NOT NULL DEFAULT '${DEFAULT_TENANT}'`;
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const sha256=value=>createHash('sha256').update(value).digest('hex');

/** Prüft den Mandanten eines Kontexts (`{tenantId}` oder `{tenant:{id}}`); ohne gültigen Mandanten 503. */
export function requireTenant(ctx){
  const id=ctx?.tenantId??ctx?.tenant?.id;
  if(typeof id!=='string'||!TENANT_ID.test(id))fail(503,'tenant_missing','Der Mandant dieser Anfrage ist nicht bestimmt.');
  return id;
}
/** Mandant aus Store-Optionen: fehlt er, gilt der Standardmandant (bestehende Aufrufe bleiben gültig). */
export const tenantOption=options=>requireTenant({tenantId:options?.tenantId??DEFAULT_TENANT});

/** Idempotent: `tenant_id` an eine bestehende Tabelle anhängen (Altdaten = Standardmandant) und indexieren. */
export function ensureTenantColumn(db,table,{index=true}={}){
  if(!/^[a-z_][a-z0-9_]*$/.test(table))throw new TypeError('Ungültiger Tabellenname.');
  const columns=db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name);
  if(!columns.length)throw Error('Tabelle '+table+' fehlt.');
  if(!columns.includes('tenant_id'))db.exec(`ALTER TABLE ${table} ADD COLUMN ${TENANT_COLUMN}`);
  if(index)db.exec(`CREATE INDEX IF NOT EXISTS ${table}_tenant ON ${table}(tenant_id)`);
}
export const ensureTenantColumns=(db,tables)=>{for(const table of tables)ensureTenantColumn(db,table);};

/** Inhaltsadressierte Schlüssel (SHA-256 von Dateien) je Mandant: der Standardmandant behält
 *  seine bisherigen Schlüssel, andere Mandanten bekommen einen eigenen Schlüsselraum, damit
 *  dieselbe Datei bei zwei Mandanten nie dieselbe Primärschlüsselzeile teilt. */
export const tenantKey=(tenantId,key)=>tenantId===DEFAULT_TENANT?key:sha256(tenantId+':'+key);

/** Datei-Ablage je Mandant: `<data>/<tenant>/<relativ>`. Nur für den Standardmandanten gilt
 *  der bisherige Pfad `<data>/<relativ>` weiter, solange dort etwas liegt (Migration: nichts verschieben). */
export function tenantDataPath(dataDirectory,tenantId,relative=''){
  const id=requireTenant({tenantId});
  if(typeof dataDirectory!=='string'||!dataDirectory||typeof relative!=='string'||path.isAbsolute(relative)||relative.split(/[\\/]/).some(p=>p==='..'))fail(422,'tenant_path','Ungültiger Ablagepfad.');
  const scoped=path.join(dataDirectory,id,relative);
  if(id!==DEFAULT_TENANT)return scoped;
  const legacy=path.join(dataDirectory,relative);
  return relative&&!fs.existsSync(scoped)&&fs.existsSync(legacy)?legacy:scoped;
}

/** Mandanten und ihre Einstellungen (Shop-Domain, Storefront-Endpunkt, Namen von Env-/Secret-Feldern –
 *  nie Werte). Lebt in der Werkstatt-Datenbank; `seed` legt den Standardmandanten an. */
export function createTenantRegistry({database:db,shopDomain=null,name='gravuru'}){
  db.exec(`CREATE TABLE IF NOT EXISTS tenants(id TEXT PRIMARY KEY,shop_domain TEXT UNIQUE,name TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('active','paused')),created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tenant_settings(tenant_id TEXT NOT NULL REFERENCES tenants(id),key TEXT NOT NULL,value TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(tenant_id,key));`);
  const at=()=>new Date().toISOString();
  const checkId=id=>requireTenant({tenantId:id});
  const checkShop=domain=>{if(domain!==null&&(typeof domain!=='string'||!SHOP_DOMAIN.test(domain)))fail(422,'tenant_shop','Shop-Domain muss eine myshopify.com-Domain sein.');return domain;};
  const row=r=>r?{id:r.id,shopDomain:r.shop_domain,name:r.name,status:r.status,createdAt:r.created_at}:null;
  const get=id=>row(db.prepare('SELECT * FROM tenants WHERE id=?').get(checkId(id)));
  const settingKeys=['shopDomain','storefrontEndpoint','storefrontApiVersion','clientSecretRef','storefrontTokenRef','adminTokenRef','productionProfileDefault'];
  function ensure({id,shopDomain:domain=null,name:label=id}){
    checkId(id);checkShop(domain);
    const existing=get(id),holder=domain===null?null:db.prepare('SELECT id FROM tenants WHERE shop_domain=?').get(domain);
    if(holder&&holder.id!==id)fail(409,'tenant_shop_taken','Diese Shop-Domain gehört bereits zu einem anderen Mandanten.');
    if(!existing)db.prepare('INSERT INTO tenants VALUES(?,?,?,?,?)').run(id,domain,String(label||id).slice(0,120),'active',at());
    // Die Laufzeitkonfiguration ist Quelle der Shop-Domain des Standardmandanten.
    else if(domain!==null&&existing.shopDomain!==domain)db.prepare('UPDATE tenants SET shop_domain=? WHERE id=?').run(domain,id);
    if(domain!==null)setSetting(id,'shopDomain',domain);
    return get(id);
  }
  function setSetting(id,key,value){
    checkId(id);if(!settingKeys.includes(key))fail(422,'tenant_setting','Unbekannte Mandanteneinstellung.');
    if(typeof value!=='string'||value.length>512||/[\u0000-\u001f]/.test(value))fail(422,'tenant_setting','Ungültiger Einstellungswert.');
    // Geheimnisse gehören nicht in die Datenbank: *Ref-Felder nennen nur den Env-/Secret-Namen.
    if(key.endsWith('Ref')&&!/^[A-Z][A-Z0-9_]{2,127}$/.test(value))fail(422,'tenant_setting','Ein Secret-Verweis nennt nur den Feldnamen (GROSSBUCHSTABEN_UNTERSTRICH).');
    if(!get(id))fail(404,'tenant_unknown','Mandant nicht gefunden.');
    db.prepare('INSERT INTO tenant_settings VALUES(?,?,?,?) ON CONFLICT(tenant_id,key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').run(id,key,value,at());
  }
  const seed=ensure({id:DEFAULT_TENANT,shopDomain:shopDomain,name});
  return {
    seed,settingKeys:Object.freeze([...settingKeys]),get,ensure,
    require(id){const t=get(id);if(!t)fail(404,'tenant_unknown','Mandant nicht gefunden.');return t;},
    byShopDomain(domain){return typeof domain==='string'&&SHOP_DOMAIN.test(domain)?row(db.prepare('SELECT * FROM tenants WHERE shop_domain=?').get(domain)):null;},
    list:()=>db.prepare('SELECT * FROM tenants ORDER BY created_at,id').all().map(row),
    settings(id){checkId(id);return Object.fromEntries(db.prepare('SELECT key,value FROM tenant_settings WHERE tenant_id=? ORDER BY key').all(id).map(r=>[r.key,r.value]));},
    setSetting,
    setStatus(id,status){if(!['active','paused'].includes(status))fail(422,'tenant_status','Unbekannter Mandantenstatus.');if(!db.prepare('UPDATE tenants SET status=? WHERE id=?').run(status,checkId(id)).changes)fail(404,'tenant_unknown','Mandant nicht gefunden.');return get(id);},
  };
}

// Kandidat der Shop-Domain aus der Anfrage. Nur zur Auswahl des Mandanten; die
// Echtheit prüfen danach die Session-, Webhook- und App-Proxy-Verifizierer des Mandanten.
const decodeClaim=part=>{try{if(!/^[A-Za-z0-9_-]+$/.test(part))return null;const v=JSON.parse(Buffer.from(part,'base64url').toString('utf8'));return v&&typeof v==='object'&&!Array.isArray(v)?v:null;}catch{return null;}};
export function shopDomainCandidate(req,url){
  const webhook=req?.headers?.['x-shopify-shop-domain'];
  if(typeof webhook==='string'&&SHOP_DOMAIN.test(webhook))return {shopDomain:webhook,source:'webhook'};
  const authorization=req?.headers?.authorization;
  if(typeof authorization==='string'&&authorization.startsWith('Bearer ')&&authorization.length<=8192){
    const parts=authorization.slice(7).split('.');
    const claims=parts.length===3?decodeClaim(parts[1]):null;
    const dest=typeof claims?.dest==='string'?claims.dest.replace(/^https:\/\//,''):'';
    if(SHOP_DOMAIN.test(dest))return {shopDomain:dest,source:'session'};
  }
  if(url instanceof URL&&url.searchParams.has('signature')){
    const shop=url.searchParams.get('shop');
    if(url.searchParams.getAll('shop').length===1&&SHOP_DOMAIN.test(shop||''))return {shopDomain:shop,source:'app-proxy'};
  }
  return null;
}
/** Mandant je Anfrage: Shop-Domain (Session, Webhook, App-Proxy) → Mandanten-Tabelle; sonst der Standardmandant.
 *  Eine unbekannte Shop-Domain fällt auf den Standardmandanten zurück, dessen Verifizierer sie dann ablehnen. */
export function tenantFromRequest(req,url,{tenants,defaultTenant=DEFAULT_TENANT}){
  const fallback=tenants.require(defaultTenant);
  const candidate=shopDomainCandidate(req,url);
  if(!candidate)return {...fallback,source:'default',shopDomainCandidate:null};
  const known=tenants.byShopDomain(candidate.shopDomain);
  if(!known)return {...fallback,source:'default',shopDomainCandidate:candidate.shopDomain};
  if(known.status!=='active')fail(503,'tenant_paused','Dieser Mandant ist derzeit pausiert.');
  return {...known,source:candidate.source,shopDomainCandidate:candidate.shopDomain};
}
