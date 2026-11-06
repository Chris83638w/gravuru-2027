import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createMotifSearchStats,normalizedMotifQuery} from './motif-search-stats.mjs';
test('persistent reports separate tenant, period, product group and preview from real searches',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'motif-search-stats-')),filename=path.join(dir,'stats.sqlite');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let time=Date.UTC(2026,10,5),a=createMotifSearchStats({filename,tenantId:'gravuru',clock:()=>time});
 a.record({query:' Kreuz ',resultCount:18,group:'Gedenktafeln'});a.record({query:'KREUZ',resultCount:18,group:'Gedenktafeln'});a.record({query:'Dinosaurier',resultCount:0,group:'Gedenktafeln'});a.record({query:'Hund',resultCount:20,group:'Gedenktafeln',source:'preview'});a.record({query:'Sonne',resultCount:2,group:'Hausnummern'});
 let report=a.report();assert.equal(report.rows[0].term,'kreuz');assert.equal(report.rows[0].searches,2);assert.equal(report.totals.searches,4);assert.equal(report.missing[0].term,'dinosaurier');assert.equal(a.report({group:'Gedenktafeln'}).totals.searches,3);assert.equal(a.report({source:'preview'}).totals.searches,1);a.close();
 a=createMotifSearchStats({filename,tenantId:'gravuru',clock:()=>time});assert.equal(a.report().totals.searches,4);time+=40*86400000;assert.equal(a.report().totals.searches,0);assert.equal(a.report({days:90}).totals.searches,4);a.close();
 const b=createMotifSearchStats({filename,tenantId:'anderer-shop'});assert.equal(b.report().totals.searches,0);b.close();
});
test('query normalization excludes common contact data and markup, rejects invalid counts and filters',()=>{
 for(const value of ['a','name@example.com','https://example.com','017612345678','<img>'])assert.equal(normalizedMotifQuery(value),'');assert.equal(normalizedMotifQuery('  Herz   mit Pfote '),'herz mit pfote');
 const s=createMotifSearchStats({filename:':memory:',tenantId:'gravuru'});assert.throws(()=>s.record({query:'Hund',resultCount:-1,group:'Schiefer'}));assert.throws(()=>s.report({days:10000}));s.close();
});
