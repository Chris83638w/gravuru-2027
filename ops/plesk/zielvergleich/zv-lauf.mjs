// Lesender Zielvergleich Acryl-Hauptprodukt (Astras Werkzeug, Commit 630adcc) auf der Datenbank-SICHERUNG.
// Setzt das Zielmodell aus fünf hochgeladenen Teilen zusammen (SHA-256 geprüft), legt alles in einen eigenen
// Prüfordner und ruft das Werkzeug einmal auf. Öffnet keine Live-Datenbank, schreibt nichts in Datenbanken.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {DatabaseSync,backup} from 'node:sqlite';

const hier=import.meta.dirname;
const BASE=process.env.ZV_BASE||path.resolve(hier,'../sicherungen-db');
const STAND=process.env.ZV_STAND||'20261111T205705Z';
const ZV=path.join(BASE,'zielvergleich-'+STAND);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const log=e=>console.log(JSON.stringify({event:'zv_lauf',...e}));
const TEILE=[['zv-target.teil01','de9ab52383cad53e93ed1373d9404f417b1954cfb6afca8fa48c830dfb0be6b1'],['zv-target.teil02','2e8c15a3e178336718824a3e0348c1a57c7dcb8cada1ade1afbfcb1e199c189a'],['zv-target.teil03','f0202a78b5b5fbc4fa0c32d700e5c8b57f43b7141e875fa9f43571d11d1691f6'],['zv-target.teil04','067399e39788995f5e975a35c74c55a9e122f962ffa37ce1da5de276f709b505'],['zv-target.teil05','6bb776fe1e45ebeabb117dffd5525841a8e1406e1a8961357cb85c2f7ec0d731']];
const GZ_SHA='867a53e41390f828dee03740f0f3c70112301f5e92d32d33bb199338450a1ea5',RAW_SHA='2da2130230341917f7a99d2a12889c1e2f10e408f64d3532e9c5ea6bae65713c';
const DATEIEN={
 'zv-compare-main-target-copy.mjs':['werkzeug/compare-main-target-copy.mjs','bc3dc7f8a1f3d215c4415d22cd48ccd76131cd78ced7b9b76c590d4197438a93'],
 'a168-copy-guard.mjs':['werkzeug/copy-guard.mjs','466ffb3e96fa8bcc2b569a3069abe7ea4ca00a856fae9a8cc65ac186b39a1671'],
 'zv-variant-mapping.preview.json.gz':['variant-mapping.preview.json.gz','3d0647b2cb671ba09199b6f9c4b9cdbfa58f24a0eafb1d2d672a18823070c9bf'],
 'zv-update-intent.preview.json':['update-intent.preview.json','80bbc2cca960c3ce736c789be1feaf9b5b15be6beb4e04864583a434a68dff4b'],
};
const kurz=(v,tiefe=0)=>{
 if(Array.isArray(v))return v.length&&v.every(x=>typeof x==='string'&&x.length<200)&&v.length<=12?v:{anzahl:v.length};
 if(v&&typeof v==='object'){if(tiefe>=2)return {felder:Object.keys(v).length};return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,kurz(x,tiefe+1)]));}
 return typeof v==='string'&&v.length>90?v.slice(0,90)+'…':v;
};
try{
 // Das Werkzeug verlangt abgeschlossene *.copy.sqlite-Dateien: Werkstatt = vorhandene Arbeitskopie (Stand 20:52, Suchstatistik dort schon umgestellt),
 // Profile = neue Kopie aus der frischen Sicherung.
 const workshop=process.env.ZV_WORKSHOP||path.join(BASE,'arbeitskopie-20261111T195242Z','workshop.copy.sqlite'),profiles=path.join(ZV,'profiles.copy.sqlite');
 if(/[\\/]acryl-employee-20261021-v1[\\/]data/.test(workshop))throw new Error('Live-Datenordner ist ausgeschlossen.');
 fs.mkdirSync(path.join(ZV,'werkzeug'),{recursive:true,mode:0o700});
 for(const [name,[ziel,hash]] of Object.entries(DATEIEN)){
  const buf=fs.readFileSync(path.join(hier,name));if(sha(buf)!==hash)throw new Error('Prüfsumme weicht ab: '+name);
  const dest=path.join(ZV,ziel);if(!fs.existsSync(dest))fs.writeFileSync(dest,buf,{flag:'wx',mode:0o600});else if(sha(fs.readFileSync(dest))!==hash)throw new Error('Vorhandene Datei weicht ab: '+ziel);
 }
 if(!fs.existsSync(profiles)){const db=new DatabaseSync(path.join(BASE,STAND,'profiles.sqlite'),{readOnly:true});try{await backup(db,profiles);}finally{db.close();}fs.chmodSync(profiles,0o600);}
 const target=path.join(ZV,'main-target.preview.json');
 if(!fs.existsSync(target)){
  const gz=Buffer.concat(TEILE.map(([n,h])=>{const b=fs.readFileSync(path.join(hier,n));if(sha(b)!==h)throw new Error('Teil weicht ab: '+n);return b;}));
  if(sha(gz)!==GZ_SHA)throw new Error('Zusammengesetztes Paket weicht ab.');
  const raw=zlib.gunzipSync(gz);if(sha(raw)!==RAW_SHA)throw new Error('Zielmodell weicht ab.');
  fs.writeFileSync(target,raw,{flag:'wx',mode:0o600});
 }else if(sha(fs.readFileSync(target))!==RAW_SHA)throw new Error('Vorhandenes Zielmodell weicht ab.');
 log({schritt:'vorbereitet',ordner:ZV,zielmodellBytes:fs.statSync(target).size});
 const start=Date.now();
 const args=[path.join(ZV,'werkzeug/compare-main-target-copy.mjs'),'--copy',workshop,'--profiles-copy',profiles,'--mapping',path.join(ZV,'variant-mapping.preview.json.gz'),'--target',target,'--intent',path.join(ZV,'update-intent.preview.json'),'--tenant','gravuru'];
 if(process.env.ZV_LEGACY==='true')args.push('--legacy-single-store','true');
 const r=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:512*1024*1024});
 const out=path.join(ZV,'main-target-comparison-'+Date.now()+'.json');
 fs.writeFileSync(out,r.stdout||'',{flag:'wx',mode:0o600});
 let ergebnis=null;try{ergebnis=JSON.parse(r.stdout);}catch{}
 log({schritt:'vergleich',exit:r.status,ms:Date.now()-start,stderr:String(r.stderr||'').slice(0,600),datei:path.basename(out),bytes:(r.stdout||'').length,kurz:ergebnis?kurz(ergebnis):null});
 if(r.status!==0)process.exitCode=1;
}catch(error){log({schritt:'fehler',message:String(error.message||error)});process.exitCode=1;}
