import fs from 'node:fs/promises'
import path from 'node:path'
import {getPayload} from 'payload'
import config from '../src/payload.config.ts'

// Explicit --apply is required. Default invocation checks only; all writes are scoped.
const apply=process.argv.includes('--apply')
const plan=JSON.parse(await fs.readFile(new URL('./customer-copy-plan-20261102.json',import.meta.url),'utf8'))
const normalize=value=>Array.isArray(value)?value.map(normalize):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='id').map(([key,v])=>[key,normalize(v)])):value
const same=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b))
const p=await getPayload({config})
const pending=[]
try{
 for(const image of plan.requiredImages){const m=await p.findByID({collection:'media',id:image.id,overrideAccess:true,depth:0});if(!m.approved||m.filename!==image.filename)throw Error('Bildfreigabe oder Bildzuordnung geändert: '+image.id)}
 for(const patch of plan.patches){
  const current=patch.kind==='global'?await p.findGlobal({slug:patch.slug,overrideAccess:true,depth:0}):await p.findByID({collection:'pages',id:patch.id,overrideAccess:true,depth:0})
  if(patch.kind==='page'&&(current.slug!==patch.slug||current._status!=='published'))throw Error('Seitenzuordnung oder Veröffentlichungsstatus geändert: '+patch.slug)
  const data={},before={}
  for(const [key,value]of Object.entries(patch.after)){
   if(same(current[key],value))continue
   if(!same(current[key],patch.before[key]))throw Error('Redaktioneller Konflikt: '+patch.slug+'.'+key)
   data[key]=value;before[key]=current[key]
  }
  if(Object.keys(data).length)pending.push({...patch,data,before})
 }
 if(!apply){console.log(JSON.stringify({mode:'check',pending:pending.map(({slug,data})=>({slug,fields:Object.keys(data)}))}));}
 else if(!pending.length){console.log('CUSTOMER_COPY_ALREADY_APPLIED');}
 else{
  const dir=path.resolve('work/customer-copy-backups');await fs.mkdir(dir,{recursive:true})
  const backup=path.join(dir,'before-'+new Date().toISOString().replaceAll(':','-')+'.json')
  await fs.writeFile(backup,JSON.stringify({createdAt:new Date().toISOString(),patches:pending.map(({kind,slug,id,before})=>({kind,slug,id,data:before}))},null,2),{flag:'wx',mode:0o600})
  const applied=[]
  try{
   for(const patch of pending){
    if(patch.kind==='global')await p.updateGlobal({slug:patch.slug,overrideAccess:true,data:patch.data})
    else await p.update({collection:'pages',id:patch.id,overrideAccess:true,draft:false,data:patch.data})
    applied.push(patch)
   }
  }catch(error){
   for(const patch of applied.reverse()){if(patch.kind==='global')await p.updateGlobal({slug:patch.slug,overrideAccess:true,data:patch.before});else await p.update({collection:'pages',id:patch.id,overrideAccess:true,draft:false,data:patch.before})}
   throw error
  }
  console.log(JSON.stringify({result:'CUSTOMER_COPY_APPLIED',entries:pending.length,backup}))
 }
}finally{await p.destroy()}
