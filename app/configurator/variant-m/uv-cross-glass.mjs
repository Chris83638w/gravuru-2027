// The glass is a preview layer around the rear print. Its front silhouette
// uses the selected catalogue contour and the artwork stays at its actual coordinates.
export function uvCrossGlassPreview(profile,plate,id){
 const shape=attrs=>plate+' '+attrs+'/>';
 const edge=id+'-uv-edge',glint=id+'-uv-glint',gloss=id+'-uv-gloss',clip=id+'-uv-rim-clip';
 // Both bands follow one contour. Clipping keeps only their inner halves,
 // suggesting the polished side and bevel without offsetting the silhouette.
 const thickness=profile.material.thicknessMm,edgeWidth=thickness*.6,glintWidth=thickness*.16;
 const defs=`<defs>
 <clipPath id="${clip}">${shape('clip-rule="evenodd"')}</clipPath>
 <linearGradient id="${edge}" x1="0" y1="0" x2="1" y2=".66">
   <stop stop-color="#617987" stop-opacity=".57"/>
   <stop offset=".16" stop-color="#a2b6c2" stop-opacity=".46"/>
   <stop offset=".27" stop-color="#657d8b" stop-opacity=".52"/>
   <stop offset=".36" stop-color="#e4edf2" stop-opacity=".74"/>
   <stop offset=".49" stop-color="#738996" stop-opacity=".48"/>
   <stop offset=".62" stop-color="#586e7b" stop-opacity=".62"/>
   <stop offset=".77" stop-color="#d8e6ed" stop-opacity=".71"/>
   <stop offset=".85" stop-color="#8198a4" stop-opacity=".49"/>
   <stop offset="1" stop-color="#536975" stop-opacity=".63"/>
 </linearGradient>
 <linearGradient id="${glint}" x1=".05" y1="0" x2=".95" y2=".83">
   <stop stop-color="#fff" stop-opacity="1"/>
   <stop offset=".23" stop-color="#b2c2cc" stop-opacity=".62"/>
   <stop offset=".32" stop-color="#fff" stop-opacity="1"/>
   <stop offset=".52" stop-color="#e8f2f7" stop-opacity=".81"/>
   <stop offset=".65" stop-color="#fff" stop-opacity=".99"/>
   <stop offset=".79" stop-color="#a8bcc8" stop-opacity=".62"/>
   <stop offset=".88" stop-color="#fff" stop-opacity="1"/>
   <stop offset="1" stop-color="#f5fbff" stop-opacity=".88"/>
 </linearGradient>
 <linearGradient id="${gloss}" x1=".15" y1="0" x2=".85" y2="1">
   <stop stop-color="#fff" stop-opacity=".065"/>
   <stop offset=".24" stop-color="#fff" stop-opacity=".015"/>
   <stop offset=".41" stop-color="#fff" stop-opacity="0"/>
   <stop offset=".5" stop-color="#fff" stop-opacity=".12"/>
   <stop offset=".57" stop-color="#fff" stop-opacity="0"/>
   <stop offset="1" stop-color="#edf3f7" stop-opacity=".035"/>
 </linearGradient>
 </defs>`;
 const back=defs+`<g data-role="guide" data-preview-acrylic-glass="klar" pointer-events="none" aria-hidden="true">
 ${shape('fill="#eefbf5" fill-opacity=".025"')}
 </g>`;
 const front=`<g data-role="guide" data-preview-glass-finish="front" pointer-events="none" aria-hidden="true">
 ${shape(`fill="url(#${gloss})"`)}
 <g data-preview-polished-edge="" clip-path="url(#${clip})" fill="none">
 ${shape(`stroke="url(#${edge})" stroke-width="${edgeWidth}" stroke-linejoin="round"`)}
 ${shape(`stroke="url(#${glint})" stroke-width="${glintWidth}" stroke-linejoin="round"`)}
 </g>
 </g>`;
 return {back,front,artwork:content=>content};
}
