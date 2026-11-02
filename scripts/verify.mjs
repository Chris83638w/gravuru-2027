import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
const base='http://127.0.0.1:3087'
let token='',userId,docId,enquiryId,attachmentId,copyOriginal
const request=(path,options={})=>fetch(base+path,{...options,headers:{...(token?{Authorization:`JWT ${token}`} :{}),...options.headers}})
const json=(method,data)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
const check=(condition,message)=>{assert.ok(condition,message);console.log('PASS '+message)}
try {
 const registration=await request('/api/users/first-register',json('POST',{email:'local-qa@example.invalid',password:randomUUID()+randomUUID(),name:'Temporärer Funktionstest'}))
 assert.equal(registration.status,200,'First-user registration');const account=await registration.json();token=account.token;userId=account.user.id;check(account.user.role==='admin','Erster Benutzer erhält Administration')
 const pages=await (await request('/api/pages?limit=100')).json();check(pages.docs.length===30,'30 redaktionelle Seiten vorhanden')
 const routes=['/','/leistungen','/fuer-wen','/produkte','/kontakt','/ueber-uns','/konfigurator','/referenzen','/impressum','/datenschutz',...pages.docs.map(p=>`/${p.kind==='leistung'?'leistungen':p.kind==='zielgruppe'?'fuer-wen':'produkte'}/${p.slug}`)]
 for(const path of routes){const r=await fetch(base+path);assert.equal(r.status,200,path);const html=await r.text();assert.ok(html.includes('noindex'),path+' local noindex')};check(true,`${routes.length} Seiten erreichbar und lokal auf noindex`)
 const orig=await (await request('/api/globals/layout-content')).json();copyOriginal=orig.ctaButton
 let updated=await request('/api/globals/layout-content',json('POST',{ctaButton:'QA Änderung sichtbar'}));assert.equal(updated.status,200)
 check((await (await fetch(base+'/')).text()).includes('QA Änderung sichtbar'),'Änderung im CMS erscheint auf der Website')
 await request('/api/globals/layout-content',json('POST',{ctaButton:copyOriginal}));copyOriginal=undefined
 const created=await request('/api/pages',json('POST',{label:'QA Entwurf',slug:'qa-entwurf',kind:'seite',title:'QA Entwurf verborgen',intro:'Nur zum Prüfen.',_status:'draft'}));assert.equal(created.status,201);docId=(await created.json()).doc.id
 check((await fetch(base+'/seiten/qa-entwurf')).status===404,'Unveröffentlichter Entwurf bleibt verborgen')
 const draft=await request('/vorschau?slug=qa-entwurf',{redirect:'manual'});check(draft.status===307&&draft.headers.get('location')?.endsWith('/seiten/qa-entwurf'),'Angemeldete Entwurfsvorschau erreichbar')
 const unauth=await fetch(base+'/vorschau?slug=qa-entwurf',{redirect:'manual'});check(unauth.headers.get('location')?.includes('/admin/login'),'Entwurfsvorschau verlangt Anmeldung')
 const f=new FormData();for(const [k,v]of Object.entries({name:'Lokaler Funktionstest',email:'qa@example.invalid',message:'Test der privaten Anlagen.',acknowledged:'on'}))f.set(k,v)
 let pdf='%PDF-1.4\n';const offsets=[0];for(const [i,body] of ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << >> /Contents 4 0 R >>','<< /Length 0 >>\nstream\n\nendstream'].entries()){offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${body}\nendobj\n`}const xref=pdf.length;pdf+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
 f.append('files',new Blob([pdf],{type:'application/pdf'}),'qa-test.pdf')
 const sent=await fetch(base+'/anfrage',{method:'POST',headers:{Origin:base},body:f});assert.equal(sent.status,201);const ref=(await sent.json()).reference
 const list=await (await request('/api/enquiries?where[reference][equals]='+ref)).json();const enquiry=list.docs[0];enquiryId=enquiry.id;attachmentId=enquiry.attachments[0].id;check(enquiry.message==='Test der privaten Anlagen.','Projektanfrage dauerhaft mit Anlage gespeichert')
 const fileURL=enquiry.attachments[0].url;check((await fetch(fileURL.startsWith('http')?fileURL:base+fileURL)).status!==200,'Private Datei ohne Anmeldung gesperrt')
 check((await request(fileURL.replace(base,''))).status===200,'Private Datei mit Anmeldung abrufbar')
 for(const path of ['/api/enquiries','/api/attachments','/api/users'])check((await fetch(base+path)).status===403,`${path} ohne Anmeldung gesperrt`)
 check((await fetch(base+'/anfrage',{method:'POST',headers:{Origin:'https://example.invalid'},body:f})).status===403,'Fremde Herkunft abgewiesen')
 const invalid=new FormData();invalid.set('name','Test');check((await fetch(base+'/anfrage',{method:'POST',headers:{Origin:base},body:invalid})).status===400,'Unvollständige Anfrage abgewiesen')
 check((await fetch(base+'/nicht-vorhanden')).status===404,'Fehlende Seite liefert 404')
 check((await (await fetch(base+'/robots.txt')).text()).includes('Disallow: /'),'Lokale Suchmaschinen-Sperre aktiv')
} finally {
 if(copyOriginal!==undefined)await request('/api/globals/layout-content',json('POST',{ctaButton:copyOriginal}))
 for(const [collection,id]of [['enquiries',enquiryId],['attachments',attachmentId],['pages',docId],['users',userId]])if(id){const r=await request(`/api/${collection}/${id}`,{method:'DELETE'});console.log(`Testdaten ${collection}: ${r.status}`)}
}
