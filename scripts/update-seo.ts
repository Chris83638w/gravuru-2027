import {copyFileSync,mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {seoContent} from '../src/content/seo.ts'
import {catalog,pathFor} from '../src/content/catalog.ts'
assert.equal(Object.keys(seoContent).length,catalog.length)
assert.equal(new Set(Object.values(seoContent).map(c=>c.seoTitle)).size,catalog.length)
assert.equal(new Set(Object.values(seoContent).map(c=>c.seoDescription)).size,catalog.length)
const stamp=new Date().toISOString().replace(/[:.]/g,'-')
const backup=path.resolve('data/backups',stamp)
mkdirSync(backup,{recursive:true})
copyFileSync('data/gravuru.db',path.join(backup,'gravuru.db'))
const {getPayload}=await import('payload')
const {default:config}=await import('../src/payload.config.ts')
const p=await getPayload({config})
const pages=await p.find({collection:'pages',limit:100,depth:0})
writeFileSync(path.join(backup,'pages.json'),JSON.stringify(pages.docs,null,2))
for(const page of catalog){
 const existing=pages.docs.find(d=>d.slug===page.slug)
 assert.ok(existing,`Fehlende Seite ${page.slug}`)
 const data=seoContent[page.slug]
 assert.ok(data&&data.sections.length>=3&&data.faqs.length>=2)
 await p.update({collection:'pages',id:existing.id,data})
}
await p.updateGlobal({slug:'website',data:{headline:'Zuschnitt. Gravur. Druck.\nNach Ihren Vorgaben.',intro:'Individuelle Metall- und Acrylteile, klare Beschriftungen und farbige Drucke. Gefertigt in Bielefeld für Handwerk, Unternehmen und Ihre eigenen Projekte.'}})
await p.updateGlobal({slug:'layout-content',data:{regionTitle:'Fertigung in Bielefeld.\nAnfragen aus ganz OWL.',regionIntro:'Für Privatkunden, Handwerksbetriebe, Unternehmen und öffentliche Einrichtungen in Bielefeld, Gütersloh und der Region.',regionText:'Ob ein passender Zuschnitt für den Hausbau, beschriftete Werkzeuge für den Betrieb oder Schilder für eine Einrichtung: Senden Sie uns Ihre Maße und Vorlagen. Wir stimmen Material, Bearbeitung und Übergabe passend zum Projekt ab.',serviceTitle:'Was soll aus Ihrem\nMaterial werden?',combinationTitle:'Zuschnitt, Gravur und Druck.\nFür ein stimmiges Ergebnis.'}})
const report=['# Inhalte der 30 Landingpages','Stand: 27. September 2026. Redaktionell überarbeitete Texte für die lokale Manufaktur-Website. Suchthemen sind aus dem vereinbarten Angebot abgeleitet; keine gemessenen Suchvolumina oder Rankingzusagen. Alle Texte bleiben im CMS bearbeitbar.','']
for(const page of catalog){const c=seoContent[page.slug];report.push(`## ${page.label}`,`Adresse: ${pathFor(page)}`,`Suchmaschinentitel: ${c.seoTitle}`,`Beschreibung: ${c.seoDescription}`,`### ${c.title}`,page.intro,page.body,...c.sections.flatMap(s=>[`#### ${s.title}`,s.text]),'#### Anwendungen',...page.applications.map(a=>`- **${a.title}:** ${a.text}`),'#### Angaben zur Anfrage',...c.requestChecklist.map(x=>`- ${x.item}`),'#### Häufige Fragen',...c.faqs.flatMap(f=>[`**${f.question}**`,f.answer]),'')}
writeFileSync('SEO-TEXTE.md',report.join('\n\n'))
console.log(`${catalog.length} Landingpages aktualisiert. Sicherung unter data/backups/${stamp}.`)
await p.destroy()
