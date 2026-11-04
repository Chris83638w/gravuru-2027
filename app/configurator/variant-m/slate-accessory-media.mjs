import {escapeXml as esc} from '../../platform/sources/app/shared/models/design-content.mjs';

// Only explicit, versioned catalogue bindings enable these photos. Existing
// memorials and all other materials keep their current presentation.
export const slateAccessoryMedia=config=>config.slateAccessories?.schema==='gravuru-slate-accessories/v1'?config.slateAccessories:null;
export const slateAccessoryChoice=(config,groupId,valueId)=>slateAccessoryMedia(config)?.choices.find(choice=>choice.groupId===groupId&&choice.valueId===valueId);
export function slateImagesMarkup(images=[],{captions=true}={}){
 return '<span class="m-slate-images">'+images.map(image=>'<span><img loading="lazy" src="'+esc(image.src)+'" alt="'+esc(image.name)+'">'+(captions?'<small>'+esc(image.name)+'</small>':'')+'</span>').join('')+'</span>';
}
export function slateAccessoryGroupsMarkup(config,money){
 const media=slateAccessoryMedia(config);if(!media)return '';
 return (config.profile.optionGroups||[]).filter(group=>group.id!=='mounting'&&media.choices.some(choice=>choice.groupId===group.id)).map(group=>
  '<h3 data-slate-group-heading>'+esc(group.name)+'</h3><div role="group" aria-label="'+esc(group.name)+'">'+group.values.map(value=>{
   const choice=slateAccessoryChoice(config,group.id,value.id);
   return '<button type="button" class="m-option-tile" data-picture-group="'+esc(group.id)+'" data-picture-option="'+esc(value.id)+'" aria-pressed="false">'+(choice?slateImagesMarkup(choice.images,{captions:!group.id.startsWith('ah-farbe-')}):'')+'<strong>'+esc(choice?.label||value.label)+'</strong><small>'+esc(value.priceCents?'+'+money(value.priceCents):'ohne Aufpreis')+'</small></button>';
  }).join('')+'</div>').join('');
}
export const SLATE_ACCESSORY_CSS='.m-option-pictures [role=group][hidden]{display:none!important}.m-slate-images{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:100%}.m-slate-images>span{display:grid;justify-items:center;gap:3px}.m-option-pictures .m-slate-images img,.m-memorial-photo .m-slate-images img,.m-slate-accessory-check .m-slate-images img{width:72px;height:64px;object-fit:contain}.m-slate-images small{font-size:11px}.m-memorial-photo .m-slate-images{justify-content:flex-start;margin:8px 0}';
