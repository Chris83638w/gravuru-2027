import {DatabaseSync} from 'node:sqlite'
import {createHash} from 'node:crypto'
import {mkdirSync} from 'node:fs'
import path from 'node:path'

export const MAX_REQUEST_BYTES=26*1024*1024
export async function limitedFormData(req:Request){
 const reader=req.body?.getReader();if(!reader)throw Error('Ungültige Formulardaten.')
 const chunks:Uint8Array[]=[];let size=0
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_REQUEST_BYTES){await reader.cancel();throw Error('Bitte insgesamt höchstens 26 MB übermitteln.')}chunks.push(value)}
 return new Response(Buffer.concat(chunks),{headers:{'content-type':req.headers.get('content-type')||''}}).formData()
}
// SQLite transactions share limits across Passenger workers and process restarts.
export function acceptRequest(req:Request){
 const dir=path.resolve(process.env.DATA_DIR||'data');mkdirSync(dir,{recursive:true})
 const db=new DatabaseSync(path.join(dir,'request-limits.db'))
 const now=Date.now();const key=createHash('sha256').update(process.env.PAYLOAD_SECRET||'').update(req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')||'unknown').digest('hex')
 try{
  db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS attempts (client TEXT NOT NULL, at INTEGER NOT NULL); BEGIN IMMEDIATE')
  db.prepare('DELETE FROM attempts WHERE at < ?').run(now-600000)
  const global=db.prepare('SELECT count(*) AS n FROM attempts WHERE at > ?').get(now-60000) as {n:number}
  const client=db.prepare('SELECT count(*) AS n FROM attempts WHERE client=?').get(key) as {n:number}
  if(global.n>=15||client.n>=4){db.exec('COMMIT');return false}
  db.prepare('INSERT INTO attempts VALUES (?,?)').run(key,now);db.exec('COMMIT');return true
 }catch(e){try{db.exec('ROLLBACK')}catch{}throw e}finally{db.close()}
}
