import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {holesFor,validateMountingRule,keepoutZones,MOUNTING_LAYOUTS} from '../platform/sources/app/shared/models/mounting-rules.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {escapeXml as esc} from '../platform/sources/app/shared/models/design-content.mjs';
import {zipFiles} from '../configurator/variant-m/print-export-model.mjs';
import {workshopResources} from './catalog.mjs';
import {nativeSpecimenConfig,steelPreviewSurface} from './specimen-product.mjs';
import {nativeSlateConfig} from './slate-product.mjs';
import {makeProductDocument} from './product-model.mjs';
import {nativeContour} from './acrylic-artwork.mjs';

// A product family holds everything a product series shares (material, shapes,
// sizes, prices, drill-pattern rules, fonts, style notes) once. Products are
// generated from it; a later family revision never changes existing products.
// v2: material-neutral (Edelstahl, Acrylglas, Schiefer). Unknown master data is
// stored as null ("offen") instead of being guessed; such a family can be planned
// and briefed, but generates products only once every value is filled in.
// v1 documents (steel only) stay valid unchanged.
export const FAMILY_SCHEMA='gravuru-product-family/v2';
const FAMILY_SCHEMAS=['gravuru-product-family/v1',FAMILY_SCHEMA];
// Per material: the engraving profile it must use, how the engraving looks, the
// preview colour and the native product adapter (null = not connected yet).
export const FAMILY_MATERIALS=Object.freeze({
 steel:{name:'Edelstahl',processing:'steel-engraving',ink:'Gravur erscheint dunkel auf dem Metall; Weiß bleibt ungraviert.',color:()=>'#bac2c4',adapter:'steel'},
 slate:{name:'Schiefer',processing:'slate-engraving',ink:'Gravur erscheint hell auf dem dunklen Stein; Weiß bleibt ungraviert.',color:()=>'#343b3d',adapter:'slate'},
 acrylic:{name:'Acrylglas',processing:'acrylic-engraving',ink:'Gravur erscheint hell (weiß) auf dem farbigen Acrylglas; Weiß bleibt ungraviert.',color:v=>v==='anthrazit'?'#33373a':'#17191b',adapter:null}
});
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const invalid=message=>fail(422,'family_invalid',message);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/.test(v);
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const cents=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;
const mm=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const sha=v=>createHash('sha256').update(v).digest('hex');
const only=(o,keys,label)=>{if(!o||typeof o!=='object'||Array.isArray(o))invalid(label+' fehlt.');const extra=Object.keys(o).filter(k=>!keys.includes(k));if(extra.length)invalid(label+': unbekannte Felder '+extra.join(', '));};
const unique=(list,key,label)=>{const seen=new Set();for(const v of list){if(seen.has(v[key]))invalid(label+' doppelt: '+v[key]);seen.add(v[key]);}};
const SHAPES=['rect','ellipse'];
const open=v=>v===null;
// A drill rule with diameter and edge distance; null = Bohrbild noch offen.
export const ruleComplete=r=>!open(r.diameterMm)&&!open(r.edgeMm);

export function validateFamily(f){
 only(f,['schema','id','name','material','designArea','groups','mountingRules','sizes','withoutMounting','fonts','briefingNotes','sizeKeyPrefix','sizeKeySuffix','source'],'Produktfamilie');
 if(!FAMILY_SCHEMAS.includes(f.schema))invalid('Unbekanntes Familienformat.');
 if(!id(f.id)||!text(f.name,120))invalid('Familie braucht Kennung und Namen.');
 only(f.material,['kind','variant','label','thicknessMm','processingProfileId'],'Material');
 const material=FAMILY_MATERIALS[f.material.kind];
 if(!material||!text(f.material.label,80))invalid('Material: Edelstahl, Acrylglas oder Schiefer mit Bezeichnung angeben.');
 if(f.schema!==FAMILY_SCHEMA&&(f.material.kind!=='steel'||f.material.thicknessMm!==1.5))invalid('Familienformat v1 beschreibt nur Edelstahl 1,5 mm.');
 if(f.material.processingProfileId!==material.processing)invalid(`${material.name} wird mit „${material.processing}“ graviert.`);
 if(f.material.variant!==undefined&&!text(f.material.variant,40))invalid('Materialvariante prüfen.');
 if(!open(f.material.thicknessMm)&&!mm(f.material.thicknessMm,0.3,50))invalid('Materialstärke: 0,3 bis 50 mm oder offen.');
 for(const k of ['sizeKeyPrefix','sizeKeySuffix'])if(f[k]!==undefined&&!(typeof f[k]==='string'&&/^[A-Za-z0-9_.:-]{0,30}$/.test(f[k])))invalid('SKU-Muster prüfen.');
 only(f.designArea,['marginMm','keepoutMm'],'Gestaltungsfläche');
 if(!(open(f.designArea.marginMm)||mm(f.designArea.marginMm,0,30))||!mm(f.designArea.keepoutMm,0,20))invalid('Randabstand (oder offen) und Schutzzone in mm angeben.');
 if(!Array.isArray(f.groups)||!f.groups.length||f.groups.length>40)invalid('1 bis 40 Formgruppen angeben.');
 for(const g of f.groups){only(g,['key','name','shape','cornerRadiusMm'],'Formgruppe');if(!id(g.key)||!text(g.name,80)||!SHAPES.includes(g.shape)||!mm(g.cornerRadiusMm,0,100))invalid('Ungültige Formgruppe '+(g.key||''));}
 unique(f.groups,'key','Formgruppe');
 if(!Array.isArray(f.mountingRules)||f.mountingRules.length>40)invalid('Höchstens 40 Bohrbild-Regeln.');
 for(const r of f.mountingRules){only(r,['id','label','layout','count','diameterMm','edgeMm','priceCents','skuSuffix'],'Bohrbild-Regel');if(!id(r.id)||!text(r.label,100)||!(open(r.priceCents)||cents(r.priceCents))||!/^[A-Z0-9]{1,8}$/.test(r.skuSuffix||''))invalid('Bohrbild-Regel '+(r.id||'')+' unvollständig.');
  if(open(r.diameterMm)!==open(r.edgeMm))invalid(r.id+': Durchmesser und Randabstand gemeinsam angeben oder beide offen lassen.');
  try{validateMountingRule(ruleComplete(r)?r:{...r,diameterMm:4,edgeMm:4});}catch(e){invalid(r.id+': '+e.message);}}
 unique(f.mountingRules,'id','Bohrbild-Regel');
 if(typeof f.withoutMounting!=='boolean')invalid('Angeben, ob „Ohne Bohrung“ angeboten wird.');
 if(!Array.isArray(f.sizes)||!f.sizes.length||f.sizes.length>500)invalid('1 bis 500 Größen angeben.');
 const groups=new Map(f.groups.map(g=>[g.key,g])),rules=new Map(f.mountingRules.map(r=>[r.id,r]));
 for(const s of f.sizes){
  only(s,['key','groupKey','label','widthMm','heightMm','baseCents','mounting','netWeightG'],'Größe');
  if(!id(s.key)||!groups.has(s.groupKey)||!text(s.label,60)||!mm(s.widthMm,10,1000)||!mm(s.heightMm,10,1000)||!(open(s.baseCents)||cents(s.baseCents))||!Array.isArray(s.mounting)||s.mounting.length>8||s.mounting.some(m=>!rules.has(m))||new Set(s.mounting).size!==s.mounting.length)invalid('Größe '+(s.key||'')+' unvollständig.');
  if(s.netWeightG!==undefined&&!mm(s.netWeightG,0,100000))invalid('Gewicht von '+s.key+' prüfen.');
  if(!f.withoutMounting&&!s.mounting.length)invalid(s.key+': mindestens eine Befestigung nötig.');
  for(const m of s.mounting){if(!ruleComplete(rules.get(m)))continue;try{holesFor(geometryOf(f,s),rules.get(m));}catch(e){invalid(s.key+' · '+m+': '+e.message);}}
 }
 unique(f.sizes,'key','Größe');
 if(!Array.isArray(f.fonts)||!f.fonts.length||f.fonts.length>60||f.fonts.some(v=>!text(v,80)))invalid('Zugelassene Schriften angeben.');
 if(typeof f.briefingNotes!=='string'||f.briefingNotes.length>8000)invalid('Stilnotizen: höchstens 8000 Zeichen.');
 if(f.source!==undefined){only(f.source,['repository','commit','path','sha256','note'],'Herkunft');}
 return f;
}
// Everything still "offen" in a family, in plain words. Products are generated
// only when this list is empty and the material has a native adapter.
export function familyGaps(f){
 const gaps=[],m=FAMILY_MATERIALS[f.material.kind];
 if(open(f.material.thicknessMm))gaps.push('Materialstärke');
 if(open(f.designArea.marginMm))gaps.push('Gestaltungsrand');
 for(const r of f.mountingRules){if(!ruleComplete(r))gaps.push(`Bohrbild „${r.label}“: Durchmesser und Randabstand`);if(open(r.priceCents))gaps.push(`Aufpreis „${r.label}“`);}
 const price=f.sizes.filter(s=>open(s.baseCents));if(price.length)gaps.push('Grundpreis: '+price.map(s=>s.label).join(', '));
 if(m.adapter==='slate'&&f.groups.some(g=>g.shape!=='rect'))gaps.push('Schiefer-Produkte sind in der Werkstatt nur rechteckig angeschlossen');
 return gaps;
}
export function familyReady(f){
 const gaps=familyGaps(f),m=FAMILY_MATERIALS[f.material.kind];
 if(!m.adapter)return {ready:false,gaps,reason:`${m.name}-Gravurplatten sind in der Werkstatt noch nicht als eigenes Produkt angeschlossen. Planen und Briefing gehen schon; Produkte erzeugen folgt mit diesem Anschluss.`};
 if(m.adapter==='steel'&&f.material.thicknessMm!==null&&f.material.thicknessMm!==1.5)return {ready:false,gaps,reason:'Das Edelstahl-Produktmodell ist für 1,5 mm freigegeben.'};
 return gaps.length?{ready:false,gaps,reason:'Stammdaten unvollständig: '+gaps.join(' · ')}:{ready:true,gaps:[]};
}
export function geometryOf(f,s){const g=f.groups.find(g=>g.key===s.groupKey);return {width:s.widthMm,height:s.heightMm,shape:g.shape,cornerRadiusMm:g.cornerRadiusMm};}
const ruleOf=(f,rid)=>f.mountingRules.find(r=>r.id===rid);
const productKey=(f,s)=>'family:'+f.id+':'+s.key;

// Native steel product for one size: mounting options carry computed holes and
// the rule they came from; one neutral starter design until real designs are imported.
export function familyProductConfig(f,s,revision){
 const ready=familyReady(f);if(!ready.ready)invalid(ready.reason);
 const g=geometryOf(f,s),group=f.groups.find(x=>x.key===s.groupKey),resources=workshopResources();
 const font=f.fonts.find(x=>resources.fonts[x])||'Montserrat';
 const values=[];
 if(f.withoutMounting)values.push({id:'K00',label:'Ohne Bohrung',priceCents:0,currency:'EUR',holes:[]});
 for(const rid of s.mounting){const r=ruleOf(f,rid);values.push({id:r.skuSuffix,label:r.label,priceCents:r.priceCents,currency:'EUR',holes:holesFor(g,r),mountingRule:{id:r.id,layout:r.layout,count:r.count,diameterMm:r.diameterMm,edgeMm:r.edgeMm,keepoutMm:f.designArea.keepoutMm}});}
 if(new Set(values.map(v=>v.id)).size!==values.length)invalid(s.key+': zwei Befestigungen mit gleicher SKU-Endung.');
 const text={id:'text-1',type:'text',text:'Familie Muster',font,size:Math.min(g.height*.22,14),x:g.width/2,y:g.height/2,w:1,h:1,rotation:0,color:'#000000',bold:false,templateOrigin:true,customerEditable:true};
 measureText(text,resources.fonts);if(text.w>g.width*.6){text.size*=g.width*.6/text.w;measureText(text,resources.fonts);}
 if(text.h>g.height*.3){text.size*=g.height*.3/text.h;measureText(text,resources.fonts);}
 const design={id:'start',name:'Startdesign · '+group.name,objects:[text],marks:[]};
 const profile={id:'family-'+f.id+'-'+s.key.toLowerCase().replace(/[^a-z0-9-]/g,'-'),revision:'family-'+f.id+'-r'+revision,schemaVersion:1,kind:'universal-product',name:f.name+' · '+group.name+' '+s.label,
  binding:{kind:'local-review',productId:'local-'+s.key},geometry:{...g,safeMarginMm:f.designArea.marginMm,holes:[]},
  material:{kind:f.material.kind,color:FAMILY_MATERIALS[f.material.kind].color(f.material.variant),thicknessMm:f.material.thicknessMm},processing:{profileId:f.material.processingProfileId},
  features:{orderEnabled:false,productionConfirmed:false,motifsAllowed:true},designs:[design],defaultDesignId:design.id,
  optionGroups:[{id:'mounting',name:'Befestigung',required:true,defaultValueId:values[0].id,values}]};
 const c={reviewOnly:true,basePriceCents:s.baseCents,extraMotifCents:0,logo:{enabled:false},photo:{enabled:false,mode:'upload-only',includedCount:0,extraPriceCents:0},localResources:{scope:'local-review-only',fonts:{[font]:resources.fonts[font]},motifs:[]},profile};
 if(f.material.kind==='steel'){c.materialSurface=steelPreviewSurface();return nativeSpecimenConfig(c);}
 return nativeSlateConfig(c);
}

// Design template for the plugin: contour, usable area, holes and keep-out zones
// per mounting option. A drawing aid, never production geometry.
export function familyTemplate(f,s){
 const g=geometryOf(f,s),c=nativeContour({...g,holes:[]}),m=f.designArea.marginMm||0,k=f.designArea.keepoutMm,w=g.width,h=g.height;
 const inner=m>0?`<g id="nutzflaeche"><path d="${nativeContour({width:w-2*m,height:h-2*m,shape:g.shape,cornerRadiusMm:Math.max(0,g.cornerRadiusMm-m),holes:[]}).contours[0].d}" transform="translate(${m} ${m})" fill="none" stroke="#2a7" stroke-width="0.2" stroke-dasharray="1 1"/></g>`:'';
 const patterns=s.mounting.map(rid=>{const r=ruleOf(f,rid);if(!ruleComplete(r))return `<g id="bohrbild-${esc(r.skuSuffix)}" data-label="${esc(r.label)} – Bohrbild offen"/>`;const holes=holesFor(g,r);return `<g id="bohrbild-${esc(r.skuSuffix)}" data-label="${esc(r.label)}">${holes.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${p.diameter/2}" fill="#d33"/>`).join('')}${keepoutZones(holes,k).map(z=>`<circle cx="${z.x}" cy="${z.y}" r="${z.r}" fill="none" stroke="#d33" stroke-width="0.2" stroke-dasharray="0.6 0.6"/>`).join('')}</g>`;}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><title>${esc(f.name)} · ${esc(s.label)} · Gestaltungsschablone (nicht drucken)</title><g id="kontur"><path d="${c.contours[0].d}" fill="none" stroke="#000" stroke-width="0.3"/></g>${inner}${patterns}</svg>`;
}

export function familyBriefing(f,revision){
 const price=c=>c===null?'offen':(c/100).toFixed(2).replace('.',',')+' €',mat=FAMILY_MATERIALS[f.material.kind],gaps=familyGaps(f);
 const rows=f.sizes.map(s=>{const g=f.groups.find(x=>x.key===s.groupKey);return `| ${s.key} | ${g.name} | ${s.label} (${s.widthMm} × ${s.heightMm} mm${g.cornerRadiusMm?', Ecken R'+g.cornerRadiusMm:''}) | ${price(s.baseCents)} | ${s.mounting.map(id=>{const r=ruleOf(f,id);return r.label+' · '+(ruleComplete(r)?r.edgeMm+' mm Randabstand':'Bohrbild offen');}).join('; ')||'ohne'} | schablonen/${s.key}.svg |`;}).join('\n');
 return `# ${f.name} – Briefing für die Designerstellung

Familienrevision ${revision}. Automatisch aus der Werkstatt erzeugt; nicht von Hand ändern, sondern in der Werkstatt pflegen und neu herunterladen.

## Was gestaltet wird

Nur das **Design**: Texte, Motive, Foto. Form, Größe, Material, Bohrlöcher, Befestigung und Preise legt die Werkstatt fest.

- Material: ${f.material.label}, ${f.material.thicknessMm===null?'Stärke offen':String(f.material.thicknessMm).replace('.',',')+' mm'}, Verfahren Gravur. ${mat.ink} Gestaltet wird immer schwarz auf weiß; die Werkstatt stellt die Gravur je Material dar. Keine Graustufenflächen in Motiven.
- Randabstand der Gestaltung: ${f.designArea.marginMm===null?'offen (bis zur Klärung mindestens 10 mm frei lassen)':f.designArea.marginMm+' mm'}. Schutzzone um Bohrlöcher: ${f.designArea.keepoutMm} mm um den Lochrand.
- **Texte** nicht in die Schutzzonen legen (sonst sieht der Kunde einen Hinweis). **Motive dürfen über Bohrlöcher** gehen.
- Zugelassene Schriften (exakt diese Namen verwenden): siehe \`schriften.txt\`.

## Lieferformat je Design

Ordner \`<design-id>/\` mit \`design.svg\` in Endmaß (width/height in mm, viewBox 0 0 Breite Höhe, Maße exakt wie die Schablone der Zielgröße). Oberste Ebenen als \`<g id="…">\`:

| Ebene | Inhalt |
| --- | --- |
| \`text-<name>\` | genau ein \`<text>\` mit \`text-anchor="middle"\`, Schrift aus schriften.txt – wird bearbeitbares Kundenfeld |
| \`motiv-<n>\` | Vektormotiv, schwarz auf transparent |
| \`deko-<n>\` | feste Dekoration |
| \`foto-<name>\` | genau ein Bild mit Rechteck-, Kreis- oder Bogenmaske (nur bei Fotoprodukten) |

Texte als echten Text, nicht in Pfade umwandeln. Kein Text in Deko oder Motiv. Keine Transformationen, Skripte oder externen Links. Optional \`original.png\` als Vergleichsbild.

## Formen und Größen

| SKU | Form | Größe | Grundpreis | Befestigung | Schablone |
| --- | --- | --- | ---: | --- | --- |
${rows}

${gaps.length?'## Noch offen in den Stammdaten\n\n'+gaps.map(g=>'- '+g).join('\n')+'\n\n':''}## Stil und Hinweise

${f.briefingNotes.trim()||'Noch keine Stilnotizen hinterlegt.'}
`;
}


// Fields a family owns in a generated product. Designs, customer rights, SEO,
// categories and photos stay untouched when family changes are applied.
const euroText=c=>c===null?'offen':(c/100).toFixed(2).replace('.',',')+' €';
const mountingText=values=>values.map(v=>v.label+(v.holes?.length?' ('+v.holes.map(h=>h.x+'|'+h.y).join(', ')+')':'')+(v.priceCents?' +'+euroText(v.priceCents):'')).join('; ');
const productName=(f,s)=>f.name+' · '+f.groups.find(g=>g.key===s.groupKey).name+' '+s.label;
export function familySyncTarget(document,f,s,revision){
 const t=familyProductConfig(f,s,revision),doc=structuredClone(document),p=doc.config.profile,mount=t.profile.optionGroups.find(g=>g.id==='mounting');
 doc.name=productName(f,s);doc.config.basePriceCents=t.basePriceCents;p.name=t.profile.name;p.revision=t.profile.revision;
 p.geometry={...p.geometry,width:t.profile.geometry.width,height:t.profile.geometry.height,shape:t.profile.geometry.shape,cornerRadiusMm:t.profile.geometry.cornerRadiusMm,safeMarginMm:t.profile.geometry.safeMarginMm};
 const old=p.optionGroups.find(g=>g.id==='mounting'),group=structuredClone(mount);if(old&&group.values.some(v=>v.id===old.defaultValueId))group.defaultValueId=old.defaultValueId;
 p.optionGroups=p.optionGroups.map(g=>g.id==='mounting'?group:g);if(!old)p.optionGroups.push(group);
 return doc;
}
export function familyChanges(before,after){
 const a=before.config,b=after.config,ga=a.profile.geometry,gb=b.profile.geometry,changes=[];
 const add=(field,label,x,y)=>{if(JSON.stringify(x)!==JSON.stringify(y))changes.push({field,label,before:x,after:y});};
 add('name','Name',before.name,after.name);
 add('price','Grundpreis',euroText(a.basePriceCents),euroText(b.basePriceCents));
 add('size','Maße',ga.width+' × '+ga.height+' mm',gb.width+' × '+gb.height+' mm');
 add('shape','Form',(ga.shape==='ellipse'?'oval':'eckig')+(ga.cornerRadiusMm?' R'+ga.cornerRadiusMm:''),(gb.shape==='ellipse'?'oval':'eckig')+(gb.cornerRadiusMm?' R'+gb.cornerRadiusMm:''));
 add('margin','Gestaltungsrand',(ga.safeMarginMm??2)+' mm',gb.safeMarginMm+' mm');
 const mv=d=>d.config.profile.optionGroups.find(g=>g.id==='mounting')?.values||[];
 add('mounting','Befestigung',mountingText(mv(before)),mountingText(mv(after)));
 const keep=d=>JSON.stringify(mv(d).map(v=>v.mountingRule?.keepoutMm));add('keepout','Schutzzone',keep(before),keep(after));
 return changes;
}

export function createProductFamilies({filename,repository}){
 if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename);
 db.exec(`PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS product_families(id TEXT PRIMARY KEY,revision INTEGER NOT NULL CHECK(revision>=1),name TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS product_family_revisions(family_id TEXT NOT NULL REFERENCES product_families(id),revision INTEGER NOT NULL,document TEXT NOT NULL CHECK(json_valid(document)),created_at TEXT NOT NULL,PRIMARY KEY(family_id,revision));
  CREATE TRIGGER IF NOT EXISTS immutable_family_revision_update BEFORE UPDATE ON product_family_revisions BEGIN SELECT RAISE(ABORT,'Family revisions are immutable'); END;
  CREATE TRIGGER IF NOT EXISTS immutable_family_revision_delete BEFORE DELETE ON product_family_revisions BEGIN SELECT RAISE(ABORT,'Family revisions are immutable'); END;`);
 const transact=work=>{db.exec('BEGIN IMMEDIATE');try{const v=work();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}};
 const row=fid=>{const r=db.prepare('SELECT * FROM product_families WHERE id=?').get(fid);if(!r)fail(404,'family_missing','Produktfamilie nicht gefunden.');return r;};
 const record=(r,rev=r.revision)=>{const v=db.prepare('SELECT * FROM product_family_revisions WHERE family_id=? AND revision=?').get(r.id,rev);if(!v)fail(404,'family_revision_missing','Familienstand nicht gefunden.');return {id:r.id,revision:rev,currentRevision:r.revision,name:r.name,createdAt:r.created_at,updatedAt:r.updated_at,document:JSON.parse(v.document)};};
 const withReadiness=rec=>({...rec,readiness:familyReady(rec.document)});
 const insert=(fid,rev,doc)=>db.prepare('INSERT INTO product_family_revisions VALUES(?,?,?,?)').run(fid,rev,JSON.stringify(doc),new Date().toISOString());
 const products=f=>f.sizes.map(s=>{const item=repository.importItem(productKey(f,s));return {sizeKey:s.key,productId:item?.id||null};});
 return {
  list:()=>db.prepare('SELECT * FROM product_families ORDER BY name COLLATE NOCASE,id').all().map(r=>{const d=record(r).document;return {id:r.id,name:r.name,revision:r.revision,updatedAt:r.updated_at,sizes:d.sizes.length,groups:d.groups.length,material:d.material.label,gaps:familyGaps(d).length,generated:products(d).filter(p=>p.productId).length};}),
  get(fid,{revision}={}){const r=row(fid),rec=record(r,revision??r.revision);return {...withReadiness(rec),products:products(rec.document)};},
  history:fid=>{row(fid);return db.prepare('SELECT revision,created_at FROM product_family_revisions WHERE family_id=? ORDER BY revision DESC').all(fid).map(v=>({revision:v.revision,createdAt:v.created_at}));},
  create(doc){const f=validateFamily(structuredClone(doc));return transact(()=>{if(db.prepare('SELECT 1 FROM product_families WHERE id=?').get(f.id))fail(409,'family_exists','Diese Produktfamilie ist bereits angelegt.');const t=new Date().toISOString();db.prepare('INSERT INTO product_families VALUES(?,?,?,?,?)').run(f.id,1,f.name,t,t);insert(f.id,1,f);return withReadiness(record(row(f.id)));});},
  save(fid,doc,expectedRevision){const f=validateFamily(structuredClone(doc));if(f.id!==fid)invalid('Die Kennung einer Familie bleibt unverändert.');return transact(()=>{const r=row(fid);if(!Number.isSafeInteger(expectedRevision)||r.revision!==expectedRevision)fail(409,'family_conflict','Die Familie wurde inzwischen geändert. Bitte neu laden.');if(JSON.stringify(record(r).document)===JSON.stringify(f))return record(r);const rev=r.revision+1;insert(fid,rev,f);db.prepare('UPDATE product_families SET revision=?,name=?,updated_at=? WHERE id=?').run(rev,f.name,new Date().toISOString(),fid);return withReadiness(record(row(fid)));});},
  // Generates one draft product per size. The import key makes repeats and
  // retries idempotent; existing products are never overwritten.
  generate(fid,{sizeKeys,expectedRevision}={}){
   const rec=this.get(fid);if(expectedRevision!==rec.revision)fail(409,'family_conflict','Die Familie wurde inzwischen geändert. Bitte neu laden.');
   const f=rec.document,wanted=sizeKeys===undefined?f.sizes:sizeKeys.map(k=>f.sizes.find(s=>s.key===k)||invalid('Unbekannte Größe '+k));
   const results=[];
   for(let i=0;i<wanted.length;i+=100){
    const entries=wanted.slice(i,i+100).map(s=>{const key=productKey(f,s),document=makeProductDocument(familyProductConfig(f,s,rec.revision),{name:f.name+' · '+f.groups.find(g=>g.key===s.groupKey).name+' '+s.label,kind:'product'});document.categoryIds=['familie-'+f.id,'form-'+s.groupKey.toLowerCase()];return {key,fingerprint:sha(key),document};});
    results.push(...repository.importBatch(entries).map((r,j)=>({sizeKey:wanted[i+j].key,productId:r.id,created:r.created})));
   }
   return {familyId:fid,familyRevision:rec.revision,created:results.filter(r=>r.created).length,existing:results.filter(r=>!r.created).length,products:results};
  },
  // Shows per generated product what a family revision would change. Nothing
  // is written; the token binds the exact plan to apply().
  planSync(fid){
   const rec=this.get(fid),f=rec.document,items=[];
   for(const s of f.sizes){
    const item=repository.importItem(productKey(f,s));if(!item)continue;
    const current=repository.get(item.id);let entry={sizeKey:s.key,label:productName(f,s),productId:item.id,productRevision:current.revision};
    try{const target=familySyncTarget(current.document,f,s,rec.revision),changes=familyChanges(current.document,target);
     if(!changes.length)entry={...entry,status:'same',changes};
     else{repository.validate(target);entry={...entry,status:'change',changes,targetSha256:sha(JSON.stringify(target))};}
    }catch(e){entry={...entry,status:'error',message:e.message==='Element ragt über die Gestaltungsfläche hinaus.'||/ragt|Kontur|Gestaltungsfläche/.test(e.message)?'Ein Design passt nicht in die neue Form oder Größe. Bitte das Produkt im Editor anpassen. ('+e.message+')':e.message};}
    items.push(entry);
   }
   const orphaned=[];
   for(const r of db.prepare('SELECT document FROM product_family_revisions WHERE family_id=?').all(fid))for(const s of JSON.parse(r.document).sizes)if(!f.sizes.some(x=>x.key===s.key)&&!orphaned.some(o=>o.sizeKey===s.key)){const item=repository.importItem('family:'+fid+':'+s.key);if(item)orphaned.push({sizeKey:s.key,productId:item.id});}
   const token=sha(JSON.stringify({fid,revision:rec.revision,items:items.filter(i=>i.status==='change').map(i=>[i.productId,i.productRevision,i.targetSha256])}));
   return {familyId:fid,familyRevision:rec.revision,token,changed:items.filter(i=>i.status==='change').length,unchanged:items.filter(i=>i.status==='same').length,errors:items.filter(i=>i.status==='error').length,items,orphaned};
  },
  applySync(fid,{expectedRevision,token}){
   const plan=this.planSync(fid);
   if(plan.familyRevision!==expectedRevision||plan.token!==token)fail(409,'family_sync_changed','Familie oder Produkte wurden seit der Vorschau geändert. Bitte die Vorschau neu laden.');
   const f=this.get(fid).document,results=[];
   for(const item of plan.items.filter(i=>i.status==='change')){
    const s=f.sizes.find(x=>x.key===item.sizeKey);
    try{const target=familySyncTarget(repository.get(item.productId).document,f,s,plan.familyRevision),saved=repository.save(item.productId,target,item.productRevision);results.push({sizeKey:item.sizeKey,productId:item.productId,revision:saved.revision,ok:true});}
    catch(e){results.push({sizeKey:item.sizeKey,productId:item.productId,ok:false,message:e.status===409?'Produkt wurde inzwischen geändert und nicht überschrieben.':e.message});}
   }
   return {familyId:fid,familyRevision:plan.familyRevision,updated:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,results};
  },
  template(fid,sizeKey){const f=this.get(fid).document,s=f.sizes.find(s=>s.key===sizeKey);if(!s)fail(404,'size_missing','Größe nicht gefunden.');return familyTemplate(f,s);},
  async briefing(fid){
   const rec=this.get(fid),f=rec.document,enc=v=>new Blob([Buffer.from(v)]);
   const files=[{name:'BRIEFING.md',blob:enc(familyBriefing(f,rec.revision))},{name:'schriften.txt',blob:enc(f.fonts.join('\n')+'\n')},{name:'familie.json',blob:enc(JSON.stringify(f,null,2))},...f.sizes.map(s=>({name:'schablonen/'+s.key+'.svg',blob:enc(familyTemplate(f,s))}))];
   return Buffer.from(await (await zipFiles(files)).arrayBuffer());
  },
  layouts:()=>Object.entries(MOUNTING_LAYOUTS).map(([id,v])=>({id,...v})),
  close:()=>db.close()
 };
}
