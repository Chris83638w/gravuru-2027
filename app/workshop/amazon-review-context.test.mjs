import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {jobLink,statusNote} from './ui/output-summary.mjs';

// Run the actual page startup and event handlers with deterministic DOM/network
// ports. This verifies UI routing; the native HTTP/package flow has a separate test.
const source=name=>fs.readFileSync(new URL('./ui/'+name,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
function node(){
 const children=new Map(),classes=new Set();return {value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,href:'',children:[],attributes:{},
  classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},contains:name=>classes.has(name)},
  querySelector(selector){if(!children.has(selector))children.set(selector,node());return children.get(selector);},
  setAttribute(name,value){this.attributes[name]=value;},append(child){this.children.push(child);},reset(){}};
}
function dom(){
 const nodes=new Map(),get=selector=>{if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);};
 const form=get('#print-form'),fields=Object.fromEntries(Object.entries({profile:'roland',white:'motif',bleedMm:'0',whiteBleedMm:'0',format:'pdf'}).map(([key,value])=>[key,Object.assign(node(),{value})]));
 fields.namedItem=name=>fields[name];form.elements=fields;get('#engraving-form').elements={namedItem:()=>null};get('#review-detail').hidden=true;get('#order-context').hidden=true;
 return {get,document:{querySelector:get,querySelectorAll:()=>[],createElement:()=>node()}};
}
const snapshot=id=>({manifest:{id,schema:'gravuru-form-review/v1',createdAt:'2026-10-16T10:00:00Z',product:{id:'cfg_test',name:'Testprodukt',revision:1,widthMm:100,heightMm:100,basePriceCents:1000},source:{draftRevision:1},files:[],photos:[],blockers:['Fertigung prüfen'],warnings:[]},preview:'<svg></svg>',outputCapabilities:{cart:true,print:false,engraving:true,contour:true}});
const line={id:'amazonline_test',snapshotId:'proof_test',provenance:'synthetic',orderId:'TEST-ORDER-20261016',sku:'TEST-SKU',quantity:2,product:{id:'cfg_test',name:'Testprodukt',revision:1},assignment:{quantityVerified:true}};
async function review({search='?snapshot=proof_test&amazonPosition=amazonline_test',orders=[line],statuses={amazonline_test:{label:'Gestaltung zugeordnet'}},shopifyContext=null}={}){
 const {get,document}=dom(),calls=[],location={search},history={replaceState(_state,_title,url){location.search=url;}},state={orders,statuses};
 const fetch=async url=>{calls.push(url);let value;if(url==='/api/workshop/session')value={csrfToken:'test-only'};else if(url==='/api/workshop/amazon/orders')value=state;else if(url==='/api/workshop/review-snapshots')value={snapshots:['proof_test','proof_other'].map(id=>({...snapshot(id).manifest}))};else if(url.startsWith('/api/workshop/review-snapshots/'))value=snapshot(url.split('/').at(-1));else if(url==='/api/workshop/orders/orderline_shopify/outputs')value=shopifyContext;else throw Error('Unexpected UI read: '+url);return {ok:true,json:async()=>structuredClone(value)};};
 const contextSource=source('order-output-context.mjs').replace('export function showOrderContext','function showOrderContext');
 await vm.runInNewContext('(async()=>{'+contextSource+'\n'+source('review-snapshots-ui.mjs')+'\n})()',{document,fetch,location,history,URLSearchParams,Intl,jobLink,statusNote});
 return {get,calls,location,state};
}

test('Amazon review context verifies assigned snapshot, shows quantity and block, and refreshes cancellation',async()=>{
 const ui=await review(),root=ui.get('#order-context');assert.equal(root.hidden,false);assert.match(root.querySelector('[data-order-title]').textContent,/Amazon-Testposition.*TEST-ORDER-20261016.*TEST-SKU.*Menge 2/);
 assert.equal(ui.get('.detail-heading .badge').textContent,'Prüfstand · Amazon-Testposition');assert.match(root.querySelector('[data-order-status]').textContent,/Fertigung gesperrt/);assert.equal(ui.get('#cart-handoff').hidden,true);
 assert.equal(ui.get('#print-panel').hidden,true);assert.equal(ui.get('#engraving-panel').hidden,false,'context must not change existing output capabilities');assert.equal(ui.get('#review-detail').hidden,false);
 assert.equal(root.querySelector('[data-order-back]').href,'/werkstatt/amazon/');assert.equal(new URLSearchParams(ui.location.search).get('amazonPosition'),line.id);assert.equal(new URLSearchParams(root.querySelector('[data-order-settings]').href.split('?')[1]).get('amazonPosition'),line.id);
 ui.state.statuses[line.id]={label:'Storniert',cancelled:true};await ui.get('#refresh').onclick();assert.match(root.querySelector('[data-order-status]').textContent,/Storniert.*Fertigung gesperrt/);assert.equal(ui.calls.filter(url=>url==='/api/workshop/amazon/orders').length,2);
 ui.state.orders=[];await ui.get('#refresh').onclick();assert.equal(ui.get('#review-detail').hidden,true);assert.equal(root.hidden,true);assert.equal(ui.get('#cart-handoff').hidden,true);assert.match(ui.get('#notice').textContent,/nicht zugeordnet/);
});

test('Amazon context fails closed for absent line, wrong snapshot or unsupported provenance',async t=>{
 for(const [name,orders] of [['absent',[]],['different snapshot',[{...line,snapshotId:'proof_other'}]],['real data',[{...line,provenance:'production'}]]])await t.test(name,async()=>{
  const ui=await review({orders});assert.equal(ui.get('#review-detail').hidden,true);assert.equal(ui.get('#order-context').hidden,true);assert.equal(ui.get('#cart-handoff').hidden,true);assert.match(ui.get('#notice').textContent,/nicht zugeordnet/);
 });
});

test('ambiguous Shopify and Amazon context is rejected before fetching either order',async()=>{
 const ui=await review({search:'?snapshot=proof_test&amazonPosition=amazonline_test&position=orderline_shopify'});assert.equal(ui.calls.length,0);assert.equal(ui.get('#cart-handoff').hidden,true);assert.match(ui.get('#notice').textContent,/nicht gleichzeitig/);
});

test('standalone and Shopify snapshot routes retain existing cart and order behavior',async t=>{
 for(const shopify of [false,true])await t.test(shopify?'Shopify':'standalone',async()=>{
  const ui=await review({search:'?snapshot=proof_test'+(shopify?'&position=orderline_shopify':''),shopifyContext:{positionId:'orderline_shopify',orderId:'SHOPIFY-TEST',snapshotId:'proof_test',product:{name:'Testprodukt'},quantity:3,status:{label:'Prüfen'}}});
  assert.equal(ui.get('#review-detail').hidden,false);assert.equal(ui.get('#cart-handoff').hidden,false);assert.equal(ui.get('#cart-handoff').href,'/werkstatt/warenkorbpruefung/?snapshot=proof_test');assert.equal(ui.calls.some(url=>url.includes('/amazon/')),false);assert.equal(new URLSearchParams(ui.location.search).has('amazonPosition'),false);
  assert.equal(ui.get('#order-context').hidden,!shopify);if(shopify){assert.match(ui.get('#order-context').querySelector('[data-order-title]').textContent,/Testbestellung SHOPIFY-TEST.*Menge 3/);assert.equal(new URLSearchParams(ui.location.search).get('position'),'orderline_shopify');}
 });
});

test('explicitly selecting a different snapshot clears the Amazon context',async()=>{
 const ui=await review();ui.get('#review-list').onclick({target:{closest:()=>({dataset:{proof:'proof_other'}})}});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(ui.get('#review-detail').hidden,false);assert.equal(ui.get('#order-context').hidden,true);assert.equal(ui.get('#cart-handoff').hidden,false);assert.equal(new URLSearchParams(ui.location.search).get('snapshot'),'proof_other');assert.equal(new URLSearchParams(ui.location.search).has('amazonPosition'),false);assert.equal(ui.get('.detail-heading .badge').textContent,'Prüfstand · keine Bestellung');
});

test('Amazon page generated assignment link includes exact snapshot and position',async()=>{
 const {get,document}=dom(),fixtures={'amazon/status':{mode:'disconnected'},'amazon/orders':{orders:[line],statuses:{}},products:{products:[]},'review-snapshots':{snapshots:[]},'amazon/catalog':{items:[]}};
 const request=async url=>{const value=fixtures[url.replace('/api/workshop/','')];assert.ok(value,'unexpected request '+url);return {ok:true,json:async()=>structuredClone(value)};};
 await vm.runInNewContext('(async()=>{'+source('amazon-ui.mjs')+'\n})()',{document,request,initializeAmazonCustomUI(){},initializeAmazonOperationsUI(){},initializeAmazonCustomImportUI(){},URLSearchParams,Intl});
 get('#orders').onclick({target:{closest:()=>({dataset:{id:line.id}})}});const url=new URL(get('#assignment-status').children[0].href,'http://localhost');
 assert.equal(url.pathname,'/werkstatt/pruefstaende/');assert.equal(url.searchParams.get('snapshot'),line.snapshotId);assert.equal(url.searchParams.get('amazonPosition'),line.id);
});
