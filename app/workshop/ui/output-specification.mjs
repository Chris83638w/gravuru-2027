const unknown='Nicht dokumentiert';
const bool=v=>typeof v==='boolean'?(v?'Ja':'Nein'):unknown;
const mm=v=>Number.isFinite(v)?`${v} mm`:unknown;
const names={profile:{roland:'Roland · RDG_WHITE',mimaki:'Mimaki · getrennte PDFs'},white:{motif:'Nur unter Druck: Text, Foto, Design und Elemente',full:'Vollflächig innerhalb der Kontur',none:'Kein Weiß'},mode:{vector:'Vektorgravur',raster:'Rastergravur'}};
export function specificationRows(job){
 const requested=job.settings||{},stored=job.outputSpecification?.settings||{},engraving=Boolean(requested.mode);
 const fields=engraving?[['mode','Verfahren'],['dpi','Auflösung'],['mirror','Gespiegelt']]:[['profile','Ausgabe­variante'],['dpi','Raster­auflösung'],['mirror','Gespiegelt'],['white','Weiß­unterlegung'],['bleedMm','Farb­überdruck'],['whiteBleedMm','Weiß­überdruck']];
 function format(k,s){if(k==='mirror')return bool(s[k]);if(k.endsWith('Mm'))return mm(s[k]);if(k==='dpi')return s.mode==='vector'?'Vektorpfade · keine Rasterauflösung':Number.isFinite(s[k])?`${s[k]} dpi`:unknown;return names[k]?.[s[k]]||unknown;}
 return fields.map(([key,label])=>({key,label,requested:format(key,requested),actual:job.status!=='completed'?'Noch keine fertige Ausgabe':format(key,stored),changed:job.status==='completed'&&Object.hasOwn(stored,key)&&Object.hasOwn(requested,key)&&stored[key]!==requested[key]}));
}
export function showOutputSpecification(job,root){
 const spec=job.outputSpecification;
 root.querySelector('tbody').replaceChildren(...specificationRows(job).map(row=>{
  const tr=document.createElement('tr');tr.dataset.setting=row.key;tr.classList.toggle('changed',row.changed);
  for(const [i,text] of [row.label,row.requested,row.actual+(row.changed?' · abweichend':'')].entries()){const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.textContent=text;tr.append(cell);}return tr;
 }));
 const p=spec?.profile;
 root.querySelector('[data-profile]').textContent=p?`Gesicherter Profilstand: ${p.name||unknown} · Revision ${p.revision??unknown}. Maschine: ${p.machine||'nicht eingetragen'}. RIP: ${p.rip||'nicht eingetragen'}.`:'Kein gesicherter Fertigungsprofilstand dokumentiert.';
 root.querySelector('[data-override]').textContent=spec?.profileSettingsOverridden===true?'Die angeforderten Einstellungen weichen vom gesicherten Fertigungsprofil ab.':'';
 root.querySelector('[data-edge]').textContent=typeof spec?.edgeInk==='boolean'?`Druck am Außenrand: ${bool(spec.edgeInk)}. Überdruck wird nur bei Randdruck angewendet.`:'';
 root.querySelector('[data-color]').textContent=spec?.colorConversion||'';
 root.querySelector('[data-warnings]').replaceChildren(...(spec?.warnings||[]).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
}
