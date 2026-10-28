import {money} from './contract.mjs';
// Explanations describe only the selected product's stored rules.
export function decisionHelp(kind,config,geometry=config.profile.geometry){
 const p=config.profile,material=p.material||{},mm=n=>Number(n).toLocaleString('de-DE');
 const descriptions={
  material:['Material',`Du gestaltest ${material.name||({steel:'Edelstahl',slate:'Schiefer',acrylic:'Acrylglas',wood:'Holz'}[material.kind]||'das gewählte Material')}.${Number.isFinite(material.thicknessMm)?' Die Platte ist '+mm(material.thicknessMm)+' mm dick.':''} Die Bildschirmdarstellung dient zur Orientierung; Oberflächen und Farben können am fertigen Produkt abweichen.`],
  size:['Größe',`Die gewählte Platte misst ${mm(geometry.width)} × ${mm(geometry.height)} mm. Die Vorschau zeigt ihre Form. Prüfe vor dem Bestellen, ob das Maß an deinen vorgesehenen Platz passt.`],
  mounting:['Befestigung','Wähle die Befestigung passend zum Montageort. Die Kacheln zeigen die verfügbaren Bohrungen und Zubehörteile samt Aufpreis. Nur die gewählte Ausführung wird bestellt.'],
  font:['Schrift','Tippe eine Textzeile an. Darunter kannst du Schrift und Größe ändern. Die Größe wird in Millimetern auf dem Schild angegeben. In der Schriftauswahl siehst du die echten Buchstaben der jeweiligen Schrift.'],
  motif:['Motive',config.motifCharge==='all'?`Jedes sichtbare Motiv kostet ${money(config.extraMotifCents)} je Produkt – auch das Motiv der Vorlage. Der Gesamtpreis wird bei Änderungen neu berechnet.`:config.extraMotifCents>0?`Motive der Vorlage sind enthalten. Jedes zusätzlich gewählte Motiv kostet ${money(config.extraMotifCents)} je Produkt.`:'Für Motive ist in diesem Produktstand kein Aufpreis hinterlegt.'],
  photo:['Foto','Verwende möglichst das Originalfoto mit guter Auflösung. Du kannst den Ausschnitt bearbeiten. Bei Schiefer und Acrylglas mit Gravur wird dein Upload zunächst in Graustufen gezeigt; unter „Bearbeiten“ kannst du das Original wiederherstellen. Vorlagenbilder bleiben unverändert.']
 };
 return {title:descriptions[kind][0],text:descriptions[kind][1]};
}
export function installDecisionHelp({el,r,config}){
 if(!config)return;
 const dialog=document.createElement('dialog');dialog.className='ux-info-dialog';dialog.innerHTML='<h2></h2><p></p><button type="button">Verstanden</button>';r.append(dialog);dialog.querySelector('button').addEventListener('click',()=>dialog.close());
 const groups=[['#ux-panel-options h2',['material','size','mounting']],['#ux-panel-text h2',['font']],['.workflow-motif-entry',['motif']],['#ux-panel-upload h2',['photo']]];
 for(const [selector,kinds] of groups){const heading=r.querySelector(selector);if(!heading)continue;const row=document.createElement('div');row.className='ux-info-links';for(const kind of kinds){const b=document.createElement('button'),help=decisionHelp(kind,config);b.type='button';b.textContent=help.title+' ⓘ';b.setAttribute('aria-label','Information zu '+help.title);b.addEventListener('click',()=>{const current=decisionHelp(kind,config,el.uxProfileGeometry?.()||config.profile.geometry);dialog.querySelector('h2').textContent=current.title;dialog.querySelector('p').textContent=current.text;dialog.showModal();});row.append(b);}if(heading.classList.contains('workflow-motif-entry'))heading.append(row);else heading.after(row);}
}
