import {contourSvg} from './contours.mjs';
import {presentationLayers,acrylicSurface} from './material-presentation.mjs';

// Existing empty surface, distinct from the selected, decorated v4 reference.
// Preview only: never included in contour or production exports.
export const STEEL_SURFACE=Object.freeze({
 id:'steel-brushed-v1',
 url:'/_runtime/images/gravuru-edelstahl-feine-maserung-vorschau.png',
 sha256:'74f75d42041d70b20bb559ebe317006c1058534bfedcb6fe0f490c872f44e3e6',
 note:'Vorhandene Edelstahl-Vorschaustruktur mit horizontaler Bürstung. Farbwirkung zur Orientierung; kein Herstellerfoto oder Nachweis der tatsächlichen Materialcharge.'
});

export const WOOD_LEATHER_ATLAS=Object.freeze({
 url:'/workshop-ui/material-surfaces/wood-leather-derived-v1.png',
 sha256:'74bc3f6e77dd22c6de2eaa3827d4b576c46eead83658f445842ac90f8dee5d7a',
 file:'./ui/material-surfaces/wood-leather-derived-v1.png'
});
const tiles={oak:{label:'Eiche',x:0,y:0},beech:{label:'Buche',x:1,y:0},cherry:{label:'Kirsche',x:0,y:1},'leather-brown':{label:'Braunes Leder',x:1,y:1}};
export function materialPreview(document){
 const g=document.form.geometry;contourSvg(g);
 const id=document.material.id,tile=tiles[id],acrylic=acrylicSurface(document);
 if(id!=='steel'&&!tile&&!acrylic)return {svg:null,surface:null,note:id?'Für dieses Material ist noch keine leere Oberfläche zugeordnet. Die Konturprüfung bleibt verfügbar.':'Wähle ein Material für die Oberflächenvorschau.'};
 const surface=acrylic?{id:id+'-procedural-v1',kind:'procedural',note:acrylic.label+' · angenäherte 2D-Materialdarstellung anhand vorhandener Muster; keine farbverbindliche Material- oder Fertigungsfreigabe.'}:tile?{...WOOD_LEATHER_ATLAS,id:id+'-derived-v1',note:tile.label+' · separate, KI-abgeleitete leere Vorschaustruktur aus der vorhandenen Musterreferenz. Farbwirkung zur Orientierung; kein Herstellerfoto oder Materialnachweis.'}:STEEL_SURFACE;
 const layers=presentationLayers(document),d=g.contours.map(c=>c.d+' Z').join(' '),href=surface.url?surface.url+'?v='+surface.sha256.slice(0,12):null;
 // The atlas is clipped to a single quadrant in the renderer, never painted over
 // other quadrants. The even-odd form clip preserves every physical opening.
 const fill=acrylic?acrylic.face:tile?`<defs><pattern id="material-texture" width="1" height="1" viewBox="${tile.x} ${tile.y} 1 1" preserveAspectRatio="xMidYMid slice"><image href="${href}" width="2" height="2"/></pattern></defs><path d="${d}" fill="url(#material-texture)" fill-rule="evenodd"/>`:`<image href="${href}" x="0" y="0" width="${g.widthMm}" height="${g.heightMm}" preserveAspectRatio="xMidYMid slice" clip-path="url(#material-form-clip)"/>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${layers.box.join(' ')}" role="img" aria-label="${acrylic?.label||tile?.label||'Edelstahl'}-Oberflächenvorschau mit ${g.holeCount} Ausschnitten"><defs><clipPath id="material-form-clip"><path d="${d}" clip-rule="evenodd"/></clipPath></defs>${layers.defs}${layers.backdrop}${layers.shadow}${layers.edge}${fill}<path d="${d}" fill="none" stroke="#6f7579" stroke-width="0.75" vector-effect="non-scaling-stroke"/><!--material-artwork-->${acrylic?.finish||''}</svg>`;
 return {svg,surface,note:surface.note+' '+(layers.thickness?'Kante aus '+layers.thickness+' mm Produktstärke, perspektivisch angenähert.':'Stärke offen: keine Materialtiefe angenommen.')};
}
