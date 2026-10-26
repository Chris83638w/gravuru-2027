import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareDesignAssignments,applyDesignAssignments} from './design-assignments.mjs';
import {patchDesign,patchDesignDerived,designDashboard,forgetKatalog} from './design-dashboard.mjs';
import {openKatalog} from './katalog-source.mjs';
const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const read=(root,relative)=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const write=(root,relative,value)=>{const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,1)+'\n');forgetKatalog();};
const identity=id=>({reihe:'test',id}),source=id=>'designs/test/'+id+'/design.json';
const approval={status:'freigegeben',am:'2026-10-01T12:00:00Z',von:'source-operator'};
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-assignments-'));t.after(()=>{forgetKatalog();fs.rmSync(root,{recursive:true,force:true});});
 for(const part of ['familien','themen.json','schriften'])fs.cpSync(path.join(FIXTURE,part),path.join(root,part),{recursive:true});
 const base=read(root,'familien/edelstahl/test-schilder.json');base.sizes=base.sizes.filter(size=>size.groupKey==='RE');base.sizes.forEach(size=>size.baseCents=null);write(root,'familien/edelstahl/test-schilder.json',base);
 for(const [id,kind,process,shape]of [['slate-test','slate','slate-engraving','rect'],['oval-test','steel','steel-black-engraving','ellipse']]){
  const family=structuredClone(base);family.id=id;family.name=id;family.material.kind=kind;family.material.processingProfileId=process==='steel-black-engraving'?base.material.processingProfileId:process;
  family.groups=family.groups.filter(group=>group.key==='RE').map(group=>({...group,shape,cornerRadiusMm:0}));family.sizes.forEach(size=>size.key=id+'-'+size.key);write(root,'familien/test/'+id+'.json',family);
 }
 write(root,'linien/test.json',{schema:'gravuru-line/v2',id:'test-line',name:'Test line',families:['test-schilder','slate-test','oval-test'],subcategories:[{id:'names',name:'Names',themeId:'namensschilder'}]});
 for(const id of ['T-D1','T-D2','T-D3']){
  write(root,source(id),{id,name:id,material:'Edelstahl',process:'Gravur',form:'Rechteck',plateMm:[90,60],sizes:base.sizes.map(size=>size.key),themes:['namensschilder'],fonts:[],texts:[],motifs:[],photos:[],freigabe:approval,ziele:[{familie:'test-schilder',freigabe:approval}]});
  write(root,'designs/test/'+id+'/design.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><path d="M10 10L20 10L20 20Z"/></svg>\n');
 }
 write(root,'designs/test/index.json',['T-D1','T-D2','T-D3'].map(key=>({key,themen:['namensschilder']})));
 write(root,'designs/test/zuordnung.json',Object.fromEntries(['D1','D2','D3'].map(key=>[key,{themen:['namensschilder']}])));
 return {root,base};
}
function plan(root,designs,change){const prepared=prepareDesignAssignments(root,{designs:designs.map(identity),change});return {prepared,input:{designs:prepared.designs.map(({reihe,id,sourceChecksum})=>({reihe,id,sourceChecksum})),change,checksum:prepared.checksum}};}
function snapshot(root){const files={};function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else files[path.relative(root,file).split(path.sep).join('/')]=fs.readFileSync(file).toString('base64');}}walk(root);return files;}
const audit=root=>fs.existsSync(path.join(root,'designs/test/_aenderungen.jsonl'))?fs.readFileSync(path.join(root,'designs/test/_aenderungen.jsonl'),'utf8').trim().split('\n').map(JSON.parse):[];

test('assignment preparation counts each pair, uses native compatibility and never writes',t=>{
 const {root,base}=fixture(t),before=snapshot(root),{prepared}=plan(root,['T-D1','missing'],{familyIds:['test-schilder','slate-test','oval-test','unknown']});
 assert.deepEqual(prepared.counts,{designs:2,pairs:4,addable:1,existing:1,incompatible:2,rejected:1});
 assert.deepEqual(prepared.designs[0].pairs.map(pair=>pair.status),['existing','addable','incompatible','incompatible']);
 const slate=prepared.designs[0].pairs[1];assert.deepEqual([...slate.sizeKeys].sort(),base.sizes.map(size=>'slate-test-'+size.key).sort());assert.equal(slate.readiness.complete,false);assert.match(slate.readiness.issues.join(' '),/Grundpreis/);
 assert.match(prepared.designs[0].pairs[2].reasons.join(' '),/Andere Form/);assert.equal(prepared.designs[1].error.status,404);
 assert.deepEqual(snapshot(root),before);
 const family=designDashboard(root,{linie:'test-line'}).familien.find(family=>family.id==='slate-test');assert.equal(family.material,'Schiefer');assert.equal(family.readiness.complete,false);
});

test('assignment apply adds compatible targets only, preserves approvals and retries without another audit line',async t=>{
 const {root}=fixture(t),{input}=plan(root,['T-D1','missing'],{familyIds:['test-schilder','slate-test','oval-test']});
 const result=await applyDesignAssignments(root,input,{actor:'merchant:123',now:new Date('2026-10-26T10:00:00Z')});
 assert.equal(result.counts.changed,1);assert.equal(result.counts.rejected,1);assert.equal(result.counts.added,1);assert.equal(result.counts.incompatible,1);
 assert.deepEqual(result.designs[0].pairs.map(pair=>pair.status),['existing','added','incompatible']);
 const saved=read(root,source('T-D1'));assert.deepEqual(saved.ziele,[{familie:'test-schilder',freigabe:approval},{familie:'slate-test',freigabe:null}]);assert.deepEqual(saved.freigabe,approval);
 assert.equal(audit(root).length,1);assert.equal(audit(root)[0].actor,'merchant:123');assert.equal(audit(root)[0].at,'2026-10-26T10:00:00.000Z');
 const again=await applyDesignAssignments(root,input);assert.equal(again.counts.changed,0);assert.equal(again.counts.unchanged,1);assert.equal(audit(root).length,1);openKatalog(root);
});

test('theme deltas update source, mapping and index together without touching existing approvals',async t=>{
 const {root}=fixture(t),{input}=plan(root,['T-D1','T-D2'],{themeAdd:['hundeschilder'],themeRemove:['namensschilder']});
 const result=await applyDesignAssignments(root,input);assert.equal(result.counts.changed,2);
 for(const id of ['T-D1','T-D2']){const saved=read(root,source(id));assert.deepEqual(saved.themes,['hundeschilder']);assert.deepEqual(saved.ziele[0].freigabe,approval);assert.deepEqual(saved.freigabe,approval);}
 assert.deepEqual(read(root,'designs/test/index.json')[0].themen,['hundeschilder']);assert.deepEqual(read(root,'designs/test/zuordnung.json').D1.themen,['hundeschilder']);
 const after=snapshot(root),again=await applyDesignAssignments(root,input);assert.equal(again.counts.unchanged,2);assert.deepEqual(snapshot(root),after);
});

test('assignment errors roll back one design including its audit while other designs continue',async t=>{
 const {root}=fixture(t),beforeD1=fs.readFileSync(path.join(root,source('T-D1')),'utf8'),{input}=plan(root,['T-D1','T-D2'],{themeAdd:['hundeschilder']});
 const result=await applyDesignAssignments(root,input,{beforeReplace:(design,relative)=>{assert.equal(fs.existsSync(path.join(root,'designs/.werkstatt-write.lock')),true);if(design.id==='T-D1'&&relative.endsWith('_aenderungen.jsonl'))throw Error('injected audit failure');}});
 assert.equal(result.counts.rejected,1);assert.equal(result.counts.changed,1);assert.match(result.designs[0].error.message,/injected/);
 assert.equal(fs.readFileSync(path.join(root,source('T-D1')),'utf8'),beforeD1);assert.deepEqual(read(root,'designs/test/index.json')[0].themen,['namensschilder']);assert.deepEqual(read(root,'designs/test/zuordnung.json').D1.themen,['namensschilder']);
 assert.deepEqual(read(root,source('T-D2')).themes,['namensschilder','hundeschilder']);assert.equal(audit(root).length,1);assert.equal(audit(root)[0].designId,'T-D2');
 assert.equal(fs.existsSync(path.join(root,'designs/.werkstatt-write.lock')),false);assert.equal(fs.existsSync(path.join(root,'designs/.werkstatt-write-journal.json')),false);openKatalog(root);
});

test('fresh source and family rules are rechecked per transaction, with stale compatible mutations rejected',async t=>{
 const {root}=fixture(t),{input}=plan(root,['T-D1','T-D2','T-D3'],{familyIds:['slate-test']});
 const first=read(root,source('T-D1'));first.form='Oval';write(root,source('T-D1'),first);
 const second=read(root,source('T-D2'));second.name='Changed source';write(root,source('T-D2'),second);
 const result=await applyDesignAssignments(root,input);assert.equal(result.counts.rejected,2);assert.equal(result.counts.changed,1);assert.equal(result.designs[0].pairs[0].status,'incompatible');assert.equal(result.designs[1].error.status,409);assert.equal(result.designs[2].pairs[0].status,'added');
 for(const id of ['T-D1','T-D2'])assert.equal(read(root,source(id)).ziele.length,1);
 const another=plan(root,['T-D2'],{familyIds:['slate-test']});const family=read(root,'familien/test/slate-test.json');family.name='Changed rules';write(root,'familien/test/slate-test.json',family);
 assert.equal((await applyDesignAssignments(root,another.input)).designs[0].error.status,409);
});

test('separate prepared batches survive unrelated design writes, while changed themes cannot be overwritten',async t=>{
 const {root}=fixture(t),first=plan(root,['T-D1'],{themeAdd:['hundeschilder']}),second=plan(root,['T-D2'],{themeAdd:['hundeschilder']});
 assert.equal((await applyDesignAssignments(root,first.input)).counts.changed,1);assert.equal((await applyDesignAssignments(root,second.input)).counts.changed,1);
 const stale=plan(root,['T-D3'],{themeAdd:['hundeschilder']});patchDesign(root,{reihe:'test',designId:'T-D3',themes:['namensschilder','gedenktafeln']});
 assert.equal((await applyDesignAssignments(root,stale.input)).designs[0].error.status,409);assert.deepEqual(read(root,source('T-D3')).themes,['namensschilder','gedenktafeln']);
 const fresh=plan(root,['T-D3'],{themeAdd:['hundeschilder']});assert.equal((await applyDesignAssignments(root,fresh.input)).counts.changed,1);assert.deepEqual(read(root,source('T-D3')).themes,['namensschilder','gedenktafeln','hundeschilder']);
 let locked=false;patchDesignDerived(root,katalog=>{locked=fs.existsSync(path.join(root,'designs/.werkstatt-write.lock'));const master=katalog.designs.masters.find(master=>master.id==='T-D3');return {reihe:'test',designId:'T-D3',themes:master.themes};});assert.equal(locked,true);
});

test('batch envelope enforces 500 designs, distinct identities, action whitelists and prepared checksums',async t=>{
 const {root}=fixture(t),request={designs:[identity('T-D1')],change:{familyIds:['slate-test']}};
 for(const bad of [{...request,designs:[]},{...request,designs:Array.from({length:501},(_,i)=>identity('D'+i))},{...request,designs:[identity('T-D1'),identity('T-D1')]},{...request,designs:[{reihe:'../test',id:'T-D1'}]},{...request,change:{familyIds:['slate-test'],freigegeben:true}},{...request,change:{themeAdd:['hundeschilder'],themeRemove:['hundeschilder']}},{...request,actor:'forged'}])assert.throws(()=>prepareDesignAssignments(root,bad),error=>error.status===422);
 assert.equal(prepareDesignAssignments(root,{...request,designs:Array.from({length:500},(_,i)=>identity('missing-'+i))}).counts.designs,500);
 const {input}=plan(root,['T-D1'],request.change),before=snapshot(root);
 for(const bad of [{...input,checksum:'0'.repeat(64)},{...input,change:{familyIds:['oval-test']}},{...input,designs:[{...input.designs[0],sourceChecksum:undefined}]},{...input,freigegeben:true}])await assert.rejects(applyDesignAssignments(root,bad),error=>[409,422].includes(error.status));
 assert.deepEqual(snapshot(root),before);
});

test('unknown themes are individual failures and the combined target list cannot exceed 100',async t=>{
 const {root,base}=fixture(t),bad=plan(root,['T-D1','T-D2'],{themeAdd:['unknown']});assert.equal(bad.prepared.counts.rejected,2);assert.equal((await applyDesignAssignments(root,bad.input)).counts.rejected,2);assert.equal(audit(root).length,0);
 const targets=[{familie:'test-schilder',freigabe:approval}];
 for(let index=0;index<100;index++){const family=structuredClone(base);family.id='extra-'+index;write(root,'familien/test/'+family.id+'.json',family);if(index<99)targets.push({familie:family.id,freigabe:null});}
 const master=read(root,source('T-D1'));master.ziele=targets;write(root,source('T-D1'),master);const before=snapshot(root),over=plan(root,['T-D1'],{familyIds:['extra-99']});
 assert.equal(over.prepared.designs[0].error.status,422);assert.match(over.prepared.designs[0].error.message,/100/);assert.equal((await applyDesignAssignments(root,over.input)).counts.rejected,1);
 assert.throws(()=>patchDesign(root,{reihe:'test',designId:'T-D1',zieleHinzufuegen:['extra-99']}),error=>error.status===422);assert.deepEqual(snapshot(root),before);assert.equal(openKatalog(root).designs.masters.find(master=>master.id==='T-D1').targets.length,100);
});
