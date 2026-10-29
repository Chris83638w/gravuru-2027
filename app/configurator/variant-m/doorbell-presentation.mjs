import {isLayeredDoorbell,selectedDoorbellProfile} from './doorbell-selection.mjs';
import {doorbellPositionLabels} from './doorbell-ui.mjs';
import {studioSvg} from '../../platform/sources/app/shared/models/studio-svg.mjs';
import {escapeXml as esc} from '../../platform/sources/app/shared/models/design-content.mjs';
import {optionTileIcon,optionTilePrice} from './option-media.mjs';

// Pictures are derived from the same profile as the canvas; no second geometry,
// price table, position transform or Shopify option mapping lives here.
export function doorbellChoiceGroups(config,options){
 if(!isLayeredDoorbell(config))return [];
 const p=selectedDoorbellProfile(config,options),groups=config.profile.optionGroups;
 const labels=doorbellPositionLabels(p.geometry);
 const position={id:'position',name:'Position der Klingel',values:Object.entries(labels).map(([id,label])=>({id,label,priceCents:0}))};
 return ['format','position','frame','color','mounting'].map(id=>id==='position'?position:groups.find(g=>g.id===id)).filter(Boolean);
}
export function doorbellChoicePreview(config,options,groupId,value){
 if(groupId==='mounting')return optionTileIcon(value,{mounting:true});
 const selected={...options,[groupId]:value.id},p=selectedDoorbellProfile(config,selected);
 const svg=studioSvg(p,{id:'option',name:'Ausführung',objects:[],marks:[]},{},{frameKey:selected.frame,color:selected.color,mountingKey:selected.mounting,id:'choice-'+groupId+'-'+value.id});
 return svg.replace('<svg ','<svg aria-hidden="true" focusable="false" ');
}
export function installDoorbellPresentation({el,config,picks,pictures}){
 if(!isLayeredDoorbell(config))return ()=>{};
 el.setAttribute('data-doorbell-presentation','');
 const style=document.createElement('style');
 style.textContent=`
 :host([data-doorbell-presentation]) .m-options>label,
 :host([data-doorbell-presentation]) .m-option-fields [data-m-field-row="position"]{display:none!important}
 :host([data-doorbell-presentation]) .m-option-pictures>div{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0 0 20px}
 :host([data-doorbell-presentation]) .m-option-pictures h3{grid-column:1/-1;margin:0 0 2px;font-size:16px}
 :host([data-doorbell-presentation]) .m-option-pictures button{padding:10px!important;min-height:150px!important}
 :host([data-doorbell-presentation]) .m-option-pictures svg:not(svg svg){width:100%!important;height:90px!important;max-height:90px!important}
 :host([data-doorbell-presentation]) .m-option-pictures [data-picture-group="mounting"] svg{width:36px!important;height:36px!important}
 :host([data-doorbell-presentation]) .m-option-pictures svg svg{width:revert!important;height:revert!important}
 :host([data-doorbell-presentation]) .m-option-pictures button[aria-pressed="true"]{border:2px solid #235f48;background:#f0f6f2}
 :host([data-doorbell-presentation]) .m-option-pictures button:focus-visible{outline:3px solid #235f48;outline-offset:3px}
 :host([data-doorbell-presentation][data-ux-neutral]) .ux-shell .ux-design-reveal .c-gallery{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 :host([data-doorbell-presentation][data-ux-neutral]) .ux-shell .ux-design-reveal .c-gallery .c-design-card svg:not(svg svg){width:100%!important;height:155px!important;aspect-ratio:auto!important}
 `;
 el.shadowRoot.append(style);let previous='';
 return options=>{
  const signature=JSON.stringify(['format','position','frame','color','mounting'].map(k=>options[k]));
  if(previous===signature)return;previous=signature;
  const focused=el.shadowRoot.activeElement?.closest?.('[data-picture-option]');
  const focus=focused?{group:focused.dataset.pictureGroup,value:focused.dataset.pictureOption}:null;
  const money=c=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(c/100);
  pictures.innerHTML=doorbellChoiceGroups(config,options).map(g=>'<div role="group" aria-label="'+esc(g.name)+'"><h3>'+esc(g.name)+'</h3>'+g.values.map(v=>{
   const f=g.id==='format'?config.doorbell.formats.find(f=>f.key===v.id):null;
   const label=v.label==='Laenglich'?'Länglich':v.label;
   const size=f?' · '+f.profile.geometry.width/10+' × '+f.profile.geometry.height/10+' cm':'';
   return '<button type="button" class="m-option-tile" data-picture-group="'+esc(g.id)+'" data-picture-option="'+esc(v.id)+'" aria-pressed="'+String(options[g.id]===v.id)+'">'+doorbellChoicePreview(config,options,g.id,v)+'<strong>'+esc(label+size)+'</strong><small>'+esc(optionTilePrice(v,money,{fullPrice:g.id==='format'}))+'</small></button>';
  }).join('')+'</div>').join('');
  if(focus)pictures.querySelector('[data-picture-group="'+CSS.escape(focus.group)+'"][data-picture-option="'+CSS.escape(focus.value)+'"]')?.focus({preventScroll:true});
 };
}

