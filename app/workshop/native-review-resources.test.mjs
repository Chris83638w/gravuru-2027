import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReviewConfig} from './native-review-resources.mjs';
import {workshopResources} from './catalog.mjs';
const library=workshopResources(),motif=library.motifs.find(m=>m.name==='Haus'),font=Object.keys(library.fonts)[0];
const config=()=>({profile:{designs:[{id:'d1',objects:[{id:'original',type:'motif',motif:motif.key}]}]},localResources:{motifs:[motif],fonts:{}},workshopProfiles:{selections:{motifs:[],fonts:[]}}});
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
