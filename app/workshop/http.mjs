import {createAcrylShopService} from './acryl-shop-service.mjs';
import {createDesignCorrections} from './design-corrections.mjs';
import {fitFormTextFrames} from './form-text-sizing.mjs';
import {designPublicationStatus,acrylDesignTrafficLight} from './design-publication-status.mjs';
import {createAiDesignJobs} from './ai-design-jobs.mjs';
import {createFontLibrary,MAX_FONT_BYTES} from './font-library.mjs';
import {prepareEditableDesign} from './editable-design.mjs';
import {defaultPhotoSvg} from './product-preview.mjs';
import {compareProductRevisions} from './product-revision-compare.mjs';
import {profileChangeImpact,saveReviewedProfile,assignmentChangeImpact,saveReviewedAssignment} from './profile-impact.mjs';
import {outputSpecification} from './output-specification.mjs';
import {printPreview} from './print-preview.mjs';
import {outputDownload,outputFormats} from './print-delivery.mjs';
import {ACRYLIC_ENGRAVING_RECIPE,acrylicEngravingKey,createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {ACRYLIC_PRINT_RECIPE,acrylicPrintKey,createAcrylicPrintProof,acrylicContourProof} from './acrylic-print-proof.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {isNativeReviewSchema} from './native-review-schema.mjs';
import {createHash} from 'node:crypto';
import {designExportData,designWorkbook} from './design-export.mjs';
import {batchReportData,batchReportWorkbook} from './batch-report.mjs';
import {createBatchJobs} from './batch-jobs.mjs';
import {createAiBatchJobs} from './ai-batch-jobs.mjs';
import {createVariantBatchJobs,variantBatchReportData,variantBatchReportWorkbook} from './variant-batch-report.mjs';
import {variantExportData,variantWorkbook} from './variant-export.mjs';
import {createFormVariants} from './form-variants.mjs';
import {additionPolicy,formMotifs} from './form-additions.mjs';
import {orderProductDraft,planOrderProductDraft,applyOrderProductDraft} from './order-product-draft.mjs';
import {prepareCartRequest} from './storefront-cart.mjs';
import {createMerchantTestCart} from './merchant-test-cart.mjs';
import {createCartHttpGate} from './cart-http-gate.mjs';
import {loadCartRevision,loadCartRevisionPhoto} from './cart-edit-revision.mjs';
import {createShopifySessionVerifier} from './shopify-session.mjs';
import {createAppProxyVerifier} from './shopify-app-proxy.mjs';
import {readDraft,decorationMotifs} from '../configurator/variant-m/contract.mjs';
import {createShopDraftTransfer,createShopDraftTransport,shopDraftRequest} from './shop-draft-transfer.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {createShopProductBindingCheck} from './shop-product-binding-check.mjs';
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
import {photoResolutionNote,resolutionTargetDpi} from './acrylic-photo-resolution.mjs';
import {clientOutputSettings,productionMirror} from './output-orientation.mjs';
import {photoPlacement} from '../configurator/variant-m/photo-position-model.mjs';
import {prepareFormReview} from './form-review-snapshot.mjs';
import {createFormPrintProof,formPrintSettings,formPrintKey,FORM_PRINT_RECIPE} from './form-print-proof.mjs';
import {createContourStore} from './contours.mjs';
import {productOverview,productPreview,overviewOptions,previewHoleHint} from './product-preview.mjs';
import {planPreparedDesign,applyPreparedDesign} from './prepared-design.mjs';
import {createProductFamilies} from './product-families.mjs';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {createProductRepository} from './repository.mjs';
import {createProfileLibrary} from './profile-library.mjs';
import {workshopCatalog,workshopResources} from './catalog.mjs';
import {planBatch,commitBatch} from './batch.mjs';
import {makeProductDocument,validateProductDocument,resolveProduct,validateProductDesign} from './product-model.mjs';
import {createDesignAssetStore,MAX_DESIGN_BYTES,sha256} from './design-assets.mjs';
import {planDesignImport,applyDesignImport} from './design-import.mjs';
import {planCustomerFields,applyCustomerFields} from './customer-fields.mjs';
import {parseThemeCatalog} from './theme-catalog.mjs';
import {DatabaseSync} from 'node:sqlite';
import {DEFAULT_TENANT,createTenantRegistry,tenantFromRequest} from './tenant.mjs';
import {createCatalogStructure} from './catalog-structure.mjs';
import {categoryLabels} from './category-labels.mjs';
import {tenantOverview} from './tenant-overview.mjs';
import {createKonfiStatus,isCustomerCapable,pausedCustomerPage,PAUSED_MESSAGE} from './konfi-status.mjs';

const fail=(status,code,message)=>{throw Object.assign(new Error(message),{status,code});};
// Master data shipped with the app (provenance inside each file). Loaded only on explicit request.
const bundledFile=path=>()=>JSON.parse(fs.readFileSync(new URL('../designs/'+path,import.meta.url),'utf8'));
const BUNDLED_FAMILIES=[{id:'steel-door-signs',name:'Edelstahl-Türschilder (vorhandene Stammdaten)',load:bundledFile('steel-door-signs/family.json')},
 ...[['edelstahl','Edelstahl','Stammdaten teils offen'],['schiefer-natur','Naturschiefer','Werte aus Testdaten, bitte bestätigen'],['schiefer-premium','Premium-Schiefer','Stammdaten offen'],['acryl-schwarz','Acrylglas schwarz','Stammdaten offen'],['acryl-anthrazit','Acrylglas anthrazit','Stammdaten offen']].map(([k,n,state])=>({id:'gedenktafel-30x20-'+k,name:'Gedenktafel 30 × 20 · '+n+' ('+state+')',load:bundledFile('gedenktafeln-30x20/'+k+'.json')}))];
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

function checkSessionOptions({operatorCsrfToken=null,merchantCsrfToken=null,shopifySessions=null}){
  if(operatorCsrfToken!==null&&(shopifySessions||typeof operatorCsrfToken!=='string'||!/^[a-f0-9]{64}$/.test(operatorCsrfToken)))fail(503,'operator_session_config','Ungültige private Werkstattsitzung.');
  if(merchantCsrfToken!==null&&(!shopifySessions||operatorCsrfToken!==null||typeof merchantCsrfToken!=='string'||!/^[a-f0-9]{64}$/.test(merchantCsrfToken)))fail(503,'merchant_session_config','Ungültige Händler-Werkstattsitzung.');
  if(shopifySessions&&shopifySessions.mode!=='test-only')fail(503,'shopify_session_config','Nur eine ausdrückliche Test-Sitzungsanbindung ist unterstützt.');
}
/** Werkstatt genau eines Mandanten (K13): alle Stores werden mit diesem Mandanten angelegt und lesen/schreiben nur ihn. */
function createTenantWorkshop(tenantId,{filename,seedConfig,legacy,designConverter,contourConverter,orderWebhook=null,storefront=null,shopifySessions=null,shopDrafts=null,operatorCsrfToken=null,merchantCsrfToken=null,merchantTestCart=null,shopBindingRead=null,aiDesign=null,themes=null,appProxy=null,tenant=null,platformOverview=null}){
  // K9: Themen-Definition (themen.json aus dem Katalog) für Galerie und Motivkategorien im Kundeneditor.
  const themeCatalog=themes===null?null:parseThemeCatalog(themes);
  checkSessionOptions({operatorCsrfToken,merchantCsrfToken,shopifySessions});
  const verifySession=shopifySessions?createShopifySessionVerifier(shopifySessions):null;
  // K7: Kundenidentität für Konto-Entwürfe. Bevorzugt die App-Proxy-Signatur (serverseitig prüfbar, `logged_in_customer_id`),
  // ersatzweise ein Kundenkonto-Sitzungstoken. Ohne beides ist die Kontoverbindung nicht eingerichtet (503).
  if(appProxy&&shopifySessions&&appProxy.shopDomain!==shopifySessions.shopDomain)fail(503,'app_proxy_config','App-Proxy und Shopify-Sitzung müssen denselben Shop bestätigen.');
  const verifyProxy=appProxy?createAppProxyVerifier(appProxy):null;
  function customerPrincipal(req,url){
    if(verifyProxy&&(url.searchParams.has('signature')||!req.headers.authorization||!verifySession)){
      const proxy=verifyProxy(url.searchParams);
      if(!proxy.customerId)fail(401,'customer_login_required','Bitte im Kundenkonto anmelden, um Entwürfe zu speichern.');
      return {shopDomain:proxy.shopDomain,customerId:proxy.customerId};
    }
    if(verifySession&&req.headers.authorization){const p=verifySession(req.headers.authorization,'customer');return {shopDomain:p.shopDomain,customerId:p.subject};}
    if(verifySession)fail(401,'customer_login_required','Bitte im Kundenkonto anmelden, um Entwürfe zu speichern.');
    fail(503,'customer_account_disabled','Die Kontoverbindung ist in dieser Umgebung nicht eingerichtet.');
  }
  if(shopDrafts&&(!verifySession||shopDrafts.config?.shopDomain!==shopifySessions.shopDomain||shopDrafts.config?.mode!=='draft-only'))fail(503,'shop_draft_config','Shop-Entwurfsanbindung benötigt dieselbe bestätigte Händler-Testanmeldung.');
  const seed=makeProductDocument(seedConfig,{name:seedConfig.profile.name,kind:'master'});
  // gravurus Stammdaten (Mastervorlage, mitgelieferte Familien) gehören nur dem Standardmandanten.
  const ownsBundled=tenantId===DEFAULT_TENANT,bundledFamilies=ownsBundled?BUNDLED_FAMILIES:[];
  // Dateinamen der Downloads tragen den Mandantennamen; für gravuru bleibt das bisherige Präfix „Gravuru“.
  const downloadPrefix=ownsBundled?'Gravuru':(String(tenant?.name||tenantId).replace(/[^A-Za-z0-9-]+/g,'-').replace(/^-+|-+$/g,'')||tenantId);
  const fonts=createFontLibrary({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'design-assets.sqlite'),tenantId});
  const formFonts={...seed.config.localResources.fonts,...workshopResources(seed.config.localResources).fonts,...fonts.resources()};
  const profiles=createProfileLibrary({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'profiles.sqlite'),catalog:workshopCatalog(seedConfig.localResources),tenantId});
  profiles.registerFonts(fonts.list());
  const productionProfiles=createProductionProfiles({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'profiles.sqlite'),tenantId});
  const assets=createDesignAssetStore({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'design-assets.sqlite'),converter:designConverter,tenantId});
  const contours=createContourStore({filename:filename===':memory:'?':memory:':path.join(path.dirname(filename),'design-assets.sqlite'),converter:contourConverter,tenantId});
  const verifyForm=document=>{const d=verifyFormDesignSources(verifyFormSource(document,contours),assets,formFonts);productionProfiles.resolve(d);return d;};
  const repository=createProductRepository({filename,tenantId,catalogOverview:d=>isFormProduct(d)?formOverview(d):productOverview(d),validateDocument:value=>{const document=validateProductDocument(value);if(isFormProduct(document)){if(document.profileAssignments)profiles.resolve(document);return verifyForm(document);}profiles.resolve(document);assets.validateDocument(document);productionProfiles.resolve(document);return document;},snapshotMetadata:document=>isFormProduct(document)?{...(document.profileAssignments?{profiles:profiles.resolve(document)}:{}),form:{contourId:document.form.contourId,geometrySha256:document.form.geometrySha256},readiness:formReadiness(document),productionProfile:productionProfiles.resolve(document)}:({profiles:profiles.resolve(document),productionProfile:productionProfiles.resolve(document)})});
  if(ownsBundled&&!repository.firstId())repository.create(seed);
  const families=createProductFamilies({filename,repository,tenantId});
  const catalogStructure=createCatalogStructure({filename,tenantId});
  // B1: Klarnamen für Kategorie-Kennungen (nur Anzeige) und Kundenstatus je Konfi.
  const labelCategories=ids=>categoryLabels(ids,families.labelSources());
  const konfis=createKonfiStatus({filename,tenantId});
  const assertKonfiAvailable=id=>{if(konfis.paused(id))fail(423,'konfi_paused',PAUSED_MESSAGE);};
  const aiJobs=createAiDesignJobs({filename,repository,config:aiDesign?.config,provider:aiDesign?.provider,imageProvider:aiDesign?.imageProvider,assets,tenantId});
  const aiBatches=createAiBatchJobs({filename,repository,aiJobs,tenantId});
  const variants=createFormVariants({filename,repository,tenantId});
  const batchJobs=createBatchJobs({filename,repository,assets,tenantId});
  const variantBatchJobs=createVariantBatchJobs({filename,variants,tenantId});
  const defaultId=repository.firstId();
  const csrfToken=operatorCsrfToken??merchantCsrfToken??randomBytes(32).toString('hex');
  // Akteur für Freigabeübergänge: Händler-Benutzer aus der Shopify-Sitzung, sonst die lokale Werkstattsitzung (abgeleitete Kennung, nie das Token selbst).
  const localActor='werkstatt:'+createHash('sha256').update(csrfToken).digest('hex').slice(0,12);
  // Automatische Fertigungsfreigabe nur, wenn der fest zugeordnete Profilstand sie ausdrücklich erlaubt.
  const autoRelease=line=>Boolean(line.productionProfile)&&productionProfiles.get(line.productionProfile.id,line.productionProfile.revision).document.autoRelease===true;
  const corrections=createDesignCorrections({filename,tenantId});
  const acrylShop=createAcrylShopService({filename,tenantId,repository,variants,corrections,config:shopDrafts?.config});
  const customerDrafts=createFormCustomerStore({filename,autoRelease,tenantId}),photoJobs=new Set(),reviewJobs=new Set(),printPreviewJobs=new Set();
  const exportJobs=customerDrafts.exportJobs,orderIntake=customerDrafts.orderIntake;
  // Explicit server configuration only; constructing the default preview never enables Shopify writes.
  let cartGate=null;
  const configuredCart=()=>cartGate??=createCartHttpGate({drafts:customerDrafts,repository,settings:storefront});
  let merchantCart=null;
  const configuredMerchantCart=()=>merchantCart??=createMerchantTestCart({drafts:customerDrafts,repository,settings:merchantTestCart});
  let transferGate=null;
  const configuredTransfer=()=>transferGate??=createShopDraftTransfer({repository,orders:orderIntake,journal:customerDrafts.shopDraftTransfers,config:shopDrafts.config,transport:createShopDraftTransport(shopDrafts.config,shopDrafts.transportOptions)});
  let bindingCheck=null;
  const configuredBindingCheck=()=>{
    if(!shopBindingRead||!shopifySessions)fail(503,'shop_binding_disabled','Die private ID-Prüfung ist für diesen Datenspeicher noch nicht eingerichtet.');
    return bindingCheck??=createShopProductBindingCheck({reader:shopBindingRead.reader,
      adapter:createShopBindingReadAdapter({storeId:shopBindingRead.storeId,tenantId,shopDomain:shopifySessions.shopDomain,
        productionProfileScope:{storeId:shopBindingRead.storeId,tenantId},
        workshop:{tenantId,repository,orderIntake,productionProfiles,sessionContext:{shopDomain:shopifySessions.shopDomain}}})});
  };
  const outputRecipes=[FORM_PRINT_RECIPE,FORM_ENGRAVING_RECIPE,ACRYLIC_PRINT_RECIPE,ACRYLIC_ENGRAVING_RECIPE];
  const exportWorker=createExportWorker({jobs:exportJobs,recipe:outputRecipes,render:job=>{const review=customerDrafts.review(job.snapshotId);const render=job.recipe===ACRYLIC_ENGRAVING_RECIPE?createAcrylicEngravingProof:job.recipe===ACRYLIC_PRINT_RECIPE?createAcrylicPrintProof:job.recipe===FORM_ENGRAVING_RECIPE?createFormEngravingProof:createFormPrintProof;return render(customerDrafts.downloadSnapshot(job.snapshotId,'package'),review.manifest.packageSha256,job.settings,{orderLines:orderIntake.forSnapshot(job.snapshotId)});}});
  function enqueueOutput(id,overrides){const m=customerDrafts.review(id).manifest;if(m.capabilities?.engraving===false&&m.product.method==='engraving')fail(422,'assembly_output_pending','Die getrennte Fertigungsausgabe für Edelstahlträger und Acrylglasauflage ist noch nicht angebunden.');if(m.product.method!=='engraving')return enqueuePrint(id,overrides);const native=isNativeReviewSchema(m.schema),settings=formEngravingSettings({...m.productionProfile?.document.output,...overrides}),job=exportJobs.enqueue({snapshotId:id,recipe:native?ACRYLIC_ENGRAVING_RECIPE:FORM_ENGRAVING_RECIPE,recipeKey:native?acrylicEngravingKey(settings):formEngravingKey(settings),settings});exportWorker.kick();return job;}
  function enqueuePrint(id,overrides){const m=customerDrafts.review(id).manifest;if(m.product.method!=='print')fail(422,'print_required','Dieser Ausgabeauftrag benötigt ein Druckprodukt.');const settings=formPrintSettings({...m.productionProfile?.document.output,...overrides}),native=isNativeReviewSchema(m.schema),job=exportJobs.enqueue({snapshotId:id,recipe:native?ACRYLIC_PRINT_RECIPE:FORM_PRINT_RECIPE,recipeKey:native?acrylicPrintKey(settings):formPrintKey(settings),settings});exportWorker.kick();return job;}
  function customerRecord(id,version){assertKonfiAvailable(id);const record=repository.get(id,{revision:revision(version)});if(!isFormProduct(record.document)||!record.document.designs?.length)fail(422,'customer_design_missing','Bitte zuerst ein Formprodukt mit Design speichern.');verifyForm(record.document);return record;}
  function customerResult(draft,token,state=draft.state,fitText=false){
    const record=customerRecord(draft.productId,draft.productRevision),source=record.document.designs.find(d=>d.id===draft.designId);
    if(fitText)state=fitFormTextFrames(record.document,draft.designId,state,formFonts);
    const resolved=resolveFormCustomer(record.document,draft.designId,state,{assets,fonts:formFonts,profiles:record.metadata.profiles,media:id=>customerDrafts.photo(draft.id,token,id)});
    const surface=materialPreview(record.document),base=surface.svg||contours.preview(record.document.form.contourId).toString(),overlay=formDesignOverlay(resolved.document,formFonts,draft.designId,{photoMarkup:f=>customerPhotoMarkup(f,resolved.photos.get(f.id)),sourceHref:id=>'data:image/svg+xml;base64,'+assets.read(id).toString('base64')});
    return {draft:{...draft,state},product:{id:record.id,revision:record.revision,profiles:record.metadata.profiles||null,name:record.document.name,materialName:FORM_MATERIALS.find(m=>m.id===record.document.material.id)?.name||record.document.material.id,thicknessMm:record.document.material.thicknessMm,basePriceCents:record.document.basePriceCents,method:record.document.processingMethod,geometry:{widthMm:record.document.form.geometry.widthMm,heightMm:record.document.form.geometry.heightMm,holeCount:record.document.form.geometry.holeCount,contours:record.document.form.geometry.contours},designs:record.document.designs.map(d=>({id:d.id,name:d.name})),sourceFields:[...source.fields,...resolved.addedFields.map(f=>({...f,customerAdded:true}))],additions:additionPolicy(source)},svg:composeMaterialPreview(base,overlay),artworkSvg:`<svg xmlns="http://www.w3.org/2000/svg" width="${record.document.form.geometry.widthMm}mm" height="${record.document.form.geometry.heightMm}mm" viewBox="0 0 ${record.document.form.geometry.widthMm} ${record.document.form.geometry.heightMm}">${formDesignOverlay(resolved.document,formFonts,draft.designId,{photoMarkup:f=>customerPhotoMarkup(f,resolved.photos.get(f.id)),sourceHref:id=>'data:image/svg+xml;base64,'+assets.read(id).toString('base64')})}</svg>`,contourPath:record.document.form.geometry.contours.map(c=>c.d+' Z').join(' '),warnings:resolved.warnings,ready:resolved.ready,photos:[...resolved.photos.values()].map(p=>({mediaId:p.mediaId,width:p.width,height:p.height})),surfaceAvailable:Boolean(surface.svg)};
  }
  function privateProductPreview(model,options){
    model=structuredClone(model);
    model.universal.localResources.motifs=model.universal.localResources.motifs.map(m=>m.artwork?assets.resource(m.artwork.assetId):m);
    return productPreview(model,options).replace(/href="\/api\/workshop\/design-assets\/([a-f0-9]{64})\/preview\.svg"/g,(_,id)=>'href="data:image/svg+xml;base64,'+assets.read(id).toString('base64')+'"');
  }
  function embedMaterialSurface(config){
    for(const key of ['materialSurface','sceneBackground']){
      const match=config[key]?.match(/^\/api\/workshop\/material-surfaces\/([a-f0-9]{64})\.png$/);
      if(match)config[key]='data:image/png;base64,'+assets.materialSurface(match[1]).toString('base64');
    }
    return config;
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
    const universal=embedMaterialSurface(structuredClone(resolved.config));
    // The legacy workbench ID is provenance in the saved document, not a write
    // destination for the new customer editor. Its parent supplies this store's
    // pinned review binding separately.
    delete universal.workbench;
    universal.localResources.motifs=universal.localResources.motifs.map(m=>m.artwork?assets.resource(m.artwork.assetId):m);
    universal.workshopElementRights=structuredClone(record.document.elementRights);
    universal.workshopProfiles=version!==null&&version!==undefined?(record.metadata.profiles||{selections:{fonts:null,motifs:null,colors:null,bestsellers:null},sources:{},settingsRevision:0}):profiles.resolve(record.document);
    for(const id of universal.workshopProfiles.selections?.fonts||[])if(!Object.hasOwn(universal.localResources.fonts,id)&&Object.hasOwn(formFonts,id))universal.localResources.fonts[id]=structuredClone(formFonts[id]);
    universal.profile.name=record.document.name;
    universal.profile.id=record.id;
    universal.profile.binding={kind:'local-review',productId:record.id};
    universal.profile.revision=`${record.id}:${record.revision}`;
    if(themeCatalog)universal.themes=structuredClone(themeCatalog);
    return {key:'acryl',name:record.document.name,legacy:shell,universal,configuration:{id:record.id,revision:record.revision,publishedRevision:record.publishedRevision}};
  }
  function editorPreview(input,designId,options){
    const document=validateProductDocument(input);profiles.resolve(document);assets.validateDocument(document);
    const resolved=resolveProduct(document,{designId,options});
    const universal=embedMaterialSurface(structuredClone(resolved.config));universal.profile.defaultDesignId=resolved.designId;
    universal.localResources.motifs=universal.localResources.motifs.map(m=>m.artwork?assets.resource(m.artwork.assetId):m);
    const examples=(universal.localResources.photoExamples||[]).filter(e=>e.designId===resolved.designId).map(e=>({...e,url:'data:image/svg+xml;base64,'+assets.read(e.assetId).toString('base64')}));
    return {svg:privateProductPreview({universal},{options:resolved.resolvedOptions,examples,keepout:true}),designId:resolved.designId,price:resolved.price,holeHint:previewHoleHint(universal,{options:resolved.resolvedOptions,designId:resolved.designId})};
  }
  // K7 (Ü8.2): GET/POST/DELETE /api/workshop/account-drafts[/:id[/preview.png|/photos/:uploadId]] hinter der Kundenprüfung.
  const base64Bytes=(value,label)=>{if(typeof value!=='string'||!value.length||value.length%4!==0||value.length>Math.ceil(MAX_CUSTOMER_PHOTO/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))fail(422,'customer_draft_media',label);const bytes=Buffer.from(value,'base64');if(bytes.toString('base64')!==value)fail(422,'customer_draft_media',label);return bytes;};
  function validatedAccountDraft(data){
    if(Object.keys(data).some(k=>!['title','draft','photos','preview'].includes(k)))fail(422,'customer_draft_fields','Nur Titel, Entwurf, Fotos und Vorschau übergeben.');
    const draft=data.draft;if(!draft||typeof draft!=='object'||Array.isArray(draft)||typeof draft.productId!=='string'||typeof draft.profileRevision!=='string')fail(422,'customer_draft_fields','Bitte den vollständigen Entwurf übergeben.');
    const [productId,revisionText]=draft.profileRevision.split(':');
    if(productId!==draft.productId||!/^[1-9][0-9]*$/.test(revisionText||''))fail(422,'customer_draft_fields','Produktstand des Entwurfs ist ungültig.');
    let record;try{record=repository.get(draft.productId,{revision:revision(revisionText)});}catch{fail(422,'customer_draft_invalid','Der Produktstand dieses Entwurfs ist nicht mehr verfügbar.');}
    if(isFormProduct(record.document)||record.status==='archived'||repository.get(record.id).status==='archived')fail(422,'acrylic_required','Bitte ein aktives Produkt verwenden.');
    assertKonfiAvailable(record.id);
    const universal=model(record.id,record.revision).universal,source=universal.profile.designs.find(d=>d.id===draft.design?.id);
    // Gleiche Prüfung wie im Editor (contract.readDraft, unfertiger Entwurf erlaubt); Gestaltungslinien wie der Editor registrieren.
    try{readDraft(universal,draft,universal.localResources.fonts,[...universal.localResources.motifs,...decorationMotifs(source)],{draft:true});}
    catch(error){fail(422,'customer_draft_invalid',error.message);}
    const uploadIds=new Set(draft.design.objects.filter(o=>o.uxUploadId).map(o=>o.uxUploadId));
    const photos=(Array.isArray(data.photos)?data.photos:data.photos===undefined?[]:fail(422,'customer_draft_media','Fotos als Liste übergeben.')).map(p=>{
      if(!p||typeof p!=='object'||Object.keys(p).some(k=>!['uploadId','kind','name','mime','original','edited'].includes(k)))fail(422,'customer_draft_media','Ungültige Fotoangabe.');
      if(!uploadIds.has(p.uploadId))fail(422,'customer_draft_media','Ein Foto gehört zu keinem Element des Entwurfs.');
      return {uploadId:p.uploadId,kind:p.kind,name:p.name,mime:p.mime,original:base64Bytes(p.original,'Ungültiges Foto.'),...(p.edited!==undefined?{edited:base64Bytes(p.edited,'Ungültige bearbeitete Fotofassung.')}:{})};
    });
    return {productId:record.id,profileRevision:universal.profile.revision,title:data.title,draft,photos,preview:data.preview===undefined?undefined:base64Bytes(data.preview,'Ungültige Vorschau.')};
  }
  async function accountDraftRoute(req,res,url,match){
    const method=req.method,store=customerDrafts.accountDrafts;
    if(!['GET','POST','DELETE'].includes(method))fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
    const principal=customerPrincipal(req,url),id=match[1];
    if(!id){
      if(method==='GET')return json(res,200,{drafts:store.list(principal),limit:store.limit,ttlDays:store.ttlDays});
      if(method==='POST')return json(res,201,{draft:store.create(principal,validatedAccountDraft(await body(req,100*1024*1024)))});
      fail(405,'method_not_allowed','Entwürfe mit GET lesen oder mit POST speichern.');
    }
    if(match[2]==='preview.png'){
      if(method!=='GET')fail(405,'method_not_allowed','Vorschau nur lesen.');
      const bytes=store.preview(principal,id);
      return res.writeHead(200,{'Content-Type':'image/png','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);
    }
    if(match[3]){
      if(method!=='GET')fail(405,'method_not_allowed','Fotos nur lesen.');
      const variant=url.searchParams.get('variant')||'original';
      const photo=store.photo(principal,id,match[3],variant);
      return res.writeHead(200,{'Content-Type':photo.mime,'Content-Length':photo.bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}).end(photo.bytes);
    }
    if(method==='GET')return json(res,200,store.get(principal,id));
    if(method==='DELETE')return json(res,200,store.remove(principal,id));
    return json(res,200,{draft:store.save(principal,id,validatedAccountDraft(await body(req,100*1024*1024)))});
  }
  // B1 Konfis: alle kundenfähigen Produkte des Mandanten mit Status, Shop-Verknüpfung (nur gelesen) und Klarnamen.
  function konfiItems(query=''){
    const items=[];for(let page=1,pages=1;page<=pages&&page<=200;page++){const c=repository.catalog({kind:'product',filter:'all',query,sort:'name',page,pageSize:100});pages=c.pages;items.push(...c.products);}
    return items;
  }
  function listKonfis(params){
    const query=params.get('query')||'',filter=params.get('status')||'all',page=Number(params.get('page')||1),pageSize=Number(params.get('pageSize')||24);
    if(query.length>200||!['all','draft','released','paused'].includes(filter)||!Number.isSafeInteger(page)||page<1||![12,24,48,96].includes(pageSize))fail(422,'konfi_query','Ungültige Filter.');
    const all=konfiItems(query),capable=all.filter(isCustomerCapable),statuses=konfis.all();
    const transfers=new Map(),bindings=new Map();
    for(const t of customerDrafts.shopDraftTransfers.completed())if(!transfers.has(t.productId))transfers.set(t.productId,t);
    for(const b of orderIntake.bindings()){if(!bindings.has(b.productId))bindings.set(b.productId,{shopDomain:b.shopDomain,variants:new Set()});bindings.get(b.productId).variants.add(b.variantId);}
    const labels=labelCategories(capable.flatMap(p=>p.categoryIds||[]));
    const rows=capable.map(p=>{
      const status=statuses.get(p.id)||konfis.get(p.id),transfer=transfers.get(p.id),bound=bindings.get(p.id);
      const shop=transfer?{state:'product',shopDomain:transfer.shopDomain,shopifyProductId:transfer.shopifyProductId,handle:transfer.handle,shopStatus:transfer.status}:bound?{state:'variants',shopDomain:bound.shopDomain,variantCount:bound.variants.size}:{state:'unlinked'};
      const family=(p.categoryIds||[]).find(id=>id.startsWith('familie-'));
      return {id:p.id,name:p.name,revision:p.revision,updatedAt:p.updatedAt,formProduct:Boolean(p.overview?.formProduct),method:p.overview?.method||null,categoryIds:p.categoryIds||[],family:family?{id:family,...labels[family]}:null,status,shop,customerPath:'/?configuration='+encodeURIComponent(p.id)};
    });
    const counts={all:rows.length,draft:0,released:0,paused:0};for(const r of rows)counts[r.status.status]++;
    const filtered=filter==='all'?rows:rows.filter(r=>r.status.status===filter),pages=Math.max(1,Math.ceil(filtered.length/pageSize)),current=Math.min(page,pages);
    return {tenant:{id:tenantId,name:tenant?.name??tenantId},konfis:filtered.slice((current-1)*pageSize,current*pageSize),counts,total:filtered.length,page:current,pages,pageSize,excluded:all.length-capable.length,categoryLabels:labels};
  }
  // Kundenroute (Seite): pausierter Konfi → Hinweisseite statt Editor. Sonst null.
  function pausedPage(id){if(!konfis.paused(id))return null;let name='';try{name=repository.get(id).document.name;}catch{}return pausedCustomerPage(name);}
  function customerModelFor(id,version){assertKonfiAvailable(id);return model(id,version);}
  async function handle(req,res,url){
    try{
      const pathname=url.pathname,method=req.method;
      const accountDraft=pathname.match(/^\/api\/workshop\/account-drafts(?:\/(cdraft_[a-f0-9-]{36})(?:\/(preview\.png)|\/photos\/([A-Za-z0-9_-]{1,64}))?)?$/);
      if(accountDraft)return await accountDraftRoute(req,res,url,accountDraft);
      if(!['GET','POST','PATCH'].includes(method))fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      if(pathname==='/api/workshop/order-webhook'){
        if(method!=='POST')fail(405,'method_not_allowed','Bestellnachrichten benötigen POST.');
        if(!orderWebhook)fail(503,'orders_disabled','Test-Bestellanbindung ist nicht eingerichtet.');
        if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'json_required','JSON erforderlich.');
        let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>1024*1024)fail(413,'body_limit','Bestellnachricht zu groß.');chunks.push(chunk);}
        return json(res,200,orderIntake.receive(Buffer.concat(chunks),req.headers,orderWebhook));
      }
      const customerFile=pathname.match(/^\/api\/workshop\/customer-files\/(grant_[a-f0-9-]+)$/);
      if(pathname==='/api/workshop/customer-files'){
        if(!verifySession)fail(503,'customer_download_disabled','Kundenkonto-Testanbindung ist nicht eingerichtet.');
        if(method!=='GET')fail(405,'method_not_allowed','Dateiliste benötigt GET.');
        const principal=verifySession(req.headers.authorization,'customer'),before=url.searchParams.get('before');
        if(before!==null&&!/^[1-9][0-9]*$/.test(before))fail(422,'customer_download_fields','Ungültige Fortsetzung.');
        return json(res,200,customerDrafts.customerDownloads.available(principal,before===null?undefined:Number(before)));
      }
      if(customerFile){
        if(!verifySession)fail(503,'customer_download_disabled','Kundenkonto-Testanbindung ist nicht eingerichtet.');
        if(method!=='POST')fail(405,'method_not_allowed','Dateizugriff benötigt POST.');
        const principal=verifySession(req.headers.authorization,'customer'),data=await body(req,1024);
        if(Object.keys(data).length)fail(422,'customer_download_fields','Für den Download sind keine Kundendaten nötig.');
        const file=customerDrafts.customerDownloads.download(customerFile[1],principal);
        return res.writeHead(200,{'Content-Type':file.mime,'Content-Length':file.bytes.length,'Content-Disposition':'attachment; filename="'+customerFile[1]+(file.mime==='application/zip'?'.zip':'.pdf')+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(file.bytes);
      }
      const merchantSession=verifySession?verifySession(req.headers.authorization,'merchant'):null;
      if(method!=='GET'&&!sameToken(req.headers['x-gravuru-csrf'],csrfToken))fail(403,'invalid_session','Bitte die Werkstatt neu laden.');
      if(pathname==='/api/workshop/shop-product-bindings/check'){
        if(method!=='POST')fail(405,'method_not_allowed','Die ID-Prüfung benötigt POST.');
        if(!merchantSession)fail(503,'shop_binding_login_required','Die ID-Prüfung benötigt eine bestätigte Händleranmeldung.');
        const checker=configuredBindingCheck(),data=await body(req,65536);
        return json(res,200,await checker.check(data));
      }
      if(pathname==='/api/workshop/catalog-structure'){
        if(method==='GET')return json(res,200,catalogStructure.read());
        if(method==='PATCH')return json(res,200,catalogStructure.save(await body(req,16384)));
        fail(405,'method_not_allowed','Die Katalogstruktur unterstützt Lesen und Speichern.');
      }
      if(pathname==='/api/workshop/ai-design/status'&&method==='GET')return json(res,200,aiJobs.status());
      if(pathname==='/api/workshop/ai-batches/prepare'&&method==='POST'){const data=await body(req,32768);if(Object.keys(data).join(',')!=='products')fail(422,'ai_batch_invalid','Ungültige Produktauswahl.');return json(res,200,aiBatches.prepare(data.products));}
      if(pathname==='/api/workshop/ai-batches'){
        if(method==='GET')return json(res,200,{batches:aiBatches.list(),budget:aiJobs.status()});
        if(method==='POST')return json(res,202,aiBatches.start(await body(req,65536)));
      }
      const aiBatch=pathname.match(/^\/api\/workshop\/ai-batches\/(aib_[a-f0-9-]{36})(?:\/(resume|cancel))?$/);
      if(aiBatch){
        if(method==='GET'&&!aiBatch[2])return json(res,200,aiBatches.get(aiBatch[1]));
        if(method==='POST'&&aiBatch[2]&&!Object.keys(await body(req,1024)).length)return json(res,200,aiBatches[aiBatch[2]](aiBatch[1]));
        fail(422,'ai_batch_invalid','Ungültige Stapelaktion.');
      }
      const aiProduct=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/ai-design$/);
      if(aiProduct){
        repository.get(aiProduct[1]);
        if(method==='GET')return json(res,200,{jobs:aiJobs.list(aiProduct[1]),budget:aiJobs.status()});
        if(method==='POST')return json(res,202,{job:aiJobs.start(aiProduct[1],await body(req,16384))});
        fail(405,'method_not_allowed','Diese KI-Aktion wird nicht unterstützt.');
      }
      const aiJob=pathname.match(/^\/api\/workshop\/ai-design\/(air_[a-f0-9-]{36})(?:\/(apply|cancel))?$/);
      if(aiJob){
        if(method==='GET'&&!aiJob[2]){
          const job=aiJobs.get(aiJob[1]),result={job,budget:aiJobs.status()};
          if(['review','applied'].includes(job.status)){
            const old=repository.get(job.productId,{revision:job.expectedRevision});
            result.before=editorPreview(old.document,job.designId).svg;
            result.after=editorPreview(aiJobs.candidate(job.id),job.designId).svg;
          }
          return json(res,200,result);
        }
        if(method==='POST'){
          const data=await body(req,1024);
          if(aiJob[2]==='apply'&&Object.keys(data).length===1&&Object.hasOwn(data,'expectedRevision'))return json(res,200,aiJobs.apply(aiJob[1],data.expectedRevision));
          if(aiJob[2]==='cancel'&&!Object.keys(data).length)return json(res,200,{job:aiJobs.cancel(aiJob[1])});
        }
        fail(422,'ai_action_invalid','Ungültige KI-Aktion.');
      }
      const shopTransferMatch=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/shop-transfer$/);
      if(shopTransferMatch){
        if(method==='GET'){
          if(!shopDrafts)return json(res,200,{enabled:false,transfer:null,mode:'draft-only'});
          const record=repository.get(shopTransferMatch[1],{revision:revision(url.searchParams.get('revision'))}),request=shopDraftRequest(record,shopDrafts.config.shopDomain);
          const transfer=customerDrafts.shopDraftTransfers.get(request.identity),bound=orderIntake.bindings().filter(b=>b.shopDomain===shopDrafts.config.shopDomain&&b.productId===record.id&&b.productRevision===record.revision);
          const bindingsConfirmed=Boolean(transfer?.state==='completed'&&transfer.sourceSha256===request.sourceSha256&&transfer.result.mappings.every(m=>bound.some(b=>b.variantId===m.variantId)));
          return json(res,200,{enabled:true,shopDomain:shopDrafts.config.shopDomain,transfer,bindingsConfirmed,mode:'draft-only'});
        }
        if(method!=='POST')fail(405,'method_not_allowed','Entwurfsübertragung benötigt POST.');
        if(!shopDrafts)fail(503,'shop_draft_disabled','Shop-Entwurfsanbindung ist noch nicht eingerichtet.');
        const data=await body(req,2048);if(Object.keys(data).some(k=>!['expectedRevision','sourceSha256','action'].includes(k)))fail(422,'shop_draft_fields','Nur gespeicherten Produktstand und Aktion angeben.');
        const controller=new AbortController(),abort=()=>controller.abort();req.once('aborted',abort);res.once('close',abort);
        try{return json(res,200,await configuredTransfer()({...data,productId:shopTransferMatch[1]},merchantSession,{signal:controller.signal}));}
        finally{req.removeListener('aborted',abort);res.removeListener('close',abort);}
      }
      const grantsMatch=pathname.match(/^\/api\/workshop\/orders\/(orderline_[a-f0-9-]+)\/file-grants$/);
      if(grantsMatch){
        if(!merchantSession)fail(503,'customer_download_disabled','Händler-Testanmeldung für Dateifreigaben erforderlich.');
        if(method==='GET')return json(res,200,{grants:customerDrafts.customerDownloads.list(grantsMatch[1],merchantSession)});
        if(method!=='POST')fail(405,'method_not_allowed','Freigabe benötigt POST.');
        const data=await body(req,2048);
        if(Object.keys(data).some(k=>!['jobId','format'].includes(k)))fail(422,'customer_download_fields','Nur Ausgabeauftrag und Dateiformat angeben.');
        return json(res,201,customerDrafts.customerDownloads.grant({...data,lineId:grantsMatch[1]},merchantSession));
      }
      const revokeMatch=pathname.match(/^\/api\/workshop\/file-grants\/(grant_[a-f0-9-]+)\/revoke$/);
      if(revokeMatch){
        if(!merchantSession)fail(503,'customer_download_disabled','Händler-Testanmeldung für Dateifreigaben erforderlich.');
        if(method!=='POST')fail(405,'method_not_allowed','Widerruf benötigt POST.');
        const data=await body(req,1024);if(Object.keys(data).length)fail(422,'customer_download_fields','Widerruf benötigt keine Zusatzdaten.');
        return json(res,200,customerDrafts.customerDownloads.revoke(revokeMatch[1],merchantSession));
      }
      if(pathname==='/api/workshop/draft-cart'){
        if(method!=='POST')fail(405,'method_not_allowed','Eine Warenkorbübergabe benötigt POST.');
        if(!storefront)fail(503,'cart_disabled','Die bestätigte Test-Warenkorbanbindung ist nicht eingerichtet.');
        const data=await body(req,16*1024),controller=new AbortController();
        const abort=()=>controller.abort();req.once('aborted',abort);res.once('close',abort);
        try{return json(res,200,await configuredCart()(data,{draftToken:req.headers['x-gravuru-draft'],request:req,signal:controller.signal}));}
        finally{req.removeListener('aborted',abort);res.removeListener('close',abort);}
      }
      if(pathname==='/api/workshop/merchant-test-cart'){
        if(!merchantSession||!merchantTestCart)fail(503,'test_cart_disabled','Der geschützte Händler-Testkauf ist nicht eingerichtet.');
        if(method!=='POST')fail(405,'method_not_allowed','Ein Test-Warenkorb benötigt POST.');
        const data=await body(req,2048),controller=new AbortController(),abort=()=>controller.abort();req.once('aborted',abort);res.once('close',abort);
        try{return json(res,200,await configuredMerchantCart()(data,{draftToken:req.headers['x-gravuru-draft'],signal:controller.signal}));}
        finally{req.removeListener('aborted',abort);res.removeListener('close',abort);}
      }
      if(pathname==='/api/workshop/orders'&&method==='GET'){const orders=orderIntake.list();return json(res,200,{orders,errors:orderIntake.errors(),statuses:Object.fromEntries(orders.map(o=>[o.id,orderIntake.status(o.id)])),integration:{enabled:Boolean(orderWebhook),mode:'test-only'}});}
      const orderProductMatch=pathname.match(/^\/api\/workshop\/orders\/(orderline_[a-f0-9-]+)\/product-draft(?:\/(preview|apply))?$/);
      if(orderProductMatch){
        const line=orderIntake.get(orderProductMatch[1]),action=orderProductMatch[2];
        if(method==='GET'&&!action)return json(res,200,{product:orderProductDraft(repository,line)});
        if(method!=='POST'||!action)fail(405,'method_not_allowed','Bitte eine Vorschau prüfen oder übernehmen.');
        const data=await body(req),plan=planOrderProductDraft({line,archive:customerDrafts.downloadSnapshot(line.snapshotId,'package'),input:data,assets,contours,fonts:formFonts});
        productionProfiles.resolve(plan.document);
        if(action==='apply')return json(res,201,applyOrderProductDraft(repository,plan,data.token));
        const {document,...summary}=plan;let preview;if(isFormProduct(document))preview=formProductPreview(document,{assets,contours,fonts:formFonts});else{profiles.resolve(document);assets.validateDocument(document);const r=resolveProduct(document),universal=structuredClone(r.config);universal.localResources.motifs=universal.localResources.motifs.map(m=>m.artwork?assets.resource(m.artwork.assetId):m);const examples=(universal.localResources.photoExamples||[]).map(e=>({...e,url:'data:image/svg+xml;base64,'+assets.read(e.assetId).toString('base64')}));preview=privateProductPreview({universal},{options:r.resolvedOptions,examples});}return json(res,200,{...summary,preview});
      }
      const orderOutputsMatch=pathname.match(/^\/api\/workshop\/orders\/(orderline_[a-f0-9-]+)\/outputs$/);
      if(orderOutputsMatch&&method==='GET'){
        const line=orderIntake.get(orderOutputsMatch[1]);
        return json(res,200,{positionId:line.id,orderId:line.orderId,snapshotId:line.snapshotId,product:line.product,quantity:line.quantity,status:orderIntake.status(line.id),...exportJobs.forSnapshot(line.snapshotId),scope:'local-operator'});
      }
      const orderStatusMatch=pathname.match(/^\/api\/workshop\/orders\/(orderline_[a-f0-9-]+)\/status$/);if(orderStatusMatch&&method==='GET')return json(res,200,orderIntake.status(orderStatusMatch[1]));
      const productionMatch=pathname.match(/^\/api\/workshop\/orders\/(orderline_[a-f0-9-]+)\/production(?:\/(transition))?$/);
      if(productionMatch){
        const line=orderIntake.get(productionMatch[1]);
        if(method==='GET'&&!productionMatch[2])return json(res,200,orderIntake.production.state(line.id));
        if(method!=='POST'||!productionMatch[2])fail(405,'method_not_allowed','Freigabestand lesen oder einen Übergang senden.');
        const data=await body(req,4096);if(Object.keys(data).some(k=>!['to','reason'].includes(k)))fail(422,'production_fields','Nur Zielzustand und Grund angeben.');
        return json(res,201,orderIntake.production.transition(line.id,data.to,{actor:merchantSession?'merchant:'+merchantSession.subject:localActor,reason:data.reason}));
      }
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
        res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${downloadPrefix}-Ausfuehrungen-Bestand.xlsx"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);return;
      }
      if(pathname==='/api/workshop/variant-import-template'&&method==='GET'){
        const bytes=fs.readFileSync(new URL('./templates/ausfuehrungen.xlsx',import.meta.url));res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${downloadPrefix}-Ausfuehrungen.xlsx"`,'Cache-Control':'no-store'}).end(bytes);return;
      }
      if(pathname==='/api/workshop/variants/batch/report'&&method==='POST'){
        const data=variantBatchReportData(variants,await body(req)),bytes=await variantBatchReportWorkbook(data);
        const filename=data.mode==='errors'?`${downloadPrefix}-Ausfuehrungen-Korrektur.xlsx`:`${downloadPrefix}-Ausfuehrungen-Pruefbericht.xlsx`;
        res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).end(bytes);return;
      }
      if(pathname==='/api/workshop/variants/batch/jobs'){
        if(method==='GET')return json(res,200,{jobs:variantBatchJobs.list()});
        if(method==='POST')return json(res,201,variantBatchJobs.create(await body(req)));
        fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      }
      const variantJobMatch=pathname.match(/^\/api\/workshop\/variants\/batch\/jobs\/(imp_[a-f0-9-]{36})(\/remove)?$/);
      if(variantJobMatch){
        if(!variantJobMatch[2]&&method==='GET')return json(res,200,variantBatchJobs.review(variantJobMatch[1]));
        if(variantJobMatch[2]&&method==='POST'){
          if(Object.keys(await body(req)).length)fail(422,'batch_job','Entfernen benötigt keine zusätzlichen Daten.');
          return json(res,200,variantBatchJobs.remove(variantJobMatch[1]));
        }
        fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
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
      if(pathname==='/api/workshop/session'&&method==='GET')return json(res,200,{csrfToken,tenant:{id:tenantId,name:tenant?.name??tenantId},scope:merchantSession?'shopify-merchant-test':'local-operator',merchantTestCart:merchantSession&&merchantTestCart?{productId:merchantTestCart.productId,productRevision:merchantTestCart.productRevision}:null});
      if(pathname==='/api/workshop/tenants'){if(!platformOverview)fail(404,'not_found','Diese Ansicht gibt es hier nicht.');if(method!=='GET')fail(405,'method_not_allowed','Mandanten werden hier nur gelesen.');return json(res,200,platformOverview());}
      if(pathname==='/api/workshop/konfis'){if(method!=='GET')fail(405,'method_not_allowed','Konfis werden hier nur gelesen.');return json(res,200,listKonfis(url.searchParams));}
      const konfiMatch=pathname.match(/^\/api\/workshop\/konfis\/(cfg_[a-f0-9-]{36})\/(status|events)$/);
      if(konfiMatch){
        const id=konfiMatch[1],record=repository.get(id);
        if(konfiMatch[2]==='events'){if(method!=='GET')fail(405,'method_not_allowed','Der Verlauf wird nur gelesen.');return json(res,200,{productId:id,status:konfis.get(id),events:konfis.events(id)});}
        if(method!=='POST')fail(405,'method_not_allowed','Status mit POST ändern.');
        const data=await body(req,4096);
        if(Object.keys(data).some(k=>!['status','expectedStatus'].includes(k)))fail(422,'konfi_status_fields','Nur neuen und bisherigen Status übergeben.');
        if(record.document.kind!=='product'||record.status==='archived')fail(422,'konfi_not_capable','Nur aktive Produkte können freigegeben oder pausiert werden – keine Mastervorlagen, nichts Archiviertes.');
        if(data.status==='released'){try{model(id);}catch(error){fail(422,'konfi_not_capable','Dieses Produkt ist noch nicht für Kunden bereit: '+error.message);}}
        const status=konfis.set(id,{to:data.status,expectedStatus:data.expectedStatus,productRevision:record.revision,actor:merchantSession?'merchant:'+merchantSession.subject:localActor});
        return json(res,200,{productId:id,status,events:konfis.events(id)});
      }
      const customerModel=pathname.match(/^\/api\/workshop\/customer-model\/(cfg_[a-f0-9-]{36})$/);
      if(customerModel&&method==='GET'){
        if(!url.searchParams.has('revision'))fail(422,'revision_required','Eine feste Produktrevision ist erforderlich.');
        return json(res,200,model(customerModel[1],url.searchParams.get('revision')));
      }
      if(pathname==='/api/workshop/production-profiles'){
        if(method==='GET')return json(res,200,{profiles:productionProfiles.list(),machines:PRODUCTION_MACHINES});
        if(method==='POST')return json(res,201,productionProfiles.create((await body(req)).document));
      }
      const manufacturingMatch=pathname.match(/^\/api\/workshop\/production-profiles\/(mfg_[a-f0-9-]+)(?:\/(history|usage))?$/);
      if(manufacturingMatch){
        const id=manufacturingMatch[1];if(method==='GET'&&manufacturingMatch[2]==='usage'){productionProfiles.get(id);return json(res,200,{products:repository.productionProfileUsage(id),scope:'current-and-activated-product-revisions'});}if(method==='GET')return json(res,200,manufacturingMatch[2]?{revisions:productionProfiles.history(id)}:productionProfiles.get(id,revision(url.searchParams.get('revision'))));
        if(method==='PATCH'&&!manufacturingMatch[2]){const data=await body(req);return json(res,200,productionProfiles.save(id,data.document,data.expectedRevision));}
        fail(405,'method_not_allowed','Diese Profilaktion ist nicht möglich.');
      }
      // K8 (Ü9.1): Bearbeiten aus dem Warenkorb – genau diese Revision laden; nur mit privatem Entwurfstoken.
      const cartRevisionMatch=pathname.match(/^\/api\/workshop\/cart-configurations\/(konfig_[a-f0-9-]{36})\/([1-9][0-9]{0,8})(?:\/photos\/([A-Za-z0-9_-]{1,100}))?$/);
      if(cartRevisionMatch){
        if(method!=='GET')fail(405,'method_not_allowed','Konfigurations-Revisionen werden nur gelesen.');
        const access={drafts:customerDrafts,configId:cartRevisionMatch[1],rev:Number(cartRevisionMatch[2]),draftToken:req.headers['x-gravuru-draft']};
        if(!cartRevisionMatch[3])return json(res,200,loadCartRevision({...access,repository}));
        const photo=loadCartRevisionPhoto({...access,uploadId:cartRevisionMatch[3],edited:url.searchParams.get('edited')==='1'});
        return res.writeHead(200,{'Content-Type':photo.contentType,'Content-Length':photo.bytes.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}).end(photo.bytes);
      }
      const acrylicDraftMatch=pathname.match(/^\/api\/workshop\/acrylic-drafts\/(adraft_[a-f0-9-]+)$/);
      if(pathname==='/api/workshop/acrylic-drafts'||acrylicDraftMatch){
        const token=req.headers['x-gravuru-draft'],draft=acrylicDraftMatch?customerDrafts.acrylicDrafts.get(acrylicDraftMatch[1],token):null;
        if(draft&&method==='GET')return json(res,200,{draft,review:customerDrafts.review(draft.snapshotId).manifest});
        if(method!=='POST')fail(405,'method_not_allowed','Acrylentwürfe mit POST sichern oder einen privaten Entwurf lesen.');
        if(reviewJobs.size>=2)fail(409,'review_busy','Eine Gestaltung wird gerade gesichert. Bitte kurz warten.');
        const job=randomUUID();reviewJobs.add(job);try{
          const data=await body(req,100*1024*1024),allowed=draft?['input','expectedRevision']:['input'];
          if(Object.keys(data).some(k=>!allowed.includes(k))||!data.input||typeof data.input!=='object'||Array.isArray(data.input))fail(422,'acrylic_draft_fields','Bitte die vollständige Gestaltung übergeben.');
          if(draft&&data.expectedRevision!==draft.revision)fail(409,'stale_customer_draft','Der Acrylentwurf wurde inzwischen geändert.');
          const input=data.input;
          if(!Number.isSafeInteger(input.productRevision)||input.productRevision<1)fail(422,'revision_required','Eine feste Produktrevision ist erforderlich.');
          if(draft&&(input.productId!==draft.productId||input.productRevision!==draft.productRevision||input.designId!==draft.designId))fail(409,'acrylic_draft_identity','Produktstand und Design gehören zu diesem festen Entwurf.');
          const record=repository.get(input.productId,{revision:input.productRevision});
          if(isFormProduct(record.document)||record.status==='archived'||repository.get(record.id).status==='archived')fail(422,'acrylic_required','Bitte ein aktives Acrylprodukt verwenden.');
          assertKonfiAvailable(record.id);
          const bundle=await prepareAcrylicReview({record,config:model(record.id,record.revision).universal,input,assets});
          const saved=draft?customerDrafts.acrylicDrafts.save(draft.id,token,data.expectedRevision,bundle):customerDrafts.acrylicDrafts.create(bundle);
          // Ü5.2: Auflösungs-Hinweis als Text an den Editor; nie eine Sperre, keine Bestätigung.
          return json(res,draft?200:201,{...saved,photoHints:bundle.manifest.photoHints||[],photoResolution:(bundle.manifest.photoResolution||[]).map(p=>({objectId:p.objectId,grade:p.grade,effectiveDpi:p.effectiveDpi,targetDpi:p.targetDpi}))});
        }finally{reviewJobs.delete(job);}
      }
      if(pathname==='/api/workshop/acrylic-reviews'&&method==='POST'){
        if(reviewJobs.size>=2)fail(409,'review_busy','Eine Gestaltung wird gerade gesichert. Bitte kurz warten.');
        const job=randomUUID();reviewJobs.add(job);try{
          const data=await body(req,100*1024*1024);
          if(!Number.isSafeInteger(data.productRevision)||data.productRevision<1)fail(422,'revision_required','Eine feste Produktrevision ist erforderlich.');
          const record=repository.get(data.productId,{revision:data.productRevision});
          if(isFormProduct(record.document)||record.status==='archived'||repository.get(record.id).status==='archived')fail(422,'acrylic_required','Bitte ein aktives Acrylprodukt verwenden.');
          assertKonfiAvailable(record.id);
          const key=createHash('sha256').update(JSON.stringify(data)).digest('hex'),old=customerDrafts.findAcrylicReview(key);if(old)return json(res,200,old);
          const bundle=await prepareAcrylicReview({record,config:model(record.id,record.revision).universal,input:data,assets});
          return json(res,201,customerDrafts.captureAcrylicReview(key,bundle));
        }finally{reviewJobs.delete(job);}
      }
      if(pathname==='/api/workshop/acryl-shop'){
        const data=method==='GET'?Object.fromEntries(url.searchParams):await body(req,16384);
        if(method==='GET')return json(res,200,await acrylShop.status(data.group,{fresh:data.fresh==='1'}));
        if(method==='POST')return json(res,200,await acrylShop.act(data.group,data,merchantSession));
        fail(405,'method','Aktion nicht unterstützt.');
      }
      if(pathname==='/api/workshop/acryl-gallery'&&method==='GET'){
        const name=url.searchParams.get('kind')==='forms'?'Formvorlagen.html':'Designgalerie.html';
        return json(res,200,{html:fs.readFileSync(new URL('./acryl-gallery/'+name,import.meta.url),'utf8')});
      }
      if(pathname==='/api/workshop/design-correction-history'&&method==='GET'){return json(res,200,{corrections:corrections.history().filter(row=>{try{return repository.get(row.productId).revision!==row.productRevision;}catch{return false;}})});}
      if(pathname==='/api/workshop/design-preview'&&method==='GET'){
        const record=customerRecord(url.searchParams.get('productId'),revision(url.searchParams.get('productRevision'))),designId=url.searchParams.get('designId'),source=record.document.designs.find(d=>d.id===designId);
        if(!source)fail(404,'design_missing','Design nicht gefunden.');
        const correction=corrections.get(record.id,record.revision,designId),state=correction?.state||initialFormCustomerState(source);
        const view=customerResult({productId:record.id,productRevision:record.revision,designId,state},null);
        return json(res,200,{svg:view.svg,correction});
      }
      if(pathname==='/api/workshop/design-corrections'){
        const data=method==='GET'?Object.fromEntries(url.searchParams):await body(req),record=customerRecord(data.productId,revision(data.productRevision)),designId=data.designId;
        if(!record.document.designs.some(d=>d.id===designId))fail(404,'design_missing','Design nicht gefunden.');
        if(method==='GET')return json(res,200,{correction:corrections.get(record.id,record.revision,designId)});
        if(method!=='POST'||Object.keys(data).some(k=>!['productId','productRevision','designId','state','expectedRevision'].includes(k)))fail(422,'correction_fields','Ungültige Korrekturdaten.');
        const state=fitFormTextFrames(record.document,designId,data.state,formFonts),resolved=resolveFormCustomer(record.document,designId,state,{assets,fonts:formFonts,profiles:record.metadata.profiles});
        if(state.fields.some(f=>f.mediaId))fail(422,'correction_private_photo','Private Kundenfotos können nicht als gemeinsame Designvorlage gespeichert werden.');
        return json(res,200,{correction:corrections.save({productId:record.id,productRevision:record.revision,designId,state,expectedRevision:data.expectedRevision,actor:merchantSession?.subject||localActor})});
      }
      if(pathname==='/api/workshop/customer-drafts'&&method==='POST'){
        const data=await body(req),record=customerRecord(data.productId,data.productRevision),design=record.document.designs.find(d=>d.id===(data.designId||record.document.defaultDesignId));
        if(!design||repository.get(record.id).status==='archived')fail(422,'customer_design_missing','Bitte ein aktives Produkt und gültiges Design wählen.');
        let initial=initialFormCustomerState(design),inheritedFromRevision=null;
        if(data.inherit){
         const previous=customerDrafts.get(data.inherit.id,data.inherit.token),old=customerRecord(previous.productId,previous.productRevision);
         const shape=d=>JSON.stringify(d.form.geometry),layout=d=>{const x=structuredClone(d);delete x.additions;for(const f of x.fields)for(const k of ['allowMove','allowScale','allowDelete','allowColor'])delete f[k];return JSON.stringify(x);};
         const oldDesign=old.document.designs.find(d=>d.id===design.id);
         if(previous.productId===record.id&&previous.designId===design.id&&previous.productRevision<record.revision&&oldDesign&&shape(old.document)===shape(record.document)&&layout(oldDesign)===layout(design)){
          initial=fitFormTextFrames(record.document,design.id,previous.state,formFonts);
          resolveFormCustomer(record.document,design.id,initial,{assets,fonts:formFonts,profiles:record.metadata.profiles,media:id=>customerDrafts.photo(previous.id,data.inherit.token,id)});
          // Photo IDs belong to their original draft; never move them across drafts.
          if(!initial.fields.some(f=>f.mediaId))inheritedFromRevision=previous.productRevision;else initial=initialFormCustomerState(design);
         }
        }
        if(data.shared===true){const shared=corrections.get(record.id,record.revision,design.id);if(shared)initial=shared.state;}
        const {token,...draft}=customerDrafts.create(record,design.id,initial);return json(res,201,{...customerResult(draft,token),token,inheritedFromRevision});
      }
      if(pathname==='/api/workshop/export-jobs'){
        if(method==='GET')return json(res,200,{jobs:exportJobs.list()});
        if(method==='POST'){const data=await body(req);if(Object.keys(data).some(k=>!['snapshotId','settings'].includes(k)))fail(422,'invalid_export_request','Ungültiger Ausgabeauftrag.');const resolved=clientOutputSettings(customerDrafts.review(data.snapshotId).manifest,data.settings),job=enqueueOutput(data.snapshotId,resolved.settings);return json(res,job.status==='completed'?200:202,{...job,outputOrientation:resolved.orientation,clientSettingsIgnored:resolved.ignored});}
      }
      const exportMatch=pathname.match(/^\/api\/workshop\/export-jobs\/(job_[a-f0-9-]+)(?:\/(retry|recreate|download|preview|checks))?$/);
      if(exportMatch){
        const id=exportMatch[1],job=exportJobs.get(id);if(!exportMatch[2]&&method==='GET'){const result=job.status==='completed'?customerDrafts.printProof(job.snapshotId,job.recipeKey):null;return json(res,200,{...job,outputSpecification:outputSpecification(result),retryAvailable:job.status==='failed'&&outputRecipes.includes(job.recipe),recreateAvailable:job.status==='failed'&&!outputRecipes.includes(job.recipe),events:exportJobs.events(id),downloadFormats:result?outputFormats(result):[]});}
        if(exportMatch[2]==='checks'){
          if(job.status!=='completed')fail(409,'export_not_ready','Nur eine fertig gespeicherte Ausgabe kann geprüft werden.');
          const result=customerDrafts.printProof(job.snapshotId,job.recipeKey);if(!result)fail(409,'export_missing','Die gespeicherte Ausgabe fehlt.');
          const formats=outputFormats(result).filter(f=>f!=='zip');
          const files=formats.map(format=>{const f=outputDownload(result,format),sha256=createHash('sha256').update(f.bytes).digest('hex'),expected=format==='pdf'?(result.metadata.downloads?.pdf?.sha256||result.metadata.pdfSha256):result.metadata.downloads?.white?.sha256;if(expected&&sha256!==expected)fail(409,'export_changed','Die PDF weicht vom gesicherten Dateinachweis ab.');return {format,name:f.suffix,sha256};});
          if(method==='GET')return json(res,200,{...exportJobs.checks.list(id,Object.fromEntries(['format','stage','before'].map(k=>[k,url.searchParams.get(k)||'']))),files,machines:PRODUCTION_MACHINES,productionReady:false});
          if(method==='POST'){const data=await body(req,8192),file=files.find(f=>f.format===data.format);if(!file)fail(422,'check_file','Bitte eine vorhandene PDF auswählen.');const check=exportJobs.checks.add(id,data,file);const released=orderIntake.production.reviewSnapshot(job.snapshotId);return json(res,201,{...check,autoReleased:released});}
          fail(405,'method_not_allowed','Prüfvermerke nur lesen oder ergänzen.');
        }
        if(exportMatch[2]==='recreate'&&method==='POST'){
          const data=await body(req);if(Object.keys(data).length)fail(422,'recreate_settings','Die Neuanlage übernimmt ausschließlich den gesicherten Auftrag und seine Einstellungen.');
          if(job.status!=='failed'||outputRecipes.includes(job.recipe))fail(409,'recreate_unavailable','Nur fehlgeschlagene Aufträge mit alter Ausgabeversion hier neu anlegen.');
          const next=enqueueOutput(job.snapshotId,job.settings);return json(res,next.status==='completed'?200:202,{...next,recreatedFrom:id});
        }
        if(exportMatch[2]==='retry'&&method==='POST'){await body(req);if(job.status==='failed'&&!outputRecipes.includes(job.recipe))fail(409,'recipe_obsolete','Diese Ausgabeversion ist nicht mehr ausführbar. Mit aktueller Ausgabeversion neu anlegen; der alte Auftrag bleibt erhalten.');const next=exportJobs.retry(id);exportWorker.kick();return json(res,202,next);}
        if(exportMatch[2]==='preview'&&method==='POST'){
          const data=await body(req);if(Object.keys(data).some(k=>k!=='mode')||!['color','white','engraving'].includes(data.mode))fail(422,'preview_mode','Bitte Farbe, Weiß oder Gravur wählen.');
          if(job.status!=='completed')fail(409,'export_not_ready','Die Ausgabe ist noch nicht fertig.');
          const result=customerDrafts.printProof(job.snapshotId,job.recipeKey);if(!result)fail(409,'export_missing','Die gespeicherte PDF fehlt.');
          if(printPreviewJobs.size>=2)fail(429,'preview_busy','Zwei PDF-Vorschauen werden bereits geladen. Bitte kurz warten.');
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
        if(!reviewMatch[2]&&method==='GET'){const detail=customerDrafts.review(reviewMatch[1]);return json(res,200,{...detail,outputOrientation:productionMirror(detail.manifest),outputCapabilities:{cart:detail.manifest.capabilities?.contour!==false,print:detail.manifest.capabilities?.print!==false&&detail.manifest.product.method==='print',contour:detail.manifest.capabilities?.contour!==false,engraving:detail.manifest.capabilities?.engraving!==false&&detail.manifest.product.method==='engraving'}});}
        if(reviewMatch[2]==='print'&&method==='POST'){
          const data=await body(req);if(Object.keys(data).some(k=>!['settings','format'].includes(k))||!['pdf','white-pdf','zip'].includes(data.format||'pdf'))fail(422,'invalid_print_request','Bitte PDF oder ZIP und gültige Einstellungen auswählen.');
          const id=reviewMatch[1],job=enqueuePrint(id,clientOutputSettings(customerDrafts.review(id).manifest,data.settings).settings);await exportWorker.wait(job.id);const output=customerDrafts.printProof(id,job.recipeKey);
          const download=outputDownload(output,data.format||'pdf'),bytes=download.bytes;
          res.writeHead(200,{'Content-Type':download.mime,'Content-Length':bytes.length,'Content-Disposition':'attachment; filename="'+id+'-'+download.suffix+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Gravuru-Print-Info':encodeURIComponent(JSON.stringify({dpi:output.metadata.settings.dpi,bleedMm:output.metadata.settings.bleedMm,white:output.metadata.settings.white,warnings:output.metadata.warnings.slice(0,3).map(w=>Array.from(w).slice(0,140).join(''))}))}).end(bytes);return;
        }
        if(reviewMatch[2]==='download'&&method==='POST'){
          const data=await body(req);if(!['package','contour','photos'].includes(data.kind))fail(422,'production_not_released','Für diesen Prüfstand ist keine Produktions-PDF freigegeben.');
          let nativeContour=null;const manifest=customerDrafts.review(reviewMatch[1]).manifest;
          if(data.kind==='contour'&&isNativeReviewSchema(manifest.schema)){const key='acrylic-contour/v1';nativeContour=customerDrafts.printProof(reviewMatch[1],key)?.pdf;if(!nativeContour){const pdf=await acrylicContourProof(customerDrafts.downloadSnapshot(reviewMatch[1],'package'),manifest.packageSha256);customerDrafts.savePrintProof(reviewMatch[1],key,{pdf,archive:Buffer.alloc(0),metadata:{recipe:key}});nativeContour=customerDrafts.printProof(reviewMatch[1],key).pdf;}}
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
            const bundle=await prepareFormReview({record:customerRecord(draft.productId,draft.productRevision),draft,assets,contours,fonts:formFonts,media:id=>customerDrafts.photo(draft.id,token,id)});
            return json(res,201,customerDrafts.capture(draft.id,token,data.expectedRevision,bundle));
          }finally{reviewJobs.delete(draft.id);}
        }
        if(action==='photos'&&method==='POST'){
          const photoRecord=customerRecord(draft.productId,draft.productRevision),source=photoRecord.document.designs.find(d=>d.id===draft.designId),photoField=source.fields.find(f=>f.id===data.fieldId&&f.type==='photo');
          if(!photoField)fail(422,'photo_field_missing','Bitte einen vorgegebenen Fotobereich wählen.');
          if(photoJobs.size>=2||photoJobs.has(draft.id))fail(409,'photo_busy','Eine Fotoprüfung läuft bereits. Bitte kurz warten.');
          photoJobs.add(draft.id);try{const photo=await prepareCustomerPhoto(data.bytes);if(customerDrafts.get(draft.id,token).revision!==data.expectedRevision)fail(409,'stale_customer_draft','Entwurf inzwischen geändert. Bitte neu laden.');
            // Ü5.1/Ü5.2: Ampel nach Upload aus Fotobereich in mm und Pixelmaß; Hinweis als Text, nie eine Sperre.
            const placement=photoPlacement({w:photoField.widthMm,h:photoField.heightMm},{width:photo.width,height:photo.height}),effectiveDpi=Math.floor(Math.min(photo.width/placement.w,photo.height/placement.h)*25.4),note=photoResolutionNote(effectiveDpi,resolutionTargetDpi(photoRecord.metadata?.productionProfile));
            return json(res,201,{...customerDrafts.addPhoto(draft.id,token,photo),photoResolution:{grade:note.grade,effectiveDpi:note.effectiveDpi,targetDpi:note.targetDpi},hint:note.hint});}finally{photoJobs.delete(draft.id);}
        }
        if(action==='preview'&&method==='POST')return json(res,200,customerResult(draft,token,data.state,data.fitText===true));
        if(!action&&method==='PATCH'){const checked=customerResult(draft,token,data.state,data.fitText===true);const saved=customerDrafts.save(draft.id,token,checked.draft.state,data.expectedRevision);return json(res,200,customerResult(saved,token));}
        fail(405,'method_not_allowed','Aktion nicht unterstützt.');
      }
      if(pathname==='/api/workshop/form-materials'&&method==='GET')return json(res,200,{materials:FORM_MATERIALS});
      if(pathname==='/api/workshop/form-motifs'&&method==='GET')return json(res,200,{motifs:formMotifs()});
      if(pathname==='/api/workshop/families'){
        if(method==='GET')return json(res,200,{families:families.list(),bundled:bundledFamilies.map(({id,name})=>({id,name})),layouts:families.layouts()});
        if(method==='POST'){
          const data=await body(req,4*1024*1024),keys=Object.keys(data).join(',');
          if(keys==='bundled'){const source=bundledFamilies.find(f=>f.id===data.bundled);if(!source)fail(404,'family_source_missing','Diese Stammdaten sind nicht vorhanden.');return json(res,201,families.create(source.load()));}
          if(keys!=='document')fail(422,'family_invalid','Familiendaten oder vorhandene Stammdaten angeben.');
          return json(res,201,families.create(data.document));
        }
      }
      const familyMatch=pathname.match(/^\/api\/workshop\/families\/([A-Za-z0-9][A-Za-z0-9_.:-]{0,79})(?:\/(history|products|briefing|sync|template\/([A-Za-z0-9][A-Za-z0-9_.:-]{0,79})))?$/);
      if(familyMatch){
        const [,familyId,action,sizeKey]=familyMatch;
        if(!action&&method==='GET')return json(res,200,families.get(familyId,{revision:revision(url.searchParams.get('revision'))}));
        if(!action&&method==='PATCH'){const data=await body(req,4*1024*1024);if(Object.keys(data).sort().join(',')!=='document,expectedRevision')fail(422,'family_invalid','Familie und erwarteten Stand angeben.');return json(res,200,families.save(familyId,data.document,data.expectedRevision));}
        if(action==='history'&&method==='GET')return json(res,200,{history:families.history(familyId)});
        if(action==='products'&&method==='POST'){const data=await body(req,65536);if(Object.keys(data).some(k=>!['expectedRevision','sizeKeys'].includes(k))||(data.sizeKeys!==undefined&&(!Array.isArray(data.sizeKeys)||!data.sizeKeys.length||data.sizeKeys.length>500)))fail(422,'family_invalid','Größenauswahl prüfen.');return json(res,200,families.generate(familyId,data));}
        if(action==='sync'&&method==='GET')return json(res,200,families.planSync(familyId));
        if(action==='sync'&&method==='POST'){const data=await body(req,4096);if(Object.keys(data).sort().join(',')!=='expectedRevision,token')fail(422,'family_invalid','Vorschau-Schlüssel und Familienstand angeben.');return json(res,200,families.applySync(familyId,data));}
        if(action==='briefing'&&method==='POST'){const bytes=await families.briefing(familyId);return res.writeHead(200,{'Content-Type':'application/zip','Content-Length':bytes.length,'Content-Disposition':'attachment; filename="Briefing-'+familyId+'.zip"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);}
        if(sizeKey&&method==='GET'){const bytes=Buffer.from(families.template(familyId,sizeKey));return res.writeHead(200,{'Content-Type':'image/svg+xml; charset=utf-8','Content-Length':bytes.length,'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'",'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);}
        fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      }
      if(pathname==='/api/workshop/font-library'){
        if(method==='POST'){
          const imported=await fonts.import(await body(req,Math.ceil(MAX_FONT_BYTES/3)*4+4096));
          Object.assign(formFonts,fonts.resources());profiles.registerFonts(fonts.list());
          return json(res,201,imported);
        }
        if(method==='GET'){
          const id=url.searchParams.get('id');
          if(id){if(!Object.hasOwn(formFonts,id))fail(404,'font_missing','Schrift nicht gefunden.');return json(res,200,{id,font:formFonts[id]});}
          const names=new Map(fonts.list().map(row=>[row.id,row.name]));
          return json(res,200,{fonts:Object.entries(formFonts).map(([id,font])=>({id,name:names.get(id)||id,bold:Boolean(font.bold)}))});
        }
      }
      if(pathname==='/api/workshop/form-fonts' &&method==='GET')return json(res,200,{fonts:Object.entries(formFonts).map(([id,f])=>({id,bold:Boolean(f.bold)}))});
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
          const svg=contours.preview(document.form.contourId).toString(),surface=materialPreview(document),overlay=formDesignOverlay(document,formFonts,url.searchParams.get('designId')||document.defaultDesignId,{sourceHref:id=>'data:image/svg+xml;base64,'+assets.read(id).toString('base64')});
          return json(res,200,{svg,designSvg:overlay?svg.replace('</svg>',overlay+'</svg>'):null,materialPreview:{...surface,svg:surface.svg?composeMaterialPreview(surface.svg,overlay):null},geometry:document.form.geometry,readiness:formReadiness(document),revision:record.revision});
        }
        const bytes=await formContourPdf(document,record);
        res.writeHead(200,{'Content-Type':'application/pdf','Content-Length':bytes.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`attachment; filename="${downloadPrefix}-Kontur-${record.id}-v${record.revision}.pdf"`}).end(bytes);return;
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
          ...(original?{'Content-Disposition':`attachment; filename="${downloadPrefix}-Kontur-${record.sourceSha256.slice(0,12)}.${record.format}"`}:{})}).end(bytes);return;
      }
      if(pathname==='/api/workshop/design-assets/import'&&method==='POST'){
        const data=await body(req,Math.ceil(MAX_DESIGN_BYTES/3)*4+4096);
        return json(res,201,await assets.import({name:data.name,bytes:data.bytes,page:data.page}));
      }
      const editableMatch=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/editable-design$/);
      if(editableMatch&&method==='POST'){
        const data=await body(req,4096),record=repository.get(editableMatch[1]);
        if(record.revision!==data.expectedRevision)fail(409,'stale_revision','Der gespeicherte Stand wurde geändert. Bitte neu laden.');
        if(record.status==='archived')fail(422,'archived_product','Archivierte Produkte können nicht bearbeitet werden.');
        return json(res,200,await prepareEditableDesign(record.document,assets,data.designId));
      }
      if(pathname==='/api/workshop/photo-examples/default'&&method==='POST'){
        await body(req,4096);
        const svg=defaultPhotoSvg();
        return json(res,201,await assets.import({name:'Werkstatt-Musterfoto.svg',bytes:Buffer.from(svg).toString('base64')}));
      }
      if(pathname==='/api/workshop/photo-examples'&&method==='POST'){
        const data=await body(req,Math.ceil(MAX_CUSTOMER_PHOTO/3)*4+4096);
        return json(res,201,await assets.importPhotoExample(data));
      }
      if(pathname==='/api/workshop/material-surfaces'&&method==='POST'){
        const data=await body(req,Math.ceil(MAX_CUSTOMER_PHOTO/3)*4+4096);
        return json(res,201,await assets.importMaterialSurface(data.bytes));
      }
      const assetMatch=pathname.match(/^\/api\/workshop\/design-assets\/([a-f0-9]{64})\/(preview\.svg|original)$/);
      const surfaceMatch=pathname.match(/^\/api\/workshop\/material-surfaces\/([a-f0-9]{64})\.png$/);
      if(surfaceMatch&&method==='GET'){
        const bytes=assets.materialSurface(surfaceMatch[1]);
        return res.writeHead(200,{'Content-Type':'image/png','Content-Length':bytes.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).end(bytes);
      }
      if(assetMatch&&method==='GET'){
        const asset=assets.get(assetMatch[1]),original=assetMatch[2]==='original',bytes=assets.read(asset.assetId,original);
        res.writeHead(200,{'Content-Type':original?(asset.format==='pdf'?'application/pdf':'image/svg+xml'):'image/svg+xml',
          'Content-Length':bytes.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
          'Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'none'; sandbox",
          ...(original?{'Content-Disposition':`attachment; filename="${downloadPrefix}-Original-${asset.sourceSha256.slice(0,12)}.${asset.format}"`}:{})}).end(bytes);return;
      }
      const editorMatch=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/editor-preview$/);
      if(editorMatch&&method==='POST'){
        const data=await body(req,16*1024*1024),record=repository.get(editorMatch[1]);
        if(data.expectedRevision!==record.revision)fail(409,'stale_revision','Der gespeicherte Stand wurde geändert. Bitte zuerst den Konflikt klären.');
        return json(res,200,{...editorPreview(data.document,data.designId,data.options),revision:record.revision});
      }
      const cardMatch=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/preview\.svg$/);
      if(cardMatch&&method==='GET'){
        const formRecord=repository.get(cardMatch[1],{revision:revision(url.searchParams.get('revision'))});
        if(isFormProduct(formRecord.document)){verifyForm(formRecord.document);const bytes=Buffer.from(formProductPreview(formRecord.document,{assets,fonts:formFonts,contours,designId:url.searchParams.get('designId')||formRecord.document.defaultDesignId}));res.writeHead(200,{'Content-Type':'image/svg+xml','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src data:; sandbox"}).end(bytes);return;}
        const m=model(cardMatch[1],url.searchParams.get('revision')),examples=(m.universal.localResources.photoExamples||[]).map(e=>({...e,url:'data:image/svg+xml;base64,'+assets.read(e.assetId).toString('base64')}));
        const bytes=Buffer.from(privateProductPreview(m,{designId:url.searchParams.get('designId'),examples,...(url.searchParams.get('layout')==='card'?{layout:'card',options:overviewOptions(m.universal)}:{})}));
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
        if(action==='apply'&&data.editable!==true)return json(res,200,applyDesignImport(repository,assets,id,data));
        const record=repository.get(id);
        if(record.revision!==data.expectedRevision)fail(409,'stale_revision','Die Konfiguration wurde geändert. Bitte den aktuellen Stand laden.');
        if(record.status==='archived'||!record.document.config.profile.designs.some(d=>d.id===data.designId))fail(422,'invalid_import_target','Bitte ein aktives Design dieser Konfiguration auswählen.');
        const asset=data.assetId?assets.get(data.assetId):await assets.import({name:data.name,bytes:data.bytes,page:data.page});
        let {document,...plan}=planDesignImport(repository,assets,id,{...data,assetId:asset.assetId,originalName:action==='apply'?data.originalName:data.name});
        if(data.editable===true){
          const prepared=await prepareEditableDesign(document,assets,data.designId);document=prepared.document;
          plan={...plan,editable:true,editableFields:prepared.parts.length,parts:prepared.parts,warnings:prepared.warnings,token:sha256(JSON.stringify({originalToken:plan.token,document}))};
          if(action==='apply'){
            if(plan.token!==data.token)fail(409,'review_changed','Die aufbereitete Vorschau wurde geändert. Bitte erneut prüfen.');
            return json(res,200,repository.save(id,document,data.expectedRevision));
          }
          const universal=embedMaterialSurface(structuredClone(document.config));
          const examples=(universal.localResources.photoExamples||[]).map(e=>({...e,url:'data:image/svg+xml;base64,'+assets.read(e.assetId).toString('base64')}));
          plan.editableSvg=privateProductPreview({universal},{designId:data.designId,examples});
        }
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
        res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${downloadPrefix}-Produktserie.xlsx"`,'Content-Length':bytes.length,'Cache-Control':'no-store'}).end(bytes);return;
      }
      if(pathname==='/api/workshop/profiles'){
        if(method==='GET')return json(res,200,{profiles:profiles.list(),catalog:profiles.catalog(),settings:profiles.settings()});
        if(method==='POST')return json(res,201,profiles.create(await body(req)));
        fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      }
      const profileMatch=pathname.match(/^\/api\/workshop\/profiles\/(prf_[a-f0-9-]+)(?:\/(impact))?$/);
      if(profileMatch){
        if(profileMatch[2]){
          if(method!=='POST')fail(405,'method_not_allowed','Die Profilvorschau benötigt POST.');
          const data=await body(req);return json(res,200,profileChangeImpact(repository,profiles,profileMatch[1],data.document,data.expectedRevision));
        }
        if(method==='GET')return json(res,200,profiles.get(profileMatch[1]));
        if(method==='PATCH'){const data=await body(req);return json(res,200,saveReviewedProfile(repository,profiles,profileMatch[1],data));}
        fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      }
      if(pathname==='/api/workshop/profile-settings'&&method==='POST'){
        const data=await body(req);
        if(Object.hasOwn(data,'categoryId')&&(typeof data.categoryId!=='string'||!data.categoryId.trim()))fail(422,'category_required','Bitte eine Kategorie-ID angeben.');
        return json(res,200,saveReviewedAssignment(repository,profiles,data));
      }
      if(pathname==='/api/workshop/profile-settings/impact'&&method==='POST')return json(res,200,assignmentChangeImpact(repository,profiles,await body(req)));
      if(pathname==='/api/workshop/batch/export'&&method==='POST'){
        const bytes=await designWorkbook(designExportData(repository,await body(req)));
        res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${downloadPrefix}-Designzuordnungen.xlsx"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);return;
      }
      if(pathname==='/api/workshop/batch/jobs'){
        if(method==='GET')return json(res,200,{jobs:batchJobs.list()});
        if(method==='POST')return json(res,201,batchJobs.create(await body(req)));
        fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      }
      const batchJobMatch=pathname.match(/^\/api\/workshop\/batch\/jobs\/(imp_[a-f0-9-]{36})(\/remove)?$/);
      if(batchJobMatch){
        if(!batchJobMatch[2]&&method==='GET')return json(res,200,batchJobs.review(batchJobMatch[1]));
        if(batchJobMatch[2]&&method==='POST'){
          if(Object.keys(await body(req)).length)fail(422,'batch_job','Entfernen benötigt keine zusätzlichen Daten.');
          return json(res,200,batchJobs.remove(batchJobMatch[1]));
        }
        fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      }
      if(pathname==='/api/workshop/batch/plan'&&method==='POST'){
        const {entries,...plan}=planBatch(repository,await body(req),assets);return json(res,200,plan);
      }
      if(pathname==='/api/workshop/batch/report'&&method==='POST'){
        const data=batchReportData(repository,await body(req),assets),bytes=await batchReportWorkbook(data);
        const filename=data.mode==='errors'?`${downloadPrefix}-Fehlerkorrektur.xlsx`:`${downloadPrefix}-Pruefbericht.xlsx`;
        res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).end(bytes);return;
      }
      if(pathname==='/api/workshop/batch/commit'&&method==='POST')return json(res,200,commitBatch(repository,await body(req),assets));
      if(pathname==='/api/workshop/products'){
        if(method==='GET'){
          if(url.searchParams.get('catalog')==='1'){const catalog=repository.catalog(Object.fromEntries(['query','kind','filter','material','category','sort','page','pageSize'].filter(k=>url.searchParams.has(k)).map(k=>[k,['page','pageSize'].includes(k)?Number(url.searchParams.get(k)):url.searchParams.get(k)])));return json(res,200,{...catalog,categoryLabels:labelCategories([...catalog.facets.categories.map(c=>c.id),...catalog.products.flatMap(p=>p.categoryIds)])});}
          const products=repository.list({query:url.searchParams.get('query')||'',includeArchived:url.searchParams.get('includeArchived')==='1'}).map(({document,...item})=>({...item,overview:isFormProduct(document)?formOverview(document):productOverview(document)}));
          return json(res,200,{products});
        }
        if(method==='POST'){const data=await body(req,16*1024*1024);return json(res,201,repository.create(data.document));}
        fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
      }
      const designStatus=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)\/design-status$/);
      if(designStatus&&method==='GET'){
       const record=repository.get(designStatus[1],{revision:revision(url.searchParams.get('revision'))}),designId=url.searchParams.get('design')||record.document.defaultDesignId;
       if(!record.document.designs?.some(d=>d.id===designId))fail(404,'design_missing','Design nicht gefunden.');
       const status=designPublicationStatus({record,head:repository.get(record.id),designId,bindings:orderIntake.bindings(),transfers:customerDrafts.shopDraftTransfers.completed()});
       const group=url.searchParams.get('group')||variants.list().find(g=>g.document.variants.some(v=>v.productId===record.id))?.id;
       if(group&&acrylShop.enabled){const live=await acrylShop.status(group);status.shopify={...status.shopify,linked:Boolean(live.product),liveVerified:live.verified,online:live.product?.status==='ACTIVE'&&Boolean(live.product.onlineStoreUrl),label:live.product?'Shopify-Artikel verbunden':'Noch kein Shopify-Artikel'};status.trafficLight=acrylDesignTrafficLight(live,designId);status.saveEffect='shared-correction-only';status.publishReason=live.error||live.publishReason;status.shopify.adminUrl=live.product?.adminUrl;}
       return json(res,200,status);
      }
      const match=pathname.match(/^\/api\/workshop\/products\/(cfg_[a-f0-9-]+)(?:\/(copy|archive|publish|revisions|compare|restore|resolve|validate-design|shop-preparation|shop-bindings))?$/);
      if(!match)fail(404,'not_found','Werkstattfunktion nicht gefunden.');
      const [,id,action]=match;
      if(method==='GET'){
        if(!action)return json(res,200,repository.get(id,{revision:revision(url.searchParams.get('revision'))}));
        if(action==='shop-preparation')return json(res,200,prepareShopProduct(repository.get(id,{revision:revision(url.searchParams.get('revision'))})));
        if(action==='compare')return json(res,200,compareProductRevisions(repository,id,revision(url.searchParams.get('from')),revision(url.searchParams.get('to'))));
        if(action==='revisions')return json(res,200,{revisions:repository.history(id).map(({document,...record})=>({...record,createdAt:record.updatedAt,name:document.name}))});
        fail(405,'method_not_allowed','Diese Aktion benötigt eine Eingabe.');
      }
      // Native documents carry their pinned vector fonts and source images.
      // Saving uses the same bounded allowance as creation and editor preview.
      const data=await body(req,!action&&method==='PATCH'?16*1024*1024:2*1024*1024);
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
        const result=validateProductDesign(record.document,data.design,{options:data.options,...workshopResources(record.document.config.localResources),fonts:{...formFonts,...record.document.config.localResources.fonts}});
        return json(res,200,{valid:true,id,revision:record.revision,result});
      }
      fail(405,'method_not_allowed','Diese Aktion wird nicht unterstützt.');
    }catch(error){
      const status=error.status||(error.code?.startsWith('SQLITE')?500:422);
      if(!res.headersSent)json(res,status,{error:{code:error.code||'invalid_product',message:status===500?'Speichern ist momentan nicht möglich.':error.message,actualRevision:error.actualRevision}});
    }
  }
  return {tenantId,catalogStructure,acrylShop,corrections,families,sessionContext:shopifySessions?Object.freeze({mode:shopifySessions.mode,shopDomain:shopifySessions.shopDomain,clientId:shopifySessions.clientId}):null,repository,aiJobs,aiBatches,variants,batchJobs,variantBatchJobs,profiles,productionProfiles,assets,fonts,contours,customerDrafts,exportJobs,exportWorker,orderIntake,handle,model:customerModelFor,internalModel:model,pausedPage,labelCategories,konfis,defaultId,close:()=>{catalogStructure.close();acrylShop.close();corrections.close();konfis.close();families.close();aiBatches.close();aiJobs.close();variantBatchJobs.close();batchJobs.close();exportWorker.close();exportJobs.close();variants.close();repository.close();profiles.close();productionProfiles.close();assets.close();fonts.close();contours.close();customerDrafts.close();}};
}

/** Loopback preview; optional test session gate is not a public deployment.
 *  K13: Der Mandant wird je Anfrage einmal bestimmt (tenant.mjs) und die Anfrage an die Werkstatt genau dieses
 *  Mandanten gegeben. Der Standardmandant (gravuru) bekommt die übergebene Konfiguration; weitere Mandanten nur
 *  mit eigener, bestätigter Shop-Anbindung aus `tenantOptions(tenant, settings)` – sonst 503. Die Eigenschaften
 *  des Rückgabewerts (repository, orderIntake, …) sind die Stores des Standardmandanten. */
export function createWorkshop(options){
  const {filename,tenantOptions=null,tenantSettings=null}=options;
  checkSessionOptions(options);
  if(filename!==':memory:')fs.mkdirSync(path.dirname(filename),{recursive:true});
  const registryDb=new DatabaseSync(filename);registryDb.exec('PRAGMA busy_timeout=5000;');
  let tenants,primary;
  try{
    // Shop-Domain des Standardmandanten aus der Laufzeitkonfiguration (nie hartkodiert); lokal ohne Shop: null.
    const shopDomain=options.shopifySessions?.shopDomain??options.appProxy?.shopDomain??options.shopDrafts?.config?.shopDomain??options.orderWebhook?.shopDomain??null;
    tenants=createTenantRegistry({database:registryDb,shopDomain});
    for(const [key,value] of Object.entries(tenantSettings||{}))tenants.setSetting(DEFAULT_TENANT,key,value);
    // B1: Mandantenliste (Plattformsicht) nur in der Werkstatt des Standardmandanten.
    primary=createTenantWorkshop(DEFAULT_TENANT,{...options,tenant:tenants.seed,platformOverview:()=>tenantOverview(registryDb,tenants)});
  }catch(error){registryDb.close();throw error;}
  const others=new Map();
  function workshopFor(tenant){
    if(tenant.id===DEFAULT_TENANT)return primary;
    if(others.has(tenant.id))return others.get(tenant.id);
    const own=typeof tenantOptions==='function'?tenantOptions(tenant,tenants.settings(tenant.id)):null;
    // Ein weiterer Mandant ist nur mit eigener Händlersitzung erreichbar; eine bloße Shop-Domain im Request genügt nie.
    if(!own?.shopifySessions||own.shopifySessions.shopDomain!==tenant.shopDomain)fail(503,'tenant_unverified','Für diesen Mandanten ist keine bestätigte Shop-Anbindung eingerichtet.');
    const {filename:_f,seedConfig:_s,legacy:_l,...rest}=own;
    const workshop=createTenantWorkshop(tenant.id,{filename,seedConfig:options.seedConfig,legacy:options.legacy,designConverter:options.designConverter,contourConverter:options.contourConverter,...rest,tenant});
    others.set(tenant.id,workshop);return workshop;
  }
  async function handle(req,res,url){
    let target;
    try{target=workshopFor(tenantFromRequest(req,url,{tenants}));}
    catch(error){const status=error.status||503;if(!res.headersSent)json(res,status,{error:{code:error.code||'tenant_unknown',message:error.message}});return;}
    return target.handle(req,res,url);
  }
  return {...primary,handle,tenants,forTenant:id=>workshopFor(tenants.require(id)),
    close:()=>{for(const w of others.values())w.close();primary.close();registryDb.close();}};
}

