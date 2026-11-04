import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bindSlateAccessories} from './slate-accessories.mjs';
import {memorialChoicesMarkup} from '../configurator/variant-m/memorial-execution.mjs';
import {slateImagesMarkup} from '../configurator/variant-m/slate-accessory-media.mjs';

// Test-only snapshot: catalogue PR #162, commit 86aa4bcec5c62e0c46cfc61ed30a42418841d1ff.
// Production callers must read the catalogue; this fixture is never imported by app code.
const catalogue=JSON.parse(fs.readFileSync(new URL('./test-fixtures/slate-accessories-pr162.json',import.meta.url)));
const source={path:'materialien/zubehoer/schiefer-zubehoer.json',revision:'86aa4bcec5c62e0c46cfc61ed30a42418841d1ff'};
const input=()=>({profile:{optionGroups:[
 {id:'mounting',name:'Befestigung',values:[{id:'K00',label:'Ohne Befestigung',priceCents:0,holes:[]},{id:'two',label:'2 Bohrlöcher',priceCents:299},{id:'gold4',label:'4 Abstandshalter · Gold',priceCents:1099}]},
 {id:'stand',name:'Ständer',values:[{id:'none',label:'Ohne Ständer',priceCents:0},{id:'clear',label:'Acrylständer klar',priceCents:1399}]}
 ]},photo:{enabled:true,includedCount:1,extraPriceCents:999}});
const bindings=[{groupId:'mounting',valueId:'two',optionId:'b2'},{groupId:'mounting',valueId:'gold4',optionId:'ah4',imageName:'Gold'},{groupId:'stand',valueId:'clear',optionId:'staender-klar'}];
const args={catalogue,source,bindings,resolveImage:file=>'/catalogue/materialien/zubehoer/'+file,includePhoto:true};

test('explicit catalogue media binding preserves product prices, geometry, groups and original input',()=>{
 const config=input(),before=structuredClone(config),bound=bindSlateAccessories(config,args);
 assert.deepEqual(config,before);assert.deepEqual(bound.profile,before.profile);assert.deepEqual(bound.photo,before.photo);
 assert.deepEqual(bound.slateAccessories.source,source);
 assert.deepEqual(bound.slateAccessories.choices[0].images.map(i=>i.name),['Quadrat','Rechteck']);
 assert.deepEqual(bound.slateAccessories.choices[1].images.map(i=>i.file),['bilder/abstandshalter-oben-gold.png']);
 assert.deepEqual(bound.slateAccessories.photo.images.map(i=>i.name),['Mensch','Hund']);
 const html=memorialChoicesMarkup(bound);
 assert.match(html,/data-picture-group="stand" data-picture-option="clear"/);
 assert.match(html,/data-picture-option="none"/);assert.match(html,/10,99/);assert.match(html,/13,99/);
 assert.ok(html.indexOf('data-picture-option="K00"')<html.indexOf('data-picture-option="two"'));
 assert.match(html,/alt="Gold"/);assert.match(html,/>Quadrat<\/small>/);assert.match(html,/>Rechteck<\/small>/);
 assert.match(html,/4 Abstandshalter \(12 mm breit\)/);
 assert.doesNotMatch(html,/abstandshalter-seite|abstandshalter-gruppe/);
});
test('all five spacer colours use the exact top views and 2/4-pack surcharges from PR 162',()=>{
 for(const id of ['ah2','ah4'])for(const colour of ['Edelstahl','Schwarz matt','Bronze','Gold','Weiß']){
  const price=(id==='ah2'?599:899)+(colour==='Edelstahl'?0:id==='ah2'?100:200);
  const config={profile:{optionGroups:[{id:'mounting',values:[{id:'selected',priceCents:price}]}]}};
  const bound=bindSlateAccessories(config,{...args,includePhoto:false,bindings:[{groupId:'mounting',valueId:'selected',optionId:id,imageName:colour}]});
  const choice=bound.slateAccessories.choices[0];
  assert.equal(choice.priceCents,price);assert.equal(choice.images.length,1);assert.equal(choice.images[0].name,colour);assert.match(choice.images[0].file,/abstandshalter-oben-/);
 }
});
test('stale prices are rejected instead of silently changed or used for new products',()=>{
 for(const [id,oldPrice] of [['b2s',339],['silikon',599],['staender-klar',1199],['staender-schwarz',1399]]){
  const config={profile:{optionGroups:[{id:'mounting',values:[{id:'old',priceCents:oldPrice}]}]}};
  assert.throws(()=>bindSlateAccessories(config,{...args,includePhoto:false,bindings:[{groupId:'mounting',valueId:'old',optionId:id}]}),/Zubehörpreis/);
 }
 const photo=input();photo.photo.extraPriceCents=899;assert.throws(()=>bindSlateAccessories(photo,args),/Foto-Aufpreis/);
});
test('missing/ambiguous sources, colours, paths and targets cannot create guessed bindings',()=>{
 assert.throws(()=>bindSlateAccessories(input(),{...args,source:{}}),/Quelle/);
 assert.throws(()=>bindSlateAccessories(input(),{...args,bindings:[...bindings,bindings[0]]}),/Doppelte/);
 assert.throws(()=>bindSlateAccessories(input(),{...args,bindings:[{...bindings[1],imageName:undefined}]}),/Farbe/);
 assert.throws(()=>bindSlateAccessories(input(),{...args,bindings:[{...bindings[0],valueId:'missing'}]}),/Produktoption/);
 assert.throws(()=>bindSlateAccessories(input(),{...args,resolveImage:()=> 'javascript:alert(1)'}),/Ressourcenadresse/);
 const invalid=structuredClone(catalogue);invalid.optionen[0].konfiBilder[0].datei='../secret.png';
 assert.throws(()=>bindSlateAccessories(input(),{...args,catalogue:invalid}),/Bildpfad/);
 assert.throws(()=>bindSlateAccessories({...input(),familyFormats:{}},args),/Katalogübergabe/);
});
test('unbound products retain their original UI; catalogue names and URLs are escaped',()=>{
 const config=input(),html=memorialChoicesMarkup(config);assert.doesNotMatch(html,/m-slate-images|abstandshalter-oben/);
 const markup=slateImagesMarkup([{name:'Hund <img onerror="x">',src:'/image?name="x"&v=1'}]);
 assert.match(markup,/&lt;img/);assert.match(markup,/&quot;/);assert.doesNotMatch(markup,/<img onerror=/);
});
