import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {DatabaseSync} from 'node:sqlite'
import {execFileSync} from 'node:child_process'
const root=process.cwd(),parent=path.join(root,'backups')
fs.mkdirSync(parent,{recursive:true,mode:0o700})
const dir=fs.mkdtempSync(path.join(parent,'snapshot-'))
const items=['src','public','scripts','media','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','next.config.mjs','next-env.d.ts','server.cjs','.env']
fs.mkdirSync(path.join(dir,'data'))
const db=new DatabaseSync(path.join(root,'data/gravuru.db'),{readOnly:true})
db.exec('PRAGMA busy_timeout=10000')
db.exec(`VACUUM INTO '${path.join(dir,'data/gravuru.db').replaceAll("'","''")}'`);db.close()
fs.chmodSync(path.join(dir,'data/gravuru.db'),0o600)
if(fs.existsSync(path.join(root,'data/design-links')))fs.cpSync(path.join(root,'data/design-links'),path.join(dir,'data/design-links'),{recursive:true})
for(const item of items)fs.cpSync(path.join(root,item),path.join(dir,item),{recursive:true})
fs.chmodSync(path.join(dir,'.env'),0o600)
// Fail rather than produce a backup missing files referenced by the database snapshot.
const snapshotDB=new DatabaseSync(path.join(dir,'data/gravuru.db'),{readOnly:true})
for(const table of ['media','attachments']){
 const columns=snapshotDB.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name).filter(c=>c==='filename'||c.endsWith('_filename'))
 for(const row of snapshotDB.prepare(`SELECT ${columns.join(',')} FROM ${table}`).all())for(const filename of Object.values(row))if(filename&&!fs.existsSync(path.join(dir,'media',table==='media'?'public':'private',String(filename))))throw Error('Eine referenzierte Datei fehlt in der Sicherung. Bitte erneut sichern.')
}
snapshotDB.close()
function manifest(folder,rel=''){
 const entries=[]
 for(const f of fs.readdirSync(path.join(folder,rel),{withFileTypes:true})){
  const name=path.join(rel,f.name)
  if(f.isDirectory())entries.push(...manifest(folder,name))
  else if(f.isFile())entries.push({file:name,sha256:createHash('sha256').update(fs.readFileSync(path.join(folder,name))).digest('hex')})
 }
 return entries
}
const files=manifest(dir)
fs.writeFileSync(path.join(dir,'MANIFEST.json'),JSON.stringify({createdAt:new Date().toISOString(),files},null,2))
const archive=dir+'.tar.gz'
execFileSync('tar',['-czf',archive,'-C',dir,'.']);fs.chmodSync(archive,0o600)
if(process.argv.includes('--verify')){
 const restored=fs.mkdtempSync(path.join(parent,'restore-check-'))
 execFileSync('tar',['-xzf',archive,'-C',restored])
 for(const entry of files){const hash=createHash('sha256').update(fs.readFileSync(path.join(restored,entry.file))).digest('hex');if(hash!==entry.sha256)throw Error('Wiederherstellung weicht von der Sicherung ab.')}
 const restoredDB=new DatabaseSync(path.join(restored,'data/gravuru.db'),{readOnly:true})
 if(restoredDB.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Datenbanksicherung ist nicht konsistent.')
 const pages=restoredDB.prepare('SELECT count(*) AS n FROM pages').get().n;restoredDB.close()
 console.log(JSON.stringify({backup:path.basename(archive),restoredFiles:files.length,databaseIntegrity:'ok',pages}))
}else console.log('Private Anwendungssicherung erstellt: '+path.basename(archive))
