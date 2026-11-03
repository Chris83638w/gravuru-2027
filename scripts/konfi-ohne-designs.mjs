// Konfi ohne Designs (Chris 03.11.2026, ENTSCHEIDUNGEN 4.43): ein Schilder-Konfi je Material mit allen Größen
// der Familie (Form → Größe → Befestigung, bei Acryl zusätzlich Farbe). Je Größe ein leeres Schild mit „Dein Text“.
// Schreibt nur Dateien; lädt nichts hoch, legt keine Shopify-Produkte an.
//   node scripts/konfi-ohne-designs.mjs --katalog=<katalog> --linie=edelstahl-tuerschilder --start=GR-ES-AB-120X80-T15 --output=<neuer ordner>
//   node scripts/konfi-ohne-designs.mjs --katalog=<katalog> --linie=acryl-tuerschilder --start=TS-Acryl-AB-120X80-T30-SW --output=<neuer ordner>
import fs from 'node:fs';import path from 'node:path';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {planFamilyFormats,blankDesignId} from '../app/workshop/katalog-family-formats.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
const arg=n=>process.argv.find(v=>v.startsWith('--'+n+'='))?.slice(n.length+3);
const katalogDir=arg('katalog'),lineId=arg('linie'),start=arg('start'),output=arg('output'),sub=arg('unterkategorie')||'familienschilder';
if(!katalogDir||!lineId||!start||!output)throw Error('Aufruf: --katalog= --linie= --start=<sizeKey> --output=<neuer ordner> [--unterkategorie=familienschilder]');
if(fs.existsSync(output))throw Error('Ausgabeordner existiert bereits; kein Überschreiben.');
const katalog=openKatalog(katalogDir),line=katalog.lines.get(lineId);if(!line)throw Error('Linie fehlt.');
const size=line.families.map(id=>katalog.families.get(id)).flatMap(f=>f.sizes).find(s=>s.key===start);if(!size)throw Error('Startgröße fehlt.');
const shopProduct={sizeKey:start,themeId:sub,defaultDesignId:blankDesignId(size),groessenWahl:'alle',vorlagen:'leer'};
const r=await planFamilyFormats(katalog,lineId,sub,{converter:convertFont,shopProduct});
if(!r.config)throw Error('Blockiert: '+r.report.blocked.map(b=>b.reason).join(' · '));
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'review-config.json'),JSON.stringify(r.config)+'\n');
fs.writeFileSync(path.join(output,'plan.json'),JSON.stringify(r.report,null,2)+'\n');
console.log(JSON.stringify({output,groessen:r.config.familyFormats.formats.length,varianten:r.report.shopify.plannedVariants,optionen:r.report.shopify.options,produktschnitt:shopProduct}));
