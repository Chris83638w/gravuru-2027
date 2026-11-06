import {escapeXml as esc} from '../../platform/sources/app/shared/models/design-content.mjs';
import {optionTileIcon,optionTilePrice} from './option-media.mjs';
import {slateAccessoryMedia,slateAccessoryChoice,slateImagesMarkup,slateChoiceImages,slateChoiceLabel,slateAccessoryGroupsMarkup,SLATE_ACCESSORY_CSS} from './slate-accessory-media.mjs';

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
 const icon=value=>{const choice=slateAccessoryChoice(config,'mounting',value.id);return choice?slateImagesMarkup(slateChoiceImages(choice),{captions:false}):optionTileIcon(value,{mounting:true});};
 const label=value=>value.id==='K00'?'Ohne Befestigung':slateChoiceLabel(slateAccessoryChoice(config,'mounting',value.id)?.label||value.label);
 return memorialSections(config).map(s=>'<h3>'+esc(s.label)+'</h3>'+(s.id==='accessories'?'<p>Alternativ zur Befestigung auswählen.</p>':'')+'<div role="group" aria-label="'+esc(s.label)+'">'+s.values.map(v=>'<button type="button" class="m-option-tile" data-picture-group="mounting" data-picture-option="'+esc(v.id)+'" aria-pressed="false">'+icon(v)+'<strong>'+esc(label(v))+'</strong><small>'+esc(optionTilePrice(v,money))+'</small></button>').join('')+'</div>').join('')+slateAccessoryGroupsMarkup(config,money);
}
export function installMemorialExecution({el,config,picks,pictures,fieldBox}){
 el.dataset.productExecution='memorial';
 // Other catalogue groups/conditional accessory fields retain the common change,
 // visibility, price and saved-draft contracts. Only the mounting presentation changes.
 const media=slateAccessoryMedia(config),replaced=new Set(['mounting',...(media?.choices.map(choice=>choice.groupId)||[])]);
 const other=[...pictures.querySelectorAll('[role=group]')].filter(g=>g.querySelector('[data-picture-group]')&&!replaced.has(g.querySelector('[data-picture-group]').dataset.pictureGroup));
 pictures.innerHTML=memorialChoicesMarkup(config);pictures.append(...other);
 const sizeGroup=config.scalableSizes&&config.profile.optionGroups.find(g=>g.id==='size');
 if(sizeGroup){
  const sizeHeading=document.createElement('h3'),sizes=document.createElement('div');sizeHeading.textContent='Größe';sizes.setAttribute('role','group');sizes.setAttribute('aria-label','Größe');
  sizes.innerHTML=sizeGroup.values.map(v=>'<button type="button" class="m-option-tile m-size-tile" data-picture-group="size" data-picture-option="'+esc(v.id)+'" aria-pressed="false"><strong>'+esc(v.label)+'</strong><small>'+esc(v.priceCents?'+'+money(v.priceCents):'ohne Aufpreis')+'</small></button>').join('');
  pictures.prepend(sizeHeading,sizes);
  const sizeSelect=picks.querySelector('[data-m-option="size"]');if(sizeSelect)sizeSelect.closest('label').dataset.visualOnly='true';
 }
 if(media){const style=document.createElement('style');style.textContent=SLATE_ACCESSORY_CSS;el.shadowRoot.append(style);}
 // The same option buttons and change handlers now live in a single colour box.
 const colourGroups=(config.profile.optionGroups||[]).filter(g=>g.values.some(v=>v.spacerFinish!==undefined));
 if(colourGroups.length){
  const colours=document.createElement('dialog');colours.className='ux-spacer-colours';colours.setAttribute('aria-label','Abstandshalter-Farbe wählen');
  colours.innerHTML='<header><h2>Abstandshalter-Farbe</h2><button type="button" data-colours-close aria-label="Farbauswahl schließen">×</button></header>';
  for(const group of colourGroups){
   const select=picks.querySelector('[data-m-option="'+CSS.escape(group.id)+'"]');if(select)select.closest('label').dataset.visualOnly='true';
   const tile=pictures.querySelector('[data-picture-group="'+CSS.escape(group.id)+'"]'),row=tile?.closest('[role=group]');
   if(row){if(row.previousElementSibling?.matches('[data-slate-group-heading]'))row.previousElementSibling.remove();colours.append(row);}
  }
  pictures.append(colours);
  colours.querySelector('[data-colours-close]').addEventListener('click',()=>colours.close());
  colours.addEventListener('click',e=>{if(e.target===colours){const b=colours.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)colours.close();}});
  pictures.addEventListener('click',e=>{
   const tile=e.target.closest('[data-picture-option]');if(!tile)return;
   if(colourGroups.some(g=>g.id===tile.dataset.pictureGroup)){colours.close();return;}
   if(tile.dataset.pictureGroup==='mounting'&&colourGroups.some(g=>g.visibleIf?.valueIds.includes(tile.dataset.pictureOption)))colours.showModal();
  });
 }
 const accessoryTiles=[];
 if(fieldBox&&media){
  const heading=document.createElement('h3'),group=document.createElement('div');heading.textContent='Zubehör';group.setAttribute('role','group');group.setAttribute('aria-label','Zubehör · Mehrfachauswahl');
  for(const choice of media.choices.filter(c=>c.fieldId)){
   const row=fieldBox.querySelector('[data-m-field-row="'+CSS.escape(choice.fieldId)+'"]');
   const input=row?.querySelector('input[type="checkbox"]');
   if(input){
    row.style.setProperty('display','none','important');
    const tile=document.createElement('button');tile.type='button';tile.className='m-option-tile';tile.dataset.slateAccessory=choice.fieldId;
    tile.innerHTML=slateImagesMarkup(choice.images,{captions:false})+'<strong>'+esc(choice.label)+'</strong><small>+'+esc(money(choice.priceCents))+'</small>';
    tile.addEventListener('click',()=>{input.checked=!input.checked;input.dispatchEvent(new Event('change',{bubbles:true}));});group.append(tile);accessoryTiles.push({tile,input});
   }
  }
  if(accessoryTiles.length)pictures.append(heading,group);
 }
 // Photos have one home: the final Foto tab. No duplicate offer in Ausführung.
 return ()=>{
  for(const {tile,input} of accessoryTiles)tile.setAttribute('aria-pressed',String(input.checked));
  for(const heading of pictures.querySelectorAll('[data-slate-group-heading]')){
   const group=heading.nextElementSibling;
   heading.hidden=group.hidden;
  }
 };
}
