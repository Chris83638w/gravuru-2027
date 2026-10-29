import {isLayeredDoorbell,selectedDoorbellProfile} from './doorbell-selection.mjs';
import {doorbellPositionLabels} from './doorbell-ui.mjs';
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
 if(groupId==='color')return '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="21" fill="'+(value.id==='anthrazit'?'#3b4046':'#151719')+'"/><path d="M8 14A17 17 0 0 1 34 10" fill="none" stroke="#fff" stroke-opacity=".22"/></svg>';
 const selected={...options,[groupId]:value.id},p=selectedDoorbellProfile(config,selected);
 const {width:w,height:h,bell:b}=p.geometry,a=p.frames.find(f=>f.key===selected.frame).acrylic;
 const ink=selected.color==='anthrazit'?'#3b4046':'#181a1c',id='choice-'+groupId+'-'+value.id;
 // AOSU reference: compact plate silhouettes, no repeated product photographs.
 const plate=groupId==='format'?'<rect width="'+w+'" height="'+h+'" fill="#f4f5f6" stroke="#58616a" stroke-width="5"/>':'<defs><linearGradient id="'+id+'" x2=".2" y2="1"><stop stop-color="#fafbfc"/><stop offset=".24" stop-color="#9ca5ad"/><stop offset=".48" stop-color="#f1f4f6"/><stop offset=".73" stop-color="#9ca5a9"/><stop offset="1" stop-color="#e5e9ec"/></linearGradient></defs><rect width="'+w+'" height="'+h+'" fill="url(#'+id+')" stroke="#67717a" stroke-width="1.5"/><rect x="'+a.x+'" y="'+a.y+'" width="'+a.width+'" height="'+a.height+'" fill="'+ink+'"/>';
 const device=groupId==='position'?'<rect x="'+b.x+'" y="'+b.y+'" width="'+b.width+'" height="'+b.height+'" rx="3" fill="#717b83"/><circle cx="'+(b.x+b.width/2)+'" cy="'+(b.y+b.height*.23)+'" r="'+b.width*.13+'" fill="#19232c"/><circle cx="'+(b.x+b.width/2)+'" cy="'+(b.y+b.height*.78)+'" r="'+b.width*.21+'" fill="none" stroke="#d9e0e5" stroke-width="2"/>':'';
 return '<svg viewBox="-5 -5 '+(w+10)+' '+(h+10)+'" aria-hidden="true" focusable="false">'+plate+device+'</svg>';
}
export function installDoorbellPresentation({el,config,picks,pictures}){
 if(!isLayeredDoorbell(config))return ()=>{};
 el.setAttribute('data-doorbell-presentation','');
 const style=document.createElement('style');
 style.textContent=`
 :host([data-doorbell-presentation]) .m-options>label,
 :host([data-doorbell-presentation]) .m-option-fields [data-m-field-row="position"]{display:none!important}
 :host([data-doorbell-presentation]) .m-option-pictures>div{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 18px}
 :host([data-doorbell-presentation]) .m-option-pictures>[data-choice-group="format"]{grid-template-columns:repeat(3,minmax(0,1fr))!important}
 :host([data-doorbell-presentation]) .m-option-pictures>[data-choice-group="frame"]{grid-template-columns:repeat(4,minmax(0,1fr))!important}
 :host([data-doorbell-presentation]) .m-option-pictures h3{grid-column:1/-1;margin:0 0 2px;font-size:16px}
 :host([data-doorbell-presentation]) .m-option-pictures .m-option-tile{padding:8px 5px!important;min-height:96px!important;border-radius:8px!important;gap:5px!important}
 :host([data-doorbell-presentation]) .m-option-pictures .m-option-tile svg{width:100%!important;height:48px!important;max-height:48px!important}
 :host([data-doorbell-presentation]) .m-option-pictures .m-option-tile strong{font-size:13px!important;font-weight:500!important}
 :host([data-doorbell-presentation]) .m-option-pictures .m-option-tile small{font-size:12px!important}
 :host([data-doorbell-presentation]) .m-option-pictures>[data-choice-group="color"]{display:flex!important;flex-wrap:wrap;gap:18px!important}
 :host([data-doorbell-presentation]) .m-option-pictures>[data-choice-group="color"] h3{width:100%;margin-bottom:0}
 :host([data-doorbell-presentation]) .doorbell-color-item{display:grid;justify-items:center;gap:7px;font-size:13px}
 :host([data-doorbell-presentation]) .m-option-pictures .doorbell-color-choice{display:block!important;padding:0!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;border:0!important;border-radius:50%!important;overflow:hidden;box-shadow:inset 0 1px 2px #fff5,0 1px 2px #0003}
 :host([data-doorbell-presentation]) .m-option-pictures .doorbell-color-choice svg{display:block;width:44px!important;height:44px!important}
 :host([data-doorbell-presentation]) .m-option-pictures .doorbell-color-choice[aria-pressed="true"]{outline:2px solid #526573;outline-offset:3px}
 :host([data-doorbell-presentation][data-ux-neutral]) .ux-shell .m-option-pictures .doorbell-color-choice{border-radius:50%!important;border:0!important;background:transparent!important;padding:0!important}
 :host([data-doorbell-presentation]) .doorbell-color-choice .completion-check{display:none!important}
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
  pictures.innerHTML=doorbellChoiceGroups(config,options).map(g=>'<div role="group" data-choice-group="'+g.id+'" aria-label="'+esc(g.name)+'"><h3>'+esc(g.name)+'</h3>'+g.values.map(v=>{
   const f=g.id==='format'?config.doorbell.formats.find(f=>f.key===v.id):null;
   const label=({'FK-VERDECKT':'Ohne Rahmen','FK-SEITLICH':'Links & rechts','FK-OBENUNTEN':'Oben & unten'})[v.id]||(v.label==='Laenglich'?'Länglich':v.label);
   const size=f?f.profile.geometry.width/10+' × '+f.profile.geometry.height/10+' cm':'';
   const attr=' data-picture-group="'+esc(g.id)+'" data-picture-option="'+esc(v.id)+'" aria-pressed="'+String(options[g.id]===v.id)+'"';
   if(g.id==='color')return '<div class="doorbell-color-item"><button type="button" class="doorbell-color-choice"'+attr+' aria-label="'+esc(label)+'">'+doorbellChoicePreview(config,options,g.id,v)+'</button><span>'+esc(label)+'</span></div>';
   const price=f||g.id==='mounting'||v.priceCents?'<small>'+esc(optionTilePrice(v,money,{fullPrice:g.id==='format'}))+'</small>':'';
   return '<button type="button" class="m-option-tile"'+attr+'>'+doorbellChoicePreview(config,options,g.id,v)+'<strong>'+esc(label)+'</strong>'+(size?'<small>'+esc(size)+'</small>':'')+price+'</button>';
  }).join('')+'</div>').join('');
  if(focus)pictures.querySelector('[data-picture-group="'+CSS.escape(focus.group)+'"][data-picture-option="'+CSS.escape(focus.value)+'"]')?.focus({preventScroll:true});
 };
}

