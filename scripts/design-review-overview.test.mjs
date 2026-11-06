import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDesignReviewOverview, designReviewOverviewHtml} from './lib/design-review-overview.mjs';

const row = (id, status, extra = {}) => ({id, status, material: 'slate', format: '300x200', categoryKey: 'dogs', categoryLabel: 'Hunde ohne Foto', ...extra});

test('size and multi-category repetitions count targets separately but originals once globally', () => {
  const entries = [row('D1', 'approved', {categories: [{key:'dogs',label:'Hunde'}, {key:'memorial',label:'Gedenken'}]}),
    row('D1', 'approved', {categoryKey:'memorial'}), row('D1','unreviewed',{format:'220x140'}), row('D2','approved')];
  const copy = structuredClone(entries), report = buildDesignReviewOverview(entries);
  assert.deepEqual(entries, copy);
  assert.equal(report.summary.distinctOriginals, 2);
  assert.equal(report.summary.targets, 3);
  assert.equal(report.summary.approved, 2);
  assert.equal(report.summary.unreviewed, 1);
  assert.equal(report.summary.state, 'some_approved');
  assert.equal(report.summary.originalStatusCounts.approved, 1);
  assert.equal(report.categories.find(c=>c.key==='dogs').distinctOriginals, 2);
  assert.equal(report.categories.find(c=>c.key==='memorial').targets, 1);
});

test('approval states remain separate from technical unavailability and modified approvals', () => {
  const report=buildDesignReviewOverview([row('D1','approved'),row('D2','changed'),row('D3','unavailable'),row('D4','unreviewed')]);
  assert.deepEqual(['approved','changed','unavailable','unreviewed'].map(k=>report.summary[k]), [1,1,1,1]);
  assert.equal(report.summary.pending,3);
  assert.equal(buildDesignReviewOverview([row('D1','approved')]).summary.state,'all_approved');
  assert.equal(buildDesignReviewOverview([row('D1','unavailable')]).summary.state,'no_approved');
  assert.equal(buildDesignReviewOverview([]).summary.state,'no_approved');
});

test('without a supplied list completeness remains unknown, not zero missing designs', () => {
  const report=buildDesignReviewOverview([row('D1','approved')]);
  assert.equal(report.expectedCoverageKnown,false);
  assert.equal(report.lacking,null);
  assert.equal(report.missingCategories,null);
  assert.equal(report.coverage,null);
  assert.match(designReviewOverviewHtml(report),/Vollständigkeitsprüfung folgt mit deiner Unterkategorienliste/);
});

test('expected categories assess source existence, not technical editability', () => {
  const report=buildDesignReviewOverview([row('D1','unavailable')],{expectedCategories:['dogs',{key:'cats',label:'Katzen'}]});
  assert.equal(report.expectedCoverageKnown,true);
  assert.equal(report.lackingScopes,1);
  assert.equal(report.coverage.find(c=>c.key==='dogs').lacking,0);
  assert.equal(report.coverage.find(c=>c.key==='dogs').unavailable,1);
  assert.deepEqual(report.missingCategories.map(c=>c.key),['cats']);
  assert.equal(report.summary.distinctOriginals,1);
  assert.equal(report.categories.length,1);
});

test('explicit material and size scopes never borrow approval or presence from another target', () => {
  const report=buildDesignReviewOverview([row('D1','approved'),row('D1','unreviewed',{material:'steel'})],{
    expectedCategories:[{key:'dogs',material:'slate',format:'300x200'}, {key:'dogs',material:'steel',format:'220x140'}]});
  assert.equal(report.summary.distinctOriginals,1);
  assert.equal(report.summary.targets,2);
  assert.deepEqual(report.coverage.map(c=>c.lacking),[0,1]);
  assert.equal(report.missingCategories[0].material,'steel');
});

test('explicit minimum or required IDs detect missing originals without size double counting', () => {
  const entries=[row('D1','approved'),row('D1','approved',{format:'220x140'}),row('D2','unavailable')];
  const report=buildDesignReviewOverview(entries,{expectedCategories:[{key:'dogs',minimumOriginals:3,requiredOriginalIds:['D1','D2','D3']}]});
  assert.equal(report.coverage[0].distinctOriginals,2);
  assert.equal(report.coverage[0].minimumShortfall,1);
  assert.deepEqual(report.coverage[0].missingOriginalIds,['D3']);
  assert.equal(report.coverage[0].lacking,1);
  assert.equal(report.missingCategories.length,0);
});

test('contradictory duplicate target approvals are conservative and reported', () => {
  const report=buildDesignReviewOverview([row('D1','approved'),row('D1','changed'),row('D1','unavailable')]);
  assert.equal(report.summary.targets,1);
  assert.equal(report.summary.approved,0);
  assert.equal(report.summary.unavailable,1);
  assert.equal(report.conflicts.length,2);
  assert.throws(()=>buildDesignReviewOverview([row('D1','ready')]),/Unbekannter Prüfstatus/);
});

test('expected scopes deduplicate exact repeated requirements and reject contradictions', () => {
  assert.equal(buildDesignReviewOverview([],{expectedCategories:['dogs','dogs']}).coverage.length,1);
  assert.throws(()=>buildDesignReviewOverview([],{expectedCategories:['dogs',{key:'dogs',minimumOriginals:2}]}),/Widersprüchliche/);
  assert.throws(()=>buildDesignReviewOverview([],{expectedCategories:[{key:'dogs',minimumOriginals:-1}]}),/minimumOriginals/);
  assert.equal(buildDesignReviewOverview([],{expectedCategories:[]}).expectedCoverageKnown,true);
});

test('HTML escapes catalogue labels, shows distinct status columns and invents no controls or links', () => {
  const report=buildDesignReviewOverview([row('D1','changed',{categoryLabel:'<script>alert(1)</script>'})],{expectedCategories:[{key:'cats',label:'<img src=x onerror=x>',requiredOriginalIds:['<b>']}]});
  const html=designReviewOverviewHtml(report,{expanded:true});
  assert.match(html,/<details[^>]* open>/);
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/&lt;img src=x onerror=x&gt;/);
  assert.match(html,/Erneut prüfen/);
  assert.match(html,/Aufbereitung offen/);
  assert.match(html,/noch keine Vorlage vorhanden/);
  assert.doesNotMatch(html,/<script|<img|<input|<button|\shref=/);
  assert.throws(()=>designReviewOverviewHtml({}),/berechnete Prüfübersicht/);
});
