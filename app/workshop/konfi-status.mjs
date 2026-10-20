// B1 „Konfis“: Kundenstatus je Konfigurator (Produkt) und Mandant – Entwurf / freigegeben / pausiert –
// mit unveränderlichem Ereignisprotokoll. Ohne Zeile gilt „Entwurf“ (bisheriges Verhalten: die Kundenansicht
// wird ausgeliefert). „Pausiert“ sperrt alle Kundenrouten mit einer verständlichen Meldung; gespeicherte
// Produktstände, Entwürfe und Bestellungen bleiben unberührt. Nichts wird an Shopify gesendet.
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {tenantOption,ensureTenantColumn,TENANT_COLUMN} from './tenant.mjs';

export const KONFI_STATUSES=Object.freeze(['draft','released','paused']);
export const KONFI_STATUS_LABELS=Object.freeze({draft:'Entwurf',released:'freigegeben',paused:'pausiert'});
export const PAUSED_MESSAGE='Dieses Produkt ist gerade pausiert und kann im Moment nicht gestaltet werden. Bitte versuche es später noch einmal.';
const fail=(status,code,message,extra={})=>{throw Object.assign(new Error(message),{status,code,...extra});};
const PRODUCT_ID=/^cfg_[a-f0-9-]+$/;
// Erlaubte Übergänge: freigeben aus Entwurf oder Pause, pausieren aus Entwurf oder Freigabe.
const TRANSITIONS={released:['draft','paused'],paused:['draft','released']};

/** Kundenfähig: aktives Produkt (keine Mastervorlage); Formprodukte brauchen mindestens ein Design
 *  (gleiche Bedingung wie die Kundenroute `model()` in http.mjs). Eintrag aus `repository.catalog()`. */
export function isCustomerCapable(item){
  if(!item||item.kind!=='product'||item.status==='archived')return false;
  return item.overview?.formProduct?(item.overview.designCount||0)>0:true;
}

export function createKonfiStatus({filename,tenantId}){
  const tenant=tenantOption({tenantId});
  if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
  const db=new DatabaseSync(filename);
  db.exec('PRAGMA busy_timeout=5000;');
  db.exec(`CREATE TABLE IF NOT EXISTS konfi_status(product_id TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('released','paused')),version INTEGER NOT NULL CHECK(version>=1),product_revision INTEGER NOT NULL CHECK(product_revision>=1),updated_at TEXT NOT NULL,updated_by TEXT NOT NULL,${TENANT_COLUMN},PRIMARY KEY(tenant_id,product_id));
    CREATE TABLE IF NOT EXISTS konfi_status_events(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,from_status TEXT NOT NULL CHECK(from_status IN ('draft','released','paused')),to_status TEXT NOT NULL CHECK(to_status IN ('released','paused')),product_revision INTEGER NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL,${TENANT_COLUMN});
    CREATE INDEX IF NOT EXISTS konfi_status_events_product ON konfi_status_events(tenant_id,product_id,created_at);
    CREATE TRIGGER IF NOT EXISTS konfi_status_events_fixed BEFORE UPDATE ON konfi_status_events BEGIN SELECT RAISE(ABORT,'Konfi events are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS konfi_status_events_keep BEFORE DELETE ON konfi_status_events BEGIN SELECT RAISE(ABORT,'Konfi events are immutable'); END;`);
  ensureTenantColumn(db,'konfi_status');ensureTenantColumn(db,'konfi_status_events');
  const checkId=id=>{if(typeof id!=='string'||!PRODUCT_ID.test(id))fail(422,'konfi_invalid','Ungültige Konfigurations-ID.');return id;};
  const row=id=>db.prepare('SELECT * FROM konfi_status WHERE product_id=? AND tenant_id=?').get(checkId(id),tenant);
  const publicRow=(id,r)=>({productId:id,status:r?.status||'draft',label:KONFI_STATUS_LABELS[r?.status||'draft'],changedAt:r?.updated_at||null,changedBy:r?.updated_by||null,productRevision:r?.product_revision||null});
  return {
    tenantId:tenant,
    get:id=>publicRow(id,row(id)),
    /** Alle gesetzten Status des Mandanten (Produkte ohne Zeile sind Entwürfe). */
    all:()=>new Map(db.prepare('SELECT * FROM konfi_status WHERE tenant_id=?').all(tenant).map(r=>[r.product_id,publicRow(r.product_id,r)])),
    paused:id=>typeof id==='string'&&PRODUCT_ID.test(id)&&row(id)?.status==='paused',
    set(id,{to,expectedStatus,productRevision,actor}){
      if(!Object.hasOwn(TRANSITIONS,to))fail(422,'konfi_status_invalid','Bitte „freigegeben“ oder „pausiert“ wählen.');
      if(!KONFI_STATUSES.includes(expectedStatus))fail(422,'konfi_status_invalid','Der bisherige Status fehlt.');
      if(!Number.isSafeInteger(productRevision)||productRevision<1)fail(422,'konfi_status_invalid','Produktstand fehlt.');
      if(typeof actor!=='string'||!actor||actor.length>200)fail(422,'konfi_status_invalid','Unbekannte Werkstattsitzung.');
      db.exec('BEGIN IMMEDIATE');
      try{
        const current=row(id),from=current?.status||'draft';
        if(from!==expectedStatus)fail(409,'konfi_status_conflict','Der Status wurde inzwischen geändert. Bitte die Liste aktualisieren.',{actualStatus:from});
        if(!TRANSITIONS[to].includes(from))fail(409,'konfi_status_unchanged',to==='released'?'Dieser Konfi ist bereits freigegeben.':'Dieser Konfi ist bereits pausiert.');
        const at=new Date().toISOString();
        if(current)db.prepare('UPDATE konfi_status SET status=?,version=version+1,product_revision=?,updated_at=?,updated_by=? WHERE product_id=? AND tenant_id=?').run(to,productRevision,at,actor,id,tenant);
        else db.prepare('INSERT INTO konfi_status(product_id,status,version,product_revision,updated_at,updated_by,tenant_id) VALUES(?,?,1,?,?,?,?)').run(id,to,productRevision,at,actor,tenant);
        db.prepare('INSERT INTO konfi_status_events(id,product_id,from_status,to_status,product_revision,actor,created_at,tenant_id) VALUES(?,?,?,?,?,?,?,?)').run('kevt_'+randomUUID(),id,from,to,productRevision,actor,at,tenant);
        db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
      return publicRow(id,row(id));
    },
    events:id=>db.prepare('SELECT * FROM konfi_status_events WHERE product_id=? AND tenant_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100').all(checkId(id),tenant).map(e=>({id:e.id,from:e.from_status,to:e.to_status,fromLabel:KONFI_STATUS_LABELS[e.from_status],toLabel:KONFI_STATUS_LABELS[e.to_status],productRevision:e.product_revision,actor:e.actor,at:e.created_at})),
    close:()=>db.close(),
  };
}

/** Kundenseite für einen pausierten Konfi (statt Editor). Bewusst ohne Skripte und ohne externe Dateien. */
export function pausedCustomerPage(name){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Gerade pausiert</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#fafbfb;color:#17222d;font-family:Inter,"Segoe UI",Arial,sans-serif}main{max-width:520px;margin:24px;padding:32px;background:#fff;border:1px solid #e2e7e8;border-radius:16px}h1{font-size:26px;letter-spacing:-.6px;margin:0 0 12px}p{font-size:16px;line-height:1.6;color:#606975;margin:0}</style></head><body><main><h1>${name?esc(name)+' ist gerade pausiert':'Gerade pausiert'}</h1><p>${esc(PAUSED_MESSAGE)}</p></main></body></html>`;
}
