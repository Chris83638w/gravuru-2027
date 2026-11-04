// Ergänzt "sizes" (und bei Übertrag die Formatreihe) nach app/workshop/slate-design-targets.mjs aus gravuru-2027 #170.
// Aufruf: node slate-sizes.mjs <code-repo> <katalog> <reihen-praefix> <plan.json>  → danach python3 slate-sizes-apply.py <plan.json>
import fs from 'node:fs';import path from 'node:path';
const [code,kat,prefix]=process.argv.slice(2);
const {slateFormatSizes}=await import(path.resolve(code,'app/workshop/slate-design-targets.mjs'));
const fam=Object.fromEntries(['natur','premium','geschnitten','kordel'].map(k=>{const f=JSON.parse(fs.readFileSync(path.join(kat,'familien/schiefer/schiefer-tafeln-'+k+'.json'),'utf8'));return [f.id,f];}));
const REIHE={'re-150x100':'rechteck-3-2','re-400x300':'rechteck-4-3','re-300x100':'rechteck-3-1','re-380x130':'rechteck-3-1','re-560x180':'rechteck-3-1','re-400x200':'rechteck-2-1','qu-200x200':'quadrat','rund-200':'rund','re-220x140':'rechteck-220x140','re-70x20':'rechteck-70x20','re-80x35':'rechteck-80x35','re-80x50':'rechteck-80x50'};
const stat={},plan={};
for(const dir of fs.readdirSync(path.join(kat,'designs')).filter(n=>n.startsWith(prefix))){
 for(const name of fs.readdirSync(path.join(kat,'designs',dir))){
  const file=path.join(kat,'designs',dir,name,'design.json');if(!fs.existsSync(file))continue;
  const d=JSON.parse(fs.readFileSync(file,'utf8'));if(!d.ziele?.length){stat.ohneZiel=(stat.ohneZiel||0)+1;continue;}
  const kurz=dir.replace('schiefer-tuerschilder-','');if(prefix.includes('tuerschilder')&&REIHE[kurz])d.formatreihe=REIHE[kurz];
  const keys=d.ziele.flatMap(z=>slateFormatSizes(d,fam[z.familie]).map(s=>s.key));
  const k=keys.length?'mitSpec':'ohneSpec';stat[k]=(stat[k]||0)+1;
  if(keys.length){const old=d.sizes??[];d.sizes=prefix.includes('tuerschilder')?old.filter(x=>keys.includes(x)):keys;}
  plan[file]={formatreihe:d.formatreihe,sizes:d.sizes??null};
 }
}
fs.writeFileSync(process.argv[5],JSON.stringify(plan));console.log(prefix,JSON.stringify(stat));
