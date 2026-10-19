import test from 'node:test';
import assert from 'node:assert/strict';
import {THEME_TEXT_LIMITS,DEFAULT_TEXT_LIMITS,textLimits,themeId,textLimitIssue,textLength,lineCount,sameSampleText,requiredFieldMessage,clampText} from './theme-limits.mjs';

test('Themenstandards aus dem Benchmark vom 19.10.2026',()=>{
 for(const theme of ['namensschilder','familienschilder','hausnummern'])assert.deepEqual(THEME_TEXT_LIMITS[theme],{maxLength:32,maxLines:2});
 for(const theme of ['gedenktafeln','tiergedenktafeln'])assert.deepEqual(THEME_TEXT_LIMITS[theme],{maxLength:78,maxLines:4});
 for(const theme of ['hinweisschilder','firmenschilder'])assert.deepEqual(THEME_TEXT_LIMITS[theme],{maxLength:52,maxLines:3});
 assert.deepEqual(DEFAULT_TEXT_LIMITS,{maxLength:40,maxLines:2});
 assert.deepEqual(textLimits({text:'Balu'},{},{}),{maxLength:40,maxLines:2});
 assert.deepEqual(textLimits({text:'Balu'},{themes:['unbekannt']},{}),{maxLength:40,maxLines:2});
});
test('Reihenfolge: Objekt vor Design (themes[0]/themeId) vor Produkt vor Standard',()=>{
 assert.equal(themeId({themes:['Gedenktafeln','namensschilder']},{themeId:'hausnummern'}),'gedenktafeln');
 assert.equal(themeId({themeId:'firmenschilder'},{themeId:'hausnummern'}),'firmenschilder');
 assert.equal(themeId({themes:[]},{themeId:' Hausnummern '}),'hausnummern');
 assert.equal(themeId({},{}),null);
 assert.deepEqual(textLimits({text:'Balu'},{themes:['gedenktafeln']},{themeId:'hausnummern'}),{maxLength:78,maxLines:4});
 assert.deepEqual(textLimits({text:'Balu'},{},{themeId:'hinweisschilder'}),{maxLength:52,maxLines:3});
 assert.deepEqual(textLimits({text:'Balu',maxLength:12},{themes:['gedenktafeln']},{}),{maxLength:12,maxLines:4});
 assert.deepEqual(textLimits({text:'Balu',maxLength:120,maxLines:6},{themes:['namensschilder']},{}),{maxLength:120,maxLines:6});
});
test('Mustertext der Vorlage bleibt ohne Objektwert zulässig; ausdrückliche Werte werden streng geprüft',()=>{
 const sample='Du leuchtest weiter\nin unseren Erinnerungen.\nFür immer.';
 assert.deepEqual(textLimits({text:sample},{themes:['namensschilder']},{}),{maxLength:textLength(sample),maxLines:3});
 assert.deepEqual(textLimits({text:'Balu'},{themes:['namensschilder']},{}),{maxLength:32,maxLines:2});
 for(const bad of [0,501,1.5,'32',NaN,-1])assert.throws(()=>textLimits({text:'x',maxLength:bad},{},{}),/Zeichenlimit: ganze Zahl von 1 bis 500/);
 for(const bad of [0,11,2.5,'2'])assert.throws(()=>textLimits({text:'x',maxLines:bad},{},{}),/Zeilenlimit: ganze Zahl von 1 bis 10/);
 assert.deepEqual(textLimits({text:'x',maxLength:1,maxLines:1},{},{}),{maxLength:1,maxLines:1});
 assert.deepEqual(textLimits({text:'x',maxLength:500,maxLines:10},{},{}),{maxLength:500,maxLines:10});
});
test('Zeichen ohne Randleerzeichen, Zeilen über Umbruch, deutsche Meldungen',()=>{
 assert.equal(textLength('  Balu  '),4);assert.equal(textLength('Zoë'),3);assert.equal(textLength(''),0);
 assert.equal(lineCount('a\nb'),2);assert.equal(lineCount('a\n'),1);assert.equal(lineCount(''),0);assert.equal(lineCount('a\n\nb'),3);
 const limits={maxLength:5,maxLines:2};
 assert.equal(textLimitIssue('Balu',limits),'');assert.equal(textLimitIssue('  Balu ',limits),'');
 assert.equal(textLimitIssue('Balu und Luna',limits),'Text zu lang: höchstens 5 Zeichen.');
 assert.equal(textLimitIssue('a\nb\nc',limits),'Höchstens 2 Zeilen.');
});
test('Pflichtfeld: Mustertext (getrimmt, Groß/Klein egal) gilt nicht als Eingabe',()=>{
 assert.equal(sameSampleText(' familie MUSTERMANN ','Familie Mustermann'),true);
 assert.equal(sameSampleText('Familie Koch','Familie Mustermann'),false);
 assert.equal(requiredFieldMessage({id:'t1',fieldKey:'names'}),'Bitte das Feld „names“ ausfüllen.');
 assert.equal(requiredFieldMessage({id:'t1'}),'Bitte das Feld „t1“ ausfüllen.');
});
test('Editor-Eingabe: kein weiteres Zeichen, zusätzliche Zeilen werden abgewiesen',()=>{
 const limits={maxLength:4,maxLines:2};
 assert.equal(clampText('Balu!',limits,'Balu'),'Balu');
 assert.equal(clampText('Ba\nlu',limits,'Balu'),'Ba\nl');// Umbruch zählt wie im Vertrag als Zeichen
 assert.equal(clampText('Ba\nlu',{maxLength:5,maxLines:2},'Balu'),'Ba\nlu');
 assert.equal(clampText('a\nb\nc',limits,'a\nb'),'a\nb');
 assert.equal(clampText('Zoë!!',limits,''),'Zoë!');
});
