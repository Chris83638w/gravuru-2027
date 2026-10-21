import {merchantRequest} from './merchant-request.mjs';

let active;
const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};

export async function openRevisionCompare({id,from,to}){
  active?.close();
  if(!document.querySelector('link[data-revision-compare]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/workshop-ui/revision-compare.css';link.dataset.revisionCompare='';document.head.append(link);}
  const origin=document.activeElement,dialog=node('dialog',undefined,'revision-compare'),controller=new AbortController();active=dialog;
  const heading=node('h2',`Stand ${from} mit Stand ${to} vergleichen`);heading.id='revision-compare-title';dialog.setAttribute('aria-labelledby',heading.id);
  const close=node('button','Schließen');close.type='button';close.addEventListener('click',()=>dialog.close());
  const header=node('header');header.append(heading,close);
  const note=node('p','Nur gespeicherte Produktdaten und ihre gesicherten Zuordnungen. Ungespeicherte Änderungen, Bestellungen und aktuelle Shop-Daten gehören nicht zu diesem Vergleich.');
  const status=node('p','Gespeicherte Stände werden verglichen …');status.setAttribute('role','status');
  const content=node('div');dialog.append(header,note,status,content);document.body.append(dialog);
  dialog.addEventListener('close',()=>{controller.abort();dialog.remove();if(active===dialog){active=null;if(origin?.isConnected)origin.focus();}},{once:true});
  dialog.showModal();close.focus();
  try{
    const response=await merchantRequest(`/api/workshop/products/${encodeURIComponent(id)}/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,{signal:controller.signal,cache:'no-store'});
    const result=await response.json();if(!response.ok)throw Error(result.error?.message||'Die Stände konnten nicht verglichen werden.');
    if(controller.signal.aborted)return;
    status.textContent=result.total?`${result.total} Unterschiede${result.truncated?` · angezeigt werden die ersten ${result.limit}`:''}.`:'Diese gespeicherten Stände haben dieselben Produktdaten und Zuordnungen.';
    if(!result.total)return;
    const table=node('table'),head=node('thead'),row=node('tr');
    for(const title of ['Änderung',`Stand ${result.from.revision}`,`Stand ${result.to.revision}`]){const cell=node('th',title);cell.scope='col';row.append(cell);}head.append(row);table.append(head);
    const body=node('tbody');
    for(const change of result.changes){
      const row=node('tr'),label=node('th',change.label);label.scope='row';label.append(node('small',({added:'Hinzugefügt',removed:'Entfernt',changed:'Geändert'})[change.kind]));row.append(label);
      for(const value of [change.before,change.after]){const cell=node('td',value.text);if(value.sha256)cell.append(node('small','Großer oder strukturierter Inhalt · zusammengefasst'));row.append(cell);}body.append(row);
    }
    table.append(body);content.append(table);
  }catch(error){if(!controller.signal.aborted){status.textContent=error.message||'Vergleich fehlgeschlagen. Bitte erneut öffnen.';status.setAttribute('role','alert');}}
}
