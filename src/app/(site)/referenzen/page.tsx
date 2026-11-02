import {getCopy} from '@/lib/content'
import Link from 'next/link'
import {getReferences} from '@/lib/content'
import {Crumb,CTA} from '@/components/Shared'
import {regionalMetadata} from '@/lib/seo'
import ProductImage from '@/components/ProductImage'
export const metadata=regionalMetadata('Referenzen & Fertigungsbeispiele aus Bielefeld','Einblicke in Zuschnitt, Gravur und Druck bei Gravuru in Bielefeld. Entdecken Sie Leistungen und Anwendungen für Ihr eigenes Vorhaben in OWL.','/referenzen')
export default async function References(){const c=await getCopy();const refs=await getReferences();return <><section className="listing-head"><div className="container"><Crumb label="Referenzen"/><p className="eyebrow">Einblicke in die Fertigung</p><h1>{c.referencesTitle}</h1><p className="large-text">{c.referencesIntro}</p></div></section><section className="section container">{refs.length?<div className="card-grid">{refs.map(r=><article className="application-card" key={r.id}><ProductImage value={r.image} compact/><h2>{r.title}</h2><p>{r.summary}</p><small>{r.material}</small></article>)}</div>:<div className="empty"><p className="eyebrow">Projekteinblicke folgen</p><h2>Ihr Vorhaben kann schon beginnen.</h2><p>Eine Auswahl freigegebener Projektbilder wird hier ergänzt. Unsere Leistungen und Anwendungen können Sie bereits kennenlernen.</p><Link className="text-link" href="/leistungen">Leistungen entdecken →</Link></div>}</section><CTA/></>}
