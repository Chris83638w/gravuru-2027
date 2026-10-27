import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createWorkshop} from './http.mjs';
import {build} from '../configurator/variant-m/build.mjs';

test('pinned product revisions reuse the built model but every caller gets an independent copy',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-model-cache-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy});t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const record=w.repository.get(w.defaultId);
 const first=w.model(record.id,record.revision);
 // Aufrufer dürfen ihre Kopie verändern, ohne den nächsten Abruf zu beeinflussen.
 first.universal.localResources.fonts={};first.universal.profile.designs.length=0;first.name='verändert';
 const second=w.model(record.id,record.revision);
 assert.notEqual(second.universal,first.universal);
 assert.ok(Object.keys(second.universal.localResources.fonts).length>0);
 assert.ok(second.universal.profile.designs.length>0);
 assert.equal(second.name,record.document.name);
 assert.deepEqual(second.configuration,{id:record.id,revision:record.revision,publishedRevision:record.publishedRevision});
 // Ohne feste Revision (Werkstatt-Ansicht) wird weiter frisch aufgebaut und ist gleich.
 assert.deepEqual(w.model(record.id).universal,w.model(record.id,record.revision).universal);
});
