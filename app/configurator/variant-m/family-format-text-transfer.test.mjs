import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {familyFormatState,selectedFamilyProfile} from './family-formats.mjs';

const clone=value=>structuredClone(value);
const text=(id,fieldKey,value,y)=>({id,type:'text',fieldKey,text:value,x:60,y,w:36,h:8,size:6,font:'test',rotation:0,customerEditable:true});
const fields=objects=>objects.filter(o=>o.type==='text').map(o=>[o.fieldKey,o.text]);
function fixture(sourceFields=[['name','Rosenberg'],['name-2','Familie']],targetFields=sourceFields){
 const design=(id,form,values)=>({id,katalog:{designId:`TEST-${form}-D1`,plateMm:[120,80]},objects:values.map(([key,value],i)=>text(`${id}-${i}`,key,value,15+i*12))});
 const designs=[design('source','AB',sourceFields),design('target','RE',targetFields)];
 const formats=designs.map((d,i)=>({key:d.id,form:i?'RE':'AB',geometry:{shape:'rect',width:120,height:80,cornerRadius:i?0:5,holes:[]},variants:[{color:'steel',designIds:[d.id],material:{kind:'steel'},mounting:[{id:'K00',holes:[],priceCents:0}]}]}));
 const config={profile:{geometry:formats[0].geometry,defaultDesignId:'source'},familyFormats:{defaultSize:'source',defaultColor:'steel',colors:[{id:'steel'}],formats,designs}};
 return {config,state:{mOptions:{size:'source',mounting:'K00'},designId:'source',objects:clone(designs[0].objects)}};
}

test('shape switch preserves a multiword name and unchanged second name by field key, in both directions',()=>{
 const {config,state}=fixture();state.objects[0].text='Test Eins';
 const before=clone(state),configBefore=clone(config);
 const next=familyFormatState(config,state,{size:'target'});
 assert.deepEqual(fields(next.objects),[['name','Test Eins'],['name-2','Familie']]);
 next.objects.find(o=>o.fieldKey==='name').text='Test Zwei';
 const back=familyFormatState(config,next,{size:'source'});
 assert.deepEqual(fields(back.objects),[['name','Test Zwei'],['name-2','Familie']]);
 assert.deepEqual(state,before);assert.deepEqual(config,configBefore);
});

test('three name fields retain their exact keys even when target object order and IDs differ',()=>{
 const source=[['name','Anna'],['name-2','Maria'],['name-3','Meyer']];
 const {config,state}=fixture(source,[source[2],source[0],source[1]]);
 state.objects[1].text='Marie Luise';
 const next=familyFormatState(config,state,{size:'target'});
 assert.deepEqual(fields(next.objects),[['name-3','Meyer'],['name','Anna'],['name-2','Marie Luise']]);
});

test('existing one-name to two-name mapping stays unchanged; ambiguous duplicate keys are not guessed',()=>{
 const single=fixture([['name','Muster']],[['name','Vorname'],['name-2','Nachname']]);
 single.state.objects[0].text='Anna Meyer';
 assert.deepEqual(fields(familyFormatState(single.config,single.state,{size:'target'}).objects),[['name','Anna'],['name-2','Meyer']]);
 const duplicate=fixture([['name','Anna'],['name','Meyer']],[['name','Vorlage']]);
 duplicate.state.objects[0].text='Marie Luise';
 const result=familyFormatState(duplicate.config,duplicate.state,{size:'target'});
 assert.deepEqual(fields(result.objects),[['name','Vorlage'],['name','Marie Luise'],['name','Meyer']]);
});

test('unchanged templates stay target-specific; other edited texts keep existing shape-switch transfer',()=>{
 const original=[['name','Rosenberg'],['name-2','Familie'],['spruch','Willkommen']];
 const target=[['name','Beispiel'],['name-2','Haus'],['spruch','Hallo']];
 const {config,state}=fixture(original,target);
 assert.deepEqual(fields(familyFormatState(config,state,{size:'target'}).objects),target);
 state.objects[0].text='Test Eins';state.objects[2].text='Mein Spruch';
 state.objects.push(text('own-text',undefined,'Mein Zusatztext',60));
 assert.deepEqual(fields(familyFormatState(config,state,{size:'target'}).objects),[['name','Test Eins'],['name-2','Familie'],['spruch','Mein Spruch'],[undefined,'Mein Zusatztext']]);
});

test('hidden and noneditable second names are not newly transferred',()=>{
 for(const flag of [{uxHidden:true},{customerEditable:false}]){
  const {config,state}=fixture();state.objects[0].text='Test Eins';Object.assign(state.objects[1],flag);
  const next=familyFormatState(config,state,{size:'target'});
  assert.equal(next.objects.some(o=>o.text==='Familie'),false);
 }
});

// The approved local product candidate is not committed: run explicitly with
// GRAVURU_STEEL_NATIVE_PLAN pointing to normal-door-native-plan.json.
test('real approved native plan: AB120x80 → RE150x100 → AB120x80 preserves Test Eins and Familie',{
 skip:!process.env.GRAVURU_STEEL_NATIVE_PLAN&&'Set GRAVURU_STEEL_NATIVE_PLAN to the approved local native plan'
},t=>{
 const bytes=fs.readFileSync(process.env.GRAVURU_STEEL_NATIVE_PLAN),plan=JSON.parse(bytes),config=plan.nativeUpdate.document.config;
 const find=key=>config.familyFormats.formats.find(f=>f.variants.some(v=>v.sizeKey===key));
 const ab=find('GR-ES-AB-120X80-T15'),re=find('GR-ES-RE-150X100-T15');assert.ok(ab&&re);
 const options={size:ab.key,color:config.familyFormats.defaultColor,mounting:'K00'};
 const profile=selectedFamilyProfile(config,options),design=profile.designs.find(d=>d.id===profile.defaultDesignId);
 const state={mOptions:options,designId:design.id,objects:clone(design.objects)},configBefore=JSON.stringify(config);
 assert.equal(state.objects.find(o=>o.fieldKey==='name-2').text,'Familie');
 state.objects.find(o=>o.fieldKey==='name').text='Test Eins';const original=clone(state);
 const next=familyFormatState(config,state,{size:re.key,mounting:'KGL'},{fonts:config.localResources.fonts});
 const expected=[['name','Test Eins'],['name-2','Familie']];assert.deepEqual(fields(next.objects),expected);
 next.objects.find(o=>o.fieldKey==='name').text='Test Zwei';
 const back=familyFormatState(config,next,{size:ab.key,mounting:'K00'},{fonts:config.localResources.fonts});
 assert.deepEqual(fields(back.objects),[['name','Test Zwei'],['name-2','Familie']]);
 assert.deepEqual(state,original);assert.equal(JSON.stringify(config),configBefore);
 t.diagnostic(`approved plan sha256=${createHash('sha256').update(bytes).digest('hex')}; design=${design.id}; AB120x80 -> RE150x100 KGL -> AB120x80 K00 passed`);
});
