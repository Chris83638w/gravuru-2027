import fs from 'node:fs'
import path from 'node:path'
import {DatabaseSync} from 'node:sqlite'

const names={
 'gravuru-schild':'edelstahl-namensschild-lasergravur-gravuru-bielefeld',
 'gravuru-klingel':'klingelplatte-edelstahl-acryl-gravuru-bielefeld',
 'gravuru-platte':'edelstahl-klingelplatte-hausnummer-leuchtturm-gravuru-bielefeld',
 'gravuru-leder':'lederanhaenger-kompass-lasergravur-gravuru-bielefeld',
 'gravuru-stein':'schiefer-hundeportraet-fotogravur-gravuru-bielefeld',
 'gravuru-druck':'fotoaufsteller-hochzeitsmotiv-uv-druck-gravuru-bielefeld',
 'gravuru-aufsteller':'acryl-herz-fotoaufsteller-uv-druck-gravuru-bielefeld',
 'gravuru-hausnummer':'acryl-hausnummernschild-gravuru-bielefeld',
 'serienzuschnitt':'edelstahl-serienzuschnitt-langloch-illustration-gravuru-bielefeld',
 'serienmarkierung':'metallschilder-seriennummern-gravur-illustration-gravuru-bielefeld',
 'acryl-serienzuschnitt':'acrylglas-serienzuschnitt-bohrungen-illustration-gravuru-bielefeld',
 'materialmuster':'acryl-schiefer-leder-edelstahl-materialmuster-illustration-gravuru-bielefeld',
 'serienzuschnitt-1':'edelstahl-serienzuschnitt-bohrungen-illustration-gravuru-bielefeld',
 'druckschild':'acrylschild-uv-direktdruck-illustration-gravuru-bielefeld',
 'bauteilmarkierung':'metallbauteil-seriennummer-lasergravur-illustration-gravuru-bielefeld',
 'acrylzuschnitt':'acrylglas-zuschnitt-formen-illustration-gravuru-bielefeld',
 'masspruefung':'metallzuschnitt-masspruefung-illustration-gravuru-bielefeld',
}
const titles={12:'Klingelplatten & Werkzeuggravur für Elektriker in Bielefeld',13:'Kommunale Schilder & Inventarkennzeichnung in Bielefeld',15:'Laserzuschnitt für Druckereien in Bielefeld',16:'Werbemittel & Personalisierung für Agenturen in Bielefeld',17:'Acrylzuschnitt für Laden- & Messebau in Bielefeld',18:'Eingangsplatten für Türbau in Bielefeld',19:'Laserzuschnitt für Metallbau in Bielefeld',20:'Fertigung für Marken & Wiederverkäufer in Bielefeld',21:'Lederlabels & Laserzuschnitt in Bielefeld',22:'Schilder für Hotels & Gastronomie in Bielefeld',23:'Aufsteller & Halter für Einzelhandel in Bielefeld',24:'Klingel- & Namensschilder für Hausverwaltungen in Bielefeld',26:'Klingelplatten aus Edelstahl & Acryl in Bielefeld'}
const descriptions={17:'Acrylzuschnitte, Displayteile und Schilder für Laden- und Messebau in Bielefeld und OWL. Zuschnitt, Biegung und Beschriftung bei Gravuru anfragen.',18:'Eingangsplatten aus Edelstahl und Acryl für Türbau und Sicherheitstechnik in Bielefeld. Ausschnitte, Maße und Beschriftung mit Gravuru abstimmen.',20:'Fertigung in Bielefeld für Marken, Onlineshops und Wiederverkäufer: Zuschnitt, Gravur, UV-Druck und Personalisierung nach abgestimmter Vorlage.'}
const root=process.cwd(),db=new DatabaseSync(path.join(root,'data/gravuru.db'))
db.exec('PRAGMA busy_timeout=10000')
const media=db.prepare('SELECT * FROM media').all(),columns=db.prepare('PRAGMA table_info(media)').all().map(c=>c.name),changes=[]
for(const m of media){
 const stem=path.parse(m.filename).name,target=names[stem]
 if(!target){if(/-gravuru-bielefeld$/.test(stem))continue;throw Error('Unbekanntes Bild: '+m.id)}
 const updates={},renames=[]
 for(const col of columns.filter(c=>c==='filename'||c.endsWith('_filename'))){
  const old=m[col];if(!old)continue
  if(!old.startsWith(stem))throw Error('Unerwartete Bildvariante: '+m.id)
  const next=target+old.slice(stem.length),oldPath=path.join(root,'media/public',old),nextPath=path.join(root,'media/public',next)
  if(!fs.existsSync(oldPath))throw Error('Bilddatei fehlt: '+m.id)
  if(!fs.existsSync(nextPath))fs.copyFileSync(oldPath,nextPath)
  updates[col]=next;renames.push([old,next])
 }
 for(const col of columns.filter(c=>c==='url'||c.endsWith('_url')||c==='thumbnail_u_r_l')){
  if(!m[col])continue
  updates[col]=renames.reduce((url,[old,next])=>url.replace(encodeURIComponent(old),encodeURIComponent(next)).replace(old,next),m[col])
 }
 if(/KI-generiert/.test(m.caption||'')&&!/Illustration|KI-/.test(m.alt||''))updates.alt='KI-Illustration: '+m.alt
 changes.push({id:m.id,updates,old:m.filename,next:updates.filename})
}
db.exec('BEGIN IMMEDIATE')
try{
 for(const {id,updates} of changes){const keys=Object.keys(updates);db.prepare('UPDATE media SET '+keys.map(k=>k+'=?').join(',')+',updated_at=? WHERE id=?').run(...keys.map(k=>updates[k]),new Date().toISOString(),id)}
 for(const p of db.prepare('SELECT * FROM pages').all()){
  const title=titles[p.id]||p.seo_title||p.label+' in Bielefeld',description=descriptions[p.id]||p.seo_description,heading=/Bielefeld/i.test(p.title)?p.title:p.label+' in Bielefeld',now=new Date().toISOString()
  if(!/Bielefeld/i.test(title)||!/Bielefeld/i.test(description))throw Error('Regionalbezug fehlt: '+p.id)
  db.prepare('UPDATE pages SET seo_title=?,seo_description=?,title=?,updated_at=? WHERE id=?').run(title,description,heading,now,p.id)
  db.prepare('UPDATE _pages_v SET version_seo_title=?,version_seo_description=?,version_title=?,version_updated_at=?,updated_at=? WHERE parent_id=? AND latest=1').run(title,description,heading,now,now,p.id)
 }
 db.exec('COMMIT')
}catch(e){db.exec('ROLLBACK');throw e}finally{db.close()}
fs.mkdirSync(path.join(root,'work'),{recursive:true})
fs.writeFileSync(path.join(root,'work/regional-seo-image-map.json'),JSON.stringify(changes.map(({id,old,next})=>({id,old,next})),null,2))
console.log(JSON.stringify({optimisedImages:changes.length,pages:30,legacyImageURLs:'preserved'}))
