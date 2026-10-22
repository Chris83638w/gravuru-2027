// K10 / Ü1.1: Das Verfahrensprofil als eine Quelle für Werkzeuge, Palette,
// Mindestschriftgröße, Soll-DPI, Spiegelung und Ausgabeformat.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PROCESS_PROFILES,PROCESS_PROFILE_IDS,UV_PRINT_PALETTE,processProfile,isProcessProfileId,processMirror,processPalette,processFreeColor,processColorIssue} from './process-profiles.mjs';
import {PROCESSING_PROFILES} from '../platform/sources/app/shared/models/processing-profiles.mjs';

test('every display profile carries exactly one process rule set; nothing is invented (open values stay null)',()=>{
 assert.deepEqual(PROCESS_PROFILE_IDS,PROCESSING_PROFILES.map(p=>p.id));
 for(const p of PROCESS_PROFILES){
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.tools));
  for(const key of ['textColor','photo','motifRecolor'])assert.equal(typeof p.tools[key],'boolean',p.id+' '+key);
  assert.ok(p.palette===null||Array.isArray(p.palette));
  assert.ok(Number.isFinite(p.minTextMm)&&p.minTextMm>0);
  assert.equal(p.minStrokeMm,null,'Mindestlinienstärke ist offen');
  assert.ok(p.targetDpi===null||(Number.isFinite(p.targetDpi)&&p.targetDpi>0));
  assert.equal(typeof p.mirror,'boolean');assert.ok(['pdf','svg'].includes(p.outputFormat));
  assert.equal(p.ink,PROCESSING_PROFILES.find(x=>x.id===p.id).ink);
 }
 const engraving=PROCESS_PROFILES.filter(p=>p.method==='engraving');
 for(const p of engraving){assert.equal(p.tools.textColor,false,p.id);assert.deepEqual(p.palette,[]);assert.equal(p.freeColor,false,p.id+': feste Vorgabefarbe');assert.equal(p.minTextMm,3);assert.equal(p.mirror,p.id==='acrylic-engraving');}
 const print=processProfile('color-print');
 assert.equal(print.tools.textColor,true);assert.equal(print.minTextMm,3);assert.equal(print.targetDpi,300);assert.equal(print.mirror,false);
 assert.deepEqual(print.palette,UV_PRINT_PALETTE.flatMap(([,colors])=>colors.map(([,hex])=>hex)));assert.equal(print.palette.length,20);
 assert.equal(print.freeColor,true,'Chris 22./23.10.2026: Palette bleibt, freie Farbe kommt hinzu');
});
test('freie Farbe: Farbdruck ja (Palette bleibt daneben), Gravur nie, Produktauswahl des Händlers schränkt weiter ein',()=>{
 const print=processProfile('color-print'),steel=processProfile('steel-engraving');
 assert.equal(processFreeColor(print),true);assert.equal(processPalette(print).length,20,'Schnellfarbpunkte bleiben');
 assert.equal(processFreeColor(steel),false);assert.equal(processFreeColor({...steel,freeColor:true}),false,'ohne Farbwerkzeug nie frei');
 assert.equal(processFreeColor(print,['#245cac']),false,'Produktauswahl: nur diese Farben');assert.equal(processFreeColor(print,[]),false);
 assert.equal(processFreeColor({...print,palette:null}),true,'Profil ohne Palette wie bisher frei');assert.equal(processFreeColor({...print,palette:null},['#aabbcc']),false);
 assert.equal(processFreeColor({...print,freeColor:false}),false,'Druckprofil mit fester Palette bleibt möglich');
});
test('lookup by id or product profile; unknown ids fail instead of falling back',()=>{
 assert.equal(processProfile('steel-engraving').id,'steel-engraving');
 assert.equal(processProfile({material:{kind:'slate'},processing:{profileId:'slate-engraving'}}).id,'slate-engraving');
 assert.equal(processProfile({material:{kind:'print'}}).id,'color-print');
 assert.throws(()=>processProfile('uv-roland'),/Unbekanntes Verfahrensprofil/);assert.throws(()=>processProfile(null),/Unbekanntes Verfahrensprofil/);
 assert.equal(isProcessProfileId('wood-engraving'),true);assert.equal(isProcessProfileId('gravur-stahl'),false);
});
test('mirror: profile default, engraving side of a family overrides',()=>{
 const acrylic=processProfile('acrylic-engraving'),steel=processProfile('steel-engraving');
 assert.equal(processMirror(acrylic),true);assert.equal(processMirror(acrylic,'front'),false);assert.equal(processMirror(acrylic,'back'),true);
 assert.equal(processMirror(steel),false);assert.equal(processMirror(steel,'back'),true);assert.equal(processMirror(steel,undefined),false);
});
test('palette: engraving none, print exactly the profile colours, product selection only narrows',()=>{
 const print=processProfile('color-print'),steel=processProfile('steel-engraving');
 assert.deepEqual(processPalette(steel),[]);assert.deepEqual(processPalette(steel,['#ff0000']),[]);
 assert.equal(processPalette(print).length,20);assert.deepEqual(processPalette(print,['#C93232','#ff0000','#245cac']),['#c93232','#245cac']);assert.deepEqual(processPalette(print,[]),[]);
 const free={...print,palette:null};assert.equal(processPalette(free),null);assert.deepEqual(processPalette(free,['#AABBCC','#aabbcc']),['#aabbcc']);
});
test('colour rule: engraving rejects any change from the template, print allows palette and free colours, a product selection stays binding',()=>{
 const print=processProfile('color-print'),steel=processProfile('steel-engraving');
 assert.equal(processColorIssue(steel,'#000000',{templateColor:'#000000'}),'');
 assert.equal(processColorIssue(steel,'#123456',{templateColor:'#000000'}),'Dieses Verfahren erlaubt keine Farbwahl.');
 assert.equal(processColorIssue(steel,'#123456'),'','neue Elemente tragen eine Editorfarbe, die Ausgabe nutzt die Tinte');
 assert.equal(processColorIssue(steel,undefined,{templateColor:'#000000'}),'');
 assert.equal(processColorIssue(print,'#c93232',{templateColor:'#202824'}),'');
 assert.equal(processColorIssue(print,'#C93232'),'');
 assert.equal(processColorIssue(print,'#202824'),'','Profiltinte');
 // Chris 22./23.10.2026: Farbdruck erlaubt zusätzlich jede gültige freie Farbe.
 assert.equal(processColorIssue(print,'#123456',{templateColor:'#202824'}),'','freie Farbe beim Farbdruck');
 assert.equal(processColorIssue(print,'#123456',{templateColor:'#123456'}),'','Vorlagenfarbe bleibt zulässig');
 assert.equal(processColorIssue(print,'#731C19',{designColors:['#731c19',undefined,'#ffffff']}),'','Farben der Vorlage dürfen auf neue Elemente übernommen werden');
 assert.equal(processColorIssue(print,'#731c19',{designColors:['#000000']}),'','freie Farbe auch ohne Vorlagenbezug');
 // Druckprofil mit fester Palette (freeColor false): wie bisher nur Palette, Vorlagenfarben und Tinte.
 const fixed={...print,freeColor:false};
 assert.equal(processColorIssue(fixed,'#123456',{templateColor:'#202824'}),'Farbe nicht in der Palette.');
 assert.equal(processColorIssue(fixed,'#731c19',{designColors:['#000000']}),'Farbe nicht in der Palette.');
 assert.equal(processColorIssue(fixed,'#731C19',{designColors:['#731c19']}),'');
 // Produktauswahl des Händlers bleibt verbindlich – auch beim Farbdruck mit freier Farbe.
 assert.equal(processColorIssue(print,'#c93232',{selection:['#245cac']}),'Farbe nicht in der Palette.');
 assert.equal(processColorIssue(print,'#123456',{selection:['#245cac']}),'Farbe nicht in der Palette.');
 assert.equal(processColorIssue(print,'#245cac',{selection:['#245cac']}),'');
 assert.equal(processColorIssue(print,'rot'),'Ungültige Farbe.','ungültige Werte auch bei freier Farbe nicht');
 assert.equal(processColorIssue({...print,palette:null},'#123456'),'','Profil ohne Palette: freie Farbwahl wie bisher');
});
