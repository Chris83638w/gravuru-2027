import {randomBytes,timingSafeEqual} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {createProductRepository} from './repository.mjs';
import {createProfileLibrary} from './profile-library.mjs';
import {workshopCatalog,workshopResources} from './catalog.mjs';
import {planBatch,commitBatch} from './batch.mjs';
import {makeProductDocument,validateProductDocument,resolveProduct,validateProductDesign} from './product-model.mjs';
import {createDesignAssetStore,MAX_DESIGN_BYTES} from './design-assets.mjs';
import {planDesignImport,applyDesignImport} from './design-import.mjs';

const fail=(status,code,message)=>{throw Object.assign(new Error(message),{status,code});};
const sameToken=(actual,expected)=>typeof actual==='string'&&/^[a-f0-9]{64}$/.test(actual)&&timingSafeEqual(Buffer.from(actual),Buffer.from(expected));
const json=(res,status,value)=>{const bytes=Buffer.from(JSON.stringify(value));res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);};
async function body(req,limit=2*1024*1024){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'json_required','Bitte JSON-Daten senden.');
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>limit)fail(413,'body_limit','Die Datei oder Konfiguration ist zu groß.');chunks.push(chunk);}
  try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||Array.isArray(value)||typeof value!=='object')throw Error();return value;}
  catch{fail(400,'invalid_json','Ungültige JSON-Daten.');}
}
const revision=value=>{if(value===null||value===undefined)return undefined;const n=Number(value);if(!/^[1-9][0-9]*$/.test(String(value))||!Number.isSafeInteger(n))fail(422,'invalid_revision','Ungültige Version.');return n;};

/** Local operator surface only. This does not provide hosted merchant authentication. */
export function createWorkshop({filename,seedConfig,legacy,designConverter}){
  const seed=makeProductDocument(seedConfig,{name:seedConfig.profile.name,kind:'master'});
  const profiles=createProfileLibrary({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'profiles.sqlite'),catalog:workshopCatalog(seedConfig.localResources)});
  const assets=createDesignAssetStore({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'design-assets.sqlite'),converter:designConverter});
  const repository=createProductRepository({filename,validateDocument:value=>{const document=validateProductDocument(value);profiles.resolve(document);assets.validateDocument(document);return document;},snapshotMetadata:document=>({profiles:profiles.resolve(document)})});
  if(repository.list({includeArchived:true}).length===0)repository.create(seed);
  const defaultId=repository.list({includeArchived:true}).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id))[0].id;
  const csrfToken=randomBytes(32).toString('hex');
  function model(id,version){
    const record=repository.get(id,{revision:revision(version)});
    const resolved=resolveProduct(record.document);
    const shell=structuredClone(legacy);
    shell.designs=resolved.config.profile.designs;
    shell.purchasing.basePriceCents=resolved.config.basePriceCents;
    shell.purchasing.bellModel=record.document.name;
    shell.features={...shell.features,orderEnabled:false,productionConfirmed:false};
    const universal=structuredClone(resolved.config);
    universal.localResources.motifs=universal.localResources.motifs.map(m=>m.artwork?assets.resource(m.artwork.assetId):m);
    universal.workshopElementRights=structuredClone(record.document.elementRights);
    universal.workshopProfiles=version!==null&&version!==undefined?(record.metadata.profiles||{selections:{fonts:null,motifs:null,colors:null,bestsellers:null},sources:{},settingsRevision:0}):profiles.resolve(record.document);
    universal.profile.name=record.document.name;
    universal.profile.id=record.id;
    universal.profile.binding={kind:'local-review',productId:record.id};
    universal.profile.revision=`${record.id}:${record.revision}`;
    return {key:'acryl',name:record.document.name,legacy:shell,universal,configuration:{id:record.id,revision:record.revision,publishedRevision:record.publishedRevision}};
  }
  async function handle(req,res,url){
    try{
      const pathname=url.pathname,method=req.method;
      if(!['GET','POST','PATCH'].includes(method))fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      if(method!=='GET'&&!sameToken(req.headers['x-gravuru-csrf'],csrfToken))fail(403,'invalid_session','Bitte die Werkstatt neu laden.');
      if(pathname==='/api/workshop/session'&&method==='GET')return json(res,200,{csrfToken,scope:'local-operator'});
      if(pathname==='/api/workshop/design-assets/import'&&method==='POST'){
        const data=await body(req,Math.ceil(MAX_DESIGN_BYTES/3)*4+4096);
        return json(res,201,await assets.import({name:data.name,bytes:data.bytes,page:data.page}));
      }
      const assetMatch=pathname.match(/^\/api\/workshop\/design-assets\/([a-f0-9]{64})\/(preview\.svg|original)$/);
      if(assetMatch&&method==='GET'){
        const asset=assets.get(assetMatch[1]),original=assetMatch[2]==='original',bytes=assets.read(asset.assetId,original);
        res.writeHead(200,{'Content-Type':original?(asset.format==='pdf'?'application/pdf':'image/svg+xml'):'image/svg+xml',
          'Content-Length':bytes.length,'Cache-Control':'private, max-age=31536000, immutable','X-Content-Type-Options':'nosniff',
          'Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'none'; sandbox",
          ...(original?{'Content-Disposition':`attachment; filename="Gravuru-Original-${asset.sourceSha256.slice(0,12)}.${asset.format}"`}:{})}).end(bytes);return;
      }
      const importMatch=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/design-import\/(preview|apply)$/);
      if(importMatch&&method==='POST'){
        const [,id,action]=importMatch,data=await body(req,action==='preview'?Math.ceil(MAX_DESIGN_BYTES/3)*4+4096:2*1024*1024);
        if(action==='apply')return json(res,200,applyDesignImport(repository,assets,id,data));
        const record=repository.get(id);
        if(record.revision!==data.expectedRevision)fail(409,'stale_revision','Die Konfiguration wurde geändert. Bitte den aktuellen Stand laden.');
        if(record.status==='archived'||!record.document.config.profile.designs.some(d=>d.id===data.designId))fail(422,'invalid_import_target','Bitte ein aktives Design dieser Konfiguration auswählen.');
        const asset=data.assetId?assets.get(data.assetId):await assets.import({name:data.name,bytes:data.bytes,page:data.page});
        const {document,...plan}=planDesignImport(repository,assets,id,{...data,assetId:asset.assetId,originalName:data.name});
        return json(res,200,plan);
      }
      if(pathname==='/api/workshop/seed'&&method==='GET')return json(res,200,{document:structuredClone(seed)});
      if(pathname==='/api/workshop/import-template'&&method==='GET'){
        const bytes=fs.readFileSync(new URL('./templates/produktserie.xlsx',import.meta.url));
        res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="Gravuru-Produktserie.xlsx"','Content-Length':bytes.length,'Cache-Control':'no-store'}).end(bytes);return;
      }
      if(pathname==='/api/workshop/profiles'){
        if(method==='GET')return json(res,200,{profiles:profiles.list(),catalog:profiles.catalog(),settings:profiles.settings()});
        if(method==='POST')return json(res,201,profiles.create(await body(req)));
        fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      }
      const profileMatch=pathname.match(/^\/api\/workshop\/profiles\/(prf_[a-f0-9-]+)$/);
      if(profileMatch){
        if(method==='GET')return json(res,200,profiles.get(profileMatch[1]));
        if(method==='PATCH'){const data=await body(req);return json(res,200,profiles.save(profileMatch[1],data.document,data.expectedRevision));}
        fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      }
      if(pathname==='/api/workshop/profile-settings'&&method==='POST'){
        const data=await body(req);
        if(Object.hasOwn(data,'categoryId')&&(typeof data.categoryId!=='string'||!data.categoryId.trim()))fail(422,'category_required','Bitte eine Kategorie-ID angeben.');
        return json(res,200,Object.hasOwn(data,'categoryId')?profiles.setCategory(data.categoryId,data.type,data.assignment,data.expectedRevision):profiles.setDefault(data.type,data.assignment,data.expectedRevision));
      }
      if(pathname==='/api/workshop/batch/plan'&&method==='POST'){
        const {entries,...plan}=planBatch(repository,await body(req),assets);return json(res,200,plan);
      }
      if(pathname==='/api/workshop/batch/commit'&&method==='POST')return json(res,200,commitBatch(repository,await body(req),assets));
      if(pathname==='/api/workshop/products'){
        if(method==='GET'){
          const products=repository.list({query:url.searchParams.get('query')||'',includeArchived:url.searchParams.get('includeArchived')==='1'}).map(({document,...item})=>item);
          return json(res,200,{products});
        }
        if(method==='POST'){const data=await body(req);return json(res,201,repository.create(data.document));}
        fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      }
      const match=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)(?:\/(copy|archive|publish|revisions|restore|resolve|validate-design))?$/);
      if(!match)fail(404,'not_found','Werkstattfunktion nicht gefunden.');
      const [,id,action]=match;
      if(method==='GET'){
        if(!action)return json(res,200,repository.get(id,{revision:revision(url.searchParams.get('revision'))}));
        if(action==='revisions')return json(res,200,{revisions:repository.history(id).map(({document,...record})=>({...record,createdAt:record.updatedAt,name:document.name}))});
        fail(405,'method_not_allowed','Diese Aktion benötigt eine Eingabe.');
      }
      const data=await body(req);
      if(!action&&method==='PATCH')return json(res,200,repository.save(id,data.document,data.expectedRevision));
      if(method!=='POST')fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      if(action==='copy')return json(res,201,repository.copy(id,data));
      if(action==='archive')return json(res,200,repository.setArchived(id,data));
      if(action==='publish')return json(res,200,repository.publish(id,data));
      if(action==='restore')return json(res,200,repository.restore(id,data));
      if(action==='resolve'){
        const record=repository.get(id,{revision:revision(data.revision)});
        return json(res,200,{id,revision:record.revision,...resolveProduct(record.document,{options:data.options,designId:data.designId})});
      }
      if(action==='validate-design'){
        const record=repository.get(id,{revision:revision(data.revision)});
        const selection=(data.revision!==undefined?record.metadata.profiles:profiles.resolve(record.document))?.selections;
        const originals=record.document.config.profile.designs.find(d=>d.id===data.design?.id)?.objects||[];
        for(const object of data.design?.objects||[]){
          const original=originals.find(o=>o.id===object.id);
          if(object.type==='text'&&object.font!==original?.font&&Array.isArray(selection?.fonts)&&!selection.fonts.includes(object.font))fail(422,'font_not_allowed','Diese Schrift ist für das Produkt nicht freigegeben.');
          if(object.type==='motif'&&object.motif!==original?.motif&&Array.isArray(selection?.motifs)&&!selection.motifs.includes(object.motif))fail(422,'motif_not_allowed','Dieses Motiv ist für das Produkt nicht freigegeben.');
        }
        const result=validateProductDesign(record.document,data.design,{options:data.options,...workshopResources(record.document.config.localResources)});
        return json(res,200,{valid:true,id,revision:record.revision,result});
      }
      fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
    }catch(error){
      const status=error.status||(error.code?.startsWith('SQLITE')?500:422);
      if(!res.headersSent)json(res,status,{error:{code:error.code||'invalid_product',message:status===500?'Speichern ist momentan nicht möglich.':error.message,actualRevision:error.actualRevision}});
    }
  }
  return {repository,profiles,assets,handle,model,defaultId,close:()=>{repository.close();profiles.close();assets.close();}};
}
