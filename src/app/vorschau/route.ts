import {draftMode} from 'next/headers'
import {redirect} from 'next/navigation'
import {cms,pagePath} from '@/lib/content'
export async function GET(req:Request){const url=new URL(req.url);if(url.searchParams.has('exit')){(await draftMode()).disable();redirect('/')}const p=await cms();const {user}=await p.auth({headers:req.headers});if(!user)redirect('/admin/login');const slug=url.searchParams.get('slug');if(!slug)return Response.json({error:'Seite fehlt'},{status:400});const r=await p.find({collection:'pages',where:{slug:{equals:slug}},limit:1,draft:true,user,overrideAccess:false});if(!r.docs[0])return Response.json({error:'Seite nicht gefunden'},{status:404});(await draftMode()).enable();redirect(pagePath(r.docs[0]))}
