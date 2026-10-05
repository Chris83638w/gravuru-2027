import {isFormProduct,makeFormProduct,verifyFormSource,formOverview,formReadiness,FORM_MATERIALS} from './form-product.mjs';
import {formContourPdf} from './form-contour-pdf.mjs';
import {materialPreview} from './material-preview.mjs';
import {verifyFormDesignSources,addFormDesign,formDesignOverlay} from './form-designs.mjs';
import {createContourStore} from './contours.mjs';
import {productOverview,productPreview,overviewOptions} from './product-preview.mjs';
import {planPreparedDesign,applyPreparedDesign} from './prepared-design.mjs';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {createProductRepository} from './repository.mjs';
import {createProfileLibrary} from './profile-library.mjs';
import {workshopCatalog,workshopResources} from './catalog.mjs';
import {planBatch,commitBatch} from './batch.mjs';
import {makeProductDocument,validateProductDocument,resolveProduct,validateProductDesign} from './product-model.mjs';
import {createDesignAssetStore,MAX_DESIGN_BYTES} from './design-assets.mjs';
import {planDesignImport,applyDesignImport} from './design-import.mjs';
import {planCustomerFields,applyCustomerFields} from './customer-fields.mjs';

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
export function createWorkshop({filename,seedConfig,legacy,designConverter,contourConverter}){
  const seed=makeProductDocument(seedConfig,{name:seedConfig.profile.name,kind:'master'});
  const profiles=createProfileLibrary({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'profiles.sqlite'),catalog:workshopCatalog(seedConfig.localResources)});
  const assets=createDesignAssetStore({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'design-assets.sqlite'),converter:designConverter});
  const contours=createContourStore({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'design-assets.sqlite'),converter:contourConverter});
  const verifyForm=document=>verifyFormDesignSources(verifyFormSource(document,contours),assets,seed.config.localResources.fonts);
  const repository=createProductRepository({filename,validateDocument:value=>{const document=validateProductDocument(value);if(isFormProduct(document))return verifyForm(document);profiles.resolve(document);assets.validateDocument(document);return document;},snapshotMetadata:document=>isFormProduct(document)?{form:{contourId:document.form.contourId,geometrySha256:document.form.geometrySha256},readiness:formReadiness(document)}:({profiles:profiles.resolve(document)})});
  if(repository.list({includeArchived:true}).length===0)repository.create(seed);
  const defaultId=repository.list({includeArchived:true}).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id))[0].id;
  const csrfToken=randomBytes(32).toString('hex');
  function model(id,version){
    const record=repository.get(id,{revision:revision(version)});
    if(isFormProduct(record.document))fail(422,'form_not_configurable','Dieses Formprodukt ist noch ein Werkstattentwurf. Designs und Kundenkonfigurator folgen separat.');
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
      if(pathname==='/api/workshop/form-materials'&&method==='GET')return json(res,200,{materials:FORM_MATERIALS});
      if(pathname==='/api/workshop/form-fonts'&&method==='GET')return json(res,200,{fonts:Object.entries(seed.config.localResources.fonts).map(([id,f])=>({id,bold:Boolean(f.bold)}))});
      if(pathname==='/api/workshop/design-assets'&&method==='GET')return json(res,200,{assets:assets.list()});
      const formImport=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/form-design-import$/);
      if(formImport&&method==='POST'){
        const data=await body(req,Math.ceil(MAX_DESIGN_BYTES/3)*4+2*1024*1024),record=repository.get(formImport[1]);
        if(!isFormProduct(record.document)||record.status==='archived')fail(422,'invalid_import_target','Bitte ein aktives Formprodukt öffnen.');
        if(data.expectedRevision!==record.revision)fail(409,'stale_revision','Der Produktstand wurde geändert. Eigene Eingaben bleiben erhalten.');
        const draft=verifyForm(data.document);
        const asset=data.assetId?{...assets.get(data.assetId),originalName:data.originalName}:await assets.import({name:data.name,bytes:data.bytes,page:data.page});
        const document=verifyForm(addFormDesign(draft,asset,{name:data.designName,fit:data.fit,designId:'design-'+randomUUID()}));
        return json(res,200,{document,asset,designId:document.designs.at(-1).id,warnings:[...asset.warnings,'Außerhalb der Kontur und in Ausschnitten wird die Gestaltung ausgeblendet.','Enthaltene Texte und Fotos bleiben Teil der Originalgrafik. Neue Kundenfelder benötigen dafür vorbereitete freie Bereiche.']});
      }
      if(pathname==='/api/workshop/form-products'&&method==='POST'){
        const data=await body(req),source=contours.get(data.contourId);
        if(typeof data.name!=='string'||!data.name.trim()||data.name.length>200)fail(422,'name_required','Bitte einen Produktnamen eingeben.');
        return json(res,201,repository.create(makeFormProduct(source,data.name)));
      }
      const formMatch=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/(form-preview|contour\.pdf)$/);
      if(formMatch){
        const record=repository.get(formMatch[1],{revision:method==='GET'?revision(url.searchParams.get('revision')):undefined});
        if(!isFormProduct(record.document))fail(422,'not_form_product','Diese Aktion gehört zu einem Formprodukt.');
        let document=record.document;
        if(method==='POST'&&formMatch[2]==='form-preview'){
          const data=await body(req);
          if(data.expectedRevision!==record.revision)fail(409,'stale_revision','Der gespeicherte Stand wurde geändert. Bitte zuerst den Konflikt klären.');
          document=verifyForm(data.document);
          if(data.designId!==undefined&&!document.designs?.some(d=>d.id===data.designId))fail(422,'design_missing','Design gehört nicht zum Produkt.');
          url.searchParams.set('designId',data.designId||document.defaultDesignId||'');
        }else if(method!=='GET')fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
        if(formMatch[2]==='form-preview'){
          verifyForm(document);
          const svg=contours.preview(document.form.contourId).toString(),surface=materialPreview(document),overlay=formDesignOverlay(document,seed.config.localResources.fonts,url.searchParams.get('designId')||document.defaultDesignId);
          return json(res,200,{svg,designSvg:overlay?svg.replace('</svg>',overlay+'</svg>'):null,materialPreview:{...surface,svg:surface.svg?.replace('</svg>',overlay+'</svg>')||null},geometry:document.form.geometry,readiness:formReadiness(document),revision:record.revision});
        }
        const bytes=await formContourPdf(document,record);
        res.writeHead(200,{'Content-Type':'application/pdf','Content-Length':bytes.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`attachment; filename="Gravuru-Kontur-${record.id}-v${record.revision}.pdf"`}).end(bytes);return;
      }
      if(pathname==='/api/workshop/contours'){
        if(method==='GET')return json(res,200,{contours:contours.list()});
        if(method==='POST')return json(res,201,await contours.import(await body(req,Math.ceil(MAX_DESIGN_BYTES/3)*4+4096)));
        fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      }
      const contourMatch=pathname.match(/^\/api\/workshop\/contours\/([a-f0-9]{64})(?:\/(preview\.svg|original))?$/);
      if(contourMatch&&method==='GET'){
        const record=contours.get(contourMatch[1]);
        if(!contourMatch[2])return json(res,200,record);
        const original=contourMatch[2]==='original',bytes=original?contours.original(record.id):contours.preview(record.id);
        res.writeHead(200,{'Content-Type':original?(record.format==='pdf'?'application/pdf':'image/svg+xml'):'image/svg+xml',
          'Content-Length':bytes.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
          'Content-Security-Policy':"default-src 'none'; sandbox",
          ...(original?{'Content-Disposition':`attachment; filename="Gravuru-Kontur-${record.sourceSha256.slice(0,12)}.${record.format}"`}:{})}).end(bytes);return;
      }
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
      const editorMatch=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/editor-preview$/);
      if(editorMatch&&method==='POST'){
        const data=await body(req),record=repository.get(editorMatch[1]);
        if(data.expectedRevision!==record.revision)fail(409,'stale_revision','Der gespeicherte Stand wurde geändert. Bitte zuerst den Konflikt klären.');
        const document=validateProductDocument(data.document);
        profiles.resolve(document);assets.validateDocument(document);
        const resolved=resolveProduct(document,{designId:data.designId,options:data.options});
        const universal=structuredClone(resolved.config);
        universal.profile.defaultDesignId=resolved.designId;
        universal.localResources.motifs=universal.localResources.motifs.map(m=>m.artwork?assets.resource(m.artwork.assetId):m);
        const examples=(universal.localResources.photoExamples||[]).filter(e=>e.designId===resolved.designId).map(e=>({...e,url:'data:image/svg+xml;base64,'+assets.read(e.assetId).toString('base64')}));
        return json(res,200,{svg:productPreview({universal},{options:resolved.resolvedOptions,examples}),revision:record.revision,designId:resolved.designId,price:resolved.price});
      }
      const cardMatch=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/preview\.svg$/);
      if(cardMatch&&method==='GET'){
        const formRecord=repository.get(cardMatch[1],{revision:revision(url.searchParams.get('revision'))});
        if(isFormProduct(formRecord.document)){const bytes=contours.preview(formRecord.document.form.contourId);res.writeHead(200,{'Content-Type':'image/svg+xml','Content-Length':bytes.length,'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; sandbox"}).end(bytes);return;}
        const m=model(cardMatch[1],url.searchParams.get('revision')),examples=(m.universal.localResources.photoExamples||[]).map(e=>({...e,url:'data:image/svg+xml;base64,'+assets.read(e.assetId).toString('base64')}));
        const bytes=Buffer.from(productPreview(m,{designId:url.searchParams.get('designId'),examples,...(url.searchParams.get('layout')==='card'?{layout:'card',options:overviewOptions(m.universal)}:{})}));
        res.writeHead(200,{'Content-Type':'image/svg+xml','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"}).end(bytes);return;
      }
      const preparedMatch=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/prepared-design\/(preview|apply)$/);
      if(preparedMatch&&method==='POST'){
        const data=await body(req,Math.ceil(MAX_DESIGN_BYTES/3)*4+65536);
        if(preparedMatch[2]==='apply')return json(res,200,await applyPreparedDesign(repository,assets,preparedMatch[1],data));
        const {document,...plan}=await planPreparedDesign(repository,assets,preparedMatch[1],data);return json(res,200,plan);
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
      const fieldMatch=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/customer-fields\/(preview|apply)$/);
      if(fieldMatch&&method==='POST'){
        const data=await body(req);
        if(fieldMatch[2]==='apply')return json(res,200,applyCustomerFields(repository,assets,fieldMatch[1],data));
        const {document,...plan}=planCustomerFields(repository,assets,fieldMatch[1],data);
        return json(res,200,plan);
      }
      if(pathname==='/api/workshop/variant-catalog'&&method==='GET')return json(res,200,{groups:structuredClone(seed.config.profile.optionGroups)});
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
          const products=repository.list({query:url.searchParams.get('query')||'',includeArchived:url.searchParams.get('includeArchived')==='1'}).map(({document,...item})=>({...item,overview:isFormProduct(document)?formOverview(document):productOverview(document)}));
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
      const current=repository.get(id);
      if(!action&&method==='PATCH'&&isFormProduct(current.document)!==isFormProduct(data.document))fail(422,'product_type_fixed','Der Produkttyp darf nicht ausgetauscht werden. Bitte ein eigenes Produkt anlegen.');
      if(!action&&method==='PATCH'&&current.status==='archived')fail(422,'archived_product','Archivierte Produkte bitte zuerst wieder aktivieren.');
      if(isFormProduct(current.document)&&['publish','resolve','validate-design'].includes(action))fail(422,'form_incomplete','Formprodukt bleibt ein Entwurf: Design, Kundenkonfigurator und Fertigungsfreigabe sind noch offen.');
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
  return {repository,profiles,assets,contours,handle,model,defaultId,close:()=>{repository.close();profiles.close();assets.close();contours.close();}};
}
