// Nur lesend auf der Datenbank-SICHERUNG: die vier Felder name, seo, categoryIds, elementRights des nativen Produkts
// cfg_8e7ebe96-… Revision 1 (Ist) gegen das Zielmodell (Soll). Keine config-, Ressourcen- oder Metadatenkörper.
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,BASE=process.env.ZV_BASE||path.resolve(hier,'../sicherungen-db'),STAND=process.env.ZV_STAND||'20261111T205705Z';
const ZV=path.join(BASE,'zielvergleich-'+STAND),CFG='cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const log=e=>console.log(JSON.stringify({event:'zv_felder',...e}));
try{
 const file=path.join(BASE,STAND,'workshop.sqlite');
 if(/[\\/]acryl-employee-20261021-v1[\\/]data/.test(file))throw new Error('Live-Datenordner ist ausgeschlossen.');
 const db=new DatabaseSync(pathToFileURL(file).href+'?immutable=1',{readOnly:true});
 let ist,zeile;
 try{
  const rows=db.prepare('SELECT * FROM product_revisions WHERE product_id=? AND revision=1').all(CFG);
  if(rows.length!==1)throw new Error('Revision 1 nicht eindeutig: '+rows.length);
  zeile=rows[0];
  const spalte=Object.keys(zeile).find(k=>typeof zeile[k]==='string'&&zeile[k].startsWith('{')&&zeile[k].includes('"elementRights"'));
  if(!spalte)throw new Error('Dokumentspalte nicht gefunden.');
  ist=JSON.parse(zeile[spalte]);
 }finally{db.close();}
 const soll=JSON.parse(fs.readFileSync(path.join(ZV,'main-target.preview.json'),'utf8'));
 const art=id=>String(id).replace(/[-_]?\d+$/,'');
 const zaehle=rights=>{const out={designs:0,elemente:0,nachArt:{}};for(const els of Object.values(rights||{})){out.designs++;for(const [id,r] of Object.entries(els)){out.elemente++;const a=art(id);const g=out.nachArt[a]||(out.nachArt[a]={n:0,loeschbarNein:0,ersetzbarNein:0});g.n++;if(r.delete===false)g.loeschbarNein++;if(r.replace===false)g.ersetzbarNein++;}}return out;};
 const a=ist.elementRights||{},b=soll.elementRights||{};
 const nurIst=Object.keys(a).filter(k=>!(k in b)),nurSoll=Object.keys(b).filter(k=>!(k in a));
 const muster={},beispiele=[];let elementeNurIst=0,elementeNurSoll=0,designsMitAbweichung=0;
 for(const d of Object.keys(a).filter(k=>k in b)){
  let abw=false;
  for(const e of new Set([...Object.keys(a[d]),...Object.keys(b[d])])){
   if(!(e in b[d])){elementeNurIst++;abw=true;continue;}if(!(e in a[d])){elementeNurSoll++;abw=true;continue;}
   for(const f of new Set([...Object.keys(a[d][e]),...Object.keys(b[d][e])]))if(a[d][e][f]!==b[d][e][f]){abw=true;const k=art(e)+'.'+f+': '+a[d][e][f]+' → '+b[d][e][f];muster[k]=(muster[k]||0)+1;if(beispiele.length<8)beispiele.push(d+' / '+e+' / '+f+': '+a[d][e][f]+' → '+b[d][e][f]);}
  }
  if(abw)designsMitAbweichung++;
 }
 const ergebnis={cfg:CFG,revision:1,
  name:{ist:ist.name??null,soll:soll.name??null,gleich:ist.name===soll.name},
  seo:{ist:ist.seo??null,soll:soll.seo??null,gleich:JSON.stringify(ist.seo)===JSON.stringify(soll.seo)},
  categoryIds:{ist:ist.categoryIds??null,soll:soll.categoryIds??null},
  elementRights:{ist:zaehle(a),soll:zaehle(b),designsNurIst:nurIst.length,designsNurSoll:nurSoll.length,nurIstBeispiele:nurIst.slice(0,12),nurSollBeispiele:nurSoll.slice(0,12),gemeinsameDesigns:Object.keys(a).filter(k=>k in b).length,designsMitAbweichung,elementeNurIst,elementeNurSoll,musterDerAbweichungen:muster,beispiele},
  weitereFelderIst:Object.keys(ist).sort(),weitereFelderSoll:Object.keys(soll).sort()};
 fs.writeFileSync(path.join(ZV,'vier-felder-'+Date.now()+'.json'),JSON.stringify({...ergebnis,nurIst,nurSoll},null,1),{flag:'wx',mode:0o600});
 log({schritt:'ergebnis',...ergebnis});
}catch(error){log({schritt:'fehler',message:String(error.message||error)});process.exitCode=1;}
