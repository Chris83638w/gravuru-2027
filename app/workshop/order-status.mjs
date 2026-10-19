// Append-only status reports; the immutable paid line and production package never change.
import {refundReport,lineRefunds} from './order-refunds.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'order_status'});};
const financials=new Set(['pending','authorized','partially_paid','paid','partially_refunded','refunded','voided','expired']);
const timestamp=value=>{if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))fail(422,'Shop-Änderungszeit fehlt oder ist ungültig.');return new Date(value).toISOString();};
export function statusReport(verified){
 const p=verified.payload;
 if(!financials.has(p.financial_status)||p.currency!=='EUR')fail(422,'Unbekannter Zahlungsstatus oder falsche Währung.');
 const updatedAt=timestamp(p.updated_at),cancelledAt=p.cancelled_at==null?null:timestamp(p.cancelled_at);
 if(verified.topic==='orders/cancelled'&&!cancelledAt)fail(422,'Stornierungszeit fehlt.');
 if(cancelledAt&&cancelledAt>updatedAt)fail(422,'Stornierung liegt nach der Änderungszeit.');
 return {financialStatus:p.financial_status,updatedAt,cancelledAt};
}
// `production(line,shop)` liefert den Freigabestand aus production-release.mjs; ohne ihn bleibt productionReady false.
export function createOrderStatus({database:db,clock=Date.now,production=null}){
 db.exec(`CREATE TABLE IF NOT EXISTS form_order_status_events(shop TEXT NOT NULL,event_id TEXT NOT NULL,body_sha256 TEXT NOT NULL,order_id TEXT NOT NULL,topic TEXT NOT NULL,financial_status TEXT NOT NULL,updated_at TEXT NOT NULL,cancelled_at TEXT,received_at TEXT NOT NULL,PRIMARY KEY(shop,event_id));
 CREATE INDEX IF NOT EXISTS form_order_status_lookup ON form_order_status_events(shop,order_id,updated_at);
 CREATE TRIGGER IF NOT EXISTS form_order_status_fixed BEFORE UPDATE ON form_order_status_events BEGIN SELECT RAISE(ABORT,'Status events are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_order_status_no_delete BEFORE DELETE ON form_order_status_events BEGIN SELECT RAISE(ABORT,'Status events require explicit retention');END;
 CREATE TABLE IF NOT EXISTS form_order_refund_reports(shop TEXT NOT NULL,event_id TEXT NOT NULL,report TEXT NOT NULL,PRIMARY KEY(shop,event_id));
 CREATE TRIGGER IF NOT EXISTS form_order_refunds_fixed BEFORE UPDATE ON form_order_refund_reports BEGIN SELECT RAISE(ABORT,'Refund reports are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_order_refunds_keep BEFORE DELETE ON form_order_refund_reports BEGIN SELECT RAISE(ABORT,'Refund reports require explicit retention');END;`);
 return {
  record(v){const s=statusReport(v),previous=db.prepare('SELECT body_sha256,topic FROM form_order_status_events WHERE shop=? AND event_id=?').get(v.shopDomain,v.eventId);
   if(previous){if(previous.body_sha256!==v.bodySha256||previous.topic!==v.topic)fail(409,'Status-Ereignis-ID wurde mit anderem Inhalt erneut geliefert.');return {duplicate:true};}
   const refunds=refundReport(v.payload);
   db.prepare('INSERT INTO form_order_status_events VALUES(?,?,?,?,?,?,?,?,?)').run(v.shopDomain,v.eventId,v.bodySha256,v.orderId,v.topic,s.financialStatus,s.updatedAt,s.cancelledAt,new Date(clock()).toISOString());
   if(refunds!==null)db.prepare('INSERT INTO form_order_refund_reports VALUES(?,?,?)').run(v.shopDomain,v.eventId,JSON.stringify(refunds));
   return {duplicate:false};
  },
  forLine(line){
   const shop=shopState(line);
   if(!production)return shop;
   const p=production(line,shop);
   return {...shop,production:{state:p.state,label:p.label,at:p.at,actor:p.actor,reason:p.reason,allowed:p.allowed,shopBlocked:p.shopBlocked,checks:p.checks,autoRelease:p.autoRelease},productionReady:p.productionReady};
  },
  shopState
 };
 // Reiner Shop-Stand (Zahlung, Storno, Erstattung) ohne Produktionsfreigabe.
 function shopState(line){
   const events=db.prepare('SELECT financial_status,updated_at,cancelled_at,topic FROM form_order_status_events WHERE shop=? AND order_id=? ORDER BY updated_at DESC,event_id').all(line.shopDomain,line.orderId);
   const latest=events[0],current=events.filter(e=>e.updated_at===latest?.updated_at),conflict=new Set(current.map(e=>e.financial_status)).size>1;
   const cancelled=events.some(e=>e.cancelled_at),financialStatus=conflict?'conflict':latest?.financial_status||'paid';
   const state=cancelled?'cancelled':financialStatus;
   const labels={cancelled:'Storniert',paid:'Bezahlt',partially_refunded:'Teilweise erstattet',refunded:'Erstattet',pending:'Zahlung offen',authorized:'Zahlung autorisiert',partially_paid:'Teilweise bezahlt',voided:'Zahlung verworfen',expired:'Zahlung abgelaufen',conflict:'Widersprüchliche Statusmeldungen'};
   const reports=db.prepare('SELECT s.updated_at,r.report FROM form_order_refund_reports r JOIN form_order_status_events s ON s.shop=r.shop AND s.event_id=r.event_id WHERE s.shop=? AND s.order_id=?').all(line.shopDomain,line.orderId).map(r=>({updatedAt:r.updated_at,report:JSON.parse(r.report)}));
   const refunds=lineRefunds(line,reports,latest?.updated_at);
   return {state,label:labels[state],financialStatus,financialLabel:labels[financialStatus],cancelled,conflict,updatedAt:latest?.updated_at||null,eventCount:events.length,requiresReview:state!=='paid'||conflict||refunds.requiresReview,refunds,scope:'order-wide',test:true,customerDownloadAllowed:false,productionReady:false};
 }
}
