import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {designDashboard,designFile,patchDesign,pendingChanges,forgetKatalog,MIN_TEXT_MM} from './design-dashboard.mjs';
import {readCorrections,planCorrectionWriteback,applyCorrectionWriteback,updateSvgText,formatPlan} from './katalog-writeback.mjs';
import {createDesignCorrections} from './design-corrections.mjs';
import {openKatalog} from './katalog-source.mjs';
import {createWorkshop} from './http.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {DatabaseSync} from 'node:sqlite';

const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const write=(root,rel,value)=>{const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,1)+'\n');};
const svg=(w,h,inner)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">\n<rect id="platte" width="${w}" height="${h}" fill="none" stroke="#999" stroke-width="0.2"/>\n${inner}\n</svg>\n`;
const textEl=(n,x,y,font,size,text)=>`<text id="text-${n}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-family="${font}" font-size="${size.toFixed(2)}" fill="#000000" text-anchor="middle"><tspan x="${x.toFixed(2)}" dy="0.00">${text}</tspan></text>`;
// Mini-Katalog: 1 Linie (Familie aus dem Fixture: Reihe 3:2 mit 90×60/60×40/120×80), 1 Lieferform-2-Reihe mit
// 3 Designs (ok / Schrift fehlt + Text < 3 mm / Element außerhalb + Ersatzschrift), Bestand-Bogen „T“ mit
// grünem Design ohne Lieferform 2, einem Doppelt, einer Produktionsfassung und einem roten Design.
function miniKatalog(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-designs-'));t.after(()=>{forgetKatalog();fs.rmSync(root,{recursive:true,force:true});});
 for(const part of ['familien','themen.json','schriften'])fs.cpSync(path.join(FIXTURE,part),path.join(root,part),{recursive:true});
 write(root,'schriften/ersatz-test.json',{_quelle:'Test',Arial:'Lato'});
 write(root,'linien/test-linie.json',{schema:'gravuru-line/v2',id:'test-linie',name:'Test Linie',families:['test-schilder'],status:'Fixture',subcategories:[{id:'namensschilder',name:'Namensschilder',themeId:'namensschilder',fontSet:'tuerschilder',priceOverrides:{},sizesOffered:null,options:null,collectionHandle:null,mainProducts:[{id:'1000',name:'Hauptprodukt',startDesign:'T-D1',sizesOffered:['TS-RE-90X60']}]}]});
 const reihe='designs/test-reihe/';
 const textJson=(text,font,sizePt,x,y,extra={})=>({text,font,sizePt,color:'#000000',align:'center',anchorMm:[x,y],...extra});
 write(root,reihe+'T-D1/design.json',{id:'T-D1',source:'T-D1 (Bestand, T_Designs.cdr)',material:'Edelstahl',process:'Gravur',form:'',plate:{widthMm:90.0,heightMm:60.0},texts:[textJson('Familie',"Michroma",16.5,45,25),textJson('Muster','Michroma',16.5,45,40)],fonts:['Michroma'],motifs:[{box:[10,29,70,0.4],paths:[]}],photos:[],warnings:[],name:'Zwei Zeilen',plateMm:[90.0,60.0],transfer:{fromKey:'T-D1'},themes:['namensschilder'],nameSheet:'D1 Muster'});
 write(root,reihe+'T-D1/design.svg',svg(90,60,'<g id="motiv-1"><rect x="10" y="29" width="70" height="0.4" fill="#000"/></g>\n'+textEl(1,45,25,'Michroma',5.82,'Familie')+'\n'+textEl(2,45,40,'Michroma',5.82,'Muster')));
 fs.writeFileSync(path.join(root,reihe,'T-D1/original.png'),Buffer.from('89504e470d0a1a0a','hex'));
 write(root,reihe+'T-D2/design.json',{id:'T-D2',material:'Edelstahl',process:'Gravur',plate:{widthMm:90.0,heightMm:60.0},texts:[textJson('Name','Fantasia',8,45,30),textJson('klein','Michroma',6,45,50)],fonts:['Fantasia','Michroma'],motifs:[],photos:[],name:'Schrift fehlt',plateMm:[90,60],transfer:{fromKey:'T-D2'},themes:['namensschilder']});
 write(root,reihe+'T-D2/design.svg',svg(90,60,textEl(1,45,30,'Fantasia',2.82,'Name')+'\n'+textEl(2,45,50,'Michroma',2.12,'klein')));
 write(root,reihe+'T-D3/design.json',{id:'T-D3',material:'Edelstahl',process:'Gravur',plate:{widthMm:90.0,heightMm:60.0},texts:[textJson('Arial-Text','Arial',12,45,30)],fonts:['Arial'],motifs:[{box:[80,50,20,20],paths:[]}],photos:[],name:'Motiv außerhalb',plateMm:[90,60],themes:['hundeschilder']});
 write(root,reihe+'T-D3/design.svg',svg(90,60,'<g id="motiv-1"><rect x="80" y="50" width="20" height="20" fill="#000"/></g>\n'+textEl(1,45,30,'Arial',4.23,'Arial-Text')));
 write(root,reihe+'zuordnung.json',{_quelle:'Test',D1:{name:'Zwei Zeilen'},D2:{name:'Schrift fehlt'}});
 write(root,reihe+'index.json',[{key:'T-D1',name:'Zwei Zeilen',themen:['namensschilder']},{key:'T-D2',name:'Schrift fehlt',themen:['namensschilder']}]);
 const bogen='designs/bestand/boegen/T/';
 const entry=(id,labelColor,extra={})=>({id,sheet:'T_Designs.cdr',sheetLabel:'9x6',material:'Edelstahl',process:'Gravur',form:'Rechteck',sourcePath:'9x6/[CDR]/T_Designs.cdr',plate:{widthMm:90.0,heightMm:60.0,source:'schnittlinie'},labelColor,customizationIds:[],sheetBoxMm:[0,0,90,60],texts:[{text:'Muster',font:'Michroma',sizePt:16.5,align:'center',box:[20,20,50,6]}],fonts:['Michroma'],images:[],photoFiles:[],motifCount:0,...extra});
 write(root,bogen+'designs.json',[entry('T-D10','#00ff00'),entry('T-D5','#ff0000'),entry('T-D4-DOPPELT2','#00ff00',{duplicateOf:'T-D4',identicalDuplicate:false}),entry('T-D4','#00ff00'),entry('T-D2-PRODUKTION','#00ff00',{production:true,productionOf:'T-D2'}),entry('T-D2','#00ff00',{duplicateOf:'T-D1',identicalDuplicate:true}),entry('T-D1','#00ff00',{customizationIds:['1000']})]);
 write(root,bogen+'T-D4/design.svg',svg(90,60,textEl(1,45,30,'Michroma',5.82,'Muster')));
 write(root,'designs/bestand/boegen/_linie-test-gravur-edelstahl.json',{linie:'Test',process:'Gravur',material:'Edelstahl',sheets:[{base:'T',sheet:'T_Designs.cdr',formatreihe:'9x6',alteGroesse:false,designs:7,green:6,production:1,duplicates:2,ok:true}]});
 return root;
}
const fakeRepository=(products)=>({importItem:key=>products.find(p=>p.importKey===key)?{id:products.find(p=>p.importKey===key).id,key,fingerprint:'x'}:null,get:id=>{const p=products.find(p=>p.id===id);if(!p)throw Error('unbekannt');return {id:p.id,revision:p.revision,status:'draft',document:p.document};}});

test('Dashboard: Zeilen je Linie aus Lieferform 2 und Bestand, Ampel mit Gründen, Schriftstatus, natürliche Reihenfolge, Zähler',t=>{
 const root=miniKatalog(t);
 const list=designDashboard(root);
 assert.deepEqual(list.linien.map(l=>[l.id,l.designsLieferform2,l.bestand]),[['test-linie',3,['test-gravur-edelstahl']]]);
 const repository=fakeRepository([{id:'cfg_1',revision:2,importKey:'katalog:test-linie:namensschilder:TS-RE-90X60:1000',document:{config:{profile:{id:'katalog-test-linie-namensschilder-ts-re-90x60-1000',designs:[{id:'katalog-T-D1',katalog:{designId:'T-D1'}}]}}}}]);
 const d=designDashboard(root,{linie:'test-linie',repository});
 assert.deepEqual(d.rows.map(r=>r.id),['T-D1','T-D2','T-D3','T-D4','T-D4-DOPPELT2','T-D5','T-D10'],'natürlich sortiert, Produktionsfassung keine eigene Zeile');
 assert.deepEqual(d.counts,{total:7,ok:1,'prüfen':2,fehlt:4,selectable:6,lieferform2:3,bestandOnly:4,hidden:0});
 const by=Object.fromEntries(d.rows.map(r=>[r.id,r]));
 assert.equal(by['T-D1'].status,'ok');assert.deepEqual(by['T-D1'].reasons,[]);assert.equal(by['T-D1'].name,'Zwei Zeilen');assert.equal(by['T-D1'].nameSheet,'D1 Muster');
 assert.equal(by['T-D1'].formatreihe,'60x40');assert.deepEqual(by['T-D1'].plate,[90,60]);assert.equal(by['T-D1'].reihe,'test-reihe');
 assert.deepEqual(by['T-D1'].bestand.customizationIds,['1000']);assert.equal(by['T-D1'].labelColor,'#00ff00');
 assert.deepEqual(by['T-D1'].fonts,[{name:'Michroma',status:'vorhanden',file:false,license:'Google Fonts – SIL Open Font License',replacement:null}]);
 assert.equal(by['T-D1'].files.png,'/api/workshop/designs/svg?reihe=test-reihe&id=T-D1&file=original.png');
 assert.deepEqual(by['T-D1'].konfi.products.map(p=>[p.productId,p.revision,p.templateId,p.href]),[['cfg_1',2,'katalog-T-D1','/werkstatt/?configuration=cfg_1&design=katalog-T-D1']]);
 assert.equal(by['T-D2'].status,'prüfen');
 assert.ok(by['T-D2'].reasons.includes('Schrift fehlt: Fantasia.'),by['T-D2'].reasons.join('|'));
 assert.ok(by['T-D2'].reasons.some(r=>/Text 1 ist mit 2\.82 mm kleiner als 3 mm/.test(r)),by['T-D2'].reasons.join('|'));
 assert.ok(by['T-D2'].reasons.includes('Doppelt: wie T-D1.'));
 assert.equal(by['T-D2'].production.hasVersion,true);assert.equal(by['T-D2'].production.of,'T-D2-PRODUKTION');
 assert.deepEqual(by['T-D2'].fonts.map(f=>f.name+':'+f.status),['Fantasia:fehlt','Michroma:vorhanden']);
 assert.equal(by['T-D2'].konfi.imported,false,'nicht im Produkt → noch nicht importiert');
 assert.equal(by['T-D3'].status,'prüfen');
 assert.ok(by['T-D3'].reasons.includes('Motiv 1 liegt außerhalb der Platte.'));
 assert.ok(by['T-D3'].reasons.some(r=>/Thema passt zu keiner Unterkategorie/.test(r)));
 assert.deepEqual(by['T-D3'].fonts[0],{name:'Arial',status:'ersatz',file:false,license:null,replacement:'Lato',source:'schriften/ersatz-test.json'});
 assert.equal(by['T-D4'].status,'fehlt');assert.deepEqual(by['T-D4'].reasons,['keine Lieferform 2.']);assert.equal(by['T-D4'].selectable,true);assert.equal(by['T-D4'].files.svg,'/api/workshop/designs/svg?bestand=T&id=T-D4&file=design.svg');
 assert.equal(by['T-D4-DOPPELT2'].status,'fehlt');assert.ok(by['T-D4-DOPPELT2'].reasons.includes('Abweichende Fassung zu T-D4.'));
 assert.equal(by['T-D5'].selectable,false);assert.match(by['T-D5'].reasons[0],/rot = nicht wählbar/);
 assert.equal(by['T-D10'].bestand.formatreihe,'9x6');
 assert.deepEqual(d.reihen.map(r=>r.key+':'+r.counts.total),['T:4','test-reihe:3']);
 assert.deepEqual(d.materials.map(m=>m.key),['Edelstahl']);
 assert.deepEqual(d.bestand.overviews,[{overview:'test-gravur-edelstahl',grund:'Herkunft der Lieferform-2-Designs'}]);
 assert.equal(d.minTextMm,MIN_TEXT_MM);
 // Filter
 assert.deepEqual(designDashboard(root,{linie:'test-linie',status:'fehlt'}).rows.map(r=>r.id),['T-D4','T-D4-DOPPELT2','T-D5','T-D10']);
 assert.deepEqual(designDashboard(root,{linie:'test-linie',reihe:'test-reihe'}).rows.map(r=>r.id),['T-D1','T-D2','T-D3']);
 assert.deepEqual(designDashboard(root,{linie:'test-linie',reihe:'9x6'}).rows.map(r=>r.id),['T-D4','T-D4-DOPPELT2','T-D5','T-D10']);
 assert.equal(designDashboard(root,{linie:'test-linie',material:'Schiefer'}).rows.length,0);
 assert.throws(()=>designDashboard(root,{linie:'gibt-es-nicht'}),e=>e.status===404&&/Linie „gibt-es-nicht“/.test(e.message));
 assert.throws(()=>designDashboard(root,{linie:'test-linie',status:'egal'}),e=>e.status===422);
 assert.throws(()=>designDashboard(null),e=>e.status===503&&e.code==='katalog_missing');
 assert.throws(()=>designDashboard(path.join(root,'fehlt')),e=>e.status===503&&e.code==='katalog_missing');
});

test('Designdateien: nur design.svg/-produktion.svg/original.png/preview.png unter designs/, Pfadausbruch abgelehnt',t=>{
 const root=miniKatalog(t);
 const f=designFile(root,{reihe:'test-reihe',id:'T-D1',file:'design.svg'});
 assert.equal(f.type,'image/svg+xml; charset=utf-8');assert.equal(fs.realpathSync(f.file),fs.realpathSync(path.join(root,'designs/test-reihe/T-D1/design.svg')));
 assert.equal(designFile(root,{reihe:'test-reihe',id:'T-D1',file:'original.png'}).type,'image/png');
 assert.equal(designFile(root,{bestand:'T',id:'T-D4',file:'design.svg'}).type,'image/svg+xml; charset=utf-8');
 for(const bad of [{reihe:'..',id:'linien',file:'design.svg'},{reihe:'test-reihe',id:'../../linien',file:'design.svg'},{reihe:'test-reihe',id:'T-D1',file:'design.json'},{reihe:'test-reihe',id:'T-D1',file:'../design.svg'},{reihe:'test-reihe',bestand:'T',id:'T-D1',file:'design.svg'},{id:'T-D1',file:'design.svg'},{reihe:'bestand',id:'boegen',file:'design.svg'},{reihe:'_testlauf',id:'x',file:'design.svg'},{reihe:'test-reihe',id:'T-D2',file:'original.png'}])
  assert.throws(()=>designFile(root,bad),e=>e.status===404,JSON.stringify(bad));
 // Symbolischer Link nach außerhalb von designs/ wird nicht ausgeliefert.
 try{fs.symlinkSync(path.join(root,'linien/test-linie.json'),path.join(root,'designs/test-reihe/T-D1/preview.png'));assert.throws(()=>designFile(root,{reihe:'test-reihe',id:'T-D1',file:'preview.png'}),e=>e.status===404);}catch(e){if(e.code!=='EPERM')throw e;}
});

test('PATCH: Name/Themen/hidden atomar in design.json, zuordnung.json und index.json, Protokoll; Unbekanntes und Bestand abgelehnt',t=>{
 const root=miniKatalog(t);
 const before=fs.readFileSync(path.join(root,'designs/test-reihe/T-D1/design.json'),'utf8');
 const r=patchDesign(root,{reihe:'test-reihe',designId:'T-D1',name:'Familie, zwei Zeilen mittig'},{actor:'merchant:chris',now:new Date('2026-10-23T10:00:00Z')});
 assert.equal(r.changed,true);assert.deepEqual(r.changes,{name:{from:'Zwei Zeilen',to:'Familie, zwei Zeilen mittig'}});
 assert.deepEqual(r.files,['designs/test-reihe/T-D1/design.json','designs/test-reihe/zuordnung.json','designs/test-reihe/index.json','designs/test-reihe/_aenderungen.jsonl']);
 const after=fs.readFileSync(path.join(root,'designs/test-reihe/T-D1/design.json'),'utf8');
 assert.equal(JSON.parse(after).name,'Familie, zwei Zeilen mittig');
 assert.equal(after.replace(/"name": "[^"]*"/,''),before.replace(/"name": "[^"]*"/,''),'nur die Namenszeile ändert sich (Zahlenformat 90.0 bleibt)');
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'designs/test-reihe/zuordnung.json'),'utf8')).D1.name,'Familie, zwei Zeilen mittig');
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'designs/test-reihe/index.json'),'utf8'))[0].name,'Familie, zwei Zeilen mittig');
 assert.ok(!fs.readdirSync(path.join(root,'designs/test-reihe/T-D1')).some(n=>n.endsWith('.tmp')),'keine Temp-Datei bleibt liegen');
 const log=fs.readFileSync(path.join(root,'designs/test-reihe/_aenderungen.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l));
 assert.equal(log.length,1);assert.equal(log[0].actor,'merchant:chris');assert.equal(log[0].at,'2026-10-23T10:00:00.000Z');assert.deepEqual(log[0].changes.name,{from:'Zwei Zeilen',to:'Familie, zwei Zeilen mittig'});
 // Themen + hidden; hidden wird vom Katalogleser und vom Dashboard gesehen
 const r2=patchDesign(root,{reihe:'test-reihe',designId:'T-D3',themes:['namensschilder','hundeschilder'],hidden:true});
 assert.deepEqual(Object.keys(r2.changes),['themes','hidden']);
 const d3=JSON.parse(fs.readFileSync(path.join(root,'designs/test-reihe/T-D3/design.json'),'utf8'));
 assert.deepEqual(d3.themes,['namensschilder','hundeschilder']);assert.equal(d3.hidden,true);
 assert.equal(openKatalog(root).designs.masters.find(d=>d.id==='T-D3').hidden,true);
 const row=designDashboard(root,{linie:'test-linie'}).rows.find(r=>r.id==='T-D3');
 assert.equal(row.hidden,true);assert.equal(row.name,'Motiv außerhalb');assert.ok(!row.reasons.some(x=>/Thema passt/.test(x)),'Thema jetzt passend');
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'designs/test-reihe/zuordnung.json'),'utf8')).D3,{themen:['namensschilder','hundeschilder']},'Themenwahl landet in zuordnung.json (read-bestand-designs.py --zuordnung liest „themen“), ohne erfundenen Namen');
 // Unverändert → kein Protokolleintrag
 assert.equal(patchDesign(root,{reihe:'test-reihe',designId:'T-D3',hidden:true}).changed,false);
 assert.equal(fs.readFileSync(path.join(root,'designs/test-reihe/_aenderungen.jsonl'),'utf8').trim().split('\n').length,2);
 assert.equal(pendingChanges(root)[0].entries.length,2);assert.equal(pendingChanges(root)[0].reihe,'test-reihe');
 // Ablehnungen
 assert.throws(()=>patchDesign(root,{reihe:'test-reihe',designId:'T-D1',name:'x',preis:1}),e=>e.status===422&&/Unbekannte Felder: preis/.test(e.message));
 assert.throws(()=>patchDesign(root,{reihe:'test-reihe',designId:'T-D1'}),e=>e.status===422&&/Keine Änderung/.test(e.message));
 assert.throws(()=>patchDesign(root,{reihe:'test-reihe',designId:'T-D1',name:''}),e=>e.status===422);
 assert.throws(()=>patchDesign(root,{reihe:'test-reihe',designId:'T-D1',themes:['gibt-es-nicht']}),e=>e.status===422&&/Unbekannte Themen/.test(e.message));
 assert.throws(()=>patchDesign(root,{reihe:'test-reihe',designId:'T-D1',hidden:'ja'}),e=>e.status===422);
 assert.throws(()=>patchDesign(root,{reihe:'../linien',designId:'test-linie',name:'x'}),e=>e.status===422);
 assert.throws(()=>patchDesign(root,{reihe:'test-reihe',designId:'../T-D1',name:'x'}),e=>e.status===422);
 assert.throws(()=>patchDesign(root,{reihe:'bestand',designId:'boegen',name:'x'}),e=>e.status===422);
 assert.throws(()=>patchDesign(root,{reihe:'test-reihe',designId:'T-D4',name:'x'}),e=>e.status===404&&/keine Lieferform 2/.test(e.message),'Bestandsdesign ist nicht änderbar');
 assert.throws(()=>patchDesign(root,'kein Objekt'),e=>e.status===422);
});

test('HTTP: Seite, Module, Designs-API (Herkunft, CSRF), SVG-Route mit Pfadprüfung, 503 ohne Katalog',async t=>{
 const root=miniKatalog(t);
 const work=path.resolve('.local-data');fs.mkdirSync(work,{recursive:true});const dir=fs.mkdtempSync(path.join(work,'g27-designs-http-'));build({outputDirectory:dir});
 const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const w=createWorkshop({filename:path.join(dir,'db.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,katalogDir:root}),server=createPreviewServer({outputDirectory:dir,workshop:w});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(r=>server.close(r));w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+server.address().port;
 for(const uri of ['/werkstatt/designs/','/werkstatt/designs','/workshop-ui/design-dashboard-ui.mjs','/workshop-ui/design-dashboard.css'])assert.equal((await fetch(base+uri)).status,200,uri);
 const page=await (await fetch(base+'/werkstatt/designs/')).text();assert.match(page,/href="\/werkstatt\/designs\/" aria-current="page"/);
 const lines=await (await fetch(base+'/api/workshop/designs')).json();assert.deepEqual(lines.linien.map(l=>l.id),['test-linie']);
 const d=await (await fetch(base+'/api/workshop/designs?linie=test-linie&status=ok')).json();assert.deepEqual(d.rows.map(r=>r.id),['T-D1']);assert.equal(d.counts.total,7);
 assert.equal((await fetch(base+'/api/workshop/designs?linie=nix')).status,404);
 assert.equal((await fetch(base+'/api/workshop/designs',{headers:{Origin:'https://other.example'}})).status,403,'fremde Herkunft');
 const img=await fetch(base+'/api/workshop/designs/svg?reihe=test-reihe&id=T-D1&file=design.svg');
 assert.equal(img.status,200);assert.equal(img.headers.get('content-type'),'image/svg+xml; charset=utf-8');assert.match(img.headers.get('content-security-policy'),/default-src 'none'/);assert.match(await img.text(),/id="text-1"/);
 assert.equal((await fetch(base+'/api/workshop/designs/svg?reihe=test-reihe&id=T-D1&file=original.png')).headers.get('content-type'),'image/png');
 for(const q of ['reihe=..&id=linien&file=design.svg','reihe=test-reihe&id=..%2F..%2Flinien&file=test-linie.json','reihe=test-reihe&id=T-D1&file=design.json','bestand=..&id=T&file=design.svg','reihe=test-reihe&id=T-D1&file=..%2F..%2FT-D2%2Fdesign.svg'])
  assert.equal((await fetch(base+'/api/workshop/designs/svg?'+q)).status,404,q);
 const session=await (await fetch(base+'/api/workshop/session')).json();
 const patch=(token,body)=>fetch(base+'/api/workshop/designs',{method:'PATCH',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':token},body:JSON.stringify(body)});
 assert.equal((await patch('ungültig',{reihe:'test-reihe',designId:'T-D1',name:'Neu'})).status,403);
 const ok=await patch(session.csrfToken,{reihe:'test-reihe',designId:'T-D1',name:'Neu benannt'});
 assert.equal(ok.status,200);const result=await ok.json();assert.equal(result.design.name,'Neu benannt');assert.equal(JSON.parse(fs.readFileSync(path.join(root,'designs/test-reihe/T-D1/design.json'),'utf8')).name,'Neu benannt');
 assert.equal((await patch(session.csrfToken,{reihe:'test-reihe',designId:'T-D1',foo:1})).status,422);
 assert.equal((await fetch(base+'/api/workshop/designs',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':session.csrfToken},body:'{}'})).status,405);
 const fresh=await (await fetch(base+'/api/workshop/designs?linie=test-linie&reihe=test-reihe')).json();assert.equal(fresh.rows[0].name,'Neu benannt','Cache verworfen');
 // Ohne Katalog: klare 503
 const none=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy,katalogDir:null}),s2=createPreviewServer({outputDirectory:dir,workshop:none});
 s2.listen(0,'127.0.0.1');await once(s2,'listening');t.after(async()=>{await new Promise(r=>s2.close(r));none.close();});
 const r503=await fetch('http://127.0.0.1:'+s2.address().port+'/api/workshop/designs');assert.equal(r503.status,503);assert.equal((await r503.json()).error.code,'katalog_missing');
});

test('Rückschreiben: Händlerkorrekturen → design.json (Dry-run, Zuordnung nur über Katalogherkunft, sonst offen), --apply mit SVG',t=>{
 const root=miniKatalog(t);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-writeback-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const dbFile=path.join(dir,'werkstatt.sqlite');
 // Produktstände wie die Werkstatt-DB: Formprodukt mit Katalogherkunft (Größe 60 × 40 = halber Master) und ein Fremdprodukt.
 const db=new DatabaseSync(dbFile);
 db.exec("CREATE TABLE product_revisions(product_id TEXT NOT NULL,revision INTEGER NOT NULL,document TEXT NOT NULL,published_revision INTEGER,status TEXT NOT NULL,created_at TEXT NOT NULL,metadata TEXT NOT NULL DEFAULT '{}',tenant_id TEXT NOT NULL DEFAULT 'gravuru',PRIMARY KEY(product_id,revision))");
 const formDoc={schema:'gravuru-form-product/v1',name:'Test 6 × 4',form:{geometry:{widthMm:60,heightMm:40}},designs:[{id:'katalog-T-D1',name:'Zwei Zeilen',katalog:{designId:'T-D1'},fields:[{id:'text-1',type:'text',text:'Familie',font:'Michroma',sizeMm:3.88,xMm:20,yMm:13,widthMm:20,heightMm:5},{id:'text-2',type:'text',text:'Muster',font:'Michroma',sizeMm:3.88,xMm:20,yMm:23,widthMm:20,heightMm:5},{id:'motiv-1',type:'motif',motifKey:'m',xMm:5,yMm:19,widthMm:50,heightMm:0.3}]}]};
 const otherDoc={schema:'gravuru-form-product/v1',name:'Acryl',form:{geometry:{widthMm:90,heightMm:60}},designs:[{id:'TS-Acryl-D14',name:'x',fields:[]}]};
 db.prepare('INSERT INTO product_revisions(product_id,revision,document,status,created_at) VALUES(?,?,?,?,?)').run('cfg_form',3,JSON.stringify(formDoc),'draft','2026-10-23T00:00:00Z');
 db.prepare('INSERT INTO product_revisions(product_id,revision,document,status,created_at) VALUES(?,?,?,?,?)').run('cfg_other',1,JSON.stringify(otherDoc),'draft','2026-10-23T00:00:00Z');
 db.close();
 const corrections=createDesignCorrections({filename:dbFile,tenantId:'gravuru'});
 // Korrektur: Text 1 umbenannt und vergrößert (4,2 mm im Produkt = 6,3 mm im Master), Text 2 verschoben, Motiv verschoben (offen).
 corrections.save({productId:'cfg_form',productRevision:3,designId:'katalog-T-D1',expectedRevision:0,actor:'merchant:chris',state:{fields:[{id:'text-1',deleted:false,text:'Familie Muster',font:'Michroma',sizeMm:4.2,xMm:20,yMm:13,widthMm:20,heightMm:5},{id:'text-2',deleted:false,text:'Muster',font:'Michroma',sizeMm:3.88,xMm:20,yMm:25,widthMm:20,heightMm:5},{id:'motiv-1',deleted:false,xMm:6,yMm:19,widthMm:50,heightMm:0.3}]}});
 corrections.save({productId:'cfg_form',productRevision:3,designId:'katalog-T-D1',expectedRevision:1,actor:'merchant:chris',state:{fields:[{id:'text-1',deleted:false,text:'Familie Mustermann',font:'Lato',sizeMm:4.2,xMm:20,yMm:13,widthMm:20,heightMm:5},{id:'text-2',deleted:false,text:'Muster',font:'Michroma',sizeMm:3.88,xMm:20,yMm:25,widthMm:20,heightMm:5},{id:'motiv-1',deleted:false,xMm:6,yMm:19,widthMm:50,heightMm:0.3}]}});
 corrections.save({productId:'cfg_other',productRevision:1,designId:'TS-Acryl-D14',expectedRevision:0,actor:'merchant:chris',state:{fields:[]}});
 corrections.close();
 const read=readCorrections(dbFile);
 assert.deepEqual(read.map(c=>[c.productId,c.revision,Boolean(c.document)]),[['cfg_form',2,true],['cfg_other',1,true]],'nur die letzte Korrektur je Produkt/Design');
 const plan=planCorrectionWriteback(root,read);
 assert.deepEqual(plan.counts,{bereit:1,offen:1,unveraendert:0});
 const ready=plan.items.find(i=>i.productId==='cfg_form'),open=plan.items.find(i=>i.productId==='cfg_other');
 assert.equal(open.status,'offen');assert.match(open.reason,/Kein Katalogprodukt/);
 assert.equal(ready.status,'bereit');assert.equal(ready.scale,1.5);assert.equal(ready.katalog.dir,'designs/test-reihe/T-D1');
 assert.deepEqual(ready.changes.map(c=>c.layer),['text-1','text-2']);
 const t1=ready.changes[0];
 assert.deepEqual(t1.diff.map(d=>d.field),['text','font','sizePt','anchorMm']);
 assert.equal(t1.next.text,'Familie Mustermann');assert.equal(t1.next.font,'Lato');assert.equal(t1.next.sizePt,17.86,'4,2 mm × 1,5 = 6,3 mm = 17,86 pt');
 assert.deepEqual(t1.next.anchorMm,[45,25.46],'Mitte (30 · 1,5) + 0,35 · 6,3 mm Grundlinie');
 assert.deepEqual(ready.changes[1].diff.map(d=>d.field),['anchorMm']);
 assert.deepEqual(ready.open,['motiv-1: motif-Feld – Lage/Austausch nur manuell im Katalog.']);
 assert.match(formatPlan(plan),/bereit 1, offen 1/);
 // Dry-run hat nichts geschrieben
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'designs/test-reihe/T-D1/design.json'),'utf8')).texts[0].text,'Familie');
 const written=applyCorrectionWriteback(plan,{svg:true,now:new Date('2026-10-23T12:00:00Z')});
 assert.deepEqual(written,[{designId:'T-D1',files:['designs/test-reihe/T-D1/design.json','designs/test-reihe/T-D1/design.svg','designs/test-reihe/_aenderungen.jsonl']}]);
 const json=JSON.parse(fs.readFileSync(path.join(root,'designs/test-reihe/T-D1/design.json'),'utf8'));
 assert.equal(json.texts[0].text,'Familie Mustermann');assert.equal(json.texts[0].font,'Lato');assert.equal(json.texts[0].sizePt,17.86);assert.deepEqual(json.texts[0].anchorMm,[45,25.46]);
 assert.equal(json.texts[0].korrektur.correctionRevision,2);assert.equal(json.korrekturen.length,1);assert.deepEqual(json.korrekturen[0].layers,['text-1','text-2']);
 const svgText=fs.readFileSync(path.join(root,'designs/test-reihe/T-D1/design.svg'),'utf8');
 assert.match(svgText,/<text id="text-1" x="45\.00" y="25\.46" font-family="Lato" font-size="6\.30"[^>]*><tspan x="45\.00" dy="0\.00">Familie Mustermann<\/tspan><\/text>/);
 assert.match(svgText,/<text id="text-2" x="45\.00" y="43\.29"/,'Mitte 41,25 + 0,35 · 5,82');
 const log=fs.readFileSync(path.join(root,'designs/test-reihe/_aenderungen.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l));
 assert.equal(log.at(-1).source,'design-corrections');assert.equal(log.at(-1).productId,'cfg_form');
 // Mehrzeiliger Text im SVG
 const multi=updateSvgText('<svg><text id="text-1" x="1" y="2" font-family="A" font-size="3"><tspan>a</tspan></text></svg>','text-1',{text:'Zeile 1\nZeile <2>',font:'B & C',sizePt:14.17,anchorMm:[10,20]});
 assert.equal(multi,'<svg><text id="text-1" x="10.00" y="20.00" font-family="B &amp; C" font-size="5.00"><tspan x="10.00" dy="0.00">Zeile 1</tspan><tspan x="10.00" dy="6.00">Zeile &lt;2&gt;</tspan></text></svg>');
 assert.equal(updateSvgText('<svg/>','text-9',{text:'x',font:'A',sizePt:10,anchorMm:[0,0]}),null);
});
