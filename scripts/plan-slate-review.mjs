import fs from 'node:fs';
import path from 'node:path';
import {slateDesignGroup} from '../app/workshop/slate-design-targets.mjs';
const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1];
const root=path.resolve(value('--katalog')),report=JSON.parse(fs.readFileSync(path.join(root,'auftraege/2026-11-04-schiefer-designziele/zuordnung.json'))),jobs=[];
for(const row of report.rows){
 if(row.status==='delegated-unchanged')continue;
 const d=JSON.parse(fs.readFileSync(path.join(root,row.file))),group=slateDesignGroup(d);
 for(const target of d.ziele??[]){if(!target.familie.startsWith('schiefer-tafeln-'))continue;
 const f=JSON.parse(fs.readFileSync(path.join(root,'familien/schiefer/'+target.familie+'.json')));
 for(const s of f.sizes.filter(s=>d.sizes?.includes(s.key)))jobs.push({family:f.id,size:s.key,reihe:row.file.split('/')[1],id:d.id,format:d.formatreihe??'rechteck-22x14',group,existing:row.status==='existing-unchanged'});
 }
}
fs.writeFileSync(path.resolve(value('--out')),JSON.stringify(jobs,null,2)+'\n');console.log(JSON.stringify({jobs:jobs.length,designs:new Set(jobs.map(j=>j.reihe+'/'+j.id)).size}));
