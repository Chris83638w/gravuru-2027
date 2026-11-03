import {familyFormatSelection} from './family-formats.mjs';
import {escapeXml as esc} from '../../platform/sources/app/shared/models/design-content.mjs';

const money=c=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(c/100);
export function stakeSizeChoices(config,options={}){
 if(!config.familyFormats)return [];
 const selected=familyFormatSelection(config,options);
 return config.familyFormats.formats.filter(f=>f.form===selected.format.form).map(f=>{
  const v=f.variants.find(v=>v.color===selected.color);
  return {id:f.key,label:f.label,priceCents:v?.basePriceCents,available:!!v?.designIds.length,selected:f.key===selected.format.key};
 });
}
export function stakeChoicesMarkup(config,options){
 const choices=stakeSizeChoices(config,options);
 if(!choices.length)return '<p>'+esc(config.profile.geometry.width+' × '+config.profile.geometry.height+' mm')+'</p>';
 return '<div role="group" aria-label="Größe">'+choices.map(s=>'<button type="button" class="m-option-tile" data-stake-size="'+esc(s.id)+'" aria-pressed="'+s.selected+'"'+(s.available?'':' disabled')+'><strong>'+esc(s.label)+'</strong><small>'+esc(s.available?money(s.priceCents):'noch keine Vorlage')+'</small></button>').join('')+'</div>';
}
export function installStakeExecution({el,config,picks,pictures,fieldBox}){
 el.dataset.productExecution='stake';
 for(const label of picks.querySelectorAll(':scope>label'))label.remove();
 fieldBox.replaceChildren();fieldBox.hidden=true;
 pictures.addEventListener('click',event=>{const b=event.target.closest('[data-stake-size]');if(b&&!b.disabled)el.uxChangeOption('size',b.dataset.stakeSize);});
 let previous='';
 return options=>{
  const signature=JSON.stringify(options);if(signature===previous)return;previous=signature;
  const focused=el.shadowRoot.activeElement?.dataset.stakeSize;
  pictures.innerHTML=stakeChoicesMarkup(config,options);
  if(focused)for(const b of pictures.querySelectorAll('[data-stake-size]'))if(b.dataset.stakeSize===focused)b.focus();
 };
}
