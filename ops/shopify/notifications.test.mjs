import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {thankYouPreview} from './thank-you-preview/src/model.mjs';

// #265 Stufe C, ENTSCHEIDUNGEN 3.53/3.57: Die Bausteine der Bestellbestätigung passen zum heutigen Stand der Eigenschaften.
// Explizite lokale Testabhängigkeit wie in cart-edit-r15-theme.test.mjs (LiquidJS, nie Teil von Shopify oder Kundenlaufzeit).
// Fehlt sie, werden nur die Render-Prüfungen übersprungen; die Prüfungen am Quelltext laufen immer.
const root=fileURLToPath(new URL('../../',import.meta.url));
let Liquid=null;try{({Liquid}=createRequire(import.meta.url)(process.env.GRAVURU_LIQUIDJS_MODULE||path.join(root,'.local-data/liquidjs/package/dist/liquid.browser.umd.js')));}catch{/* siehe skip */}
const skip=Liquid?false:'LiquidJS lokal nicht vorhanden (GRAVURU_LIQUIDJS_MODULE oder .local-data/liquidjs)';
const read=name=>fs.readFileSync(new URL('./notifications/'+name,import.meta.url),'utf8');
const image=read('gravuru-bestellbestaetigung-bild.liquid'),properties=read('gravuru-bestellbestaetigung-eigenschaften.liquid');
const src='https://app-2027.gravuru-designwerkstatt.de/gestaltung/acryl/offer_11111111-1111-4111-8111-111111111111/'+'a'.repeat(64)+'.png';
const engine=()=>{const e=new Liquid({strictFilters:true});e.registerFilter('img_url',(line,size)=>'https://cdn.shopify.com/produktbild-'+size+'.jpg');return e;};
const line=(extra={},image={})=>({title:'Türschild "Familie"',image,properties:{_gravuru_config:'konfig_test',_gravuru_bild:src,...extra}});

test('image cell reads today\'s property names and the fixed own image address',()=>{
 assert.match(image,/line\.properties\['_gravuru_bild'\]/);assert.match(image,/line\.properties\['_gravuru_config'\] != blank/);
 assert.match(image,/assign gv_root = 'https:\/\/app-2027\.gravuru-designwerkstatt\.de\/gestaltung\/'/);
 // Dieselbe Adresse nimmt auch die Danke-Seite an; die alte Datei-Eigenschaft `_Entwurf` (ENTSCHEIDUNGEN 3.52/3.53) kommt nicht vor.
 assert.ok(thankYouPreview({attributes:[{key:'_gravuru_config',value:'konfig_test'},{key:'_gravuru_bild',value:src}]}));
 assert.ok(src.startsWith('https://app-2027.gravuru-designwerkstatt.de/gestaltung/')&&src.endsWith('.png'));
 for(const text of [image,properties])assert.doesNotMatch(text.replace(/\{% comment %\}[\s\S]*?\{% endcomment %\}/g,''),/_Entwurf|cdn\.shopify|fileCreate/);
});

test('image cell: the saved design from the own server, otherwise the product image, never a foreign address',{skip},async()=>{
 const render=value=>engine().parseAndRender(image,{line:value});
 const shown=await render(line());
 assert.match(shown,new RegExp('<a href="'+src+'" target="_blank"'));assert.match(shown,new RegExp('<img src="'+src+'" alt="Ihre Gestaltung: Türschild (?:&quot;|&#34;)Familie(?:&quot;|&#34;)"'));
 assert.match(shown,/Bitte prüfe die Schreibweise\./);assert.doesNotMatch(shown,/cdn\.shopify/);
 for(const [name,value] of [['fehlt',line({_gravuru_bild:undefined})],['fremder Host',line({_gravuru_bild:src.replace('app-2027.gravuru-designwerkstatt.de','evil.example')})],['http',line({_gravuru_bild:src.replace('https:','http:')})],['JPG',line({_gravuru_bild:src.replace('.png','.jpg')})],['Marke angehängt',line({_gravuru_bild:src+'?token=secret'})],['ohne Konfiguration',line({_gravuru_config:''})],['Werkstatt-Adresse',line({_gravuru_bild:'https://app-2027.gravuru-designwerkstatt.de/werkstatt/x.png'})]]){
  const html=await render(value);
  assert.match(html,/<img src="https:\/\/cdn\.shopify\.com\/produktbild-320x\.jpg"/,name);assert.doesNotMatch(html,/evil\.example|gravuru-designwerkstatt|Schreibweise/,name);
 }
 // Ohne Gestaltung und ohne Produktbild bleibt die Zelle leer.
 assert.equal((await render({title:'x',image:null,properties:{}})).trim(),'');
 // Sonderzeichen in einer Adresse des eigenen Servers können das Attribut nicht verlassen.
 const hostile=await render(line({_gravuru_bild:'https://app-2027.gravuru-designwerkstatt.de/gestaltung/x"onerror="alert(1).png'}));
 // (LiquidJS schreibt das Anführungszeichen als &#34;, Shopify als &quot; – beides bleibt im Attribut.)
 assert.doesNotMatch(hostile,/"onerror="/);assert.match(hostile,/(?:&quot;|&#34;)onerror=(?:&quot;|&#34;)/);
});

test('properties block: private properties, „Bearbeitbarer Entwurf“ and „Bearbeiten“ are hidden; customer texts stay',{skip},async()=>{
 // So wird die Bedingung in die vorhandene Schleife der Vorlage eingesetzt.
 const template='{% for property in line.properties %}'+properties+'{% if gv_show %}[{{ property.first }}={{ property.last }}]{% endif %}{% endfor %}';
 const value={properties:{_gravuru_offer:'b'.repeat(64),_gravuru_config:'konfig_test',_gravuru_rev:'1',Design:'Leuchtturm',Gravurtext:'Familie Müller','Gravurtext 2':'seit 2020',Format:'120 × 80 mm',_gravuru_bearbeiten:'https://shop.example/apps/konfigurator/start?config=konfig_test',_gravuru_bild:src,_gravuru_fertigung:'https://app-2027.gravuru-designwerkstatt.de/werkstatt/bestellungen/',_gravuru_motifs:'1',_gravuru_uploads:'0',_gravuru_revision:'7','Bearbeitbarer Entwurf':'gravuru:proof_test:'+'c'.repeat(64),Bearbeiten:'https://shop.example/products/tafel?config=konfig_test&rev=1',Leer:'',Befestigung:'Bohrlöcher'}};
 const html=(await engine().parseAndRender(template,{line:value})).trim();
 assert.equal(html,'[Design=Leuchtturm][Gravurtext=Familie Müller][Gravurtext 2=seit 2020][Format=120 × 80 mm][Befestigung=Bohrlöcher]');
 for(const hidden of ['_gravuru','Bearbeitbarer Entwurf','Bearbeiten','proof_test','werkstatt','konfigurator','Leer'])assert.ok(!html.includes(hidden),hidden);
 // Die Bedingung selbst gibt nichts aus und legt keine zweite Schleife an.
 assert.equal((await engine().parseAndRender(properties,{property:['Design','x']})).trim(),'');
 assert.doesNotMatch(properties.replace(/\{% comment %\}[\s\S]*?\{% endcomment %\}/g,''),/\bfor\b|\bendfor\b/);
});
