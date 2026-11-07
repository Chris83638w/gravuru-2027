import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {createSlateReviewComments} from './slate-review-comments.mjs';
import {slateGalleryHtml,reviewThemes} from './slate-review-gallery-page.mjs';
import {designReviewCategory} from './design-review-targets.mjs';
import {withSlateReviewMetadata} from './slate-review-catalog.mjs';
import {createSlateReviewPositions} from '../../app/workshop/slate-review-positions.mjs';
import {createDesignReviewApprovals} from './design-review-approvals.mjs';
import {createSlateApprovalTargetSource} from './slate-review-approval-targets.mjs';
import {buildDesignReviewOverview, designReviewOverviewHtml} from './design-review-overview.mjs';
import {createGalleryEditorHandler} from './gallery-editor-http.mjs';
import {createProductGroupTemplates} from '../../app/workshop/product-group-templates.mjs';
import {createGalleryManagementHandler} from './gallery-management-http.mjs';
import {galleryProductGroupSources} from './gallery-management-targets.mjs';
import {createGalleryManagementCreationGate} from './gallery-management-creation-gate.mjs';
import {createGalleryDesignAssignments} from '../../app/workshop/gallery-design-assignments.mjs';
import {createGalleryReviewRegistry} from './gallery-review-registry.mjs';
import {galleryAssignmentCatalogue} from './gallery-assignment-catalogue.mjs';
import {galleryReviewPage} from './gallery-review-pagination.mjs';
export {slateGalleryHtml};
export function createSlateGalleryHandler(root, importsFile, {csrfToken: suppliedToken,workshop,management={},fingerprintCacheFile} = {}) {
 let pack=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),imported=JSON.parse(fs.readFileSync(importsFile));
 pack.originals=pack.originals.map(row=>{
  const file=path.resolve(root,'originals',row.id,'design.json');
  if(!file.startsWith(path.resolve(root,'originals')+path.sep))throw Error('Invalid original path');
  return withSlateReviewMetadata(row,fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{});
 });
 const registry=createGalleryReviewRegistry({pack,imported,repository:workshop?.repository});
 let registrySignature=null,positions=null,approvalTargets=null,approvals=null,fullEditor=null;
 const csrfToken=suppliedToken||randomBytes(32).toString('hex');
 function refreshRegistry(){
  const next=registry.read();if(next.signature===registrySignature)return;
  approvalTargets?.flushCache();approvals?.close();
  pack=next.pack;imported=next.imported;
  positions=workshop?createSlateReviewPositions({workshop,pack,imported}):null;
  approvalTargets=createSlateApprovalTargetSource({pack,imported,workshop,cacheFile:fingerprintCacheFile===undefined?path.join(path.dirname(importsFile),'review-fingerprint-cache.json'):fingerprintCacheFile});
  approvals=createDesignReviewApprovals(path.join(path.dirname(importsFile),'review-approvals.sqlite'),approvalTargets);
  fullEditor=workshop?createGalleryEditorHandler({workshop,targets:approvalTargets.targets,csrfToken,onSaved:()=>approvalTargets.beginRead()}):null;
  registrySignature=next.signature;
 }
 refreshRegistry();
 const comments=createSlateReviewComments(path.join(path.dirname(importsFile),'review-comments.sqlite'),pack.originals.map(r=>r.id));
 const approvalBundle=(originalIds=null)=>{
  approvalTargets.beginRead();
  const summary=approvals.summary();
  const keys=originalIds?approvalTargets.targets.filter(t=>originalIds.includes(t.id)).map(t=>t.key):null;
  const states=originalIds?approvals.all(keys):summary;
  approvalTargets.flushCache();
  const overview=buildDesignReviewOverview(Object.values(summary).map(state=>({...state.metadata,key:state.key,status:state.status})),{expectedCategories:null});
  return {approvals:states,overview,overviewHtml:designReviewOverviewHtml(overview)};
 };
 const catalogue=management.assignmentCatalogue||galleryAssignmentCatalogue(root);
 const assignments=workshop?createGalleryDesignAssignments({workshop,catalogue,
  listTargets:()=>approvalTargets.targets.map(t=>({...t,originalId:t.id,material:{key:t.materialKey,label:t.material,kind:t.materialKind}})),
  originalFor:id=>{const row=pack.originals.find(row=>row.id===id);if(!row)return null;const reviewCategory=designReviewCategory(row);return {...row,reviewCategory,reviewThemes:reviewThemes(row,reviewCategory)};}}):null;
 const productGroups=workshop?createProductGroupTemplates({filename:management.filename||path.join(path.dirname(importsFile),'workshop.sqlite'),repository:workshop.repository,tenantId:workshop.tenantId,
  targets:()=>galleryProductGroupSources(workshop,approvalTargets.targets),
  offeringFor:scope=>{
   const catalogue=workshop.catalogStructure.read(),line=catalogue.lines?.find(l=>l.id===scope.lineId),sub=line?.subcategories?.find(s=>s.id===scope.subcategoryId);
   if(!line||line.enabled===false||!sub||!Array.isArray(sub.effectiveFamilyIds))return null;
   return {familyIds:sub.effectiveFamilyIds,fingerprint:createHash('sha256').update(JSON.stringify({source:catalogue.sourceSha256,scope,families:sub.effectiveFamilyIds})).digest('hex')};
  }}):null;
 const sourceApproval=({mapping})=>{
  approvalTargets.beginRead();
  const target=approvalTargets.targets.find(t=>t.productId===mapping.source.productId&&t.designId===mapping.source.designId&&t.id===mapping.source.originalId);
  return {approved:!!target&&approvals.get(target.key)?.status==='approved',reason:'Die aktuelle Galerievorlage muss für genau dieses Material und Format bestätigt sein.'};
 };
 const synchronizer=typeof management.synchronizer==='function'?management.synchronizer({workshop,sourceApproval}):management.synchronizer||null;
 const manage=productGroups?createGalleryManagementHandler({workshop,templates:productGroups,synchronizer,csrfToken}):null;
 const creationGate=manage?createGalleryManagementCreationGate():null;
 const json=(res,status,data)=>res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(data));
 const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
 const withReviewFingerprint=record=>{
  approvalTargets.beginRead();
  const target=approvalTargets.targets.find(t=>t.productId===record.productId&&t.designId===record.designId);
  const state=target&&approvals.get(target.key);
  return {...record,reviewFingerprint:state?.metadata.productRevision===record.revision?state.fingerprint:null};
 };
 async function editPositions(req,res,url){
  try{
   if(!positions)fail(503,'Die direkte Bearbeitung ist hier noch nicht verbunden.');
   if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host||req.headers['sec-fetch-site']==='cross-site')fail(403,'Bitte die Galerie neu laden.');
   if(req.method==='GET'){
    if([...url.searchParams.keys()].some(key=>!['productId','designId'].includes(key))||url.searchParams.getAll('productId').length!==1||url.searchParams.getAll('designId').length!==1)fail(422,'Bitte genau eine Vorlage und ihr Format wählen.');
    return json(res,200,withReviewFingerprint(positions.open(url.searchParams.get('productId'),url.searchParams.get('designId'))));
   }
   if(req.method!=='PATCH')fail(405,'Vorlagen werden hier gelesen oder Positionen und Größen gespeichert.');
   if(req.headers.origin!=='http://'+req.headers.host||req.headers['x-slate-review-csrf']!==csrfToken)fail(403,'Bitte die Galerie neu laden.');
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'Änderungen konnten nicht gelesen werden.');
   let size=0;const chunks=[];
   for await(const chunk of req.iterator({destroyOnReturn:false})){size+=chunk.length;if(size<=65536)chunks.push(chunk);}
   if(size>65536)fail(413,'Zu viele Änderungsdaten.');
   let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'Änderungen konnten nicht gelesen werden.');}
   json(res,200,withReviewFingerprint(positions.save(input)));
  }catch(error){
   // An over-limit async body reader closes its request. Advertise that close
   // so the private proxy never reuses the just-rejected loopback connection.
   if(error.status===413){req.resume();res.setHeader('Connection','close');}
   json(res,error.status||500,{error:error.status?error.message:'Speichern ist momentan nicht möglich. Deine Änderungen bleiben erhalten.',code:error.code,actualRevision:error.actualRevision});
  }
 }
 async function saveComment(req,res){
  try{
   if(req.headers.origin!=='http://'+req.headers.host||req.headers['x-slate-review-csrf']!==csrfToken)fail(403,'Bitte die Galerie neu laden.');
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'Kommentar konnte nicht gelesen werden.');
   let size=0;const chunks=[];
   for await(const chunk of req.iterator({destroyOnReturn:false})){size+=chunk.length;if(size<=65536)chunks.push(chunk);}
   if(size>65536)fail(413,'Der Kommentar ist zu lang.');
   let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'Kommentar konnte nicht gelesen werden.');}
   if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['designId','text','expectedRevision'].includes(k)))fail(422,'Ungültiger Kommentar.');
   const comment=comments.save(input.designId,input.text,input.expectedRevision);
   json(res,200,{designId:input.designId,comment});
  }catch(error){json(res,error.status||500,{error:error.status?error.message:'Speichern ist momentan nicht möglich. Deine Eingabe bleibt erhalten.'});}
 }
 function approvalScope(url){
  if([...url.searchParams.keys()].some(key=>key!=='originalIds'))fail(422,'Unbekannter Freigabeumfang.');
  if(!url.searchParams.has('originalIds'))return null;
  if(url.searchParams.getAll('originalIds').length!==1)fail(422,'Bitte die angezeigten Vorlagen eindeutig wählen.');
  let ids;try{ids=JSON.parse(url.searchParams.get('originalIds'));}catch{fail(422,'Ungültige Vorlagenauswahl.');}
  const known=new Set(pack.originals.map(row=>row.id));
  if(!Array.isArray(ids)||ids.length>60||new Set(ids).size!==ids.length||ids.some(id=>!known.has(id)))fail(422,'Bitte höchstens 60 bekannte Vorlagen wählen.');
  return ids;
 }
 async function reviewApprovals(req,res,url){
  try{
   const scope=approvalScope(url);
   if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host||req.headers['sec-fetch-site']==='cross-site')fail(403,'Bitte die Galerie neu laden.');
   if(req.method==='GET')return json(res,200,scope===null?(()=>{approvalTargets.beginRead();const result=approvalBundle();return {...result,approvals:approvals.all()};})():approvalBundle(scope));
   if(req.method!=='POST')return json(res,405,{error:'Diese Aktion wird nicht unterstützt.'});
   if(req.headers.origin!=='http://'+req.headers.host||req.headers['x-slate-review-csrf']!==csrfToken)fail(403,'Bitte die Galerie neu laden.');
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'Freigabe konnte nicht gelesen werden.');
   let size=0;const chunks=[];
   for await(const chunk of req.iterator({destroyOnReturn:false})){size+=chunk.length;if(size<=16384)chunks.push(chunk);}
   if(size>16384)fail(413,'Zu viele Freigabedaten.');
   let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'Freigabe konnte nicht gelesen werden.');}
   if(scope!==null&&!approvalTargets.targets.some(target=>target.key===input?.key&&scope.includes(target.id)))fail(422,'Das Prüfziel gehört nicht zu den angezeigten Vorlagen.');
   approvalTargets.beginRead();
   approvals.save(input);
   return json(res,200,scope===null?(()=>{const result=approvalBundle();return {...result,approvals:approvals.all()};})():approvalBundle(scope));
  }catch(error){
   if(error.status===413){req.resume();res.setHeader('Connection','close');}
   json(res,error.status||500,{error:error.status?error.message:'Die Freigabe konnte nicht gespeichert werden. Bitte erneut versuchen.'});
  }
 }
 async function assignmentRoute(req,res,url){
  try{
   if(!assignments)fail(503,'Die Familienzuordnung ist hier noch nicht verbunden.');
   if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host||req.headers['sec-fetch-site']==='cross-site')fail(403,'Bitte die Galerie neu laden.');
   const action=url.searchParams.get('action');
   const allowed=action==='context'?['action','sourceKeys']:['action'];
   if([...url.searchParams.keys()].some(key=>!allowed.includes(key)||url.searchParams.getAll(key).length!==1))fail(422,'Bitte eine eindeutige Zuordnungsaktion angeben.');
   if(req.method==='GET'&&action==='context'){
    let sourceKeys;try{sourceKeys=JSON.parse(url.searchParams.get('sourceKeys')||'[]');}catch{fail(422,'Ungültige Vorlagenauswahl.');}
    return json(res,200,await assignments.context({sourceKeys}));
   }
   if(req.method!=='POST'||!['plan','execute'].includes(action))fail(405,'Diese Zuordnungsaktion wird nicht unterstützt.');
   if(req.headers.origin!=='http://'+req.headers.host||req.headers['x-slate-review-csrf']!==csrfToken)fail(403,'Bitte die Galerie neu laden.');
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'Die Auswahl konnte nicht gelesen werden.');
   let size=0;const chunks=[];for await(const chunk of req.iterator({destroyOnReturn:false})){size+=chunk.length;if(size<=65536)chunks.push(chunk);}
   if(size>65536){res.setHeader('Connection','close');fail(413,'Bitte eine kleinere Auswahl übernehmen.');}
   let input;try{input=JSON.parse(Buffer.concat(chunks));}catch{fail(400,'Die Auswahl konnte nicht gelesen werden.');}
   const result=await assignments[action](input);
   if(action==='execute')refreshRegistry();
   return json(res,200,result);
  }catch(error){json(res,error.status||500,{error:error.status?error.message:'Die Zuordnung konnte nicht abgeschlossen werden. Bitte den aktuellen Stand prüfen.',code:error.code});}
 }
 const handler=(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(creationGate?.(req,res,url))return true;
  if(!url.pathname.startsWith('/originale'))return false;
  if(!/^(127\.0\.0\.1|localhost|\[::1\]):[0-9]+$/.test(req.headers.host||'')){json(res,403,{error:'Nur in der lokalen Galerie verfügbar.'});return true;}
  try{refreshRegistry();}catch(error){json(res,409,{error:'Die zusätzlichen Familienziele müssen geprüft werden.',code:error.code});return true;}
  if(manage?.(req,res,url))return true;
  if(fullEditor?.(req,res,url))return true;
  if(url.pathname==='/originale/design'){void editPositions(req,res,url);return true;}
  if(url.pathname==='/originale/approvals'){void reviewApprovals(req,res,url);return true;}
  if(url.pathname==='/originale/assignments'){void assignmentRoute(req,res,url);return true;}
  if(url.pathname==='/originale/comments'){
   if(req.method==='GET')json(res,200,{comments:comments.all()});
   else if(req.method==='POST')void saveComment(req,res);
   else json(res,405,{error:'Diese Aktion wird nicht unterstützt.'});
   return true;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return true;}
  let bytes,type;
  if(['/originale','/originale/'].includes(url.pathname)){
   try{
    const summary=approvalBundle(),page=galleryReviewPage(pack,url.searchParams,summary.approvals),ids=page.pack.originals.map(row=>row.id);
    bytes=Buffer.from(slateGalleryHtml(page.pack,imported,{comments:comments.all(ids),csrfToken,managementEnabled:!!manage,assignmentEnabled:!!assignments,paging:page.paging,...approvalBundle(ids)}));type='text/html; charset=utf-8';
   }catch(error){json(res,error.status||500,{error:error.status?error.message:'Die Galerie konnte nicht geladen werden.'});return true;}
  }
  else if(url.pathname==='/originale/comments.js'){bytes=fs.readFileSync(new URL('./slate-review-comments-ui.js',import.meta.url));type='text/javascript; charset=utf-8';}
  else if(url.pathname==='/originale/gallery.js'){bytes=fs.readFileSync(new URL('./slate-review-gallery-ui.js',import.meta.url));type='text/javascript; charset=utf-8';}
  else if(url.pathname==='/originale/inline.js'){bytes=fs.readFileSync(new URL('./slate-review-inline-ui.js',import.meta.url));type='text/javascript; charset=utf-8';}
  else if(url.pathname==='/originale/approvals.js'){bytes=fs.readFileSync(new URL('./slate-review-approvals-ui.js',import.meta.url));type='text/javascript; charset=utf-8';}
  else if(url.pathname==='/originale/assignments.js'){bytes=fs.readFileSync(new URL('./slate-review-assignment-ui.js',import.meta.url));type='text/javascript; charset=utf-8';}
  else if(url.pathname==='/originale/gallery.css'){bytes=fs.readFileSync(new URL('./slate-review-gallery.css',import.meta.url));type='text/css; charset=utf-8';}
  else{
   let relative;try{relative=decodeURIComponent(url.pathname.slice('/originale/files/'.length));}catch{res.writeHead(400).end();return true;}
   const file=path.resolve(root,relative),ext=path.extname(file).toLowerCase();
   if(!url.pathname.startsWith('/originale/files/originals/')||!file.startsWith(path.resolve(root)+path.sep)||!['.png','.jpg','.jpeg','.webp'].includes(ext)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return true;}
   bytes=fs.readFileSync(file);type=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';
  }
  res.writeHead(200,{'Content-Type':type,'Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(req.method==='HEAD'?undefined:bytes);return true;
 };
 handler.close=()=>{approvalTargets.flushCache();comments.close();approvals.close();productGroups?.close();synchronizer?.close?.();};
 return handler;
}
