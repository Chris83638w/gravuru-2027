import assert from 'node:assert/strict'
const base='http://127.0.0.1:3087'
const response=await fetch(base+'/api/pages?limit=100&depth=1')
assert.equal(response.status,200)
const {docs:pages}=await response.json()
assert.equal(pages.length,30)
const titles=new Set(),descriptions=new Set(),links=new Set()
for(const p of pages){
 assert.ok(p.sections?.length>=3,`${p.slug}: Inhalte`)
 assert.equal(p.requestChecklist?.length,3,`${p.slug}: Anfrageangaben`)
 assert.ok(p.faqs?.length>=2,`${p.slug}: Fragen`)
 assert.ok(p.seoTitle&&p.seoDescription,`${p.slug}: Metadaten`)
 assert.ok(!titles.has(p.seoTitle),`Doppelter Titel: ${p.slug}`);titles.add(p.seoTitle)
 assert.ok(!descriptions.has(p.seoDescription),`Doppelte Beschreibung: ${p.slug}`);descriptions.add(p.seoDescription)
 const path=`/${p.kind==='leistung'?'leistungen':p.kind==='zielgruppe'?'fuer-wen':'produkte'}/${p.slug}`
 const r=await fetch(base+path);assert.equal(r.status,200,path)
 const html=await r.text()
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1,path+' H1')
 assert.ok(html.includes(`<link rel="canonical" href="${base+path}"`),path+' Canonical')
 assert.ok(html.includes('name="robots" content="noindex, nofollow"'),path+' Vorschau noindex')
 for(const section of p.sections)assert.ok(html.includes(section.title),path+' sichtbarer Inhalt')
 const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]))
 assert.ok(schemas.some(s=>s['@type']==='BreadcrumbList'),path+' Breadcrumbs')
 assert.ok(schemas.some(s=>s['@type']==='LocalBusiness'),path+' Betrieb')
 if(p.kind==='leistung')assert.ok(schemas.some(s=>s['@type']==='Service'),path+' Leistung')
 for(const [,href]of html.matchAll(/href="([^"]+)"/g)){
  if(href.startsWith('#'))assert.ok(html.includes(`id="${href.slice(1)}"`),path+' Sprungziel '+href)
  else if(href.startsWith('/')&&!href.startsWith('/_next'))links.add(href.split('?')[0])
 }
}
for(const href of links){const r=await fetch(base+href);assert.ok(r.status<400,`Interner Link ${href}: ${r.status}`)}
const home=await (await fetch(base+'/')).text()
assert.ok(home.includes('Bauteile kennzeichnen.'))
assert.ok(home.includes('Gütersloh'))
assert.equal(new URL(home.match(/<link rel="canonical" href="([^"]+)"/)[1]).href,base+'/')
console.log(`PASS: ${pages.length} vollständige Landingpages mit eindeutigen Titeln/Beschreibungen, je einer H1, Canonical, auslesbaren Inhalten und gültigen strukturierten Daten.`)
console.log(`PASS: ${links.size} interne Zieladressen sowie alle Inhaltsverzeichnis-Sprungziele geprüft.`)
console.log('PASS: Lokale Suchmaschinensperre bleibt erhalten; regionale Startseite und Startseiten-Canonical geprüft.')
