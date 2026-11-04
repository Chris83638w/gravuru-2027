import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {slateFormatSizes,slateDesignGroup,SLATE_DESIGN_DECISION} from '../app/workshop/slate-design-targets.mjs';
const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1];
if(!args.includes('--katalog'))throw Error('--katalog fehlt');
const root=path.resolve(value('--katalog')),apply=args.includes('--write');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const out=path.resolve(args.includes('--out')?value('--out'):path.join(root,'auftraege/2026-11-04-schiefer-designziele/zuordnung.json'));
const previous=fs.existsSync(out)?new Map((read(out).rows??[]).filter(r=>r.status==='mapped-unapproved'&&r.afterHash).map(r=>[r.file,r])):new Map();
const families=['natur','premium','geschnitten','kordel'].map(k=>read(path.join(root,'familien/schiefer/schiefer-tafeln-'+k+'.json')));
const dirs=fs.readdirSync(path.join(root,'designs')).filter(n=>/^(schiefer-(tiere|menschen|sternenkinder|kordel)-|gedenktafeln-(22x14|30x20)$|monogramme-schiefer-)/.test(n));
const rows=[];
for(const dir of dirs)for(const name of fs.readdirSync(path.join(root,'designs',dir))){
 const rel='designs/'+dir+'/'+name+'/design.json',file=path.join(root,rel);if(!fs.existsSync(file))continue;
 const d=read(file),beforeHash=hash(file),row={file:rel,id:d.id,format:d.formatreihe??null,group:slateDesignGroup(d),beforeHash};
 if(dir.startsWith('schiefer-menschen-')){rows.push({...row,status:'delegated-unchanged',reason:'Claude Schiefer übernimmt diese Reihe vollständig, #85 Kommentar 6626733037.'});continue;}
 if(previous.has(rel)){const old=previous.get(rel);if(beforeHash!==old.afterHash)throw Error('Design seit der Zuordnung geändert; nicht überschrieben: '+rel);rows.push(old);continue;}
 if(d.ziele?.length){rows.push({...row,status:'existing-unchanged',targets:d.ziele});continue;}
 let matches=families.flatMap(f=>slateFormatSizes(d,f).map(s=>({family:f.id,size:s.key,label:s.label})));
 // Two historical horse designs have no format field, but an exact 22x14 source plate.
 if(dir==='gedenktafeln-22x14'&&d.plateMm?.[0]===220&&d.plateMm?.[1]===140)matches=[{family:'schiefer-tafeln-natur',size:'GT-SN-RE-220X140',label:'22 × 14 cm'}];
 if(!matches.length){rows.push({...row,status:'unassigned',reason:'Keine eindeutige Zieltafel für diese Quellformatreihe.'});continue;}
 const after={...d,ziele:[...new Set(matches.map(m=>m.family))].map(familie=>({familie,freigabe:null})),sizes:[...new Set([...(d.sizes??[]),...matches.map(m=>m.size)])]};
 if(apply)fs.writeFileSync(file,JSON.stringify(after,null,2)+'\n');
 rows.push({...row,status:'mapped-unapproved',targets:after.ziele,sizes:matches,afterHash:apply?hash(file):null,sourceMode:d.provenance?.mode??d.mode??'1:1',fonts:d.fonts??[],source:d.provenance?.source??d.source??rel});
}
const counts={total:rows.length,existingUnchanged:rows.filter(r=>r.status==='existing-unchanged').length,delegatedUnchanged:rows.filter(r=>r.status==='delegated-unchanged').length,mapped:rows.filter(r=>r.status==='mapped-unapproved').length,unassigned:rows.filter(r=>r.status==='unassigned').length,newFamilyTargets:rows.filter(r=>r.status==='mapped-unapproved').reduce((n,r)=>n+r.targets.length,0),newSizeAssignments:rows.reduce((n,r)=>n+(r.sizes?.length??0),0)};
const report={schema:'gravuru-slate-design-targets/v1',decision:SLATE_DESIGN_DECISION,applied:apply,counts,approvalsSet:0,artworkChanged:0,rows};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({counts,report:out}));
