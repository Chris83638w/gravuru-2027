import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoundTestCart,assertBoundTestReview,reviewRecord} from './bound-test-cart.mjs';
const productId='cfg_'+ '1'.repeat(36),shopDomain='test.myshopify.com',draftToken='a'.repeat(64);
function setup(form=false){
 const binding={tenantId:'gravuru',storeId:'acryl',shopDomain,shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/2',productId,productRevision:5,bindingId:'binding_1',assignmentRevision:1,options:{}};
 const record={id:productId,revision:5,status:'draft',metadata:{productionProfile:null},document:form?{schema:'gravuru-form-product/v1',material:{id:'acrylic',thicknessMm:3},processingMethod:'print',basePriceCents:1499}:{schema:'gravuru-product/v1',config:{}}};
 const draft={id:(form?'draft_':'adraft_')+'2'.repeat(36),productId,productRevision:5,revision:2,designId:'d1',snapshotId:'proof_1'};
 const manifest={schema:form?'gravuru-form-review/v1':'gravuru-native-review/v1',id:'proof_1',source:{draftId:form?draft.id:'acrylic_original',draftRevision:form?2:1,designId:'d1'},product:{id:productId,revision:5,method:form?'print':'engraving',basePriceCents:1499,currency:'EUR',widthMm:150,heightMm:200},status:'review-only',order:null,payment:null,productionReady:false,productionProfile:null,capabilities:{cart:false},selection:{options:{},price:{quantity:2}},blockers:form?['Ein freigegebenes Fertigungsprofil ist diesem Formprodukt noch nicht zugeordnet.','Gemessenes Druck-/Material-ICC-Profil und Maschinenabnahme fehlen.']:['Gravurparameter und Probegravur sind nicht freigegeben.','Shopify-Bestellbindung und echte Maschinenabnahme sind nicht bestätigt.']};
 let calls=0;const offers=[];
 const get=(id,token)=>{assert.equal(id,draft.id);if(token!==draftToken)throw Object.assign(Error(),{status:404});return structuredClone(draft);};
 const drafts={acrylicDrafts:{get},get,findSnapshot:()=>({id:'proof_1'}),review:()=>({manifest:structuredClone(manifest)}),orderIntake:{offer:(data,options)=>{offers.push({data,options});return {id:'offer_1',property:{value:'secret-offer'}};}}};
 const workshop={tenantId:'gravuru',sessionContext:{shopDomain},customerDrafts:drafts,repository:{get:()=>structuredClone(record)}};
 const registry={resolve:()=>structuredClone(binding)};
 const cart=createBoundTestCart({workshop,registry,shopDomain,handoffFactory:({reviewPolicy})=>async(input)=>{reviewPolicy(manifest);calls++;return {cartId:'synthetic',snapshotId:input.snapshotId};}});
 const input={draftId:draft.id,expectedRevision:2,quantity:2};
 return {binding,record,draft,manifest,drafts,registry,workshop,cart,input,offers,calls:()=>calls};
}
for(const form of [false,true])test((form?'form':'native')+' exact revision and immutable snapshot produce test-only cart',async()=>{
 const f=setup(form),before=structuredClone(f.manifest);const result=await f.cart(structuredClone(f.binding),f.input,{draftToken});
 assert.equal(result.productionReady,false);assert.equal(result.testOnly,true);assert.equal(f.calls(),1);assert.deepEqual(f.manifest,before);assert.equal(f.offers[0].data.quantity,2);
});
test('bound native snapshot retains its original source identity',async()=>{const f=setup();assert.notEqual(f.manifest.source.draftId,f.draft.id);await f.cart(f.binding,f.input,{draftToken});});
test('unrecognized review blockers never disappear at checkout',async()=>{const f=setup();f.manifest.blockers.push('Preis fehlt.');await assert.rejects(f.cart(f.binding,f.input,{draftToken}),e=>e.code==='bound_test_blockers');assert.equal(f.calls(),0);});
test('a missing or different production profile reference blocks',async()=>{const f=setup();f.manifest.productionProfile={id:'unexpected',revision:1};await assert.rejects(f.cart(f.binding,f.input,{draftToken}),e=>e.code==='bound_test_profile');});
test('native saved quantity must match requested quantity',async()=>{const f=setup();await assert.rejects(f.cart(f.binding,{...f.input,quantity:3},{draftToken}),e=>e.code==='bound_test_quantity');});
test('malformed quantities and browser supplied prices/cart IDs rejected before offer',async()=>{
 const f=setup();for(const quantity of [0,1.5,NaN,Infinity,100,'2',Number.MAX_SAFE_INTEGER])await assert.rejects(f.cart(f.binding,{...f.input,quantity},{draftToken}),e=>e.code==='bound_test_fields');
 for(const key of ['cartId','unitCents','storeId','shopifyVariantId'])await assert.rejects(f.cart(f.binding,{...f.input,[key]:'bad'},{draftToken}),e=>e.code==='bound_test_fields');assert.equal(f.offers.length,0);
});
test('foreign draft product/revision and stale draft are refused',async()=>{
 for(const key of ['productId','productRevision','revision']){const f=setup();f.draft[key]=key==='productId'?'cfg_foreign':999;await assert.rejects(f.cart(f.binding,f.input,{draftToken}),e=>e.code==='bound_test_draft');assert.equal(f.calls(),0);}
});
test('registry drift and wrong options block before offer',async()=>{
 const f=setup(),original=structuredClone(f.binding);f.binding.assignmentRevision++;await assert.rejects(f.cart(original,f.input,{draftToken}),e=>e.code==='bound_test_binding');
 const g=setup();g.manifest.selection.options={foreign:'option'};await assert.rejects(g.cart(g.binding,g.input,{draftToken}),e=>e.code==='bound_test_selection');
});
test('form snapshot ownership and missing saved review cannot be bypassed',async()=>{
 const f=setup(true);f.manifest.source.draftId='other';await assert.rejects(f.cart(f.binding,f.input,{draftToken}),e=>e.code==='bound_test_snapshot');
 const g=setup(true);g.drafts.findSnapshot=()=>null;await assert.rejects(g.cart(g.binding,g.input,{draftToken}),e=>e.code==='bound_test_snapshot');
});
test('form material/method/price incompleteness remains a blocker',()=>{
 for(const alter of [f=>f.record.document.material.thicknessMm=null,f=>f.record.document.processingMethod=null,f=>f.record.document.basePriceCents=null]){const f=setup(true);alter(f);assert.throws(()=>assertBoundTestReview(f.manifest,f.record,f.binding),e=>e.code==='bound_test_product');}
});
test('retry has same deterministic offer key but quantity change does not',async()=>{
 const f=setup(true);await f.cart(f.binding,f.input,{draftToken});await f.cart(f.binding,f.input,{draftToken});await f.cart(f.binding,{...f.input,quantity:3},{draftToken});
 assert.equal(f.offers[0].options.stableToken,f.offers[1].options.stableToken);assert.notEqual(f.offers[0].options.stableToken,f.offers[2].options.stableToken);
});

// #265 (ENTSCHEIDUNGEN 3.47, 3.53): Der Warenkorb-Abruf liest das Produktdokument nicht mehr bei jedem Aufruf. Der Status
// kommt ohne Dokument aus der Ablage, die wenigen festen Angaben der unveränderlichen Revision werden je Ablage gemerkt.
function withStatus(f,{status='draft',headStatus=status}={}){
 let reads=0;const state={status,headStatus},original=f.workshop.repository.get;
 f.workshop.repository={get:(...a)=>{reads++;return original(...a);},revisionStatus:(id,{revision}={})=>{assert.equal(id,productId);assert.equal(revision,5);return {id,revision,status:state.status,headRevision:7,headStatus:state.headStatus};}};
 f.cart=createBoundTestCart({workshop:f.workshop,registry:f.registry,shopDomain,handoffFactory:({reviewPolicy})=>async input=>{reviewPolicy(f.manifest);return {cartId:'synthetic',snapshotId:input.snapshotId};}});
 return {reads:()=>reads,state};
}
for(const form of [false,true])test((form?'form':'native')+': das Produktdokument wird je Ablage und Revision einmal gelesen, danach nicht mehr',async()=>{
 const f=setup(form),c=withStatus(f);
 for(let i=0;i<3;i++){const result=await f.cart(structuredClone(f.binding),f.input,{draftToken});assert.equal(result.testOnly,true);}
 assert.equal(c.reads(),1);
 // Eine andere Ablage (anderer Mandant, anderer Test) hat ihren eigenen Merker.
 const other=setup(form),d=withStatus(other);await other.cart(structuredClone(other.binding),other.input,{draftToken});assert.equal(d.reads(),1);
});
test('ein archiviertes Produkt wird erkannt – an der Revision, am aktuellen Stand und auf dem bisherigen Weg',async()=>{
 const archived=e=>e.status===409&&e.code==='bound_test_archived';
 const f=setup(),c=withStatus(f);await f.cart(structuredClone(f.binding),f.input,{draftToken});
 // Auch nachdem die festen Angaben gemerkt sind: Der Status wird bei jedem Aufruf frisch gelesen.
 c.state.headStatus='archived';await assert.rejects(f.cart(structuredClone(f.binding),f.input,{draftToken}),archived);
 c.state.headStatus='draft';c.state.status='archived';await assert.rejects(f.cart(structuredClone(f.binding),f.input,{draftToken}),archived);
 c.state.status='draft';await f.cart(structuredClone(f.binding),f.input,{draftToken});
 // Ablage ohne revisionStatus (bisheriger Weg): Status aus dem gelesenen Dokument.
 const old=setup();old.record.status='archived';old.workshop.repository={get:()=>structuredClone(old.record)};
 const cart=createBoundTestCart({workshop:old.workshop,registry:old.registry,shopDomain,handoffFactory:()=>async()=>({})});
 await assert.rejects(cart(structuredClone(old.binding),old.input,{draftToken}),archived);
});
test('die gemerkten Angaben entscheiden wie das ganze Dokument: Fertigungsprofil und nicht angebundene Funkklingel',async()=>{
 // Fertigungsprofil der Revision gegen das des Prüfstands.
 const p=setup();p.record.metadata.productionProfile={id:'profil',revision:2,blockers:[]};withStatus(p);
 await assert.rejects(p.cart(structuredClone(p.binding),p.input,{draftToken}),e=>e.code==='bound_test_profile');
 // Funkklingel ohne getrennte Fertigungsausgabe: Der zusätzliche Hinweis muss im Prüfstand stehen.
 const blocker='Die getrennte Fertigungsausgabe für Edelstahlträger und Acrylglasauflage ist noch nicht angebunden.';
 for(const memo of [false,true]){
  const d=setup();d.record.document.config={doorbell:{schema:'andere-art'}};if(memo)withStatus(d);
  await assert.rejects(d.cart(structuredClone(d.binding),d.input,{draftToken}),e=>e.code==='bound_test_blockers',memo?'gemerkt':'bisheriger Weg');
  d.manifest.blockers.unshift(blocker);const result=await d.cart(structuredClone(d.binding),d.input,{draftToken});assert.equal(result.testOnly,true);
 }
});
test('reviewRecord gibt nur unveränderliche, kleine Angaben heraus',()=>{
 const f=setup();f.record.document.config={doorbell:{schema:'andere-art'},profile:{designs:[{id:'groß'}]}};const repository={get:()=>structuredClone(f.record)};
 const view=reviewRecord(repository,productId,5);
 assert.deepEqual(view,{id:productId,revision:5,metadata:{productionProfile:null},document:{schema:'gravuru-product/v1'},unsupportedDoorbell:true});
 assert.ok(Object.isFrozen(view)&&Object.isFrozen(view.document)&&Object.isFrozen(view.metadata));
 assert.equal(reviewRecord(repository,productId,5),view);assert.notEqual(reviewRecord({get:repository.get},productId,5),view);
});
