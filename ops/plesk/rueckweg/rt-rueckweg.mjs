// Hülle für den Rückweg der Suchstatistik (Skript rt-suchstatistik-zurueck-b.mjs = Astras ergänzte Fassung 233f4dfd…).
// Setzt nur die Pfade: Sicherung von VOR dem Umschalten und eine neue private Archivdatei für Designsuch-Zeilen.
//   node rt-rueckweg.mjs --pruefen [--stand=JJJJMMTTThhmmssZ] [--kopie]
//   node rt-rueckweg.mjs --ausfuehren --stand=JJJJMMTTThhmmssZ          (nur bei angehaltener App, Live-Datenbank)
// --kopie richtet den Lauf auf die Arbeitskopie statt auf die Live-Datenbank (Übung).
import path from 'node:path';
const hier=import.meta.dirname,basis=path.resolve(hier,'../sicherungen-db');
const stand=(process.argv.find(a=>a.startsWith('--stand='))||'').slice(8);
if(!/^\d{8}T\d{6}Z$/.test(stand)){console.log(JSON.stringify({event:'rt_rueckweg',schritt:'fehler',message:'--stand=JJJJMMTTThhmmssZ fehlt (Sicherung von vor dem Umschalten).'}));process.exit(1);}
if(process.argv.includes('--kopie')){
 if(process.argv.includes('--ausfuehren')&&!process.argv.includes('--uebung')){console.log(JSON.stringify({event:'rt_rueckweg',schritt:'fehler',message:'--kopie mit --ausfuehren nur zusammen mit --uebung.'}));process.exit(1);}
 process.env.RT_DB=path.join(basis,'arbeitskopie-20261111T195242Z','workshop.copy.sqlite');
}
process.env.RT_SICHERUNG_DB=path.join(basis,stand,'workshop.sqlite');
process.env.RT_SUCHSTATISTIK_ARCHIV=path.join(basis,'designsuche-rueckweg-'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z.json');
console.log(JSON.stringify({event:'rt_rueckweg',schritt:'pfade',db:process.env.RT_DB?'Arbeitskopie':'Live-Datenbank',sicherung:stand,archiv:path.basename(process.env.RT_SUCHSTATISTIK_ARCHIV)}));
await import('./rt-suchstatistik-zurueck-b.mjs');
