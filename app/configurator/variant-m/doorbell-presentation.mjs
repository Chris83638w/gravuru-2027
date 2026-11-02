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
 return ['format','position','color','frame','mounting'].map(id=>id==='position'?position:groups.find(g=>g.id===id)).filter(Boolean);
}
export function doorbellChoicePreview(config,options,groupId,value){
 if(groupId==='mounting'&&value.id==='SIL')return '<svg viewBox="0 0 48 48" aria-hidden="true"><g transform="rotate(24 24 24)" stroke="#48515a" stroke-width="1.4" stroke-linejoin="round"><path d="M22 3h4l3 12H19Z" fill="#f4f5f6"/><rect x="18" y="15" width="12" height="5" rx="1" fill="#ccd2d7"/><path d="M18 17h12"/><rect x="15" y="20" width="18" height="24" rx="2" fill="#fff"/><path d="M15 26h18v11H15Z" fill="#dde6e8"/><path d="M17 41h14"/><text x="24" y="33.7" text-anchor="middle" font-family="Arial,sans-serif" font-size="5.7" font-weight="700" fill="#48515a" stroke="none">SIL</text></g></svg>';
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
 :host([data-doorbell-presentation]) .m-options>label:not([hidden]),
 :host([data-doorbell-presentation]) .m-option-fields [data-m-field-row="position"]:not([hidden]){display:grid!important;gap:5px;margin:10px 0!important;font-size:14px}
 :host([data-doorbell-presentation]) .m-options>label[hidden]{display:none!important}
 :host([data-doorbell-presentation]) .m-options select{width:100%;min-height:44px;box-sizing:border-box;padding:10px 12px;border:1px solid #bdc7d0;border-radius:10px;background:#f5f6f7;color:inherit;font:inherit}
 :host([data-doorbell-presentation]) .m-option-fields{margin:0!important}
 :host([data-doorbell-presentation]) .m-option-pictures{display:block!important;margin-top:16px}
 :host([data-doorbell-presentation]) .m-option-pictures>div{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
 :host([data-doorbell-presentation]) .m-option-pictures h3{grid-column:1/-1;margin:0 0 2px;font-size:16px!important;line-height:22px!important}
 :host([data-doorbell-presentation][data-ux-neutral]) .ux-shell .m-option-pictures [data-picture-group="mounting"]{grid-template-columns:44px minmax(0,1fr);grid-template-rows:auto auto;justify-items:start;align-content:center;column-gap:8px!important;min-height:74px!important;padding:9px!important}
 :host([data-doorbell-presentation]) .m-option-pictures [data-picture-group="mounting"] svg{grid-row:1/3;width:44px!important;height:44px!important;max-height:44px!important}
 :host([data-doorbell-presentation]) .m-option-pictures strong,:host([data-doorbell-presentation]) .m-option-pictures small{text-align:left}
 :host([data-doorbell-presentation]) .m-option-pictures strong{font-size:14px!important;font-weight:500!important}
 :host([data-doorbell-presentation]) .m-option-pictures small{font-size:12px!important}
 :host([data-doorbell-presentation]) .m-option-pictures button:focus-visible,:host([data-doorbell-presentation]) .m-options select:focus-visible{outline:3px solid #235f48;outline-offset:2px}
 /* View-only fit: keep the native geometry, dimensions and zoom/drag mapping. */
 :host([data-doorbell-presentation]) .ux-preview .stage .plate-holder{width:min(94cqw,calc(94cqh * var(--ux-product-width) / var(--ux-product-height)))!important;height:min(94cqh,calc(94cqw * var(--ux-product-height) / var(--ux-product-width)))!important}
 :host([data-doorbell-presentation]) .doorbell-direct-slot{box-sizing:border-box;height:64px;min-height:64px;flex:none;padding:4px 12px;overflow:auto;scrollbar-width:thin}
 :host([data-doorbell-presentation][data-ux-layout]) .doorbell-direct-slot>.ux-direct-edit{position:static!important;inset:auto!important;transform:none!important;width:100%!important;max-width:100%!important;margin:0!important;padding:4px!important}
 :host([data-doorbell-presentation][data-ux-layout]) .doorbell-direct-slot .ux-direct-actions{flex-wrap:nowrap!important}
 @media(min-width:768px){
  :host([data-doorbell-presentation][data-ux-layout]) .ux-shell{box-sizing:border-box;height:100dvh;min-height:0!important;display:flex;flex-direction:column;overflow:clip}
  :host([data-doorbell-presentation][data-ux-layout]) .ux-heading{flex:none}
  :host([data-doorbell-presentation][data-ux-layout]) .ux-layout{flex:1;min-height:0!important;align-items:stretch!important;overflow:clip}
  :host([data-doorbell-presentation][data-ux-layout]) .ux-shell .ux-preview{position:relative!important;top:0!important;height:100%!important;min-height:0;display:flex;flex-direction:column;overflow:clip}
  :host([data-doorbell-presentation][data-ux-layout]) .ux-preview>[data-ux-stage]{flex:1;min-height:0}
  :host([data-doorbell-presentation][data-ux-layout]) .ux-preview :is(.stage-wrap,.stage){height:100%!important;min-height:0!important}
  :host([data-doorbell-presentation][data-ux-layout]) .ux-editor{height:100%;min-height:0;overflow-y:auto;overscroll-behavior:contain}
  :host([data-doorbell-presentation][data-ux-layout]) .ux-tabs{position:sticky;top:0;z-index:50;background:#fff}
 }
 @media(max-width:1199px){:host([data-doorbell-presentation]) .doorbell-direct-slot{height:116px;min-height:116px}:host([data-doorbell-presentation][data-ux-layout]) .doorbell-direct-slot .ux-direct-actions{flex-wrap:wrap!important}}
 `;
 // Reorder existing controls without replacing their event handlers or state logic.
 const fieldBox=picks.querySelector('.m-option-fields');
 for(const id of ['format','position','frame','color']){
  const row=id==='position'?fieldBox:picks.querySelector('[data-m-option="'+id+'"]')?.closest('label');
  if(row)picks.insertBefore(row,pictures);
 }
 const positionHeading=fieldBox?.querySelector('[data-m-field-row="position"]>span');
 if(positionHeading)positionHeading.textContent='Position der Klingel';
 for(const option of picks.querySelectorAll('[data-m-option="format"] option'))option.textContent=option.textContent.replace('Laenglich','Länglich');
 el.shadowRoot.append(style);let previous='';
 pictures.id='doorbell-options-panel';pictures.setAttribute('role','group');pictures.setAttribute('aria-label','Ausführung auswählen');
 return options=>{
  const signature=JSON.stringify(['format','position','frame','color','mounting'].map(k=>options[k]));
  if(previous===signature)return;previous=signature;
  const focused=el.shadowRoot.activeElement?.closest?.('[data-picture-option]');
  const focus=focused?{group:focused.dataset.pictureGroup,value:focused.dataset.pictureOption}:null;
  const money=c=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(c/100);
  pictures.innerHTML=doorbellChoiceGroups(config,options).filter(g=>g.id==='mounting').map(g=>'<div role="group" data-choice-group="'+g.id+'" aria-label="'+esc(g.name)+'"><h3>'+esc(g.name)+'</h3>'+g.values.map(v=>{
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
