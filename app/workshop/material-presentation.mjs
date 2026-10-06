// Presentation only: these choices never define production colors or geometry.
export const PRINT_SURFACES=Object.freeze(['front','reverse']);
export const MATERIAL_SCENES=Object.freeze(['transparent','studio','warm']);
export const ACRYLIC_SURFACES=Object.freeze({
 'acrylic-clear':{label:'Klares Acrylglas',colors:['#edf6f6','#cedddb','#ffffff'],opacity:.13,edge:'#a4b6b5',gloss:true},
 'acrylic-satin':{label:'Satiniertes Acrylglas',colors:['#f4f5f4','#cdd3d3','#edf0ef'],opacity:.78,edge:'#aebabc',gloss:false},
 'acrylic-anthracite':{label:'Anthrazit-Acrylglas',colors:['#484d51','#252b2f','#3a4145'],opacity:1,edge:'#727e82',gloss:true},
 'acrylic-black':{label:'Schwarzes Acrylglas',colors:['#27292b','#08090a','#171a1c'],opacity:1,edge:'#535b5e',gloss:true}
});
const n=v=>Number(v.toFixed(5));
const path=g=>g.contours.map(c=>c.d+' Z').join(' ');
export function presentationLayers(document){
 const g=document.form.geometry,a=ACRYLIC_SURFACES[document.material.id],d=path(g),t=document.material.thicknessMm;
 const thickness=Number.isFinite(t)&&t>0&&t<=100?t:0;
 // Fixed oblique 2D edge projection; front coordinates remain original mm.
 const dx=n(thickness*.22),dy=n(thickness*.48),pad=Math.max(g.widthMm,g.heightMm)*.06;
 const box=[-pad,-pad,g.widthMm+pad*2+dx,g.heightMm+pad*2+dy].map(n),[x,y,w,h]=box;
 const scene=document.presentation?.scene||'transparent';
 if(!MATERIAL_SCENES.includes(scene))throw Error('Unbekannte Vorschau-Szene.');
 const color=a?.edge||({steel:'#777e83',oak:'#88704c',beech:'#b19067',cherry:'#875134','leather-brown':'#654737'}[document.material.id]||'#727a7b');
 const defs=`<defs><path id="material-edge-shape" d="${d}"/><filter id="material-soft-shadow" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><feGaussianBlur stdDeviation="${n(Math.max(g.widthMm,g.heightMm)*.009)}"/></filter><linearGradient id="material-scene" x2="0" y2="1"><stop stop-color="${scene==='warm'?'#f4eee5':'#f6f7f8'}"/><stop offset="1" stop-color="${scene==='warm'?'#d9cdbb':'#dbe0e3'}"/></linearGradient><radialGradient id="material-light"><stop stop-color="#ffffff" stop-opacity=".7"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient><linearGradient id="material-edge" x2=".7" y2="1"><stop stop-color="${color}"/><stop offset=".45" stop-color="${color}"/><stop offset=".6" stop-color="#eff1ed"/><stop offset=".8" stop-color="${color}"/><stop offset="1" stop-color="${color}"/></linearGradient><mask id="material-hole-clearance" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white"/><path d="${g.contours[0].d} Z" fill="black"/></mask></defs>`;
 const backdrop=scene==='transparent'?'':`<g data-preview-scene="${scene}" pointer-events="none"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#material-scene)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#material-light)"/></g>`;
 // Stepped closed paths give arbitrary contours a continuous edge. Mask keeps
 // the entire front clear, including its original holes and transparent face.
 const steps=Math.min(100,Math.max(1,Math.ceil(thickness*3)));
 const edge=thickness?`<g data-preview-depth-mm="${thickness}" mask="url(#material-hole-clearance)" fill="url(#material-edge)" fill-rule="evenodd" pointer-events="none">${Array.from({length:steps},(_,i)=>{const f=(steps-i)/steps;return `<use href="#material-edge-shape" transform="translate(${n(dx*f)} ${n(dy*f)})"/>`;}).join('')}</g>`:'';
 const shadow=scene==='transparent'?'':`<g data-preview-shadow="true" mask="url(#material-hole-clearance)" pointer-events="none"><use href="#material-edge-shape" transform="translate(${dx} ${n(dy+pad*.16)})" fill="#283136" fill-opacity=".16" fill-rule="evenodd" filter="url(#material-soft-shadow)"/></g>`;
 return {box,defs,backdrop,shadow,edge,thickness,scene};
}
export function acrylicSurface(document){
 const a=ACRYLIC_SURFACES[document.material.id];if(!a)return null;
 const g=document.form.geometry,d=path(g),[c1,c2,c3]=a.colors;
 const defs=`<defs><linearGradient id="material-acrylic-face" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="${c1}"/><stop offset=".56" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient><linearGradient id="material-reflection" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="white" stop-opacity=".05"/><stop offset=".12" stop-color="white" stop-opacity=".23"/><stop offset=".24" stop-color="white" stop-opacity=".02"/><stop offset=".8" stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="white" stop-opacity=".08"/></linearGradient><linearGradient id="material-rim" x2=".6" y2="1"><stop stop-color="white"/><stop offset=".38" stop-color="${a.edge}"/><stop offset=".6" stop-color="white"/><stop offset="1" stop-color="${a.edge}"/></linearGradient></defs>`;
 const face=`${defs}<path data-preview-acrylic="${document.material.id}" d="${d}" fill="url(#material-acrylic-face)" fill-opacity="${a.opacity}" fill-rule="evenodd"/>`;
 const finish=`<g data-preview-finish="acrylic" pointer-events="none" clip-path="url(#material-form-clip)">${a.gloss?`<path d="${d}" fill="url(#material-reflection)" fill-rule="evenodd"/>`:''}<path d="${d}" fill="none" stroke="url(#material-rim)" stroke-width=".55"/><path d="${d}" fill="none" stroke="${a.edge}" stroke-opacity=".7" stroke-width=".1"/></g>`;
 return {label:a.label,face,finish};
}
// Fine, deterministic preview texture. Composite against source alpha: never
// add dots to clear glass, holes or outside the artwork. Preserve source alpha.
export const UV_INK_FILTER=`<defs><filter id="material-uv-ink" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="8" numOctaves="1" seed="17" result="grain"/><feColorMatrix in="grain" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 .05"/><feComposite in2="SourceAlpha" operator="in" result="dots"/><feBlend in="SourceGraphic" in2="dots" mode="soft-light"/><feComposite in2="SourceGraphic" operator="atop"/></filter></defs>`;
// Preview of frosted acrylic engraving: darkness becomes light engraving
// strength. White means no engraving, matching the existing grayscale export.
// Keep original alpha (including photos, holes and antialiasing) as a multiplier.
export const ACRYLIC_ENGRAVING_FILTER=`<defs><filter id="material-acrylic-engraving" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 .94  0 0 0 0 .95  0 0 0 0 .94  -.2126 -.7152 -.0722 0 1"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs>`;
// Approximate engraving tones from the frozen material references; no
// machine calibration, material thickness or production color is inferred.
export const DARK_ENGRAVING_TONES=Object.freeze({
 steel:{rgb:[.055,.06,.06],label:'Dunkle Edelstahlgravur'},
 oak:{rgb:[.20,.095,.035],label:'Dunkelbraune Holzgravur'},
 beech:{rgb:[.20,.095,.035],label:'Dunkelbraune Holzgravur'},
 cherry:{rgb:[.20,.095,.035],label:'Dunkelbraune Holzgravur'},
 'leather-brown':{rgb:[.12,.055,.025],label:'Dunkle Ledergravur'}
});
export function darkEngravingFilter(materialId){
 const tone=DARK_ENGRAVING_TONES[materialId];if(!tone)return '';
 const [r,g,b]=tone.rgb;
 return `<defs><filter id="material-dark-engraving" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  -.2126 -.7152 -.0722 0 1"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs>`;
}
// Insert artwork at the selected print depth, keeping this ordering identical
// in editor, customer view, product cards and saved review previews.
export function composeMaterialPreview(svg,artwork){
 if(svg.includes('data-preview-engraving="acrylic"'))artwork=ACRYLIC_ENGRAVING_FILTER+`<g data-preview-engraving-art="true" filter="url(#material-acrylic-engraving)">${artwork}</g>`;
 const dark=Object.keys(DARK_ENGRAVING_TONES).find(id=>svg.includes(`data-preview-engraving="${id}"`));
 if(dark)artwork=darkEngravingFilter(dark)+`<g data-preview-engraving-art="true" filter="url(#material-dark-engraving)">${artwork}</g>`;
 if(svg.includes('data-preview-print-surface="front"'))artwork=UV_INK_FILTER+`<g data-preview-uv-ink="matte" filter="url(#material-uv-ink)">${artwork}</g>`;
 return svg.includes('<!--material-artwork-->')?svg.replace('<!--material-artwork-->',artwork):svg.replace('</svg>',artwork+'</svg>');
}
