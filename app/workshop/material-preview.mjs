import {contourSvg} from './contours.mjs';

// Existing empty surface, distinct from the selected, decorated v4 reference.
// Preview only: never included in contour or production exports.
export const STEEL_SURFACE=Object.freeze({
 id:'steel-brushed-v1',
 url:'/_runtime/images/gravuru-edelstahl-feine-maserung-vorschau.png',
 sha256:'74f75d42041d70b20bb559ebe317006c1058534bfedcb6fe0f490c872f44e3e6',
 note:'Vorhandene Edelstahl-Vorschaustruktur mit horizontaler Bürstung. Farbwirkung zur Orientierung; kein Herstellerfoto oder Nachweis der tatsächlichen Materialcharge.'
});

export function materialPreview(document){
 const g=document.form.geometry;
 contourSvg(g); // Shared validation; no source SVG markup or custom URLs.
 if(document.material.id!=='steel')return {svg:null,surface:null,note:document.material.id?'Für dieses Material ist noch keine leere Oberfläche zugeordnet. Die Konturprüfung bleibt verfügbar.':'Wähle ein Material für die Oberflächenvorschau.'};
 const pad=Math.max(g.widthMm,g.heightMm)*.06;
 const d=g.contours.map(c=>c.d+' Z').join(' ');
 // One even-odd clipping path preserves the exact original outer and inner rings.
 // Cover keeps the image aspect ratio and horizontal grain; no geometry scaling.
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${g.widthMm+pad*2} ${g.heightMm+pad*2}" role="img" aria-label="Edelstahl-Oberflächenvorschau mit ${g.holeCount} Ausschnitten"><defs><clipPath id="material-form-clip"><path d="${d}" clip-rule="evenodd"/></clipPath></defs><image href="${STEEL_SURFACE.url}?v=${STEEL_SURFACE.sha256.slice(0,12)}" x="0" y="0" width="${g.widthMm}" height="${g.heightMm}" preserveAspectRatio="xMidYMid slice" clip-path="url(#material-form-clip)"/><path d="${d}" fill="none" stroke="#6f7579" stroke-width="0.75" vector-effect="non-scaling-stroke"/></svg>`;
 return {svg,surface:STEEL_SURFACE,note:STEEL_SURFACE.note};
}
