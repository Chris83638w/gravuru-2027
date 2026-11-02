// Prüft die vom Kunden selbst gestaltete Sonderanfertigung (material 'sonder').
import assert from 'node:assert/strict'
import {validateConfiguration,configurationSummary,customGeometry} from '../src/lib/configuration.ts'
const custom={material:'Glas',processes:['gravur'],supply:'eigenes',object:'Glasplatte',topic:'Lasergravur',details:'Rückseitig gravieren.'}
const text={type:'text',x:10,y:10,w:50,h:10,text:'Familie Weber',font:'Montserrat'}
const ok=validateConfiguration({material:'sonder',method:'gravur',geometry:{...customGeometry,widthMm:400,heightMm:250},quantity:1,custom,design:{objects:[text]}})
assert.equal(ok.material,'sonder');assert.equal(ok.method,'gravur');assert.equal(ok.geometry.holeCount,0);assert.equal(ok.design.objects.length,1)
assert.equal(validateConfiguration({...ok}).custom.material,'Glas','Rundlauf (gespeicherter Entwurf / Kundenlink) muss gültig bleiben')
// Bearbeitung bestimmt die Darstellung: Farbdruck hat Vorrang, nur Zuschnitt braucht keine Gestaltung.
assert.equal(validateConfiguration({...ok,custom:{...custom,processes:['gravur','druck']}}).method,'druck')
assert.equal(validateConfiguration({...ok,custom:{...custom,processes:['zuschnitt','biegen']},design:undefined}).design,undefined)
// Bohrungen, Klingel und Acrylebenen können über diesen Weg nicht eingeschleust werden.
const forced=validateConfiguration({...ok,geometry:{...ok.geometry,holeCount:4,assembly:{acrylic:{}},spacers:{count:4}}})
assert.equal(forced.geometry.holeCount,0);assert.equal(forced.geometry.assembly,undefined);assert.equal(forced.geometry.spacers,undefined)
for(const [patch,label] of [[{custom:{...custom,processes:[]}},'ohne Bearbeitung'],[{custom:{...custom,processes:['laser-unbekannt']}},'unbekannte Bearbeitung'],[{custom:{...custom,material:''}},'ohne Material'],[{custom:{...custom,details:'x'.repeat(2001)}},'zu lange Beschreibung'],[{geometry:{...customGeometry,widthMm:700}},'zu groß'],[{geometry:{...customGeometry,shape:'herz'}},'unbekannte Form'],[{quantity:0},'Stückzahl 0'],[{design:{objects:[]},custom:{...custom,details:''}},'weder Gestaltung noch Beschreibung']])
 assert.throws(()=>validateConfiguration({...ok,...patch}),undefined,label)
assert.doesNotThrow(()=>validateConfiguration({...ok,design:{objects:[]}}),'Beschreibung allein genügt')
const summary=configurationSummary(ok)
for(const part of ['Sonderanfertigung','Material: Glas','Eigenes Material','400 × 250 mm','Rückseitig gravieren.'])assert.ok(summary.includes(part),part)
// Bestehende Plattenkonfigurationen bleiben unverändert gültig.
assert.equal(validateConfiguration({material:'edelstahl',method:'gravur',geometry:{shape:'rounded',widthMm:300,heightMm:200,cornerRadiusMm:5,holeCount:4,holeDiameterMm:4,edgeMm:12},quantity:1,marking:'A',x:50,y:50,fontSize:10}).material,'edelstahl')
console.log('Sonderanfertigung: alle Prüfungen bestanden.')
