// Nur für lokale Entwicklung: spiegelt ÖFFENTLICH lesbare Inhalte (Seiten, freigegebene Bilder,
// Website-/Seitentexte) von gravuru-manufaktur.de in die lokale Datenbank. Keine Anfragen,
// Anlagen, Benutzer oder privaten Daten. Bricht ab, wenn SITE_PUBLIC=true gesetzt ist.
export {}
if (process.env.SITE_PUBLIC === 'true') { console.error('Abbruch: nur für lokale Vorschau.'); process.exit(1) }
const source = process.env.MIRROR_SOURCE || 'https://gravuru-manufaktur.de'
const {getPayload} = await import('payload')
const {default: config} = await import('../src/payload.config.ts')
const fs = await import('node:fs/promises')
const path = await import('node:path')
const os = await import('node:os')
const payload = await getPayload({config})
const get = async (p: string) => { const r = await fetch(source + p); if (!r.ok) throw Error(p + ' → ' + r.status); return r.json() }
const strip = (doc: any) => { const {id, createdAt, updatedAt, ...rest} = doc; return rest }
const clean = (v: any): any => Array.isArray(v) ? v.map(clean) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'id').map(([k, x]) => [k, clean(x)])) : v
try {
  if ((await payload.count({collection: 'pages', overrideAccess: true})).totalDocs) { console.log('Lokale Seiten existieren bereits – nichts geändert.'); process.exit(0) }
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'mirror-'))
  const media = (await get('/api/media?limit=500&depth=0')).docs as any[]
  const mediaIds = new Map<number, number | string>()
  for (const m of media) {
    const file = path.join(tmp, m.filename)
    const r = await fetch(source + '/api/media/file/' + encodeURIComponent(m.filename))
    if (!r.ok) { console.warn('Bild fehlt:', m.filename); continue }
    await fs.writeFile(file, Buffer.from(await r.arrayBuffer()))
    const doc = await payload.create({collection: 'media', data: {alt: m.alt, caption: m.caption, credit: m.credit, approved: Boolean(m.approved)}, filePath: file, overrideAccess: true})
    mediaIds.set(m.id, doc.id)
  }
  const pages = (await get('/api/pages?limit=500&depth=0')).docs as any[]
  const pageIds = new Map<number, number | string>()
  for (const p of pages.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))) {
    const {related, image, ...rest} = strip(p)
    const doc = await payload.create({collection: 'pages', data: {...clean(rest), image: image ? mediaIds.get(image) : undefined, _status: 'published'}, overrideAccess: true})
    pageIds.set(p.id, doc.id)
  }
  for (const p of pages) if (p.related?.length) await payload.update({collection: 'pages', id: pageIds.get(p.id)!, data: {related: p.related.map((id: number) => pageIds.get(id)).filter(Boolean)}, overrideAccess: true})
  const website = strip(await get('/api/globals/website?depth=0'))
  const mapMedia = (v: any) => (v == null ? v : mediaIds.get(typeof v === 'object' ? v.id : v))
  await payload.updateGlobal({slug: 'website', overrideAccess: true, data: {...clean(website), heroImage: mapMedia(website.heroImage), logo: mapMedia(website.logo), showcaseImages: (website.showcaseImages || []).map(mapMedia).filter(Boolean)}})
  const copy = strip(await get('/api/globals/layout-content'))
  await payload.updateGlobal({slug: 'layout-content', overrideAccess: true, data: clean(copy)})
  console.log(`Gespiegelt: ${mediaIds.size} Bilder, ${pageIds.size} Seiten, 2 Globale (Quelle ${source}).`)
} finally { await payload.destroy() }
process.exit(0)
