// The glass is a preview layer around the rear print. Its front silhouette
// uses the selected catalogue contour and the artwork stays at its actual coordinates.
export function uvCrossGlassPreview(profile,plate,id){
 const shape=attrs=>plate+' '+attrs+'/>';
 const edge=id+'-uv-edge',glint=id+'-uv-glint',gloss=id+'-uv-gloss',clip=id+'-uv-rim-clip';
 // Near-frontal projection of the polished edge. Clip the centered stroke to
 // the face so the edge joins the exact silhouette through every corner.
 const edgeWidth=profile.material.thicknessMm*.6;
 const defs=`<defs>
 <clipPath id="${clip}">${shape('clip-rule="evenodd"')}</clipPath>
 <linearGradient id="${edge}" x1="0" y1="0" x2=".86" y2=".62">
   <stop stop-color="#fafcf0" stop-opacity=".71"/>
   <stop offset=".27" stop-color="#c6d5cf" stop-opacity=".36"/>
   <stop offset=".48" stop-color="#f0f6f4" stop-opacity=".63"/>
   <stop offset=".73" stop-color="#899d99" stop-opacity=".34"/>
   <stop offset="1" stop-color="#e2ece7" stop-opacity=".57"/>
 </linearGradient>
 <linearGradient id="${glint}" x1=".05" y1="0" x2=".95" y2=".83">
   <stop stop-color="#fff" stop-opacity=".99"/>
   <stop offset=".28" stop-color="#fffcf3" stop-opacity=".67"/>
   <stop offset=".49" stop-color="#fff" stop-opacity=".97"/>
   <stop offset=".72" stop-color="#e7f0eb" stop-opacity=".42"/>
   <stop offset="1" stop-color="#fff" stop-opacity=".91"/>
 </linearGradient>
 <linearGradient id="${gloss}" x1=".15" y1="0" x2=".85" y2="1">
   <stop stop-color="#fff" stop-opacity=".065"/>
   <stop offset=".24" stop-color="#fff" stop-opacity=".015"/>
   <stop offset=".66" stop-color="#fff" stop-opacity="0"/>
   <stop offset="1" stop-color="#effaf6" stop-opacity=".035"/>
 </linearGradient>
 </defs>`;
 const back=defs+`<g data-role="guide" data-preview-acrylic-glass="klar" pointer-events="none" aria-hidden="true">
 ${shape('fill="#eefbf5" fill-opacity=".025"')}
 </g>`;
 const front=`<g data-role="guide" data-preview-glass-finish="front" pointer-events="none" aria-hidden="true">
 ${shape(`fill="url(#${gloss})"`)}
 <g data-preview-polished-edge="" clip-path="url(#${clip})" fill="none">
 ${shape(`stroke="url(#${edge})" stroke-width="${edgeWidth}" stroke-linejoin="round"`)}
 ${shape(`stroke="url(#${glint})" stroke-width=".64" stroke-linejoin="round"`)}
 </g>
 </g>`;
 return {back,front,artwork:content=>content};
}
