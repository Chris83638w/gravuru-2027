import {getSettings,origin} from '@/lib/content'
export default async function BusinessSchema(){
 const s=await getSettings()
 const phone=s.phone?.replace(/[^+0-9]/g,'').replace(/^0/,'+49')
 const image=typeof s.heroImage==='object'&&s.heroImage?.approved&&s.heroImage?.url?new URL(s.heroImage.url,origin).href:undefined
 const data={'@context':'https://schema.org','@type':'LocalBusiness','@id':origin+'/#betrieb',name:'Gravuru Manufaktur',legalName:s.legalName||'gravuru GmbH',description:'Laserschneiden, Lasergravur, UV-Direktdruck und Acrylbiegen in Bielefeld für Privatkunden, Handwerk und Unternehmen in OWL.',url:origin,logo:origin+'/gravuru-logo.svg',...(image?{image}:{}),areaServed:[{'@type':'City',name:'Bielefeld'},{'@type':'AdministrativeArea',name:'Ostwestfalen-Lippe'}],...(phone?{telephone:phone}:{}),...(s.email?{email:s.email}:{}),address:{'@type':'PostalAddress',streetAddress:s.street,addressLocality:s.city,...(s.postcode?{postalCode:s.postcode}:{}),addressCountry:'DE'}}
 return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}/>
}
