import {escapeXml as esc} from '../../platform/sources/app/shared/models/design-content.mjs';
import {optionTileIcon,optionTilePrice} from './option-media.mjs';
import {slateAccessoryMedia,slateAccessoryChoice,slateImagesMarkup,slateAccessoryGroupsMarkup,SLATE_ACCESSORY_CSS} from './slate-accessory-media.mjs';
import {photoPolicyForDesign} from './contract.mjs';

const money=c=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(c/100);
export function memorialSections(config){
 const mounting=config.profile.optionGroups?.find(g=>g.id==='mounting');
 if(!mounting)return [];
 const accessories=v=>slateAccessoryChoice(config,'mounting',v.id)?.art==='zubehoer'||(!slateAccessoryMedia(config)&&v.id!=='K00'&&Array.isArray(v.holes)&&v.holes.length===0);
 return [
  {id:'mounting',label:'Befestigung',values:mounting.values.filter(v=>!accessories(v)).sort((a,b)=>Number(b.id==='K00')-Number(a.id==='K00'))},
  {id:'accessories',label:'Zubehör',values:mounting.values.filter(accessories)}
 ].filter(s=>s.values.length);
}
export function memorialChoicesMarkup(config){
 const icon=value=>{const choice=slateAccessoryChoice(config,'mounting',value.id);return choice?slateImagesMarkup(choice.images):optionTileIcon(value,{mounting:true});};
 const label=value=>value.id==='K00'?'Ohne Befestigung':slateAccessoryChoice(config,'mounting',value.id)?.label||value.label;
 return memorialSections(config).map(s=>'<h3>'+esc(s.label)+'</h3>'+(s.id==='accessories'?'<p>Alternativ zur Befestigung auswählen.</p>':'')+'<div role="group" aria-label="'+esc(s.label)+'">'+s.values.map(v=>'<button type="button" class="m-option-tile" data-picture-group="mounting" data-picture-option="'+esc(v.id)+'" aria-pressed="false">'+icon(v)+'<strong>'+esc(label(v))+'</strong><small>'+esc(optionTilePrice(v,money))+'</small></button>').join('')+'</div>').join('')+slateAccessoryGroupsMarkup(config,money);
}
export function installMemorialExecution({el,config,picks,pictures,fieldBox}){
 el.dataset.productExecution='memorial';
 // Other catalogue groups/conditional accessory fields retain the common change,
 // visibility, price and saved-draft contracts. Only the mounting presentation changes.
 const media=slateAccessoryMedia(config),replaced=new Set(['mounting',...(media?.choices.map(choice=>choice.groupId)||[])]);
 const other=[...pictures.querySelectorAll('[role=group]')].filter(g=>!replaced.has(g.querySelector('[data-picture-group]')?.dataset.pictureGroup));
 pictures.innerHTML=memorialChoicesMarkup(config);pictures.append(...other);
 if(media){const style=document.createElement('style');style.textContent=SLATE_ACCESSORY_CSS;el.shadowRoot.append(style);}
 if(fieldBox&&media){
  for(const choice of media.choices.filter(c=>c.fieldId)){
   const row=fieldBox.querySelector('[data-m-field-row="'+CSS.escape(choice.fieldId)+'"]');
   if(row){row.classList.add('m-slate-accessory-check');const picture=document.createElement('span');picture.innerHTML=slateImagesMarkup(choice.images);row.append(picture);}
  }
 }
 let updatePhoto=()=>{};
 if(config.photo?.enabled){
  const section=document.createElement('section');section.className='m-memorial-photo';
  const included=config.photo.includedCount??0;
  section.innerHTML='<h3>Foto</h3><p data-photo-policy>'+esc(included?included+' Foto'+(included>1?'s':'')+' inklusive · weitere je '+money(config.photo.extraPriceCents):'Je Foto '+money(config.photo.extraPriceCents))+'</p>'+(media?.photo?slateImagesMarkup(media.photo.images):'')+'<button type="button" class="ux-primary" data-memorial-photo>Foto gestalten</button>';
  section.querySelector('button').addEventListener('click',()=>{el.uxShowSection?.('upload');el.uxMobileSteps?.show('upload',{scroll:false});});picks.append(section);
  if(config.photoDesignPricing)updatePhoto=()=>{const policy=photoPolicyForDesign(config,el.state.designId,el.state.mOptions);section.querySelector('[data-photo-policy]').textContent=policy.includedCount?'1 Foto im Fotodesign enthalten · weitere je '+money(policy.extraPriceCents):'Je zusätzliches Foto '+money(policy.extraPriceCents);};
 }
 return ()=>{
  updatePhoto();
  for(const heading of pictures.querySelectorAll('[data-slate-group-heading]')){
   const group=heading.nextElementSibling;
   heading.hidden=group.hidden;
  }
 };
}
