import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {thankYouPreview} from '../../ops/shopify/thank-you-preview/src/model.mjs';
import {orderBlockLine,orderBlockModel,productionLink,orderGid,ORDER_BLOCK_QUERY} from '../../ops/shopify/order-block/src/model.mjs';
// #265 Stufe C, ENTSCHEIDUNGEN 3.53 (6)/3.57 (1): Modell des Blocks in der Bestellseite des Shopify-Admin.
const host='https://app-2027.gravuru-designwerkstatt.de';
const src=host+'/gestaltung/acryl/offer_11111111-1111-4111-8111-111111111111/'+'a'.repeat(64)+'.png';
// Form wie app/workshop/theme-cart.mjs productionOrderLink (Bestellansicht im Shopify-Admin des Shops).
const admin='https://gravuru-synthetic.myshopify.com/admin/apps/synthetic-client/werkstatt/bestellungen/',production=admin+'?config=konfig_11111111-1111-4111-8111-111111111111&rev=2';
const line=(properties,extra={})=>({id:'gid://shopify/LineItem/1',title:'Türschild',quantity:2,customAttributes:Object.entries(properties).map(([key,value])=>({key,value})),...extra});
const full={_gravuru_config:'konfig_test',_gravuru_rev:'1',_gravuru_offer:'b'.repeat(64),_gravuru_bild:src,_gravuru_fertigung:production,Gravurtext:'Familie Test'};

test('a Gravuru position shows its image and both buttons: the image at the own server, the production file at the workshop inside the shop admin',()=>{
 assert.deepEqual(orderBlockLine(line(full)),{title:'Türschild',quantity:2,image:{src,alt:'Gestaltung: Türschild'},actions:[{label:'Gestaltung ansehen',href:src},{label:'Fertigungsdatei',href:production}]});
 const [view,file]=orderBlockLine(line(full)).actions;assert.ok(view.href.startsWith(host+'/gestaltung/'));assert.ok(file.href.startsWith(admin+'?config='));
});
test('without _gravuru_fertigung the production button is not shown; the image and its button stay',()=>{
 const {_gravuru_fertigung,...rest}=full,view=orderBlockLine(line(rest));
 assert.deepEqual(view.actions,[{label:'Gestaltung ansehen',href:src}]);assert.equal(view.image.src,src);
 for(const value of ['',null,undefined,7,{},'https://evil.example/werkstatt/'])assert.deepEqual(orderBlockLine(line({...rest,_gravuru_fertigung:value})).actions,[{label:'Gestaltung ansehen',href:src}]);
});
test('the image address passes exactly the check of the thank-you page',()=>{
 const candidates=[src,undefined,null,7,'',src.replace('https:','http:'),src.replace('app-2027.gravuru-designwerkstatt.de','evil.example'),src.replace('app-2027.','app-2027.gravuru-designwerkstatt.de.evil.'),src+'?token=secret',src+'#x',src.replace('.png','.jpg'),src.replace('/offer_','/proof_'),src.replace('/gestaltung/','/werkstatt/'),' '+src,src+'\n',src.toUpperCase(),host+'/werkstatt/'];
 for(const url of candidates){
  const thankYou=thankYouPreview({attributes:[{key:'_gravuru_config',value:'konfig_test'},{key:'_gravuru_bild',value:url}],merchandise:{title:'Türschild'}});
  const block=orderBlockLine(line({_gravuru_config:'konfig_test',_gravuru_bild:url}));
  assert.equal(Boolean(block?.image),Boolean(thankYou),String(url));
  if(thankYou)assert.equal(block.image.src,thankYou.src);else assert.equal(block,null,'ohne vertrauenswürdige Eigenschaft zeigt die Position nichts');
 }
});
test('positions without trusted properties show nothing',()=>{
 for(const properties of [{},{Gravurtext:'x'},{_gravuru_bild:src,_gravuru_fertigung:production},{_gravuru_config:'',_gravuru_bild:src},{_gravuru_config:'konfig_test'},{_gravuru_config:'konfig_test',_gravuru_bild:'https://evil.example/x.png',_gravuru_fertigung:'https://evil.example/werkstatt/'}])assert.equal(orderBlockLine(line(properties)),null,JSON.stringify(properties));
 for(const value of [null,undefined,{},{customAttributes:'x'},{customAttributes:[null,7,{key:'_gravuru_config'}]}])assert.equal(orderBlockLine(value),null);
});
test('a position with a trusted production address but no trusted image keeps only that button',()=>{
 assert.deepEqual(orderBlockLine(line({_gravuru_config:'konfig_test',_gravuru_bild:src+'?x',_gravuru_fertigung:production})),{title:'Türschild',quantity:2,image:null,actions:[{label:'Fertigungsdatei',href:production}]});
});
test('production link: only the login-protected workshop on the own server',()=>{
 for(const ok of [production,admin+'?config=konfig_22222222-2222-4222-8222-222222222222&rev=17'])assert.equal(productionLink(ok),ok,ok);
 for(const bad of [undefined,null,7,'',host,host+'/werkstatt/bestellungen/?config=konfig_11111111-1111-4111-8111-111111111111&rev=2',admin,admin+'?config=konfig_11111111-1111-4111-8111-111111111111',production+'&next=https://evil.example/',production+'#x',production.replace('rev=2','rev=0'),production.replace('https:','http:'),production.replace('.myshopify.com','.myshopify.com.evil.example'),production.replace('/admin/apps/synthetic-client/','/admin/apps/a/../'),production.replace('/werkstatt/bestellungen/','/werkstatt/ausgaben/'),production.replace('https://','https://user:pw@'),production.replace('konfig_','proof_'),'https://evil.example/admin/apps/synthetic-client/werkstatt/bestellungen/?config=konfig_11111111-1111-4111-8111-111111111111&rev=2',production+' '])assert.equal(productionLink(bad),null,String(bad));
});
test('the order model keeps only Gravuru positions, in order, and tolerates unreadable data',()=>{
 const other=line({Farbe:'rot'},{id:'gid://shopify/LineItem/2',title:'Zubehör',quantity:1}),second=line({_gravuru_config:'konfig_zwei',_gravuru_bild:src.replace('a'.repeat(64),'c'.repeat(64))},{id:'gid://shopify/LineItem/3',title:'  ',quantity:0});
 const model=orderBlockModel({lineItems:{nodes:[line(full),other,second]}});
 assert.deepEqual(model.lines.map(l=>[l.title,l.quantity,l.actions.map(a=>a.label)]),[['Türschild',2,['Gestaltung ansehen','Fertigungsdatei']],['Personalisiertes Produkt',null,['Gestaltung ansehen']]]);
 for(const value of [null,undefined,{},{lineItems:null},{lineItems:{nodes:'x'}}])assert.deepEqual(orderBlockModel(value),{lines:[]});
});
test('the block only reads: one query for positions and their properties, no mutation, no customer data',()=>{
 assert.match(ORDER_BLOCK_QUERY,/^query GravuruOrderBlock\(\$id:ID!\)\{order\(id:\$id\)\{lineItems\(first:250\)\{nodes\{id title quantity customAttributes\{key value\}\}\}\}\}$/);
 assert.doesNotMatch(ORDER_BLOCK_QUERY,/mutation|customer|email|address|phone/i);
 assert.equal(orderGid('gid://shopify/Order/123'),'gid://shopify/Order/123');
 for(const bad of [undefined,'123','gid://shopify/Order/0','gid://shopify/Product/1','gid://shopify/Order/1?x'])assert.equal(orderGid(bad),null);
});
test('extension source: admin order target, same API version as the thank-you extension, nothing delivered through Shopify',()=>{
 const base=new URL('../../ops/shopify/order-block/',import.meta.url),toml=fs.readFileSync(new URL('shopify.extension.toml',base),'utf8');
 assert.match(toml,/^api_version = "2025-10"$/m);assert.match(toml,/\[\[extensions\.targeting\]\]\ntarget = "admin\.order-details\.block\.render"\nmodule = "\.\/src\/OrderBlock\.js"/);
 assert.equal(toml.match(/^api_version = .*$/m)[0],fs.readFileSync(new URL('../thank-you-preview/shopify.extension.toml',base),'utf8').match(/^api_version = .*$/m)[0]);
 // Keine erfundene Identität: weder UID noch Client- oder Shop-Kennung in den Quellen.
 for(const file of ['shopify.extension.toml','package.json','src/OrderBlock.js','src/model.mjs'])assert.doesNotMatch(fs.readFileSync(new URL(file,base),'utf8'),/\buid\b|client_id|myshopify\.com|[a-f0-9]{32}/i,file);
 const source=fs.readFileSync(new URL('src/OrderBlock.js',base),'utf8').replace(/^\s*\/\/.*$/gm,'');
 // Einziger Abruf ist die lesende Admin-Abfrage; kein Speichern, keine Datei von Shopify, kein fremder Host.
 assert.deepEqual(source.match(/fetch\([^)]*?['"]([^'"]+)['"]/g),["fetch('shopify:admin/api/graphql.json'"]);
 for(const forbidden of [/https?:\/\//,/cdn\.shopify/,/localStorage|sessionStorage|cookie/i,/mutation/i,/fileCreate|stagedUpload/])assert.doesNotMatch(source,forbidden);
});

// Nachgebildetes DOM (kein Shopify-Laufzeitnachweis): prüft nur, dass das Modul läuft und welche Bausteine mit welchen
// Adressen entstehen. Zielname, Bausteine und der Admin-Abruf selbst sind am echten Shop zu bestätigen.
function fakeDocument(){
 const node=name=>({name,children:[],append(...items){this.children.push(...items);},get all(){return [this,...this.children.flatMap(c=>c.all||[])];}});
 const body={children:[],replaceChildren(...items){this.children=items;},get all(){return this.children.flatMap(c=>c.all);}};
 return {body,createElement:node};
}
async function runBlock(t,{selected,response}){
 const calls=[],document=fakeDocument();
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,options});return response();});
 globalThis.document=document;globalThis.shopify={data:{selected}};
 t.after(()=>{delete globalThis.document;delete globalThis.shopify;});
 const {default:render}=await import('../../ops/shopify/order-block/src/OrderBlock.js');
 await render();return {calls,all:document.body.all};
}
test('block module: one read-only admin request, image and buttons per Gravuru position',async t=>{
 const other=line({Farbe:'rot'},{title:'Zubehör'});
 const {calls,all}=await runBlock(t,{selected:[{id:'gid://shopify/Order/5001'}],response:()=>Response.json({data:{order:{lineItems:{nodes:[line(full),other]}}}})});
 assert.equal(calls.length,1);assert.equal(calls[0].url,'shopify:admin/api/graphql.json');assert.equal(calls[0].options.method,'POST');
 assert.deepEqual(JSON.parse(calls[0].options.body),{query:ORDER_BLOCK_QUERY,variables:{id:'gid://shopify/Order/5001'}});
 assert.equal(all[0].name,'s-admin-block');
 assert.deepEqual(all.filter(n=>n.name==='s-image').map(n=>[n.src,n.alt]),[[src,'Gestaltung: Türschild']]);
 assert.deepEqual(all.filter(n=>n.name==='s-button').map(n=>[n.textContent,n.href,n.target]),[['Gestaltung ansehen',src,'_blank'],['Fertigungsdatei',production,'_blank']]);
 assert.deepEqual(all.filter(n=>n.name==='s-text').map(n=>n.textContent),['2 × Türschild']);
});
test('block module: no Gravuru position, unreadable order or failed request show a short note and no link',async t=>{
 for(const [selected,response,text] of [
  [[{id:'gid://shopify/Order/5001'}],()=>Response.json({data:{order:{lineItems:{nodes:[line({Farbe:'rot'})]}}}}),/keine Gravuru-Gestaltung/],
  [[{id:'gid://shopify/Order/5001'}],()=>Response.json({errors:[{message:'x'}]}),/nicht geladen/],
  [[{id:'gid://shopify/Order/5001'}],()=>new Response('nein',{status:500}),/nicht geladen/],
  [[{id:'gid://shopify/Order/5001'}],()=>{throw Error('offline');},/nicht geladen/],
  [[],()=>assert.fail('ohne Bestellung kein Abruf'),/nicht gelesen/],
  [[{id:'gid://shopify/Product/1'}],()=>assert.fail('fremde Kennung: kein Abruf'),/nicht gelesen/]]){
  await t.test(String(text),async s=>{
   const {all}=await runBlock(s,{selected,response});
   assert.deepEqual(all.filter(n=>['s-image','s-button','s-link'].includes(n.name)),[]);
   assert.match(all.filter(n=>n.name==='s-text').map(n=>n.textContent).join(' '),text);
  });
 }
});
