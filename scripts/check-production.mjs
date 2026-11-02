import assert from 'node:assert/strict'
import {getPayload} from 'payload'
import config from '../src/payload.config.ts'
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3098'
const origin=process.env.NEXT_PUBLIC_SITE_URL
const tag='VEROEFFENTLICHUNGSPRUEFUNG-'+Date.now()
const p=await getPayload({config})
let saved
try{
 for(const route of ['/api/enquiries','/api/attachments'])assert.equal((await fetch(base+route)).status,403,route)
 assert.equal((await fetch(base+'/api/users/first-register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'deployment-check@example.invalid',password:'NeverCreated-'+tag})})).status,403)
 assert.equal((await fetch(base+'/anfrage',{method:'POST',headers:{Origin:'https://foreign.invalid'}})).status,403)
 for(const route of ['/','/kontakt','/konfigurator','/impressum','/datenschutz','/sitemap.xml'])assert.equal((await fetch(base+route)).status,200,route)
 const f=new FormData();f.set('name',tag);f.set('email','deployment-check@example.invalid');f.set('message','Technische Funktionsprüfung von Gravuru. Keine Kundenanfrage, keine Fertigung.');f.set('acknowledged','on')
 const r=await fetch(base+'/anfrage',{method:'POST',headers:{Origin:origin},body:f})
 assert.equal(r.status,201,JSON.stringify(await r.clone().json()))
 const body=await r.json()
 const found=await p.find({collection:'enquiries',where:{reference:{equals:body.reference},name:{equals:tag}},overrideAccess:true,depth:0})
 saved=found.docs[0];assert.ok(saved);assert.equal(saved.localPreview,false)
 console.log(JSON.stringify({pages:'OK',privateAccess:'OK',firstRegistration:'blocked',requestStored:body.reference,notificationState:saved.notificationState,adminAccounts:(await p.count({collection:'users',overrideAccess:true})).totalDocs}))
}finally{
 if(saved&&saved.name===tag)await p.delete({collection:'enquiries',id:saved.id,overrideAccess:true})
 await p.destroy()
}
