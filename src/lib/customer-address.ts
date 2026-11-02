export function readConfigurationAddresses(form:FormData,purpose:string,recipient:string,company:string){
 // An enquiry needs contact details. Existing clients may still provide an address.
 const supplied=['Line1','Line2','PostalCode','City','Region','Country'].some(key=>['customer','delivery'].some(prefix=>String(form.get(prefix+key)||'').trim()))||form.get('differentDelivery')==='on'
 if(purpose!=='gestaltung'&&!supplied)return undefined
 return readCustomerAddresses(form,recipient,company)
}
export function readCustomerAddresses(form:FormData,recipient:string,company:string){
 const read=(key:string,max=200)=>{const value=form.get(key);if(value!==null&&typeof value!=='string')throw Error('Bitte die Adressangaben prüfen.');const text=String(value||'').trim();if(text.length>max||/[\r\n\x00]/.test(text))throw Error('Bitte die Adressangaben kürzen oder korrigieren.');return text};
 const address=(prefix:string,name:string,firm:string)=>{const a={recipient:name,company:firm,line1:read(prefix+'Line1'),line2:read(prefix+'Line2'),postalCode:read(prefix+'PostalCode',30),city:read(prefix+'City',160),region:read(prefix+'Region',160),country:read(prefix+'Country',100)};if(!a.recipient||!a.line1||!a.city||!a.country)throw Error('Bitte Empfänger, Straße und Hausnummer, Ort und Land vollständig angeben.');if(/^(deutschland|germany|de|deu)$/i.test(a.country)&&!/^\d{5}$/.test(a.postalCode))throw Error('Bitte eine fünfstellige deutsche Postleitzahl angeben.');return a};
 const customerAddress=address('customer',recipient,company),differentDelivery=form.get('differentDelivery')==='on',deliveryAddress=differentDelivery?address('delivery',read('deliveryRecipient'),read('deliveryCompany')):customerAddress;
 return {customerAddress,differentDelivery,deliveryAddress}
}
export function addressSummary(value:ReturnType<typeof readCustomerAddresses>){const format=(a:typeof value.customerAddress)=>[a.recipient,a.company,a.line1,a.line2,[a.postalCode,a.city].filter(Boolean).join(' '),a.region,a.country].filter(Boolean).join('\n');return 'Kundenadresse:\n'+format(value.customerAddress)+'\n\nLieferadresse:\n'+(value.differentDelivery?format(value.deliveryAddress):'Wie Kundenadresse')}
