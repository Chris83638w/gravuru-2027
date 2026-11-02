import {randomBytes} from 'node:crypto'
import {existsSync,mkdirSync,writeFileSync} from 'node:fs'
mkdirSync('data',{recursive:true})
if(!existsSync('.env'))writeFileSync('.env',`PAYLOAD_SECRET=${randomBytes(48).toString('hex')}\nDATABASE_URI=file:./data/gravuru.db\nNEXT_PUBLIC_SITE_URL=http://127.0.0.1:3087\nSITE_PUBLIC=false\n`)
console.log('Lokale Umgebung vorbereitet. Geheimnis wird nicht ausgegeben.')
