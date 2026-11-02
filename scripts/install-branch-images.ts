import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {getPayload} from 'payload'
import config from '../src/payload.config.ts'

const catalog=JSON.parse(fs.readFileSync('scripts/branch-images-catalog.json','utf8'))
assert.equal(catalog.length,15)
assert.equal(new Set(catalog.map((entry:any)=>entry.filename)).size,15)
const p=await getPayload({config}),installed:any[]=[]
try{
 for(const entry of catalog){
  const page=(await p.find({collection:'pages',where:{kind:{equals:'zielgruppe'},slug:{equals:entry.slug}},limit:1,depth:0,overrideAccess:true})).docs[0]
  assert.ok(page,'Branche fehlt: '+entry.slug)
  let image=(await p.find({collection:'media',where:{filename:{equals:entry.filename}},limit:1,depth:0,overrideAccess:true})).docs[0]
  if(!image){
   assert.ok(!entry.reuse,'Vorhandenes Produktbild fehlt: '+entry.filename)
   image=await p.create({collection:'media',overrideAccess:true,filePath:path.resolve('work/branch-images',entry.filename),data:{alt:entry.alt,caption:entry.caption,credit:'KI-generiertes Anwendungsbeispiel; mit der Bildgenerierungsfunktion erstellt. Kein Foto eines ausgeführten Kundenprojekts.',approved:true}})
  }
  assert.ok(image.approved&&image.alt,'Bild nicht freigegeben oder ohne Alternativtext')
  const beforeImage=typeof page.image==='object'?page.image?.id:page.image
  await p.update({collection:'pages',id:page.id,overrideAccess:true,draft:false,data:{image:image.id}})
  installed.push({pageId:page.id,slug:entry.slug,beforeImage,afterImage:image.id,filename:image.filename})
 }
 const pages=(await p.find({collection:'pages',where:{kind:{equals:'zielgruppe'}},limit:100,depth:1,overrideAccess:false})).docs
 assert.equal(pages.length,15)
 const images=pages.map((page:any)=>page.image)
 assert.ok(images.every((image:any)=>image&&typeof image==='object'&&image.approved&&image.url))
 assert.equal(new Set(images.map((image:any)=>image.id)).size,15)
 assert.equal(new Set(images.map((image:any)=>image.filename)).size,15)
 fs.mkdirSync('work',{recursive:true})
 fs.writeFileSync('work/branch-images-installation.json',JSON.stringify({installedAt:new Date().toISOString(),branches:15,uniqueImages:15,installed},null,2))
 console.log(JSON.stringify({branches:15,uniqueImages:15,newImages:catalog.filter((e:any)=>!e.reuse).length,existingProductImages:catalog.filter((e:any)=>e.reuse).length}))
}finally{await p.destroy()}
