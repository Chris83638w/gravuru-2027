export {}
const {getPayload}=await import('payload')
const {default:config}=await import('../src/payload.config.ts')
const {catalog}=await import('../src/content/catalog.ts')
const {seoContent}=await import('../src/content/seo.ts')
const payload=await getPayload({config})
const existing=await payload.find({collection:'pages',limit:100,overrideAccess:true})
if(existing.totalDocs){console.log('Inhalte existieren bereits; keine Änderungen vorgenommen.');process.exit(0)}
const ids=new Map<string,number|string>()
for(const page of catalog){const {related,...rest}=page;const doc=await payload.create({collection:'pages',data:{...rest,...seoContent[page.slug],_status:'published'},overrideAccess:true});ids.set(page.slug,doc.id)}
for(const page of catalog)await payload.update({collection:'pages',id:ids.get(page.slug)!,data:{related:page.related.map(s=>ids.get(s)).filter(Boolean)},overrideAccess:true})
await payload.updateGlobal({slug:'website',overrideAccess:true,data:{navigation:[{label:'Leistungen',href:'/leistungen'},{label:'Für wen',href:'/fuer-wen'},{label:'Produkte',href:'/produkte'},{label:'Über Gravuru',href:'/ueber-uns'}]}})
console.log(`${catalog.length} Seiten angelegt. Keine Benutzer, Preise oder Referenzen erfunden.`)
process.exit(0)
