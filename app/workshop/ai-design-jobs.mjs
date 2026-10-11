import {aiImageContext,prepareAiImageContext,applyAiImage} from './ai-image-plan.mjs';
import {AI_IMAGE_MODEL} from './openai-image-provider.mjs';
import {DatabaseSync} from 'node:sqlite';
import {aiFail,aiDigest,aiRequest,aiContext,applyAiPlan} from './ai-design-plan.mjs';
import {AI_MODEL,AI_MONTHLY_CENTS,AI_RESERVE_CENTS,openAiBody} from './openai-design-provider.mjs';
const monthAt=date=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit'}).format(date);
export function createAiDesignJobs({filename,repository,config=null,provider=null,imageProvider=null,assets=null,clock=()=>new Date()}){
 const db=new DatabaseSync(filename);let closed=false;const running=new Map();
 db.exec(`PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS ai_design_jobs (
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL, base_revision INTEGER NOT NULL, design_id TEXT NOT NULL,
 fingerprint TEXT NOT NULL, month TEXT NOT NULL, status TEXT NOT NULL, request TEXT NOT NULL,
 reserved_cents INTEGER NOT NULL CHECK(reserved_cents>=0), charged_cents INTEGER CHECK(charged_cents>=0),
 candidate TEXT, summary TEXT, changes TEXT, usage TEXT, message TEXT, applied_revision INTEGER,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS ai_design_jobs_product ON ai_design_jobs(product_id,created_at);
 CREATE INDEX IF NOT EXISTS ai_design_jobs_month ON ai_design_jobs(month);`);
 // A process restart can never imply that a paid request was not sent.
 db.prepare("UPDATE ai_design_jobs SET status='uncertain',message=?,updated_at=? WHERE status='running'").run('Auftrag beim Neustart unterbrochen. Kostenreserve bleibt erhalten; keine automatische Wiederholung.',clock().toISOString());
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}};
 const row=id=>{const r=db.prepare('SELECT * FROM ai_design_jobs WHERE id=?').get(id);if(!r)throw aiFail(404,'ai_job_missing','KI-Auftrag nicht gefunden.');return r;};
 const publicJob=r=>({id:r.id,productId:r.product_id,expectedRevision:r.base_revision,designId:r.design_id,status:r.status,kind:JSON.parse(r.request).kind||'layout',instruction:JSON.parse(r.request).instruction,summary:r.summary||'',changes:r.changes?JSON.parse(r.changes):[],reservedCents:r.reserved_cents,chargedCents:r.charged_cents,message:r.message||'',appliedRevision:r.applied_revision,createdAt:r.created_at});
 function status(){
  const month=monthAt(clock()),used=db.prepare('SELECT COALESCE(SUM(COALESCE(charged_cents,reserved_cents)),0) n FROM ai_design_jobs WHERE month=?').get(month).n;
  let reason=config?.disabledReason||'OpenAI-Zugang und Kostenfreigabe sind noch nicht eingerichtet.';
  let enabled=Boolean(config?.enabled&&provider);
  if(enabled&&(!Number.isSafeInteger(config.monthlyLimitCents)||config.monthlyLimitCents<AI_RESERVE_CENTS||config.monthlyLimitCents>AI_MONTHLY_CENTS||!Number.isFinite(Date.parse(config.pricingValidUntil))||Date.parse(config.pricingValidUntil)<=clock().getTime())){enabled=false;reason='Die befristete Preis- und Kostenprüfung muss erneuert werden.';}
  if(db.prepare("SELECT 1 FROM ai_design_jobs WHERE status='cost_review' LIMIT 1").get()){enabled=false;reason='Ein Kostenbeleg muss geprüft werden, bevor weitere KI-Aufträge möglich sind.';}
  const limit=config?.monthlyLimitCents||AI_MONTHLY_CENTS;
  return {enabled,reason:enabled?'':reason,model:AI_MODEL,month,limitCents:limit,accountedCents:used,availableCents:Math.max(0,limit-used),reservationCents:AI_RESERVE_CENTS,pricingValidUntil:config?.pricingValidUntil||null,scope:'Diese Werkstatt; vorsichtige EUR-Bewertung, keine OpenAI-Rechnung.',imageEnabled:Boolean(enabled&&config?.imagesEnabled&&imageProvider&&assets),imageModel:AI_IMAGE_MODEL,capabilities:['editable-text','layout','existing-motifs',...(enabled&&config?.imagesEnabled&&imageProvider&&assets?['image-generation','photo-edit']:[])]};
 }
 async function generate(id,context){
  const controller=new AbortController();running.set(id,controller);const timer=setTimeout(()=>controller.abort(),context.kind?240000:90000);
  try{
   let prepared=context;
   if(context.kind){try{prepared=await prepareAiImageContext(context);}catch{if(!closed&&row(id).status==='running')db.prepare("UPDATE ai_design_jobs SET status='invalid',charged_cents=0,message=?,updated_at=? WHERE id=?").run('Das Musterfoto konnte nicht gelesen werden. Kein OpenAI-Aufruf ausgeführt.',clock().toISOString(),id);return;}}
   if(closed||row(id).status!=='running')return;
   const result=await (context.kind?imageProvider:provider)(prepared,{signal:controller.signal});if(closed)return;
   const current=row(id);if(current.status!=='running')return;
   if(!Number.isSafeInteger(result.chargedCents)||result.chargedCents<0||result.chargedCents>current.reserved_cents)throw aiFail(502,'ai_usage_unconfirmed','Die KI-Kosten konnten nicht bestätigt werden.');
   db.prepare('UPDATE ai_design_jobs SET charged_cents=?,usage=?,updated_at=? WHERE id=?').run(result.chargedCents,JSON.stringify(result.usage),clock().toISOString(),id);
   try{
    const request=JSON.parse(current.request),original=repository.get(current.product_id,{revision:current.base_revision});
    const candidate=context.kind?await applyAiImage(original.document,request,result,assets):applyAiPlan(original.document,request,result.plan);if(closed||row(id).status!=='running')return;const checked=repository.validate(candidate.document);
    db.prepare("UPDATE ai_design_jobs SET status='review',candidate=?,summary=?,changes=?,updated_at=? WHERE id=?").run(JSON.stringify(checked),candidate.summary,JSON.stringify(candidate.changes),clock().toISOString(),id);
   }catch(e){if(closed||row(id).status!=='running')return;db.prepare("UPDATE ai_design_jobs SET status='invalid',message=?,updated_at=? WHERE id=?").run(e.code==='ai_plan_invalid'?e.message:'Der Vorschlag erfüllt die Produktprüfung nicht. Bitte den Auftrag präzisieren.',clock().toISOString(),id);}
  }catch(e){if(!closed&&row(id).status==='running')db.prepare('UPDATE ai_design_jobs SET status=?,message=?,updated_at=? WHERE id=?').run(e.code==='ai_usage_unconfirmed'?'cost_review':'uncertain','Keine vollständig bestätigte Antwort. Die Kostenreserve bleibt erhalten; keine automatische Wiederholung.',clock().toISOString(),id);}
  finally{clearTimeout(timer);running.delete(id);}
 }
 function preflight(productId,input){
   const request=aiRequest(input),record=repository.get(productId);
   if(record.revision!==request.expectedRevision)throw aiFail(409,'ai_stale','Bitte zuerst den aktuellen Produktstand laden.');
   const imageJob=['image_generate','photo_edit'].includes(request.kind),s=status();
   if(!s.enabled)throw aiFail(503,'ai_disabled',s.reason);
   if(imageJob&&!s.imageEnabled)throw aiFail(503,'ai_images_disabled','Bildgestaltung ist noch nicht freigeschaltet. Die vorhandene Text- und Layoutgestaltung bleibt verfügbar.');
   const context=imageJob?aiImageContext(record,request,assets):aiContext(record,request);if(!imageJob)openAiBody(context);
   return {request,record,context};
 }
 return {
  preflight,
  status,
  list(productId){return db.prepare('SELECT * FROM ai_design_jobs WHERE product_id=? ORDER BY created_at DESC,rowid DESC LIMIT 20').all(productId).map(publicJob);},
  get(id){return publicJob(row(id));},
  candidate(id){const r=row(id);if(!r.candidate||!['review','applied'].includes(r.status))throw aiFail(409,'ai_not_ready','Für diesen Auftrag liegt kein übernehmbarer Entwurf vor.');return JSON.parse(r.candidate);},
  start(productId,input){
   const request=aiRequest(input),fingerprint=aiDigest({productId,request});
   const prior=db.prepare('SELECT * FROM ai_design_jobs WHERE id=?').get(request.requestId);
   if(prior){if(prior.fingerprint!==fingerprint)throw aiFail(409,'ai_request_reused','Diese Auftragskennung gehört zu einem anderen Auftrag.');return {...publicJob(prior),duplicate:true};}
   const {record,context}=preflight(productId,request);
   transaction(()=>{
    const s=status();if(!s.enabled)throw aiFail(503,'ai_disabled',s.reason);
    if(s.availableCents<AI_RESERVE_CENTS)throw aiFail(409,'ai_budget_exhausted','Das Monatsbudget reicht nicht für die erforderliche Kostenreserve.');
    const time=clock().toISOString();db.prepare('INSERT INTO ai_design_jobs (id,product_id,base_revision,design_id,fingerprint,month,status,request,reserved_cents,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(request.requestId,productId,record.revision,request.designId,fingerprint,s.month,'running',JSON.stringify(request),AI_RESERVE_CENTS,time,time);
   });
   const job=publicJob(row(request.requestId));void generate(request.requestId,context);return job;
  },
  cancel(id){const r=row(id);if(r.status==='running'){db.prepare("UPDATE ai_design_jobs SET status='uncertain',message=?,updated_at=? WHERE id=?").run('Abgebrochen. Bereits versendete KI-Aufträge können Kosten verursachen; Reserve bleibt erhalten.',clock().toISOString(),id);running.get(id)?.abort();}else if(r.status==='review')db.prepare("UPDATE ai_design_jobs SET status='discarded',updated_at=? WHERE id=?").run(clock().toISOString(),id);return publicJob(row(id));},
  apply(id,expectedRevision){
   const r=row(id);if(expectedRevision!==r.base_revision)throw aiFail(409,'ai_stale','Der geprüfte Ausgangsstand stimmt nicht überein.');
   if(r.status==='applied')return {record:repository.get(r.product_id,{revision:r.applied_revision}),duplicate:true};
   if(r.status!=='review')throw aiFail(409,'ai_not_ready','Bitte zuerst einen gültigen Entwurf prüfen.');
   const document=JSON.parse(r.candidate),record=repository.saveOnce(r.product_id,document,r.base_revision,'ai:'+r.id,aiDigest({id:r.id,document}));
   db.prepare("UPDATE ai_design_jobs SET status='applied',applied_revision=?,updated_at=? WHERE id=?").run(record.revision,clock().toISOString(),id);
   return {record};
  },
  close(){for(const [id,controller] of running){db.prepare("UPDATE ai_design_jobs SET status='uncertain',message=?,updated_at=? WHERE id=? AND status='running'").run('Laufzeit beendet. Kostenreserve bleibt bis zur Klärung erhalten.',clock().toISOString(),id);controller.abort();}closed=true;db.close();}
 };
}
