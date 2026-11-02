import ProductImage from '@/components/ProductImage'
import PageGuide from '@/components/PageGuide'
import {configuratorEntry} from '@/lib/configurator-entry'
import {draftMode} from 'next/headers'
import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import Link from 'next/link'
import {getPage,pagePath,origin} from '@/lib/content'
import {regionalMetadata} from '@/lib/seo'
import {Arrow,Crumb,CTA,Card} from '@/components/Shared'
type Props={params:Promise<{section:string;slug:string}>}

export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug,section}=await params
 const p=await getPage(slug)
 if(!p||pagePath(p)!==`/${section}/${slug}`)return {title:'Seite nicht gefunden',robots:{index:false,follow:false}}
 const title=p.seoTitle||p.title,description=p.seoDescription||p.intro
 return {...regionalMetadata(title,description,pagePath(p),p.image),...((await draftMode()).isEnabled?{robots:{index:false,follow:false}}:{})}
}
export default async function Page({params}:Props){
 const {slug,section}=await params
 const p=await getPage(slug)
 if(!p||pagePath(p)!==`/${section}/${slug}`)notFound()
 const parent={label:p.kind==='leistung'?'Leistungen':p.kind==='zielgruppe'?'Für wen':p.kind==='produkt'?'Produkte':'Start',href:p.kind==='seite'?'/':`/${section}`}
 const related=(p.related||[]).filter((r:any)=>typeof r==='object'&&r?._status==='published')
 const image=typeof p.image==='object'&&p.image?.approved?p.image:null
 const sections=p.sections||[]
 const entry=configuratorEntry(section,slug)
 const enquiryHref='/kontakt?leistung='+encodeURIComponent(p.label)
 const productHero=p.kind==='produkt'&&image
 const guideLinks=[{href:'#ueberblick',label:'Überblick'},...sections.map((s:any,i:number)=>({href:`#abschnitt-${i+1}`,label:s.title})),{href:'#anwendungen',label:'Anwendungen'},...(p.requestChecklist?.length?[{href:'#anfrageangaben',label:'Angaben zur Anfrage'}]:[]),...(p.faqs?.length?[{href:'#fragen',label:'Häufige Fragen'}]:[])]
 const customHref='/konfigurator?bearbeitung=sonder&thema='+encodeURIComponent(p.label)
 const actions=<div className="detail-actions">{entry&&<Link className="button" href={entry.href}>{entry.label} <Arrow/></Link>}<Link className={entry?'button button-secondary':'button'} href={customHref}>Sonderanfertigung gestalten <Arrow/></Link><p>Lieber erst sprechen? <Link href={enquiryHref}>Beratung anfragen</Link> – wir helfen bei Maßen, Material und Gestaltung.</p></div>
 const jsonld:any[]=[{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Start',item:origin},{'@type':'ListItem',position:2,name:parent.label,item:origin+parent.href},{'@type':'ListItem',position:3,name:p.label,item:origin+pagePath(p)}]}]
 if(p.kind==='leistung')jsonld.push({'@context':'https://schema.org','@type':'Service','@id':origin+pagePath(p)+'#leistung',name:p.title,description:p.intro,url:origin+pagePath(p),areaServed:[{'@type':'City',name:'Bielefeld'},{'@type':'AdministrativeArea',name:'Ostwestfalen-Lippe'}],provider:{'@id':origin+'/#betrieb'}})
 return <>
  <section className="detail-hero"><div className="container">
   <Crumb label={p.label} parent={parent}/>
   {productHero?<div className="product-detail-grid"><div className="product-detail-title"><p className="eyebrow">{p.eyebrow}</p><h1>{p.title}</h1></div><p className="large-text product-detail-intro">{p.intro}</p><ProductImage value={image} hero/>{actions}</div>:<div className="detail-head"><div><p className="eyebrow">{p.eyebrow}</p><h1>{p.title}</h1></div><div><p className="large-text">{p.intro}</p>{actions}</div></div>}
  </div></section>
  <div className="container editorial-layout">
   <PageGuide links={guideLinks} enquiryHref={enquiryHref}/>
   <article className="editorial-content">{!productHero&&<ProductImage value={image}/>}
    <section id="ueberblick" className="editorial-section"><p className="eyebrow">{parent.label} / {p.label}</p><h2>{p.label}: Ihre Möglichkeiten</h2><p className="editorial-lead">{p.body}</p></section>
    {sections.map((s:any,i:number)=><section className="editorial-section" id={`abschnitt-${i+1}`} key={s.id||i}><span className="section-number">{String(i+1).padStart(2,'0')}</span><h2>{s.title}</h2>{s.text.split(/\n\s*\n/).map((text:string,n:number)=><p key={n}>{text}</p>)}</section>)}
    <section id="anwendungen" className="editorial-section"><p className="eyebrow">Konkret eingesetzt</p><h2>Anwendungen im Überblick</h2><div className="application-list">{p.applications?.map((a:any,i:number)=><div key={a.id||i}><h3>{a.title}</h3><p>{a.text}</p></div>)}</div></section>
    {p.requestChecklist?.length>0&&<section id="anfrageangaben" className="request-panel"><p className="eyebrow">Gut vorbereitet</p><h2>Diese Angaben helfen uns weiter.</h2><p>Teilen Sie mit, was Sie schon wissen. Die übrigen Details klären wir gemeinsam.</p><ul>{p.requestChecklist.map((x:any,i:number)=><li key={x.id||i}>{x.item}</li>)}</ul><div className="actions"><Link className="button" href={customHref}>Selbst gestalten &amp; anfragen <Arrow/></Link><Link className="text-link" href={enquiryHref}>Wünsche per Nachricht mitteilen</Link></div></section>}
    {p.note&&<aside className="material-note"><strong>Gut zu wissen</strong><p>{p.note}</p></aside>}
    {p.faqs?.length>0&&<section id="fragen" className="editorial-section"><p className="eyebrow">Vor der Anfrage</p><h2>Häufige Fragen</h2><div className="faqs">{p.faqs.map((f:any,i:number)=><details key={f.id||i}><summary>{f.question}<span className="faq-icon" aria-hidden="true"/></summary><p>{f.answer}</p></details>)}</div></section>}
   </article>
  </div>
  {related.length>0&&<section className="section related-section"><div className="container"><div className="section-heading"><p className="eyebrow">Passend zu Ihrem Projekt</p><h2>Weitere Leistungen und Produkte</h2></div><div className="card-grid">{related.map((r:any)=><Card page={r} key={r.id}/>)}</div></div></section>}
  <CTA subject={p.label}/>
  {jsonld.map((data,i)=><script key={i} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}/>)}
 </>
}
