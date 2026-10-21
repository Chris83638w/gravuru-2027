import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {prepareAcrylicReview,validateAcrylicReview} from './acrylic-review.mjs';
import {workshopResources} from './catalog.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const skuPattern=/^GR-ACR-(?:FRE-0[1-5]|LIE-0[1-3]|OMA-0[1-2]|OPA-0[1-2]|MAM-0[1-3]|PAP-0[1-2]|GEB-0[1-3]|HOCH-0[1-5]|TAU-0[1-2])$/;
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
const csp="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'self'";

export function readApprovedPreviewCatalog(directory){
 const file=path.join(directory,'approved-customer-preview.json');
 if(!fs.existsSync(file))return null;
 const stat=fs.lstatSync(file);
 if(stat.isSymbolicLink()||!stat.isFile()||(stat.mode&0o077)||stat.size>100000)throw Error('Private Vorschaufreigabe ungültig.');
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 if(data.schema!=='gravuru-approved-customer-preview/v1'||data.products?.length!==27)throw Error('Vorschaukatalog unvollständig.');
 const seen=new Set();
 for(const p of data.products){
  if(!skuPattern.test(p.designSku)||seen.has(p.designSku)||!/^cfg_[a-f0-9-]{36}$/.test(p.workshopProductId)||![1,2,3].includes(p.workshopRevision)||!/^gid:\/\/shopify\/Product\/[1-9][0-9]+$/.test(p.shopifyProductId))throw Error('Vorschauzuordnung ungültig.');
  seen.add(p.designSku);
 }
 return data;
}

// A separate, explicitly allowlisted customer preview. It grants no merchant API
// access, never enumerates private products/assets, and never enables checkout.
export function createApprovedCustomerPreview({workshop,catalog,origin,now=Date.now,prepare=prepareAcrylicReview,validate=validateAcrylicReview}){
 if(!catalog)return null;
 const entries=new Map(catalog.products.map(p=>[p.designSku,p])),sessions=new Map();let busy=false,saves=0,day=Math.floor(now()/86400000);
 function recordFor(sku){
  const entry=entries.get(sku);if(!entry)fail(404,'Dieses Design ist nicht verfügbar.');
  const current=workshop.repository.get(entry.workshopProductId);
  if(current.status==='archived')fail(404,'Dieses Design ist nicht verfügbar.');
  const record=workshop.repository.get(entry.workshopProductId,{revision:entry.workshopRevision});
  const designs=record.document.config?.profile?.designs;
  if(designs?.length!==1||designs[0].preparedTemplate?.designSku!==sku)fail(409,'Die Designzuordnung ist nicht bestätigt.');
  return {entry,record,design:designs[0]};
 }
 function customerModel(sku){
  const {record,design}=recordFor(sku),model=workshop.model(record.id,record.revision),u=model.universal;
  const motifs=new Set(design.objects.map(o=>o.motif).filter(Boolean));
  u.localResources.motifs=u.localResources.motifs.filter(m=>motifs.has(m.key));
  u.localResources.photoExamples=(u.localResources.photoExamples||[]).filter(e=>e.designId===design.id);
  u.workshopProfiles={selections:{fonts:Object.keys(u.localResources.fonts),motifs:null,colors:null,bestsellers:null},sources:{},settingsRevision:0};
  const ids=new Set();
  for(const m of u.localResources.motifs)if(m.artwork?.assetId)ids.add(m.artwork.assetId);
  for(const o of design.objects)if(o.photoMaskAssetId)ids.add(o.photoMaskAssetId);
  for(const e of u.localResources.photoExamples)ids.add(e.assetId);
  const resources={};for(const id of ids)resources['/api/workshop/design-assets/'+id+'/preview.svg']='data:image/svg+xml;base64,'+workshop.assets.read(id).toString('base64');
  return {model,resources};
 }
 async function body(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'Bitte eine gültige Gestaltung senden.');
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>64*1024*1024)fail(413,'Die Bilddateien sind zu groß.');chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'Die Gestaltung konnte nicht gelesen werden.');}
 }
 return {matches:pathname=>pathname.startsWith('/gestalten/')||pathname.startsWith('/api/gestalten/'),customerModel,async handle(req,res,url){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',csp);
  try{
   if(req.headers.origin&&req.headers.origin!==origin)fail(403,'Diese Anfrage ist nicht zulässig.');
   const page=url.pathname.match(/^\/gestalten\/(GR-ACR-[A-Z0-9-]+)\/?$/),api=url.pathname.match(/^\/api\/gestalten\/(GR-ACR-[A-Z0-9-]+)\/(model|drafts)$/);
   if(req.method==='GET'&&(page||url.pathname==='/gestalten/app.mjs')){
    if(page)recordFor(page[1]);
    const file=page?'approved-customer-preview.html':'approved-customer-preview-ui.mjs';
    res.setHeader('Content-Type',page?'text/html; charset=utf-8':'text/javascript; charset=utf-8');return res.end(fs.readFileSync(path.join(here,'ui',file)));
   }
   if(!api)fail(404,'Diese Seite ist nicht verfügbar.');
   const sku=api[1];recordFor(sku);
   if(api[2]==='model'&&req.method==='GET'){
    for(const [key,value]of sessions)if(value.expires<now())sessions.delete(key);
    if(sessions.size>=1024)fail(429,'Bitte in wenigen Minuten erneut versuchen.');
    const token=randomBytes(32).toString('hex');sessions.set(token,{sku,expires:now()+30*60*1000,saves:0});
    return reply(res,200,{...customerModel(sku),token,checkoutEnabled:false});
   }
   if(api[2]!=='drafts'||req.method!=='POST')fail(405,'Diese Aktion ist nicht verfügbar.');
   if(req.headers.origin!==origin||req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')fail(403,'Bitte die Gestaltung auf dieser Seite sichern.');
   const session=sessions.get(req.headers['x-gravuru-preview']);
   if(!session||session.sku!==sku||session.expires<now())fail(403,'Die Vorschau ist abgelaufen. Bitte die Seite neu öffnen.');
   if(day!==Math.floor(now()/86400000)){day=Math.floor(now()/86400000);saves=0;}
   if(busy||session.saves>=20||saves>=100)fail(429,'Bitte kurz warten oder die Gestaltung später sichern.');
   busy=true;
   try{
    const data=await body(req);if(!data||Array.isArray(data)||Object.keys(data).some(k=>!['input','draftId','draftToken','expectedRevision'].includes(k)))fail(422,'Die Gestaltung ist unvollständig.');
    const {record,design}=recordFor(sku);
    if(data.input?.productId!==record.id||data.input?.productRevision!==record.revision||data.input?.designId!==design.id)fail(422,'Die Gestaltung gehört nicht zu diesem Design.');
    if(data.draftId){const draft=workshop.customerDrafts.acrylicDrafts.get(data.draftId,data.draftToken);if(draft.productId!==record.id||draft.productRevision!==record.revision||draft.designId!==design.id||draft.revision!==data.expectedRevision)fail(409,'Der gespeicherte Stand hat sich geändert.');}
    const config=customerModel(sku).model.universal;
    config.localResources.motifs=workshopResources(config.localResources).motifs;
    try{validate(record,config,data.input);}catch(error){fail(error.status||422,error.status?error.message:'Bitte Foto, Texte und Auswahl prüfen.');}
    const bundle=await prepare({record,config,input:data.input,assets:workshop.assets});
    const result=data.draftId?workshop.customerDrafts.acrylicDrafts.save(data.draftId,data.draftToken,data.expectedRevision,bundle):workshop.customerDrafts.acrylicDrafts.create(bundle);
    session.saves++;saves++;
    return reply(res,201,{...result,checkoutEnabled:false});
   }finally{busy=false;}
  }catch(error){const invalid=error instanceof TypeError;return reply(res,error.status||(invalid?422:500),{error:{message:error.status?error.message:invalid?'Bitte Foto, Texte und Auswahl prüfen.':'Die Vorschau ist gerade nicht verfügbar.'}});}
 }};
}
