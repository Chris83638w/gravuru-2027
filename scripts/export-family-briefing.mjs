// Familien-Briefing als Ordner schreiben – ohne laufende Werkstatt, direkt aus familie.json.
// Gleicher Inhalt wie „Briefing herunterladen“ in der Werkstatt: BRIEFING.md, schriften.txt,
// familie.json und schablonen/<SKU>.svg (Kontur, Nutzfläche, Bohrbilder mit Schutzzonen, Rückplatte).
//
//   node scripts/export-family-briefing.mjs <familie.json> <zielordner> [--sizes KEY,KEY,…]
// Nur Lesen der Familie; nichts wird importiert.
import fs from 'node:fs';
import path from 'node:path';
import {validateFamily,familyBriefing,familyTemplate} from '../app/workshop/product-families.mjs';

const [src,out,...rest]=process.argv.slice(2);
if(!src||!out){console.error('Aufruf: node scripts/export-family-briefing.mjs <familie.json> <zielordner> [--sizes KEY,KEY]');process.exit(2);}
const only=rest[0]==='--sizes'&&rest[1]?new Set(rest[1].split(',')):null;
const f=validateFamily(JSON.parse(fs.readFileSync(src,'utf8')));
fs.mkdirSync(path.join(out,'schablonen'),{recursive:true});
fs.writeFileSync(path.join(out,'BRIEFING.md'),familyBriefing(f,'katalog'));
fs.writeFileSync(path.join(out,'schriften.txt'),f.fonts.join('\n')+'\n');
fs.writeFileSync(path.join(out,'familie.json'),JSON.stringify(f,null,1));
let n=0;
for(const s of f.sizes){if(only&&!only.has(s.key))continue;fs.writeFileSync(path.join(out,'schablonen',s.key+'.svg'),familyTemplate(f,s));n++;}
console.log(`${f.id}: BRIEFING.md, schriften.txt, familie.json, ${n} Schablonen → ${out}`);
