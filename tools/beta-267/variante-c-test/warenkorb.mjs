const ref=new URLSearchParams(location.hash.slice(1)),handoff=ref.get('handoff'),test=ref.get('test');
history.replaceState(null,'',location.pathname);
const price=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n/100);
const $=q=>document.querySelector(q), note=$('#status'), list=$('#positionen'), dialog=$('#gross');
function node(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e;}
async function api(path,body){
  const r=await fetch(path,body?{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Variante-C-Test':'1'},body:JSON.stringify(body)}:{credentials:'same-origin',cache:'no-store'});
  const data=await r.json();if(!r.ok)throw Error(data.message||'Der Warenkorb konnte nicht geprüft werden.');return data;
}
dialog.querySelector('button').onclick=()=>dialog.close();
function render(cart){
  list.replaceChildren();note.textContent=cart.items.length?'Bei Shopify bestätigt.':'Dein Testwarenkorb ist leer.';
  for(const item of cart.items){
    const row=node('article'), photo=node('button'), img=node('img');photo.type='button';img.src=item.image;img.alt='Persönliche Gestaltung vergrößern';photo.append(img);photo.onclick=()=>{dialog.querySelector('img').src=item.image;dialog.showModal();};
    row.dataset.configuration=item.configuration;row.dataset.variant=item.variant;
    const details=node('div');details.append(node('h2',item.product),node('p',[item.design,item.format,...item.texts].filter(Boolean).join(' · ')),node('small','Artikelnummer '+item.sku),node('p',item.quantity+' × · '+price(item.amount)));
    const remove=node('button','Entfernen');remove.onclick=async()=>{remove.disabled=true;try{render(await api('entfernen',{key:item.key}));}catch(e){note.textContent=e.message;remove.disabled=false;}};
    details.append(remove);row.append(photo,details);list.append(row);
  }
  $('#summe').textContent=cart.items.length?'Gesamt '+price(cart.total):'';
}
let posted=false;
async function open(){
  $('#erneut').hidden=true;
  try{let cart;if(handoff&&!posted){cart=await api('uebernehmen',{handoff,test});posted=true;}else cart=await api('positionen');render(cart);}
  catch(e){note.textContent=e.message;$('#erneut').hidden=false;}
}
$('#erneut').onclick=open;open();
