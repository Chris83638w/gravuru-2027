import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {once} from 'node:events';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {makeProductDocument,validateProductDocument,validateProductDesign,resolveProduct} from './product-model.mjs';
import {createProductRepository} from './repository.mjs';
import {createDesignAssetStore} from './design-assets.mjs';
import {planDesignImport,applyDesignImport} from './design-import.mjs';
import {planCustomerFields,applyCustomerFields} from './customer-fields.mjs';
import {createWorkshop} from './http.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
const source=Buffer.from('<svg width="140mm" height="180mm" viewBox="0 0 140 180"><path d="M2 2H138V178H2Z" fill="none" stroke="#17614f"/></svg>');
function native(){
  const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
  for(const object of config.profile.designs[0].objects.filter(o=>o.type==='text')){
    measureText(object,resources.fonts);if(object.id==='names'){object.size*=118/object.w;measureText(object,resources.fonts);}
  }
  return config;
}
const fields=()=>[
  {id:'customer-names',type:'text',label:'Namen',fieldKey:'names',text:'Anna & Lukas',font:'Garamond Acryl',size:4.5,color:'#731c19',allowColor:true,allowMove:false,allowScale:false,allowDelete:false,x:75,y:155},
  {id:'customer-photo',type:'photoSlot',label:'Lieblingsfoto',fieldKey:'photo-main',x:75,y:65,widthMm:90,heightMm:80,shape:'rect',required:true}
];
async function setup(t){
  const assets=createDesignAssetStore({filename:':memory:'}),repository=createProductRepository({filename:':memory:',validateDocument:d=>assets.validateDocument(validateProductDocument(d))});
  t.after(()=>{repository.close();assets.close();});
  const seed=repository.create(makeProductDocument(native(),{name:'Synthetische Feldprüfung'}));
  const asset=await assets.import({name:'Rahmen.svg',bytes:source.toString('base64')});
  const data={expectedRevision:1,designId:seed.document.config.profile.defaultDesignId,assetId:asset.assetId,originalName:'Rahmen.svg',fit:'visible'};
  const plan=planDesignImport(repository,assets,seed.id,data),record=applyDesignImport(repository,assets,seed.id,{...data,token:plan.token});
  return {assets,repository,record,input:{designId:data.designId,expectedRevision:2,fields:fields(),sourcePrepared:true}};
}

test('explicit fields preserve original, prices, identity and historical revision; preview does not write',async t=>{
  const {repository,assets,record,input}=await setup(t);
  const plan=planCustomerFields(repository,assets,record.id,input);
  assert.deepEqual(repository.get(record.id),record);
  assert.match(plan.svg,/Anna|<path/);
  const saved=applyCustomerFields(repository,assets,record.id,{...input,token:plan.token});
  assert.equal(saved.id,record.id);assert.equal(saved.revision,3);
  const design=saved.document.config.profile.designs[0];assert.equal(design.customerFields.length,2);
  assert.deepEqual(design.objects[0],record.document.config.profile.designs[0].objects[0]);
  assert.deepEqual(assets.read(design.importedSource.assetId,true),source);
  assert.deepEqual(repository.get(record.id,{revision:2}).document,record.document);
  for(const size of ['small','large'])for(const base of ['none','buche','eiche','nussbaum','klar','satiniert','holz-flach'])for(const wall of ['none','wall']){
    const opts={options:{size,base,wall}};assert.deepEqual(resolveProduct(saved.document,opts).price,resolveProduct(record.document,opts).price);
  }
  assert.equal(design.objects[1].size,4.5);
  const copy=repository.copy(saved.id,{expectedRevision:3,name:'Kopie',kind:'product'});
  assert.deepEqual(copy.document.config.profile.designs, saved.document.config.profile.designs);
});

test('customers can change text, allowed colour and photo but cannot move, resize, remove or remap fields',async t=>{
  const {repository,assets,record,input}=await setup(t),{document}=planCustomerFields(repository,assets,record.id,input);
  const design=structuredClone(document.config.profile.designs[0]);
  // K10: Farbwahl aus der UV-Profilpalette (Grün #28734b).
  design.objects[1].text='Mia & Noah';design.objects[1].color='#28734b';
  design.objects[2].uxUploadId='test-photo';design.objects[2].uxUploadKind='photo';
  assert.doesNotThrow(()=>validateProductDesign(document,design));
  for(const [index,key,value] of [[1,'x',76],[1,'size',5],[1,'fieldKey','date'],[2,'w',80],[2,'required',false]]){
    const changed=structuredClone(design);changed.objects[index][key]=value;
    assert.throws(()=>validateProductDesign(document,changed));
  }
  const deleted=structuredClone(design);deleted.objects.splice(1,1);assert.throws(()=>validateProductDesign(document,deleted));
});

test('confirmation, duplicate keys, invalid geometry, disabled photos and unknown fonts fail without saving',async t=>{
  const {repository,assets,record,input}=await setup(t);
  const bad=[{...input,sourcePrepared:false}, {...input,fields:[...fields(),{...fields()[0],id:'customer-other'}]}];
  for(const [index,key,value] of [[0,'font','Invented font'],[0,'x',999],[0,'text',''],[1,'shape','square'],[1,'fieldKey','wrong'],[1,'widthMm',-4]]){
    const changed=structuredClone(input);changed.fields[index][key]=value;bad.push(changed);
  }
  for(const data of bad)assert.throws(()=>planCustomerFields(repository,assets,record.id,data));
  const changed=structuredClone(input);changed.fields[1].shape='circle';assert.throws(()=>planCustomerFields(repository,assets,record.id,changed));
  assert.deepEqual(repository.get(record.id),record);
  const doc=structuredClone(record.document);doc.config.photo.enabled=false;repository.save(record.id,doc,2);
  assert.throws(()=>planCustomerFields(repository,assets,record.id,{...input,expectedRevision:3}));
});

test('changed review and concurrent revisions cannot overwrite saved work',async t=>{
  const {repository,assets,record,input}=await setup(t),plan=planCustomerFields(repository,assets,record.id,input);
  const changed=structuredClone(input);changed.fields[0].text='Geändert';
  assert.throws(()=>applyCustomerFields(repository,assets,record.id,{...changed,token:plan.token}),e=>e.code==='review_changed');
  repository.save(record.id,{...record.document,name:'Parallel gespeichert'},2);
  assert.throws(()=>applyCustomerFields(repository,assets,record.id,{...input,token:plan.token}),e=>e.code==='stale_revision');
  assert.equal(repository.get(record.id).document.name,'Parallel gespeichert');
});

test('removing fields preserves artwork; later artwork replacement clears previous field assignments',async t=>{
  const {repository,assets,record,input}=await setup(t),plan=planCustomerFields(repository,assets,record.id,input);
  const saved=applyCustomerFields(repository,assets,record.id,{...input,token:plan.token});
  const empty={...input,expectedRevision:3,fields:[],sourcePrepared:false};
  const cleared=planCustomerFields(repository,assets,saved.id,empty);
  assert.equal(cleared.document.config.profile.designs[0].objects.length,1);
  assert.equal(Object.keys(cleared.document.elementRights[input.designId]).length,1);
  const data={expectedRevision:3,designId:input.designId,assetId:record.document.config.profile.designs[0].importedSource.assetId,originalName:'Rahmen.svg'};
  const replacement=planDesignImport(repository,assets,record.id,data);
  assert.equal(replacement.document.config.profile.designs[0].customerFields,undefined);
});

test('field HTTP routes require CSRF and persist fields into customer model',async t=>{
  const workshop=createWorkshop({filename:':memory:',seedConfig:native(),legacy:{}}),server=createPreviewServer({workshop});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(r=>server.close(r));workshop.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const get=async p=>(await fetch(base+p)).json();
  const {csrfToken}=await get('/api/workshop/session');
  const post=async(p,data,token=csrfToken)=>{const r=await fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':token},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
  const id=(await get('/api/workshop/products')).products[0].id,record=await get('/api/workshop/products/'+id),designId=record.document.config.profile.defaultDesignId;
  const prefix='/api/workshop/products/'+id;
  const imported=await post(prefix+'/design-import/preview',{expectedRevision:1,designId,name:'Rahmen.svg',bytes:source.toString('base64')});assert.equal(imported.status,200);
  const p=imported.data;assert.equal((await post(prefix+'/design-import/apply',{expectedRevision:1,designId,assetId:p.asset.assetId,fit:p.fit,originalName:p.originalName,token:p.token})).status,200);
  const input={expectedRevision:2,designId,fields:fields(),sourcePrepared:true};
  assert.equal((await post(prefix+'/customer-fields/preview',input,'')).status,403);
  const preview=await post(prefix+'/customer-fields/preview',input);assert.equal(preview.status,200);assert.equal(preview.data.document,undefined);
  const saved=await post(prefix+'/customer-fields/apply',{...input,token:preview.data.token});assert.equal(saved.status,200);assert.equal(saved.data.revision,3);
  const current=await get(prefix);assert.equal(current.document.config.profile.designs[0].customerFields.length,2);
  assert.equal((await post(prefix+'/customer-fields/apply',{...input,token:preview.data.token})).status,409);
  assert.equal((await fetch(base+'/workshop-ui/customer-fields-ui.mjs')).status,200);
});

test('backend chooses fixed or movable text; source artwork remains locked after saving and reopening',async t=>{
 const {repository,assets,record,input}=await setup(t);
 input.fields[0].allowMove=true;
 const plan=planCustomerFields(repository,assets,record.id,input);
 const saved=applyCustomerFields(repository,assets,record.id,{...input,token:plan.token});
 const reopened=repository.get(record.id),d=reopened.document.config.profile.designs.find(d=>d.id===input.designId);
 assert.equal(reopened.document.elementRights[d.id]['customer-names'].move,true);
 const changed=structuredClone(d);changed.objects.find(o=>o.id==='customer-names').x-=3;
 assert.doesNotThrow(()=>validateProductDesign(reopened.document,changed));
 const source=d.objects.find(o=>!o.id.startsWith('customer-'));assert.equal(reopened.document.elementRights[d.id][source.id].move,false);
 const forbidden=structuredClone(d);forbidden.objects.find(o=>o.id===source.id).x+=3;assert.throws(()=>validateProductDesign(reopened.document,forbidden));
 const fixed={...input,expectedRevision:saved.revision,fields:input.fields.map(f=>({...f,allowMove:false,allowScale:false,allowDelete:false}))};
 const checked=planCustomerFields(repository,assets,record.id,fixed),restored=applyCustomerFields(repository,assets,record.id,{...fixed,token:checked.token});
 assert.equal(restored.document.elementRights[d.id]['customer-names'].move,false);
 assert.throws(()=>validateProductDesign(restored.document,changed));
 assert.throws(()=>planCustomerFields(repository,assets,record.id,{...fixed,expectedRevision:restored.revision,fields:fixed.fields.map(f=>({...f,allowMove:'yes'}))}),/Wahrheitswert/);
});

test('new text fields default to movable while an explicit fixed selection takes precedence',async t=>{
 const {repository,assets,record,input}=await setup(t);
 delete input.fields[0].allowMove;
 const plan=planCustomerFields(repository,assets,record.id,input);
 assert.equal(plan.document.elementRights[input.designId]['customer-names'].move,true);
 input.fields[0].allowMove=false;
 assert.equal(planCustomerFields(repository,assets,record.id,input).document.elementRights[input.designId]['customer-names'].move,false);
});

test('backend keeps normal size and remove controls by default and persists explicit restrictions',async t=>{
 const {repository,assets,record,input}=await setup(t);
 for(const key of ['allowMove','allowScale','allowDelete'])delete input.fields[0][key];
 const plan=planCustomerFields(repository,assets,record.id,input),designId=input.designId;
 assert.deepEqual(['move','scale','delete'].map(k=>plan.document.elementRights[designId]['customer-names'][k]),[true,true,true]);
 const design=structuredClone(plan.document.config.profile.designs.find(d=>d.id===designId));
 const text=design.objects.find(o=>o.id==='customer-names');text.size*=1.05;text.rotation=5;
 assert.doesNotThrow(()=>validateProductDesign(plan.document,design));
 design.objects=design.objects.filter(o=>o.id!=='customer-names');assert.doesNotThrow(()=>validateProductDesign(plan.document,design));
 input.fields[0].allowScale=false;input.fields[0].allowDelete=false;
 const checked=planCustomerFields(repository,assets,record.id,input);
 const saved=applyCustomerFields(repository,assets,record.id,{...input,token:checked.token});
 const reopened=repository.get(saved.id);
 assert.equal(reopened.document.elementRights[designId]['customer-names'].move,true);
 assert.equal(reopened.document.elementRights[designId]['customer-names'].scale,false);
 assert.equal(reopened.document.elementRights[designId]['customer-names'].delete,false);
 assert.throws(()=>validateProductDesign(reopened.document,design));
});
