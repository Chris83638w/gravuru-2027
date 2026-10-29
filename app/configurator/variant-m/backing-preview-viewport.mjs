import {universalPreviewViewport} from '../../platform/sources/app/shared/models/studio-svg.mjs';
// The legacy SVG shell discards the renderer's outer viewBox. Keep backing and
// front in one mm coordinate system, and dimension arrows on the front plate.
export function updateBackingPreviewViewport(el,profile){
 if(!profile.backingPreview)return;
 const [x,y,w,h]=universalPreviewViewport(profile),r=el.shadowRoot,g=profile.geometry;
 el.style.setProperty('--m-plate-width',String(w));el.style.setProperty('--m-plate-height',String(h));el.style.setProperty('--ux-ratio',w+'/'+h);
 for(const node of r.querySelectorAll('.ux-preview'))node.style.setProperty('--ux-ratio',w+'/'+h);
 for(const node of r.querySelectorAll('.plate-holder'))node.style.setProperty('aspect-ratio',w+'/'+h,'important');
 for(const scene of r.querySelectorAll('.scene'))scene.setAttribute('viewBox',[x,y,w,h].join(' '));
 for(const node of r.querySelectorAll('.dimension-x')){node.style.setProperty('left',(-x/w*100)+'%','important');node.style.setProperty('right','auto','important');node.style.setProperty('width',(g.width/w*100)+'%','important');}
 for(const node of r.querySelectorAll('.dimension-y')){node.style.setProperty('top',(-y/h*100)+'%','important');node.style.setProperty('bottom','auto','important');node.style.setProperty('height',(g.height/h*100)+'%','important');}
}

export function productPreviewSize(el){
 const profile=el.uxSelectedProfile?.();if(!profile?.backingPreview)return {width:el.state.width,height:el.state.height};
 const box=universalPreviewViewport(profile);return {width:box[2],height:box[3]};
}
