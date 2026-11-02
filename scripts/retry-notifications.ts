import {getPayload} from 'payload'
import config from '../src/payload.config.ts'
import {notifyEnquiry} from '../src/lib/enquiry-notification.ts'
const p=await getPayload({config})
let failures=0
try{
 const pending=await p.find({collection:'enquiries',where:{notificationState:{equals:'pending'},localPreview:{equals:false}},limit:50,overrideAccess:true,depth:0})
 for(const doc of pending.docs){try{await notifyEnquiry(p,{id:doc.id,reference:String(doc.reference),notificationState:String(doc.notificationState)})}catch{failures++;console.error('Eine gespeicherte Benachrichtigung konnte noch nicht versandt werden.')}}
 console.log(`Benachrichtigungen geprüft: ${pending.docs.length}; weiterhin offen: ${failures}`)
}finally{await p.destroy()}
process.exitCode=failures?1:0
