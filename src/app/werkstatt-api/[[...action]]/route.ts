import {cms,origin} from '@/lib/content'
import {plates} from '@/lib/configuration'
import {exportConstruction} from '@/lib/workshop-export'
import material from '@/lib/workshop/material.json'
const fail=(message:string,status=400)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}})
export const runtime='nodejs'
export async function GET(req:Request,{params}:{params:Promise<{action?:string[]}>}){
 const p=await cms(),{user}=await p.auth({headers:req.headers}),path=(await params).action||[],url=new URL(req.url)
 if(path.join('/')==='session')return Response.json({admin:!!user,token:'same-origin'},{headers:{'Cache-Control':'no-store'}})
 if(!path.length){const [list,approval]=await Promise.all([p.find({collection:'config-templates',where:{removed:{not_equals:true}},limit:100,depth:0,overrideAccess:false,user}),p.findGlobal({slug:'workshop-material',overrideAccess:true})]);return Response.json({materials:[{...material,approved_at:approval.approvedAt||null}],templates:list.docs.map(t=>({id:String(t.id),product_id:String(t.id),name:t.title,geometry:t.geometry,enabled:t.enabled}))},{headers:{'Cache-Control':'no-store'}})}
 if(path[0]==='templates'&&path[2]==='export'){try{const t=await p.findByID({collection:'config-templates',id:path[1],overrideAccess:false,user});if(t.removed)return fail('Vorlage nicht verfügbar.',404);const svg=exportConstruction(t.geometry,url.searchParams.get('layer')||'steel');return new Response(svg,{headers:{'Content-Type':'image/svg+xml','Content-Disposition':'attachment; filename="konstruktion.svg"','Cache-Control':'no-store'}})}catch{return fail('Vorlage oder Export nicht verfügbar.',404)}}
 return fail('Nicht gefunden.',404)
}
export async function POST(req:Request,{params}:{params:Promise<{action?:string[]}>}){
 if(req.headers.get('origin')!==origin)return fail('Bitte diese Website verwenden.',403)
 if(Number(req.headers.get('content-length')||0)>20000)return fail('Zu viele Daten.',413)
 const p=await cms(),{user}=await p.auth({headers:req.headers}),path=((await params).action||[]).join('/')
 if(path!=='preview-export'&&!user)return fail('Bitte zuerst in der Verwaltung anmelden.',403)
 try{const text=await req.text();if(text.length>20000)return fail('Zu viele Daten.',413);const body=JSON.parse(text)
 if(path==='preview-export'){const svg=exportConstruction(body.geometry,body.layer);return new Response(svg,{headers:{'Content-Type':'image/svg+xml','Content-Disposition':'attachment; filename="konstruktion.svg"','Cache-Control':'no-store'}})}
 if(path==='approve'){if(body.sha!==material.original_sha||body.confirmed!==true)return fail('Bitte das Original ausdrücklich bestätigen.');await p.updateGlobal({slug:'workshop-material',data:{approvedAt:new Date().toISOString()},overrideAccess:false,user});return Response.json({approved:true})}
 if(path==='templates'){const geometry=plates.validate(body.geometry);if(plates.screwWarnings(geometry).length&&!plates.clearanceAccepted(geometry))return fail('Bitte Schraubenkopf-Freiraum bestätigen.');if(typeof body.name!=='string'||!body.name.trim()||body.name.length>120)return fail('Bitte einen Vorlagennamen eingeben.');if(body.parentId){await p.findByID({collection:'config-templates',id:body.parentId,overrideAccess:false,user})}const t=await p.create({collection:'config-templates',data:{title:body.name.trim(),material:'edelstahl',geometry,parentId:body.parentId||null,enabled:false,removed:false},overrideAccess:false,user});return Response.json({id:String(t.id),name:t.title,product_id:String(t.id)},{status:201})}
 if(['templates/remove','templates/restore','templates/release'].includes(path)){const t=await p.findByID({collection:'config-templates',id:body.templateId,overrideAccess:false,user});const data=path.endsWith('remove')?{removed:true,enabled:false}:path.endsWith('restore')?{removed:false,enabled:false}:{enabled:body.enabled===true};if(path.endsWith('release')){if(t.removed)return fail('Entfernte Vorlage zuerst wiederherstellen.');plates.validate(t.geometry)}await p.update({collection:'config-templates',id:t.id,data,overrideAccess:false,user});return Response.json({id:String(t.id),name:t.title})}
 return fail('Nicht gefunden.',404)
 }catch{return fail('Bitte Angaben, Maße und Bohrungen prüfen.')}
}
