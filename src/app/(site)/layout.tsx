import {draftMode} from 'next/headers'
import type {Metadata,Viewport} from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Icon from '@/components/Icon'
import BusinessSchema from '@/components/BusinessSchema'
import {getSettings,getCopy,publicSite,origin} from '@/lib/content'
import './styles.css'
export const dynamic='force-dynamic'
export const metadata:Metadata={metadataBase:new URL(origin),title:{default:'Gravuru Manufaktur | Laserschneiden, Gravur & UV-Druck in Bielefeld',template:'%s | Gravuru Manufaktur'},description:'Individuelle Zuschnitte, Lasergravur, UV-Direktdruck und Acrylbiegen in Bielefeld. Für Privatkunden, Unternehmen und öffentliche Einrichtungen.',robots:{index:publicSite,follow:publicSite},icons:{icon:'/gravuru-logo.svg'}}
export const viewport:Viewport={themeColor:'#15211c'}
export default async function Layout({children}:{children:React.ReactNode}){
 const [s,c]=await Promise.all([getSettings(),getCopy()]);const draft=(await draftMode()).isEnabled
 const links=s.navigation?.length?s.navigation:[{label:'Leistungen',href:'/leistungen'},{label:'Für wen',href:'/fuer-wen'},{label:'Produkte',href:'/produkte'},{label:'Über Gravuru',href:'/ueber-uns'}]
 const logo=typeof s.logo==='object'&&s.logo?.approved?s.logo.url:undefined
 return <html lang="de"><head>
  <link rel="preload" href="/fonts/fraunces-latin-standard-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
  <link rel="preload" href="/fonts/manrope-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
 </head><body>
  <a href="#inhalt" className="skip">Zum Inhalt</a>
  {!publicSite&&<aside className="preview-bar">Lokale Vorschau · noch nicht veröffentlicht <span><Link href="/materialverwaltung">Materialverwaltung ↗</Link> · <Link href="/admin">Inhalte bearbeiten ↗</Link></span></aside>}
  {draft&&<aside className="preview-bar">Entwurfsvorschau <a href="/vorschau?exit=1">Vorschau beenden</a></aside>}
  <Header links={links} logo={logo||undefined}/>
  <main id="inhalt">{children}</main>
  <footer className="footer"><div className="container">
   <div className="footer-top">
    <div className="footer-brand"><Link href="/" className="brand" aria-label="Gravuru Manufaktur – Startseite"><img src={logo||'/gravuru-logo.svg'} alt="Gravuru" width="137" height="40"/></Link><p>{c.footerText}</p><Link href="/konfigurator" className="button button-mint">Jetzt gestalten <Icon name="arrow" size={18}/></Link></div>
    <div className="footer-grid">
     <div><h2>Entdecken</h2><Link href="/leistungen">Leistungen</Link><Link href="/fuer-wen">Für wen wir fertigen</Link><Link href="/produkte">Produkte</Link><Link href="/referenzen">Referenzen</Link></div>
     <div><h2>Gravuru</h2><Link href="/ueber-uns">Über uns</Link><Link href="/konfigurator">Konfigurator</Link><Link href="/kontakt">Kontakt &amp; Beratung</Link><a href="https://gravuru.de/">Zum Gravuru-Shop ↗</a></div>
     <div><h2>Standort</h2><p className="footer-line"><Icon name="pin" size={18}/><span>{s.street}<br/>{s.postcode?`${s.postcode} `:''}{s.city}</span></p>{s.email&&<a className="footer-line" href={`mailto:${s.email}`}><Icon name="mail" size={18}/>{s.email}</a>}{s.phone&&<a className="footer-line" href={`tel:${s.phone.replace(/[^+0-9]/g,'')}`}><Icon name="phone" size={18}/>{s.phone}</a>}{s.contactNote&&<p>{s.contactNote}</p>}</div>
    </div>
   </div>
   <div className="footer-bottom"><span>© {new Date().getFullYear()} {s.brand||'Gravuru'} · Manufaktur · Bielefeld</span><div><Link href="/impressum">Impressum</Link><Link href="/datenschutz">Datenschutz</Link></div></div>
  </div></footer>
  <BusinessSchema/>
 </body></html>
}
