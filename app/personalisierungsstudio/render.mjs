import {measureText, textGlyphLayout} from './text-paths.mjs';

const identity = [1, 0, 0, 1, 0, 0];
export function multiply([a,b,c,d,e,f], [g,h,i,j,k,l]) {
  return [a*g+c*h,b*g+d*h,a*i+c*j,b*i+d*j,a*k+c*l+e,b*k+d*l+f];
}
const translate = (x,y) => [1,0,0,1,x,y];
const scale = (x,y) => [x,0,0,y,0,0];
function placement(o) {
  const r = (o.rotation || 0) * Math.PI / 180;
  return multiply(translate(o.x,o.y), [Math.cos(r),Math.sin(r),-Math.sin(r),Math.cos(r),0,0]);
}
const xml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const num = n => Number(n.toFixed(9));
const matrix = m => 'matrix(' + m.map(num).join(' ') + ')';

export function scene(design, fonts, edits = {}, photo = null, motifs = {}) {
  const known = new Set(design.objects.filter(o => o.type === 'text').map(o => o.key));
  if (!edits || typeof edits !== 'object' || Array.isArray(edits) ||
      Object.keys(edits).some(k => !known.has(k))) throw Error('Unbekanntes Textfeld.');
  const movable=design.objects.filter(o=>o.type==='motif' && o.editable);
  if(!motifs || typeof motifs!=='object' || Array.isArray(motifs) || Object.keys(motifs).some(k=>!movable.some(o=>o.id===k)))throw Error('Unbekannte Motivzuordnung.');
  const paths = [];
  for (const o of design.objects) {
    if (o.type === 'motif') {
      const edit=Object.hasOwn(motifs,o.id)?motifs[o.id]:{};
      if(!edit || typeof edit!=='object' || Array.isArray(edit) || Object.keys(edit).some(k=>!['x','y','choice'].includes(k)))throw Error('Ungültige Motivänderung.');
      const x=edit.x??o.x,y=edit.y??o.y;
      if(!Number.isFinite(x)||!Number.isFinite(y)||edit.x!==undefined && (x<0||x>design.width)||edit.y!==undefined && (y<0||y>design.height))throw Error('Motivposition außerhalb der Platte.');
      if(edit.choice==='none')continue;
      let base=placement({...o,x,y}), selected=o.paths;
      if(edit.choice && edit.choice!==o.motif){
        const other=design.motifs?.find(m=>m.id===edit.choice);
        if(!other)throw Error('Originalmotiv fehlt in der Vorlage.');
        const factor=Math.min(o.w/other.w,o.h/other.h);
        base=multiply(base,scale(factor,factor));selected=other.paths;
      }
      for (const path of selected) paths.push({...path,matrix:multiply(base,path.matrix),...(o.editable?{motifId:o.id}:{})});
    } else if (o.type === 'photo') {
      if (photo) paths.push({image:photo, x:o.x,y:o.y,w:o.w,h:o.h});
    } else if (o.type === 'text') {
      const text = Object.hasOwn(edits,o.key) ? edits[o.key] : o.text;
      if (typeof text !== 'string' || [...text].length > 300 || /[\u0000-\u0009\u000b-\u001f]/u.test(text)) throw Error('Bitte nur druckbare Zeichen und höchstens 300 Zeichen pro Feld eingeben.');
      if (!text) continue;
      const obj = {...o, text};
      measureText(obj, fonts);
      const layout = textGlyphLayout(obj, fonts);
      let base = placement(obj);
      if (text !== o.text && o.w > 0 && o.h > 0) {
        const fit = Math.min(1,o.w/Math.max(obj.w,0.001),o.h/Math.max(obj.h,0.001));
        base = multiply(base,scale(fit,fit));
      }
      if (o.italic) base = multiply(base,[1,0,Math.tan(-12*Math.PI/180),1,0,0]);
      // SVG source positions use a baseline. Native gravuru objects use their centre.
      if (o.baseline) {
        const anchor = o.textAnchor === 'end' ? -obj.w/2 : o.textAnchor === 'start' ? obj.w/2 : 0;
        base = multiply(base,translate(anchor,-layout.lines[0].baseline));
      }
      for (const line of layout.lines) {
        const lineMatrix = multiply(multiply(base,translate(0,line.baseline)),scale(layout.scale,-layout.scale));
        for (const {x,glyph} of line.glyphs) if (glyph.d) {
          paths.push({d:glyph.d, matrix:multiply(lineMatrix,translate(x,0)), fill:o.color,rule:'nonzero'});
        }
      }
    }
  }
  return {width:design.width, height:design.height, cuts:design.cuts, paths};
}
export function svg(scene, {contour=true, label='Personalisierte Gestaltung'}={}) {
  const content = scene.paths.map((p,index) => {
    if (p.image) {
      const box = 'x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'"';
      return '<defs><clipPath id="foto-'+index+'"><rect '+box+'/></clipPath></defs><image '+box+' clip-path="url(#foto-'+index+')" preserveAspectRatio="xMidYMid slice" href="'+xml(p.image)+'"/>';
    }
    const target=!contour && p.motifId?' data-motif="'+xml(p.motifId)+'"':'';
    return '<path'+target+' d="'+xml(p.d)+'" fill="'+xml(p.fill)+'" fill-rule="'+p.rule+'" transform="'+matrix(p.matrix || identity)+'"/>';
  }).join('');
  const cut = contour ? '<g id="CutContour" fill="none" stroke="#ff00ff" stroke-width="0.1">'+scene.cuts.map(d=>'<path d="'+xml(d)+'"/>').join('')+'</g>' : '';
  return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+xml(label)+'" width="'+scene.width+'mm" height="'+scene.height+'mm" viewBox="0 0 '+scene.width+' '+scene.height+'"><g id="Artwork">'+content+'</g>'+cut+'</svg>';
}
