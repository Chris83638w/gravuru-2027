import {getProcessingProfile} from '../../platform/sources/app/shared/models/processing-profiles.mjs';
import {mountingAccessIssues} from '../../platform/sources/app/shared/models/mounting-access.mjs';
// Customer hints never change manufacturing validation or imply a production release.
export const normalized = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ß/g,'ss');
const concepts = [
 ['hund','hunde','dog','dogs','labrador','dackel','welpe','pfote'],
 ['katze','katzen','cat','cats','kitten','kater'],
 ['erinnerung','gedenken','trauer','abschied','gedenktafel','engel','regenbogen','memorial'],
 ['liebe','hochzeit','herz','herzen','love','heart'],
 ['natur','wald','baum','baume','tree','blatt','blatter','leaf','zweig'],
 ['blume','blumen','blute','flower','floral','rose'],
 ['wasser','water','meer','see','strand','maritim','welle','wellen','wave','waves','anker','anchor','boot','schiff','segel','leuchtturm','lighthouse','fisch','fische','fish','muschel','muscheln','seestern'],
 ['vogel','vogel','bird','birds','taube'],
 ['pferd','pferde','horse','horses','reiten'],
 ['haus','zuhause','home','house','familie','family']
];
export function inThemeCategory(entry,theme){
 const wanted=(Array.isArray(theme?.motifCategories)?theme.motifCategories:[]).map(c=>String(c??'').trim().toLocaleLowerCase('de'));
 const category=String(entry?.category??'').trim().toLocaleLowerCase('de');
 return !!category&&wanted.includes(category);
}
// K9/V4: Motive aus den Kategorien des Produktthemas (`theme.motifCategories`) stehen
// bei gleicher Trefferqualität vorn; ohne Suchbegriff damit zuerst in der Bibliothek.
export function motifScore(entry, query, theme=null) {
 const bonus=inThemeCategory(entry,theme)?.5:0;
 const terms=normalized(query).split(/[^a-z0-9]+/).filter(t=>t&&!['ein','eine','einen','mit','fur','und','das','der','die'].includes(t));
 if(!terms.length)return 1+bonus;
 const name=normalized(entry.name), corpus=normalized([entry.name,entry.category,...(entry.tags||[])].join(' '));
 let score=0;
 for(const term of terms){if(name.includes(term)){score+=8;continue;}if(corpus.includes(term)){score+=4;continue;}
  const related=concepts.filter(group=>group.includes(term)).flat();
  if(related.some(word=>corpus.split(/[^a-z0-9]+/).includes(word)))score+=1;else return 0;
 }return score+bonus;
}
export function editableTexts(objects){return objects.filter(o=>o.type==='text'&&!o.uxHidden&&!o.uxLocked&&!o.technicalLocked&&o.customerEditable!==false);}
export function centerTexts(objects,ids,center){for(const o of editableTexts(objects))if(ids.includes(o.id))o.x=center;}
export function corners(o){const a=(o.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:o.x+x*o.w/2*c-y*o.h/2*s,y:o.y+x*o.w/2*s+y*o.h/2*c}));}
export function overlaps(a,b){const pa=corners(a),pb=corners(b);for(const p of [pa,pb])for(let i=0;i<2;i++){const edge={x:p[i+1].x-p[i].x,y:p[i+1].y-p[i].y},axis={x:-edge.y,y:edge.x};const dot=v=>v.x*axis.x+v.y*axis.y,aa=pa.map(dot),bb=pb.map(dot);if(Math.min(...aa)>=Math.max(...bb)-1e-6||Math.min(...bb)>=Math.max(...aa)-1e-6)return false;}return true;}
export function overlapHints(objects){const list=objects.filter(o=>!o.uxHidden&&!o.uxDecoration&&o.w>0&&o.h>0&&!(o.type==='text'&&!o.text?.trim()));const hints=[];for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(overlaps(list[i],list[j]))hints.push({code:'overlap',ids:[list[i].id,list[j].id],message:'Die markierten Elemente überlagern sich. Bitte die Gestaltung prüfen.'});return hints;}
export function mechanicalHints(profile,state){
 return mountingAccessIssues(profile,{frameKey:state.fkFrame,mountingKey:state.fkMounting}).map(issue=>({...issue,ids:[]}));
}
export function hintKey(hint,objects,context){return JSON.stringify([hint.code,hint.ids.map(id=>objects.find(o=>o.id===id)).map(o=>o&&[o.id,o.x,o.y,o.w,o.h,o.rotation,o.text,o.font,o.uxHidden]),hint.hole||null,context]);}


// Überlagerungen, die schon in der unveränderten Vorlage bestehen, sind vom Designer gewollt (Rosenranke
// hinter dem Spruch, Kreuz über dem Datumsstrich): kein Hinweis, solange keines der beteiligten Elemente
// verschoben, gedreht oder skaliert wurde. Der Textinhalt zählt dabei nicht (Kunde tippt Name/Daten).
export function templateOverlap(ids,objects,design){
 if(!Array.isArray(design?.objects)||!ids?.length)return false;
 const near=(a,b)=>Math.abs((a??0)-(b??0))<0.01;
 return ids.every(id=>{const o=objects.find(o=>o.id===id),t=design.objects.find(t=>t.id===id);
  return !!o&&!!t&&near(o.x,t.x)&&near(o.y,t.y)&&near(o.rotation,t.rotation)&&(o.type==='text'?near(o.size,t.size):near(o.w,t.w)&&near(o.h,t.h));});
}

// Master rule: printed layers may intentionally overlap; mechanical warnings are independent.
export function showOverlapWarnings(profile){
 if(profile?.kind==='layered-doorbell'&&!profile.processing)return true;
 try{return getProcessingProfile(profile).method==='engraving';}catch{return false;}
}
