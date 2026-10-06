const node=(tag,text)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
const types={fonts:'Schriften',motifs:'Motive',colors:'Farben',bestsellers:'Bestseller'};
const sources={default:'Standard',category:'Kategorie',product:'Eigene Produktzuordnung',unbound:'Produkteigene Auswahl'};
export function confirmProfileImpact(review,catalog){
  const dialog=node('dialog');dialog.className='revision-compare';dialog.setAttribute('aria-labelledby','profile-impact-title');
  const heading=node('h2','Auswirkungen der Änderung');heading.id='profile-impact-title';
  const summary=node('p',`„${review.profile.name}“ · ${review.total} zugeordnete Produkte/Master. Bei ${review.changed} ändert sich die angebotene Auswahl.`);
  const note=node('p','Die Änderung gilt für die aktuelle Profilauswahl im Konfigurator. Gespeicherte historische Produktstände und Bestellungen bleiben erhalten. Archivierte Produkte sind gesondert markiert. Formprodukte verwenden diese Auswahlprofile nicht.');
  const list=node('div');
  const names=Object.fromEntries(['fonts','motifs'].map(type=>[type,new Map((catalog[type]||[]).map(item=>[item.id,item.name]))]));
  const selection=(type,items)=>{if(items===null)return 'Produktauswahl beibehalten';if(!items.length)return 'Keine';const labels=items.slice(0,20).map(id=>names[type==='bestsellers'?'motifs':type]?.get(id)||id);return labels.join(', ')+(items.length>20?` … (${items.length} insgesamt)`:'');};
  if(!review.total)list.append(node('p',review.kind==='assignment'?'Diese Zuordnung verändert derzeit keine wirksame Produktauswahl.':'Dieses Profil wird derzeit von keinem Produkt oder Master als wirksame Auswahl verwendet.'));
  for(const product of review.products.slice(0,100)){
    const section=node('section'),title=node('h3',`${product.name} · Stand ${product.revision}${product.kind==='master'?' · Master':''}${product.status==='archived'?' · archiviert':''}`);
    const sourceLabel=value=>sources[value.level]+(value.categoryId?` „${value.categoryId}“`:'');
    const changedSource=review.kind==='assignment'&&sourceLabel(product.source)!==sourceLabel(product.target);
    section.append(title,node('small',product.id),node('p',sourceLabel(product.source)+(changedSource?' → '+sourceLabel(product.target):'')));
    if(!product.selectionChanged)section.append(node('p','Die angebotene Auswahl bleibt gleich.'));
    for(const change of product.changes){const line=node('p');line.append(node('strong',types[change.type]+': '),node('span',selection(change.type,change.before)+' → '+selection(change.type,change.after)));section.append(line);}
    list.append(section);
  }
  if(review.total>100)list.append(node('p',`Angezeigt werden die ersten 100 von ${review.total} Zuordnungen.`));
  const actions=node('div');actions.className='dialog-actions';const cancel=node('button','Zurück zur Bearbeitung'),save=node('button','Änderung speichern');cancel.type=save.type='button';save.className='primary';actions.append(cancel,save);
  dialog.append(heading,summary,note,list,actions);document.body.append(dialog);
  return new Promise(resolve=>{
    let accepted=false;cancel.addEventListener('click',()=>dialog.close());save.addEventListener('click',()=>{accepted=true;dialog.close();});
    dialog.addEventListener('close',()=>{dialog.remove();resolve(accepted);},{once:true});dialog.showModal();cancel.focus();
  });
}
