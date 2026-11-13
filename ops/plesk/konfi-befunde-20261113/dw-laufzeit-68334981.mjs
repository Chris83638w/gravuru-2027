// Neue Laufzeit für die Konfi-Befunde vom 13.11.2026 (Commit 68334981, enthält auch Zurück-Taste/Reiterleiste 4f909b1).
// Exakte Kopie der laufenden Laufzeit kandidat-4572957-20261113 in einen NEUEN Ordner, darin 12 Dateien ersetzt und
// 3 neue Dateien angelegt. Der laufende Ordner wird nur gelesen. Umschalten (um-schalten.mjs) und Neustart sind eigene Schritte.
//   node dw-laufzeit-68334981.mjs              -> nur prüfen (Quelle, Prüfsummen, Platz)
//   node dw-laufzeit-68334981.mjs --anlegen    -> neuen Ordner anlegen und prüfen
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hier=import.meta.dirname,P=fs.realpathSync(process.env.DW_P||path.resolve(hier,'..'));
const VON='kandidat-4572957-20261113',AUF='kandidat-68334981-20261113',D='app/';
// [Pfad unter app/, Prüfsumme im laufenden Ordner (null = neue Datei), neue Prüfsumme, Datei im Staging]
const DATEIEN=[
 ['configurator/mobile-demo/demo.css','856dc180ea883a7a19be89a0862c61f96ddc2cd6fc48179a7e7fa20a0be8a321','05559e66cbb6a3bafbf8be2755b1700f561f1c52f58c2f995fdb6df6408f8ed2','dw-68334981-mobile-demo-demo.css'],
 ['configurator/mobile-demo/demo.mjs','4227eb43f63d384797c2ba7fe68d3f5797eddae3fa435446fd6e4fcfd7cb9308','92f7714889030ef9b2c6b797d0425d59e8cae18806c79527af3e0026c960f1dc','dw-68334981-mobile-demo-demo.mjs'],
 ['configurator/mobile-demo/preview-action.mjs','47ddf5856386d760d379ca16b95abf1f6f0ddb5d5157593dcc45630e12d88274','73890e5b99baf303657d302eb1e476cf76aa18e60ca9a0febfd3e5a456fd1283','dw-68334981-mobile-demo-preview-action.mjs'],
 ['configurator/variant-m/completion.mjs','7359464ebf18081e091efb6e6292fc82d743cd5a41962ad6b43c92a636b0ad3f','0239ff922f327b91f6b35e5f3f8d85710dd4d13b26ea6f17ae1659d02a5b06e9','dw-68334981-variant-m-completion.mjs'],
 ['configurator/variant-m/design-content-transfer.mjs','db2bde2723e157dc9bb43091c832da50a3a34b515b3acc83d77769c1b2a9ba16','29536faf2b4132a1375a777c8e23be161af1c800da2459a940216f0dbaf39167','dw-68334981-variant-m-design-content-transfer.mjs'],
 ['configurator/variant-m/family-formats-ui.mjs','57883595d1dfa7038838d3ec0a6c46c4c9bee2753be63e3d15fdf1b6bf75caeb','44ed0c6f2188414c3ac57ee8692cf44a499bc5cb686c9ff5db901a70c0083425','dw-68334981-variant-m-family-formats-ui.mjs'],
 ['configurator/variant-m/family-formats.mjs','183d00d611042e2c2d9f6097787859656388adcc6ef92ae52c3c6498e4deb210','82e15573af7e7d61d12353021eaf0c8870dc14f654de3148ec0d2d846abf036e','dw-68334981-variant-m-family-formats.mjs'],
 ['configurator/variant-m/photo-drop-confirm.mjs',null,'69e69643cd3a6f645e17cdf7c3b775d86f9674cd2ffd97315944654f46233c3f','dw-68334981-variant-m-photo-drop-confirm.mjs'],
 ['configurator/variant-m/product-design-gallery.mjs','ab55e803ec5c20b798c5cd12aec6a46d92e1d06204a19b82660f9c2f74dc0aac','83b330bcef1898fa61a727eb5f3b600a70e8c11fdb68583b68f14c68a17ef16d','dw-68334981-variant-m-product-design-gallery.mjs'],
 ['configurator/variant-m/quantity-guard.mjs',null,'e61baf09f1447fb477d048729ba62697ff85a708500c731f3a8efac2ad68c549','dw-68334981-variant-m-quantity-guard.mjs'],
 ['configurator/variant-m/template-deletion.mjs','a32b488fa3dde9a4e4956c1e0aec0abe9fa5fb9bc3961d4a50cada58843b730d','d6f8ce7b9ab013ec5f3f50cd1f05931cea5759bcb5546b62b507f10e51dd9730','dw-68334981-variant-m-template-deletion.mjs'],
 ['configurator/variant-m/text-edge-margin.mjs',null,'f7754ea5d8fce8ba75fb237db18dc94455d887a80459a367f7a26fa3810fd933','dw-68334981-variant-m-text-edge-margin.mjs'],
 ['configurator/variant-m/ux.mjs','33c42c1543a6cf7774bd81d4bf6a372b268e64bf13957e541325f1a359511684','cebbefc303ccd6b00ee9c2dad1bdeafbf0fe8b86228d5cd2efc2ab174e628916','dw-68334981-variant-m-ux.mjs'],
 ['configurator/variant-m/workflow-model.mjs','5f051b4edba30f0ec0a7e29c8cb90b16959b676b9f26f69bc8b73740dbab740b','d51555cf5cf52222bede22267ca6af4a6786894e09406017472d8946c51dcf03','dw-68334981-variant-m-workflow-model.mjs'],
 ['configurator/variant-m/workflow.mjs','89cb2bd74761bb224a9e5c0d096957666311481bc1b5fba576541a4c4ac30839','74a2fc9491e1e721eb092c8524400899ebe6159dbd29ec0b4455f616f092d6ab','dw-68334981-variant-m-workflow.mjs']
];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const log=e=>console.log(JSON.stringify({event:'dw_laufzeit',...e}));
function inventar(root){let dateien=0,bytes=0,links=0;const h=crypto.createHash('sha256');const walk=rel=>{for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){const r=path.join(rel,e.name);if(e.isSymbolicLink()){links++;h.update('L '+r+' '+fs.readlinkSync(path.join(root,r))+'\n');}else if(e.isDirectory())walk(r);else if(e.isFile()){const s=fs.statSync(path.join(root,r));dateien++;bytes+=s.size;h.update('F '+r+' '+s.size+'\n');}}};walk('');return {dateien,bytes,links,listeSha256:h.digest('hex')};}
try{
 const SRC=path.join(P,VON),DST=path.join(P,AUF);
 const neu=new Map(DATEIEN.map(([rel,,neuSha,staging])=>{const b=fs.readFileSync(path.join(hier,staging));if(sha(b)!==neuSha)throw new Error('Neue Datei im Staging weicht ab: '+staging);return [rel,b];}));
 for(const [rel,altSha] of DATEIEN){const f=path.join(SRC,D,rel);if(altSha===null){if(fs.existsSync(f))throw new Error('Neue Datei existiert im laufenden Ordner bereits: '+rel);}else if(sha(fs.readFileSync(f))!==altSha)throw new Error('Laufende Datei weicht vom erwarteten Stand ab: '+rel);}
 const vorher=inventar(SRC),st=fs.statfsSync(P),frei=Number(st.bavail)*Number(st.bsize);
 const stand={von:VON,auf:AUF,quelle:vorher,freiBytes:frei,zielVorhanden:fs.existsSync(DST),dateien:DATEIEN.length,neu:DATEIEN.filter(d=>d[1]===null).length};
 if(!process.argv.includes('--anlegen')){log({schritt:'pruefung',...stand,bereit:!stand.zielVorhanden&&frei>vorher.bytes*3});process.exit(0);}
 if(stand.zielVorhanden)throw new Error('Zielordner existiert bereits. Nichts geändert.');
 if(frei<vorher.bytes*3)throw new Error('Zu wenig freier Speicher.');
 fs.cpSync(SRC,DST,{recursive:true,errorOnExist:true,force:false,preserveTimestamps:true,verbatimSymlinks:true});
 const kopie=inventar(DST);
 if(kopie.listeSha256!==vorher.listeSha256||kopie.dateien!==vorher.dateien||kopie.bytes!==vorher.bytes)throw new Error('Kopie weicht vom Quellinventar ab (Ordner bleibt zur Prüfung liegen, nichts umgeschaltet).');
 let delta=0,hinzu=0;const ersetzt=[];
 for(const [rel,altSha,neuSha] of DATEIEN){
  const ziel=path.join(DST,D,rel);let modus=0o644;
  if(altSha===null){if(fs.existsSync(ziel))throw new Error('Neue Datei existiert in der Kopie: '+rel);modus=fs.statSync(path.join(path.dirname(ziel),'ux.mjs')).mode&0o777;hinzu++;delta+=neu.get(rel).length;}
  else{const alt=fs.readFileSync(ziel);modus=fs.statSync(ziel).mode&0o777;if(sha(alt)!==altSha)throw new Error('Kopierte Datei weicht ab: '+rel);fs.unlinkSync(ziel);delta+=neu.get(rel).length-alt.length;}
  fs.writeFileSync(ziel,neu.get(rel),{flag:'wx',mode:modus});
  if(sha(fs.readFileSync(ziel))!==neuSha)throw new Error('Geschriebene Datei weicht ab: '+rel);
  ersetzt.push({datei:D+rel,alt:altSha,neu:neuSha,modus:modus.toString(8)});
 }
 const nachher=inventar(DST),quelleNachher=inventar(SRC);
 const ok=nachher.dateien===vorher.dateien+hinzu&&nachher.bytes===vorher.bytes+delta&&quelleNachher.listeSha256===vorher.listeSha256;
 log({schritt:'angelegt',bestanden:ok,von:VON,auf:AUF,quelle:vorher,ziel:nachher,neueDateien:hinzu,quelleUnveraendert:quelleNachher.listeSha256===vorher.listeSha256,ersetzt});
 if(!ok)process.exitCode=1;
}catch(e){log({schritt:'fehler',fehler:String(e?.message||e).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,300),bestanden:false});process.exitCode=1;}
