// Aufbau der Wegwerfumgebung für den isolierten Zwei-Store-Hosttest (Kandidat f85390b).
// Legt ausschließlich NEUE Dateien unter private/vollhost-f85390b-20261112/ an (bricht ab, wenn der Ordner existiert).
// Quellen werden nur gelesen: Kandidatenordner, Legacy-Release, die beiden DB-SICHERUNGEN (nicht die Live-Datenbanken),
// neun öffentliche Vorschaudateien und fünf kleine Nebendateien der Datenordner. Eigenes synthetisches App-Secret.
// Mit --pruefen wird nur gelistet.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const P=path.resolve(import.meta.dirname,'..');
const V=path.join(P,'vollhost-f85390b-20261112');
const Q={
 kandidat:path.join(P,'kandidat-f85390b-20261112'),
 legacyRelease:path.join(P,'gravuru-combined-id-20261022-v1/legacy'),
 acrylSicherung:path.join(P,'sicherungen-db/20261111T212859Z'),
 legacySicherung:path.join(P,'sicherungen-db/legacy/20261112T013926Z'),
 acrylLive:path.join(P,'acryl-employee-20261021-v1/data'),
 legacyLive:path.join(P,'gravuru-2027-merchant-data'),
 vorschau:path.join(P,'mika-public-original-previews-20261109-v1'),
 konfig:path.join(P,'gravuru-2027-merchant-shopify.json'),
};
const DBS=['workshop.sqlite','design-assets.sqlite','profiles.sqlite'];
const log=e=>console.log(JSON.stringify({event:'vh_aufbau',...e}));
function dateiSha(file){const fd=fs.openSync(file,'r'),h=crypto.createHash('sha256'),buf=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null)))h.update(buf.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
function baum(src,dest){let n=0,b=0;const walk=(a,z)=>{fs.mkdirSync(z,{mode:0o700});for(const e of fs.readdirSync(a,{withFileTypes:true})){const x=path.join(a,e.name),y=path.join(z,e.name);if(e.isSymbolicLink())throw new Error('Link in Quelle: '+path.relative(P,x));if(e.isDirectory())walk(x,y);else if(e.isFile()){fs.copyFileSync(x,y,fs.constants.COPYFILE_EXCL);fs.chmodSync(y,0o600);n++;b+=fs.statSync(y).size;}}};walk(src,dest);return {dateien:n,bytes:b};}
const kopie=(src,dest)=>{fs.copyFileSync(src,dest,fs.constants.COPYFILE_EXCL);fs.chmodSync(dest,0o600);return fs.statSync(dest).size;};
try{
 for(const [k,v] of Object.entries(Q))if(!fs.existsSync(v))throw new Error('Quelle fehlt: '+k);
 const manifest=d=>JSON.parse(fs.readFileSync(path.join(d,'manifest.json'),'utf8')).dateien;
 const mA=manifest(Q.acrylSicherung),mL=manifest(Q.legacySicherung);
 const bedarf=DBS.reduce((s,f)=>s+mA[f].bytes+mL[f].bytes,0);
 const frei=(()=>{const s=fs.statfsSync(P);return s.bavail*s.bsize;})();
 if(process.argv.includes('--pruefen')){log({schritt:'pruefung',ziel:path.relative(P,V),existiert:fs.existsSync(V),bedarfBytes:bedarf,freiBytes:frei});process.exit(0);}
 if(frei<bedarf*3)throw new Error('Zu wenig freier Platz.');
 fs.mkdirSync(V,{mode:0o700}); // bricht ab, wenn vorhanden – nie überschreiben
 const D=n=>{const d=path.join(V,n);fs.mkdirSync(d,{mode:0o700});return d;};
 const bericht={};
 bericht.kandidat=baum(Q.kandidat,path.join(V,'kandidat'));
 bericht.legacyRelease=baum(Q.legacyRelease,path.join(V,'legacy-release'));
 const acryl=D('acryl-daten'),legacy=D('legacy-daten'),vorschau=D('vorschau'),konfig=D('konfig');D('belege');D('app-root');
 bericht.acrylDaten={};for(const f of DBS){kopie(path.join(Q.acrylSicherung,f),path.join(acryl,f));const s=dateiSha(path.join(acryl,f));if(s!==mA[f].sha256)throw new Error('Acrylkopie weicht ab: '+f);bericht.acrylDaten[f]=[mA[f].bytes,s];}
 bericht.legacyDaten={};for(const f of DBS){kopie(path.join(Q.legacySicherung,f),path.join(legacy,f));const s=dateiSha(path.join(legacy,f));if(s!==mL[f].sha256)throw new Error('Legacykopie weicht ab: '+f);bericht.legacyDaten[f]=[mL[f].bytes,s];}
 bericht.nebendateien={};
 for(const f of ['katalog-worker-cache.json.gz','motif-search-previews.json','slate-group-import-state.json'])if(fs.existsSync(path.join(Q.acrylLive,f)))bericht.nebendateien['acryl/'+f]=kopie(path.join(Q.acrylLive,f),path.join(acryl,f));
 for(const f of ['.gravuru-shopify-merchant-test.json','approved-customer-preview.json'])if(fs.existsSync(path.join(Q.legacyLive,f)))bericht.nebendateien['legacy/'+f]=kopie(path.join(Q.legacyLive,f),path.join(legacy,f));
 bericht.vorschau={dateien:0,bytes:0};for(const e of fs.readdirSync(Q.vorschau,{withFileTypes:true})){if(!e.isFile())throw new Error('Unerwarteter Eintrag im Vorschauordner.');bericht.vorschau.bytes+=kopie(path.join(Q.vorschau,e.name),path.join(vorschau,e.name));bericht.vorschau.dateien++;}
 // Konfiguration: gleiche Schlüssel wie die Liveakte, aber Datenordner = Legacy-Kopie, eigenes synthetisches Secret, kein KI-Anschluss.
 const live=JSON.parse(fs.readFileSync(Q.konfig,'utf8')),werte={...live.values};
 const geheim=path.join(konfig,'app-secret.txt');fs.writeFileSync(geheim,crypto.randomBytes(32).toString('hex')+'\n',{flag:'wx',mode:0o600});
 werte.GRAVURU_PRIVATE_DATA_DIR=legacy;werte.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE=geheim;const kiEntfernt='GRAVURU_AI_CONFIG_FILE' in werte;delete werte.GRAVURU_AI_CONFIG_FILE;
 fs.writeFileSync(path.join(konfig,'merchant-shopify.json'),JSON.stringify({...live,values:werte}),{flag:'wx',mode:0o600});
 bericht.konfig={schluessel:Object.keys(werte),geaendert:['GRAVURU_PRIVATE_DATA_DIR','GRAVURU_SHOPIFY_CLIENT_SECRET_FILE'],kiAnschlussEntfernt:kiEntfernt,secretSynthetisch:true};
 fs.writeFileSync(path.join(V,'AUFBAU.json'),JSON.stringify({schema:'gravuru-vollhost-aufbau/v1',erstellt:new Date().toISOString(),...bericht},null,1),{flag:'wx',mode:0o600});
 log({schritt:'fertig',ordner:path.relative(P,V),...bericht});
}catch(error){log({schritt:'fehler',message:String(error.message||error)});process.exitCode=1;}
