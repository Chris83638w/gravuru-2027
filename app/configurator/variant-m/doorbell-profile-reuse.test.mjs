import test from 'node:test';
import assert from 'node:assert/strict';
import {projectOnce} from './adapter.mjs';
import {selectedDoorbellProfile} from './doorbell-selection.mjs';
import {studioSvg} from '../../platform/sources/app/shared/models/studio-svg.mjs';
import {doorbellFixture} from '../../workshop/test-fixtures/doorbell-config.mjs';

const alphabet='FamilieMuster12ßZh?';
function face(){
 const glyphs={};
 for(const char of alphabet)glyphs[char]={a:500,d:'M0 0H'+char.codePointAt(0)+'V10H0Z'};
 return {units:1000,glyphs};
}
function templates(prefix){
 return Array.from({length:16},(_,index)=>({
  id:prefix+'-'+index,name:'Vorlage '+index,marks:[],
  objects:[{id:'name',type:'text',text:alphabet,font:'Probe',x:40,y:40,w:80,h:12,size:8,rotation:0,color:'#ffffff',customerEditable:true}]
 }));
}
function config(){
 const base=doorbellFixture();
 for(const format of base.doorbell.formats)format.profile.designs=templates(format.key);
 base.profile.designs=templates(base.doorbell.defaultFormatKey);
 base.profile.defaultDesignId=base.profile.designs[0].id;
 base.localResources.fonts={Probe:{regular:face()}};
 return base;
}
const fonts={Probe:{regular:face()}};
const optionsFor=format=>({format,frame:'FK-RUNDUM',color:'schwarz',mounting:'K00',position:'standard'});
function markup(profile,design){
 return studioSvg(profile,design,fonts,{frameKey:'FK-RUNDUM',mountingKey:'K00',color:'schwarz',handles:false,guides:false,id:'karte',motifs:[]});
}

test('one option key builds the physical profile once per switch',()=>{
 const source=config();
 let calls=0;
 const select=options=>{calls++;return selectedDoorbellProfile(source,options);};
 const cache={};
 const options=optionsFor('16x28');
 for(let card=0;card<16;card++)projectOnce(cache,true,options,select);
 assert.equal(calls,1);
 projectOnce(cache,true,options,select);
 assert.equal(calls,1,'a second pass for the same options does not build again');
 projectOnce(cache,true,optionsFor('24x20'),select);
 assert.equal(calls,2,'another format is a new projection');
 assert.equal(cache.builds,2);
});

test('cached and fresh profiles print the same card markup for every template',()=>{
 const source=config();
 let cards=0;
 for(const format of source.doorbell.formats){
  const options=optionsFor(format.key);
  const cache={};
  const cached=projectOnce(cache,true,options,next=>selectedDoorbellProfile(source,next));
  const fresh=selectedDoorbellProfile(source,options);
  assert.equal(format.profile.designs.length,16);
  for(const design of fresh.designs){
   assert.equal(markup(cached,cached.designs.find(item=>item.id===design.id)),markup(fresh,design));
   cards++;
  }
 }
 assert.equal(cards,48);
});
