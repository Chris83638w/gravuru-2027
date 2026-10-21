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
 ['meer','maritim','anker','anchor','boot','schiff','segel'],
 ['vogel','vogel','bird','birds','taube'],
 ['pferd','pferde','horse','horses','reiten'],
 ['haus','zuhause','home','house','familie','family']
];
export function motifScore(entry, query) {
 const terms=normalized(query).split(/[^a-z0-9]+/).filter(t=>t&&!['ein','eine','einen','mit','fur','und','das','der','die'].includes(t));
 if(!terms.length)return 1;
 const name=normalized(entry.name), corpus=normalized([entry.name,entry.category,...(entry.tags||[])].join(' '));
 let score=0;
 for(const term of terms){if(name.includes(term)){score+=8;continue;}if(corpus.includes(term)){score+=4;continue;}
  const related=concepts.filter(group=>group.includes(term)).flat();
  if(related.some(word=>corpus.includes(word)))score+=1;else return 0;
 }return score;
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


// Master rule: printed layers may intentionally overlap; mechanical warnings are independent.
export function showOverlapWarnings(profile){
 if(profile?.kind==='layered-doorbell'&&!profile.processing)return true;
 try{return getProcessingProfile(profile).method==='engraving';}catch{return false;}
}
