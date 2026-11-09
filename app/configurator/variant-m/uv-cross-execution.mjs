import {escapeXml as esc} from '../../platform/sources/app/shared/models/design-content.mjs';
import {familyFormatPrice} from './family-formats.mjs';
import {money} from './contract.mjs';

export {uvCrossGlassPreview} from './uv-cross-glass.mjs';

export function uvCrossSizeMarkup(config){
 const formats=config.familyFormats?.formats||[];
 const sizeGroup=config.profile.optionGroups?.find(group=>group.id==='size');
 if(!sizeGroup||!formats.length)return '';
 const largest=Math.max(...formats.map(format=>format.geometry.height));
 const choices=sizeGroup.values.map(value=>{
  const format=formats.find(format=>format.key===value.id);
  const {width,height,outlinePath}=format.geometry;
  const scale=1/3+2*height/(3*largest);
  const icon=`<svg viewBox="-3 -3 ${width+6} ${height+6}" aria-hidden="true" focusable="false" style="--uv-cross-icon-scale:${scale}"><path d="${esc(outlinePath)}" fill="currentColor" fill-opacity=".10" stroke="currentColor" stroke-width="1.4" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
  return `<button type="button" class="m-option-tile" data-picture-group="size" data-picture-option="${esc(value.id)}" aria-pressed="false">${icon}<strong>${esc(value.label)}</strong><small title="Grundpreis">${esc(money(familyFormatPrice(config,{size:value.id})))}</small></button>`;
 });
 return `<div role="group" aria-label="Größe" data-uv-cross-sizes>${choices.join('')}</div>`;
}

export function installUvCrossExecution({el,config,picks,pictures}){
 el.dataset.productExecution='uv-cross';
 for(const label of picks.querySelectorAll(':scope>label'))label.remove();
 pictures.innerHTML=uvCrossSizeMarkup(config);
 const material=document.createElement('p');
 material.className='uv-cross-material';
 material.textContent='Klares Acrylglas · '+config.profile.material.thicknessMm+' mm · rückseitiger UV-Druck';
 picks.prepend(material);
 const style=document.createElement('style');
 style.textContent=`
 :host([data-product-execution="uv-cross"][data-universal-profile]) :is(.ux-shell .ux-preview,.c-large-preview .fk-live-preview) .stage:not(.acryl-scene){
  background:linear-gradient(152deg,#d9e6e3 0%,#e5eeeb 35%,#f8faf8 58%,#f0f4f1 100%)!important;
 }
 :host([data-product-execution="uv-cross"][data-universal-profile]) :is(.ux-shell .ux-preview,.c-large-preview .fk-live-preview) .stage :is(.plate-holder,svg.scene){
  background:transparent!important;box-shadow:none!important;
 }
 .m-option-pictures>div[data-uv-cross-sizes]{grid-template-columns:repeat(3,minmax(0,1fr))}
 [data-uv-cross-sizes] button.m-option-tile{min-width:0;min-height:104px;padding:8px 2px!important}
 [data-uv-cross-sizes] button.m-option-tile svg{width:42px;height:46px;transform:scale(var(--uv-cross-icon-scale));transform-origin:center bottom}
 [data-uv-cross-sizes] button.m-option-tile strong,[data-uv-cross-sizes] button.m-option-tile small{white-space:nowrap}
 @media(max-width:420px){[data-uv-cross-sizes] button.m-option-tile strong{font-size:12px}}
 `;
 el.shadowRoot.append(style);
 return ()=>{};
}
