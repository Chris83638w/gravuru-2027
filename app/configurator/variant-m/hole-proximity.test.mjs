import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {textsNearHoles,holeHintText} from '../../platform/sources/app/shared/models/hole-proximity.mjs';
import {keepoutPreview} from './option-media.mjs';
import {selectedProfile} from './contract.mjs';
import {familyProductConfig} from '../../workshop/product-families.mjs';
import {workshopResources} from '../../workshop/catalog.mjs';

const family=JSON.parse(fs.readFileSync(new URL('../../designs/steel-door-signs/family.json',import.meta.url)));
const config=familyProductConfig(family,family.sizes.find(s=>s.key==='GR-ES-OV-90X60-T15'),1),fonts=workshopResources().fonts;
const text=(x,y,extra={})=>({id:'t',type:'text',text:'Müller',font:'Montserrat',size:5,x,y,w:1,h:1,rotation:0,color:'#000000',...extra});

test('B02 option carries the 1 mm keep-out into the selected profile; K00 has no holes',()=>{
 const b02=selectedProfile(config,{mounting:'B02'}),k00=selectedProfile(config,{mounting:'K00'});
 assert.deepEqual(b02.geometry.holes,[{x:6,y:30,diameter:4},{x:84,y:30,diameter:4}]);assert.equal(b02.mountingPreview.keepoutMm,1);
 assert.deepEqual(k00.geometry.holes,[]);
});

test('texts touching the protection zone get a hint; motifs and photos never do',()=>{
 const p=selectedProfile(config,{mounting:'B02'});
 assert.equal(textsNearHoles({objects:[text(45,30)]},p,fonts).length,0,'centred text is free');
 const near=textsNearHoles({objects:[text(14,30)]},p,fonts);assert.equal(near.length,1);assert.deepEqual(near[0].hole,{x:6,y:30});
 assert.match(holeHintText(near),/„Müller“ liegt im Bereich eines Bohrlochs/);
 assert.equal(textsNearHoles({objects:[{id:'m',type:'motif',x:6,y:30,w:10,h:10,rotation:0},{id:'p',type:'photoSlot',x:84,y:30,w:10,h:10,rotation:0}]},p,fonts).length,0);
 assert.equal(textsNearHoles({objects:[text(14,30)]},selectedProfile(config,{mounting:'K00'}),fonts).length,0,'no holes, no hint');
 assert.equal(textsNearHoles({objects:[text(14,30,{uxHidden:true})]},p,fonts).length,0);
 // Exactly at the zone border: box edge 3 mm from hole centre (2 mm radius + 1 mm keep-out) is free.
 assert.equal(textsNearHoles({objects:[{id:'b',type:'text',text:'x',x:14,y:30,w:10,h:4,rotation:0}]},p,null).length,0);
 assert.equal(textsNearHoles({objects:[{id:'b',type:'text',text:'x',x:13.9,y:30,w:10,h:4,rotation:0}]},p,null).length,1);
 // Rotation is respected: a long text rotated 90° no longer reaches the hole.
 assert.equal(textsNearHoles({objects:[{id:'r',type:'text',text:'x',x:20,y:30,w:24,h:3,rotation:0}]},p,null).length,1);
 assert.equal(textsNearHoles({objects:[{id:'r',type:'text',text:'x',x:20,y:30,w:24,h:3,rotation:90}]},p,null).length,0);
});

// Chris 22./23.10.2026: Der Kundenhinweis „Text in der Bohrloch-Schutzzone“ entfällt im Kundeneditor; die
// mechanische Prüfung (mounting-access, nicht ignorierbar) und die Überlagerungswarnung bei Gravur bleiben.
// Das Modell hole-proximity bleibt für Werkstatt-Prüfvermerk (acrylic-review) und Händlervorschau (product-preview).
test('Bohrloch-Hinweis: nicht mehr im Kundeneditor (adapter), weiter in Werkstatt-Prüfung und Händlervorschau',()=>{
 const read=file=>fs.readFileSync(new URL(file,import.meta.url),'utf8');
 const adapter=read('./adapter.mjs');
 assert.doesNotMatch(adapter,/import [^;]*hole-proximity|textsNearHoles\(|holeHintText\(|mHoleHint/,'Kundeneditor erzeugt keinen Bohrloch-Hinweis mehr');
 assert.match(adapter,/Kein Kundenhinweis „Text in der Bohrloch-Schutzzone“ mehr/);
 assert.match(read('../../workshop/acrylic-review.mjs'),/textsNearHoles\(state\.design,selectedProfile\(config,state\.options\)/,'Werkstatt-Prüfvermerk bleibt');
 assert.match(read('../../workshop/product-preview.mjs'),/holeHintText\(textsNearHoles\(d,p,config\.localResources\.fonts\)\)/,'Händlervorschau bleibt');
 // Mechanische Prüfung bleibt unverändert und nicht ignorierbar; Überlagerungswarnung nur bei Gravur.
 const tools=read('./customer-tools.mjs');
 assert.match(tools,/const issue=mechanicalHints\(profile,el\.state\)\[0\];if\(!issue\)return;e\.preventDefault\(\);e\.stopImmediatePropagation\(\);say\(issue\.message\);/);
 assert.match(tools,/if\(hint&&hint\.code!=='mounting-access'\)ignored\.add\(hint\.key\)/);
 assert.match(read('./customer-tools-model.mjs'),/return getProcessingProfile\(profile\)\.method==='engraving';/);
});

test('protection zones are a preview layer only and appear only when requested',()=>{
 const p=selectedProfile(config,{mounting:'B02'}),svg='<svg viewBox="0 0 90 60"><rect/></svg>';
 assert.equal(keepoutPreview(svg,p,{show:false}),svg);
 const shown=keepoutPreview(svg,p);assert.match(shown,/data-m-keepout="true"[^>]*pointer-events="none"/);assert.equal((shown.match(/<circle /g)||[]).length,2);assert.match(shown,/r="3"/);
 assert.equal(keepoutPreview(svg,selectedProfile(config,{mounting:'K00'})),svg);
});
