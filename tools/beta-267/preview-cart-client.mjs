const list=document.querySelector('ul'),notice=document.querySelector('#notice');
const euro=cents=>(cents/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
async function load(url='/beta-warenkorb/daten',method='GET'){
  const response=await fetch(url,{method,cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Der Warenkorb konnte nicht geladen werden.');
  const rows=data.items.map(item=>{
    const row=document.querySelector('#position').content.firstElementChild.cloneNode(true);
    row.dataset.position=item.key;row.dataset.revision=String(item.revision);
    row.querySelector('h2').textContent=item.title;
    row.querySelector('.design').textContent=item.design;
    row.querySelector('.text').textContent=item.text||'';
    row.querySelector('.options').textContent=[...new Set([item.format,...item.options])].join(' · ');
    row.querySelector('.quantity').textContent='Menge '+item.quantity+' · Einzelpreis '+euro(item.unitCents);
    row.querySelector('.price').textContent=euro(item.totalCents);
    const img=row.querySelector('img'),message=row.querySelector('figure span'),zoom=row.querySelector('.zoom');
    img.alt='Persönliche Vorschau für '+(item.text||item.design);
    zoom.setAttribute('aria-label','Persönliche Vorschau vergrößern: '+(item.text||item.design));
    zoom.onclick=()=>{const dialog=document.querySelector('dialog'),large=dialog.querySelector('img');large.src=img.src;large.alt=img.alt;dialog.querySelector('p').textContent=item.text||item.design;dialog.showModal();};
    img.onload=async()=>{try{await img.decode();message.hidden=true;img.hidden=false;zoom.hidden=false;}catch{message.textContent='Vorschau konnte nicht geladen werden.';}};
    img.onerror=()=>{message.textContent='Vorschau konnte nicht geladen werden.';};
    img.src=item.image;
    const remove=row.querySelector('.end button');
    remove.setAttribute('aria-label','Position entfernen: '+(item.text||item.design));
    remove.onclick=async()=>{remove.disabled=true;try{await load('/beta-warenkorb/daten/'+encodeURIComponent(item.key),'DELETE');}catch(e){notice.textContent=e.message;remove.disabled=false;}};
    return row;
  });
  list.replaceChildren(...rows);document.querySelector('#total').textContent=euro(data.totalCents);
  notice.textContent=rows.length?'':'Ihr Warenkorb ist leer.';
}
load().catch(e=>{notice.textContent=e.message;});
