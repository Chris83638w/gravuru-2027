import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the unchanged merchant UI listeners with a minimal DOM boundary.
// All products/options below are isolated synthetic data, never catalogue rules.
test('checking a plan keeps the full source options available for a second edit',async()=>{
 const controls=new Map();
 const control=id=>{
  if(!controls.has(id))controls.set(id,{value:'',innerHTML:'',textContent:'',hidden:false,checked:false,disabled:false,
   listeners:new Map(),addEventListener(type,handler){this.listeners.set(type,handler);},focus(){}});
  return controls.get(id);
 };
 const values=[{id:'none',label:'Test none',priceCents:0},{id:'adhesive',label:'Test adhesive',priceCents:150},{id:'holes',label:'Test holes',priceCents:275}];
 const group={id:'mounting',name:'Test mounting',required:true,defaultValueId:'none',values};
 const modules={options:true,designs:true,text:true,motifs:true,photo:false,logo:false,colors:false};
 const profile={id:'cmp_test',revision:1,document:{name:'Test profile',modules}};
 const fullSource={key:'test-source',name:'Test source',source:{productId:'test-native',revision:1},geometry:{width:120,height:80},optionGroups:[group],optionFields:[],moduleAvailability:modules,detailsLoaded:true};
 const summary={key:fullSource.key,name:fullSource.name,detailsLoaded:false};
 let saved=null,selectedValues=[0,1],detailReads=0,planCount=0;
 const postedTemplates=[];
 const overview=()=>({profiles:[profile],sources:[summary],templates:saved?[saved]:[],scopes:[]});
 const response=data=>({ok:true,json:async()=>structuredClone(data)});
 const merchantRequest=async(url,options)=>{
  if(url==='/api/workshop/session')return response({csrfToken:'test-csrf'});
  if(url.startsWith('/api/workshop/configurator-modules/sources?')){
   assert.deepEqual(new URL(url,'https://test.invalid').searchParams.getAll('key'),[fullSource.key]);detailReads++;
   return response({sources:[fullSource]});
  }
  assert.equal(url,'/api/workshop/configurator-modules');
  if(!options?.method)return response(overview());
  const input=JSON.parse(options.body);
  if(['template-create','template-save'].includes(input.action)){
   postedTemplates.push(input.document);
   saved={id:'test-template',revision:postedTemplates.length,document:input.document};return response(saved);
  }
  assert.equal(input.action,'plan');planCount++;return response({id:'test-plan-'+planCount,planHash:'hash-'+planCount,valid:true,products:[]});
 };
 const fieldset={dataset:{group:'0'},querySelector(selector){
  if(selector==='[data-include-group]')return {checked:true};
  if(selector==='[data-default]')return {value:'none'};
  throw Error('Unexpected field '+selector);
 },querySelectorAll(selector){assert.equal(selector,'[data-value]:checked');return selectedValues.map(value=>({dataset:{value:String(value)}}));}};
 const target={querySelector(selector){
  if(selector==='[data-profile]')return {value:profile.id};
  if(selector==='[data-product-name]')return {value:'Test local draft'};
  throw Error('Unexpected target '+selector);
 },querySelectorAll(selector){assert.equal(selector,'[data-group]');return [fieldset];}};
 control('targets').querySelector=selector=>{assert.equal(selector,'[data-target="0"]');return target;};
 const context=vm.createContext({document:{getElementById:control,querySelectorAll:()=>[],addEventListener(){}},
  merchantRequest,merchantNavigation:href=>href,location:{href:'https://test.invalid/werkstatt/module/'},structuredClone,URLSearchParams,Intl,console});
 const source=fs.readFileSync(new URL('./ui/module-profiles.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
 vm.runInContext(source,context);
 // Wait for the real initial overview request, then simulate the already-open editor.
 for(let i=0;i<20&&vm.runInContext('state.busy',context);i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(vm.runInContext('state.busy',context),false);
 context.seed={profiles:[profile],sources:[fullSource],draft:{name:'Test group',scope:{lineId:'test-line',subcategoryId:'test-sub'},
  targets:[{key:fullSource.key,source:fullSource.source,material:{kind:'steel'},optionGroups:[group],optionFields:[],moduleProfile:{id:profile.id,revision:1}}]}};
 vm.runInContext('Object.assign(state,structuredClone(seed));state.creationKey="test-creation";',context);
 control('edit-template-name').value='Test group';
 const submit=()=>control('template-form').listeners.get('submit')({preventDefault(){}});
 await submit();
 assert.equal(postedTemplates.length,1);
 assert.deepEqual(postedTemplates[0].targets[0].optionGroups[0].values.map(v=>v.id),['none','adhesive']);
 assert.equal(control('review').hidden,false);
 // The same visible editor still contains the unchecked third source option.
 selectedValues=[0,1,2];control('template-form').listeners.get('input')();
 assert.equal(control('review').hidden,true);
 await submit();
 assert.equal(postedTemplates.length,2);
 assert.deepEqual(postedTemplates[1].targets[0].optionGroups[0].values,values);
 assert.equal(planCount,2);
 assert.equal(detailReads,2,'only the selected source is refreshed after each overview reload');
 assert.equal(postedTemplates[1].targets[0].moduleProfile.id,profile.id);
 assert.equal(control('accepted').checked,false,'a revised plan still requires a new explicit confirmation');
});
