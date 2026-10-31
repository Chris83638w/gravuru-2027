import test from 'node:test';
import assert from 'node:assert/strict';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {validateProductDocument} from './product-model.mjs';
import {legacyElementRights} from '../configurator/variant-m/element-rights.mjs';
import {selectedProfile,choiceOptions} from '../configurator/variant-m/contract.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {assertBoundTestReview} from './bound-test-cart.mjs';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==','base64');
test('actual layered doorbell reviews pass cart policy for all formats and positions while unknown blockers remain rejected',async()=>{
 const source=doorbellFixture();
 // Exercise an existing immutable revision, rather than newly authored rights.
 const document=validateProductDocument({schema:'gravuru-product/v1',name:source.profile.name,kind:'product',masterId:null,categoryIds:[],seo:{title:source.profile.name,description:''},profileAssignments:Object.fromEntries(['fonts','motifs','colors','bestsellers'].map(k=>[k,{mode:'inherit',profileId:null}])),elementRights:Object.fromEntries(source.profile.designs.map(d=>[d.id,Object.fromEntries(d.objects.map(o=>[o.id,legacyElementRights(o)]))])),config:source}),config=document.config;
 const record={id:config.profile.id,revision:2,document,metadata:{productionProfile:null}};
 for(const format of ['16x28','24x20','35x18'])for(const position of ['standard','opposite']){
  const options={format,position,frame:'FK-RUNDUM',color:'anthrazit',mounting:'SIL'};
  const design=selectedProfile(config,options).designs[0];
  const input={productId:record.id,productRevision:2,designId:design.id,objects:structuredClone(design.objects),options,quantity:1,media:[],preview:png.toString('base64')};
  const {manifest}=await prepareAcrylicReview({record,config,input,preparePhoto:async()=>({original:png,preview:png,width:40,height:60})});
  const binding={productId:record.id,productRevision:2,options:choiceOptions(config,options)};
  assert.equal(manifest.capabilities.layered,true);
  assert.doesNotThrow(()=>assertBoundTestReview(manifest,record,binding));
  assert.throws(()=>assertBoundTestReview({...manifest,blockers:[...manifest.blockers,'Unbekannter Sperrgrund']},record,binding),{code:'bound_test_blockers'});
  assert.throws(()=>assertBoundTestReview({...manifest,blockers:manifest.blockers.slice(1)},record,binding),{code:'bound_test_blockers'});
  const legacy=structuredClone(record);legacy.document.config.doorbell={schema:'gravuru-aosu-specimen/v1'};
  assert.throws(()=>assertBoundTestReview(manifest,legacy,binding),{code:'bound_test_blockers'});
  assert.doesNotThrow(()=>assertBoundTestReview({...manifest,blockers:['Die getrennte Fertigungsausgabe für Edelstahlträger und Acrylglasauflage ist noch nicht angebunden.',...manifest.blockers]},legacy,binding));
 }
});
