// Umschalten der Laufzeit in app.cjs: ändert ausschließlich den Ordnernamen in der einen Zeile, die
// scripts/acryl-employee-entry.cjs lädt. Hostoptionen werden weder verändert noch ausgegeben.
//   node um-schalten.mjs --pruefen
//   node um-schalten.mjs --ausfuehren --von=<Ordner jetzt> --auf=<Ordner neu>
// Vor dem Schreiben entsteht eine Kopie der bisherigen app.cjs neben diesem Skript (wird nie überschrieben).
// Der Neustart der App ist ein eigener Schritt (Plesk), nicht Teil dieses Skripts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hier=import.meta.dirname,P=path.resolve(hier,'..'),APP=path.join(P,'..','gravuru-2027-merchant','app.cjs');
const arg=n=>(process.argv.find(a=>a.startsWith('--'+n+'='))||'').slice(n.length+3);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const log=e=>console.log(JSON.stringify({event:'um_schalten',...e}));
const NAME=/^[A-Za-z0-9._-]+$/,EINSTIEG='/scripts/acryl-employee-entry.cjs';
try{
 const roh=fs.readFileSync(APP),text=roh.toString('utf8'),zeilen=text.split('\n');
 const treffer=zeilen.map((z,i)=>[i,z]).filter(([,z])=>z.includes(EINSTIEG));
 if(treffer.length!==1)throw new Error('Erwartet genau eine Laufzeitzeile, gefunden: '+treffer.length);
 const [nr,zeile]=treffer[0],m=zeile.match(/\/([A-Za-z0-9._-]+)\/scripts\/acryl-employee-entry\.cjs/);
 if(!m)throw new Error('Laufzeitordner in der Zeile nicht erkennbar.');
 const jetzt=m[1],stand={datei:'gravuru-2027-merchant/app.cjs',bytes:roh.length,zeilen:zeilen.length,laufzeitzeile:nr+1,laufzeit:jetzt,sha256:sha(roh)};
 if(!process.argv.includes('--ausfuehren')){log({schritt:'pruefung',...stand});process.exit(0);}
 const von=arg('von'),auf=arg('auf');
 if(!NAME.test(von)||!NAME.test(auf)||von===auf)throw new Error('--von und --auf müssen zwei verschiedene Ordnernamen sein.');
 if(jetzt!==von)throw new Error('app.cjs zeigt auf '+jetzt+', erwartet war '+von+'. Nichts geändert.');
 const ziel=path.join(P,auf,'scripts','acryl-employee-entry.cjs');
 if(!fs.existsSync(ziel))throw new Error('Einstieg fehlt im Zielordner: private/'+auf+EINSTIEG);
 const alt='/'+von+EINSTIEG,neuZeile=zeile.replace(alt,'/'+auf+EINSTIEG);
 if(neuZeile===zeile||zeile.split(alt).length!==2)throw new Error('Ersetzung nicht eindeutig. Nichts geändert.');
 const neu=Buffer.from(zeilen.map((z,i)=>i===nr?neuZeile:z).join('\n'),'utf8');
 if(neu.length!==roh.length+Buffer.byteLength(auf)-Buffer.byteLength(von))throw new Error('Längenprüfung fehlgeschlagen. Nichts geändert.');
 const ts=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',kopie=path.join(hier,'app.cjs.bak-'+ts+'-vor-'+auf);
 fs.writeFileSync(kopie,roh,{flag:'wx',mode:0o600});
 if(sha(fs.readFileSync(kopie))!==stand.sha256)throw new Error('Kopie der bisherigen app.cjs weicht ab. Nichts geändert.');
 const modus=fs.statSync(APP).mode&0o777,tmp=APP+'.neu-'+ts;
 const fd=fs.openSync(tmp,'wx',modus);
 try{fs.writeSync(fd,neu);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 fs.chmodSync(tmp,modus);fs.renameSync(tmp,APP);
 const gelesen=fs.readFileSync(APP);
 if(sha(gelesen)!==sha(neu))throw new Error('Rücklesen weicht ab – app.cjs sofort prüfen.');
 log({schritt:'umgeschaltet',von,auf,vorher:{bytes:roh.length,sha256:stand.sha256},nachher:{bytes:gelesen.length,sha256:sha(gelesen)},kopie:path.basename(kopie),laufzeitzeile:nr+1,geaenderteZeilen:1});
}catch(error){log({schritt:'fehler',message:String(error.message||error)});process.exitCode=1;}
