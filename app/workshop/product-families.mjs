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
import {makeProductDocument} from './product-model.mjs';
import {nativeContour} from './acrylic-artwork.mjs';

// A product family holds everything a product series shares (material, shapes,
// sizes, prices, drill-pattern rules, fonts, style notes) once. Products are
// generated from it; a later family revision never changes existing products.
export const FAMILY_SCHEMA='gravuru-product-family/v1';
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

export function validateFamily(f){
 only(f,['schema','id','name','material','designArea','groups','mountingRules','sizes','withoutMounting','fonts','briefingNotes','source'],'Produktfamilie');
 if(f.schema!==FAMILY_SCHEMA)invalid('Unbekanntes Familienformat.');
 if(!id(f.id)||!text(f.name,120))invalid('Familie braucht Kennung und Namen.');
 only(f.material,['kind','label','thicknessMm','processingProfileId'],'Material');
 // v1 generates native steel engraving products; other materials follow the same model later.
 if(f.material.kind!=='steel'||f.material.thicknessMm!==1.5||f.material.processingProfileId!=='steel-engraving'||!text(f.material.label,80))invalid('Diese Version erzeugt Edelstahlschilder 1,5 mm mit Gravur.');
 only(f.designArea,['marginMm','keepoutMm'],'Gestaltungsfläche');
 if(!mm(f.designArea.marginMm,0,30)||!mm(f.designArea.keepoutMm,0,20))invalid('Randabstand und Schutzzone in mm angeben.');
 if(!Array.isArray(f.groups)||!f.groups.length||f.groups.length>40)invalid('1 bis 40 Formgruppen angeben.');
 for(const g of f.groups){only(g,['key','name','shape','cornerRadiusMm'],'Formgruppe');if(!id(g.key)||!text(g.name,80)||!SHAPES.includes(g.shape)||!mm(g.cornerRadiusMm,0,100))invalid('Ungültige Formgruppe '+(g.key||''));}
 unique(f.groups,'key','Formgruppe');
 if(!Array.isArray(f.mountingRules)||f.mountingRules.length>40)invalid('Höchstens 40 Bohrbild-Regeln.');
 for(const r of f.mountingRules){only(r,['id','label','layout','count','diameterMm','edgeMm','priceCents','skuSuffix'],'Bohrbild-Regel');if(!id(r.id)||!text(r.label,100)||!cents(r.priceCents)||!/^[A-Z0-9]{1,8}$/.test(r.skuSuffix||''))invalid('Bohrbild-Regel '+(r.id||'')+' unvollständig.');try{validateMountingRule(r);}catch(e){invalid(r.id+': '+e.message);}}
 unique(f.mountingRules,'id','Bohrbild-Regel');
 if(typeof f.withoutMounting!=='boolean')invalid('Angeben, ob „Ohne Bohrung“ angeboten wird.');
 if(!Array.isArray(f.sizes)||!f.sizes.length||f.sizes.length>500)invalid('1 bis 500 Größen angeben.');
 const groups=new Map(f.groups.map(g=>[g.key,g])),rules=new Map(f.mountingRules.map(r=>[r.id,r]));
 for(const s of f.sizes){
  only(s,['key','groupKey','label','widthMm','heightMm','baseCents','mounting','netWeightG'],'Größe');
  if(!id(s.key)||!groups.has(s.groupKey)||!text(s.label,60)||!mm(s.widthMm,10,1000)||!mm(s.heightMm,10,1000)||!cents(s.baseCents)||!Array.isArray(s.mounting)||s.mounting.length>8||s.mounting.some(m=>!rules.has(m))||new Set(s.mounting).size!==s.mounting.length)invalid('Größe '+(s.key||'')+' unvollständig.');
  if(s.netWeightG!==undefined&&!mm(s.netWeightG,0,100000))invalid('Gewicht von '+s.key+' prüfen.');
  if(!f.withoutMounting&&!s.mounting.length)invalid(s.key+': mindestens eine Befestigung nötig.');
  for(const m of s.mounting){try{holesFor(geometryOf(f,s),rules.get(m));}catch(e){invalid(s.key+' · '+m+': '+e.message);}}
 }
 unique(f.sizes,'key','Größe');
 if(!Array.isArray(f.fonts)||!f.fonts.length||f.fonts.length>60||f.fonts.some(v=>!text(v,80)))invalid('Zugelassene Schriften angeben.');
 if(typeof f.briefingNotes!=='string'||f.briefingNotes.length>8000)invalid('Stilnotizen: höchstens 8000 Zeichen.');
 if(f.source!==undefined){only(f.source,['repository','commit','path','sha256','note'],'Herkunft');}
 return f;
}
export function geometryOf(f,s){const g=f.groups.find(g=>g.key===s.groupKey);return {width:s.widthMm,height:s.heightMm,shape:g.shape,cornerRadiusMm:g.cornerRadiusMm};}
const ruleOf=(f,rid)=>f.mountingRules.find(r=>r.id===rid);
const productKey=(f,s)=>'family:'+f.id+':'+s.key;

// Native steel product for one size: mounting options carry computed holes and
// the rule they came from; one neutral starter design until real designs are imported.
export function familyProductConfig(f,s,revision){
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
  material:{kind:'steel',color:'#bac2c4',thicknessMm:f.material.thicknessMm},processing:{profileId:f.material.processingProfileId},
  features:{orderEnabled:false,productionConfirmed:false,motifsAllowed:true},designs:[design],defaultDesignId:design.id,
  optionGroups:[{id:'mounting',name:'Befestigung',required:true,defaultValueId:values[0].id,values}]};
 const c={reviewOnly:true,basePriceCents:s.baseCents,extraMotifCents:0,logo:{enabled:false},photo:{enabled:false,mode:'upload-only',includedCount:0,extraPriceCents:0},localResources:{scope:'local-review-only',fonts:{[font]:resources.fonts[font]},motifs:[]},profile,materialSurface:steelPreviewSurface()};
 return nativeSpecimenConfig(c);
}

// Design template for the plugin: contour, usable area, holes and keep-out zones
// per mounting option. A drawing aid, never production geometry.
export function familyTemplate(f,s){
 const g=geometryOf(f,s),c=nativeContour({...g,holes:[]}),m=f.designArea.marginMm,k=f.designArea.keepoutMm,w=g.width,h=g.height;
 const inner=m>0?`<g id="nutzflaeche"><path d="${nativeContour({width:w-2*m,height:h-2*m,shape:g.shape,cornerRadiusMm:Math.max(0,g.cornerRadiusMm-m),holes:[]}).contours[0].d}" transform="translate(${m} ${m})" fill="none" stroke="#2a7" stroke-width="0.2" stroke-dasharray="1 1"/></g>`:'';
 const patterns=s.mounting.map(rid=>{const r=ruleOf(f,rid),holes=holesFor(g,r);return `<g id="bohrbild-${esc(r.skuSuffix)}" data-label="${esc(r.label)}">${holes.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${p.diameter/2}" fill="#d33"/>`).join('')}${keepoutZones(holes,k).map(z=>`<circle cx="${z.x}" cy="${z.y}" r="${z.r}" fill="none" stroke="#d33" stroke-width="0.2" stroke-dasharray="0.6 0.6"/>`).join('')}</g>`;}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><title>${esc(f.name)} · ${esc(s.label)} · Gestaltungsschablone (nicht drucken)</title><g id="kontur"><path d="${c.contours[0].d}" fill="none" stroke="#000" stroke-width="0.3"/></g>${inner}${patterns}</svg>`;
}

export function familyBriefing(f,revision){
 const rows=f.sizes.map(s=>{const g=f.groups.find(x=>x.key===s.groupKey);return `| ${s.key} | ${g.name} | ${s.label} (${s.widthMm} × ${s.heightMm} mm${g.cornerRadiusMm?', Ecken R'+g.cornerRadiusMm:''}) | ${(s.baseCents/100).toFixed(2).replace('.',',')} € | ${s.mounting.map(id=>ruleOf(f,id).label+' · '+ruleOf(f,id).edgeMm+' mm Randabstand').join('; ')||'ohne'} | schablonen/${s.key}.svg |`;}).join('\n');
 return `# ${f.name} – Briefing für die Designerstellung

Familienrevision ${revision}. Automatisch aus der Werkstatt erzeugt; nicht von Hand ändern, sondern in der Werkstatt pflegen und neu herunterladen.

## Was gestaltet wird

Nur das **Design**: Texte, Motive, Foto. Form, Größe, Material, Bohrlöcher, Befestigung und Preise legt die Werkstatt fest.

- Material: ${f.material.label}, ${String(f.material.thicknessMm).replace('.',',')} mm, Verfahren Gravur. Gravur erscheint schwarz; Weiß bleibt ungraviert. Keine Graustufenflächen in Motiven.
- Randabstand der Gestaltung: ${f.designArea.marginMm} mm. Schutzzone um Bohrlöcher: ${f.designArea.keepoutMm} mm um den Lochrand.
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

## Stil und Hinweise

${f.briefingNotes.trim()||'Noch keine Stilnotizen hinterlegt.'}
`;
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
 const insert=(fid,rev,doc)=>db.prepare('INSERT INTO product_family_revisions VALUES(?,?,?,?)').run(fid,rev,JSON.stringify(doc),new Date().toISOString());
 const products=f=>f.sizes.map(s=>{const item=repository.importItem(productKey(f,s));return {sizeKey:s.key,productId:item?.id||null};});
 return {
  list:()=>db.prepare('SELECT * FROM product_families ORDER BY name COLLATE NOCASE,id').all().map(r=>{const d=record(r).document;return {id:r.id,name:r.name,revision:r.revision,updatedAt:r.updated_at,sizes:d.sizes.length,groups:d.groups.length,generated:products(d).filter(p=>p.productId).length};}),
  get(fid,{revision}={}){const r=row(fid),rec=record(r,revision??r.revision);return {...rec,products:products(rec.document)};},
  history:fid=>{row(fid);return db.prepare('SELECT revision,created_at FROM product_family_revisions WHERE family_id=? ORDER BY revision DESC').all(fid).map(v=>({revision:v.revision,createdAt:v.created_at}));},
  create(doc){const f=validateFamily(structuredClone(doc));return transact(()=>{if(db.prepare('SELECT 1 FROM product_families WHERE id=?').get(f.id))fail(409,'family_exists','Diese Produktfamilie ist bereits angelegt.');const t=new Date().toISOString();db.prepare('INSERT INTO product_families VALUES(?,?,?,?,?)').run(f.id,1,f.name,t,t);insert(f.id,1,f);return record(row(f.id));});},
  save(fid,doc,expectedRevision){const f=validateFamily(structuredClone(doc));if(f.id!==fid)invalid('Die Kennung einer Familie bleibt unverändert.');return transact(()=>{const r=row(fid);if(!Number.isSafeInteger(expectedRevision)||r.revision!==expectedRevision)fail(409,'family_conflict','Die Familie wurde inzwischen geändert. Bitte neu laden.');if(JSON.stringify(record(r).document)===JSON.stringify(f))return record(r);const rev=r.revision+1;insert(fid,rev,f);db.prepare('UPDATE product_families SET revision=?,name=?,updated_at=? WHERE id=?').run(rev,f.name,new Date().toISOString(),fid);return record(row(fid));});},
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
