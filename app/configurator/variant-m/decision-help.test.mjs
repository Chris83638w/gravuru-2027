import test from 'node:test';
import assert from 'node:assert/strict';
import {decisionHelp,motifPriceDescription} from './decision-help.mjs';

test('motif explanation distinguishes included originals from changed and additional motifs using the saved price',()=>{
 const config={profile:{geometry:{}},motifCharge:'additional',extraMotifCents:169};
 assert.equal(decisionHelp('motif',config).text,'Das Motiv der Vorlage ist im Preis enthalten. Jedes weitere oder geänderte Motiv: +1,69 €.');
 assert.equal(motifPriceDescription({...config,extraMotifCents:0}),'Motive sind im Preis enthalten.');
 assert.match(motifPriceDescription({...config,extraMotifCents:250}),/\+2,50 €/);
 assert.match(motifPriceDescription({...config,motifCharge:'all'}),/auch das Motiv der Vorlage/);
});
