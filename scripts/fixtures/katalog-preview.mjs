// Sichtprüfung einer Katalog-Linie im Konfigurator: frische, synthetische Werkstatt-DB im
// übergebenen Ordner, Linie per Katalog-Import anlegen, Vorschau-Server starten.
// Aufruf: node scripts/fixtures/katalog-preview.mjs <leerer-ordner> <katalog> <linie>
// Schreibt <ordner>/ready.json {url, products:[{id,name,start}]}. Öffnet nie eine bestehende DB.
import fs from 'node:fs';import path from 'node:path';
import {build} from '../../app/configurator/variant-m/build.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {openKatalog} from '../../app/workshop/katalog-source.mjs';
import {planKatalogImport,applyKatalogImport} from '../../app/workshop/katalog-import.mjs';
import {convertFont} from '../../app/workshop/font-library.mjs';
import {workshopResources} from '../../app/workshop/catalog.mjs';

const [dirArg,katalogDir,lineId]=process.argv.slice(2);
const dir=path.resolve(dirArg||'');
if(!dirArg||!katalogDir||!lineId)throw Error('Aufruf: <leerer-ordner> <katalog> <linie>');
if(fs.existsSync(path.join(dir,'workshop.sqlite')))throw Error('Frischer Ordner nötig.');
const katalog=openKatalog(katalogDir);
build({outputDirectory:dir});
const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json'),'utf8'))[0];
const w=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,themes:katalog.themes});
const available={...workshopResources().fonts,...w.fonts.resources()};
const plan=await planKatalogImport(katalog,lineId,{repository:w.repository,families:w.families,available,converter:convertFont,fontLibrary:w.fonts,profiles:w.profiles,assets:w.assets});
const result=applyKatalogImport(plan,{repository:w.repository,families:w.families});
const products=result.products.map(p=>{
 const r=w.repository.get(p.id),c=r.document.config,profile=c.profile;
 const start=profile.designs.find(design=>design.id===profile.defaultDesignId);
 return {id:p.id,sub:p.key.split(':')[2],revision:r.revision,name:r.document.name,start:profile.defaultDesignId,designs:profile.designs.length,
  material:profile.material.kind,widthMm:profile.geometry.width,heightMm:profile.geometry.height,
  startPhotoFields:start.objects.filter(o=>o.type==='photoSlot').length,
  mounting:profile.optionGroups.find(g=>g.id==='mounting').values.map(v=>v.id+':'+v.priceCents),
  photo:{enabled:c.photo.enabled,includedCount:c.photo.includedCount,extraPriceCents:c.photo.extraPriceCents}};
});
const server=createPreviewServer({workshop:w,outputDirectory:dir});
server.listen(0,'127.0.0.1',()=>fs.writeFileSync(path.join(dir,'ready.json'),JSON.stringify({url:'http://127.0.0.1:'+server.address().port,products},null,1),{mode:0o600}));
process.on('SIGTERM',()=>server.close(()=>{w.close();process.exit(0);}));
