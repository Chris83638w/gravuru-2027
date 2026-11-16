// #85 / 4.60: migrate only target metadata and retain original artwork/approvals.
import fs from 'node:fs';
import path from 'node:path';
const arg=process.argv.indexOf('--katalog');if(arg<0)throw Error('--katalog fehlt.');
const root=path.resolve(process.argv[arg+1]);
const targets={
 'gedenktafel-22x14-schiefer-natur':['schiefer-tafeln-natur','GT-SN-RE-220X140'],
 'gedenktafel-22x14-schiefer-hunde-2027':['schiefer-tafeln-natur','GT-SN-RE-220X140'],
 'gedenktafel-30x20-schiefer-natur':['schiefer-tafeln-natur','GT-SN-RE-300X200'],
 'gedenktafel-30x20-schiefer-premium':['schiefer-tafeln-premium','GT-SP-RE-300X200']
};
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const rows=[];
const familyFiles=fs.readdirSync(path.join(root,'familien'),{recursive:true,withFileTypes:true}).filter(e=>e.isFile()&&e.name.endsWith('.json')).map(e=>read(path.join(e.parentPath,e.name)));
for(const entry of fs.readdirSync(path.join(root,'designs'),{recursive:true,withFileTypes:true})){
 if(!entry.isFile()||entry.name!=='design.json')continue;
 const file=path.join(entry.parentPath,entry.name),d=read(file);
 if(!d.ziele?.some(t=>targets[t.familie]))continue;
 const before=structuredClone(d.ziele),sizes=new Set(d.sizes??[]),mapped=new Map();
 for(const target of d.ziele){
  const next=targets[target.familie];if(next)sizes.add(next[1]);
  const t={...target,familie:next?.[0]??target.familie},other=mapped.get(t.familie);
  if(other&&JSON.stringify(other.freigabe)!==JSON.stringify(t.freigabe))throw Error(d.id+': unterschiedliche Freigaben für dasselbe Ziel; vorher klären.');
  mapped.set(t.familie,t);
 }
 d.ziele=[...mapped.values()];d.sizes=[...sizes];
 rows.push({id:d.id,file:path.relative(root,file).replaceAll('\\','/'),before,after:d.ziele,sizes:d.sizes});write(file,d);
}
const lines=[];
for(const name of fs.readdirSync(path.join(root,'linien')).filter(n=>n.endsWith('.json'))){
 const file=path.join(root,'linien',name),line=read(file);if(!line.families?.some(id=>targets[id]))continue;
 const keys=[...new Set(line.families.flatMap(id=>targets[id]?[targets[id][1]]:familyFiles.find(f=>f.id===id)?.sizes.map(s=>s.key)??[]))];
 line.families=[...new Set(line.families.map(id=>targets[id]?.[0]??id))];
 // Existing cuts remain their existing physical sizes, never all new plates.
 for(const sub of line.subcategories??[])if(!sub.sizesOffered)sub.sizesOffered=keys;
 write(file,line);lines.push(name);
}
const out=path.join(root,'auftraege/2026-11-04-schiefer-anschluss'),file=path.join(out,'designziel-migration.json');
const previous=fs.existsSync(file)?read(file):{rows:[],lines:[]};
const combined=[...new Map([...previous.rows,...rows].map(r=>[r.file,r])).values()];
const report={schema:'gravuru-slate-target-migration/v1',decision:'https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6618993147',designs:combined.length,lines:[...new Set([...previous.lines,...lines])],legacyFilesRetained:true,shopifyWrites:false,rows:combined};
fs.mkdirSync(out,{recursive:true});write(file,report);console.log(JSON.stringify({designsMigratedNow:rows.length,total:combined.length,lines,legacyFilesRetained:true}));
