import {escapeXml as esc} from '../../platform/sources/app/shared/models/design-content.mjs';
import {optionTileIcon,optionTilePrice} from './option-media.mjs';

const money=c=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(c/100);
export function memorialSections(config){
 const mounting=config.profile.optionGroups?.find(g=>g.id==='mounting');
 if(!mounting)return [];
 const accessories=v=>v.id!=='K00'&&Array.isArray(v.holes)&&v.holes.length===0;
 return [
  {id:'mounting',label:'Befestigung',values:mounting.values.filter(v=>!accessories(v)).sort((a,b)=>Number(b.id==='K00')-Number(a.id==='K00'))},
  {id:'accessories',label:'Zubehör',values:mounting.values.filter(accessories)}
 ].filter(s=>s.values.length);
}
export function memorialChoicesMarkup(config){
 return memorialSections(config).map(s=>'<h3>'+esc(s.label)+'</h3>'+(s.id==='accessories'?'<p>Alternativ zur Befestigung auswählen.</p>':'')+'<div role="group" aria-label="'+esc(s.label)+'">'+s.values.map(v=>'<button type="button" class="m-option-tile" data-picture-group="mounting" data-picture-option="'+esc(v.id)+'" aria-pressed="false">'+optionTileIcon(v,{mounting:true})+'<strong>'+esc(v.id==='K00'?'Ohne Befestigung':v.label)+'</strong><small>'+esc(optionTilePrice(v,money))+'</small></button>').join('')+'</div>').join('');
}
export function installMemorialExecution({el,config,picks,pictures}){
 el.dataset.productExecution='memorial';
 // Other catalogue groups/conditional accessory fields retain the common change,
 // visibility, price and saved-draft contracts. Only the mounting presentation changes.
 const other=[...pictures.querySelectorAll('[role=group]')].filter(g=>g.querySelector('[data-picture-group]')?.dataset.pictureGroup!=='mounting');
 pictures.innerHTML=memorialChoicesMarkup(config);pictures.append(...other);
 if(config.photo?.enabled){
  const section=document.createElement('section');section.className='m-memorial-photo';
  const included=config.photo.includedCount??0;
  section.innerHTML='<h3>Foto</h3><p>'+esc(included?included+' Foto'+(included>1?'s':'')+' inklusive · weitere je '+money(config.photo.extraPriceCents):'Je Foto '+money(config.photo.extraPriceCents))+'</p><button type="button" class="ux-primary" data-memorial-photo>Foto gestalten</button>';
  section.querySelector('button').addEventListener('click',()=>{el.uxShowSection?.('upload');el.uxMobileSteps?.show('upload',{scroll:false});});picks.append(section);
 }
 return ()=>{};
}
