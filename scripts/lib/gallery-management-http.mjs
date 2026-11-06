// Private operator surface. Services are tenant-scoped, server-owned and never
// derive source/shop identities from request fields. Existing customer UI stays intact.
import fs from 'node:fs';
const json=(res,status,value)=>res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(value));
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const files=new Map([['/originale/verwaltung',['gallery-management.html','text/html; charset=utf-8']],['/originale/verwaltung/',['gallery-management.html','text/html; charset=utf-8']],['/originale/verwaltung.js',['gallery-management.mjs','text/javascript; charset=utf-8']],['/originale/verwaltung.css',['gallery-management.css','text/css; charset=utf-8']]]);
const exposePlan=plan=>({...plan,products:plan.products?.map(({document,...p})=>p)});
export function createGalleryManagementHandler({workshop,templates,synchronizer=null,csrfToken,actor='private-galerie'}={}){
 if(!workshop?.repository||!templates||workshop.tenantId!==templates.tenantId||typeof csrfToken!=='string'||!/^[A-Za-z0-9_-]{16,256}$/.test(csrfToken))throw Error('Private scoped gallery services required');
 function catalogue(){try{return workshop.catalogStructure.read();}catch(error){return {lines:[],families:[],editable:false,issue:error.message};}}
 async function route(req,res,url){
  try{
   const origin='http://'+req.headers.host;
   if(!/^(127\.0\.0\.1|localhost|\[::1\]):[0-9]+$/.test(req.headers.host||''))fail(403,'Bitte die private Galerie neu öffnen.');
   if(files.has(url.pathname)){
    if(!['GET','HEAD'].includes(req.method))fail(405,'Diese Seite wird nur gelesen.');
    const [name,type]=files.get(url.pathname),bytes=fs.readFileSync(new URL('../../app/workshop/ui/'+name,import.meta.url));
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'self'"});res.end(req.method==='HEAD'?undefined:bytes);return;
   }
   if(req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site')fail(403,'Bitte die private Galerie neu öffnen.');
   const action=url.pathname.replace('/originale/verwaltung/api/','');
   if(req.method==='GET'){
    if(action==='context')return json(res,200,{csrfToken,sources:templates.sources(),templates:templates.list(),catalogue:catalogue(),sync:synchronizer?await synchronizer.status({}):{enabled:false,executionEnabled:false,mode:'disabled'},targets:synchronizer?await synchronizer.listTargets():[]});
    if(action==='templates')return json(res,200,{templates:templates.list(),sources:templates.sources()});
    if(action==='sync')return json(res,200,{status:synchronizer?await synchronizer.status({}):{executionEnabled:false,mode:'disabled'},targets:synchronizer?await synchronizer.listTargets():[]});
    if(action==='creation-preview'){
     if(url.searchParams.getAll('planId').length!==1||url.searchParams.getAll('key').length!==1)fail(422,'Genauen Anlageplan auswählen.');
     const plan=templates.getPlan(url.searchParams.get('planId')),product=plan.products.find(p=>p.key===url.searchParams.get('key'));
     if(!product?.document)fail(404,'Die Vorschau gehört nicht zu diesem Anlageplan.');
     const rendered=workshop.editorPreview(product.document,product.document.config.profile.defaultDesignId);
     res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src data:"}).end(rendered.svg);return;
    }
    fail(404,'Diese Verwaltungsansicht fehlt.');
   }
   if(req.method!=='POST')fail(405,'Diese Aktion wird nicht unterstützt.');
   if(req.headers.origin!==origin||req.headers['x-slate-review-csrf']!==csrfToken)fail(403,'Die Sitzung ist nicht mehr gültig. Bitte neu öffnen.');
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'Die Eingaben konnten nicht gelesen werden.');
   let size=0;const chunks=[];
   for await(const chunk of req.iterator({destroyOnReturn:false})){size+=chunk.length;if(size<=2*1024*1024)chunks.push(chunk);}
   if(size>2*1024*1024){res.setHeader('Connection','close');fail(413,'Diese Zusammenstellung ist zu groß.');}
   let input;try{input=JSON.parse(Buffer.concat(chunks));}catch{fail(400,'Die Eingaben konnten nicht gelesen werden.');}
   if(!input||typeof input!=='object'||Array.isArray(input))fail(422,'Bitte gültige Eingaben senden.');
   let result;
   if(action==='template-draft')result=templates.draft(input);
   else if(action==='template-create')result=templates.create(input,{actor});
   else if(action==='template-save'){
    if(Object.keys(input).sort().join(',')!=='document,expectedRevision,id')fail(422,'Ungültige Vorlagenänderung.');
    result=templates.save(input.id,input.document,input.expectedRevision,{actor});
   }else if(action==='creation-plan')result=exposePlan(templates.plan(input));
   else if(action==='creation-confirm')result=templates.confirm(input,{actor});
   else if(action==='creation-execute')result=templates.execute(input);
   else if(['sync-plan','sync-execute','sync-reconcile','sync-open'].includes(action)){
    if(!synchronizer)fail(503,'Die Shopzuordnung ist hier noch nicht eingerichtet.');
    result=await synchronizer[{'sync-plan':'plan','sync-execute':'execute','sync-reconcile':'reconcile','sync-open':'openPlan'}[action]](input);
   }else fail(404,'Diese Verwaltungsaktion fehlt.');
   json(res,200,result);
  }catch(error){json(res,error.status||422,{error:{code:error.code||'gallery_management_error',message:error.status>=500?'Die Aktion konnte nicht abgeschlossen werden. Deine Eingaben bleiben erhalten.':error.message,actualRevision:error.actualRevision}});}
 }
 return (req,res,url=new URL(req.url,'http://127.0.0.1'))=>{if(!files.has(url.pathname)&&!url.pathname.startsWith('/originale/verwaltung/api/'))return false;void route(req,res,url);return true;};
}
