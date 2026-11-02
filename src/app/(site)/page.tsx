import ProductImage from '@/components/ProductImage'
import Link from 'next/link'
import Icon from '@/components/Icon'
import {getPages,getSettings,pagePath,getCopy} from '@/lib/content'
import {Arrow,CTA,Process} from '@/components/Shared'
import {regionalMetadata} from '@/lib/seo'
import {configuratorServices} from '@/content/services'
export async function generateMetadata(){const settings=await getSettings();return regionalMetadata('Schilder, Klingelplatten & Gravur in Bielefeld','Individuelle Schilder, Klingelplatten, Hausnummern und personalisierte Produkte aus Bielefeld. Selbst gestalten – auch Sonderanfertigungen – und unverbindlich bei Gravuru anfragen.','/',settings.heroImage)}
const lines=(t:string)=>t.split('\n')
export default async function Home(){
 const [s,pages,c]=await Promise.all([getSettings(),getPages(),getCopy()]);const services=pages.filter(p=>p.kind==='leistung')
 const headline=lines(s.headline||'Ihre Idee.\nPassend gefertigt.')
 return <>
  <section className="hero"><div className="container hero-grid">
   <div className="hero-copy">
    <p className="eyebrow">Gravuru Manufaktur · Bielefeld</p>
    <h1>{headline.map((line:string,i:number)=><span key={i} className={i>0?'accent':''}>{line}</span>)}</h1>
    <p className="hero-intro">{s.intro}</p>
    <div className="actions"><Link className="button" href="/konfigurator">Jetzt selbst gestalten <Arrow/></Link><Link className="button button-secondary" href="/kontakt">Beratung &amp; Anfrage</Link></div>
    <ul className="hero-facts" aria-label="Auf einen Blick"><li><Icon name="check" size={18}/>Auch Einzelstücke</li><li><Icon name="check" size={18}/>Sonderanfertigungen selbst gestalten</li><li><Icon name="check" size={18}/>Unverbindliche Anfrage</li></ul>
   </div>
   <div className="hero-product"><ProductImage value={s.heroImage} hero/><div className="hero-badge"><Icon name="pin" size={20}/><span><strong>Gefertigt in Bielefeld</strong><small>Für Privatkunden und Firmen in OWL</small></span></div></div>
  </div></section>
  <section className="chooser-section" aria-labelledby="chooser-title"><div className="container">
   <div className="section-heading split"><div><p className="eyebrow">{c.finderLabel}</p><h2 id="chooser-title">{c.finderTitle}</h2></div><p className="section-intro">Wählen Sie Ihr Vorhaben und gestalten Sie direkt im Konfigurator – Maße, Material, Texte, Motive und Fotos. Wir prüfen Ihren Entwurf und melden uns mit einem Angebot.</p></div>
   <div className="chooser">{configuratorServices.map(x=><Link key={x.key} href={x.href} className={'chooser-card chooser-'+x.key}><span className="chooser-icon"><Icon name={x.icon} size={28}/></span><h3>{x.title}</h3><p>{x.text}</p><span className="chooser-go">Starten <Arrow/></span></Link>)}</div>
  </div></section>
  <section className="audience-strip"><div className="container audience-grid">{c.audienceItems.map(({title,text,href},n)=><Link href={href} key={n}><span className="audience-no">{String(n+1).padStart(2,'0')}</span><div><h2>{title}</h2><p>{text}</p></div><Arrow/></Link>)}</div></section>
  <section className="section"><div className="container">
   <div className="section-heading split"><div><p className="eyebrow">{c.serviceLabel}</p><h2>{c.serviceTitle}</h2></div><Link className="text-link" href="/leistungen">Alle Leistungen <Arrow/></Link></div>
   <div className="home-service-gallery">{services.filter(p=>['edelstahl-stahl-laserschneiden','acrylglas-schneiden','lasergravur','uv-direktdruck'].includes(p.slug)).map(p=><Link href={pagePath(p)} className="home-service-card" key={p.id}><ProductImage value={p.image} compact/><div className="home-service-body"><h3>{p.label}</h3><p>{p.intro}</p><span className="text-link">Mehr erfahren <Arrow/></span></div></Link>)}</div>
  </div></section>
  <Process/>
  <section className="combination"><div className="container combination-grid"><div><p className="eyebrow">{c.combinationLabel}</p><h2>{c.combinationTitle}</h2><p>{c.combinationText}</p><Link href="/konfigurator?bearbeitung=sonder" className="button button-mint">Kombination selbst gestalten <Arrow/></Link></div><div className="combination-index">{c.combinationSteps.map(({title,text},n)=><div key={n}><span>{String(n+1).padStart(2,'0')}</span><h3>{title}</h3><p>{text}</p></div>)}</div></div></section>
  <section className="region section"><div className="container region-grid"><div><p className="eyebrow">{c.regionLabel}</p><h2>{c.regionTitle}</h2></div><div><p className="large-text">{c.regionIntro}</p><p>{c.regionText}</p><div className="region-contact"><span><Icon name="pin" size={20}/>{s.street}, {s.postcode?`${s.postcode} `:''}{s.city}</span>{s.phone&&<a href={`tel:${s.phone.replace(/[^+0-9]/g,'')}`}><Icon name="phone" size={20}/>{s.phone}</a>}</div><Link className="text-link" href="/ueber-uns">Gravuru kennenlernen <Arrow/></Link></div></div></section>
  <CTA/>
 </>
}
