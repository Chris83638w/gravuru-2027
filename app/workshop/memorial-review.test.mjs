import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {memorialReviewConfig} from './memorial-review.mjs';
import {prepareConfig,selectedProfile,resolvedOptions,quote,saveDraft,readDraft,validateDesign} from '../configurator/variant-m/contract.mjs';
import {optionFieldEntries} from '../configurator/variant-m/contract.mjs';
import {photoAvailableForDesign} from '../configurator/variant-m/ux-model.mjs';
import {spacerPreview} from '../configurator/variant-m/option-media.mjs';
import {workshopResources} from './catalog.mjs';
import {katalogDesignToTemplate} from './katalog-convert.mjs';
import {textLimits,clampText} from './theme-limits.mjs';
import {validateDesignContent} from '../platform/sources/app/shared/models/design-content.mjs';

const drawings=JSON.parse(fs.readFileSync(new URL('../../docs/handoffs/design-start-mika/schiefer/konturen-und-loecher.json',import.meta.url)));
const fonts=workshopResources().fonts;
const family={id:'gedenktafel-22x14-schiefer-natur',material:{kind:'slate',thicknessMm:5,processingProfileId:'slate-engraving'},designArea:{marginMm:0}};
const template={id:'review-test',name:'Test',marks:[],objects:[{id:'name',type:'text',text:'Name',font:'Montserrat',size:8,x:110,y:40,w:30,h:8,rotation:0,color:'#b3b3b3',bold:false,customerEditable:true,required:false}],importedSource:{id:'review-test'}};
const config=()=>memorialReviewConfig({family,drawings,templates:[template],fonts,motifs:[],rights:{}});

test('long memorial sayings survive input and draft validation; other products keep their contracts',()=>{
 const c=config(),d=structuredClone(template),o=d.objects[0];
 // Six lines beyond both the former 80 and default 180 characters.
 o.text=Array(6).fill('Du bleibst für immer in unseren Herzen.').join('\n');
 const limits=textLimits(o,d,c.profile,c);
 assert.ok(o.text.length>180);assert.equal(clampText(o.text,limits),o.text);
 validateDesignContent(d,{universal:true,maxTextLength:limits.maxLength});
 assert.throws(()=>validateDesignContent(d,{universal:true}),/180 Zeichen/);
 assert.equal(textLimits(o,d,c.profile,{textRules:{maxCharsPerField:80}}).maxLength,80);
 const source=structuredClone(c);source.profile.designs=[d];
 const ready=prepareConfig(source),saved=saveDraft(ready,{designId:d.id,objects:d.objects},{},fonts,[],{draft:true});
 assert.equal(readDraft(ready,saved,fonts,[],{draft:true}).design.objects[0].text,o.text);
});

test('Gedenktafel uses the exact two independent source drill patterns',()=>{
 const c=config();
 assert.deepEqual(selectedProfile(c,{mounting:'B02'}).geometry.holes,[{x:17,y:69.9,diameter:4},{x:203,y:69.9,diameter:4}]);
 assert.deepEqual(selectedProfile(c,{mounting:'B04-AH04'}).geometry.holes,[{x:17.1,y:17,diameter:8},{x:203.1,y:17,diameter:8},{x:17.1,y:123,diameter:8},{x:203.1,y:123,diameter:8}]);
 assert.equal(selectedProfile(c,{mounting:'B04'}).geometry.holes.length,4);
 assert.equal(selectedProfile(c,{mounting:'B02-AH02'}).mountingPreview.diameter,12);
 assert.equal(c.profile.geometry.safeMarginMm,0);
 assert.throws(()=>memorialReviewConfig({family,drawings:[],templates:[template],fonts,motifs:[],rights:{}}),/nicht eindeutig/);
});
test('silicone is one mounting choice; stand and spray remain independent through draft roundtrip',()=>{
 const c=config(),options={mounting:'SIL',stand:'black',protector:true};
 assert.deepEqual(resolvedOptions(c,options),options);
 assert.deepEqual(selectedProfile(c,options).geometry.holes,[]);
 assert.deepEqual(resolvedOptions(c,{...options,mounting:'B02-AH02','spacer-color':'gold'}),{mounting:'B02-AH02','spacer-color':'gold',stand:'black',protector:true});
 const saved=saveDraft(c,{designId:template.id,objects:template.objects},options,fonts,[],{draft:true});
 const restored=readDraft(c,saved,fonts,[],{draft:true});
 assert.deepEqual(restored.options,options);assert.deepEqual(restored.design.objects,saved.design.objects);
 assert.equal(resolvedOptions(c,{mounting:'SIL','spacer-color':'gold'} )['spacer-color'],undefined);
});
test('open prices are not zero and cannot reach a payable quote or a live profile',()=>{
 const c=config();
 assert.equal(c.profile.optionFields[0].choices[0].priceCents,null);
 assert.throws(()=>quote(c,template.objects,template.id,{mounting:'K00'}),/Preis noch offen/);
 assert.throws(()=>optionFieldEntries(c,{stand:'clear'}),/Preis noch offen/);
 assert.throws(()=>prepareConfig({...c,basePriceCents:2299,extraMotifCents:169}),/Centbeträge/);
 const live=structuredClone(c);live.reviewOnly=false;live.profile.binding.kind='shopify';live.profile.features.orderEnabled=true;
 assert.throws(()=>prepareConfig(live),/lokalen Prüfprodukt|Centbeträge/);
});
test('photos on a design without a photo field are explicit opt-in, never enabled for steel',()=>{
 const c=config();assert.equal(photoAvailableForDesign(c,template.id),true);
 const d=structuredClone(template);d.objects.push({id:'photo-new',type:'photoSlot',photoShape:'rect',x:70,y:90,w:40,h:40,rotation:0,color:'#b3b3b3',customerEditable:true,fieldKey:'photo-new',required:false});
 validateDesign(c,d,{mounting:'K00'},fonts,[],{draft:true});
 const older=structuredClone(c);delete older.photo.allowOnAllDesigns;
 assert.equal(photoAvailableForDesign(older,template.id),false);
 assert.throws(()=>validateDesign(older,d,{},fonts,[],{draft:true}),/keinen freigegebenen Fotobereich/);
 const steel=structuredClone(c);steel.profile.material.kind='steel';steel.profile.processing.profileId='steel-engraving';
 assert.throws(()=>prepareConfig(steel),/Fotos sind für dieses Verfahren/);
});
test('option media cannot invent choices or execute external content; hardware is preview-only',()=>{
 const c=config(),url='data:image/png;base64,aGVsbG8=';
 c.spacerImages={gold:url};c.optionImages={'stand:clear':url};
 const ready=prepareConfig(c),p=selectedProfile(ready,{mounting:'B02-AH02','spacer-color':'gold'});
 assert.equal(p.mountingPreview.image,url);
 assert.match(spacerPreview('<svg></svg>',p),/data-role="guide"/);
 assert.match(spacerPreview('<svg></svg>',p),/width="12" height="12"/);
 assert.match(spacerPreview('<svg></svg>',p),/href="data:image/);
 assert.match(spacerPreview('<svg></svg>',p,{screen:true}),/href="blob:/);
 assert.equal(spacerPreview('<svg></svg>',p,{screen:true}),spacerPreview('<svg></svg>',p,{screen:true}));
 assert.throws(()=>prepareConfig({...c,optionImages:{bogus:url}}),/Zuordnung/);
 assert.throws(()=>prepareConfig({...c,spacerImages:{gold:'javascript:alert(1)'}}),/Zuordnung/);
});
test('PR72 source fix: engraving keeps unfilled strokes, evenodd openings and opacity',()=>{
 const svg='<svg viewBox="0 0 220 140"><g id="motiv-frame"><path d="M0 0 L220 0 L220 140 L0 140 Z" fill="none" stroke="#fff" stroke-width="0.7" fill-rule="evenodd" opacity="0.5"/></g><text id="text-name" x="110" y="60" font-family="Montserrat" font-size="8">Name</text></svg>';
 const result=katalogDesignToTemplate({id:'regression',name:'Rahmen',themes:[],fields:{}},family,null,{fonts,svgText:svg});
 assert.equal(result.motifs.length,1);
 assert.match(result.motifs[0].svgFragment,/fill="none" fill-rule="evenodd" stroke="currentColor" stroke-width="0.7" opacity="0.5"/);
 assert.equal(result.notes.some(n=>n.includes('Plattenfläche')),false);
});
