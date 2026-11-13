(() => {
 'use strict';
 const buttons=[...document.querySelectorAll('[data-filter]')];
 const items=[...document.querySelectorAll('[data-material]')];
 buttons.forEach(button=>button.addEventListener('click',()=>{
  const filter=button.dataset.filter;
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  items.forEach(item=>{item.hidden=filter!=='all'&&item.dataset.material!==filter;});
  const count=document.querySelectorAll('.product:not([hidden])').length;
  document.getElementById('filter-count').textContent=`${count} von 6 Produkten`;
 }));
 const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
 function renderStatus(data){
  if(data?.schema!=='gravuru-cart-review/v1'||!['pending','passed','failed','partial'].includes(data.status)||typeof data.title!=='string'||typeof data.message!=='string')throw Error('Unpassender Prüfbeleg');
  const title=document.getElementById('cart-title');title.textContent=data.title;title.dataset.state=data.status;
  document.getElementById('cart-message').textContent=data.message;
  const details=document.getElementById('cart-details');details.replaceChildren();
  if(data.observedAt)details.append(node('p',`Stand des Belegs: ${data.observedAt}`));
  if(Array.isArray(data.checks)&&data.checks.length){const list=node('ul','');list.className='cart-checks';for(const check of data.checks){if(typeof check.label==='string'&&typeof check.result==='string')list.append(node('li',`${check.label}: ${check.result}`));}details.append(list);}
  if(Array.isArray(data.evidence)){for(const entry of data.evidence){if(typeof entry.label!=='string'||typeof entry.url!=='string')continue;let url;try{url=new URL(entry.url,location.href);}catch{continue;}if(!['http:','https:','file:'].includes(url.protocol))continue;const p=node('p','');const a=node('a',entry.label);a.href=url.href;a.target='_blank';a.rel='noopener';p.append(a);details.append(p);}}
 }
 document.getElementById('cart-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  const note=document.getElementById('cart-file-note');
  try{if(file.size>1000000)throw Error('Prüfbeleg zu groß');renderStatus(JSON.parse(await file.text()));note.textContent='Prüfbeleg für diese Ansicht geladen. Die Datei wurde nicht verändert.';}
  catch{note.textContent='Prüfbeleg konnte nicht gelesen werden. Der bisherige Status bleibt bestehen.';}
 });
 if(location.protocol==='http:'||location.protocol==='https:')fetch('data/cart-review.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Statusdatei fehlt');return r.json();}).then(renderStatus).catch(()=>{document.getElementById('cart-file-note').textContent='Der aktualisierte Prüfbeleg ist nicht verfügbar; es wird kein Testerfolg behauptet.';});
})();
