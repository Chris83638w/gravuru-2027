import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReviewConfig} from './native-review-resources.mjs';
import {workshopResources} from './catalog.mjs';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {selectedDoorbellProfile} from '../configurator/variant-m/doorbell-selection.mjs';
import {designFontSelection} from '../configurator/variant-m/profile-selection.mjs';
const library=workshopResources(),motif=library.motifs.find(m=>m.name==='Haus'),font=Object.keys(library.fonts)[0];
const config=()=>({profile:{designs:[{id:'d1',objects:[{id:'original',type:'motif',motif:motif.key}]}]},localResources:{motifs:[motif],fonts:{}},workshopProfiles:{selections:{motifs:[],fonts:[]}}});

test('layered doorbell fonts come from the currently selected format, including opposite position',()=>{
 const c=doorbellFixture(),[a,b,group]=Object.keys(library.fonts);
 c.localResources.fonts=Object.fromEntries([a,b,group].map(k=>[k,library.fonts[k]]));
 c.workshopProfiles={selections:{fonts:[group]}};
 for(const f of c.doorbell.formats)f.profile.designs[0].objects.push({id:'text',type:'text',font:f.key==='24x20'?b:a,x:30,y:30,w:20,h:5,size:5,text:'Name'});
 const options={format:'24x20',position:'opposite'},source=selectedDoorbellProfile(c,options).designs[0];
 assert.deepEqual(designFontSelection([group],source),[group,b]);
 const input=font=>({options,designId:source.id,objects:[{id:'new-text',type:'text',font}]});
 for(const font of [b,group])assert.doesNotThrow(()=>nativeReviewConfig(c,input(font)));
 assert.throws(()=>nativeReviewConfig(c,input(a)),e=>e.status===422);
});
test('used bundled motif and font are frozen, unused library resources stay out; source stays unchanged',()=>{
 const c=config();delete c.workshopProfiles;c.localResources.motifs=[];
 const before=structuredClone(c),resolved=nativeReviewConfig(c,{designId:'d1',objects:[{id:'new',type:'motif',motif:motif.key,svgFragment:'untrusted'},{id:'text',type:'text',font}]});
 assert.deepEqual(c,before);assert.deepEqual(resolved.localResources.motifs,[motif]);assert.deepEqual(Object.keys(resolved.localResources.fonts),[font]);assert.deepEqual(resolved.localResources.fonts[font],library.fonts[font]);
});
test('product selections cannot be bypassed by a new object or resource replacement; existing template is retained',()=>{
 const c=config();
 assert.doesNotThrow(()=>nativeReviewConfig(c,{designId:'d1',objects:[{id:'original',type:'motif',motif:motif.key}]}));
 for(const object of [{id:'new',type:'motif',motif:motif.key},{id:'new',type:'text',font}])assert.throws(()=>nativeReviewConfig(c,{designId:'d1',objects:[object]}),e=>e.status===422&&/nicht freigegeben/.test(e.message));
 c.workshopProfiles.selections={motifs:[motif.key],fonts:[font]};
 assert.doesNotThrow(()=>nativeReviewConfig(c,{designId:'d1',objects:[{id:'new',type:'motif',motif:motif.key},{id:'text',type:'text',font}]}));
});
test('unknown motif/font remain validation errors, never accepted from browser sources',()=>{
 const c=config();delete c.workshopProfiles;
 for(const object of [{id:'new',type:'motif',motif:'not-in-library',svgFragment:'<path/>'},{id:'new',type:'text',font:'not-in-library'}])assert.throws(()=>nativeReviewConfig(c,{designId:'d1',objects:[object]}),e=>e.status===422&&/Bibliothek/.test(e.message));
});

test('group plus trusted original fonts can be reselected and used on new lines, without accepting other designs or client additions',()=>{
 const [original,group,other]=Object.keys(library.fonts);
 const c=config();c.profile.designs=[
  {id:'d1',objects:[{id:'original-text',type:'text',font:original}]},
  {id:'d2',objects:[{id:'other-text',type:'text',font:other}]}
 ];
 c.localResources.fonts={[original]:library.fonts[original],[other]:library.fonts[other]};
 c.workshopProfiles.selections.fonts=[group];
 const before=structuredClone(c);
 for(const id of ['original-text','new-text'])for(const wanted of [original,group]){
  const resolved=nativeReviewConfig(c,{designId:'d1',objects:[{id,type:'text',font:wanted}]});
  assert.ok(resolved.localResources.fonts[wanted]);
 }
 for(const input of [
  {designId:'d1',objects:[{id:'original-text',type:'text',font:other}]},
  {designId:'d1',objects:[{id:'new-text',type:'text',font:other}],design:{objects:[{type:'text',font:other}]}},
  {designId:'d2',objects:[{id:'new-text',type:'text',font:original}]}
 ])assert.throws(()=>nativeReviewConfig(c,input),e=>e.status===422&&/nicht freigegeben/.test(e.message));
 assert.doesNotThrow(()=>nativeReviewConfig(c,{designId:'d2',objects:[{id:'new-text',type:'text',font:other}]}));
 assert.deepEqual(c,before);
});
