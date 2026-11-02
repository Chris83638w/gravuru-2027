import {cache} from 'react'
import {getPayload} from 'payload'
import config from '@payload-config'
import {copyDefaults} from '@/content/siteCopy'
import {draftMode,headers} from 'next/headers'
export const cms=()=>getPayload({config})
export const getSettings=cache(async()=>{const p=await cms();return p.findGlobal({slug:'website',depth:1,overrideAccess:false})})
export const getPages=cache(async()=>{const p=await cms();const r=await p.find({collection:'pages',limit:100,depth:1,overrideAccess:false,sort:'createdAt'});return r.docs})
export const getPage=cache(async(slug:string)=>{const p=await cms();const draft=(await draftMode()).isEnabled;const user=draft?(await p.auth({headers:await headers()})).user:null;const r=await p.find({collection:'pages',where:{slug:{equals:slug}},depth:1,limit:1,overrideAccess:false,draft:Boolean(user),user});return r.docs[0]})
export const getCopy=cache(async()=>{const p=await cms();const stored=await p.findGlobal({slug:'layout-content',overrideAccess:false});return {...copyDefaults,...Object.fromEntries(Object.entries(stored).filter(([,v])=>v!==null&&v!==undefined))} as typeof copyDefaults})
export const getReferences=cache(async()=>{const p=await cms();return (await p.find({collection:'references',limit:50,overrideAccess:false,depth:1})).docs})
export function pagePath(d:Record<string,any>) {return `/${d.kind==='leistung'?'leistungen':d.kind==='zielgruppe'?'fuer-wen':d.kind==='produkt'?'produkte':'seiten'}/${d.slug}`}
export const publicSite=process.env.SITE_PUBLIC==='true'
export const origin=process.env.NEXT_PUBLIC_SITE_URL||'http://127.0.0.1:3087'
