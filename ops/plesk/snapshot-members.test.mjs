import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {assertSnapshotMembers} from './snapshot-members.mjs';
process.umask(0o077);
function fixture(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-snapshot-members-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));for(const n of ['SNAPSHOT.json','workshop.sqlite','profiles.sqlite','design-assets.sqlite'])fs.writeFileSync(path.join(d,n),'snapshot',{mode:0o600});return d;}
test('original four members accepted',t=>assert.equal(assertSnapshotMembers(fixture(t)),true));
test('read-only zero WAL and SHM accepted',t=>{const d=fixture(t);fs.writeFileSync(path.join(d,'workshop.sqlite-wal'),'');fs.writeFileSync(path.join(d,'workshop.sqlite-shm'),Buffer.alloc(32768));assert.equal(assertSnapshotMembers(d),true);});
test('nonempty WAL never accepted',t=>{const d=fixture(t);fs.writeFileSync(path.join(d,'workshop.sqlite-wal'),'pages');assert.throws(()=>assertSnapshotMembers(d),{code:'snapshot_members'});});
test('orphan SHM rejected',t=>{const d=fixture(t);fs.writeFileSync(path.join(d,'workshop.sqlite-shm'),Buffer.alloc(32768));assert.throws(()=>assertSnapshotMembers(d),{code:'snapshot_members'});});
test('unrecognized file rejected',t=>{const d=fixture(t);fs.writeFileSync(path.join(d,'other.sqlite'),'');assert.throws(()=>assertSnapshotMembers(d),{code:'snapshot_members'});});
test('missing original rejected',t=>{const d=fixture(t);fs.unlinkSync(path.join(d,'profiles.sqlite'));assert.throws(()=>assertSnapshotMembers(d),{code:'snapshot_members'});});
test('directory masquerading as WAL rejected',t=>{const d=fixture(t);fs.mkdirSync(path.join(d,'workshop.sqlite-wal'));assert.throws(()=>assertSnapshotMembers(d),{code:'snapshot_members'});});
test('wrong SHM size rejected',t=>{const d=fixture(t);fs.writeFileSync(path.join(d,'workshop.sqlite-wal'),'');fs.writeFileSync(path.join(d,'workshop.sqlite-shm'),'x');assert.throws(()=>assertSnapshotMembers(d),{code:'snapshot_members'});});
