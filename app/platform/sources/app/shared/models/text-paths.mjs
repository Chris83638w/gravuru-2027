// Shared text outlines and measurements. No device catalogue or font download.
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
// Explicit source leading follows font size; implicit leading keeps its existing default.
export function setTextSize(o,size){if(Number.isFinite(o.lineHeight)&&Number.isFinite(o.size)&&o.size>0)o.lineHeight*=size/o.size;o.size=size;return o;}
// A missing glyph stays visible as an outlined box while the customer corrects
// the text. Validation still rejects it; measuring must not leave stale bounds.
function previewGlyph(face, character) {
 const known=face.glyphs[character];if(known)return known;
 const u=face.units;
 return {a:u*.6,d:'M'+u*.05+' 0V'+u*.7+'H'+u*.55+'V0Z M'+u*.1+' '+u*.05+'H'+u*.5+'V'+u*.65+'H'+u*.1+'Z'};
}
export function measureText(o,fonts){const f=fonts[o.font]?.[o.bold?'bold':'regular']||fonts[o.font]?.regular;if(!f)throw Error('Bitte eine vorhandene Schriftart auswählen.');if(!Number.isFinite(o.size)||o.size<1||o.size>100)throw Error('Schriftgröße: 1 bis 100 mm.');const lines=o.text.split('\n');if(o.letterSpacing!==undefined&&(!Number.isFinite(o.letterSpacing)||o.letterSpacing< -10||o.letterSpacing>10))throw Error('Ungültiger Zeichenabstand.');const missing=[...o.text.replace(/\n/g,'')].find(c=>!Object.hasOwn(f.glyphs,c));o.w=Math.max(...lines.map(line=>[...line].reduce((s,c)=>s+previewGlyph(f,c).a,0)*o.size/f.units+Math.max(0,[...line].length-1)*(o.letterSpacing||0)));if(o.w<0)throw Error('Zeichenabstand ergibt eine negative Textbreite.');if(o.lineHeight!==undefined&&(!Number.isFinite(o.lineHeight)||o.lineHeight<=0||o.lineHeight>1000))throw Error('Ungültiger Zeilenabstand.');o.h=o.size*1.2+(lines.length-1)*(o.lineHeight??o.size*1.2);if(o.italic)o.w+=o.h*Math.tan(Math.PI/15);if(missing!==undefined)throw Error('Die gewählte Schrift enthält das Zeichen „'+missing+'“ nicht.');return o;}
// Shared placement for rendering and the outline-based boundary fallback. The
// returned coordinates are font units; baseline and scale are millimetres.
export function textGlyphLayout(o,fonts){
 const f=fonts[o.font]?.[o.bold?'bold':'regular']||fonts[o.font]?.regular;if(!f)return null;
 const scale=o.size/f.units,lines=o.text.split('\n');
 return {scale,lines:lines.map((line,i)=>{
  const spacing=(o.letterSpacing||0)/scale,width=[...line].reduce((s,c)=>s+previewGlyph(f,c).a,0)+Math.max(0,[...line].length-1)*spacing;
  let x=o.textAnchor==='start'?-o.w/(2*scale):o.textAnchor==='end'?o.w/(2*scale)-width:-width/2;
  const glyphs=[...line].map(c=>{const glyph=previewGlyph(f,c),placed={glyph,x};x+=glyph.a+spacing;return placed;});
  return {baseline:(i-(lines.length-1)/2)*(o.lineHeight??o.size*1.2)+o.size*.35,glyphs};
 })};
}
export function textPaths(o,fonts){const layout=textGlyphLayout(o,fonts);if(!layout)return '';const {scale}=layout,markup=layout.lines.map(({baseline,glyphs})=>'<g transform="translate(0 '+baseline+') scale('+scale+' '+(-scale)+')">'+glyphs.map(({glyph,x})=>'<path d="'+escape(glyph.d)+'" transform="translate('+x+' 0)"/>').join('')+'</g>').join('');return o.italic?'<g transform="skewX(-12)">'+markup+'</g>':markup;}
