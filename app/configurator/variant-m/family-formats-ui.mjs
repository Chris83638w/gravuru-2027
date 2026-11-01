import {isFamilyFormats,familyFormatSelection,familyFormatChoices,customerForm} from './family-formats.mjs';
import {escapeXml as esc} from '../../platform/sources/app/shared/models/design-content.mjs';
import {optionTileIcon} from './option-media.mjs';

const money=c=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(c/100);
export function familyShapePreview(geometry){
 const g={...geometry,holes:[]},pad=Math.max(g.width,g.height)*.025;
 const shape=g.shape==='contour'?'<path d="'+esc(g.outlinePath)+'"/>':g.shape==='ellipse'?'<ellipse cx="'+g.width/2+'" cy="'+g.height/2+'" rx="'+g.width/2+'" ry="'+g.height/2+'"/>':'<rect width="'+g.width+'" height="'+g.height+'" rx="'+g.cornerRadiusMm+'"/>';
 return '<svg viewBox="'+[-pad,-pad,g.width+2*pad,g.height+2*pad].join(' ')+'" aria-hidden="true"><g fill="#eef0f2" stroke="#59636c" stroke-width="'+pad+'">'+shape+'</g></svg>';
}
export function familyChoicesMarkup(c,options){
 const s=familyFormatSelection(c,options),forms=familyFormatChoices(c,options),form=customerForm(s.format.form),active=forms.find(f=>f.id===form);
 const button=(group,id,label,extra='',disabled=false)=>'<button type="button" class="m-option-tile" data-family-group="'+esc(group)+'" data-family-value="'+esc(id)+'" aria-pressed="'+String((group==='form'?form:options[group])===id)+'"'+(disabled?' disabled':'')+'>'+extra+'<strong>'+esc(label)+'</strong></button>';
 return '<section class="family-shapes"><h3>Form &amp; Größe</h3><div>'+forms.map(f=>button('form',f.id,f.label,f.sizes[0]?familyShapePreview(f.sizes[0].geometry):'',!f.sizes.some(s=>s.available))).join('')+'</div></section>'+
 '<section class="family-sizes"><h3>Größe</h3><div>'+active.sizes.map(f=>button('size',f.key,f.label,'<small>'+money(f.priceCents)+'</small>',!f.available)).join('')+'</div></section>'+
 (c.familyFormats.colors.length>1?'<section class="family-colors"><h3>Farbe</h3><div>'+c.familyFormats.colors.map(v=>button('color',v.id,v.label)).join('')+'</div></section>':'')+
 '<section class="family-mounting"><h3>Befestigung</h3><div>'+s.variant.mounting.map(v=>button('mounting',v.id,v.label,optionTileIcon(v,{mounting:true})+'<small>'+(v.priceCents?'+'+money(v.priceCents):'ohne Aufpreis')+'</small>')).join('')+'</div></section>';
}
export function installFamilyFormatsPresentation({el,config,picks,pictures}){
 if(!isFamilyFormats(config))return ()=>{};
 el.setAttribute('data-family-formats','');
 const style=document.createElement('style');style.textContent=`
 :host([data-family-formats]) .m-options>label{display:none!important}
 :host([data-family-formats]) .m-option-pictures section{margin-bottom:14px}
 :host([data-family-formats]) .m-option-pictures h3{margin:8px 0;font-size:16px}
 :host([data-family-formats]) .m-option-pictures section>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
 :host([data-family-formats]) .m-option-pictures button{padding:7px!important;min-height:66px!important;gap:4px!important}
 :host([data-family-formats]) .m-option-pictures button[aria-pressed=true]{border:2px solid #55616b!important;background:#edf0f3!important}
 :host([data-family-formats]) .m-option-pictures button:disabled{opacity:.45;cursor:not-allowed}
 :host([data-family-formats]) .m-option-pictures strong{font-size:13px!important}
 :host([data-family-formats]) .m-option-pictures svg{height:28px;width:48px}
 :host([data-family-formats]) .m-option-pictures .family-mounting>div{grid-template-columns:repeat(2,minmax(0,1fr))}
 :host([data-family-formats]) .family-format-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:0 0 12px;border-bottom:1px solid #dce0e4}
 :host([data-family-formats]) .family-format-tabs button{padding:8px 5px!important;min-height:44px!important;border:0!important;border-radius:6px 6px 0 0!important;background:transparent!important;font-size:14px!important}
 :host([data-family-formats]) .family-format-tabs button[aria-selected=true]{background:#f0f2f3!important;box-shadow:inset 0 -2px #485761!important}
 :host([data-family-formats]) .m-option-pictures[data-family-section=layout]>.family-mounting,
 :host([data-family-formats]) .m-option-pictures[data-family-section=mounting]>section:not(.family-mounting){display:none!important}
 `;el.shadowRoot.append(style);
 const tabs=document.createElement('nav');tabs.className='family-format-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Ausführung auswählen');
 tabs.innerHTML=[['layout','Form & Größe'],['mounting','Befestigung']].map(([id,label])=>'<button type="button" role="tab" id="family-tab-'+id+'" aria-controls="family-format-panel" data-family-tab="'+id+'">'+esc(label)+'</button>').join('');pictures.before(tabs);pictures.id='family-format-panel';pictures.setAttribute('role','tabpanel');
 const show=(id,focus=false)=>{pictures.dataset.familySection=id;pictures.setAttribute('aria-labelledby','family-tab-'+id);for(const b of tabs.children){const active=b.dataset.familyTab===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus();}};
 tabs.addEventListener('click',e=>{if(e.target.dataset.familyTab)show(e.target.dataset.familyTab);});
 tabs.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();show(e.key==='Home'?'layout':e.key==='End'?'mounting':pictures.dataset.familySection==='layout'?'mounting':'layout',true);});show('layout');
 let previous='',options={};
 pictures.addEventListener('click',e=>{
  const b=e.target.closest('[data-family-group]');if(!b||b.disabled)return;
  let {familyGroup:key,familyValue:value}=b.dataset;
  if(key==='form'){const sizes=familyFormatChoices(config,options).find(f=>f.id===value).sizes;value=sizes.find(s=>s.available).key;key='size';}
  try{el.uxChangeOption(key,value);}catch(error){el.shadowRoot.querySelector('.status').textContent=error.message;}
 });
 return next=>{
  options=next;const signature=JSON.stringify(options);if(previous===signature)return;
  const focused=el.shadowRoot.activeElement?.closest?.('[data-family-group]'),focus=focused?{...focused.dataset}:null;
  pictures.innerHTML=familyChoicesMarkup(config,options);previous=signature;
  if(focus)for(const b of pictures.querySelectorAll('[data-family-group]'))if(b.dataset.familyGroup===focus.familyGroup&&b.dataset.familyValue===focus.familyValue)b.focus();
 };
}
