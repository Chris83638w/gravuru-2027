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
 :host([data-doorbell-presentation]) .doorbell-option-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;border-bottom:1px solid #dce0e4;margin:0 0 14px}
 :host([data-doorbell-presentation][data-ux-neutral]) .ux-shell .doorbell-option-tabs button{min-height:44px!important;padding:8px 5px!important;font-size:13px!important;line-height:1.3!important;border:0!important;border-radius:6px 6px 0 0!important;background:transparent!important;color:#4c5359!important;box-shadow:none!important}
 :host([data-doorbell-presentation][data-ux-neutral]) .ux-shell .doorbell-option-tabs button[aria-selected="true"]{background:#f0f2f3!important;color:#20272c!important;box-shadow:inset 0 -2px #485761!important;font-weight:600!important}
 :host([data-doorbell-presentation]) .doorbell-option-tabs button:focus-visible{outline:2px solid #526573;outline-offset:2px}
 :host([data-doorbell-presentation]) .m-option-pictures[data-option-section="layout"]>[data-choice-group]:not([data-choice-group="format"]):not([data-choice-group="position"]),
 :host([data-doorbell-presentation]) .m-option-pictures[data-option-section="appearance"]>[data-choice-group]:not([data-choice-group="frame"]):not([data-choice-group="color"]),
 :host([data-doorbell-presentation]) .m-option-pictures[data-option-section="mounting"]>[data-choice-group]:not([data-choice-group="mounting"]){display:none!important}
 :host([data-doorbell-presentation]) .m-options>label,
 :host([data-doorbell-presentation]) .m-option-fields [data-m-field-row="position"]{display:none!important}
 :host([data-doorbell-presentation]) .m-option-pictures>div{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 18px}
 :host([data-doorbell-presentation]) .m-option-pictures>[data-choice-group="format"],:host([data-doorbell-presentation]) .m-option-pictures>[data-choice-group="position"]{grid-template-columns:minmax(0,1fr)!important;gap:6px;margin-bottom:14px;padding:0;border:0;background:transparent}
 :host([data-doorbell-presentation][data-ux-neutral]) .ux-shell .m-option-pictures .m-option-tile[data-picture-group="format"],:host([data-doorbell-presentation][data-ux-neutral]) .ux-shell .m-option-pictures .m-option-tile[data-picture-group="position"]{grid-template-columns:40px minmax(0,1fr) auto!important;grid-template-rows:auto auto;align-items:center;justify-items:start;min-height:48px!important;column-gap:8px!important;padding:5px 10px!important}
 :host([data-doorbell-presentation]) .m-option-pictures [data-picture-group="format"] svg,:host([data-doorbell-presentation]) .m-option-pictures [data-picture-group="position"] svg{grid-column:1;grid-row:1/3;width:40px!important;height:32px!important;max-height:32px!important}
 :host([data-doorbell-presentation]) .m-option-pictures [data-picture-group="format"] strong,:host([data-doorbell-presentation]) .m-option-pictures [data-picture-group="position"] strong{grid-column:2;grid-row:1;text-align:left}
 :host([data-doorbell-presentation]) .m-option-pictures [data-picture-group="position"] strong{grid-row:1/3}
 :host([data-doorbell-presentation]) .m-option-pictures [data-picture-group="format"] small{grid-column:2;grid-row:2}
 :host([data-doorbell-presentation]) .m-option-pictures [data-picture-group="format"] small:last-of-type{grid-column:3;grid-row:1/3;white-space:nowrap;padding-right:24px}
 :host([data-doorbell-presentation]) .m-option-pictures>[data-choice-group="frame"]{grid-template-columns:repeat(4,minmax(0,1fr))!important}
 :host([data-doorbell-presentation]) .m-option-pictures h3{grid-column:1/-1;margin:0 0 2px;font-size:16px}
 :host([data-doorbell-presentation][data-ux-neutral]) .ux-shell .m-option-pictures .m-option-tile{padding:7px 5px!important;min-height:76px!important;border-radius:8px!important;gap:3px!important}
 :host([data-doorbell-presentation]) .m-option-pictures .m-option-tile svg{width:100%!important;height:36px!important;max-height:36px!important}
 :host([data-doorbell-presentation][data-ux-neutral]) .ux-shell .m-option-pictures [data-picture-group="mounting"]{grid-template-columns:44px 1fr;grid-template-rows:auto auto;justify-items:start;align-content:center;column-gap:8px!important;min-height:78px!important;padding:9px!important}
 :host([data-doorbell-presentation]) .m-option-pictures [data-picture-group="mounting"] svg{grid-row:1/3;width:44px!important;height:44px!important;max-height:44px!important}
 :host([data-doorbell-presentation]) .m-option-pictures [data-picture-group="mounting"] strong,:host([data-doorbell-presentation]) .m-option-pictures [data-picture-group="mounting"] small{text-align:left}
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
 :host([data-doorbell-presentation]) .m-option-pictures svg svg{width:revert!important;height:revert!important}
 :host([data-doorbell-presentation]) .m-option-pictures button[aria-pressed="true"]{border:2px solid #235f48;background:#f0f6f2}
 :host([data-doorbell-presentation]) .m-option-pictures button:focus-visible{outline:3px solid #235f48;outline-offset:3px}
 `;
 el.shadowRoot.append(style);let previous='';
 const sections=[['layout','Format & Position'],['appearance','Rahmen & Farbe'],['mounting','Befestigung']];
 const tabs=document.createElement('nav');tabs.className='doorbell-option-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Ausführung auswählen');
 tabs.innerHTML=sections.map(([key,label])=>'<button type="button" role="tab" id="doorbell-option-'+key+'" data-doorbell-option-tab="'+key+'" aria-controls="doorbell-options-panel">'+esc(label)+'</button>').join('');
 pictures.before(tabs);pictures.id='doorbell-options-panel';pictures.setAttribute('role','tabpanel');
 function showSection(key,focus=false){
  pictures.dataset.optionSection=key;pictures.setAttribute('aria-labelledby','doorbell-option-'+key);
  for(const b of tabs.children){const active=b.dataset.doorbellOptionTab===key;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus();}
 }
 tabs.addEventListener('click',e=>{const b=e.target.closest('[data-doorbell-option-tab]');if(b)showSection(b.dataset.doorbellOptionTab);});
 tabs.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  const i=sections.findIndex(([key])=>key===e.target.dataset.doorbellOptionTab);if(i<0)return;
  e.preventDefault();e.stopPropagation();const next=e.key==='Home'?0:e.key==='End'?sections.length-1:(i+(e.key==='ArrowRight'?1:-1)+sections.length)%sections.length;showSection(sections[next][0],true);
 });
 showSection('layout');
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
