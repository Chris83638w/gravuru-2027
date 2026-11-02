import {getSettings} from '@/lib/content'
import {Crumb} from '@/components/Shared'
export const metadata={title:'Impressum',robots:{index:false,follow:false}}
export default async function Page(){const s=await getSettings();return <section className="section container"><Crumb label="Impressum"/><div className="prose"><h1>Impressum</h1>{s.imprint?<p>{s.imprint}</p>:<div className="notice"><h2>Angaben vor Veröffentlichung ergänzen</h2><p>Diese Website ist eine lokale Vorschau. Das vollständige Impressum ist noch nicht hinterlegt. Unternehmens- und Vertretungsangaben werden vor einer Veröffentlichung geprüft und ergänzt.</p></div>}</div></section>}
