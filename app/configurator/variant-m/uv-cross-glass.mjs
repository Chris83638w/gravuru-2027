// The glass is a preview layer around the rear print. Its front silhouette
// uses the selected catalogue contour and the artwork stays at its actual coordinates.
export function uvCrossGlassPreview(profile,plate,id){
 const {width,height}=profile.geometry;
 const thickness=profile.material.thicknessMm;
 const dx=thickness*.4,dy=thickness*.54;
 const shape=attrs=>plate+' '+attrs+'/>';
 const side=id+'-uv-side',rim=id+'-uv-rim',gloss=id+'-uv-gloss',mask=id+'-uv-edge';
 const defs=`<defs>
 <linearGradient id="${side}" x2=".35" y2="1">
   <stop stop-color="#395f56" stop-opacity=".48"/>
   <stop offset=".25" stop-color="#e6fcf5" stop-opacity=".74"/>
   <stop offset=".48" stop-color="#5f8575" stop-opacity=".40"/>
   <stop offset=".73" stop-color="#cfe6d4" stop-opacity=".60"/>
   <stop offset="1" stop-color="#243e34" stop-opacity=".68"/>
 </linearGradient>
 <linearGradient id="${rim}" x2="1" y2=".8">
   <stop stop-color="#fff" stop-opacity=".97"/>
   <stop offset=".22" stop-color="#f3fff9" stop-opacity=".72"/>
   <stop offset=".34" stop-color="#8ba79e" stop-opacity=".53"/>
   <stop offset=".48" stop-color="#fff" stop-opacity=".92"/>
   <stop offset=".78" stop-color="#d9f3e9" stop-opacity=".45"/>
   <stop offset="1" stop-color="#5d7f72" stop-opacity=".73"/>
 </linearGradient>
 <linearGradient id="${gloss}" x1=".15" y1="0" x2=".85" y2="1">
   <stop stop-color="#fff" stop-opacity=".15"/>
   <stop offset=".19" stop-color="#fff" stop-opacity=".015"/>
   <stop offset=".205" stop-color="#fff" stop-opacity=".21"/>
   <stop offset=".225" stop-color="#fff" stop-opacity=".11"/>
   <stop offset=".32" stop-color="#fff" stop-opacity="0"/>
   <stop offset=".74" stop-color="#fff" stop-opacity="0"/>
   <stop offset=".96" stop-color="#edfdf6" stop-opacity=".14"/>
   <stop offset="1" stop-color="#edfdf6" stop-opacity=".06"/>
 </linearGradient>
 <mask id="${mask}" maskUnits="userSpaceOnUse" x="-3" y="-3" width="${width+8}" height="${height+8}">
   <rect x="-3" y="-3" width="${width+8}" height="${height+8}" fill="#fff"/>${shape('fill="#000"')}
 </mask></defs>`;
 const back=defs+`<g data-role="guide" data-preview-acrylic-glass="klar" pointer-events="none" aria-hidden="true">
 ${shape(`transform="translate(${dx} ${dy})" fill="url(#${side})" stroke="#344b43" stroke-opacity=".5" stroke-width=".40" mask="url(#${mask})"`)}
 ${shape('fill="#eefbf5" fill-opacity=".07" stroke="#58746c" stroke-opacity=".48" stroke-width=".72"')}
 </g>`;
 const front=`<g data-role="guide" data-preview-glass-finish="front" pointer-events="none" aria-hidden="true">
 ${shape(`fill="url(#${gloss})" stroke="url(#${rim})" stroke-width=".58"`)}
 </g>`;
 return {back,front,artwork:content=>content};
}
