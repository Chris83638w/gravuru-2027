import test from 'node:test';
import assert from 'node:assert/strict';
import {fontDisplayName} from './font-display.mjs';
test('Schriftnamen ohne interne Kennung', () => {
  assert.equal(fontDisplayName('Antic Slab Regular · e924bbe57ebe'),'Antic Slab');
  assert.equal(fontDisplayName('Magnolia-Script · 012e7e09c5dd'),'Magnolia-Script');
  assert.equal(fontDisplayName('Cinzel'),'Cinzel');
  assert.equal(fontDisplayName('Poppins ExtraLight'),'Poppins ExtraLight');
});
