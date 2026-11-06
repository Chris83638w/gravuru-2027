// Export only report-listed, validated native documents. No database or release.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1];
for(const k of ['--data','--out'])if(!args.includes(k))throw Error(k+' required');
const data=path.resolve(arg('--data')),out=path.resolve(arg('--out'));
if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Output must be new or empty to prevent stale templates.');
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v,null,2)+'\n');};
const copy=(relative)=>{const b=fs.readFileSync(path.join(data,relative));write(path.join(out,relative),b);return sha(b);};
const report=read(path.join(data,'preparation-report.json'));
if(!report.counts)throw Error('Preparation has not finished successfully.');
const pack={schema:'gravuru-slate-original-review/v1',catalogueCommit:report.catalogueCommit,reviewOnly:true,released:false,counts:report.counts,products:[],assets:[],fontFiles:{},originals:[]};
const assets=createDesignAssetStore({filename:path.join(data,'design-assets.sqlite')});
try{
 const assetIds=new Set(),fontNames=new Set();
 for(const p of report.products){
  const document=read(path.join(data,p.file)),fonts=document.config.localResources.fonts;
  const fontRefs=Object.keys(fonts);fontRefs.forEach(n=>fontNames.add(n));
  document.config.localResources.fonts={};
  for(const e of document.config.localResources.photoExamples||[])assetIds.add(e.assetId);
  for(const d of document.config.profile.designs)for(const o of d.objects)if(o.photoMaskAssetId)assetIds.add(o.photoMaskAssetId);
  write(path.join(out,p.file),{document,fontRefs});pack.products.push({...p,documentHash:sha(JSON.stringify(document))});
 }
 for(const name of fontNames){const file='fonts/'+name+'.json';copy(file);pack.fontFiles[name]=file;}
 for(const id of assetIds){
  const metadata=assets.get(id),source='assets/'+id+'-source.svg',preview='assets/'+id+'.svg';
  write(path.join(out,source),assets.read(id,true));write(path.join(out,preview),assets.read(id));
  pack.assets.push({id,metadata,source,preview});
 }
 for(const r of report.originals){
  for(const f of r.files){const file='originals/'+r.id+'/'+f.name;if(copy(file)!==f.sha256)throw Error('Source checksum changed: '+file);}
  const row={...r};
  for(const t of row.targets.filter(t=>t.status==='prepared')){copy(t.file);copy(t.preview);}
  if(r.normalized){
   copy('native-source/'+r.id+'/design.svg');copy('native-source/'+r.id+'/design.json');
   for(const f of r.files.filter(f=>/\.(png|jpe?g)$/i.test(f.name)&&f.name!=='preview.png'))copy('native-source/'+r.id+'/'+f.name);
   for(const f of fs.readdirSync(path.join(data,'native-source',r.id)).filter(f=>f.startsWith('beispiel-20261106.')))copy('native-source/'+r.id+'/'+f);
  }
  if(r.process==='UV'){
   const product=path.join(data,'originals',r.id,'product.json');
   const references=fs.existsSync(product)?read(product).views.flatMap(v=>v.elements.filter(e=>e.type==='image').map(e=>e.source)):[];
   row.missingFiles=fs.existsSync(product)?[...new Set(references.filter(s=>!s.startsWith('data:')&&!fs.existsSync(path.join(data,'originals',r.id,s))))]:r.files.some(f=>f.name==='design.svg')?[]:['product.json (only flattened original available)'];
   row.status='open';row.reason=row.reason||'UV source is incomplete; editable original print layers cannot be reconstructed exactly.';
  }
  pack.originals.push(row);
 }
 write(path.join(out,'manifest.json'),pack);
 write(path.join(out,'preparation-report.json'),report);
 copy('audit.json');
 const open=pack.originals.filter(r=>r.reason||r.error||r.targets.some(t=>t.status!=='prepared'));
 write(path.join(out,'OFFENE-ORIGINALE.json'),open);
 write(path.join(out,'START-HIER.md'),`# Schiefer-Gedenktafeln aus der Neuen Struktur\n\nStand ${new Date().toISOString().slice(0,10)}; Katalog ${report.catalogueCommit}.\n\n${pack.counts.originals} Originale gesichert: ${pack.counts.engraving} Gravur und ${pack.counts.uv} UV. ${pack.counts.preparedDesigns} Gravurdesigns sind in beiden Größen technisch vorbereitet; ${pack.counts.preparedTargets} gültige Größenfassungen insgesamt. Die vollständige bearbeitbare Galerie wird vom lokalen Prüfserver unter /originale/ bereitgestellt.\n\nDie Vorlage für 22 × 14 cm verwendet dieselben Originalelemente wie 30 × 20 cm: proportional 70 %, links/rechts jeweils 5 mm frei. Keine Verzerrung. Texte bleiben editierbar, Motive bleiben Vektoren und Originalfotomasken bleiben erhalten. Dokumentierte Ersatzschriften sind von Chris im Chat am 05.11.2026 freigegeben; ihr Schriftgrad ist an die gespeicherte Originaltextbreite angepasst. Originaldateien in originals/ bleiben bytegleich. Thematisch passende Beispielfotos wurden nach Chris' Auftrag vom 06.11.2026 in vorhandenen Originalmasken ergänzt; Herkunft und Änderungen stehen im Manifest.\n\nOffene Dateien sind vollständig in OFFENE-ORIGINALE.json aufgelistet und nicht als fertige Konfiguratorvorlagen freigegeben. Fehlende UV-Ebenen und fehlende Originalschriften werden nicht erfunden.\n\nLokale Prüfung aus dem Aufgabenbranch: node scripts/load-slate-original-review.mjs --package "<dieser Ordner>" --out "<neuer lokaler Prüfungsordner>". Danach: node scripts/serve-slate-review.mjs --data "<Prüfungsordner>" --gallery "<dieser Ordner>" --port 8996. Öffnen: http://127.0.0.1:8996/originale/. Die lokale Importübersicht enthält die Produkt-IDs und Revisionen. „Bearbeiten“ öffnet das richtige Design. Änderungen speichern erzeugt einen lokalen Stand; beim erneuten Öffnen der Galerie erscheint der neueste Stand. Beide Größen bleiben getrennte Entwürfe: Änderungen in einer Größe werden nicht automatisch auf die zweite übertragen. Dieses unveränderliche Ausgangspaket enthält spätere Editoränderungen nicht; diese liegen in workshop.sqlite und design-assets.sqlite im Prüfungsordner und müssen vor einer späteren Übernahme erneut exportiert und geprüft werden. Keine Shopify-Anlage und keine Live-Freigabe.\n\nVor einer späteren produktiven Einbindung müssen die normalen Katalog-/Designfreigaben und die bestehenden Produktbindungen angewendet werden; dieses Paket umgeht keine Freigabe.\n`);
 const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else files.push({file:path.relative(out,f).replaceAll('\\','/'),sha256:sha(fs.readFileSync(f)),bytes:fs.statSync(f).size});}}walk(out);write(path.join(out,'files-sha256.json'),files);
 console.log(JSON.stringify({out,counts:pack.counts,files:files.length,assets:pack.assets.length,fonts:fontNames.size,open:open.length}));
}finally{assets.close();}
