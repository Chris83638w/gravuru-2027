const states={queued:'Wartet',running:'Wird erstellt',completed:'Fertig',failed:'Fehlgeschlagen'};
export const outputDate=value=>new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(value));
export function outputLabel(job){
 const s=job.settings,type=s.mode?(s.mode==='vector'?'Vektorgravur':'Rastergravur'):(s.profile==='mimaki'?'Mimaki':'Roland');
 const white=s.mode?'':s.white==='none'?' · ohne Weiß':s.white==='full'?' · vollflächiges Weiß':' · Weiß unter Druck';
 return `${states[job.status]||job.status} · ${type} · ${s.dpi} dpi${white}`;
}
export function jobLink(id,position){return '/werkstatt/ausgaben/?'+new URLSearchParams({...id?{job:id}:{},...position?{position}:{}});}
export function statusNote(status){return (status?.label||'Status offen')+' · Testbestellung. '+(status?.requiresReview?'Vor weiterer Bearbeitung prüfen. ':'')+'Keine Fertigungs- oder Kunden-Downloadfreigabe.';}
