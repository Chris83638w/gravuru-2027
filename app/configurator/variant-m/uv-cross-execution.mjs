import {escapeXml as esc} from '../../platform/sources/app/shared/models/design-content.mjs';
import {familyFormatPrice} from './family-formats.mjs';
import {money} from './contract.mjs';
import {transformedCorners} from './usability-model.mjs';

export {uvCrossGlassPreview} from './uv-cross-glass.mjs';

// Placement on the square garden photograph. The full contour extends under
// the photographed soil, while the editor keeps using its physical millimetres.
const plateTop=6,plateHeight=84,ground=76;
const stageSelector=':host([data-product-execution="uv-cross"][data-universal-profile][data-ux-layout]) :is(.ux-shell .ux-preview,.c-large-preview .fk-live-preview) .stage[data-uv-cross-stage]';

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
 const stage=el.shadowRoot.querySelector('.stage');
 const holder=stage.querySelector('.plate-holder');
 const refraction=document.createElement('div');
 const foreground=document.createElement('div');
 const dimensions=document.createElement('span');
 stage.dataset.uvCrossStage='';
 refraction.className='uv-cross-refraction';
 foreground.className='uv-cross-foreground';
 for(const node of [refraction,foreground])node.setAttribute('aria-hidden','true');
 dimensions.className='uv-cross-dimensions';
 holder.prepend(refraction);
 stage.append(foreground,dimensions);
 const style=document.createElement('style');
 style.textContent=`
 ${stageSelector}:not(.acryl-scene){
  --uv-cross-room:calc(100dvh - 220px - var(--ux-textbar-h,0px));
  --uv-cross-backdrop:url("/acrylic-assets/uv-cross-garden-square.webp") center / cover no-repeat,
    linear-gradient(155deg,#c5d6bd,#7f9970 60%,#6d5e47 76%,#554435);
  box-sizing:border-box!important;position:relative!important;isolation:isolate;
  width:min(100%,max(120px,var(--uv-cross-room)))!important;height:auto!important;
  min-height:0!important;max-height:none!important;aspect-ratio:1!important;
  flex:none!important;margin-inline:auto!important;padding:0!important;
  border:0!important;container-type:inline-size!important;overflow:hidden!important;
  background:var(--uv-cross-backdrop)!important;
 }
 ${stageSelector}:is(.c-large-preview .stage){--uv-cross-room:calc(100dvh - 245px)}
 ${stageSelector}:not(.acryl-scene)>.plate-holder{
  --uv-cross-plate-width:calc(${plateHeight}cqw * (var(--ux-ratio)));
  position:absolute!important;top:${plateTop}%!important;left:calc(50% - var(--uv-cross-plate-width) / 2)!important;
  width:var(--uv-cross-plate-width)!important;height:${plateHeight}%!important;
  max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important;
  margin:0!important;z-index:1;
 }
 ${stageSelector} :is(.plate-holder,svg.scene){
  background:transparent!important;box-shadow:none!important;filter:none!important;
 }
 ${stageSelector} svg.scene{position:relative;height:100%!important}
 .uv-cross-refraction{
  position:absolute;inset:0;pointer-events:none;
  mask-size:100% 100%;mask-repeat:no-repeat;
  backdrop-filter:blur(.35px) contrast(1.035) brightness(.985);
 }
 .uv-cross-foreground{
  position:absolute;inset:0;pointer-events:none;z-index:2;
  background:radial-gradient(ellipse 12% 1.35% at 50% ${ground}%,#23271f70,transparent),var(--uv-cross-backdrop);
  mask-image:linear-gradient(transparent ${ground-.5}%,#000 ${ground+.15}%);
 }
 [data-uv-cross-reveal]>.uv-cross-foreground,[data-uv-cross-stage][data-view-zoom]:not([data-view-zoom="1"])>.uv-cross-foreground{visibility:hidden}
 ${stageSelector} :is(.dimension-x,.dimension-y){display:none!important}
 .uv-cross-dimensions{
  position:absolute;z-index:3;top:8px;left:8px;padding:4px 8px;border-radius:5px;
  background:#f7fbf4f2;color:#253229;font:600 12px/1.25 system-ui,sans-serif;white-space:nowrap;
 }
 @media(max-width:767px){
  ${stageSelector}:is(.ux-preview .stage){--uv-cross-room:var(--ux-mobile-preview-h,40dvh)}
  .uv-cross-dimensions{padding:3px 5px;font-size:11px}
 }
 .m-option-pictures>div[data-uv-cross-sizes]{grid-template-columns:repeat(3,minmax(0,1fr))}
 [data-uv-cross-sizes] button.m-option-tile{min-width:0;min-height:104px;padding:8px 2px!important}
 [data-uv-cross-sizes] button.m-option-tile svg{width:42px;height:46px;transform:scale(var(--uv-cross-icon-scale));transform-origin:center bottom}
 [data-uv-cross-sizes] button.m-option-tile strong,[data-uv-cross-sizes] button.m-option-tile small{white-space:nowrap}
 @media(max-width:420px){[data-uv-cross-sizes] button.m-option-tile strong{font-size:12px}}
 `;
 el.shadowRoot.append(style);
 let lastOutline;
 const mm=new Intl.NumberFormat('de-DE',{maximumFractionDigits:3});
 return ()=>{
  const {width,height,outlinePath}=el.uxSelectedProfile().geometry;
  if(lastOutline!==outlinePath){
   const mask=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="white" d="${esc(outlinePath)}"/></svg>`;
   refraction.style.maskImage=`url("data:image/svg+xml,${encodeURIComponent(mask)}")`;
   dimensions.textContent=`${mm.format(width)} × ${mm.format(height)} mm`;
   lastOutline=outlinePath;
  }
  const selected=el.state.objects.find(object=>object.id===el.state.selected);
  const groundY=height*(ground-plateTop)/plateHeight;
  const needsEditingRoom=selected&&transformedCorners(selected,{x:-selected.w/2,y:-selected.h/2,width:selected.w,height:selected.h}).some(point=>point.y>groundY);
  stage.toggleAttribute('data-uv-cross-reveal',Boolean(needsEditingRoom));
 };
}
