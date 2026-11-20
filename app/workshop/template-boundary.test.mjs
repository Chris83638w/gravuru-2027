// Chris, 20.11.2026, 16:49 Uhr, zu einer Vorlage, die sich im Shop nicht öffnen ließ (Acrylglas 12 × 8 cm, D808):
// „Allerdings muss das generell möglich sein. Es darf keine Fehlermeldung kommen. Beim export kann es dann beschnitten sein“.
// Der Editor öffnet deshalb jede veröffentlichte Vorlage, auch wenn ein Element über die Gestaltungsfläche ragt.
// Zwei Dinge bleiben, wie sie waren:
// - Die Prüfungen der Werkstatt (Vorlage speichern, Produktanlage aus Familien, Katalog-Umrechnung „passt nicht“) lehnen
//   so eine Vorlage weiter ab. Sie entscheiden, welche Designs überhaupt in ein Produkt kommen.
// - Was der Kunde selbst verschiebt oder eintippt, wird weiter geprüft (Hinweis, Einpassen, Prüfung vor dem Warenkorb).
// Die erste Fassung (ea2c9670) hatte die Prüfung für alle Aufrufer gelockert; der Gesamtlauf zeigte das an drei Tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareConfig,customerLayoutIssue} from '../configurator/variant-m/contract.mjs';
import {adoptDesignModel} from '../configurator/variant-m/design-adoption.mjs';
import {surfaceObjectIssue,isBoundaryIssue,BOUNDARY_ISSUES} from '../platform/sources/app/shared/models/design-content.mjs';
import {validateStudio} from '../platform/sources/app/shared/models/studio-validation.mjs';
import {shopStartModel,shopDesignParts} from './shop-start-model.mjs';
import {universalWithDesignParts} from './ui/shop-design-switch.mjs';
import {fixedSignModel} from './test-fixtures/door-sign-all-sizes.mjs';

// So lädt der Editor (adapter.mjs); alle anderen Aufrufer lassen die Angabe weg.
const EDITOR={templateBoundary:'allow'};
// Vorlage `id` so verschieben, dass ihr Text mit `overMm` über die Oberkante des Schilds ragt.
function withTextAbove(model,id,overMm){
 const copy=structuredClone(model);
 for(const list of [copy.universal.profile.designs,copy.universal.familyFormats.designs,copy.legacy.designs]){
  const text=list.find(d=>d.id===id).objects.find(o=>o.type==='text');text.y=text.h/2-overMm;
 }
 return copy;
}
const textOf=(config,id)=>config.profile.designs.find(d=>d.id===id).objects.find(o=>o.type==='text');

test('der Editor öffnet eine Vorlage, deren Text über den Schildrand ragt: mit Schriften und ohne (im Shop kommen sie nach)',()=>{
 const model=withTextAbove(fixedSignModel(4),'fs-3',6),profile=model.universal.profile,text=textOf(model.universal,'fs-3');
 const motifs=model.universal.localResources.motifs;
 // Mit Schriften prüft der Editor die echten Buchstabenformen: Sie ragen hier wirklich hinaus.
 assert.ok(isBoundaryIssue(surfaceObjectIssue(text,profile,{fonts:model.universal.localResources.fonts,motifs})));
 assert.doesNotThrow(()=>prepareConfig(structuredClone(model.universal),EDITOR));
 // Ohne Schriften bleibt nur der Kasten des Textes; auch dann lädt die Vorlage (so scheiterte D808 im Shop).
 assert.ok(isBoundaryIssue(surfaceObjectIssue(text,profile,{motifs})));
 assert.doesNotThrow(()=>validateStudio(structuredClone(profile),structuredClone(profile),{motifs,catalogSizes:true,...EDITOR}));
});

test('die Prüfungen der Werkstatt bleiben streng: ohne die Angabe des Editors wird dieselbe Vorlage abgelehnt',()=>{
 const model=withTextAbove(fixedSignModel(4),'fs-3',6),profile=model.universal.profile,motifs=model.universal.localResources.motifs;
 assert.throws(()=>prepareConfig(structuredClone(model.universal)),/Gestaltungsfläche/);
 assert.throws(()=>validateStudio(structuredClone(profile),structuredClone(profile),{motifs,catalogSizes:true}),/Gestaltungsfläche/);
 assert.throws(()=>validateStudio(structuredClone(profile),structuredClone(profile),{motifs,catalogSizes:true,templateBoundary:'reject'}),/Gestaltungsfläche/);
 // Nur der Editor setzt die Angabe: beim Start und beim Aufnehmen eines weiteren Designs.
 const adapter=fs.readFileSync(new URL('../configurator/variant-m/adapter.mjs',import.meta.url),'utf8');
 assert.equal(adapter.match(/prepareConfig\(/g).length,2);assert.equal(adapter.match(/prepareConfig\([a-zA-Z]+,EDITOR_LOAD\)/g).length,2);
 const others=['slate-product.mjs','family-acrylic-product.mjs','slate-catalog-product.mjs','katalog-family-formats.mjs','product-families.mjs','product-model.mjs','doorbell-product.mjs','specimen-product.mjs','customer-ux-policy.mjs'];
 for(const name of others)assert.doesNotMatch(fs.readFileSync(new URL('./'+name,import.meta.url),'utf8'),/templateBoundary/,name);
});

test('das Startmodell eines solchen Designs lädt im Editor, und er nimmt es als weiteres Design im Gerät auf',()=>{
 const model=withTextAbove(fixedSignModel(4),'fs-3',6);
 const start=prepareConfig(shopStartModel(model,'fs-1').universal,EDITOR),other=shopStartModel(model,'fs-3').universal;
 assert.doesNotThrow(()=>prepareConfig(structuredClone(other),EDITOR));
 const fromParts=universalWithDesignParts(structuredClone(shopStartModel(model,'fs-1').universal),JSON.parse(JSON.stringify(shopDesignParts(other))),'fs-3');
 assert.equal(adoptDesignModel(start,prepareConfig(fromParts,EDITOR),'fs-3'),true);
 assert.deepEqual(start.profile.designs.map(d=>d.id).sort(),['fs-1','fs-3']);
 // Lage und Größe der Vorlage bleiben, wie sie angelegt ist; nichts wird stillschweigend eingepasst.
 assert.equal(textOf(start,'fs-3').y,textOf(model.universal,'fs-3').y);
});

test('alle anderen Befunde einer Vorlage bleiben auch im Editor Fehler',()=>{
 const broken=structuredClone(fixedSignModel(4));
 for(const list of [broken.universal.profile.designs,broken.universal.familyFormats.designs])list.find(d=>d.id==='fs-2').objects.find(o=>o.type==='text').w=-1;
 assert.throws(()=>prepareConfig(broken.universal,EDITOR));
 assert.equal(isBoundaryIssue('Ungültige Maße.'),false);assert.equal(isBoundaryIssue('Element liegt unter der Klingel.'),false);assert.equal(isBoundaryIssue(''),false);
 assert.equal(BOUNDARY_ISSUES.length,4);
});

test('unverändert: was über den Rand ragt, meldet die Prüfung der Kundengestaltung weiterhin',()=>{
 const model=withTextAbove(fixedSignModel(4),'fs-3',6),config=prepareConfig(structuredClone(model.universal),EDITOR);
 const issue=customerLayoutIssue(textOf(config,'fs-3'),config.profile,{fonts:config.localResources.fonts,motifs:config.localResources.motifs});
 assert.ok(isBoundaryIssue(issue),'Hinweis, Einpassen und die Prüfung vor dem Warenkorb arbeiten wie bisher');
});
