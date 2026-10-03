import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {studioSvg} from '../platform/sources/app/shared/models/studio-svg.mjs';
import {quote} from '../configurator/variant-m/contract.mjs';
import {photoAvailableForDesign} from '../configurator/variant-m/ux-model.mjs';
import {artworkFragment} from '../configurator/variant-m/artwork-resource.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {makeProductDocument,validateProductDocument,validateProductDesign,resolveProduct} from './product-model.mjs';
import {createProductRepository} from './repository.mjs';
import {createDesignAssetStore,sha256,MAX_DESIGN_BYTES,importEnvironment} from './design-assets.mjs';
import {planDesignImport,applyDesignImport} from './design-import.mjs';
import {createWorkshop} from './http.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
const source=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="80mm" viewBox="0 0 100 80"><defs><linearGradient id="paint"><stop stop-color="#f01426"/><stop offset="1" stop-color="#2548ff" stop-opacity=".4"/></linearGradient></defs><path d="M0 0H100V80H0Z" fill="url(#paint)"/></svg>');
function native(){
  const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
  for(const object of config.profile.designs[0].objects.filter(o=>o.type==='text')){
    measureText(object,resources.fonts);
    if(object.id==='names'){object.size*=118/object.w;measureText(object,resources.fonts);}
  }
  const second=structuredClone(config.profile.designs[0]);second.id+='-second';second.name='Zweites Design';
  config.profile.designs.push(second);
  return config;
}
function setup(t){
  const assets=createDesignAssetStore({filename:':memory:'});
  const repository=createProductRepository({filename:':memory:',validateDocument:document=>assets.validateDocument(validateProductDocument(document))});
  const record=repository.create(makeProductDocument(native(),{name:'Importprüfung',kind:'master'}));
  t.after(()=>{repository.close();assets.close();});
  return {assets,repository,record};
}
async function inputFor(assets,record,bytes=source){
  const asset=await assets.import({name:'Gestaltung.svg',bytes:bytes.toString('base64')});
  return {expectedRevision:record.revision,designId:record.document.config.profile.designs[0].id,assetId:asset.assetId,fit:'visible',originalName:'Gestaltung.svg'};
}
const hasCode=code=>error=>error.code===code;
const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python',process.platform==='win32'?'python.exe':'bin/python3');
const python=process.env.GRAVURU_PYTHON||(fs.existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
const pdfAvailable=spawnSync(python,['-c','import pymupdf; assert callable(pymupdf.open)'],{windowsHide:true,env:importEnvironment()}).status===0;

test('design replacement keeps other design, product identity, variant geometry and all 28 prices',async t=>{
  const {assets,repository,record}=setup(t),before=structuredClone(record),input=await inputFor(assets,record);
  const plan=planDesignImport(repository,assets,record.id,input);
  assert.deepEqual(repository.get(record.id),before,'preview must not save a revision');
  assert.equal(plan.editableFields,0);assert.ok(plan.warnings.some(w=>/festes Design/.test(w)));
  const saved=applyDesignImport(repository,assets,record.id,{...input,token:plan.token});
  assert.equal(saved.id,record.id);assert.equal(saved.revision,2);
  const expected=structuredClone(record.document),actual=saved.document;
  expected.config.profile.designs[0]=structuredClone(actual.config.profile.designs[0]);
  expected.elementRights[input.designId]=structuredClone(actual.elementRights[input.designId]);
  expected.config.localResources.motifs=structuredClone(actual.config.localResources.motifs);
  expected.config.localResources.photoPlaceholders=expected.config.localResources.photoPlaceholders?.filter(item=>item.designId!==input.designId);
  if(expected.config.localResources.photoPlaceholders===undefined)delete expected.config.localResources.photoPlaceholders;
  assert.deepEqual(actual,expected,'only the selected design, its rights and resources may change');
  const artwork=actual.config.profile.designs[0].objects[0];
  assert.equal(artwork.preserveColors,true);assert.equal(artwork.locked,true);assert.equal(artwork.customerEditable,false);
  assert.ok(Object.values(actual.elementRights[input.designId][artwork.id]).every(right=>right===false));
  assert.equal(artwork.w/artwork.h,100/80);
  for(const size of ['small','large'])for(const base of ['none','buche','eiche','nussbaum','klar','satiniert','holz-flach'])for(const wall of ['none','wall']){
    const options={size,base,wall},old=resolveProduct(record.document,{options}),current=resolveProduct(actual,{options});
    assert.deepEqual(current.price,old.price);assert.deepEqual(current.physical,old.physical);
  }
  assert.deepEqual(record,before,'input snapshots remain unchanged');
});

test('portrait and landscape artwork use source-proportional motif viewports in the real renderer',async t=>{
  const {assets,repository,record}=setup(t);
  for(const [width,height] of [[120,40],[40,120]]){
    const bytes=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><path d="M0 0H${width}V${height}H0Z" fill="#ff3000"/></svg>`);
    const input=await inputFor(assets,record,bytes),plan=planDesignImport(repository,assets,record.id,input);
    const config=plan.document.config,design=config.profile.designs[0],object=design.objects[0],motif=assets.resource(input.assetId);
    assert.deepEqual(motif.bounds,[0,0,width,height]);
    assert.equal(motif.svgFragment,artworkFragment(input.assetId,width,height));
    assert.ok(Math.abs(object.w/object.h-width/height)<1e-10);
    const rendered=studioSvg(config.profile,design,config.localResources.fonts,{motifs:config.localResources.motifs,handles:false});
    const viewport=rendered.match(new RegExp(`<svg[^>]*width="([^"]+)" height="([^"]+)" viewBox="0 0 ${width} ${height}"[^>]*preserveAspectRatio="xMidYMid meet"[^>]*>`));
    assert.ok(viewport,'rendered motif viewport must use the actual source aspect ratio');
    assert.ok(Math.abs(Number(viewport[1])/Number(viewport[2])-width/height)<1e-10);
    assert.ok(rendered.includes(artworkFragment(input.assetId,width,height)));
  }
});

test('original source bytes and prior imported resources survive replacement, history and copying',async t=>{
  const {assets,repository,record}=setup(t),firstInput=await inputFor(assets,record),firstPlan=planDesignImport(repository,assets,record.id,firstInput);
  const first=applyDesignImport(repository,assets,record.id,{...firstInput,token:firstPlan.token});
  assert.equal(firstPlan.asset.sourceSha256,sha256(source));assert.deepEqual(assets.read(firstInput.assetId,true),source);
  const duplicate=await assets.import({name:'Anderer Name.svg',bytes:source.toString('base64')});assert.equal(duplicate.assetId,firstInput.assetId);
  const secondSource=Buffer.from(source.toString().replace('#f01426','#10ff22'));
  const secondInput=await inputFor(assets,first,secondSource),secondPlan=planDesignImport(repository,assets,record.id,secondInput);
  const second=applyDesignImport(repository,assets,record.id,{...secondInput,token:secondPlan.token});
  assert.notEqual(firstInput.assetId,secondInput.assetId);
  assert.equal(second.document.config.localResources.motifs.some(item=>item.artwork?.assetId===firstInput.assetId),false);
  const history=repository.get(record.id,{revision:2});
  assert.equal(history.document.config.profile.designs[0].importedSource.assetId,firstInput.assetId);
  assert.deepEqual(assets.read(firstInput.assetId,true),source);assert.deepEqual(assets.read(secondInput.assetId,true),secondSource);
  const copied=repository.copy(record.id,{expectedRevision:3,name:'Kopie',kind:'product'});
  assert.notEqual(copied.id,record.id);assert.equal(copied.document.masterId,record.id);
  assert.deepEqual(copied.document.config.profile.designs,second.document.config.profile.designs);
  assets.validateDocument(copied.document);assets.validateDocument(history.document);
});

test('PDF asset retains entire original while replacing design with explicitly selected vector page',{skip:pdfAvailable?false:'PyMuPDF optional dependency unavailable'},async t=>{
  const {assets,repository,record}=setup(t);
  const generated=spawnSync(python,['-c',`import pymupdf,sys
doc=pymupdf.open()
doc.new_page(width=72,height=144)
page=doc.new_page(width=144,height=72)
page.draw_rect(pymupdf.Rect(1,1,100,50),color=(1,0,0),fill=(0,0,1),fill_opacity=.5)
sys.stdout.buffer.write(doc.tobytes())`],{windowsHide:true,env:importEnvironment()});
  assert.equal(generated.status,0,generated.stderr.toString());
  const asset=await assets.import({name:'Zwei Seiten.pdf',bytes:generated.stdout.toString('base64'),page:2});
  assert.equal(asset.format,'pdf');assert.equal(asset.page,2);assert.equal(asset.pageCount,2);
  assert.equal(asset.widthMm,50.8);assert.equal(asset.heightMm,25.4);
  assert.deepEqual(assets.read(asset.assetId,true),generated.stdout);assert.match(assets.read(asset.assetId).toString(),/<path/);
  const input={expectedRevision:1,designId:record.document.config.profile.designs[0].id,assetId:asset.assetId,fit:'original',originalName:'Zwei Seiten.pdf'};
  const plan=planDesignImport(repository,assets,record.id,input);
  const saved=applyDesignImport(repository,assets,record.id,{...input,token:plan.token});
  assert.equal(saved.document.config.profile.designs[0].objects[0].w,50.8);
  assert.equal(saved.document.config.profile.designs[0].objects[0].h,25.4);
});

test('stale review, tampered confirmation and oversize original fail without mutating product',async t=>{
  const {assets,repository,record}=setup(t),input=await inputFor(assets,record),plan=planDesignImport(repository,assets,record.id,input);
  assert.throws(()=>applyDesignImport(repository,assets,record.id,{...input,token:'0'.repeat(64)}),hasCode('review_changed'));
  assert.throws(()=>applyDesignImport(repository,assets,record.id,{...input,fit:'original',token:plan.token}),hasCode('review_changed'));
  assert.equal(repository.get(record.id).revision,1);
  const oversized=Buffer.from('<svg width="500mm" height="500mm" viewBox="0 0 500 500"><path d="M0 0H500V500Z"/></svg>');
  const hugeInput=await inputFor(assets,record,oversized);
  assert.throws(()=>planDesignImport(repository,assets,record.id,{...hugeInput,fit:'original'}),hasCode('original_does_not_fit'));
  assert.deepEqual(repository.get(record.id),record);
  repository.save(record.id,{...record.document,name:'Parallel geändert'},1);
  assert.throws(()=>applyDesignImport(repository,assets,record.id,{...input,token:plan.token}),hasCode('stale_revision'));
  assert.equal(repository.get(record.id).revision,2);
});

test('counterfeit asset metadata, missing originals and orphan design references cannot be saved',async t=>{
  const {assets,repository,record}=setup(t),input=await inputFor(assets,record),plan=planDesignImport(repository,assets,record.id,input);
  for(const corrupt of [
    document=>{document.config.localResources.motifs.find(m=>m.artwork).artwork.widthMm+=1;},
    document=>{document.config.localResources.motifs.find(m=>m.artwork).svgFragment='<path d="M0 0H1"/>';},
    document=>{document.config.localResources.motifs=document.config.localResources.motifs.filter(m=>!m.artwork);},
    document=>{document.config.profile.designs[0].importedSource.assetId='0'.repeat(64);},
    document=>{const item=document.config.localResources.motifs.find(m=>m.artwork);item.artwork.assetId='0'.repeat(64);item.key='artwork-'+'0'.repeat(64);item.svgFragment=artworkFragment('0'.repeat(64));document.config.profile.designs[0].objects[0].motif=item.key;}
  ]){
    const broken=structuredClone(plan.document);corrupt(broken);
    assert.throws(()=>repository.save(record.id,broken,1));assert.equal(repository.get(record.id).revision,1);
  }
});

test('imported artwork is included once with no surcharge and cannot be copied or recolored by customers',async t=>{
  const {assets,repository,record}=setup(t),input=await inputFor(assets,record),plan=planDesignImport(repository,assets,record.id,input),document=plan.document;
  const design=document.config.profile.designs[0],object=design.objects[0];
  const price=quote(document.config,design.objects,design.id,{size:'large',base:'eiche',wall:'wall'});
  assert.equal(price.additionalMotifs,0);assert.equal(price.totalCents,3697);
  const asset=assets.get(input.assetId);
  assert.equal(assets.resource(input.assetId).svgFragment,artworkFragment(input.assetId,asset.widthMm,asset.heightMm));
  assert.doesNotMatch(assets.resource(input.assetId).svgFragment,/<path|<script/);
  validateProductDesign(document,design);
  for(const change of [d=>{d.objects=[];},d=>{d.objects[0].preserveColors=false;},d=>{d.objects[0].opacity=.5;},d=>{d.objects[0].x+=1;},d=>{d.objects[0].w-=1;},d=>{d.objects[0].locked=false;},d=>{d.objects.push({...object,id:'copied'});}]){
    const changed=structuredClone(design);change(changed);assert.throws(()=>validateProductDesign(document,changed));
  }
  assert.throws(()=>quote(document.config,[...design.objects,{...object,id:'copied'}],design.id,{}),/Vorlagenmotiv/);
});

test('fixed imported artwork exposes no photo replacement and rejects fabricated photo fields',async t=>{
  const {assets,repository,record}=setup(t),input=await inputFor(assets,record);
  const {document}=planDesignImport(repository,assets,record.id,input),config=document.config;
  const [imported,untouched]=config.profile.designs;
  assert.equal(config.photo.enabled,true,'product photo capability remains available for other designs');
  assert.equal(imported.objects.some(object=>object.type==='photoSlot'),false);
  assert.equal(photoAvailableForDesign(config,imported.id),false);
  assert.equal(photoAvailableForDesign(config,untouched.id),true);
  const originalPhoto=untouched.objects.find(object=>object.type==='photoSlot');
  assert.ok(originalPhoto,'untouched template retains its real editable photo field');
  const forged=structuredClone(imported);
  forged.objects.push({...structuredClone(originalPhoto),id:'fabricated-photo-field',fieldKey:'fabricated-photo-field'});
  assert.throws(()=>validateProductDesign(document,forged),/keinen freigegebenen Fotobereich/);
  assert.equal(imported.objects.length,1);
});

test('design import HTTP requires CSRF and explicit review, serves isolated SVG and exact original bytes',async t=>{
  const workshop=createWorkshop({filename:':memory:',seedConfig:native(),legacy:{purchasing:{},features:{}}});
  const server=createPreviewServer({workshop});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));workshop.close();});
  const base=`http://127.0.0.1:${server.address().port}`,id=workshop.defaultId,record=workshop.repository.get(id);
  const session=await (await fetch(base+'/api/workshop/session')).json();
  const mutate=async(route,data,{token=session.csrfToken,method='POST'}={})=>{
    const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json','X-Gravuru-CSRF':token},body:JSON.stringify(data)});
    return {status:response.status,data:await response.json()};
  };
  const route=`/api/workshop/products/${id}/design-import`,upload={expectedRevision:1,designId:record.document.config.profile.designs[0].id,name:'Original.svg',bytes:source.toString('base64')};
  assert.equal((await mutate(route+'/preview',upload,{token:'invalid'})).status,403);
  const preview=await mutate(route+'/preview',upload);assert.equal(preview.status,200,JSON.stringify(preview.data));
  assert.equal(preview.data.document,undefined);assert.equal(workshop.repository.get(id).revision,1);
  const assetId=preview.data.asset.assetId,assetRoute=`/api/workshop/design-assets/${assetId}`;
  const vector=await fetch(base+assetRoute+'/preview.svg');assert.equal(vector.status,200);
  assert.match(vector.headers.get('content-security-policy'),/default-src 'none'/);assert.match(vector.headers.get('content-security-policy'),/sandbox/);
  assert.match(vector.headers.get('content-type'),/image\/svg\+xml/);assert.equal(vector.headers.get('x-content-type-options'),'nosniff');
  const vectorText=await vector.text();assert.match(vectorText,/#f01426/);assert.match(vectorText,/stop-opacity=".4"/);
  const download=await fetch(base+assetRoute+'/original');assert.match(download.headers.get('content-disposition'),/^attachment;/);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()),source);
  const apply={expectedRevision:1,designId:upload.designId,assetId,originalName:upload.name,fit:preview.data.fit,token:preview.data.token};
  assert.equal((await mutate(route+'/apply',{...apply,token:'bad'})).status,409);
  assert.equal((await mutate(route+'/apply',apply,{token:'invalid'})).status,403);
  const saved=await mutate(route+'/apply',apply);assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.revision,2);
  assert.equal((await mutate(route+'/apply',apply)).status,409);
  const historical=await (await fetch(base+`/models.json?configuration=${id}&revision=1`)).json();
  const current=await (await fetch(base+`/models.json?configuration=${id}&revision=2`)).json();
  assert.equal(historical[0].universal.profile.designs[0].importedSource,undefined);
  assert.equal(current[0].universal.profile.designs[0].importedSource.assetId,assetId);
  assert.equal((await fetch(base+assetRoute+'/preview.svg',{headers:{Origin:'https://example.org'}})).status,403);
  assert.equal((await fetch(base+`/api/workshop/design-assets/${'0'.repeat(64)}/original`)).status,404);
  const tooLarge=await mutate(route+'/preview',{...upload,padding:'x'.repeat(Math.ceil(MAX_DESIGN_BYTES/3)*4+4096)});
  assert.equal(tooLarge.status,413);
  assert.equal(workshop.repository.get(id).revision,2);
  // Existing early local revisions remain immutable; their public model is
  // normalized to source dimensions so history cannot repeat the square-box bug.
  const early=structuredClone(saved.data.document),earlyResource=early.config.localResources.motifs.find(m=>m.artwork);
  earlyResource.bounds=[0,0,1,1];earlyResource.svgFragment=artworkFragment(assetId);
  workshop.repository.save(id,early,2);
  const legacyModel=await (await fetch(base+`/models.json?configuration=${id}&revision=3`)).json();
  const normalized=legacyModel[0].universal.localResources.motifs.find(m=>m.artwork);
  assert.deepEqual(normalized.bounds,[0,0,100,80]);assert.equal(normalized.svgFragment,artworkFragment(assetId,100,80));
  assert.deepEqual(workshop.repository.get(id,{revision:3}).document.config.localResources.motifs.find(m=>m.artwork).bounds,[0,0,1,1]);
});
