import test from 'node:test';
import assert from 'node:assert/strict';
import {offeredFamilyIds,lineOfferedFamilyIds,subcategoryMaterialOffering,familyOfferingIssue} from './subcategory-materials.mjs';
import {validateLine} from './katalog-source.mjs';

const families=new Map(['steel-door-signs','acryl-aa-abstandshalter','acryl-as-abstandshalter','acryl-3mm-tuerschilder-anthrazit'].map(id=>[id,{id}]));
const line={schema:'gravuru-line/v2',id:'test',name:'Test',families:['steel-door-signs'],subcategories:[{id:'one',name:'One'},{id:'two',name:'Two',familyIdsOffered:[]}]};

test('missing/null inherits the old line; empty explicitly offers nothing; result cannot mutate the source',()=>{
 const sub=line.subcategories[0];
 for(const value of [undefined,null])assert.deepEqual(offeredFamilyIds(line,{...sub,familyIdsOffered:value},{families}),['steel-door-signs']);
 assert.deepEqual(offeredFamilyIds(line,line.subcategories[1],{families}),[]);
 const resolved=offeredFamilyIds(line,sub,{families});resolved.push('different');assert.deepEqual(line.families,['steel-door-signs']);
 assert.deepEqual(lineOfferedFamilyIds(line,{families}),['steel-door-signs']);
 assert.deepEqual(lineOfferedFamilyIds(line,{families,subcategoryIds:['two']}),[]);
});

test('explicit known AA and AS remain distinct from 3 mm acrylic and may extend the original line',()=>{
 const sub={id:'one',familyIdsOffered:['acryl-aa-abstandshalter','acryl-as-abstandshalter']};
 assert.deepEqual(offeredFamilyIds(line,sub,{families}),sub.familyIdsOffered);
 assert.deepEqual(subcategoryMaterialOffering(line,sub,{families,supportedFamilyIds:['steel-door-signs','acryl-3mm-tuerschilder-anthrazit']}),{
  familyIdsOffered:sub.familyIdsOffered,effectiveFamilyIds:sub.familyIdsOffered,materialSelection:'explicit',unsupportedFamilyFormatIds:sub.familyIdsOffered,
 });
 const value=structuredClone(line);value.subcategories[0].familyIdsOffered=sub.familyIdsOffered;
 assert.equal(validateLine(value,{families}),value);
});

test('invalid, duplicate or unknown IDs fail validation instead of reverting to inherited offers',()=>{
 for(const value of ['steel-door-signs',{},['steel-door-signs','steel-door-signs'],['missing'],[null],['../bad']]){
  assert.equal(typeof familyOfferingIssue(value,{families}),'string');
  assert.throws(()=>offeredFamilyIds(line,{familyIdsOffered:value},{families}),e=>e.status===422);
  const invalid=structuredClone(line);invalid.subcategories[0].familyIdsOffered=value;
  assert.throws(()=>validateLine(invalid,{families}),/Unterkategorie/);
 }
});
