import test from 'node:test';
import assert from 'node:assert/strict';
import {thumbnailCacheKey} from './adapter.mjs';
import {designResourcesReady} from './doorbell-lazy-designs.mjs';
import {textPaths} from '../../platform/sources/app/shared/models/text-paths.mjs';

const pack={Probe:{previewSubset:true,regular:{units:1000,glyphs:{F:{a:400,d:'M0 0H1V1H0Z'},a:{a:400,d:'M0 0H2V1H0Z'},m:{a:400,d:'M0 0H3V1H0Z'},i:{a:400,d:'M0 0H4V1H0Z'},l:{a:400,d:'M0 0H5V1H0Z'},e:{a:400,d:'M0 0H6V1H0Z'},'?':{a:200,d:'M0 0H7V1H0Z'}}}}};
const full={Probe:{regular:{units:1000,glyphs:{...pack.Probe.regular.glyphs,K:{a:400,d:'M0 0H8V1H0Z'},o:{a:400,d:'M0 0H9V1H0Z'},c:{a:400,d:'M0 0H10V1H0Z'},h:{a:400,d:'M0 0H11V1H0Z'}}}}};
const template={id:'a',objects:[{id:'t',type:'text',text:'Familie',font:'Probe',x:10,y:10,w:40,h:8,size:8,rotation:0,color:'#fff'}]};
const customer={...template,objects:[{...template.objects[0],text:'Koch'}]};
test('a customer word outside the preview pack waits for the full font and changes the card cache',()=>{
 assert.equal(designResourcesReady(template,pack,{}),true);
 assert.equal(designResourcesReady(customer,pack,{}),false);
 assert.equal(designResourcesReady(customer,full,{}),true);
 assert.notEqual(thumbnailCacheKey({format:'16x28'},'Familie',pack),thumbnailCacheKey({format:'16x28'},'Familie',full));
 const letter={...customer.objects[0]};
 assert.match(textPaths(letter,full),/M0 0H8V1H0Z/);
 assert.equal(textPaths(letter,pack).includes('M0 0H8V1H0Z'),false);
});
