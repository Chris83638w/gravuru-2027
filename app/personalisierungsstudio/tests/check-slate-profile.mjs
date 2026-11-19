// Read-only comparison of the two pilot positions against the versioned workshop sources.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const paths=process.argv.slice(2);
if(paths.length!==3) throw Error('Tafelregister, Preisdatei und Zubehörregister als drei JSON-Dateien angeben.');
const [blanks,prices,accessories]=paths.map(path=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')));
const blank=blanks.tafeln.find(row=>row.id==='SL-21');
assert.deepEqual([blank.form,blank.widthMm,blank.heightMm],['Rechteck',300,200]);
const rows=prices.schiefer.filter(row=>row.gruppe==='Naturschiefer mit Bruchkante' && row.form===blank.form
  && Array.isArray(row.mm) && row.mm[0]===blank.widthMm && row.mm[1]===blank.heightMm);
assert.equal(rows.length,1);
assert.equal(rows[0].preis,blank.grundpreisCents);
assert.equal(rows[0].preisMitFoto,blank.preisMitFotoCents);
function auditedOption(id,priceLabel){
  const entry=accessories.optionen.find(row=>row.id===id);
  const price=prices.schieferOptionen.find(row=>row.option===priceLabel);
  assert.equal(blank.optionen[id],true);
  assert.equal(blanks.optionen[id].preisCents,price.preis);
  assert.equal(entry.preisCents,price.preis);
  assert.ok(entry.konfiBilder.length>0);
  return {cents:price.preis,media:entry.konfiBilder.map(row=>row.datei)};
}
const drilling=auditedOption('b2','2 Bohrlöcher (Montagebohrung)');
const stand=auditedOption('staender-klar','Acrylständer klar');
// Confirmed by Chris for both acrylic stands in Issue #260. Compare the older flags with that decision.
function standEligible(row){
  return ['Rechteck','Quadrat'].includes(row.form) && Math.max(row.widthMm,row.heightMm)<=400
    && Math.min(row.widthMm,row.heightMm)<=300;
}
assert.ok(standEligible(blank));
const conflicts=blanks.tafeln.filter(row=>(row.optionen['staender-klar']||row.optionen['staender-schwarz']) && !standEligible(row));
console.log(JSON.stringify({
  D230:{baseCents:blank.preisMitFotoCents,withTwoHolesCents:blank.preisMitFotoCents+drilling.cents,
    holes:blank.lochbilder['2er'],images:drilling.media},
  D287:{baseCents:blank.grundpreisCents,withClearStandCents:blank.grundpreisCents+stand.cents,images:stand.media},
  originalStandFlagConflicts:conflicts.map(row=>row.id),blankMedia:blank.rohlingWebp,blankContour:blank.kontur
},null,2));
