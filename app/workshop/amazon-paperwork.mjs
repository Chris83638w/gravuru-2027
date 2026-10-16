import {createHash,randomUUID} from 'node:crypto';
import {amazonIdentifier,AMAZON_ORDER_PROVENANCE} from './amazon-orders.mjs';
import {AMAZON_PAPERWORK_RECIPE,AMAZON_PAPERWORK_FORMATS,amazonCode128,renderAmazonPaperworkPdf} from './amazon-paperwork-pdf.mjs';

const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'amazon_paperwork'});};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stages=Object.freeze(['production','quality','shipping-ready']);
export const AMAZON_PAPERWORK_STAGES=stages;
const scope=line=>[line.accountId,line.provenance,line.marketplaceId,line.orderId];
export const amazonPositionCode=line=>'G27P-'+hash([...scope(line),line.lineId]).slice(0,16).toUpperCase();
const parse=row=>JSON.parse(row.document);
const uniqueIds=(ids,name)=>{if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(id=>typeof id!=='string'||id.length>150))fail(422,`${name}: 1 bis 100 gültige Kennungen angeben.`);return [...new Set(ids)].sort();};
const text=(value,max,label)=>{if(typeof value!=='string'||value.length>max||/[\x00-\x08\x0b-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(value))fail(422,`${label} ist nicht als Testtext zulässig.`);return value;};

/** Same database/account as createAmazonOrderStore. This store can only append
 * internal TEST paperwork and scan events; it cannot mutate Amazon or snapshots. */
export function createAmazonPaperworkStore({database:db,orders,custom,clock=Date.now}){
 if(!db||typeof orders?.get!=='function'||typeof orders?.status!=='function'||!orders.accountId)fail(500,'Amazon-Bestellablage muss für Begleitscheine angeschlossen sein.');
 if(custom!==undefined&&typeof custom!=='function')fail(500,'Custom-Prüfung muss eine serverseitige Funktion sein.');
 db.exec(`CREATE TABLE IF NOT EXISTS amazon_paperwork_jobs(id TEXT PRIMARY KEY,source_key TEXT NOT NULL,fingerprint TEXT NOT NULL,format TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(source_key,format,fingerprint));
 CREATE TABLE IF NOT EXISTS amazon_paperwork_codes(code TEXT PRIMARY KEY,line_id TEXT NOT NULL UNIQUE,identity TEXT NOT NULL UNIQUE);
 CREATE TABLE IF NOT EXISTS amazon_paperwork_outputs(id TEXT PRIMARY KEY,request_key TEXT NOT NULL UNIQUE,document TEXT NOT NULL,pdf BLOB NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS amazon_paperwork_events(id INTEGER PRIMARY KEY,job_id TEXT NOT NULL,kind TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS amazon_paperwork_event_job ON amazon_paperwork_events(job_id,id);
 CREATE TABLE IF NOT EXISTS amazon_paperwork_requests(id TEXT PRIMARY KEY,kind TEXT NOT NULL,fingerprint TEXT NOT NULL,document TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS amazon_paperwork_progress(line_id TEXT PRIMARY KEY,stage INTEGER NOT NULL,revision INTEGER NOT NULL,document TEXT NOT NULL);`);
 for(const table of ['amazon_paperwork_jobs','amazon_paperwork_codes','amazon_paperwork_outputs','amazon_paperwork_events','amazon_paperwork_requests'])db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_fixed BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT,'Amazon paperwork is immutable');END;CREATE TRIGGER IF NOT EXISTS ${table}_keep BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'Amazon paperwork requires explicit retention');END;`);
 const at=()=>new Date(clock()).toISOString(),tx=fn=>{const name='amazon_paperwork_transaction';db.exec('SAVEPOINT '+name);try{const value=fn();db.exec('RELEASE '+name);return value;}catch(error){db.exec('ROLLBACK TO '+name);db.exec('RELEASE '+name);throw error;}};
 function line(id){const value=orders.get(id);if(value.test!==true||value.accountId!==orders.accountId||!AMAZON_ORDER_PROVENANCE.includes(value.provenance))fail(422,'Nur Amazon-Testpositionen desselben Kontos sind zulässig.');return value;}
 function orderLines(sourceKey){return db.prepare('SELECT id FROM amazon_order_lines WHERE source_key=? ORDER BY item_id').all(sourceKey).map(row=>line(row.id));}
 function sourceFor(id){const value=line(id),key=JSON.stringify(scope(value)),row=db.prepare('SELECT source_key FROM amazon_order_lines WHERE id=?').get(id);if(row?.source_key!==key)fail(409,'Amazon-Konto und Bestellidentität stimmen nicht überein.');return key;}
 function approvedCustom(id){
  const value=custom?.(id);if(value&&typeof value.then==='function')fail(500,'Custom-Prüfung für Begleitscheine muss synchron sein.');
  if(value?.approved!==true||!['synthetic','anonymized'].includes(value.provenance)){
   const reason=['custom_import_missing','custom_review_pending','amazon_custom_import_order_changed','amazon_custom_import_order'].includes(value?.reason)?value.reason:'custom-review-unapproved',present=Boolean(value&&(value.provenance!=null||reason!=='custom_import_missing'));
   return {approved:false,present,reason:present?reason:null,texts:[]};
  }
  const map=(items,max)=>{if(!Array.isArray(items)||items.length>32)fail(422,'Freigegebene Custom-Testfelder haben ein ungültiges Format.');return items.map(t=>({label:text(t?.label,80,'Testfeld'),value:text(t?.value,max,'Testinhalt')}));};
  const texts=map(value.texts??[],1024),options=map(value.options??[],256);if([...texts,...options].reduce((sum,t)=>sum+t.value.length,0)>4096)fail(422,'Zu viele Custom-Testtexte für einen Begleitschein.');
  const digest=name=>{const field=value[name];if(field!==undefined&&!/^[a-f0-9]{64}$/.test(field))fail(422,'Custom-Prüfsumme ist ungültig.');return field??null;};
  if(value.version!==undefined&&(!Number.isSafeInteger(value.version)||value.version<1))fail(422,'Custom-Version ist ungültig.');
  if(value.images!==undefined&&(!Array.isArray(value.images)||value.images.length>16||value.images.some(image=>!/^[a-f0-9]{64}$/.test(image?.sha256))))fail(422,'Custom-Bildprüfsummen sind ungültig.');
  return {approved:true,present:true,reason:null,provenance:value.provenance,texts:[...texts,...options],reference:{hash:digest('hash'),sourceSha256:digest('sourceSha256'),version:value.version??null,imageSha256:(value.images??[]).map(image=>image.sha256)}};
 }
 function projection(value){
  const current=orders.status(value.id),customData=approvedCustom(value.id),blockers=[...current.blockers].filter(b=>b!=='customization-not-imported');
  if((value.customizationAvailable||customData.present)&&!customData.approved)blockers.push('customization-not-approved');
  return {id:value.id,lineId:value.lineId,positionCode:amazonPositionCode(value),sku:value.sku,asin:value.asin,quantity:value.quantity,
   product:{id:value.product?.id??null,revision:value.product?.revision??null,name:value.product?.name??value.sku??'Noch nicht zugeordnet'},
   snapshotId:value.snapshotId,sourcePackageSha256:value.sourcePackageSha256,sourceUpdatedAt:value.updatedAt,
   customizationAvailable:value.customizationAvailable,customPresent:customData.present,customStatus:customData.reason,customApproved:customData.approved,customTexts:customData.texts,customReference:customData.reference??null,blockers};
 }
 function documentFor(sourceKey,format){
  if(!Object.hasOwn(AMAZON_PAPERWORK_FORMATS,format))fail(422,'Papierformat A4 oder A5 wählen.');const values=orderLines(sourceKey);if(!values.length||values.length>100)fail(422,'Auftrag benötigt 1 bis 100 Testpositionen.');
  const [accountId,provenance,marketplaceId,orderId]=JSON.parse(sourceKey),lines=values.map(projection);amazonCode128(orderId,{availableWidthMm:AMAZON_PAPERWORK_FORMATS[format][0]-24});
  return {schema:AMAZON_PAPERWORK_RECIPE,format,accountId,provenance,marketplaceId,orderId,lines,test:true,productionReady:false,customerDownloadAllowed:false};
 }
 const row=id=>{const value=db.prepare('SELECT * FROM amazon_paperwork_jobs WHERE id=?').get(id);if(!value)fail(404,'Begleitschein-Auftrag nicht gefunden.');if(hash(parse(value))!==value.fingerprint)fail(409,'Gesicherter Begleitschein hat eine abweichende Prüfsumme.');return value;};
 const checkedOutput=value=>{if(!value)fail(404,'PDF-Ausgabe nicht gefunden.');const metadata=parse(value),pdf=Buffer.from(value.pdf);if(createHash('sha256').update(pdf).digest('hex')!==metadata.sha256)fail(409,'Gesicherte PDF-Ausgabe hat eine abweichende Prüfsumme.');return {...metadata,pdf};};
 function safety(r){
  const doc=parse(r),current=documentFor(r.source_key,r.format),blockers=[];
  if(hash(current)!==r.fingerprint)blockers.push('paperwork-source-changed');
  for(const value of orderLines(r.source_key)){const status=orders.status(value.id);if(status.cancelled)blockers.push('cancelled');if(status.cancellationRequested)blockers.push('cancellation-requested');if(status.conflict)blockers.push('conflicting-source-events');if(status.changed)blockers.push('order-changed-after-assignment');if(status.missing)blockers.push('item-missing-in-latest-order');}
  return {document:doc,blockers:[...new Set(blockers)]};
 }
 const event=(id,kind,document)=>db.prepare('INSERT INTO amazon_paperwork_events(job_id,kind,document,created_at) VALUES(?,?,?,?)').run(id,kind,JSON.stringify(document),at());
 const history=id=>db.prepare('SELECT kind,document,created_at FROM amazon_paperwork_events WHERE job_id=? ORDER BY id').all(id).map(r=>({kind:r.kind,...parse(r),at:r.created_at}));
 function get(id){const r=row(id),events=history(id),state=safety(r);return {id:r.id,format:r.format,createdAt:r.created_at,fingerprint:r.fingerprint,document:state.document,status:events.some(e=>e.kind==='print-confirmed')?'print-confirmed':events.some(e=>e.kind==='generated')?'generated':'queued',blocked:state.blockers.length>0,blockers:state.blockers,openChecks:[...new Set(state.document.lines.flatMap(l=>l.blockers))],test:true,productionReady:false};}
 function rememberCodes(document){for(const value of document.lines){const identity=JSON.stringify([document.accountId,document.provenance,document.marketplaceId,document.orderId,value.lineId]),old=db.prepare('SELECT * FROM amazon_paperwork_codes WHERE code=? OR line_id=? OR identity=?').all(value.positionCode,value.id,identity);if(old.length&&old.some(row=>row.code!==value.positionCode||row.line_id!==value.id||row.identity!==identity))fail(409,'Positionscode kollidiert; Zuordnung wurde nicht verändert.');db.prepare('INSERT OR IGNORE INTO amazon_paperwork_codes VALUES(?,?,?)').run(value.positionCode,value.id,identity);}}
 function request(id,kind,fingerprint){amazonIdentifier(id,'Aktions-ID');const previous=db.prepare('SELECT * FROM amazon_paperwork_requests WHERE id=?').get(id);if(previous&&(previous.kind!==kind||previous.fingerprint!==fingerprint))fail(409,'Aktions-ID wurde bereits für einen anderen Vorgang verwendet.');return previous?parse(previous):null;}
 const saveRequest=(id,kind,fingerprint,result)=>db.prepare('INSERT INTO amazon_paperwork_requests VALUES(?,?,?,?)').run(id,kind,fingerprint,JSON.stringify(result));
 function normalizeScope(input){const value={};for(const key of ['accountId','marketplaceId'])if(input[key]!==undefined)value[key]=amazonIdentifier(input[key],key);if(input.provenance!==undefined){if(!AMAZON_ORDER_PROVENANCE.includes(input.provenance))fail(422,'Nur Testherkunft ist zulässig.');value.provenance=input.provenance;}if(value.accountId&&value.accountId!==orders.accountId)fail(404,'Scan gehört nicht zu diesem Amazon-Konto.');return value;}
 function resolveScan(input={}){
  const filters=normalizeScope(input),code=typeof input.code==='string'?input.code.replace(/[\r\n]+$/,''):'';if(!code||code.length>128||/[^\x20-\x7e]/.test(code))fail(422,'Scan enthält keine gültige vollständige Kennung.');
  const matches=[];const position=db.prepare('SELECT * FROM amazon_paperwork_codes WHERE code=?').get(code);if(position){const value=line(position.line_id);if(Object.entries(filters).every(([k,v])=>value[k]===v))matches.push({kind:'position',sourceKey:sourceFor(value.id),values:[value]});}
  for(const r of db.prepare('SELECT DISTINCT source_key FROM amazon_order_lines').all()){const [accountId,provenance,marketplaceId,orderId]=JSON.parse(r.source_key),key={accountId,provenance,marketplaceId};if(orderId===code&&Object.entries(filters).every(([k,v])=>key[k]===v))matches.push({kind:'order',sourceKey:r.source_key,values:orderLines(r.source_key)});}
  if(!matches.length)fail(404,'Barcode gehört zu keinem bekannten Amazon-Testauftrag.');if(matches.length!==1)fail(409,'Amazon-Kennung ist mehrdeutig. Konto, Marketplace und Testherkunft auswählen.');
  const match=matches[0],[accountId,provenance,marketplaceId,orderId]=JSON.parse(match.sourceKey);
  return {kind:match.kind,code,accountId,provenance,marketplaceId,orderId,positions:match.values.map(value=>{const progress=db.prepare('SELECT * FROM amazon_paperwork_progress WHERE line_id=?').get(value.id),p=projection(value),sourceFingerprint=hash(p),blockers=[...p.blockers];if(progress&&parse(progress).sourceFingerprint!==sourceFingerprint)blockers.push('progress-source-changed');return {lineId:value.id,orderItemId:value.lineId,positionCode:p.positionCode,sku:p.sku,asin:p.asin,quantity:p.quantity,snapshotId:p.snapshotId,blockers,sourceFingerprint,stage:progress?stages[progress.stage-1]:null,revision:progress?.revision??0};}),test:true,productionReady:false,shippingStatusChanged:false};
 }
 return {get,resolveScan,
  list({limit=100,offset=0}={}){if(!Number.isSafeInteger(limit)||limit<1||limit>200||!Number.isSafeInteger(offset)||offset<0)fail(422,'Ungültiger Warteschlangenausschnitt.');return {jobs:db.prepare('SELECT id FROM amazon_paperwork_jobs ORDER BY rowid DESC LIMIT ? OFFSET ?').all(limit,offset).map(r=>get(r.id)),total:db.prepare('SELECT count(*) AS n FROM amazon_paperwork_jobs').get().n};},
  events(id){row(id);return history(id);},
  enqueue({lineIds,format='A4'}={}){const ids=uniqueIds(lineIds,'Positionen');return tx(()=>{const sourceKeys=[...new Set(ids.map(sourceFor))],jobs=[];for(const key of sourceKeys){const document=documentFor(key,format),fingerprint=hash(document),old=db.prepare('SELECT id FROM amazon_paperwork_jobs WHERE source_key=? AND format=? AND fingerprint=?').get(key,format,fingerprint);if(old){jobs.push(get(old.id));continue;}rememberCodes(document);const id='amazonpaper_'+randomUUID();db.prepare('INSERT INTO amazon_paperwork_jobs VALUES(?,?,?,?,?,?)').run(id,key,fingerprint,format,JSON.stringify(document),at());event(id,'queued',{test:true});jobs.push(get(id));}return {jobs,test:true,productionReady:false};});},
  generate({jobIds}={}){const ids=uniqueIds(jobIds,'Begleitscheine');return tx(()=>{const documents=ids.map(id=>{const state=safety(row(id));if(state.blockers.length)fail(409,'Begleitschein gesperrt: Auftrag storniert, widersprüchlich oder seit Einreihung verändert.');return state.document;}),requestKey=hash([AMAZON_PAPERWORK_RECIPE,ids]);let output=db.prepare('SELECT * FROM amazon_paperwork_outputs WHERE request_key=?').get(requestKey);
   if(!output){const rendered=renderAmazonPaperworkPdf(documents),id='amazonprint_'+randomUUID(),metadata={id,jobIds:ids,sha256:rendered.sha256,pageCount:rendered.pageCount,createdAt:at(),test:true,productionReady:false};db.prepare('INSERT INTO amazon_paperwork_outputs VALUES(?,?,?,?,?)').run(id,requestKey,JSON.stringify(metadata),rendered.pdf,at());for(const jobId of ids)event(jobId,'generated',{outputId:id,sha256:rendered.sha256,test:true});output=db.prepare('SELECT * FROM amazon_paperwork_outputs WHERE id=?').get(id);}
   return {...checkedOutput(output),outputId:output.id,jobs:ids.map(get)};
  });},
  output(id){return {...checkedOutput(db.prepare('SELECT * FROM amazon_paperwork_outputs WHERE id=?').get(id)),historical:true};},
  confirmPrinted({jobIds,outputId,requestId}={}){const ids=uniqueIds(jobIds,'Begleitscheine'),fingerprint=hash({jobIds:ids,outputId});return tx(()=>{const previous=request(requestId,'print-confirmed',fingerprint);if(previous)return previous;const output=db.prepare('SELECT * FROM amazon_paperwork_outputs WHERE id=?').get(outputId);if(!output||JSON.stringify(checkedOutput(output).jobIds)!==JSON.stringify(ids))fail(409,'Druckbestätigung benötigt genau die zuvor erzeugte PDF-Ausgabe.');for(const id of ids){if(safety(row(id)).blockers.length)fail(409,'Veralteter oder gesperrter Begleitschein kann nicht als aktueller Druck bestätigt werden.');}
   const result={requestId,outputId,jobIds:ids,status:'print-confirmed',confirmedAt:at(),physicalPrintingVerified:false,test:true,productionReady:false};for(const id of ids)event(id,'print-confirmed',{requestId,outputId,sha256:parse(output).sha256,physicalPrintingVerified:false,test:true});saveRequest(requestId,'print-confirmed',fingerprint,result);return result;});},
  scan(input={}){if(!stages.includes(input.stage))fail(422,'Teststufe production, quality oder shipping-ready ausdrücklich wählen.');const normalized={code:input.code,stage:input.stage,...normalizeScope(input)},fingerprint=hash(normalized);return tx(()=>{const previous=request(input.requestId,'scan',fingerprint),resolved=resolveScan(input);for(const position of resolved.positions){if(position.blockers.length)fail(409,'Scan-Status ist gesperrt. Stornierung, Gestaltung, Menge, Personalisierung und Bestellstand prüfen.');}if(previous)return {...previous,replayed:true};
   const target=stages.indexOf(input.stage)+1;for(const position of resolved.positions){const current=position.stage?stages.indexOf(position.stage)+1:0;if(target>current+1)fail(409,'Teststufen müssen in der Reihenfolge Fertigung, Qualität, Versandvorbereitung erfolgen.');}
   let changed=0;for(const position of resolved.positions){const current=position.stage?stages.indexOf(position.stage)+1:0;if(target<=current)continue;const document={lineId:position.lineId,sourceFingerprint:position.sourceFingerprint,stage:input.stage,revision:position.revision+1,requestId:input.requestId,at:at(),test:true,productionReady:false};db.prepare('INSERT INTO amazon_paperwork_progress VALUES(?,?,?,?) ON CONFLICT(line_id) DO UPDATE SET stage=excluded.stage,revision=excluded.revision,document=excluded.document').run(position.lineId,target,document.revision,JSON.stringify(document));changed++;}
   const result={requestId:input.requestId,stage:input.stage,changed,...resolveScan(input),at:at()};saveRequest(input.requestId,'scan',fingerprint,result);return result;
  });},
  scanEvents({lineId,limit=100}={}){if(!Number.isSafeInteger(limit)||limit<1||limit>200)fail(422,'Ungültige Ereignisanzahl.');if(lineId)line(lineId);return db.prepare("SELECT document FROM amazon_paperwork_requests WHERE kind='scan' ORDER BY rowid DESC").all().map(parse).filter(event=>!lineId||event.positions.some(p=>p.lineId===lineId)).slice(0,limit);}
 };
}
