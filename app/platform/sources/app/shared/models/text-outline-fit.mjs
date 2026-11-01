import {measureText,textGlyphLayout} from './doorbell-preview.mjs';
import {flattenClosedSvgPath,contourContainsPolygon,ellipseEdgeDistance} from './contour-geometry.mjs';

// Issue #48/34: a text box may cross a curved edge while every painted letter
// fits. Use exactly the preview's glyph placement; never change the artwork.
export const TEXT_PATH_TOLERANCE_MM=.0005;
const cache=new WeakMap(),MAX_POINTS=100000;
const boundsCache=new WeakMap();
const unsupported=()=>{throw Error('Unsupported text outline');};
function glyphRings(glyph,scale){
 const d=glyph.d;
 if(typeof d!=='string'||d.length>1000000||!Number.isFinite(glyph.a))unsupported();
 if(!d.trim())return []; // spaces have advance but no engraving
 let entry=cache.get(glyph);
 if(!entry||entry.d!==d){entry={d,values:new Map()};cache.set(glyph,entry);}
 if(entry.values.has(scale))return entry.values.get(scale);
 // Font resources contain absolute M subpaths. Unknown/relative subpath
 // origins retain the box error rather than guessing a successful fit.
 const source=d.trim();
 if(!source.startsWith('M')||source.includes('m'))unsupported();
 const parts=source.slice(1).split('M');if(parts.length>2048)unsupported();
 let count=0;
 const rings=parts.map(part=>{
  const path=('M'+part).trim();
  const ring=flattenClosedSvgPath(/[zZ]$/.test(path)?path:path+'Z',{toleranceMm:Math.min(1,TEXT_PATH_TOLERANCE_MM/scale)});
  count+=ring.length;if(count>MAX_POINTS)unsupported();return ring;
 });
 if(entry.values.size>=4)entry.values.delete(entry.values.keys().next().value);
 entry.values.set(scale,rings);return rings;
}
function insideRoundedRect([x,y],g,margin){
 if(x<margin||y<margin||x>g.width-margin||y>g.height-margin)return false;
 const r=Math.max(0,(g.cornerRadiusMm||0)-margin);
 const dx=Math.max(margin+r-x,0,x-(g.width-margin-r)),dy=Math.max(margin+r-y,0,y-(g.height-margin-r));
 return dx*dx+dy*dy<=r*r;
}
// Local ink bounds from the identical glyph paths/baselines used on screen.
// Cached independently of position/rotation so placement never reparses a font
// for each candidate. Null retains the conservative nominal-box fallback.
export function textOutlineBounds(object,fonts){
 if(object?.type!=='text'||!fonts)return null;
 let entries=boundsCache.get(fonts);if(!entries)boundsCache.set(fonts,entries=new Map());
 const key=JSON.stringify([object.font,object.bold,object.italic,object.text,object.size,object.w,object.textAnchor,object.letterSpacing,object.lineHeight]);
 if(entries.has(key))return entries.get(key);
 let bounds=null;
 try{
  const {scale,lines}=textGlyphLayout(object,fonts),skew=object.italic?Math.tan(-Math.PI/15):0;
  if(!(scale>0))unsupported();
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity,count=0;
  for(const {baseline,glyphs} of lines)for(const {glyph,x:advance} of glyphs)for(const ring of glyphRings(glyph,scale))for(const [gx,gy] of ring){
   if(++count>MAX_POINTS)unsupported();
   const y=baseline-gy*scale,x=(advance+gx)*scale+skew*y;
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  const reserve=TEXT_PATH_TOLERANCE_MM*(1+Math.abs(skew));
  if([left,top,right,bottom].every(Number.isFinite))bounds={left:left-reserve,top:top-reserve,right:right+reserve,bottom:bottom+reserve};
 }catch{}
 if(entries.size>=500)entries.clear();entries.set(key,bounds);return bounds;
}
// Geometry must already face the active surface, like fitsSurface/objectIssue.
// Holes remain separate hints. Null cannot clear a validation error.
export function textOutlineFits(object,geometry,fonts){
 if(object?.type!=='text'||!fonts||!geometry||geometry.bell||geometry.designArea||
    !(geometry.shape==='ellipse'||geometry.shape==='contour'||geometry.cornerRadiusMm>0))return null;
 try{
  if(!['x','y','w','h','rotation'].every(k=>Number.isFinite(object[k]))||object.w<=0||object.h<=0||Math.abs(object.rotation)>360)unsupported();
  const checked=measureText({...object},fonts); // reject missing faces/glyphs and invalid spacing
  // Keep the supplied width: start/end anchors in textPaths use that exact box.
  const layout=textGlyphLayout(object,fonts),{scale}=layout;
  if(!(scale>0)||!Number.isFinite(scale)||!Number.isFinite(checked.w)||!Number.isFinite(checked.h))unsupported();
  const margin=geometry.safeMarginMm??0;
  if(!Number.isFinite(margin)||margin<0||!(geometry.width>0&&geometry.height>0))unsupported();
  const a=object.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),skew=object.italic?Math.tan(-Math.PI/15):0;
  // Skew may magnify the flattening error. Reserve it on the safe side.
  const reserve=margin+TEXT_PATH_TOLERANCE_MM*(1+Math.abs(skew));
  let points=0,painted=false;
  for(const {baseline,glyphs} of layout.lines)for(const {glyph,x:advance} of glyphs){
   const rings=glyphRings(glyph,scale);
   for(const ring of rings){
    points+=ring.length;if(points>MAX_POINTS)unsupported();if(ring.length<3)continue;painted=true;
    const transformed=ring.map(([gx,gy])=>{
     const y=baseline-gy*scale,x=(advance+gx)*scale+skew*y;
     return [object.x+x*c-y*s-(geometry.x||0),object.y+x*s+y*c-(geometry.y||0)];
    });
    if(geometry.shape==='contour'){
     // Complete segments, including concave bites, not only the vertices.
     if(!contourContainsPolygon(geometry,transformed,{marginMm:reserve,holes:false}))return false;
    }else if(geometry.shape==='ellipse'){
     const rx=geometry.width/2,ry=geometry.height/2;
     if(!transformed.every(([px,py])=>{const x=px-rx,y=py-ry,q=(x/rx)**2+(y/ry)**2;return q<=1&&(Math.min(rx,ry)*(1-Math.sqrt(q))>=reserve||ellipseEdgeDistance(x,y,rx,ry)>=reserve);}))return false;
    }else if(!transformed.every(p=>insideRoundedRect(p,geometry,reserve)))return false;
   }
  }
  return painted?true:null;
 }catch{return null;}
}
