// Nur lesen: sichtbare Prozesse des eigenen Kontos (Name, Speicher getrennt nach eigenem und dateigestütztem Anteil) und,
// falls lesbar, die Speicherzählung der Kontogruppe. Keine Umgebungswerte, keine Argumente mit Inhalt.
import fs from 'node:fs';
const lies=f=>{try{return fs.readFileSync(f,'utf8');}catch{return null;}};
const kb=(t,k)=>{const m=new RegExp('^'+k+':\\s+(\\d+) kB','m').exec(t||'');return m?Math.round(+m[1]/1024):0;};
const prozesse=[];
for(const d of fs.readdirSync('/proc')){if(!/^\d+$/.test(d))continue;const s=lies('/proc/'+d+'/status');if(!s)continue;const rss=kb(s,'VmRSS');if(!rss)continue;
 const cmd=(lies('/proc/'+d+'/cmdline')||'').split('\0').filter(Boolean);
 // nur Programmname und ein kurzer Dateiname, nie Skripttext oder Schlüssel
 const kurz=cmd.slice(0,3).map(a=>a.startsWith('-')?a.slice(0,14):a.replace(/^.*\/vhosts\/[^/]+\//,'~/').slice(-70)).filter(a=>!/eval|=|\{|\(/.test(a)).join(' ');
 let cwd=null;try{cwd=fs.readlinkSync('/proc/'+d+'/cwd').replace(/^.*\/vhosts\/[^/]+\//,'~/').slice(0,80);}catch{}
 let alterSek=null;try{const st=lies('/proc/'+d+'/stat'),f=st.slice(st.lastIndexOf(')')+2).split(' ');alterSek=Math.round(+lies('/proc/uptime').split(' ')[0]-(+f[19])/100);}catch{}
 prozesse.push({cwd,alterSek,pid:+d,ppid:+(/^PPid:\s+(\d+)/m.exec(s)?.[1]||0),name:/^Name:\s+(.*)$/m.exec(s)?.[1],rss,anon:kb(s,'RssAnon'),datei:kb(s,'RssFile'),shm:kb(s,'RssShmem'),threads:+(/^Threads:\s+(\d+)/m.exec(s)?.[1]||0),kurz});}
prozesse.sort((a,b)=>b.rss-a.rss);
const gruppe={cgroup:(lies('/proc/self/cgroup')||'').split('\n').filter(Boolean).map(l=>l.replace(/^\d+:/,'').slice(0,80)).slice(0,14)};
for(const f of ['/sys/fs/cgroup/memory.current','/sys/fs/cgroup/memory.max','/sys/fs/cgroup/memory/memory.usage_in_bytes','/sys/fs/cgroup/memory/memory.limit_in_bytes','/proc/lve/list']){const t=lies(f);gruppe[f]=t===null?null:t.trim().slice(0,200);}
const mi=lies('/proc/meminfo')||'';
console.log(JSON.stringify({event:'kt_prozesse',zeit:new Date().toISOString(),anzahl:prozesse.length,summeRss:prozesse.reduce((a,p)=>a+p.rss,0),summeAnon:prozesse.reduce((a,p)=>a+p.anon,0),summeDatei:prozesse.reduce((a,p)=>a+p.datei,0),summeShm:prozesse.reduce((a,p)=>a+p.shm,0),meminfo:{total:kb(mi,'MemTotal'),frei:kb(mi,'MemAvailable')},gruppe,prozesse}));
