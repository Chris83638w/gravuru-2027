import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {thankYouPreview,accountPreview} from '../../ops/shopify/thank-you-preview/src/model.mjs';
const src='https://app-2027.gravuru-designwerkstatt.de/gestaltung/acryl/offer_11111111-1111-4111-8111-111111111111/'+'a'.repeat(64)+'.png';
const line=url=>({attributes:[{key:'_gravuru_config',value:'konfig_test'},{key:'_gravuru_bild',value:url}],merchandise:{title:'Türschild'}});
test('thank-you preview uses the immutable position image and spelling reminder',()=>{assert.deepEqual(thankYouPreview(line(src)),{src,alt:'Deine Gestaltung: Türschild',message:'Bitte prüfe die Schreibweise.'});});
test('thank-you rejects absent properties, foreign URLs, query tokens and editor links',()=>{for(const url of [undefined,src.replace('https:','http:'),src.replace('app-2027.gravuru-designwerkstatt.de','evil.example'),src+'?token=secret','https://app-2027.gravuru-designwerkstatt.de/werkstatt/'])assert.equal(thankYouPreview(line(url)),null);assert.equal(thankYouPreview({attributes:[]}),null);assert.equal(thankYouPreview(),null);});
// #265 Stufe C, ENTSCHEIDUNGEN 3.53 (4): Kundenkonto – dieselbe Prüfung, nur das Bild; beide Ziele in einer Extension.
const rejected=[undefined,null,7,'',src.replace('https:','http:'),src.replace('app-2027.gravuru-designwerkstatt.de','evil.example'),src.replace('app-2027.','app-2027.gravuru-designwerkstatt.de.evil.'),src+'?token=secret',src+'#x',src.replace('.png','.jpg'),src.replace('/offer_','/proof_'),src.replace('/gestaltung/','/werkstatt/'),' '+src,src+'\n','https://app-2027.gravuru-designwerkstatt.de/werkstatt/'];
test('customer account shows the same trusted image without the spelling sentence',()=>{
 assert.deepEqual(accountPreview(line(src)),{src,alt:'Deine Gestaltung: Türschild'});
 assert.deepEqual(accountPreview({attributes:line(src).attributes}),{src,alt:'Deine Gestaltung: Personalisiertes Produkt'});
});
test('customer account rejects exactly what the thank-you page rejects and shows nothing then',()=>{
 for(const url of rejected){assert.equal(thankYouPreview(line(url)),null,String(url));assert.equal(accountPreview(line(url)),null,String(url));}
 // Ohne Konfigurationskennung zeigt auch eine gültige Bildadresse nichts.
 for(const value of [{attributes:[{key:'_gravuru_bild',value:src}]},{attributes:[]},{},null,undefined])assert.equal(accountPreview(value),null);
});
test('one extension carries both targets; each module exists and reads only the position',()=>{
 const base=new URL('../../ops/shopify/thank-you-preview/',import.meta.url),toml=fs.readFileSync(new URL('shopify.extension.toml',base),'utf8');
 const targets=[...toml.matchAll(/\[\[extensions\.targeting\]\]\ntarget = "([^"]+)"\nmodule = "\.\/src\/([A-Za-z]+\.js)"/g)].map(m=>[m[1],m[2]]);
 assert.deepEqual(targets,[['purchase.thank-you.cart-line-item.render-after','ThankYou.js'],['customer-account.order-status.cart-line-item.render-after','OrderStatus.js']]);
 assert.match(toml,/^api_version = "2025-10"$/m);assert.equal(toml.match(/^\[\[extensions\]\]$/gm).length,1);
 for(const [,module] of targets){
  const source=fs.readFileSync(new URL('src/'+module,base),'utf8');
  assert.match(source,/from '\.\/model\.mjs'/);assert.match(source,/shopify\.target\.value/);assert.match(source,/shopify\.target\.subscribe/);
  // Kein Speichern, kein Netzabruf, keine fremde Adresse im Modul.
  for(const forbidden of [/fetch\(/,/https?:\/\//,/localStorage|sessionStorage|cookie/i,/shopify\.(?!target\b)/])assert.doesNotMatch(source.replace(/^\s*\/\/.*$/gm,''),forbidden,module);
 }
});

// Nachgebildetes DOM (kein Shopify-Laufzeitnachweis): das Kundenkonto-Modul zeigt das geprüfte Bild als Verweis, sonst nichts.
test('customer account module renders the trusted image as a link and clears itself otherwise',async t=>{
 const body={children:[],replaceChildren(...items){this.children=items;}},created=[];let subscriber=null;
 globalThis.document={body,createElement:name=>{const node={name,children:[],append(...items){this.children.push(...items);}};created.push(node);return node;}};
 globalThis.shopify={target:{value:line(src),subscribe:fn=>{subscriber=fn;}}};
 t.after(()=>{delete globalThis.document;delete globalThis.shopify;});
 (await import('../../ops/shopify/thank-you-preview/src/OrderStatus.js')).default();
 assert.equal(body.children.length,1);const [link]=body.children;
 assert.deepEqual([link.name,link.href,link.target],['s-link',src,'_blank']);
 assert.deepEqual(link.children.map(n=>[n.name,n.src,n.alt]),[['s-image',src,'Deine Gestaltung: Türschild']]);
 assert.equal(created.some(n=>n.name==='s-text'),false,'kein Satz zur Schreibweise im Kundenkonto');
 subscriber(line(src+'?token=secret'));assert.deepEqual(body.children,[]);
 subscriber(line(src));assert.equal(body.children[0].href,src);
});
