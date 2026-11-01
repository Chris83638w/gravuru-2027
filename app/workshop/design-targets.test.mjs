import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {validateDesignTargets,resolveOwnFamilies,resolveDesignTargets,designTargets,approvedForFamily,planDesignTargetMigration,designTargetCompatibility,assignTargetSeries} from './design-targets.mjs';
import {openKatalog} from './katalog-source.mjs';
import {migrateDesignTargets} from '../../scripts/migrate-design-targets.mjs';
const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const base=JSON.parse(fs.readFileSync(path.join(FIXTURE,'familien/edelstahl/test-schilder.json'),'utf8'));
const family=(id='steel',patch={})=>({...structuredClone(base),id,...patch});
const context=(families,lines=[])=>({families:new Map(families.map(f=>[f.id,f])),lines:new Map(lines.map(l=>[l.id,l]))});
const approval={status:'freigegeben',am:'2026-10-23T12:34:56.000Z',von:'Sitzung 123',note:'Originalfreigabe'};
const master=(extra={})=>({id:'D1',plateMm:[90,60],material:'Edelstahl',process:'Gravur',form:'Rechteck',themes:['names'],freigabe:structuredClone(approval),...extra});
const line=(id,families,subcategories=[{themeId:'names'}])=>({id,families,subcategories});
const fixture=t=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-targets-'));fs.cpSync(FIXTURE,root,{recursive:true});t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};
const snapshot=root=>Object.fromEntries(fs.readdirSync(root,{recursive:true}).filter(rel=>fs.statSync(path.join(root,rel)).isFile()).sort().map(rel=>[rel,fs.readFileSync(path.join(root,rel)).toString('base64')]));
const update=(root,rel,patch)=>{const file=path.join(root,rel),json=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(json,patch);fs.writeFileSync(file,JSON.stringify(json,null,1)+'\n');return json;};

test('legacy approval belongs only to its material/process family, retaining every original approval value',()=>{
 const engraving=family(),print=family('print',{material:{...base.material,processingProfileId:'color-print'}}),slate=family('slate',{material:{...base.material,kind:'slate',processingProfileId:'slate-engraving'}}),k=context([engraving,print,slate]),d=master();
 const resolved=resolveDesignTargets(d,k);assert.equal(resolved.source,'legacy');assert.deepEqual(resolved.targets,[{familie:'steel',freigabe:approval}]);assert.deepEqual(d,master());
 assert.equal(approvedForFamily(d,'steel',k),true);assert.equal(approvedForFamily(d,'print',k),false);assert.equal(approvedForFamily(d,'slate',k),false);
 assert.deepEqual(resolveOwnFamilies(master({process:'UV-Druck'}),k).families,['print']);
 const empty=master({freigabe:undefined});assert.deepEqual(designTargets(empty,k),[{familie:'steel',freigabe:null}]);
});
test('explicit targets including [] are authoritative; global historical approval never expands them',()=>{
 const k=context([family(),family('other')]);
 assert.deepEqual(designTargets(master({ziele:[]}),k),[]);assert.equal(approvedForFamily(master({ziele:[]}), 'steel',k),false);
 const d=master({ziele:[{familie:'other',freigabe:null},{familie:'steel',freigabe:{status:'offen',von:'123'}}]});assert.equal(approvedForFamily(d,'other',k),false);assert.equal(approvedForFamily(d,'steel',k),false);
 d.ziele[0].freigabe=approval;assert.equal(approvedForFamily(d,'other',k),true);assert.deepEqual(resolveDesignTargets(d,k).targets,d.ziele);
});
test('target schema rejects duplicates, malformed approvals, unknown families and invented extra fields',()=>{
 const k=context([family()]);for(const ziele of [null,{},[{familie:'steel'}],[{familie:'steel',freigabe:false}],[{familie:'steel',freigabe:{status:'approved'}}],[{familie:'missing',freigabe:null}],[{familie:'steel',freigabe:null,price:0}],[{familie:'steel',freigabe:null},{familie:'steel',freigabe:null}]])assert.throws(()=>validateDesignTargets({ziele},{families:k.families}),e=>e.code==='design_targets_invalid');
 assert.deepEqual(validateDesignTargets({ziele:[{familie:'steel',freigabe:approval}]},{families:k.families}),[{familie:'steel',freigabe:approval}]);
});
test('ambiguous own families fail closed; direct start-design binding outranks broad theme matches',()=>{
 const a=family('a'),b=family('b'),d=master(),k=context([a,b]);
 assert.deepEqual(designTargets(d,k),[]);assert.equal(resolveDesignTargets(d,k).issues[0].code,'family_ambiguous');assert.equal(approvedForFamily(d,'a',k),false);
 k.lines.set('theme',line('theme',['a','b']));assert.equal(resolveOwnFamilies(d,k).issues[0].code,'family_ambiguous');
 k.lines.set('direct',line('direct',['b'],[{mainProducts:[{startDesign:d.id}]}]));assert.deepEqual(resolveOwnFamilies(d,k).families,['b']);
 const themed=context([a,b],[line('known',['a'])]);assert.deepEqual(resolveOwnFamilies(d,themed).families,['a']);
});
test('explicit size ownership and source form are honored; unknown explicit sizes do not fall back to a matching ratio',()=>{
 const a=family('a'),b=family('b');b.sizes=b.sizes.map(s=>({...s,key:'B-'+s.key}));const k=context([a,b]);
 assert.deepEqual(resolveOwnFamilies(master({sizes:[a.sizes[0].key]}),k).families,['a']);
 assert.deepEqual(resolveOwnFamilies(master({sizes:[a.sizes[0].key,b.sizes[0].key]}),k).families,['a','b']);
 k.lines.set('partial',line('partial',['a']));assert.deepEqual(resolveOwnFamilies(master({sizes:[a.sizes[0].key,b.sizes[0].key]}),k).families,['a','b'],'a thematic line must not drop another explicit own family');
 assert.equal(resolveOwnFamilies(master({sizes:['unknown']}),k).issues[0].code,'family_size_missing');
 assert.equal(resolveOwnFamilies(master({form:'Oval'}),context([a])).families.length,0);
 const oval=family('oval');oval.groups=oval.groups.map(g=>({...g,shape:'ellipse'}));assert.deepEqual(resolveOwnFamilies(master({form:'Oval'}),context([a,oval])).families,['oval']);
 const duplicate=family('duplicate');assert.equal(resolveOwnFamilies(master({sizes:[a.sizes[0].key]}),context([a,duplicate])).issues[0].code,'family_ambiguous');
});
test('dry-run writes nothing; apply preserves approvals, SVGs and legacy JSON, audits and is byte-idempotent',t=>{
 const root=fixture(t),relative='designs/3-2/test-herz/design.json',old=update(root,relative,{material:'Edelstahl',process:'Gravur',freigabe:approval}),before=snapshot(root);
 const dry=migrateDesignTargets(root);assert.equal(dry.mode,'dry-run');assert.equal(dry.written.length,0);assert.deepEqual(snapshot(root),before);
 const first=migrateDesignTargets(root,{apply:true,actor:'test-session',now:new Date('2026-10-24T10:00:00Z')});assert.ok(first.written.length>0);assert.equal(first.counts.approvedBefore,first.counts.approvedAfter);
 const saved=JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));assert.deepEqual(saved,{...old,ziele:[{familie:'test-schilder',freigabe:approval}]});
 for(const [rel,bytes]of Object.entries(before))if(rel.endsWith('.svg'))assert.equal(snapshot(root)[rel],bytes,'SVG untouched: '+rel);
 const log=fs.readFileSync(path.join(root,'designs/3-2/_aenderungen.jsonl'),'utf8').trim().split('\n').map(JSON.parse);assert.ok(log.every(e=>e.actor==='test-session'&&e.action==='migrate-design-targets'));assert.equal(log.filter(e=>e.designId==='test-herz').length,1);
 const applied=snapshot(root),again=migrateDesignTargets(root,{apply:true});assert.equal(again.written.length,0);assert.deepEqual(snapshot(root),applied);assert.equal(approvedForFamily(openKatalog(root).designs.masters.find(d=>d.id==='test-herz'),'test-schilder',openKatalog(root)),true);
});
test('migration never modifies ambiguous legacy approvals or an explicit empty target list',t=>{
 const root=fixture(t),first='designs/3-2/test-herz/design.json';update(root,first,{freigabe:approval,ziele:[]});
 const second='designs/3-2/test-foto/design.json';update(root,second,{freigabe:approval,themes:[],material:'Edelstahl',process:'Gravur'});const other=family('other');fs.writeFileSync(path.join(root,'familien/edelstahl/other.json'),JSON.stringify(other));
 const before=fs.readFileSync(path.join(root,second),'utf8'),plan=planDesignTargetMigration(openKatalog(root));assert.equal(plan.rows.find(r=>r.id==='test-herz').status,'unchanged');assert.equal(plan.rows.find(r=>r.id==='test-foto').status,'blocked');
 migrateDesignTargets(root,{apply:true});assert.equal(fs.readFileSync(path.join(root,second),'utf8'),before);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,first),'utf8')).ziele,[]);
});
test('failed JSON/audit pair is rolled back and the catalogue lock is released',t=>{
 const root=fixture(t),before=snapshot(root);assert.throws(()=>migrateDesignTargets(root,{apply:true,beforeReplace:(_file,index)=>{if(index===1)throw Error('injected audit rename failure');}}),/injected audit/);assert.deepEqual(snapshot(root),before);assert.equal(fs.existsSync(path.join(root,'designs/.werkstatt-write.lock')),false);
 assert.ok(migrateDesignTargets(root,{apply:true}).written.length>0);
});
test('CLI requires an explicit path, keeps dry-run read-only and blocks report destinations in the catalogue',t=>{
 const root=fixture(t),before=snapshot(root),script=fileURLToPath(new URL('../../scripts/migrate-design-targets.mjs',import.meta.url));
 assert.throws(()=>execFileSync(process.execPath,[script,'--apply'],{env:{...process.env,GRAVURU_KATALOG:root},stdio:'pipe'}),error=>/Pfad ausdrücklich/.test(error.stderr.toString()));
 const out=JSON.parse(execFileSync(process.execPath,[script,'--katalog',root],{encoding:'utf8'}));assert.equal(out.mode,'dry-run');assert.equal(out.written,0);assert.deepEqual(snapshot(root),before);
 assert.throws(()=>execFileSync(process.execPath,[script,'--katalog',root,'--json',path.join(root,'themen.json')],{stdio:'pipe'}),error=>/außerhalb/.test(error.stderr.toString()));assert.deepEqual(snapshot(root),before);
});


test('target compatibility preserves source sizes, separates equal-ratio forms and requires variants for new ratios',()=>{
 const a=family('a'),b=family('print',{material:{...base.material,processingProfileId:'color-print'}});b.sizes=b.sizes.map(s=>({...s,key:'UV-'+s.key}));const k=context([a,b]);
 const d=master({sizes:[a.sizes[0].key]});
 assert.equal(designTargetCompatibility(d,a,a.sizes[0],{katalog:k}).status,'passt');
 assert.equal(designTargetCompatibility(d,a,a.sizes[1],{katalog:k}).variantRequired,true,'own explicit size list stays binding');
 assert.deepEqual(assignTargetSeries(a,[d],k)[0].sizes,[a.sizes[0].key]);
 assert.equal(designTargetCompatibility(d,b,b.sizes[0],{katalog:k}).status,'passt','same-form transfer to existing print size');
 assert.deepEqual(assignTargetSeries(b,[d],k)[0].sizes,[b.sizes[2].key,b.sizes[0].key,b.sizes[1].key]);
 assert.match(designTargetCompatibility(d,b,b.sizes[3],{katalog:k}).issues.join(' '),/Seitenverhältnis/);
 const oval=family('oval',{groups:a.groups.map(g=>({...g,shape:'ellipse'}))});k.families.set(oval.id,oval);
 assert.match(designTargetCompatibility(d,oval,oval.sizes[0],{katalog:k}).issues.join(' '),/Andere Form/);
 assert.deepEqual(assignTargetSeries(oval,[d],k)[0].sizes,[]);
 const rounded=family('rounded',{groups:a.groups.map(g=>({...g,cornerRadiusMm:5}))});assert.equal(designTargetCompatibility(d,rounded,rounded.sizes[0],{katalog:k}).variantRequired,true);
 assert.equal(designTargetCompatibility(master({sizes:[]}),a,a.sizes[0],{katalog:k}).variantRequired,true);
 const contour=family('retro',{groups:[{key:'RT2',shape:'contour',cornerRadiusMm:0}],sizes:[{...a.sizes[0],key:'RT2-9X6',groupKey:'RT2',outlinePath:'M0 0H90V60H0Z'}]});k.families.set(contour.id,contour);
 const retro=master({form:'Retro2',plateMm:[90.6,61.3],sizesOpen:['TR2-V2A-9x6']});assert.equal(designTargetCompatibility(retro,contour,contour.sizes[0],{katalog:k}).status,'passt','existing source-authorized Retro contain mapping stays intact');
 const wrong=master({...retro,form:'Retro1'});assert.equal(designTargetCompatibility(wrong,contour,contour.sizes[0],{katalog:k}).variantRequired,true);
});

test('derived acrylic variants retain own and sibling size restrictions with geometry verification',()=>{
 const steel=family('steel'),black=family('black',{source:{path:'familien/edelstahl/steel.json'}}),grey=family('grey',{source:{path:'familien/edelstahl/steel.json'}});
 black.sizes=black.sizes.map(s=>({...s,key:'BLACK-'+s.key}));grey.sizes=grey.sizes.map(s=>({...s,key:'GREY-'+s.key}));
 const k={...context([steel,black,grey]),root:'/catalog',files:new Map([['familie:steel','/catalog/familien/edelstahl/steel.json']])};
 const d=master({sizes:[black.sizes[0].key],masterSheet:{familySize:black.sizes[0].key}});
 assert.deepEqual(assignTargetSeries(black,[d],k)[0].sizes,[black.sizes[0].key]);
 assert.deepEqual(assignTargetSeries(grey,[d],k)[0].sizes,[grey.sizes[0].key]);
 assert.equal(designTargetCompatibility(d,grey,grey.sizes[1],{katalog:k}).variantRequired,true);
 const original=master({sizes:[steel.sizes[0].key]});
 assert.deepEqual(assignTargetSeries(grey,[original],k)[0].sizes,[grey.sizes[0].key]);
 grey.sizes[0].widthMm+=1;
 assert.deepEqual(assignTargetSeries(grey,[d],k)[0].sizes,[],'shared provenance never authorizes changed geometry');
});
