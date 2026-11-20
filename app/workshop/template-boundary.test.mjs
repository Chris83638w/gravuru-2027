// Chris, 20.11.2026, 16:49 Uhr, zu einer Vorlage, die sich im Shop nicht öffnen ließ (Acrylglas 12 × 8 cm, D808):
// „Allerdings muss das generell möglich sein. Es darf keine Fehlermeldung kommen. Beim export kann es dann beschnitten sein“.
// Eine Vorlage, deren Element über die Gestaltungsfläche ragt, lädt. Was der Kunde selbst verschiebt oder eintippt,
// wird wie bisher geprüft (Hinweis, Einpassen, Prüfung vor dem Warenkorb); daran ändert dieser Stand nichts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareConfig,customerLayoutIssue} from '../configurator/variant-m/contract.mjs';
import {adoptDesignModel} from '../configurator/variant-m/design-adoption.mjs';
import {surfaceObjectIssue,isBoundaryIssue,BOUNDARY_ISSUES} from '../platform/sources/app/shared/models/design-content.mjs';
import {validateStudio} from '../platform/sources/app/shared/models/studio-validation.mjs';
import {shopStartModel,shopDesignParts} from './shop-start-model.mjs';
import {universalWithDesignParts} from './ui/shop-design-switch.mjs';
import {fixedSignModel} from './test-fixtures/door-sign-all-sizes.mjs';

// Vorlage `id` so verschieben, dass ihr Text mit `overMm` über die Oberkante des Schilds ragt.
function withTextAbove(model,id,overMm){
 const copy=structuredClone(model);
 for(const list of [copy.universal.profile.designs,copy.universal.familyFormats.designs,copy.legacy.designs]){
  const text=list.find(d=>d.id===id).objects.find(o=>o.type==='text');text.y=text.h/2-overMm;
 }
 return copy;
}
const textOf=(config,id)=>config.profile.designs.find(d=>d.id===id).objects.find(o=>o.type==='text');

test('eine Vorlage, deren Text über den Schildrand ragt, lädt ohne Fehler: mit Schriften und ohne (Schriften kommen im Shop nach)',()=>{
 const model=withTextAbove(fixedSignModel(4),'fs-3',6),profile=model.universal.profile,text=textOf(model.universal,'fs-3');
 // Mit Schriften prüft der Editor die echten Buchstabenformen: Sie ragen hier wirklich hinaus.
 assert.ok(isBoundaryIssue(surfaceObjectIssue(text,profile,{fonts:model.universal.localResources.fonts,motifs:model.universal.localResources.motifs})));
 assert.doesNotThrow(()=>prepareConfig(structuredClone(model.universal)));
 // Ohne Schriften bleibt nur der Kasten des Textes; auch dann lädt die Vorlage (so scheiterte D808 im Shop).
 assert.ok(isBoundaryIssue(surfaceObjectIssue(text,profile,{motifs:model.universal.localResources.motifs})));
 assert.doesNotThrow(()=>validateStudio(structuredClone(profile),structuredClone(profile),{motifs:model.universal.localResources.motifs,catalogSizes:true}));
});

test('das Startmodell eines solchen Designs lädt, und der Editor nimmt es als weiteres Design im Gerät auf',()=>{
 const model=withTextAbove(fixedSignModel(4),'fs-3',6);
 const start=prepareConfig(shopStartModel(model,'fs-1').universal),other=shopStartModel(model,'fs-3').universal;
 assert.doesNotThrow(()=>prepareConfig(structuredClone(other)));
 const fromParts=universalWithDesignParts(structuredClone(shopStartModel(model,'fs-1').universal),JSON.parse(JSON.stringify(shopDesignParts(other))),'fs-3');
 assert.equal(adoptDesignModel(start,prepareConfig(fromParts),'fs-3'),true);
 assert.deepEqual(start.profile.designs.map(d=>d.id).sort(),['fs-1','fs-3']);
 // Lage und Größe der Vorlage bleiben, wie sie angelegt ist; nichts wird stillschweigend eingepasst.
 assert.equal(textOf(start,'fs-3').y,textOf(model.universal,'fs-3').y);
});

test('alle anderen Befunde einer Vorlage bleiben Fehler',()=>{
 const broken=structuredClone(fixedSignModel(4));
 for(const list of [broken.universal.profile.designs,broken.universal.familyFormats.designs])list.find(d=>d.id==='fs-2').objects.find(o=>o.type==='text').w=-1;
 assert.throws(()=>prepareConfig(broken.universal));
 assert.equal(isBoundaryIssue('Ungültige Maße.'),false);assert.equal(isBoundaryIssue('Element liegt unter der Klingel.'),false);assert.equal(isBoundaryIssue(''),false);
 assert.equal(BOUNDARY_ISSUES.length,4);
});

test('unverändert: was über den Rand ragt, meldet die Prüfung der Kundengestaltung weiterhin',()=>{
 const model=withTextAbove(fixedSignModel(4),'fs-3',6),config=prepareConfig(structuredClone(model.universal));
 const issue=customerLayoutIssue(textOf(config,'fs-3'),config.profile,{fonts:config.localResources.fonts,motifs:config.localResources.motifs});
 assert.ok(isBoundaryIssue(issue),'Hinweis, Einpassen und die Prüfung vor dem Warenkorb arbeiten wie bisher');
});
