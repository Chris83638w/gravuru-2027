import {isFamilyFormats,familyFormatSelection,familyFormatChoices,customerForm,nearestFamilySize} from './family-formats.mjs';
import {escapeXml as esc} from '../../platform/sources/app/shared/models/design-content.mjs';
import {optionTileIcon,optionTilePrice} from './option-media.mjs';

const money=c=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(c/100);
export function familyShapePreview(geometry){
 const g={...geometry,holes:[]},pad=Math.max(g.width,g.height)*.025;
 const shape=g.shape==='contour'?'<path d="'+esc(g.outlinePath)+'"/>':g.shape==='ellipse'?'<ellipse cx="'+g.width/2+'" cy="'+g.height/2+'" rx="'+g.width/2+'" ry="'+g.height/2+'"/>':'<rect width="'+g.width+'" height="'+g.height+'" rx="'+g.cornerRadiusMm+'"/>';
 return '<svg viewBox="'+[-pad,-pad,g.width+2*pad,g.height+2*pad].join(' ')+'" aria-hidden="true"><g fill="#eef0f2" stroke="#59636c" stroke-width="'+pad+'">'+shape+'</g></svg>';
}
export function familyChoicesMarkup(c,options){
 const s=familyFormatSelection(c,options),forms=familyFormatChoices(c,options),form=customerForm(s.format.form),active=forms.find(f=>f.id===form);
 const selected={...options,size:s.format.key,mounting:s.mounting.id,color:s.variant.color,form};
 const button=(group,id,label,extra='',disabled=false,note='')=>'<button type="button" class="m-option-tile" data-family-group="'+esc(group)+'" data-family-value="'+esc(id)+'" aria-pressed="'+String(selected[group]===id)+'"'+(disabled?' disabled':'')+'>'+extra+'<strong>'+esc(label)+'</strong>'+(disabled?'<small>noch keine Vorlage</small>':note?'<small>'+esc(note)+'</small>':'')+'</button>';
 const mounts=[...s.variant.mounting].sort((a,b)=>Number(b.id==='K00')-Number(a.id==='K00'));
 const colorIcon=color=>{const value=s.format.variants.find(v=>v.color===color.id)?.material?.color;return '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="4" width="24" height="24" rx="4" fill="'+(/^#(?:[a-f0-9]{3}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(value||'')?value:'none')+'" stroke="currentColor"/></svg>';};
 return (c.familyFormats.fixedSize?'<p class="family-fixed-size">'+esc(active.label+' · '+s.format.label)+'</p>':'<section class="family-shapes"><h3>Form</h3><div>'+forms.map(f=>button('form',f.id,f.label,f.sizes[0]?familyShapePreview(f.sizes[0].geometry):'',!f.sizes.some(s=>s.available))).join('')+'</div></section>')+
 (c.familyFormats.fixedSize?'':'<section class="family-sizes"><h3>Größe</h3><div role="group" aria-label="Größe">'+active.sizes.map(f=>button('size',f.key,f.label,familyShapePreview(f.geometry),!f.available)).join('')+'</div></section>')+
 '<section class="family-mounting"><h3>Befestigung</h3><div role="group" aria-label="Befestigung">'+mounts.map(v=>button('mounting',v.id,v.id==='K00'?'Ohne Befestigung':v.label,optionTileIcon(v,{mounting:true}),false,optionTilePrice(v,money))).join('')+'</div></section>'+
 (c.familyFormats.colors.length>1?'<section class="family-colors"><h3>Farbe</h3><div role="group" aria-label="Farbe">'+c.familyFormats.colors.map(v=>button('color',v.id,v.label,colorIcon(v))).join('')+'</div></section>':'');
}
export function installFamilyFormatsPresentation({el,config,picks,pictures}){
 if(!isFamilyFormats(config))return ()=>{};
 el.setAttribute('data-family-formats','');
 const style=document.createElement('style');style.textContent=`
 :host([data-family-formats]) .ux-mobile-step-label{white-space:normal;text-align:center}
 :host([data-family-formats]) .ux-shell .c-design-card small[data-family-review]:not([hidden]){display:block!important;font-size:11px!important;line-height:1.3;color:#697079;font-weight:400}
 :host([data-family-formats]) .family-shapes small{font-size:10px;line-height:1.15}
 :host([data-family-formats]) .m-options>label{display:none!important}
 :host([data-family-formats]) .m-option-pictures section{margin-bottom:12px}
 :host([data-family-formats]) .m-option-pictures h3{margin:8px 0;font-size:16px}
 :host([data-family-formats]) .m-option-pictures section>div{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
 :host([data-family-formats]) .m-option-pictures button{padding:7px 4px!important;min-height:76px!important;gap:4px!important;overflow-wrap:normal!important}
 :host([data-family-formats]) .m-option-pictures button[aria-pressed=true]{border:2px solid #55616b!important;background:#edf0f3!important}
 :host([data-family-formats]) .m-option-pictures button:disabled{opacity:.45;cursor:not-allowed}
 :host([data-family-formats]) .m-option-pictures strong{font-size:13px!important;line-height:1.2!important}
 :host([data-family-formats]) .m-option-pictures svg{height:28px;width:48px}
 :host([data-family-formats]) .m-option-pictures .family-mounting>div,:host([data-family-formats]) .m-option-pictures .family-sizes>div{grid-template-columns:repeat(2,minmax(0,1fr))}
 :host([data-family-formats]) .m-option-pictures .family-mounting button{min-height:104px!important;padding:10px 8px!important}
 :host([data-family-formats]) .m-option-pictures button:focus-visible{outline:2px solid #59636c;outline-offset:2px}
 :host([data-family-formats]) .m-option-pictures .family-colors>div{grid-template-columns:repeat(2,minmax(0,1fr))}
 :host([data-family-formats]) .m-option-pictures .family-colors button{min-height:44px!important}
 `;el.shadowRoot.append(style);
 let previous='',options={};
 const change=b=>{
  if(!b||b.disabled)return;
  let {familyGroup:key}=b.dataset,value=b.tagName==='SELECT'?b.value:b.dataset.familyValue;
  if(key==='form'){const sizes=familyFormatChoices(config,options).find(f=>f.id===value).sizes;let current=null;try{current=familyFormatSelection(config,options).format.geometry;}catch{}value=(nearestFamilySize(sizes,current)||sizes.find(s=>s.available)).key;key='size';}
  try{el.uxChangeOption(key,value);}catch(error){el.shadowRoot.querySelector('.status').textContent=error.message;b.value=options[key];}
 };
 pictures.addEventListener('click',e=>change(e.target.closest('button[data-family-group]')));
 pictures.addEventListener('change',e=>change(e.target.closest('select[data-family-group]')));
 return next=>{
  options=next;const signature=JSON.stringify(options);if(previous===signature)return;
  const focused=el.shadowRoot.activeElement?.closest?.('[data-family-group]'),focus=focused?{...focused.dataset}:null;
  pictures.innerHTML=familyChoicesMarkup(config,options);previous=signature;
  if(focus)for(const b of pictures.querySelectorAll('[data-family-group]'))if(b.dataset.familyGroup===focus.familyGroup&&b.dataset.familyValue===focus.familyValue)b.focus();
 };
}
