import test from 'node:test';
import assert from 'node:assert/strict';
import {materialOverviewHtml, REVIEW_MATERIAL_OVERVIEW} from './lib/review-material-overview.mjs';
import {PROCESSING_PROFILES} from '../app/platform/sources/app/shared/models/processing-profiles.mjs';

test('material snapshot separates catalogue evidence, native assignment and connected gallery', () => {
  const {materials, catalogueCommit} = REVIEW_MATERIAL_OVERVIEW;
  assert.match(catalogueCommit, /^[a-f0-9]{40}$/);
  assert.equal(materials.length, 9);
  assert.equal(new Set(materials.map(row => row.id)).size, materials.length);
  assert.deepEqual(materials.filter(row => row.galleryStatus === 'active').map(row => row.id), ['slate']);
  assert(materials.filter(row => row.id !== 'slate').every(row => row.galleryStatus === 'not-connected' && row.statusLabel === 'Noch nicht verbunden'));
  for (const material of materials) {
    assert(material.cataloguePaths.length);
    assert(material.profileIds.every(id => PROCESSING_PROFILES.some(profile => profile.id === id)));
    assert.equal(material.url, undefined);
  }
  assert.equal(materials.find(row => row.id === 'wood').configurationStatus, 'profile-only');
  assert.equal(materials.find(row => row.id === 'alu-dibond').configurationStatus, 'family-open');
  assert(materials.filter(row => ['plastic', 'granite', 'marble'].includes(row.id)).every(row => row.configurationStatus === 'assignment-open'));
});

test('overview offers no false material-navigation targets or extra design cards', () => {
  const html = materialOverviewHtml();
  assert.match(html, /<summary>Materialien · Schiefer aktiv<\/summary>/);
  assert.equal((html.match(/data-review-material=/g) || []).length, 9);
  assert.equal((html.match(/Noch nicht verbunden/g) || []).length, 8);
  assert.doesNotMatch(html, /<(?:a|button|article|figure|script)\b|\shref=|\sonclick=/i);
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:\s|>)/);
  assert.match(materialOverviewHtml({expanded: true}), /<details[^>]*\sopen>/);
  assert.match(html, /Eine Katalogvorlage ist noch keine fertige Konfi-Vorlage/);
});
