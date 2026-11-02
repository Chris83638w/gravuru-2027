import {getCopy} from '@/lib/content'
import {getSettings} from '@/lib/content'
import {Crumb,CTA,Process} from '@/components/Shared'
import {regionalMetadata} from '@/lib/seo'
export const metadata=regionalMetadata('Über Gravuru – Fertigung in Bielefeld','Gravuru verbindet Laserschneiden, Lasergravur, UV-Direktdruck und Acrylbiegen in Bielefeld. Lernen Sie unsere Manufaktur für Projekte in OWL kennen.','/ueber-uns')
export default async function About(){const c=await getCopy();const s=await getSettings();return <><section className="listing-head"><div className="container"><Crumb label="Über Gravuru"/><p className="eyebrow">DIE MANUFAKTUR IN BIELEFELD</p><h1>{c.aboutTitle}</h1><p className="large-text">{s.about}</p></div></section><section className="section container detail-body"><div><p className="eyebrow">WAS UNSERE ARBEIT VERBINDET</p><h2>{c.aboutSectionTitle}</h2></div><div><p className="large-text">{c.aboutIntro}</p><p>{c.aboutText}</p><div className="notice"><strong>Unser Standort</strong><p>{s.street}<br/>{s.postcode?`${s.postcode} `:''}{s.city}</p>{s.contactNote&&<p>{s.contactNote}</p>}</div></div></section><Process/><CTA/></>}
