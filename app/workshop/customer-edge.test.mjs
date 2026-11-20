// Rand frei außer bei Edelstahl.
// Chris, 20.11.2026, 19:26 Uhr, auf die Frage, ob auch das, was der Kunde selbst über den Rand schiebt, in den Warenkorb
// gehen soll: „Doch soll können, aber nicht beim Edelstahl“. Auf Rückfrage gewählt: „Randsperre weg“ (Elemente lassen sich
// über den Rand schieben und vergrößern; die Vorschau zeigt sie abgeschnitten, so wird gefertigt) und „Kurzer Hinweis“
// (ein neutraler Satz, keine Sperre, kein Dialog). Das ersetzt für diese Produkte seine Regel vom 20.10.2026
// („bis an den Rand …, aber nicht weiter“); für Edelstahl gilt sie weiter.
// Festlegungen von Claude, Chris mitgeteilt: Klingelschilder bleiben unverändert, und die Mitte eines Elements bleibt auf
// dem Schild. Die Prüfungen der Werkstatt für Vorlagen bleiben streng.
import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareConfig,validateDesign,customerLayoutIssue,customerBlockingIssue} from '../configurator/variant-m/contract.mjs';
import {layoutReviewIssues} from '../configurator/variant-m/layout-review.mjs';
import {keepCentreOnPlate,installEdgeClamp,settleInside} from '../configurator/variant-m/edge-clamp.mjs';
import {cutOffObjects,EDGE_NOTE} from '../configurator/variant-m/usability.mjs';
import {edgeFree,pointOnPlate,isBoundaryIssue,OFF_PLATE_ISSUE} from '../platform/sources/app/shared/models/design-content.mjs';
import {DOORBELL_SCHEMA} from '../configurator/variant-m/product-model-module.mjs';
import {fixedSignConfig} from './test-fixtures/door-sign-all-sizes.mjs';

// Dieselbe Vorlage einmal als Edelstahl (wie im Katalog) und einmal als Acrylglas.
function product(kind){
 const config=structuredClone(fixedSignConfig(2));
 if(kind!=='steel'){
  // Wie die Acrylglas-Schilder im Shop: dunkles Acrylglas, von hinten graviert.
  const acrylicFields={kind,variant:'schwarz',engravingSide:'back'};
  config.profile.material={...config.profile.material,...acrylicFields};config.profile.processing={profileId:kind+'-engraving'};
  for(const format of config.familyFormats.formats)for(const variant of format.variants)variant.material={...variant.material,...acrylicFields};
 }
 return prepareConfig(config);
}
const design=config=>structuredClone(config.profile.designs[0]);
const moved=(config,change)=>{const d=design(config);Object.assign(d.objects[0],change);return d;};
const check=(config,d,extra)=>validateDesign(config,d,{mounting:'K00'},config.localResources.fonts,config.localResources.motifs||[],extra);
const steel=product('steel'),acrylic=product('acrylic');
const W=acrylic.profile.geometry.width,H=acrylic.profile.geometry.height;

test('die Regel: frei bei allem außer Edelstahl und Klingelschildern; ohne Materialangabe bleibt es streng',()=>{
 assert.equal(steel.profile.material.kind,'steel');assert.equal(acrylic.profile.material.kind,'acrylic');
 assert.equal(edgeFree(steel.profile),false);assert.equal(edgeFree(acrylic.profile),true);
 for(const kind of ['acrylic','wood','slate','other','print'])assert.equal(edgeFree({kind:'universal-product',material:{kind}}),true,kind);
 assert.equal(edgeFree({kind:'layered-doorbell',material:{kind:'acrylic'}}),false);
 assert.equal(edgeFree({kind:'universal-product',doorbellSchema:DOORBELL_SCHEMA,material:{kind:'acrylic'}}),false);
 assert.equal(edgeFree({kind:'universal-product'}),false);assert.equal(edgeFree(null),false);
});

test('Acrylglas: ein Text, der über den Rand ragt, wird angenommen; liegt seine Mitte neben dem Schild, nicht',()=>{
 const text=acrylic.profile.designs[0].objects[0];
 // Rechte Kante: Mitte 1 mm vor dem Rand, der Text ragt also weit hinaus.
 const over=moved(acrylic,{x:W-1});
 assert.ok(isBoundaryIssue(customerLayoutIssue(over.objects[0],acrylic.profile,{fonts:acrylic.localResources.fonts})),'die strenge Lageprüfung meldet es weiter');
 assert.equal(customerBlockingIssue(over.objects[0],acrylic.profile,{fonts:acrylic.localResources.fonts}),'');
 assert.doesNotThrow(()=>check(acrylic,over));
 assert.doesNotThrow(()=>check(acrylic,moved(acrylic,{y:1})),'oben');
 assert.doesNotThrow(()=>check(acrylic,moved(acrylic,{x:1,y:H-1})),'Ecke unten links');
 // Mitte neben dem Schild: Das Element wäre ganz oder fast ganz abgeschnitten.
 assert.throws(()=>check(acrylic,moved(acrylic,{x:W+1})),/nicht mehr auf dem Schild/);
 assert.throws(()=>check(acrylic,moved(acrylic,{x:1000})),/nicht mehr auf dem Schild/);
 assert.equal(customerBlockingIssue({...text,x:W+1},acrylic.profile,{fonts:acrylic.localResources.fonts}),OFF_PLATE_ISSUE);
 // Andere Befunde bleiben Fehler.
 assert.throws(()=>check(acrylic,moved(acrylic,{w:-1})));
});

test('Edelstahl: unverändert streng, schon ein Text über dem Rand wird abgelehnt',()=>{
 assert.throws(()=>check(steel,moved(steel,{x:W-1})),/Gestaltungsfläche/);
 assert.throws(()=>check(steel,moved(steel,{x:1000})),/Gestaltungsfläche/);
 assert.ok(isBoundaryIssue(customerBlockingIssue(moved(steel,{x:W-1}).objects[0],steel.profile,{fonts:steel.localResources.fonts})));
});

test('Vorlagen bleiben auch bei Acrylglas streng: Werkstatt und Katalog-Umrechnung entscheiden weiter',()=>{
 assert.throws(()=>check(acrylic,moved(acrylic,{x:W-1}),{template:true}),/Gestaltungsfläche/);
 const withBadTemplate=structuredClone(acrylic);
 for(const list of [withBadTemplate.profile.designs,withBadTemplate.familyFormats.designs])list[0].objects[0].x=W-1;
 assert.throws(()=>prepareConfig(withBadTemplate),/Gestaltungsfläche/);
});

test('Prüfung vor dem Warenkorb: bei Acrylglas kein Befund für ein Element über dem Rand, bei Edelstahl wie bisher',()=>{
 const issues=(config,change)=>layoutReviewIssues({config,profile:config.profile,objects:moved(config,change).objects,design:config.profile.designs[0],resources:{fonts:config.localResources.fonts,motifs:[]}});
 assert.deepEqual(issues(acrylic,{x:W-1}),[]);
 assert.deepEqual(issues(acrylic,{x:W+1}).map(i=>i.code),['boundary'],'Mitte neben dem Schild sperrt weiter');
 assert.deepEqual(issues(steel,{x:W-1}).map(i=>i.code),['boundary']);
});

test('die Mitte bleibt auf dem Schild: Rechteck, gerundet, oval; gesperrte Elemente bleiben unberührt',()=>{
 const rect={shape:'rect',width:120,height:80};
 const partly={x:118,y:40,w:40,h:10,rotation:0};assert.equal(keepCentreOnPlate(partly,rect),false);assert.equal(partly.x,118);
 const out={x:150,y:40,w:40,h:10,rotation:0};assert.equal(keepCentreOnPlate(out,rect),true);
 assert.equal(out.x,120,'bis an den Rand zurück');assert.equal(out.y,40);
 const along={x:150,y:10,w:40,h:10,rotation:0};keepCentreOnPlate(along,rect);assert.deepEqual([along.x,along.y],[120,10],'am Rand entlang: die Höhe bleibt');assert.equal(keepCentreOnPlate(out,rect),false,'zweites Zeichnen verschiebt nicht noch einmal');
 const corner={x:-30,y:-30,w:10,h:10,rotation:0};keepCentreOnPlate(corner,rect);assert.ok(pointOnPlate(corner,rect));
 for(const geometry of [{shape:'ellipse',width:120,height:80},{shape:'rect',width:120,height:80,cornerRadiusMm:20}]){
  const o={x:1,y:1,w:10,h:10,rotation:0};assert.equal(pointOnPlate(o,geometry),false);
  assert.equal(keepCentreOnPlate(o,geometry),true);assert.ok(pointOnPlate(o,geometry));assert.ok(o.x<20&&o.y<20,'nur so weit wie nötig');
 }
 for(const fixed of [{locked:true},{uxLocked:true},{role:'guide'},{uxHidden:true},{uxDecoration:true,customerEditable:false}]){
  const o={x:500,y:40,w:10,h:10,rotation:0,...fixed};assert.equal(keepCentreOnPlate(o,rect),false);assert.equal(o.x,500);
 }
});

test('vor jedem Zeichnen: Acrylglas lässt das Element über dem Rand stehen, Edelstahl holt es wie bisher ganz zurück',()=>{
 const el=profile=>({state:{width:120,height:80,objects:[{id:'a',type:'motif',x:118,y:40,w:40,h:10,rotation:0},{id:'b',type:'motif',x:200,y:40,w:40,h:10,rotation:0}]},uxSelectedProfile:()=>profile,render(){return 'ok';}});
 const free=el({kind:'universal-product',material:{kind:'acrylic'},geometry:{width:120,height:80}});
 installEdgeClamp(free,{profile:free.uxSelectedProfile()});assert.equal(free.render(),'ok');
 assert.equal(free.state.objects[0].x,118,'ragt 18 mm über den Rand und bleibt dort');
 assert.ok(Math.abs(free.state.objects[1].x-120)<.01,'Mitte zurück auf den Rand');
 const strict=el({kind:'universal-product',material:{kind:'steel'},geometry:{width:120,height:80}});
 installEdgeClamp(strict,{profile:strict.uxSelectedProfile()});strict.render();
 assert.deepEqual(strict.state.objects.map(o=>o.x),[100,100]);
});

test('Hinweis: ein neutraler Satz, sobald ein bewegliches Element über das Schild ragt',()=>{
 assert.equal(EDGE_NOTE,'Teile außerhalb des Schilds werden abgeschnitten.');
 const geometry={shape:'rect',width:120,height:80,safeMarginMm:2};
 // Buchstaben eines Textes: schmaler als sein Kasten (wie bei D808).
 const glyphs=o=>({x:-o.w/2+3,y:-o.h/2+3,width:o.w-6,height:o.h-6});
 const objects=[
  {id:'innen',type:'text',text:'Name',x:60,y:40,w:40,h:10,rotation:0},
  {id:'nurKasten',type:'text',text:'Name',x:60,y:4,w:40,h:10,rotation:0}, // Kasten ragt oben 1 mm hinaus, Buchstaben nicht
  {id:'text',type:'text',text:'Name',x:110,y:40,w:40,h:10,rotation:0},
  {id:'motiv',type:'motif',x:60,y:78,w:20,h:20,rotation:0},
  {id:'randabstand',type:'motif',x:11,y:40,w:20,h:20,rotation:0}, // im Randabstand, aber auf dem Schild
  {id:'leer',type:'text',text:'  ',x:500,y:40,w:40,h:10,rotation:0},
  {id:'fest',type:'motif',x:119,y:40,w:20,h:20,rotation:0,uxDecoration:true,customerEditable:false},
  {id:'hinten',type:'motif',x:119,y:40,w:20,h:20,rotation:0,surfaceId:'back'}
 ];
 assert.deepEqual(cutOffObjects(objects,'front',geometry,glyphs),['text','motiv']);
 assert.deepEqual(cutOffObjects(objects,'back',geometry,glyphs),['hinten']);
});

// Chris 20.11.2026, 21:03 Uhr: „Ja“ – den Befund am Edelstahl-Türschild beheben. Die Randsperre ließ den Namen am äußersten
// Rand stehen, die Prüfung vor dem Warenkorb meldete dort „Bitte Gestaltung prüfen“ (und der Server hätte abgelehnt).
// Jetzt gilt nach der Randsperre dieselbe Lageprüfung als letzte Instanz.
test('settleInside: rückt nur so weit zur Schildmitte, bis die Prüfung nicht mehr sperrt, und auf dem kürzesten Weg',()=>{
 const geometry={width:120,height:80};
 // Sperrt nicht: nichts passiert.
 let o={x:60,y:40,w:10,h:5};assert.equal(settleInside(o,geometry,()=>false),false);assert.deepEqual([o.x,o.y],[60,40]);
 // Sperrt rechts von 100: nur waagerecht, bis genau an die Grenze.
 o={x:110,y:70,w:10,h:5};assert.equal(settleInside(o,geometry,c=>c.x>100),true);assert.ok(o.x<=100&&o.x>99.999,String(o.x));assert.equal(o.y,70);
 // Sperrt unterhalb von 60: nur senkrecht.
 o={x:110,y:70,w:10,h:5};assert.equal(settleInside(o,geometry,c=>c.y>60),true);assert.equal(o.x,110);assert.ok(o.y<=60&&o.y>59.999,String(o.y));
 // Braucht beide Richtungen.
 o={x:110,y:70,w:10,h:5};assert.equal(settleInside(o,geometry,c=>c.x>100||c.y>60),true);assert.ok(o.x<=100&&o.y<=60);assert.ok(o.x>99.99&&o.y>59.99,'nicht weiter als nötig: '+JSON.stringify(o));
 // Passt nirgends: bleibt, wo es ist (die Prüfung vor dem Warenkorb meldet es dann wie bisher).
 o={x:110,y:70,w:500,h:5};assert.equal(settleInside(o,geometry,()=>true),false);assert.deepEqual([o.x,o.y],[110,70]);
 // Gesperrte, verborgene und Hilfselemente werden nie bewegt.
 for(const fixed of [{locked:true},{uxLocked:true},{uxHidden:true},{role:'guide'},{uxDecoration:true,customerEditable:false}]){o={x:110,y:70,w:10,h:5,...fixed};assert.equal(settleInside(o,geometry,c=>c.x>100),false);assert.equal(o.x,110);}
});

test('Edelstahl: Was die Randsperre am Rand stehen lässt, nehmen auch die Prüfung vor dem Warenkorb und der Server an',()=>{
 const profile=steel.profile,resources={motifs:steel.localResources.motifs||[],fonts:steel.localResources.fonts},d=design(steel),text=d.objects.find(o=>o.type==='text');
 const blocked=o=>isBoundaryIssue(customerLayoutIssue(o,profile,resources));
 assert.equal(blocked(text),false,'Vorlage liegt auf dem Schild');
 // Die Grenze der strengen Prüfung nach rechts suchen und den Namen 0,3 mm darüber hinaus setzen – so stand er nach dem Ziehen,
 // weil die Sperre an den gezeichneten Buchstaben misst.
 let low=text.x,high=W+text.w;for(let i=0;i<40;i++){const mid=(low+high)/2;if(blocked({...text,x:mid}))high=mid;else low=mid;}
 const limit=low,y=text.y;text.x=limit+0.3;
 assert.equal(blocked(text),true);assert.equal(layoutReviewIssues({config:steel,profile,objects:d.objects,design:d,resources}).length,1,'vorher: Dialog vor dem Warenkorb');
 assert.throws(()=>check(steel,d),/Gestaltungsfläche|ragt/,'vorher: der Server lehnt ab');
 // Wie beim Zeichnen: die Randsperre mit Buchstaben, die 0,3 mm schmaler gemessen sind als die Umrisse der Schrift.
 const el={state:{width:W,height:H,designId:d.id,objects:d.objects},fontData:resources.fonts,uxSelectedProfile:()=>profile,uxProfileGeometry:()=>profile.geometry,
  uxTextBounds:o=>({x:-o.w/2,y:-o.h/2,width:o.w-0.6,height:o.h}),render(){return 'ok';}};
 installEdgeClamp(el,{profile,motifs:resources.motifs});el.render();
 assert.ok(Math.abs(text.x-limit)<0.001,'steht an der Grenze der Prüfung: '+text.x+' statt '+limit);assert.equal(text.y,y,'nur waagerecht bewegt');
 assert.equal(layoutReviewIssues({config:steel,profile,objects:d.objects,design:d,resources}).length,0,'kein Dialog mehr');
 assert.doesNotThrow(()=>check(steel,d),'der Server nimmt die Gestaltung an');
 // Ein zweites Zeichnen bewegt nichts mehr.
 const settled=text.x;el.render();assert.equal(text.x,settled);
});
