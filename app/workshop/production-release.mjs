// Append-only Produktionsstatus je Bestellposition (Paket K5, Ü7.3/B4).
// Die bezahlte Position und ihr Fertigungspaket bleiben unverändert; hier werden
// ausschließlich Übergänge mit Zeit, Akteur und Grund angehängt.
import {tenantOption,ensureTenantColumn,TENANT_COLUMN} from './tenant.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'production_release'});};
export const PRODUCTION_STATES=Object.freeze(['eingegangen','geprueft','freigegeben','in_fertigung','fertig','fehler']);
export const PRODUCTION_LABELS=Object.freeze({eingegangen:'Eingegangen',geprueft:'Geprüft',freigegeben:'Freigegeben',in_fertigung:'In Fertigung',fertig:'Fertig',fehler:'Fehler'});
export const SYSTEM_ACTOR='system';
export const SHOP_BLOCK_REASON='Storniert/erstattet im Shop';
// Erlaubte Übergänge je Ausgangszustand; „fehler“ ab geprueft aus jedem Zustand, zurück nur nach geprueft.
const NEXT=Object.freeze({eingegangen:['geprueft'],geprueft:['freigegeben','fehler'],freigegeben:['in_fertigung','fehler'],in_fertigung:['fertig','fehler'],fertig:['fehler'],fehler:['geprueft']});
const RELEASED=new Set(['freigegeben','in_fertigung','fertig']);
const text=(value,max,required,what)=>{if(value===undefined||value===null)value='';if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(422,what+' ist ungültig oder zu lang.');value=value.trim();if(required&&!value)fail(422,what+' ist erforderlich.');return value;};
export function createProductionRelease({database:db,clock=Date.now,line,shopStatus,autoRelease=null,rejectedLines=null,tenantId}){
 if(typeof line!=='function'||typeof shopStatus!=='function')fail(503,'Freigabeprozess benötigt Zugriff auf Bestellposition und Shop-Status.');
 const tenant=tenantOption({tenantId});
 db.exec(`CREATE TABLE IF NOT EXISTS production_release_events(id INTEGER PRIMARY KEY,line_id TEXT NOT NULL,from_state TEXT NOT NULL,to_state TEXT NOT NULL,actor TEXT NOT NULL,reason TEXT NOT NULL,at TEXT NOT NULL,${TENANT_COLUMN});
 CREATE INDEX IF NOT EXISTS production_release_line ON production_release_events(line_id,id);
 CREATE TRIGGER IF NOT EXISTS production_release_fixed BEFORE UPDATE ON production_release_events BEGIN SELECT RAISE(ABORT,'Production release events are immutable');END;
 CREATE TRIGGER IF NOT EXISTS production_release_no_delete BEFORE DELETE ON production_release_events BEGIN SELECT RAISE(ABORT,'Production release events require explicit retention');END;`);
 ensureTenantColumn(db,'production_release_events');
 const tx=fn=>{if(db.isTransaction)return fn();db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}};
 const at=()=>new Date(clock()).toISOString();
 const events=lineId=>db.prepare('SELECT from_state,to_state,actor,reason,at FROM production_release_events WHERE line_id=? AND tenant_id=? ORDER BY id').all(lineId,tenant).map(e=>({from:e.from_state,to:e.to_state,actor:e.actor,reason:e.reason,at:e.at}));
 const blocked=shop=>Boolean(shop?.cancelled||shop?.financialStatus==='refunded');
 const checkTables=()=>db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('export_output_checks','form_export_jobs')").get().n===2;
 // Automatische Prüfungen (output-checks.mjs) zur gesicherten Gestaltung: je Ausgabe,
 // Datei und Prüfschritt zählt der jüngste Vermerk. Grün nur mit mindestens einem Vermerk und ohne „failed“.
 function checks(snapshotId){
  if(!checkTables()||typeof snapshotId!=='string')return {total:0,passed:0,failed:0,ok:false};
  const rows=db.prepare('SELECT c.job_id,c.document FROM export_output_checks c JOIN form_export_jobs j ON j.id=c.job_id AND j.tenant_id=c.tenant_id WHERE j.snapshot_id=? AND j.tenant_id=? ORDER BY c.rowid DESC').all(snapshotId,tenant);
  const latest=new Map();
  for(const r of rows){const d=JSON.parse(r.document),key=r.job_id+'|'+d.format+'|'+d.stage;if(!latest.has(key))latest.set(key,d.result);}
  const results=[...latest.values()],passed=results.filter(r=>r==='passed').length,failed=results.filter(r=>r==='failed').length;
  return {total:results.length,passed,failed,ok:results.length>0&&failed===0};
 }
 function autoReleaseFor(l){if(typeof autoRelease!=='function')return false;try{return autoRelease(l)===true;}catch{return false;}}
 function current(lineId){const l=line(lineId),history=events(lineId),last=history.at(-1);return {line:l,history,state:last?last.to:'eingegangen',last};}
 function append(lineId,from,to,actor,reason){db.prepare('INSERT INTO production_release_events(line_id,from_state,to_state,actor,reason,at,tenant_id) VALUES(?,?,?,?,?,?,?)').run(lineId,from,to,actor,reason,at(),tenant);}
 function state(lineId,{shop}={}){
  const {line:l,history,state:s,last}=current(lineId),shopState=shop??shopStatus(l),shopBlocked=blocked(shopState),automatic=checks(l.snapshotId),auto=autoReleaseFor(l);
  const allowed=l.intakeError?[]:NEXT[s].filter(to=>!(shopBlocked&&(to==='freigegeben'||to==='in_fertigung')));
  return {lineId,state:s,label:PRODUCTION_LABELS[s],at:last?last.at:l.receivedAt||null,actor:last?last.actor:null,reason:last?last.reason:'',events:history,allowed,shopBlocked,checks:automatic,autoRelease:auto,productionReady:RELEASED.has(s)&&automatic.ok};
 }
 // Bestandene automatische Prüfung setzt bei autoRelease:true am Fertigungsprofil
 // „geprueft“ und „freigegeben“ ohne Person; eine Sperre aus dem Shop verhindert das.
 function evaluateAuto(lineId){
  const {line:l,state:s}=current(lineId);
  if(!['eingegangen','geprueft'].includes(s)||!autoReleaseFor(l)||blocked(shopStatus(l))||!checks(l.snapshotId).ok)return false;
  const reason='Automatische Prüfung bestanden';
  if(s==='eingegangen')append(lineId,'eingegangen','geprueft',SYSTEM_ACTOR,reason);
  append(lineId,'geprueft','freigegeben',SYSTEM_ACTOR,reason);
  return true;
 }
 return {
  state,
  events,
  checks,
  transition(lineId,to,{actor,reason}={}){
   if(!PRODUCTION_STATES.includes(to)||to==='eingegangen')fail(422,'Unbekannter Zielzustand.');
   actor=text(actor,200,true,'Akteur');reason=text(reason,2000,to==='fehler','Grund');
   return tx(()=>{
    const {line:l,state:from}=current(lineId);
    if(l.intakeError)fail(409,'Abgelehnte Bestellposition ohne gesicherten Entwurf: kein Fertigungsübergang möglich. Grund: '+l.intakeError);
    if(!NEXT[from].includes(to))fail(409,'Übergang von „'+PRODUCTION_LABELS[from]+'“ nach „'+PRODUCTION_LABELS[to]+'“ ist nicht erlaubt.');
    if((to==='freigegeben'||to==='in_fertigung')&&blocked(shopStatus(l)))fail(409,'Bestellung ist im Shop storniert oder erstattet; keine Freigabe möglich.');
    append(lineId,from,to,actor,reason);
    if(to==='geprueft')evaluateAuto(lineId);
    return state(lineId);
   });
  },
  // E3: Im Bestelleingang abgelehnte Position (kein gesicherter Entwurf, Preis/Menge/Variante
  // abweichend …) steht im Freigabeprozess sofort als „fehler“ mit dem Grund aus dem Eingang.
  rejectIntake(lineId,reason){return tx(()=>{
   if(events(lineId).length)return false;
   append(lineId,'eingegangen','fehler',SYSTEM_ACTOR,text(reason,2000,true,'Grund'));return true;
  });},
  // Storno/Erstattung aus dem Shop: vor Fertigungsbeginn automatisch „fehler“.
  syncShop(lineId){return tx(()=>{
   const {line:l,state:s}=current(lineId);
   if(!blocked(shopStatus(l))||!['eingegangen','geprueft','freigegeben'].includes(s))return false;
   append(lineId,s,'fehler',SYSTEM_ACTOR,SHOP_BLOCK_REASON);return true;
  });},
  // Nach einem neuen Prüfvermerk: alle Positionen dieser Gestaltung erneut bewerten.
  reviewSnapshot(snapshotId){return tx(()=>{
   if(typeof snapshotId!=='string')return [];
   const ids=db.prepare("SELECT id FROM form_order_lines WHERE json_extract(document,'$.snapshotId')=? AND tenant_id=?").all(snapshotId,tenant).map(r=>r.id);
   return ids.filter(id=>evaluateAuto(id));
  });},
  list({state:filter}={}){
   if(filter!==undefined&&!PRODUCTION_STATES.includes(filter))fail(422,'Unbekannter Produktionsstatus.');
   const latest=new Map(db.prepare('SELECT line_id,to_state,at FROM production_release_events WHERE tenant_id=? AND id IN (SELECT max(id) FROM production_release_events WHERE tenant_id=? GROUP BY line_id)').all(tenant,tenant).map(r=>[r.line_id,r]));
   const rows=db.prepare('SELECT id,created_at FROM form_order_lines WHERE tenant_id=? ORDER BY rowid DESC LIMIT 200').all(tenant).map(r=>{const e=latest.get(r.id);return {lineId:r.id,state:e?e.to_state:'eingegangen',label:PRODUCTION_LABELS[e?e.to_state:'eingegangen'],at:e?e.at:r.created_at};});
   // Abgelehnte Positionen aus dem Bestelleingang (E3) erscheinen als „fehler“ mit Grund.
   const rejectedRows=typeof rejectedLines==='function'?rejectedLines().map(d=>{const e=latest.get(d.id);return {lineId:d.id,state:e?e.to_state:'fehler',label:PRODUCTION_LABELS[e?e.to_state:'fehler'],at:e?e.at:d.receivedAt,orderId:d.orderId,shopLineId:d.lineId,reason:d.intakeError,rejected:true};}):[];
   const all=[...rows,...rejectedRows];
   return filter===undefined?all:all.filter(r=>r.state===filter);
  }
 };
}
