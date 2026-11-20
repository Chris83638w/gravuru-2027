import {createShopEntryClient,createShopResourceLoader} from '/konfigurator/shop/shop-entry-client.mjs';
import {installCards} from './c-karten.mjs';

const shop='gravuru-design.myshopify.com', product='gid://shopify/Product/16190784438652';
const config='cfg_ac514214-a313-4738-8008-00445ee1befd', revision=4;
const cartUrl='https://konfi-beta.gravuru-designwerkstatt.de/variante-c/warenkorb';
const $=s=>document.querySelector(s), note=$('#status'), gallery=$('#designs');
const shape=$('#form'), size=$('#groesse'), mount=$('#befestigung'), frame=$('iframe');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={RE:'Rechteck',AB:'Rechteck abgerundet',QU:'Quadrat',OV:'Oval',EL:'Ellipse',R:'Rund',RT1:'Retro 1',RT2:'Retro 2'};
const args=new URLSearchParams(location.hash.slice(1));
const test=args.get('test');
history.replaceState(null,'',location.pathname);
const check=(ok,reason)=>{if(!ok)throw Error(reason);};
const message=e=>{note.textContent=e.message;$('#neustart').hidden=false;};
const price=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n/100);
const toDataUrl=blob=>new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=rej;f.readAsDataURL(blob);});
function verify(data){
  check(data.shopDomain===shop&&data.binding?.shopifyProductId===product&&data.model.configuration.id===config&&data.model.configuration.revision===revision&&data.editorPath==='/_merchant-acryl-editor.html','Die freigegebene Produktrevision hat sich geändert.');
}
function setOptions(control,entries,preferred){
  control.replaceChildren(...entries.map(([key,label])=>new Option(label,key)));
  if(entries.some(([key])=>key===preferred))control.value=preferred;
}

async function start(){
  check(/^[a-f0-9]{48}$/.test(test||''),'Bitte über den geschützten Test öffnen.');
  const client=createShopEntryClient({token:args.get('s')}); args.delete('s');
  const first=await client.loadModel(); verify(first);
  const family=first.model.universal.familyFormats, formats=family.formats;
  const variant=f=>f.variants.find(v=>v.color===family.defaultColor);
  const formatsFor=()=>formats.filter(f=>f.form===shape.value&&variant(f));
  const initial=formats.find(f=>f.key===first.binding.options.size);
  check(initial,'Die freigegebene Startgröße ist nicht verfügbar.');
  setOptions(shape,[...new Set(formats.filter(variant).map(f=>f.form))].map(k=>[k,names[k]||k]),initial.form);
  let epoch=0, busy=false, selectedClient=client;
  const model={catalog:{designs:[]},state:{designId:''},chooseDesign:id=>choose(id).catch(message)};
  const links=new Map();
  const imageFor=card=>{
    if(card.previewUrl&&/^\/konfigurator\/shop\/vorschauen\/[a-f0-9]{64}\.svg$/.test(card.previewUrl))return card.previewUrl;
    return null;
  };
  const draw=installCards({gallery,el:model,esc,thumb:d=>{
    const src=imageFor(d)||links.get(d.target)?.url;
    return '<img alt="" '+(src?'src="'+esc(src)+'"':'data-missing="'+esc(d.id)+'"')+'>';}});
  const observer=new MutationObserver(()=>{
    for(const img of gallery.querySelectorAll('img[data-missing]')){
      const card=model.catalog.designs.find(d=>d.id===img.dataset.missing);if(!card)continue;
      img.removeAttribute('data-missing');
      if(!links.has(card.target)){
        const holder={}; links.set(card.target,holder);
        holder.ready=client.loadDesignPreview(card.target,card.previewUrl).then(blob=>holder.url=URL.createObjectURL(blob));
      }
      links.get(card.target).ready.then(url=>{if(img.isConnected)img.src=url;}).catch(()=>{img.alt='Vorschau gerade nicht verfügbar';});
    }
  }); observer.observe(gallery.querySelector('.c-gallery'),{childList:true});
  async function loadGallery(){
    const sequence=++epoch;
    gallery.hidden=true;note.textContent='Passende Designs werden geladen …';
    const options={size:size.value,mounting:mount.value};
    const data=await client.loadDesignGallery(0,'all',options);
    if(sequence!==epoch)return;
    const cards=data.items.filter(d=>d.shopifyProductId===product&&d.productId===config&&d.productRevision===revision);
    check(cards.length,'Für diese Ausführung ist noch kein Design freigegeben.');
    model.catalog.designs=cards.map(d=>({...d,id:d.designId,name:d.designName}));
    for(const item of links.values())if(item.url)URL.revokeObjectURL(item.url);
    links.clear();gallery.querySelector('input').value='';model.state.designId='';draw();
    $('#preis').textContent=price(cards[0].unitCents);gallery.hidden=false;note.textContent='';
  }
  function changeMount(preferred){
    const current=formatsFor().find(f=>f.key===size.value);
    setOptions(mount,variant(current).mounting.map(m=>[m.id,m.label+(m.priceCents?' (+'+price(m.priceCents)+')':'')]),preferred);
    return loadGallery();
  }
  function changeSize(preferred){setOptions(size,formatsFor().map(f=>[f.key,f.label]),preferred);return changeMount(mount.value||first.binding.options.mounting);}
  shape.addEventListener('change',()=>changeSize(null).catch(message));
  size.addEventListener('change',()=>changeMount(mount.value).catch(message));
  mount.addEventListener('change',()=>loadGallery().catch(message));
  async function choose(id){
    if(busy)return;
    const card=model.catalog.designs.find(d=>d.id===id);if(!card)return;
    busy=true;$('#optionen').inert=true;gallery.inert=true;note.textContent='Dein gewähltes Design wird geöffnet …';
    try{
      const switched=await client.switchDesign(card.target);
      selectedClient=createShopEntryClient({token:switched.token});
      const data=await selectedClient.loadModel(switched.designId); verify(data);
      check(data.binding.shopifyVariantId===card.shopifyVariantId&&switched.designId===card.id&&data.binding.options.size===size.value&&data.binding.options.mounting===mount.value,'Die Ausführung oder das Design stimmt nicht mit der Auswahl überein.');
      const native=data.model;
      window.GravuruLoadEditorJson=createShopResourceLoader();
      window.GravuruPreviewResources=await selectedClient.loadResources(native.universal,toDataUrl);
      window.UniversalConfig=native.universal;window.GravuruModelProfile=native.legacy;
      window.GravuruWorkshopReview={productId:config,productRevision:revision};
      window.GravuruMerchantRequest=selectedClient.request;
      window.GravuruShopEntry=Object.freeze({...window.GravuruWorkshopReview,shopDomain:shop,shopifyProductId:product,shopifyVariantId:card.shopifyVariantId,productName:native.name,csrfToken:'shop-entry',presentation:'prio-r15',request:selectedClient.request,cartMode:'theme',themeCartPath:data.themeCartPath,backUrl:'https://konfi-beta.gravuru-designwerkstatt.de/variante-c/',
        async submitCart(body,access){
          const prepared=await selectedClient.submitThemeCart(body,access),u=new URL(prepared.handoffUrl);
          check(u.origin==='https://'+shop&&u.pathname===data.themeCartPath&&/^#handoff=[a-f0-9]{64}$/.test(u.hash),'Der Shopify-Testwarenkorb konnte nicht geöffnet werden.');
          location.assign(cartUrl+u.hash+'&test='+test);
          return new Promise(()=>{});
        }});
      frame.src=data.editorPath+'?design='+encodeURIComponent(card.id);
      $('#auswahl').hidden=true;$('#bearbeitung').hidden=false;
    }finally{busy=false;$('#optionen').inert=false;gallery.inert=false;note.textContent='';}
  }
  $('#zurueck').addEventListener('click',()=>{frame.removeAttribute('src');$('#bearbeitung').hidden=true;$('#auswahl').hidden=false;});
  $('#optionen').hidden=false;await changeSize(initial.key);
}
start().catch(message);
