import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createDesignSwitch} from './ui/shop-design-switch.mjs';

test('product-page start links forward only one explicit a/b choice from location.search',()=>{
 const source=fs.readFileSync(new URL('./ui/shop-embed.mjs',import.meta.url),'utf8').replaceAll('\r\n','\n');
 const begin=source.indexOf('export function startHref('),end=source.indexOf('\n}',begin)+2;
 assert.ok(begin>=0&&end>begin);
 const context=vm.createContext({URLSearchParams,PROXY:'/apps/konfigurator',location:{search:'?leiste=a'}});
 vm.runInContext(source.slice(begin,end).replace('export ',''),context);
 const config={productId:'123',variantId:'456',variants:['456'],back:'/products/schild'};
 assert.equal(new URL(context.startHref(config),'https://shop.example').searchParams.get('leiste'),'a');
 for(const leiste of ['a','b']){
  const url=new URL(context.startHref(config,'456','?leiste='+leiste+'&price=0'),'https://shop.example');
  assert.equal(url.searchParams.get('leiste'),leiste);assert.equal(url.searchParams.get('product'),'123');assert.equal(url.searchParams.get('variant'),'456');assert.equal(url.searchParams.has('price'),false);
 }
 for(const search of ['', '?leiste=selection','?leiste=toString','?leiste=a&leiste=b'])assert.equal(new URL(context.startHref(config,'456',search),'https://shop.example').searchParams.has('leiste'),false);
});

async function editorPage(hash,{framed=true}={}){
 const nodes=Object.fromEntries(['status','header','back','title','editor'].map(id=>[id,{hidden:false,textContent:'',children:[],addEventListener(){},append(frame){this.children.push(frame);}}]));
 const document={querySelector:selector=>nodes[selector.replace(/^#/,'')],createElement:tag=>({tag,contentWindow:{},addEventListener(){}})},window={addEventListener(){}};window.parent=framed?{postMessage(){}}:window;
 const client={loadModel:async()=>({model:{name:'Testprodukt',configuration:{id:'cfg_test',revision:1},legacy:{},universal:{}},shopDomain:'test.myshopify.com',editorPath:'/_merchant-editor.html',themeCartPath:'/apps/konfigurator/cart'}),loadResources:async()=>({}),request(){},submitThemeCart(){}};
 const env=vm.createContext({document,window,URLSearchParams,location:{hash,origin:'https://app.example'},createShopEntryClient:()=>client,createDesignSwitch:options=>createDesignSwitch({...options,win:window,doc:document}),shopUrl:()=> 'https://test.myshopify.com/products/test',warmTargets:()=>[],warmEditor:()=>({catalog:Promise.resolve(null)}),startResourceUrls:()=>[],surfaceThumbnail:()=>()=>null,embeddedCart:()=>()=>{},previewJpeg(){}});
 const source=fs.readFileSync(new URL('./ui/shop-entry-page.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
 await vm.runInContext('(async()=>{'+source+'})()',env);
 assert.equal(nodes.status.hidden,true,nodes.status.textContent);assert.equal(nodes.editor.children.length,1);
 return {url:new URL(nodes.editor.children[0].src,'https://app.example'),gate:window.GravuruShopEntry};
}

test('actual Shop-entry page forwards a/b into the editor only inside the embedded Shop window',async()=>{
 for(const leiste of ['a','b']){
  const embedded=await editorPage('#s=synthetic&embed=1&leiste='+leiste+'&config=konfig_saved&rev=2&line=theme');
  assert.equal(embedded.gate.embedded,true);assert.equal(embedded.url.searchParams.get('leiste'),leiste);
  assert.equal(embedded.gate.designGallery.hasPendingTransfer(),false,'echter Designwechsel-Koordinator startet ohne ausstehende Übernahme');
  assert.equal(embedded.url.searchParams.get('config'),'konfig_saved');assert.equal(embedded.url.searchParams.get('rev'),'2');assert.equal(embedded.url.searchParams.get('line'),'theme');assert.equal(embedded.url.searchParams.has('s'),false);
  for(const result of [await editorPage('#s=synthetic&leiste='+leiste),await editorPage('#s=synthetic&embed=1&leiste='+leiste,{framed:false})]){
   assert.equal(result.gate.embedded,false);assert.equal(result.url.searchParams.has('leiste'),false);
  }
 }
 for(const query of ['leiste=selection','leiste=toString','leiste=a&leiste=b'])assert.equal((await editorPage('#s=synthetic&embed=1&'+query)).url.searchParams.has('leiste'),false);
});
