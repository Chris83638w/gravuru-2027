import {uiIcon} from './ui-icons.mjs';
import {executionKind} from './execution-registry.mjs';
import {money} from './contract.mjs';
export function motifPriceDescription(config){
 const fee=config?.extraMotifCents??169,price=money(fee).replaceAll('\u00a0',' ');
 // Existing saved revisions remain readable with their original price contract.
 if(config?.motifCharge==='all')return `Jedes sichtbare Motiv kostet ${price} je Produkt – auch das Motiv der Vorlage.`;
 return fee===0?'Motive sind im Preis enthalten.':`Das Motiv der Vorlage ist im Preis enthalten. Jedes weitere oder geänderte Motiv: +${price}.`;
}
// Explanations describe only the selected product's stored rules.
export function decisionHelp(kind,config,geometry=config.profile.geometry){
 const p=config.profile,material=p.material||{},mm=n=>Number(n).toLocaleString('de-DE');
 const descriptions={
  material:['Material',`Du gestaltest ${material.name||({steel:'Edelstahl',slate:'Schiefer',acrylic:'Acrylglas',wood:'Holz'}[material.kind]||'das gewählte Material')}.${Number.isFinite(material.thicknessMm)?' Die Platte ist '+mm(material.thicknessMm)+' mm dick.':''} Die Bildschirmdarstellung dient zur Orientierung; Oberflächen und Farben können am fertigen Produkt abweichen.`],
  size:['Größe',`Die gewählte Platte misst ${mm(geometry.width)} × ${mm(geometry.height)} mm. Die Vorschau zeigt ihre Form. Prüfe vor dem Bestellen, ob das Maß an deinen vorgesehenen Platz passt.`],
  mounting:['Befestigung','Wähle die Befestigung passend zum Montageort. Die Kacheln zeigen die verfügbaren Bohrungen und Zubehörteile samt Aufpreis. Nur die gewählte Ausführung wird bestellt.'],
  font:['Schrift','Tippe eine Textzeile an. Darunter kannst du Schrift und Größe ändern. Die Größe wird in Millimetern auf dem Schild angegeben. In der Schriftauswahl siehst du die echten Buchstaben der jeweiligen Schrift.'],
  motif:['Motive',motifPriceDescription(config)],
  photo:config.logo?.vectorUpload===true?[config.photo.enabled?'Foto / Logo':'Logo',`Lade ein SVG-Vektorlogo bis 2 MB hoch. Mehrfarbige Flächen werden zu schwarzen Gravurflächen; weiße Aussparungen bleiben frei. Prüfe die Vorschau vor dem Übernehmen. ${config.photo.enabled?`Fotos kannst du separat als JPG, PNG oder WebP bis 15 MB hinzufügen; je Foto ${money(config.photo.extraPriceCents)}.`:'Fotos sind bei diesem Produkt nicht freigegeben.'} Je Logo ${money(config.logo.extraPriceCents)}.`]:['Foto','Verwende möglichst das Originalfoto mit guter Auflösung. Du kannst den Ausschnitt bearbeiten. Bei Schiefer und Acrylglas mit Gravur wird dein Upload zunächst in Graustufen gezeigt; unter „Bearbeiten“ kannst du das Original wiederherstellen. Vorlagenbilder bleiben unverändert.']
 };
 return {title:descriptions[kind][0],text:descriptions[kind][1]};
}
export function installDecisionHelp({el,r,config}){
 if(!config)return;
 const dialog=document.createElement('dialog');dialog.className='ux-info-dialog';dialog.innerHTML='<h2></h2><p></p><button type="button">Verstanden</button>';r.append(dialog);dialog.querySelector('button').addEventListener('click',()=>dialog.close());
 function info(kind){
  const b=document.createElement('button'),help=decisionHelp(kind,config);b.type='button';b.className='ux-info-button';b.innerHTML=uiIcon('info');b.dataset.uxInfo=kind;b.setAttribute('aria-label','Information zu '+help.title);
  b.addEventListener('click',()=>{const current=decisionHelp(kind,config,el.uxProfileGeometry?.()||config.profile.geometry);dialog.querySelector('h2').textContent=current.title;dialog.querySelector('p').textContent=current.text;dialog.showModal();});return b;
 }
 function headingInfo(selector,kind){const heading=r.querySelector(selector);if(heading){heading.classList.add('ux-info-heading');heading.append(info(kind));}}
 headingInfo('#ux-panel-text h2','font');headingInfo('#ux-panel-upload h2','photo');
 // These terms explain the three product properties even when a product has
 // only one material/size and therefore no corresponding selection control.
 const options=r.querySelector('#ux-panel-options h2');
 if(options){const row=document.createElement('div');row.className='ux-info-links';for(const kind of (executionKind(config)==='stake'?['size']:['material','size','mounting'])){const term=document.createElement('span');term.className='ux-info-term';term.append(document.createTextNode(decisionHelp(kind,config).title),info(kind));row.append(term);}options.after(row);}
 // Keep each existing navigation button and its listeners intact. The help is
 // a sibling directly beside its term, never a nested button or a trailing row.
 const nav=r.querySelector('.completion-motif-nav');
 if(nav){for(const action of [...nav.querySelectorAll('button[data-ux]')]){const term=document.createElement('span');term.className='ux-info-term';action.before(term);term.append(action,info('motif'));}}
 else headingInfo('.workflow-motif-entry h2','motif');
 headingInfo('.ux-motif-browser-dialog h2','motif');
}
