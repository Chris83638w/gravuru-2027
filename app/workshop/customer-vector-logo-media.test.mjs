import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {makeProductDocument} from './product-model.mjs';
import {customerVectorLogoPreview,verifyCustomerVectorLogoMedia,verifiedAccountVectorLogo,customerVectorLogoFragment} from './customer-vector-logo-media.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {createCustomerDraftStore} from './customer-draft-store.mjs';
import {loadCartRevision,loadCartRevisionPhoto} from './cart-edit-revision.mjs';
import {createWorkshop} from './http.mjs';
import {productionSummary} from './production-summary.mjs';
import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {saveDraft} from '../configurator/variant-m/contract.mjs';
import {appProxySignature} from './shopify-app-proxy.mjs';
import {asAcrylicUploadFamily} from './test-fixtures/acrylic-upload-source.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
const ORIGINAL=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect x="1" y="1" width="18" height="18" fill="red"/><rect x="10" y="1" width="18" height="18" fill="blue"/><circle cx="10" cy="10" r="2" fill="white"/></svg>');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');
const preparePhoto=async()=>({original:PNG,preview:PNG,width:1,height:1});
function fixture(material='steel'){
 const c=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));delete c.acrylic;
 const p=c.profile;p.material={kind:'steel',color:'#a0a0a0',thicknessMm:1.5};p.processing={profileId:'steel-engraving'};
 p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[{x:7,y:70,diameter:4}]};
 const text=structuredClone(p.designs[0].objects.find(o=>o.type==='text'));Object.assign(text,{id:'name',text:'Synthetic',size:5,x:110,y:30,w:30,h:8,rotation:0,acrylicFixed:false});
 p.designs=[{id:'test',name:'Synthetic',objects:[text]}];p.defaultDesignId='test';
 p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[{id:'none',label:'Ohne',priceCents:0,currency:'EUR',holes:p.geometry.holes}]}];
 c.basePriceCents=2299;c.extraMotifCents=169;c.photo={enabled:false,mode:'upload-only',includedCount:0,extraPriceCents:999};c.logo={enabled:true,vectorUpload:true,extraPriceCents:1299};
 c.localResources.photoExamples=[];c.localResources.photoPlaceholders=[];
 if(material==='acrylic')asAcrylicUploadFamily(c);
 const document=makeProductDocument(c),config=document.config,record={id:config.profile.id,revision:2,status:'draft',document};
 return {record,config};
}
async function inputFor(f){
 const preview=await customerVectorLogoPreview(f.config,{name:'logo.svg',original:ORIGINAL.toString('base64')});
 const vectorLogo={version:preview.version,sourceSha256:preview.sourceSha256,outputSha256:preview.outputSha256};
 const object={id:'own-logo',type:'image',x:115,y:85,w:60,h:40,rotation:15,customerEditable:true,uxPersonal:true,uxUploadId:'up-logo',uxUploadKind:'logo',uxVectorLogo:vectorLogo};
 const media={id:'up-logo',name:'logo.svg',original:ORIGINAL.toString('base64'),edited:preview.svg,vectorLogo};
 return {object,media,preview,input:{productId:f.record.id,productRevision:f.record.revision,designId:'test',objects:[...structuredClone(f.config.profile.designs[0].objects),object],options:{mounting:'none'},quantity:1,media:[media],preview:PNG.toString('base64')}};
}

test('server preview accepts only an explicitly enabled steel revision and returns two passive SVG views',async()=>{
 const f=fixture(),{preview}=await inputFor(f);
 assert.match(Buffer.from(preview.preview,'base64').toString(),/fill="#ff0000"/);
 assert.match(Buffer.from(preview.svg,'base64').toString(),/fill="#000000"/);
 assert.doesNotMatch(Buffer.from(preview.svg,'base64').toString(),/<image|script|href|<defs/);
 const old=structuredClone(f.config);delete old.logo.vectorUpload;
 await assert.rejects(()=>customerVectorLogoPreview(old,{name:'logo.svg',original:ORIGINAL.toString('base64')}),/Produktstand/);
 await assert.rejects(()=>customerVectorLogoPreview(f.config,{name:'logo.svg',original:ORIGINAL.toString('base64'),priceCents:0}),/nur die SVG/);
});

test('acrylic simultaneous photo and checked SVG survive native snapshot and artwork with separate charges',async()=>{
 const f=fixture('acrylic'),{input,media}=await inputFor(f);
 input.objects.push({id:'own-photo',type:'photoSlot',x:45,y:90,w:20,h:20,rotation:0,photoShape:'rect',fieldKey:'photo-own',required:false,customerEditable:true,uxPersonal:true,uxUploadId:'up-photo',uxUploadKind:'photo'});
 input.media.push({id:'up-photo',original:PNG.toString('base64')});
 const bundle=await prepareAcrylicReview({...f,input,assets:{},preparePhoto}),saved=readReviewPackage(bundle.package,bundle.manifest.packageSha256,['gravuru-native-review/v1']);
 assert.equal(bundle.manifest.selection.price.chargedLogos,1);assert.equal(bundle.manifest.selection.price.chargedUploads,1);assert.equal(bundle.manifest.selection.price.unitCents,4597);
 const logoEntry=saved.manifest.photos.find(p=>p.kind==='vector-logo');assert.deepEqual(saved.files.get(logoEntry.edited.path),Buffer.from(media.edited,'base64'));
 assert.equal(saved.manifest.photos.length,2);
 const artwork=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256,{engraving:true});
 assert.match(artwork.svg,/viewBox="0 0 30 20"/);assert.match(artwork.svg,/<image/);assert.equal(artwork.photos.length,1);
 const proof=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'raster',dpi:300,mirror:true});
 assert.equal(proof.pdf.subarray(0,5).toString(),'%PDF-');assert.equal(proof.metadata.photoSources.length,1);assert.equal(proof.metadata.settings.mirror,true);assert.equal(proof.metadata.productionReady,false);
 const forged=structuredClone(input);forged.media[0].edited=Buffer.from('<svg/>').toString('base64');await assert.rejects(()=>prepareAcrylicReview({...f,input:forged,assets:{},preparePhoto}),/Logo|SVG/);
});

test('text-on-top survives immutable saving and production while historical packages retain their order',async()=>{
 const f=fixture(),{input}=await inputFor(f);
 for(const textOnTop of [undefined,true]){
  const bundle=await prepareAcrylicReview({...f,input:{...input,...(textOnTop?{textOnTop}:{})},assets:{},preparePhoto});
  const saved=readReviewPackage(bundle.package,bundle.manifest.packageSha256,['gravuru-native-review/v1']);
  const design=JSON.parse(saved.files.get('produkt-und-gestaltung.json')).state.design;
  assert.equal(design.textOnTop,textOnTop);
  assert.deepEqual(design.objects.map(o=>o.id),input.objects.map(o=>o.id));
  const artwork=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256,{engraving:true});
  assert.deepEqual([...artwork.svg.matchAll(/data-field="([^"]+)"/g)].map(m=>m[1]),textOnTop?['native-1','native-0']:['native-0','native-1']);
 }
 await assert.rejects(()=>prepareAcrylicReview({...f,input:{...input,textOnTop:'yes'},assets:{},preparePhoto}),/Textebenen/);
});

test('immutable review, production and cart restore preserve approved vector bytes, placement, original and drilling',async()=>{
 const f=fixture(),{input,media,object}=await inputFor(f);
 const bundle=await prepareAcrylicReview({...f,input,assets:{},preparePhoto}),saved=readReviewPackage(bundle.package,bundle.manifest.packageSha256,['gravuru-native-review/v1']),entry=saved.manifest.photos[0];
 assert.equal(entry.kind,'vector-logo');assert.deepEqual(saved.files.get(entry.path),ORIGINAL);assert.deepEqual(saved.files.get(entry.edited.path),Buffer.from(media.edited,'base64'));
 assert.equal(bundle.manifest.photoResolution.length,0);assert.equal(bundle.manifest.selection.price.chargedLogos,1);assert.equal(bundle.manifest.selection.price.unitCents,3598);
 const artwork=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256,{engraving:true});
 assert.doesNotMatch(artwork.svg,/<image|data:image|data-photo-pan/);assert.match(artwork.svg,/translate\(115 85\) rotate\(15\)/);assert.match(artwork.svg,/viewBox="0 0 30 20"/);
 assert.equal(artwork.photos.length,0);assert.equal(artwork.geometry.holeCount,1);assert.equal(artwork.geometry.widthMm,220);assert.equal(artwork.geometry.heightMm,140);
 const summary=productionSummary({files:saved.files,manifest:bundle.manifest,metadata:{settings:{dpi:300},sourcePackageSha256:bundle.manifest.packageSha256}});
 assert.equal(summary.photos[0].kind,'vector-logo');assert.equal(summary.photos[0].status,'vektor');assert.equal(summary.photos[0].targetDpi,null);assert.equal(summary.photos[0].detailCheck,'manual-required');assert.equal(entry.detailCheck,'manual-required');assert.doesNotMatch(summary.photos[0].note,/Auflösung/);
 assert.throws(()=>customerVectorLogoFragment({...entry,vectorLogo:{...entry.vectorLogo,outputSha256:'0'.repeat(64)}},object,saved.files),/vollständig/);
 const configId='konfig_11111111-1111-4111-8111-111111111111',draft={id:'adraft_22222222-2222-4222-8222-222222222222',productId:f.record.id,productRevision:2,designId:'test',revision:1};
 const revision={snapshotId:bundle.manifest.id,draftId:draft.id,draftRevision:1,rev:1,lineId:'synthetic'},drafts={cartConfigurations:{revision:()=>revision,latest:()=>revision},acrylicDrafts:{get:(_id,token)=>{assert.equal(token,'private');return draft;}},review:()=>({manifest:bundle.manifest}),downloadSnapshot:()=>bundle.package};
 const args={drafts,configId,rev:1,draftToken:'private',repository:{get:()=>f.record}},restored=loadCartRevision(args);
 assert.deepEqual(restored.photos[0].vectorLogo,media.vectorLogo);assert.equal(restored.photos[0].mime,'image/svg+xml');assert.deepEqual(restored.document.design.objects.find(o=>o.id===object.id),object);
 assert.deepEqual(loadCartRevisionPhoto({...args,uploadId:'up-logo'}).bytes,ORIGINAL);assert.deepEqual(loadCartRevisionPhoto({...args,uploadId:'up-logo',edited:true}).bytes,Buffer.from(media.edited,'base64'));
});

test('complete production PDF remains vector and the production archive keeps both immutable SVG versions',async()=>{
 const f=fixture(),{input,media}=await inputFor(f),bundle=await prepareAcrylicReview({...f,input,assets:{},preparePhoto}),entry=bundle.manifest.photos[0];
 const proof=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'vector'});
 assert.equal(proof.pdf.subarray(0,5).toString(),'%PDF-');assert.equal(proof.metadata.settings.mode,'vector');assert.deepEqual(proof.metadata.photoSources,[]);
 const production=readReviewPackage(proof.archive,digest(proof.archive),['gravuru-native-review/v1']);
 assert.deepEqual(production.files.get(entry.path),ORIGINAL);assert.deepEqual(production.files.get(entry.edited.path),Buffer.from(media.edited,'base64'));
 assert.doesNotMatch(production.files.get('gesicherte-gravurgestaltung.svg').toString(),/<image|data:image/);
});

test('snapshot re-runs conversion and rejects changed source, changed black SVG, forged approval or mismatched media',async()=>{
 const f=fixture(),{object,media,input}=await inputFor(f);
 for(const bad of [{...media,original:Buffer.from('<svg/>').toString('base64')},{...media,edited:Buffer.from('<svg/>').toString('base64')},{...media,vectorLogo:{...media.vectorLogo,outputSha256:'0'.repeat(64)}},{...media,edited:undefined}])await assert.rejects(()=>verifyCustomerVectorLogoMedia(f.config,object,bad),/SVG|Logo|Vorschau/);
 const swapped=structuredClone(input);swapped.objects.find(o=>o.id===object.id).uxUploadKind='photo';
 await assert.rejects(()=>prepareAcrylicReview({...f,input:swapped,assets:{},preparePhoto}),e=>e.status===422&&/Medienrevision/.test(e.message));
 const missing=structuredClone(input);delete missing.media[0].vectorLogo;
 await assert.rejects(()=>prepareAcrylicReview({...f,input:missing,assets:{},preparePhoto}),/Logo/);
 const falseSvg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><path fill="#000000" d="M0 0H30V20H0Z"/></svg>');
 const forged={...media,edited:falseSvg.toString('base64'),vectorLogo:{...media.vectorLogo,outputSha256:digest(falseSvg)}};
 await assert.rejects(()=>verifyCustomerVectorLogoMedia(f.config,{...object,uxVectorLogo:forged.vectorLogo},forged),/schwarze Logo-Fassung/);
});

test('account store accepts only sealed server conversion and restores SVG MIME plus approval without a database migration',async t=>{
 const f=fixture(),{object,media}=await inputFor(f),result=await verifyCustomerVectorLogoMedia(f.config,object,media),db=new DatabaseSync(':memory:');t.after(()=>db.close());
 const store=createCustomerDraftStore({database:db}),owner={shopDomain:'synthetic.myshopify.com',customerId:'gid://shopify/Customer/1'};
 const photo={uploadId:object.uxUploadId,kind:'logo',name:'logo.svg',mime:'image/svg+xml',original:ORIGINAL,edited:result.svg,vectorLogo:result.vectorLogo};
 const input={productId:'cfg_synthetic',profileRevision:'cfg_synthetic:2',title:'Vektorlogo',draft:{design:{objects:[object]}},photos:[photo]};
 assert.throws(()=>store.create(owner,input),/serverseitig/);
 input.photos=[verifiedAccountVectorLogo(photo,result)];const created=store.create(owner,input),loaded=store.get(owner,created.id);
 assert.deepEqual(loaded.photos[0].vectorLogo,media.vectorLogo);assert.deepEqual(store.photo(owner,created.id,object.uxUploadId),{mime:'image/svg+xml',bytes:ORIGINAL});
 assert.deepEqual(store.photo(owner,created.id,object.uxUploadId,'edited'),{mime:'image/svg+xml',bytes:result.svg});
 assert.throws(()=>store.get({...owner,customerId:'gid://shopify/Customer/2'},created.id),e=>e.status===404);
 input.photos[0].edited=Buffer.from('<svg/>');assert.throws(()=>store.save(owner,created.id,input),/serverseitig/);
});

test('a historical raster-logo revision keeps its raster snapshot and photo tariff',async()=>{
 const f=fixture();f.config.logo={enabled:true};f.record.document.config.logo={enabled:true};
 const object={id:'old-logo',type:'image',x:110,y:85,w:30,h:30,rotation:0,uxUploadId:'old-raster',uxUploadKind:'logo'};
 const input={productId:f.record.id,productRevision:f.record.revision,designId:'test',objects:[...f.config.profile.designs[0].objects,object],options:{mounting:'none'},quantity:1,media:[{id:'old-raster',original:PNG.toString('base64')}],preview:PNG.toString('base64')};
 const bundle=await prepareAcrylicReview({...f,input,assets:{},preparePhoto});
 assert.equal(bundle.manifest.photos[0].path,'fotos/1-original.png');assert.equal(bundle.manifest.photos[0].kind,undefined);assert.equal(bundle.manifest.photoResolution.length,1);
 assert.equal(bundle.manifest.selection.price.chargedUploads,1);assert.equal(bundle.manifest.selection.price.unitCents,3298);
});

test('workshop logo preview requires the existing CSRF session and pinned product revision',async t=>{
 const f=fixture(),w=createWorkshop({filename:':memory:',seedConfig:f.config,legacy:{purchasing:{}}}),record=w.repository.get(w.defaultId);
 const server=http.createServer((req,res)=>w.handle(req,res,new URL(req.url,'http://127.0.0.1')));server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));w.close();});
 const base='http://127.0.0.1:'+server.address().port,{csrfToken}=await(await fetch(base+'/api/workshop/session')).json();
 const input={productId:record.id,productRevision:record.revision,name:'logo.svg',original:ORIGINAL.toString('base64')};
 const post=(value,token=csrfToken)=>fetch(base+'/api/workshop/customer-vector-logo/preview',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':token},body:JSON.stringify(value)});
 assert.equal((await post(input,'')).status,403);assert.equal((await post({...input,productRevision:undefined})).status,422);
 const response=await post(input);assert.equal(response.status,200,await response.clone().text());assert.match((await response.json()).outputSha256,/^[a-f0-9]{64}$/);
});

test('signed account route verifies SVG before storage and bounds duplicate-media work before conversion',async t=>{
 const f=fixture(),secret='synthetic-proxy-logo-test-secret',shopDomain='synthetic.myshopify.com';
 const w=createWorkshop({filename:':memory:',seedConfig:f.config,legacy:{purchasing:{}},appProxy:{shopDomain,secret}}),record=w.repository.get(w.defaultId),config=w.model(record.id,record.revision).universal;
 const server=http.createServer((req,res)=>w.handle(req,res,new URL(req.url,'http://127.0.0.1')));server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));w.close();});
 const base='http://127.0.0.1:'+server.address().port,query=new URLSearchParams({shop:shopDomain,path_prefix:'/apps/gravuru',timestamp:String(Math.floor(Date.now()/1000)),logged_in_customer_id:'1'});query.set('signature',appProxySignature(query,secret));
 const {object,media}=await inputFor({record,config}),draft=saveDraft(config,{designId:'test',objects:[...config.profile.designs[0].objects,object],mOptions:{mounting:'none'}},{mounting:'none'},config.localResources.fonts,config.localResources.motifs,{draft:true});
 const photo={uploadId:object.uxUploadId,kind:'logo',name:'logo.svg',mime:'image/svg+xml',original:media.original,edited:media.edited,vectorLogo:media.vectorLogo},payload={title:'SVG-Test',draft,photos:[photo]};
 const post=value=>fetch(base+'/api/workshop/account-drafts?'+query,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
 const duplicate=await post({...payload,photos:[{...photo,original:'bad'},{...photo,original:'bad'}]});assert.equal(duplicate.status,422);assert.match((await duplicate.json()).error.message,/eindeutig/);
 const oversized=await post({...payload,photos:Array.from({length:5},()=>({...photo,original:'bad'}))});assert.equal(oversized.status,422);assert.match((await oversized.json()).error.message,/vier/);
 const created=await post(payload);assert.equal(created.status,201,await created.clone().text());const {draft:saved}=await created.json();
 const loaded=await(await fetch(base+'/api/workshop/account-drafts/'+saved.id+'?'+query)).json();assert.deepEqual(loaded.photos[0].vectorLogo,media.vectorLogo);
 const photoQuery=new URLSearchParams(query);photoQuery.delete('signature');photoQuery.set('variant','edited');photoQuery.set('signature',appProxySignature(photoQuery,secret));
 const downloaded=await fetch(base+'/api/workshop/account-drafts/'+saved.id+'/photos/'+object.uxUploadId+'?'+photoQuery);
 assert.equal(downloaded.headers.get('content-type'),'image/svg+xml');assert.equal(downloaded.headers.get('content-disposition'),'attachment');assert.equal(downloaded.headers.get('content-security-policy'),"default-src 'none'; sandbox");assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),Buffer.from(media.edited,'base64'));
});
