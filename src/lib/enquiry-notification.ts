import type {Payload} from 'payload'

export async function notifyEnquiry(p:Payload,doc:{id:string|number;reference:string;notificationState?:string|null}){
 if(doc.notificationState==='sent')return
 if(process.env.MAIL_ENABLED!=='true'||!process.env.ENQUIRY_EMAIL)throw Error('Anfragebenachrichtigung ist nicht eingerichtet.')
 await p.sendEmail({to:process.env.ENQUIRY_EMAIL,subject:`Neue Manufaktur-Anfrage ${doc.reference}`,text:`Eine neue Anfrage wurde sicher gespeichert.\n\nVorgang: ${doc.reference}\nVerwaltung: ${process.env.NEXT_PUBLIC_SITE_URL}/admin/collections/enquiries/${doc.id}\n\nKundendaten und Anlagen sind nach Anmeldung in der Verwaltung verfügbar.`})
 await p.update({collection:'enquiries',id:doc.id,data:{notificationState:'sent',notifiedAt:new Date().toISOString()},overrideAccess:true})
}
