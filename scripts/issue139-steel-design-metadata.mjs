// Synchronize the four explicitly requested corrections from their authoritative
// design.json into existing indexes. No design creation, publication or source reimport.
import fs from 'node:fs';import path from 'node:path';
const root=process.argv[2];if(!root)throw Error('Katalogpfad fehlt');
const groups={'edelstahl-gravur-80x80':['TQ-V2A-8x8-D14'],'edelstahl-gravur-oval-90x60':['TO-V2A-9x6-D38'],'edelstahl-gravur-80x53':['TRE-V2A-8x5-D57','TRE-V2A-8x5-D61']};
for(const [series,ids] of Object.entries(groups)){
 const dir=path.join(root,'designs',series),file=path.join(dir,'index.json'),index=JSON.parse(fs.readFileSync(file,'utf8'));let overview=fs.readFileSync(path.join(dir,'UEBERSICHT.md'),'utf8');
 for(const id of ids){const d=JSON.parse(fs.readFileSync(path.join(dir,id,'design.json'),'utf8')),e=index.find(e=>e.key===id);if(!e)throw Error('Index fehlt: '+id);
  e.schriften=d.fonts;e.warnungen=d.warnings;e.groessen=d.sizes;
  const hints=[...(e.pruefen?[e.pruefen]:[]),...e.warnungen,...(e.produktionWeitereBoegen?.length?['Produktionsfassung auch auf '+e.produktionWeitereBoegen.join(', ')]:[])];
  const row=`| ${e.key} | ${e.name} | ${e.nameSheet} | ${e.themen.join(', ')} | ${e.themenVorschlag.join(', ')} | ${e.groessen.length}${e.groessenOffen.length?' + offen: '+e.groessenOffen.join(', '):''} | ${e.nichtWaehlbar.join(', ')} | ${e.schriften.join(', ')} | ${e.produktion?'ja':''} | ${hints.join('; ')} |`;
  const lines=overview.split('\n'),at=lines.findIndex(l=>l.startsWith('| '+id+' |'));if(at<0)throw Error('Übersicht fehlt: '+id);lines[at]=row;overview=lines.join('\n');
 }
 fs.writeFileSync(file,JSON.stringify(index,null,1)+'\n');fs.writeFileSync(path.join(dir,'UEBERSICHT.md'),overview);
}
console.log('4 Designeinträge in 3 Reihen abgeglichen.');
