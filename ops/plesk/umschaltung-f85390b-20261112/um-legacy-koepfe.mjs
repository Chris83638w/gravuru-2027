// Nur lesend: listet aus der NEUESTEN Legacy-Sicherung die gebundenen Shopprodukte (Köpfe und Formbindungen),
// damit ein bestehender Legacy-Kundeneinstieg für die Prüfung nach dem Umschalten ausgewählt werden kann.
// Gibt nur Kennungen (Produkt-/Varianten-IDs, Konfi-ID, Status) aus – keine Dokumente, keine Kundendaten.
import fs from 'node:fs';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,basis=path.resolve(hier,'../sicherungen-db/legacy');
const log=e=>console.log(JSON.stringify({event:'um_legacy',...e}));
try{
 const stand=fs.readdirSync(basis).filter(n=>/^\d{8}T\d{6}Z$/.test(n)).sort().at(-1);
 const db=new DatabaseSync(pathToFileURL(path.join(basis,stand,'workshop.sqlite')).href+'?immutable=1',{readOnly:true});
 const spalten=t=>db.prepare('PRAGMA table_info("'+t+'")').all().map(r=>r.name);
 const kurz=row=>Object.fromEntries(Object.entries(row).filter(([k,v])=>/id|key|status|revision|kind|type|store|handle/i.test(k)&&(typeof v==='number'||(typeof v==='string'&&v.length<=90))));
 const out={stand,koepfeSpalten:spalten('shop_product_binding_heads'),formSpalten:spalten('form_shop_bindings')};
 out.koepfe=db.prepare('SELECT * FROM shop_product_binding_heads LIMIT 12').all().map(kurz);
 const fs_=out.formSpalten,pcol=fs_.find(c=>/product/i.test(c)&&/shop/i.test(c))||fs_.find(c=>/product/i.test(c));
 out.formProduktSpalte=pcol||null;
 if(pcol)out.formProdukte=db.prepare('SELECT "'+pcol+'" AS p,COUNT(*) AS n FROM form_shop_bindings GROUP BY 1 ORDER BY n DESC LIMIT 12').all();
 out.formBeispiel=db.prepare('SELECT * FROM form_shop_bindings LIMIT 2').all().map(kurz);
 db.close();log(out);
}catch(error){log({schritt:'fehler',message:String(error.message||error)});process.exitCode=1;}
