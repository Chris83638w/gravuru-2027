import test from 'node:test';
import assert from 'node:assert/strict';
import {screwPreview,spacerPreview} from './option-media.mjs';
import {selectedProfile} from './contract.mjs';

const svg='<svg viewBox="0 0 220 140"></svg>';
const holes=[{x:12,y:12,diameter:5},{x:208,y:12,diameter:5}];
const config=accessory=>({profile:{geometry:{width:220,height:140,holes:[]},optionGroups:[{id:'mounting',required:true,defaultValueId:'X',values:[{id:'X',label:'x',priceCents:0,currency:'EUR',holes,mountingRule:{id:'r',layout:'left-right',count:2,diameterMm:5,edgeMm:12,keepoutMm:1,...(accessory?{accessory}:{})}}]}]}});

test('Schrauben erscheinen nur bei Befestigung mit Schrauben', () => {
  const withScrews=selectedProfile(config('screws'),{mounting:'X'});
  assert.equal(withScrews.mountingPreview.screws,true);
  const out=screwPreview(svg,withScrews);assert.match(out,/data-m-screws="true"[^>]*pointer-events="none"/);
  assert.equal((out.match(/translate\(/g)||[]).length,2);
  const without=selectedProfile(config(),{mounting:'X'});assert.equal(without.mountingPreview.screws,false);assert.equal(screwPreview(svg,without),svg);
});

test('Abstandshalter aus der Familie (accessory standoffs) werden gezeigt', () => {
  const p=selectedProfile(config('standoffs'),{mounting:'X'});
  assert.equal(p.mountingPreview.spacers,true);assert.match(spacerPreview(svg,p),/data-m-spacers="true"/);
});
