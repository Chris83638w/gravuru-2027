import {cms,publicSite} from '@/lib/content'
import {headers} from 'next/headers'
import {redirect} from 'next/navigation'
import {readPreparedDesign} from '@/lib/prepared-design'
import Configurator from '@/components/Configurator'
export const metadata={title:'Ihr Produkt gestalten',robots:{index:false,follow:false},referrer:'no-referrer' as const}
export default async function Page({searchParams}:{searchParams:Promise<{material?:string;bearbeitung?:string;link?:string;anfrage?:string;vorbereiten?:string}>}){
 const q=await searchParams,p=await cms(),{user}=await p.auth({headers:await headers()})
 if(q.vorbereiten==='1'&&!user)redirect('/admin/login')
 let linked:any
 try{if(q.link)linked=await readPreparedDesign(q.link)}catch{return <section className="container section"><h1>Dieser Gestaltungslink ist nicht mehr gültig.</h1><p>Damit Ihre Sonderanfertigung richtig zugeordnet bleibt, benötigen Sie einen neuen persönlichen Link. Nennen Sie uns dabei gern Ihre Vorgangsnummer.</p><div className="actions"><a className="button" href="mailto:info@gravuru.de?subject=Neuer%20Gestaltungslink">Neuen Link per E-Mail anfordern</a><a className="text-link" href="/kontakt?leistung=Sonderanfertigung">Kontaktformular öffnen</a></div></section>}
 let stored:any,reference=linked?.reference
 if(q.anfrage&&user){const enquiry=await p.findByID({collection:'enquiries',id:q.anfrage,overrideAccess:false,user}).catch(()=>null);stored=enquiry?.configuration;reference=enquiry?.reference||reference}
 const prepared=stored||linked?.configuration
 return <Configurator initial={{material:prepared?.material||linked?.material||(q.material==='acryl'||(q.bearbeitung==='druck'&&q.material!=='edelstahl')?'acryl':'edelstahl'),method:prepared?.method||linked?.method||(q.bearbeitung==='druck'?'druck':q.bearbeitung==='zuschnitt'?'zuschnitt':'gravur'),purpose:prepared?.purpose||(q.vorbereiten==='1'?'anfrage':'gestaltung'),geometry:prepared?.geometry||linked?.geometry,design:prepared?.design,quantity:prepared?.quantity,repeat:prepared?.repeat,prepared:Boolean(linked?.configuration),staffPreparation:q.vorbereiten==='1',reference,token:q.link}} templates={[]} preview={!publicSite} staff={Boolean(user)}/>
}
