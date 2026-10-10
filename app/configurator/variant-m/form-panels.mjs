import {setMerchantImage} from '/workshop-ui/merchant-media.mjs';
// Form-mode presentation for the existing configurator entry. Drafts, rights,
// geometry and production remain owned by the shared form engine.
const $=s=>document.querySelector(s);
const labels={options:'Ausführungen',design:'Designs',text:'Text',motif:'Motive',photo:'Foto'};
const paths={options:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="white"/><circle cx="16" cy="17" r="3" fill="white"/>',design:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m4 16 5-5 4 4 4-7 4 9"/>',text:'<path d="M5 4h14M12 4v16M8 20h8"/>',motif:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',photo:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 18 5-5 4 3 3-5 5 7"/>'};
const icons=Object.fromEntries(Object.entries(paths).map(([key,path])=>[key,'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>']));
export function installFormPanels({getResult,getSources,getSelected,changeDesign}){
 let active='options';
 document.body.classList.add('konfi-form');
 const aside=$('aside'),nav=document.createElement('nav');nav.className='konfi-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Gestaltung bearbeiten');
 for(const [id,label] of Object.entries(labels)){
  const b=document.createElement('button');b.type='button';b.id='konfi-tab-'+id;b.dataset.tab=id;b.setAttribute('role','tab');b.setAttribute('aria-controls','konfi-panel');b.innerHTML='<span aria-hidden="true">'+icons[id]+'</span>'+label;nav.append(b);
 }
 aside.prepend(nav);const panel=document.createElement('div');panel.id='konfi-panel';panel.setAttribute('role','tabpanel');while(nav.nextSibling)panel.append(nav.nextSibling);aside.append(panel);
 const options=document.createElement('section');options.id='konfi-options';options.innerHTML='<h2>Material & Ausführung</h2><div id="variant-options"></div><p id="material-summary"></p><p class="help">Deine Eingaben bleiben je Ausführung und Design gespeichert.</p>';panel.prepend(options);
 const fieldsSection=$('#customer-fields').closest('section');fieldsSection.id='konfi-fields';
 const cards=document.createElement('div');cards.id='konfi-designs';$('#design-picker').append(cards);$('#customer-design').closest('label').hidden=true;
 const footer=document.createElement('footer');footer.className='konfi-footer';footer.append($('.preview-footer'),$('#capture-review'));$('main').append(footer);
 $('#capture-review').textContent='Gestaltung fertig · zur Prüfung';
 const note=document.createElement('p');note.className='help';note.textContent='Testkonfigurator · keine Bestellung oder Zahlung';footer.append(note);
 const back=document.createElement('button');back.textContent='← Zurück';back.id='konfi-back';back.onclick=()=>{if(window.parent!==window)window.parent.postMessage({type:'gravuru-fk-close'},location.origin);};$('.header-actions').prepend(back);if(window.parent===window)back.hidden=true;
 function choose(tab,focus=false){active=tab;sync();if(focus)$('#konfi-tab-'+active).focus();}
 nav.onclick=e=>{const b=e.target.closest('[data-tab]');if(b&&!b.disabled)choose(b.dataset.tab);};
 nav.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const buttons=[...nav.querySelectorAll('button:not([hidden])')],i=buttons.findIndex(b=>b.dataset.tab===active);e.preventDefault();choose(buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length].dataset.tab,true);};
 cards.onclick=e=>{const b=e.target.closest('[data-design]');if(b&&!b.disabled)changeDesign(b.dataset.design);};
 let designKey='';
 function sync(){
  const r=getResult();if(!r)return;const sources=getSources(),p=r.product;
  const available={options:true,design:p.designs.length>1,text:p.additions.text||sources.some(s=>s.type==='text'),motif:p.additions.motifs||sources.some(s=>s.type==='motif'),photo:sources.some(s=>s.type==='photo')};
  if(!available[active])active='options';
  for(const b of nav.children){b.hidden=!available[b.dataset.tab];b.setAttribute('aria-selected',String(active===b.dataset.tab));b.tabIndex=active===b.dataset.tab?0:-1;}
  panel.setAttribute('aria-labelledby','konfi-tab-'+active);
  options.hidden=active!=='options';$('#design-picker').hidden=active!=='design';fieldsSection.hidden=!['text','motif','photo'].includes(active);
  fieldsSection.querySelector('h2').textContent={text:'Deine Texte',motif:'Deine Motive',photo:'Deine Bilder'}[active]||'Deine Inhalte';
  for(const row of $('#customer-fields').children)row.hidden=row.dataset.kind!==active;
  $('#no-fields').hidden=sources.some(s=>s.type===active);$('#no-fields').textContent='Noch keine eigenen Elemente hinzugefügt.';
  $('#add-elements').hidden=!(active==='text'&&p.additions.text||active==='motif'&&p.additions.motifs);
  $('#add-elements h2').hidden=true;$('#add-own-text').hidden=active!=='text'||!p.additions.text;$('#motif-library').hidden=active!=='motif'||!p.additions.motifs;$('#motif-library').open=active==='motif';
  const selected=getSelected();$('#field-editor').hidden=!selected||selected.deleted||sources.find(s=>s.id===selected.id)?.type!==active;
  $('#material-summary').textContent=(p.materialName||'')+' · '+p.geometry.widthMm+' × '+p.geometry.heightMm+' mm'+(p.thicknessMm?' · '+p.thicknessMm+' mm stark':'')+' · '+(p.method==='print'?'UV-Druck':'Gravur');
  const nextKey=p.id+':'+p.revision+':'+p.designs.map(d=>d.id).join(',');
  if(designKey!==nextKey){designKey=nextKey;cards.replaceChildren();for(const d of p.designs){const b=document.createElement('button');b.dataset.design=d.id;const img=document.createElement('img');setMerchantImage(img,'/api/workshop/products/'+p.id+'/preview.svg?'+new URLSearchParams({revision:p.revision,designId:d.id}));img.alt='';const label=document.createElement('span');label.textContent=d.name;b.append(img,label);cards.append(b);}}
  for(const b of cards.children)b.setAttribute('aria-pressed',String(b.dataset.design===r.draft.designId));
 }
 return {sync,selectType:type=>choose(type)};
}
