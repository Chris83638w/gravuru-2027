import {printPreview} from './print-preview.mjs';
import {outputDownload,outputFormats} from './print-delivery.mjs';
import {ACRYLIC_ENGRAVING_RECIPE,acrylicEngravingKey,createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {ACRYLIC_PRINT_RECIPE,acrylicPrintKey,createAcrylicPrintProof,acrylicContourProof} from './acrylic-print-proof.mjs';
import {ACRYLIC_REVIEW,prepareAcrylicReview} from './acrylic-review.mjs';
import {createHash} from 'node:crypto';
import {designExportData,designWorkbook} from './design-export.mjs';
import {variantExportData,variantWorkbook} from './variant-export.mjs';
import {createFormVariants} from './form-variants.mjs';
import {additionPolicy,formMotifs} from './form-additions.mjs';
import {orderProductDraft,planOrderProductDraft,applyOrderProductDraft} from './order-product-draft.mjs';
import {prepareCartRequest} from './storefront-cart.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {createFormEngravingProof,formEngravingSettings,formEngravingKey,FORM_ENGRAVING_RECIPE} from './form-engraving-proof.mjs';
import {createExportWorker} from './export-jobs.mjs';
import {createProductionProfiles,PRODUCTION_MACHINES} from './production-profiles.mjs';
import {isFormProduct,makeFormProduct,verifyFormSource,formOverview,formReadiness,FORM_MATERIALS} from './form-product.mjs';
import {formContourPdf} from './form-contour-pdf.mjs';
import {composeMaterialPreview} from './material-presentation.mjs';
import {materialPreview} from './material-preview.mjs';
import {formProductPreview} from './form-product-preview.mjs';
import {verifyFormDesignSources,addFormDesign,formDesignOverlay} from './form-designs.mjs';
import {createFormCustomerStore} from './form-customer-store.mjs';
import {initialFormCustomerState,resolveFormCustomer,customerPhotoMarkup} from './form-customer-model.mjs';
import {prepareCustomerPhoto,MAX_CUSTOMER_PHOTO} from './customer-photo.mjs';
import {prepareFormReview} from './form-review-snapshot.mjs';
import {createFormPrintProof,formPrintSettings,formPrintKey,FORM_PRINT_RECIPE} from './form-print-proof.mjs';
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
export function createWorkshop({filename,seedConfig,legacy,designConverter,contourConverter,orderWebhook=null}){
  const seed=makeProductDocument(seedConfig,{name:seedConfig.profile.name,kind:'master'});
  const profiles=createProfileLibrary({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'profiles.sqlite'),catalog:workshopCatalog(seedConfig.localResources)});
  const productionProfiles=createProductionProfiles({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'profiles.sqlite')});
  const assets=createDesignAssetStore({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'design-assets.sqlite'),converter:designConverter});
  const contours=createContourStore({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'design-assets.sqlite'),converter:contourConverter});
  const verifyForm=document=>{const d=verifyFormDesignSources(verifyFormSource(document,contours),assets,seed.config.localResources.fonts);productionProfiles.resolve(d);return d;};
  const repository=createProductRepository({filename,validateDocument:value=>{const document=validateProductDocument(value);if(isFormProduct(document))return verifyForm(document);profiles.resolve(document);assets.validateDocument(document);productionProfiles.resolve(document);return document;},snapshotMetadata:document=>isFormProduct(document)?{form:{contourId:document.form.contourId,geometrySha256:document.form.geometrySha256},readiness:formReadiness(document),productionProfile:productionProfiles.resolve(document)}:({profiles:profiles.resolve(document),productionProfile:productionProfiles.resolve(document)})});
  if(repository.list({includeArchived:true}).length===0)repository.create(seed);
  const variants=createFormVariants({filename,repository});
  const defaultId=repository.list({includeArchived:true}).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id))[0].id;
  const csrfToken=randomBytes(32).toString('hex');
  const customerDrafts=createFormCustomerStore({filename}),photoJobs=new Set(),reviewJobs=new Set(),printPreviewJobs=new Set();
  const exportJobs=customerDrafts.exportJobs,orderIntake=customerDrafts.orderIntake;
  const exportWorker=createExportWorker({jobs:exportJobs,recipe:[FORM_PRINT_RECIPE,FORM_ENGRAVING_RECIPE,ACRYLIC_PRINT_RECIPE,ACRYLIC_ENGRAVING_RECIPE],render:job=>{const review=customerDrafts.review(job.snapshotId);const render=job.recipe===ACRYLIC_ENGRAVING_RECIPE?createAcrylicEngravingProof:job.recipe===ACRYLIC_PRINT_RECIPE?createAcrylicPrintProof:job.recipe===FORM_ENGRAVING_RECIPE?createFormEngravingProof:createFormPrintProof;return render(customerDrafts.downloadSnapshot(job.snapshotId,'package'),review.manifest.packageSha256,job.settings);}});
  function enqueueOutput(id,overrides){const m=customerDrafts.review(id).manifest;if(m.product.method!=='engraving')return enqueuePrint(id,overrides);const native=m.schema===ACRYLIC_REVIEW,settings=formEngravingSettings({...m.productionProfile?.document.output,...overrides}),job=exportJobs.enqueue({snapshotId:id,recipe:native?ACRYLIC_ENGRAVING_RECIPE:FORM_ENGRAVING_RECIPE,recipeKey:native?acrylicEngravingKey(settings):formEngravingKey(settings),settings});exportWorker.kick();return job;}
  function enqueuePrint(id,overrides){const m=customerDrafts.review(id).manifest;if(m.product.method!=='print')fail(422,'print_required','Dieser Ausgabeauftrag benötigt ein Druckprodukt.');const settings=formPrintSettings({...m.productionProfile?.document.output,...overrides}),native=m.schema===ACRYLIC_REVIEW,job=exportJobs.enqueue({snapshotId:id,recipe:native?ACRYLIC_PRINT_RECIPE:FORM_PRINT_RECIPE,recipeKey:native?acrylicPrintKey(settings):formPrintKey(settings),settings});exportWorker.kick();return job;}
  function customerRecord(id,version){const record=repository.get(id,{revision:revision(version)});if(!isFormProduct(record.document)||!record.document.designs?.length)fail(422,'customer_design_missing','Bitte zuerst ein Formprodukt mit Design speichern.');verifyForm(record.document);return record;}
  function customerResult(draft,token,state=draft.state){
    const record=customerRecord(draft.productId,draft.productRevision),source=record.document.designs.find(d=>d.id===draft.designId);
    const resolved=resolveFormCustomer(record.document,draft.designId,state,{assets,fonts:seed.config.localResources.fonts,media:id=>customerDrafts.photo(draft.id,token,id)});
    const surface=materialPreview(record.document),base=surface.svg||contours.preview(record.document.form.contourId).toString(),overlay=formDesignOverlay(resolved.document,seed.config.localResources.fonts,draft.designId,{photoMarkup:f=>customerPhotoMarkup(f,resolved.photos.get(f.id))});
    return {draft:{...draft,state},product:{id:record.id,revision:record.revision,name:record.document.name,materialName:FORM_MATERIALS.find(m=>m.id===record.document.material.id)?.name||record.document.material.id,thicknessMm:record.document.material.thicknessMm,basePriceCents:record.document.basePriceCents,method:record.document.processingMethod,geometry:{widthMm:record.document.form.geometry.widthMm,heightMm:record.document.form.geometry.heightMm,holeCount:record.document.form.geometry.holeCount},designs:record.document.designs.map(d=>({id:d.id,name:d.name})),sourceFields:[...source.fields,...resolved.addedFields.map(f=>({...f,customerAdded:true}))],additions:additionPolicy(source)},svg:composeMaterialPreview(base,overlay),artworkSvg:`<svg xmlns="http://www.w3.org/2000/svg" width="${record.document.form.geometry.widthMm}mm" height="${record.document.form.geometry.heightMm}mm" viewBox="0 0 ${record.document.form.geometry.widthMm} ${record.document.form.geometry.heightMm}">${formDesignOverlay(resolved.document,seed.config.localResources.fonts,draft.designId,{photoMarkup:f=>customerPhotoMarkup(f,resolved.photos.get(f.id)),sourceHref:id=>'data:image/svg+xml;base64,'+assets.read(id).toString('base64')})}</svg>`,contourPath:record.document.form.geometry.contours.map(c=>c.d+' Z').join(' '),warnings:resolved.warnings,ready:resolved.ready,photos:[...resolved.photos.values()].map(p=>({mediaId:p.mediaId,width:p.width,height:p.height})),surfaceAvailable:Boolean(surface.svg)};
  }
  function model(id,version){
    const record=repository.get(id,{revision:revision(version)});
    if(isFormProduct(record.document)){
      if(record.status==='archived'||repository.get(record.id).status==='archived'||!record.document.designs?.length)fail(422,'form_not_configurable','Dieses Produkt ist derzeit nicht zur Gestaltung verfügbar.');
      verifyForm(record.document);
      return {key:'form',name:record.document.name,configuration:{id:record.id,revision:record.revision}};
    }
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
      if(pathname==='/api/workshop/order-webhook'){
        if(method!=='POST')fail(405,'method_not_allowed','Bestellnachrichten benötigen POST.');
        if(!orderWebhook)fail(503,'orders_disabled','Test-Bestellanbindung ist nicht eingerichtet.');
        if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'json_required','JSON erforderlich.');
        let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>1024*1024)fail(413,'body_limit','Bestellnachricht zu groß.');chunks.push(chunk);}
        return json(res,200,orderIntake.receive(Buffer.concat(chunks),req.headers,orderWebhook));
      }
      if(method!=='GET'&&!sameToken(req.headers['x-gravuru-csrf'],csrfToken))fail(403,'invalid_session','Bitte die Werkstatt neu laden.');
      if(pathname==='/api/workshop/orders'&&method==='GET'){const orders=orderIntake.list();return json(res,200,{orders,statuses:Object.fromEntries(orders.map(o=>[o.id,orderIntake.status(o.id)])),integration:{enabled:Boolean(orderWebhook),mode:'test-only'}});}
      const orderProductMatch=pathname.match(/^\/api\/workshop\/orders\/(orderline_[a-f0-9-]+)\/product-draft(?:\/(preview|apply))?$/);
      if(orderProductMatch){
        const line=orderIntake.get(orderProductMatch[1]),action=orderProductMatch[2];
        if(method==='GET'&&!action)return json(res,200,{product:orderProductDraft(repository,line)});
        if(method!=='POST'||!action)fail(405,'method_not_allowed','Bitte eine Vorschau prüfen oder übernehmen.');
        const data=await body(req),plan=planOrderProductDraft({line,archive:customerDrafts.downloadSnapshot(line.snapshotId,'package'),input:data,assets,contours,fonts:seed.config.localResources.fonts});
        productionProfiles.resolve(plan.document);
        if(action==='apply')return json(res,201,applyOrderProductDraft(repository,plan,data.token));
        const {document,...summary}=plan;let preview;if(isFormProduct(document))preview=formProductPreview(document,{assets,contours,fonts:seed.config.localResources.fonts});else{profiles.resolve(document);assets.validateDocument(document);const r=resolveProduct(document),universal=structuredClone(r.config);universal.localResources.motifs=universal.localResources.motifs.map(m=>m.artwork?assets.resource(m.artwork.assetId):m);const examples=(universal.localResources.photoExamples||[]).map(e=>({...e,url:'data:image/svg+xml;base64,'+assets.read(e.assetId).toString('base64')}));preview=productPreview({universal},{options:r.resolvedOptions,examples});}return json(res,200,{...summary,preview});
      }
      const orderOutputsMatch=pathname.match(/^\/api\/workshop\/orders\/(orderline_[a-f0-9-]+)\/outputs$/);
      if(orderOutputsMatch&&method==='GET'){
        const line=orderIntake.get(orderOutputsMatch[1]);
        return json(res,200,{positionId:line.id,orderId:line.orderId,snapshotId:line.snapshotId,product:line.product,quantity:line.quantity,status:orderIntake.status(line.id),...exportJobs.forSnapshot(line.snapshotId),scope:'local-operator'});
      }
      const orderStatusMatch=pathname.match(/^\/api\/workshop\/orders\/(orderline_[a-f0-9-]+)\/status$/);if(orderStatusMatch&&method==='GET')return json(res,200,orderIntake.status(orderStatusMatch[1]));
      const orderMatch=pathname.match(/^\/api\/workshop\/orders\/(orderline_[a-f0-9-]+)$/);if(orderMatch&&method==='GET')return json(res,200,orderIntake.get(orderMatch[1]));
      if(pathname==='/api/workshop/order-bindings'){
        if(method==='GET')return json(res,200,{bindings:orderIntake.bindings()});
        if(method==='POST'){const data=await body(req);if(Object.keys(data).some(k=>!['shopDomain','variantId','productId','productRevision','snapshotId'].includes(k)))fail(422,'binding_fields','Unbekannte Zuordnungsfelder.');if(data.productRevision===undefined)fail(422,'binding_revision','Gespeicherten Produktstand ausdrücklich angeben.');if(repository.get(data.productId).status==='archived')fail(422,'archived_product','Produkt zuerst wieder aktivieren.');const record=repository.get(data.productId,{revision:revision(data.productRevision)});return json(res,201,orderIntake.bind({...data,record}));}
      }
      if(pathname==='/api/workshop/order-cart-preview'&&method==='POST'){
        const data=await body(req);if(Object.keys(data).some(k=>!['bindingId','snapshotId','quantity'].includes(k)))fail(422,'cart_fields','Unbekannte Warenkorbfelder.');
        const offer=orderIntake.offer(data),binding=orderIntake.bindings().find(b=>b.id===data.bindingId);
        return json(res,201,{request:prepareCartRequest(offer),summary:{shopDomain:binding.shopDomain,variantId:offer.variantId,productId:binding.productId,productRevision:binding.productRevision,snapshotId:data.snapshotId,quantity:offer.quantity,unitCents:offer.unitCents,totalCents:offer.unitCents*offer.quantity,currency:offer.currency},sent:false,paymentConfirmed:false});
      }
      if(pathname==='/api/workshop/order-offers'&&method==='POST'){const data=await body(req);if(Object.keys(data).some(k=>!['bindingId','snapshotId','quantity'].includes(k)))fail(422,'offer_fields','Unbekannte Checkout-Felder.');return json(res,201,orderIntake.offer(data));}
      if(pathname==='/api/workshop/variants/batch/export'&&method==='POST'){
        const data=variantExportData(variants,repository,await body(req)),bytes=await variantWorkbook(data);
        res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="Gravuru-Ausfuehrungen-Bestand.xlsx"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);return;
      }
      if(pathname==='/api/workshop/variant-import-template'&&method==='GET'){
        const bytes=fs.readFileSync(new URL('./templates/ausfuehrungen.xlsx',import.meta.url));res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="Gravuru-Ausfuehrungen.xlsx"','Cache-Control':'no-store'}).end(bytes);return;
      }
      if(pathname==='/api/workshop/variants/batch/plan'&&method==='POST'){const {entries,...plan}=variants.plan(await body(req));return json(res,200,plan);}
      if(pathname==='/api/workshop/variants/batch/commit'&&method==='POST')return json(res,200,variants.commit(await body(req)));
      if(pathname==='/api/workshop/variants'){
        if(method==='GET')return json(res,200,{groups:variants.list()});
        if(method==='POST')return json(res,201,variants.create((await body(req)).document));
      }
      const variantsMatch=pathname.match(/^\/api\/workshop\/variants\/(variants_[a-f0-9-]+)(?:\/(history|options|select))?$/);
      if(variantsMatch){
        const id=variantsMatch[1],action=variantsMatch[2],rev=revision(url.searchParams.get('revision'));
        if(method==='GET'){
          if(action==='history')return json(res,200,{revisions:variants.history(id)});
          if(action==='select')return json(res,200,variants.select(id,rev,url.searchParams.get('variant')??undefined));
          if(action==='options')return json(res,200,variants.options(id,rev,{customer:true}));
          if(!action)return json(res,200,variants.options(id,rev));
        }
        if(method==='PATCH'&&!action){const data=await body(req);return json(res,200,variants.save(id,data.document,data.expectedRevision));}
        fail(405,'method_not_allowed','Diese Ausführungsaktion ist nicht möglich.');
      }
      if(pathname==='/api/workshop/session'&&method==='GET')return json(res,200,{csrfToken,scope:'local-operator'});
      if(pathname==='/api/workshop/production-profiles'){
        if(method==='GET')return json(res,200,{profiles:productionProfiles.list(),machines:PRODUCTION_MACHINES});
        if(method==='POST')return json(res,201,productionProfiles.create((await body(req)).document));
      }
      const manufacturingMatch=pathname.match(/^\/api\/workshop\/production-profiles\/(mfg_[a-f0-9-]+)(?:\/(history))?$/);
      if(manufacturingMatch){
        const id=manufacturingMatch[1];if(method==='GET')return json(res,200,manufacturingMatch[2]?{revisions:productionProfiles.history(id)}:productionProfiles.get(id,revision(url.searchParams.get('revision'))));
        if(method==='PATCH'&&!manufacturingMatch[2]){const data=await body(req);return json(res,200,productionProfiles.save(id,data.document,data.expectedRevision));}
        fail(405,'method_not_allowed','Diese Profilaktion ist nicht möglich.');
      }
      if(pathname==='/api/workshop/acrylic-reviews'&&method==='POST'){
        if(reviewJobs.size>=2)fail(409,'review_busy','Eine Gestaltung wird gerade gesichert. Bitte kurz warten.');
        const job=randomUUID();reviewJobs.add(job);try{
          const data=await body(req,100*1024*1024);
          if(!Number.isSafeInteger(data.productRevision)||data.productRevision<1)fail(422,'revision_required','Eine feste Produktrevision ist erforderlich.');
          const record=repository.get(data.productId,{revision:data.productRevision});
          if(isFormProduct(record.document)||record.status==='archived'||repository.get(record.id).status==='archived')fail(422,'acrylic_required','Bitte ein aktives Acrylprodukt verwenden.');
          const key=createHash('sha256').update(JSON.stringify(data)).digest('hex'),old=customerDrafts.findAcrylicReview(key);if(old)return json(res,200,old);
          const bundle=await prepareAcrylicReview({record,config:model(record.id,record.revision).universal,input:data,assets});
          return json(res,201,customerDrafts.captureAcrylicReview(key,bundle));
        }finally{reviewJobs.delete(job);}
      }
      if(pathname==='/api/workshop/customer-drafts'&&method==='POST'){
        const data=await body(req),record=customerRecord(data.productId,data.productRevision),design=record.document.designs.find(d=>d.id===(data.designId||record.document.defaultDesignId));
        if(!design||repository.get(record.id).status==='archived')fail(422,'customer_design_missing','Bitte ein aktives Produkt und gültiges Design wählen.');
        const {token,...draft}=customerDrafts.create(record,design.id,initialFormCustomerState(design));return json(res,201,{...customerResult(draft,token),token});
      }
      if(pathname==='/api/workshop/export-jobs'){
        if(method==='GET')return json(res,200,{jobs:exportJobs.list()});
        if(method==='POST'){const data=await body(req);if(Object.keys(data).some(k=>!['snapshotId','settings'].includes(k)))fail(422,'invalid_export_request','Ungültiger Ausgabeauftrag.');const job=enqueueOutput(data.snapshotId,data.settings);return json(res,job.status==='completed'?200:202,job);}
      }
      const exportMatch=pathname.match(/^\/api\/workshop\/export-jobs\/(job_[a-f0-9-]+)(?:\/(retry|download|preview|checks))?$/);
      if(exportMatch){
        const id=exportMatch[1],job=exportJobs.get(id);if(!exportMatch[2]&&method==='GET')return json(res,200,{...job,events:exportJobs.events(id),downloadFormats:job.status==='completed'?outputFormats(customerDrafts.printProof(job.snapshotId,job.recipeKey)):[]});
        if(exportMatch[2]==='checks'){
          if(job.status!=='completed')fail(409,'export_not_ready','Nur eine fertig gespeicherte Ausgabe kann geprüft werden.');
          const result=customerDrafts.printProof(job.snapshotId,job.recipeKey);if(!result)fail(409,'export_missing','Die gespeicherte Ausgabe fehlt.');
          const formats=outputFormats(result).filter(f=>f!=='zip');
          const files=formats.map(format=>{const f=outputDownload(result,format),sha256=createHash('sha256').update(f.bytes).digest('hex'),expected=format==='pdf'?(result.metadata.downloads?.pdf?.sha256||result.metadata.pdfSha256):result.metadata.downloads?.white?.sha256;if(expected&&sha256!==expected)fail(409,'export_changed','Die PDF weicht vom gesicherten Dateinachweis ab.');return {format,name:f.suffix,sha256};});
          if(method==='GET')return json(res,200,{...exportJobs.checks.list(id),files,machines:PRODUCTION_MACHINES,productionReady:false});
          if(method==='POST'){const data=await body(req,8192),file=files.find(f=>f.format===data.format);if(!file)fail(422,'check_file','Bitte eine vorhandene PDF auswählen.');return json(res,201,exportJobs.checks.add(id,data,file));}
          fail(405,'method_not_allowed','Prüfvermerke nur lesen oder ergänzen.');
        }
        if(exportMatch[2]==='retry'&&method==='POST'){await body(req);const next=exportJobs.retry(id);exportWorker.kick();return json(res,202,next);}
        if(exportMatch[2]==='preview'&&method==='POST'){
          const data=await body(req);if(Object.keys(data).some(k=>k!=='mode')||!['color','white'].includes(data.mode))fail(422,'preview_mode','Bitte Farbe oder Weiß wählen.');
          if(job.status!=='completed')fail(409,'export_not_ready','Die Ausgabe ist noch nicht fertig.');
          const result=customerDrafts.printProof(job.snapshotId,job.recipeKey);if(!result)fail(409,'export_missing','Die gespeicherte PDF fehlt.');
          if(printPreviewJobs.size>=2)fail(429,'preview_busy','Zwei Druckvorschauen werden bereits geladen. Bitte kurz warten.');
          const request=randomUUID();printPreviewJobs.add(request);try{const preview=await printPreview(result,data.mode);res.writeHead(200,{'Content-Type':'image/png','Content-Length':preview.png.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Gravuru-Source-SHA256':preview.sourceSha256,'X-Gravuru-Plate':preview.mode}).end(preview.png);return;}finally{printPreviewJobs.delete(request);}
        }
        if(exportMatch[2]==='download'&&method==='POST'){
          const data=await body(req);if(!['pdf','white-pdf','zip'].includes(data.format))fail(422,'invalid_format','Bitte PDF oder ZIP auswählen.');if(job.status!=='completed')fail(409,'export_not_ready','Diese Ausgabe ist noch nicht fertig.');
          const result=customerDrafts.printProof(job.snapshotId,job.recipeKey);if(!result)fail(409,'export_missing','Die gespeicherte Ausgabedatei fehlt.');const download=outputDownload(result,data.format),bytes=download.bytes;
          res.writeHead(200,{'Content-Type':download.mime,'Content-Length':bytes.length,'Content-Disposition':'attachment; filename="'+job.id+'-'+download.suffix+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Gravuru-Print-Info':encodeURIComponent(JSON.stringify({mode:result.metadata.settings.mode,dpi:result.metadata.settings.dpi,bleedMm:result.metadata.settings.bleedMm,white:result.metadata.settings.white,warnings:result.metadata.warnings.slice(0,3).map(w=>Array.from(w).slice(0,140).join(''))}))}).end(bytes);return;
        }
        fail(405,'method_not_allowed','Diese Ausgabeaktion ist nicht möglich.');
      }
      if(pathname==='/api/workshop/review-snapshots'&&method==='GET')return json(res,200,{snapshots:customerDrafts.listSnapshots(),scope:'local-operator'});
      const reviewMatch=pathname.match(/^\/api\/workshop\/review-snapshots\/(proof_[a-f0-9-]+)(?:\/(download|print))?$/);
      if(reviewMatch){
        if(!reviewMatch[2]&&method==='GET'){const detail=customerDrafts.review(reviewMatch[1]);return json(res,200,{...detail,outputCapabilities:{cart:true,print:detail.manifest.product.method==='print',contour:true,engraving:detail.manifest.product.method==='engraving'}});}
        if(reviewMatch[2]==='print'&&method==='POST'){
          const data=await body(req);if(Object.keys(data).some(k=>!['settings','format'].includes(k))||!['pdf','white-pdf','zip'].includes(data.format||'pdf'))fail(422,'invalid_print_request','Bitte PDF oder ZIP und gültige Einstellungen auswählen.');
          const id=reviewMatch[1],job=enqueuePrint(id,data.settings);await exportWorker.wait(job.id);const output=customerDrafts.printProof(id,job.recipeKey);
          const download=outputDownload(output,data.format||'pdf'),bytes=download.bytes;
          res.writeHead(200,{'Content-Type':download.mime,'Content-Length':bytes.length,'Content-Disposition':'attachment; filename="'+id+'-'+download.suffix+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Gravuru-Print-Info':encodeURIComponent(JSON.stringify({dpi:output.metadata.settings.dpi,bleedMm:output.metadata.settings.bleedMm,white:output.metadata.settings.white,warnings:output.metadata.warnings.slice(0,3).map(w=>Array.from(w).slice(0,140).join(''))}))}).end(bytes);return;
        }
        if(reviewMatch[2]==='download'&&method==='POST'){
          const data=await body(req);if(!['package','contour','photos'].includes(data.kind))fail(422,'production_not_released','Für diesen Prüfstand ist keine Produktions-PDF freigegeben.');
          let nativeContour=null;const manifest=customerDrafts.review(reviewMatch[1]).manifest;
          if(data.kind==='contour'&&manifest.schema===ACRYLIC_REVIEW){const key='acrylic-contour/v1';nativeContour=customerDrafts.printProof(reviewMatch[1],key)?.pdf;if(!nativeContour){const pdf=await acrylicContourProof(customerDrafts.downloadSnapshot(reviewMatch[1],'package'),manifest.packageSha256);customerDrafts.savePrintProof(reviewMatch[1],key,{pdf,archive:Buffer.alloc(0),metadata:{recipe:key}});nativeContour=customerDrafts.printProof(reviewMatch[1],key).pdf;}}
          const bytes=nativeContour||customerDrafts.downloadSnapshot(reviewMatch[1],data.kind),suffix={package:'pruefpaket.zip',contour:'kontur-1zu1.pdf',photos:'originalfotos.zip'}[data.kind];
          res.writeHead(200,{'Content-Type':data.kind==='contour'?'application/pdf':'application/zip','Content-Length':bytes.length,'Content-Disposition':'attachment; filename="'+reviewMatch[1]+'-'+suffix+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);return;
        }
        fail(405,'method_not_allowed','Prüfstände können nicht überschrieben werden.');
      }
      const customerMatch=pathname.match(/^\/api\/workshop\/customer-drafts\/(draft_[a-f0-9-]+)(?:\/(preview|photos|review))?$/);
      if(customerMatch){
        const token=req.headers['x-gravuru-draft'],draft=customerDrafts.get(customerMatch[1],token),action=customerMatch[2];
        if(!action&&method==='GET')return json(res,200,customerResult(draft,token));
        if(!['POST','PATCH'].includes(method))fail(405,'method_not_allowed','Aktion nicht unterstützt.');
        const data=await body(req,action==='photos'?Math.ceil(MAX_CUSTOMER_PHOTO/3)*4+4096:2*1024*1024);
        if(data.expectedRevision!==draft.revision)fail(409,'stale_customer_draft','Der gespeicherte Entwurf wurde inzwischen geändert. Deine Eingaben bleiben erhalten.');
        if(action==='review'&&method==='POST'){
          if(Object.keys(data).length!==1)fail(422,'saved_draft_only','Gesichert wird ausschließlich der gespeicherte Entwurf. Bitte Änderungen zuerst speichern.');
          const existing=customerDrafts.findSnapshot(draft.id,draft.revision);if(existing)return json(res,200,existing);
          if(reviewJobs.size>=2||reviewJobs.has(draft.id))fail(409,'review_busy','Ein Prüfstand wird gerade gesichert. Bitte kurz warten.');
          reviewJobs.add(draft.id);try{
            const bundle=await prepareFormReview({record:customerRecord(draft.productId,draft.productRevision),draft,assets,contours,fonts:seed.config.localResources.fonts,media:id=>customerDrafts.photo(draft.id,token,id)});
            return json(res,201,customerDrafts.capture(draft.id,token,data.expectedRevision,bundle));
          }finally{reviewJobs.delete(draft.id);}
        }
        if(action==='photos'&&method==='POST'){
          const source=customerRecord(draft.productId,draft.productRevision).document.designs.find(d=>d.id===draft.designId);
          if(!source.fields.some(f=>f.id===data.fieldId&&f.type==='photo'))fail(422,'photo_field_missing','Bitte einen vorgegebenen Fotobereich wählen.');
          if(photoJobs.size>=2||photoJobs.has(draft.id))fail(409,'photo_busy','Eine Fotoprüfung läuft bereits. Bitte kurz warten.');
          photoJobs.add(draft.id);try{const photo=await prepareCustomerPhoto(data.bytes);if(customerDrafts.get(draft.id,token).revision!==data.expectedRevision)fail(409,'stale_customer_draft','Entwurf inzwischen geändert. Bitte neu laden.');return json(res,201,customerDrafts.addPhoto(draft.id,token,photo));}finally{photoJobs.delete(draft.id);}
        }
        if(action==='preview'&&method==='POST')return json(res,200,customerResult(draft,token,data.state));
        if(!action&&method==='PATCH'){customerResult(draft,token,data.state);const saved=customerDrafts.save(draft.id,token,data.state,data.expectedRevision);return json(res,200,customerResult(saved,token));}
        fail(405,'method_not_allowed','Aktion nicht unterstützt.');
      }
      if(pathname==='/api/workshop/form-materials'&&method==='GET')return json(res,200,{materials:FORM_MATERIALS});
      if(pathname==='/api/workshop/form-motifs'&&method==='GET')return json(res,200,{motifs:formMotifs()});
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
          return json(res,200,{svg,designSvg:overlay?svg.replace('</svg>',overlay+'</svg>'):null,materialPreview:{...surface,svg:surface.svg?composeMaterialPreview(surface.svg,overlay):null},geometry:document.form.geometry,readiness:formReadiness(document),revision:record.revision});
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
        if(isFormProduct(formRecord.document)){verifyForm(formRecord.document);const bytes=Buffer.from(formProductPreview(formRecord.document,{assets,fonts:seed.config.localResources.fonts,contours,designId:url.searchParams.get('designId')||formRecord.document.defaultDesignId}));res.writeHead(200,{'Content-Type':'image/svg+xml','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src data:; sandbox"}).end(bytes);return;}
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
      if(pathname==='/api/workshop/batch/export'&&method==='POST'){
        const bytes=await designWorkbook(designExportData(repository,await body(req)));
        res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="Gravuru-Designzuordnungen.xlsx"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);return;
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
      const match=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)(?:\/(copy|archive|publish|revisions|restore|resolve|validate-design|shop-preparation|shop-bindings))?$/);
      if(!match)fail(404,'not_found','Werkstattfunktion nicht gefunden.');
      const [,id,action]=match;
      if(method==='GET'){
        if(!action)return json(res,200,repository.get(id,{revision:revision(url.searchParams.get('revision'))}));
        if(action==='shop-preparation')return json(res,200,prepareShopProduct(repository.get(id,{revision:revision(url.searchParams.get('revision'))})));
        if(action==='revisions')return json(res,200,{revisions:repository.history(id).map(({document,...record})=>({...record,createdAt:record.updatedAt,name:document.name}))});
        fail(405,'method_not_allowed','Diese Aktion benötigt eine Eingabe.');
      }
      const data=await body(req);
      const current=repository.get(id);
      if(!action&&method==='PATCH'&&isFormProduct(current.document)!==isFormProduct(data.document))fail(422,'product_type_fixed','Der Produkttyp darf nicht ausgetauscht werden. Bitte ein eigenes Produkt anlegen.');
      if(!action&&method==='PATCH'&&current.status==='archived')fail(422,'archived_product','Archivierte Produkte bitte zuerst wieder aktivieren.');
      if(isFormProduct(current.document)&&['publish','resolve','validate-design'].includes(action))fail(422,'form_incomplete','Formprodukt bleibt ein Entwurf: Die Shop-/Bestellbindung und reale Fertigungsfreigabe stehen noch aus. Design, Kundenentwurf und technische Ausgaben können bereits geprüft werden.');
      if(!action&&method==='PATCH')return json(res,200,repository.save(id,data.document,data.expectedRevision));
      if(method!=='POST')fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      if(action==='shop-bindings'){
        if(Object.keys(data).some(k=>!['expectedRevision','shopDomain','mappings'].includes(k)))fail(422,'binding_fields','Unbekannte Zuordnungsfelder.');
        if(current.revision!==data.expectedRevision)fail(409,'version_conflict','Der Produktstand wurde geändert. Bitte neu laden.');
        return json(res,200,orderIntake.bindVariants({record:current,shopDomain:data.shopDomain,mappings:data.mappings}));
      }
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
  return {repository,variants,profiles,productionProfiles,assets,contours,customerDrafts,exportJobs,exportWorker,orderIntake,handle,model,defaultId,close:()=>{exportWorker.close();exportJobs.close();variants.close();repository.close();profiles.close();productionProfiles.close();assets.close();contours.close();customerDrafts.close();}};
}
