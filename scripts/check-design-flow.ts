import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import fs from 'node:fs'
import {makeDesignLink,readDesignLink} from '../src/lib/design-link.ts'
import {validateConfiguration,baseGeometry} from '../src/lib/configuration.ts'
import options from '../src/lib/editor-options.json' with {type:'json'}
Object.assign(process.env,{NODE_ENV:'production'})
const {getPayload}=await import('payload'),{default:config}=await import('../src/payload.config.ts'),p=await getPayload({config})
const base='http://127.0.0.1:3087',origin={origin:base},ids:number[]=[];let user:any
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII='
const objects=[{type:'text',font:options.fonts[0],text:'FAMILIE TEST',x:150,y:50,w:110,h:14,size:14,rotation:0,bold:false},{type:'motif',motif:options.motifs[0],x:90,y:100,w:20,h:20,rotation:0},{type:'image',source:png,originalFile:png,originalName:'test.png',x:180,y:100,w:20,h:20,rotation:0,contrast:10,photoMode:'gray'}]
const input={material:'edelstahl',method:'gravur',purpose:'gestaltung',geometry:{...baseGeometry,widthMm:320},quantity:1,marking:'',x:50,y:50,fontSize:10,repeat:'gleich',design:{objects}}
try{
 const clean=validateConfiguration(input);assert.equal(clean.design?.objects.length,3)
 for(const design of [{objects:[{...objects[0],font:'invalid'}]},{objects:[{...objects[1],motif:'<script>'}]},{objects:[{...objects[2],source:'https://evil.invalid/x.png'}]},{objects:Array(21).fill(objects[0])}])assert.throws(()=>validateConfiguration({...input,design}))
 const oldNow=Date.now,expired=makeDesignLink({reference:'expiry'});Date.now=()=>oldNow()+91*86400000;assert.throws(()=>readDesignLink(expired));Date.now=oldNow
 assert.throws(()=>readDesignLink(expired.slice(0,-10)+'tampered00'))
 assert.equal((await fetch(base+'/gestaltung-link',{method:'POST',headers:{...origin,'Content-Type':'application/json'},body:'{}'})).status,401)
 const email='design-test-'+randomUUID()+'@example.invalid',password=randomUUID()+randomUUID();user=await p.create({collection:'users',data:{email,password,role:'admin',name:'Temporärer Gestaltungstest'},overrideAccess:true});const login=await p.login({collection:'users',data:{email,password}})
 const r=await fetch(base+'/gestaltung-link',{method:'POST',headers:{...origin,authorization:'JWT '+login.token,'Content-Type':'application/json'},body:JSON.stringify({reference:'TEST-B2C-LINK',name:'Testkunde',email:'test@example.invalid',geometry:input.geometry,material:'edelstahl',method:'gravur'})});assert.equal(r.status,200);const {url}=await r.json(),token=new URL(url).searchParams.get('link');assert.ok(token);assert.equal(readDesignLink(token).reference,'TEST-B2C-LINK');fs.writeFileSync('work/test-design-link.txt',url)
 const submit=async(link?:string,contact=true,order=true)=>{const form=new FormData();form.set('firstName','Test');form.set('customerLine1','Teststraße 12');form.set('customerPostalCode','33609');form.set('customerCity','Bielefeld');form.set('customerCountry','Deutschland');form.set('configuration',JSON.stringify(input));form.set('acknowledged','on');if(order)form.set('orderNumber','BEST-2026-123');if(contact){form.set('name','Integrationstest');form.set('email','test@example.invalid')}if(link)form.set('designLink',link);return fetch(base+'/anfrage',{method:'POST',headers:origin,body:form})}
 for(const [link,contact] of [[undefined,true],[token,true]] as const){const response=await submit(link,contact),body=await response.json();assert.equal(response.status,201,JSON.stringify(body));const doc=(await p.find({collection:'enquiries',where:{reference:{equals:body.reference}},overrideAccess:true})).docs[0];ids.push(Number(doc.id));const saved=doc.configuration as any;assert.equal(saved.geometry.widthMm,320);assert.equal(saved.design.objects.length,3);assert.equal(saved.design.objects[0].font,objects[0].font);assert.equal(saved.design.objects[2].originalFile,png);if(link){assert.match(doc.message||'',/TEST-B2C-LINK/);assert.equal(doc.name,'Integrationstest');assert.equal(saved.orderNumber,'BEST-2026-123');assert.match(doc.message||'',/Bestellnummer: BEST-2026-123/)}}
 assert.equal((await submit(undefined,false)).status,400);assert.equal((await submit('invalid',false)).status,400);assert.equal((await submit(token,false)).status,400);assert.equal((await submit(undefined,true,false)).status,400);assert.equal((await submit(token,true,false)).status,400)
 console.log('PASS: Full text/motif/photo persistence; B2C order number, surname and email required for both general and personal links; authenticated link creation; expiry, tampering and invalid objects rejected.')
}finally{for(const id of ids)await p.delete({collection:'enquiries',id,overrideAccess:true});if(user)await p.delete({collection:'users',id:user.id,overrideAccess:true});await p.destroy()}

