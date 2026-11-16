import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {MODULE_PROFILE_SCHEMA,validateModuleProfile,moduleEnabled,moduleProfileIssue,applyModuleProfile} from './module-profile.mjs';
const profile={schema:MODULE_PROFILE_SCHEMA,id:'cmp-parent-frame',revision:1,modules:{options:true,designs:true,text:true,motifs:true,photo:false,logo:false,colors:false}};
test('parent-frame JSON module policy is validated without changing its pinned choices',()=>{
 const data={moduleProfile:profile,profile:{material:{kind:'steel'},processing:{method:'engraving'},designs:[]},photo:{enabled:false},logo:{enabled:false}};
 const foreign=vm.runInNewContext('JSON.parse(value)',{value:JSON.stringify(data)}),before=JSON.stringify(foreign);
 assert.notEqual(Object.getPrototypeOf(foreign.moduleProfile),Object.prototype);assert.equal(validateModuleProfile(foreign.moduleProfile),foreign.moduleProfile);assert.equal(moduleEnabled(foreign,'designs'),true);assert.equal(moduleEnabled(foreign,'photo'),false);assert.equal(moduleProfileIssue(foreign),null);
 const compiled=applyModuleProfile(foreign);assert.deepEqual(compiled.moduleProfile,profile);assert.equal(JSON.stringify(foreign),before);
});
test('cross-realm support does not accept classes, arrays, dates, incomplete choices or invalid versions',()=>{
 for(const expression of ['Object.assign(new (class Profile {})(), p)','Object.assign(new Date(),p)','Object.assign([],p)','({...p,revision:0})','({...p,extra:true})','({...p,modules:{...p.modules,photo:1}})','({...p,modules:{options:true}})']){
  const invalid=vm.runInNewContext('const p=JSON.parse(value);'+expression,{value:JSON.stringify(profile)});assert.throws(()=>validateModuleProfile(invalid),{code:'module_profile_invalid'},expression);
 }
 const nullPrototype=Object.assign(Object.create(null),profile);assert.equal(validateModuleProfile(nullPrototype),nullPrototype);
 const disguised=Object.assign(Object.create(null),{constructor:Object});assert.throws(()=>validateModuleProfile(Object.assign(Object.create(disguised),profile)),{code:'module_profile_invalid'});
 const getter=Object.create(null);Object.defineProperty(getter,'constructor',{get(){throw Error('must not read getter');}});assert.throws(()=>validateModuleProfile(Object.assign(Object.create(getter),profile)),{code:'module_profile_invalid'});
});
