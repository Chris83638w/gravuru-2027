// Designliste schnell (Chris 10.11.2026): Zwischenspeicher über Anfragen, Reihenfolge „unsere Designs zuerst“,
// gzip für große Antworten.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {designDashboard,forgetKatalog,forgetDashboardCache,herkunftRang} from './design-dashboard.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const write=(root,rel,value)=>{const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,1)+'\n');};
const svg=(w,h,inner)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">\n<rect id="platte" width="${w}" height="${h}" fill="none"/>\n${inner}\n</svg>\n`;
const textEl=(n,font,text)=>`<text id="text-${n}" x="45" y="30" font-family="${font}" font-size="5" fill="#000000" text-anchor="middle"><tspan x="45" dy="0">${text}</tspan></text>`;

function katalog(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-cache-'));t.after(()=>{forgetKatalog();forgetDashboardCache();fs.rmSync(root,{recursive:true,force:true});});
 for(const part of ['familien','themen.json','schriften'])fs.cpSync(path.join(FIXTURE,part),path.join(root,part),{recursive:true});
 write(root,'linien/test-linie.json',{schema:'gravuru-line/v2',id:'test-linie',name:'Test Linie',families:['test-schilder'],status:'Fixture',subcategories:[{id:'namensschilder',name:'Namensschilder',themeId:'namensschilder',mainProducts:[]}]});
 const design=(id,extra)=>{write(root,`designs/test-reihe/${id}/design.json`,{id,material:'Edelstahl',process:'Gravur',plate:{widthMm:90,heightMm:60},texts:[{text:'Muster',font:'Michroma',sizePt:16,color:'#000000',align:'center',anchorMm:[45,30]}],fonts:['Michroma'],themes:['namensschilder'],ziele:[{familie:'test-schilder',freigabe:null}],...extra});
  write(root,`designs/test-reihe/${id}/design.svg`,svg(90,60,textEl(1,'Michroma','Muster')));};
 design('T-D1',{source:'ohne Vorlage; neuer Entwurf'});
 design('T-D2',{source:'T-D2 (Bestand, T_Designs.cdr)'});
 design('T-D3',{transfer:{fromKey:'T-12x8-D3'}});
 return root;
}

test('herkunftRang: Bestand-Original und Übertragung vor neuen Entwürfen',()=>{
 assert.equal(herkunftRang({source:'TRE-V2A-8x3,5-D1 (Bestand, TRE-V2A-8x3,5_Designs.cdr)'}),0);
 assert.equal(herkunftRang({transfer:{fromKey:'TRE-V2A-12x8-D10'}}),0);
 assert.equal(herkunftRang({source:'ohne Vorlage (Textidee „Willkommen“ aus Bestand KSAEUV-A-D15)'}),1);
 assert.equal(herkunftRang({}),1);
});

test('Designliste: unsere Designs zuerst, Zwischenspeicher folgt Änderungen an design.json',t=>{
 const root=katalog(t);
 const first=designDashboard(root,{linie:'test-linie'});
 assert.deepEqual(first.rows.map(r=>[r.id,r.herkunftRang]),[['T-D2',0],['T-D3',0],['T-D1',1]]);
 const before=first.rows.find(r=>r.id==='T-D1').ziele;
 const again=designDashboard(root,{linie:'test-linie'});
 assert.deepEqual(again.rows.find(r=>r.id==='T-D1').ziele,before,'gleiche Eingaben → gleiches Ergebnis aus dem Speicher');
 // Antwortobjekte sind unabhängig voneinander (keine geteilten Referenzen aus dem Speicher)
 again.rows.find(r=>r.id==='T-D1').ziele.push({familie:'manipuliert'});
 assert.deepEqual(designDashboard(root,{linie:'test-linie'}).rows.find(r=>r.id==='T-D1').ziele,before);
 // Änderung an design.json (Freigabe) → neu berechnet
 const file=path.join(root,'designs/test-reihe/T-D1/design.json'),j=JSON.parse(fs.readFileSync(file,'utf8'));
 j.ziele=[{familie:'test-schilder',freigabe:{status:'freigegeben',am:'2026-11-10T12:00:00.000Z',von:'Test'}}];
 fs.writeFileSync(file,JSON.stringify(j,null,1)+'\n');const later=new Date(Date.now()+5000);fs.utimesSync(file,later,later);
 forgetKatalog();
 const after=designDashboard(root,{linie:'test-linie'}).rows.find(r=>r.id==='T-D1');
 assert.equal(after.ziele.find(z=>z.familie==='test-schilder').released,true);
});
