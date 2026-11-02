import {cms,origin} from '@/lib/content'
import {storePreparedDesign} from '@/lib/prepared-design'
export const runtime='nodejs'
const limit=26*1024*1024
async function body(req:Request){
 if(Number(req.headers.get('content-length')||0)>limit)throw Error('Bitte insgesamt höchstens 26 MB speichern.')
 const reader=req.body?.getReader();if(!reader)throw Error('Bitte die Angaben prüfen.')
 const chunks:Uint8Array[]=[];let size=0
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Bitte insgesamt höchstens 26 MB speichern.')}chunks.push(value)}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
export async function POST(req:Request){
 if(req.headers.get('origin')!==origin)return Response.json({error:'Zugriff verweigert.'},{status:403})
 const p=await cms(),{user}=await p.auth({headers:req.headers})
 if(!user)return Response.json({error:'Bitte zuerst in der Verwaltung anmelden.'},{status:401})
 try{
  const b=await body(req),reference=String(b.reference||'').trim()
  if(!reference||reference.length>120)throw Error('Bitte eine Vorgangsnummer angeben.')
  const configuration=b.configuration||{geometry:b.geometry,material:b.material==='acryl'?'acryl':'edelstahl',method:b.method==='druck'?'druck':b.method==='zuschnitt'?'zuschnitt':'gravur',purpose:'gestaltung',quantity:1,repeat:'gleich',x:50,y:50,fontSize:10}
  const token=await storePreparedDesign({reference,configuration,name:String(b.name||'').slice(0,160),email:String(b.email||'').slice(0,254)})
  return Response.json({url:origin+'/gestalten?link='+token},{headers:{'Cache-Control':'no-store'}})
 }catch(e){return Response.json({error:e instanceof Error&&e.message.startsWith('Bitte')?e.message:'Bitte die Angaben und den Entwurf prüfen.'},{status:400})}
}
