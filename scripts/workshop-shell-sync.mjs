// B1: Schreibt die gemeinsame Werkstatt-Kopfzeile (app/workshop/workshop-shell-markup.mjs)
// in jede Werkstattseite zwischen die Markierungen. `--check` ändert nichts und meldet Abweichungen.
import fs from 'node:fs';
import {WORKSHOP_PAGES,withTopbar} from '../app/workshop/workshop-shell-markup.mjs';

const check=process.argv.includes('--check');let stale=0;
for(const page of WORKSHOP_PAGES){
  const file=new URL('../app/workshop/ui/'+page.file,import.meta.url),html=fs.readFileSync(file,'utf8'),next=withTopbar(html,page);
  if(next===html)continue;
  stale++;
  if(check)console.log('veraltet: '+page.file);else{fs.writeFileSync(file,next);console.log('aktualisiert: '+page.file);}
}
if(check&&stale)process.exitCode=1;
