import fs from 'node:fs'
import sharp from 'sharp'
const stamp=new Date().toISOString().replace(/[:.]/g,'-');fs.mkdirSync('data/backups/'+stamp,{recursive:true});fs.copyFileSync('data/gravuru.db',`data/backups/${stamp}/gravuru.db`)
const picks=JSON.parse(fs.readFileSync('work/images/picks.json','utf8'))
const more=JSON.parse(fs.readFileSync('work/images/extra-picks.json','utf8'))
const assets=[
 {key:'schild',source:picks[0].src,alt:'Graviertes Edelstahl-Namensschild mit der Aufschrift Familie Mustermann auf dunklem Untergrund',caption:'Produktbeispiel: Edelstahl-Namensschild mit individueller Gravur.'},
 {key:'klingel',source:picks[1].src,alt:'Quadratische Klingelplatte aus Edelstahl und Acryl mit graviertem Familiennamen und beleuchtetem Taster',caption:'Produktbeispiel: Edelstahl und Acryl mit Beschriftung. Abgebildeter Taster dient der Veranschaulichung.'},
 {key:'platte',source:picks[4].src,alt:'Längliche Edelstahl-Klingelplatte mit Hausnummer 21, Familienname und Leuchtturm-Motiv',caption:'Produktbeispiel: zugeschnittene Edelstahlplatte mit Gravur und Ausschnitt für einen Klingeltaster.'},
 {key:'leder',source:picks[5].src,alt:'Brauner Lederanhänger mit gravierter Kompassrose, Name und Koordinaten',caption:'Produktbeispiel: Lederanhänger mit persönlicher Gravur.'},
 {key:'stein',source:picks[6].src,alt:'Schiefertafel mit graviertem Hundeporträt und Erinnerungsbeschriftung',caption:'Produktbeispiel: Foto- und Textgravur auf Schiefer.'},
 {key:'druck',source:more[0].src,alt:'Bedruckter Fotoaufsteller mit Hochzeitsbild und Namen in einem Holzsockel',caption:'Produktbeispiel: Fotoaufsteller mit farbiger Personalisierung.'},
 {key:'aufsteller',source:more[1].src,alt:'Herzförmiger Acrylaufsteller mit Familienfoto und Text auf transparentem Fuß',caption:'Produktbeispiel: bedruckter Acrylaufsteller auf einem separaten Fuß. Individuelle Formen werden nach Vorgabe abgestimmt.'},
 {key:'hausnummer',source:more[2].src,alt:'Mehrlagiges Acryl-Hausnummernschild mit der Nummer 26 und dem Straßennamen Buddeweg',caption:'Produktbeispiel: Acryl-Hausnummer mit Beschriftung und sichtbaren Befestigungspunkten.'},
]
const {getPayload}=await import('payload');const {default:config}=await import('../src/payload.config.ts');const p=await getPayload({config});const ids:Record<string,number|string>={}
for(const a of assets){const old=await p.find({collection:'media',where:{credit:{equals:a.source}},limit:1});if(old.docs[0]){ids[a.key]=old.docs[0].id;continue}const r=await fetch(a.source);if(!r.ok)throw Error('Download fehlgeschlagen');const file=`work/images/gravuru-${a.key}.webp`;await sharp(Buffer.from(await r.arrayBuffer())).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toFile(file);const m=await p.create({collection:'media',data:{alt:a.alt,caption:a.caption,credit:a.source,approved:true},filePath:file});ids[a.key]=m.id}
const mapping:Record<string,string>={
 'edelstahl-stahl-laserschneiden':'platte','acrylglas-schneiden':'hausnummer','acrylglas-biegen':'aufsteller','lasergravur':'schild','metallgravur':'schild','glas-steingravur':'stein','uv-direktdruck':'druck','leder-papier-pappe':'leder','werkzeug-inventarkennzeichnung':'schild','lohnfertigung':'platte',
 'haus-garten':'hausnummer','elektriker':'klingel','kommunen':'schild','werbetechnik':'hausnummer','druckereien':'druck','agenturen-werbemittel':'druck','laden-messebau':'aufsteller','tuerbau-sicherheitstechnik':'klingel','metallbau-geraetehersteller':'platte','marken-wiederverkaeufer':'druck','lederwerkstaetten':'leder','hotels-gastronomie':'schild','einzelhandel':'aufsteller','hausverwaltungen':'klingel','vereine-veranstalter':'leder',
 'klingelplatten':'klingel','hausnummern':'hausnummer','firmenschilder':'schild','acrylaufsteller':'aufsteller','personalisierte-produkte':'druck'}
const pages=await p.find({collection:'pages',limit:100,depth:0});for(const page of pages.docs){const key=mapping[page.slug];if(key&&!page.image)await p.update({collection:'pages',id:page.id,data:{image:ids[key]}})}
await p.updateGlobal({slug:'website',data:{heroImage:ids.klingel,showcaseImages:[ids.schild,ids.hausnummer,ids.druck]}})
fs.writeFileSync('BILDQUELLEN.md','# Verwendete Produktbilder\n\nDie Bilder stammen aus dem bestehenden Gravuru-Shop. Sie werden als Produktbeispiele verwendet, nicht als Fotos der Fertigungsprozesse oder als Nachweis bestimmter Kundenaufträge. Alle Bilder sind in der Verwaltung austauschbar.\n\n'+assets.map(a=>`## ${a.key}\n\n${a.alt}\n\n${a.caption}\n\nQuelle: ${a.source}`).join('\n\n'))
console.log(`${assets.length} Bilder importiert; ${Object.keys(mapping).length} Seiten zugeordnet. Vorhandene Seitenbilder wurden beibehalten.`);await p.destroy()
