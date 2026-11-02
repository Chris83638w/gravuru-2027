'use client'
import Link from 'next/link'
import {useEffect,useId,useRef,useState} from 'react'

function contactAttachmentError(files:Iterable<Pick<File,'name'|'size'>>){
 const selected=Array.from(files).filter(file=>file.size>0)
 if(selected.length>3)return 'Bitte wählen Sie höchstens drei Dateien aus. Ihre übrigen Angaben bleiben erhalten.'
 for(const file of selected){
  if(file.size>8*1024*1024)return `„${file.name}“ ist größer als 8 MB. Bitte wählen Sie eine kleinere Datei aus.`
  if(!/\.(pdf|jpe?g|png)$/i.test(file.name))return `„${file.name}“ hat ein nicht unterstütztes Dateiformat. Bitte wählen Sie PDF, JPG oder PNG aus.`
 }
 return ''
}

export default function ContactForm({initial,services,preview,configuration,designLink}:{initial:string;services:string[];preview:boolean;configuration?:any;designLink?:string}){
 const orderDesign=configuration?.purpose==='gestaltung'
 const [differentDelivery,setDifferentDelivery]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reference,setReference]=useState('')
 const [attachmentError,setAttachmentError]=useState(''),attachmentId=useId(),attachmentInput=useRef<HTMLInputElement|null>(null)
 const submitting=useRef(false),feedback=useRef<HTMLElement|null>(null)
 useEffect(()=>{if(error||reference){feedback.current?.focus({preventScroll:true});feedback.current?.scrollIntoView({block:'center'})}},[error,reference])
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(submitting.current)return
  const invalidAttachments=contactAttachmentError(attachmentInput.current?.files||[]);setAttachmentError(invalidAttachments)
  if(invalidAttachments){const section=attachmentInput.current?.closest('details');if(section)section.open=true;attachmentInput.current?.focus();return}
  submitting.current=true;setBusy(true);setError('')
  try{const response=await fetch('/anfrage',{method:'POST',body:new FormData(e.currentTarget)}),data=await response.json().catch(()=>null);if(!response.ok||typeof data?.reference!=='string'||!data.reference)throw Error(data?.error||'Die Anfrage konnte nicht bestätigt werden. Bitte versuchen Sie es erneut oder kontaktieren Sie info@gravuru.de.');setReference(data.reference)}catch(e){setError(e instanceof TypeError?'Die Verbindung wurde unterbrochen. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es erneut.':e instanceof Error?e.message:'Bitte versuchen Sie es erneut.')}finally{submitting.current=false;setBusy(false)}
 }
 if(reference)return <section className="success" role="status" tabIndex={-1} ref={node=>{feedback.current=node}}><p className="eyebrow">{preview?'LOKAL GESPEICHERT':'ANFRAGE GESPEICHERT'}</p><h2>{orderDesign?'Ihre Gestaltung ist erfasst.':'Ihr Vorhaben ist erfasst.'}</h2><p>{orderDesign?'Ihre Vorgangsnummer:':'Ihre Anfragenummer:'}</p><strong>{reference}</strong><p>{preview?'Diese Anfrage wurde ausschließlich in der lokalen Vorschau gespeichert. Es wurde keine E-Mail versandt. Sie ist in der Verwaltung unter „Projektanfragen“ sichtbar.':'Ihre Angaben wurden gespeichert. Bitte bewahren Sie die Anfragenummer auf.'}</p><button className="button" onClick={()=>setReference('')}>{orderDesign?'Weitere Gestaltung':'Weitere Anfrage'}</button></section>
 return <form className="form-panel" aria-busy={busy} onSubmit={submit} onInvalidCapture={e=>{let parent=(e.target as HTMLElement).parentElement;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement}}}>
  {configuration&&<input type="hidden" name="configuration" value={JSON.stringify(configuration)}/>}
  <input type="hidden" name="designLink" value={designLink||''}/>
  <h2>{orderDesign?'Gestaltung übermitteln':configuration?'Ihre Anfrage':'Beschreiben Sie Ihr Vorhaben.'}</h2>
  <p>{orderDesign?'Ordnen Sie Ihren Entwurf Ihrer Bestellung zu.':'Wir prüfen Ihr Vorhaben und melden uns bei Ihnen.'} Pflichtfelder sind mit * gekennzeichnet.</p>
  {preview&&<p className="form-note">Vorschau: Angaben werden lokal gespeichert. Es wird noch keine Anfrage per E-Mail versandt.</p>}
  {error&&<div className="error" role="alert" tabIndex={-1} ref={node=>{feedback.current=node}}>{error}</div>}
  <div className="hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
  <fieldset><legend>{orderDesign?'Ihre Bestellung und Kontaktdaten':'Ihre Kontaktdaten'}</legend><div className="form-grid">
   {orderDesign&&<label className="full">Bestellnummer *<input name="orderNumber" required maxLength={120} autoComplete="off" placeholder="Bestellnummer aus Ihrer Bestätigung"/></label>}
   <label>{orderDesign?'Nachname *':'Name *'}<input name="name" autoComplete={orderDesign?'family-name':'name'} required maxLength={160}/></label>
   {orderDesign&&<label>Vorname *<input name="firstName" autoComplete="given-name" required maxLength={160}/></label>}
   <label>E-Mail *<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
   {!orderDesign&&<label className="full">Telefon <span>(optional, für Rückfragen)</span><input name="phone" type="tel" autoComplete="tel" maxLength={80}/></label>}
   {!configuration&&<label className="full">Vorhaben / Leistung<select name="service" defaultValue={initial||'Noch unsicher'}>{Array.from(new Set(['Noch unsicher',...(initial?[initial]:[]),...services])).map(s=><option key={s}>{s}</option>)}</select></label>}
   {configuration&&<input type="hidden" name="service" value={initial}/>}
   <label className="full">{configuration?'Ihre Nachricht (optional)':'Was möchten Sie fertigen lassen? *'}<textarea required={!configuration} name="message" maxLength={6000} placeholder={configuration?'Gibt es noch etwas, das wir berücksichtigen sollen?':'Beschreiben Sie kurz Ihr Vorhaben.'}/></label>
  </div></fieldset>
  {!orderDesign&&<details className="form-extra"><summary>Für Unternehmen · weitere Angaben (optional)</summary><div className="form-grid"><label className="full">Unternehmen / Einrichtung<input name="company" autoComplete="organization" maxLength={200}/></label></div></details>}
  {!orderDesign&&<details className="form-extra"><summary>Termin, Dateien &amp; weitere Wünsche (optional)</summary><div className="form-grid">
   {!configuration&&<><label>Material <span>(falls bekannt)</span><input name="material" maxLength={200} placeholder="z. B. Edelstahl oder Acryl"/></label><label>Maße / Stärke <span>(falls bekannt)</span><input name="dimensions" maxLength={200} placeholder="Bitte Einheit angeben"/></label><label>Stückzahl <span>(falls bekannt)</span><input name="quantity" maxLength={60} defaultValue="1" placeholder="z. B. 1"/></label></>}
   <label>Wunschtermin<input type="date" name="date"/></label><label className="full">Materialbereitstellung<select name="supply"><option>Noch offen</option><option>Material soll von Gravuru bereitgestellt werden</option><option>Eigenes Material / vorhandene Teile</option></select></label><div className="full"><label htmlFor={attachmentId}>Dateien <span>(optional, bis zu 3 Dateien)</span><input ref={attachmentInput} id={attachmentId} name="files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" aria-describedby={`${attachmentId}-help${attachmentError?` ${attachmentId}-error`:''}`} aria-invalid={attachmentError?true:undefined} onChange={e=>setAttachmentError(contactAttachmentError(e.currentTarget.files||[]))}/><span id={`${attachmentId}-help`}>PDF, JPG oder PNG · jeweils höchstens 8 MB. Zusammen mit Ihrer Gestaltung höchstens 26 MB.</span></label>{attachmentError&&<div className="error" id={`${attachmentId}-error`} role="alert"><p>{attachmentError}</p><button type="button" className="text-link" onClick={()=>{if(attachmentInput.current){attachmentInput.current.value='';attachmentInput.current.focus()}setAttachmentError('')}}>Dateiauswahl entfernen</button></div>}</div>
  </div></details>}
  {orderDesign&&<fieldset><legend>Ihre Adresse</legend><div className="form-grid"><AddressFields prefix="customer"/></div><label className="consent"><input type="checkbox" name="differentDelivery" checked={differentDelivery} onChange={e=>setDifferentDelivery(e.target.checked)}/><span>Abweichende Lieferadresse</span></label>{differentDelivery&&<div className="form-grid"><label className="full">Vor- und Nachname / Empfänger *<input name="deliveryRecipient" autoComplete="shipping name" required maxLength={200}/></label><AddressFields prefix="delivery"/></div>}</fieldset>}
  {designLink&&<p>Ihr persönlicher Link bleibt Ihrem Vorgang zugeordnet. {orderDesign?'Bestellnummer, Name und E-Mail helfen uns, Ihre Gestaltung zuzuordnen.':'Name und E-Mail helfen uns, Ihre Sonderanfertigung zuzuordnen.'}</p>}
  <label className="consent"><input type="checkbox" name="acknowledged" required/><span>{preview?'Ich habe gelesen, dass diese Angaben nur lokal in der Vorschau gespeichert werden.':'Ich habe den Datenschutzhinweis zur Bearbeitung meiner Anfrage gelesen.'} <Link href="/datenschutz" target="_blank" rel="noopener noreferrer">Datenschutzhinweis (neuer Tab)</Link></span></label>
  <button className="button" disabled={busy} type="submit">{busy?'Wird gespeichert …':preview?(orderDesign?'Gestaltung lokal speichern':'Anfrage lokal speichern'):(orderDesign?'Gestaltung übermitteln':'Anfrage senden')} <span aria-hidden="true">↗</span></button>
  <p className="form-footnote">{orderDesign?'Sie übermitteln Ihre Gestaltung zu einem vorab abgestimmten Vorhaben. Die Fertigungsfreigabe wird separat geklärt.':'Eine Anfrage ist noch kein Fertigungsauftrag.'}</p>
 </form>
}

function AddressFields({prefix}:{prefix:string}){
 const completion=prefix==='delivery'?'shipping':'billing'
 return <><label className="full">Straße und Hausnummer *<input name={prefix+'Line1'} autoComplete={completion+' address-line1'} required maxLength={200}/></label><label>Postleitzahl<input name={prefix+'PostalCode'} autoComplete={completion+' postal-code'} maxLength={30}/><span>Für Deutschland erforderlich.</span></label><label>Ort *<input name={prefix+'City'} autoComplete={completion+' address-level2'} required maxLength={160}/></label><label className="full">Land *<input name={prefix+'Country'} autoComplete={completion+' country-name'} defaultValue="Deutschland" required maxLength={100}/></label><details className="form-extra full"><summary>Firma oder Adresszusatz ergänzen (optional)</summary><div className="form-grid"><label className="full">Firmenname<input name={prefix==='customer'?'company':'deliveryCompany'} autoComplete={completion+' organization'} maxLength={200}/></label><label className="full">Adresszusatz<input name={prefix+'Line2'} autoComplete={completion+' address-line2'} maxLength={200} placeholder="z. B. Wohnung, Gebäude, c/o"/></label><label className="full">Bundesland / Provinz / Region<input name={prefix+'Region'} autoComplete={completion+' address-level1'} maxLength={160}/></label></div></details></>
}
