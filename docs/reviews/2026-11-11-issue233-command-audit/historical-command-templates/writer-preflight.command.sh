node -e ''\''use strict'\'';
const fs=require('\''node:fs'\''),p=require('\''node:path'\'');
const root='\''/var/www/vhosts/gravuru-designwerkstatt.de/private/issue139-katalog-20261102'\'';
function status(pid){const t=fs.readFileSync('\''/proc/'\''+pid+'\''/status'\'','\''utf8'\'');return{pid:+pid,name:t.match(/^Name:\s+(.+)$/m)?.[1]||'\''?'\'',uid:+t.match(/^Uid:\s+(\d+)/m)?.[1],ppid:+t.match(/^PPid:\s+(\d+)/m)?.[1]};}
try{
 const own=status(process.pid),skip=new Set([process.pid]);let up=own.ppid;while(up>0&&!skip.has(up)){skip.add(up);try{up=status(up).ppid;}catch{break;}}
 const candidates=[];let unreadable=0,sameUser=0;
 for(const name of fs.readdirSync('\''/proc'\'').filter(x=>/^\d+$/.test(x))){if(skip.has(+name))continue;let s;try{s=status(name);}catch(e){if(e.code!=='\''ENOENT'\''&&e.code!=='\''ESRCH'\'')unreadable++;continue;}if(s.uid!==own.uid)continue;sameUser++;let cmd;try{cmd=fs.readFileSync('\''/proc/'\''+name+'\''/cmdline'\'','\''utf8'\'').replace(/\0/g,'\'' '\'');}catch(e){if(e.code!=='\''ENOENT'\''&&e.code!=='\''ESRCH'\'')unreadable++;continue;}
  if(/^(git|git-.*)$/.test(s.name)||/(catalog-ff|build-katalog|katalog.*import|import.*katalog|native-import|original18|shop-sync|catalog.*(merge|fetch|checkout|reset))/.test(cmd))candidates.push({pid:s.pid,comm:s.name.slice(0,24)});
 }
 const paths=['\''designs/.werkstatt-write.lock'\'','\''designs/.werkstatt-write-journal.json'\'','\''.original18-native-import.lock'\'','\''designs/.original18-native-import.lock'\'','\''.git/index.lock'\'','\''.git/HEAD.lock'\''];const locks=paths.filter(x=>fs.existsSync(p.join(root,x))).map(x=>p.basename(x));
 const appLock='\''/var/www/vhosts/gravuru-designwerkstatt.de/private/acryl-employee-20261021-v1/data/.original18-native-import.lock'\'';if(fs.existsSync(appLock))locks.push('\''app-original18-import'\'');
 const out={ok:!candidates.length&&!locks.length&&!unreadable,sameUser,candidates:candidates.length,processes:candidates.slice(0,5),locks,unreadable};console.log(JSON.stringify(out));if(!out.ok)process.exitCode=1;
}catch(e){console.log(JSON.stringify({ok:false,error:String(e.message).slice(0,420)}));process.exitCode=1;}
'
