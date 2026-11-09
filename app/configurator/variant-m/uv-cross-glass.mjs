// The glass is a preview layer around the rear print. Its front silhouette
// uses the selected catalogue contour and the artwork stays at its actual coordinates.
export function uvCrossGlassPreview(profile,plate,id){
 const {width,height}=profile.geometry;
 const thickness=profile.material.thicknessMm;
 const dx=thickness*.35,dy=thickness*.5;
 const shape=attrs=>plate+' '+attrs+'/>';
 const side=id+'-uv-side',rim=id+'-uv-rim',gloss=id+'-uv-gloss',mask=id+'-uv-edge';
 const defs=`<defs>
 <linearGradient id="${side}" x2="0" y2="1">
   <stop stop-color="#6a938f" stop-opacity=".43"/><stop offset=".46" stop-color="#e2f5ef" stop-opacity=".7"/><stop offset="1" stop-color="#507a79" stop-opacity=".61"/>
 </linearGradient>
 <linearGradient id="${rim}" x2="1" y2=".8">
   <stop stop-color="#fff" stop-opacity=".98"/><stop offset=".25" stop-color="#829f9b" stop-opacity=".78"/><stop offset=".57" stop-color="#fff" stop-opacity=".94"/><stop offset="1" stop-color="#668a89" stop-opacity=".87"/>
 </linearGradient>
 <linearGradient id="${gloss}" x1=".08" y1="0" x2=".67" y2="1">
   <stop stop-color="#fff" stop-opacity=".25"/><stop offset=".21" stop-color="#fff" stop-opacity=".07"/><stop offset=".225" stop-color="#fff" stop-opacity=".23"/><stop offset=".31" stop-color="#fff" stop-opacity=".02"/><stop offset=".78" stop-color="#fff" stop-opacity=".01"/><stop offset="1" stop-color="#fff" stop-opacity=".18"/>
 </linearGradient>
 <mask id="${mask}" maskUnits="userSpaceOnUse" x="-3" y="-3" width="${width+8}" height="${height+8}">
   <rect x="-3" y="-3" width="${width+8}" height="${height+8}" fill="#fff"/>${shape('fill="#000"')}
 </mask></defs>`;
 const back=defs+`<g data-role="guide" data-preview-acrylic-glass="klar" pointer-events="none" aria-hidden="true">
 ${shape(`transform="translate(${dx} ${dy})" fill="url(#${side})" stroke="#6f9994" stroke-opacity=".48" stroke-width=".45" mask="url(#${mask})"`)}
 ${shape('fill="#f3fcfa" fill-opacity=".07" stroke="#668c88" stroke-opacity=".62" stroke-width=".85"')}
 </g>`;
 const front=`<g data-role="guide" data-preview-glass-finish="front" pointer-events="none" aria-hidden="true">
 ${shape(`fill="url(#${gloss})" stroke="url(#${rim})" stroke-width=".58"`)}
 </g>`;
 return {back,front,artwork:content=>content};
}
