import {acrylicPlatePreview} from './acrylic-plate-preview.mjs';
import {doorbellMaterialPreview} from './doorbell-material-preview.mjs';
import {designPaintOrder} from './design-layer-order.mjs';
import {contourPathWithHoles,contourSafeAreaSvg} from './contour-geometry.mjs';
import {photoShape,photoClip,photoMaskURL} from './photo-shape.mjs';
import {textPaths} from './text-paths.mjs';
import {escapeXml as esc} from './design-content.mjs';
import {getProcessingProfile,elementColor} from './processing-profiles.mjs';
export function motifMarkup(item,w,h){
 if(!item)return '<rect x="'+(-w/2)+'" y="'+(-h/2)+'" width="'+w+'" height="'+h+'" fill="none" stroke="#ffb17b"/><text text-anchor="middle" fill="#ffb17b" font-size="3">Motiv wird geladen</text>';
 const box=item.bounds||[0,0,100,100];
 return '<svg x="'+(-w/2)+'" y="'+(-h/2)+'" width="'+w+'" height="'+h+'" viewBox="'+box.join(' ')+'" preserveAspectRatio="none">'+item.svgFragment.replace(/#000000|currentColor/gi,'#ffffff')+'</svg>';
}
// Ü6.1: Hilfsebenen bleiben in der Vorschau sichtbar und tragen ihre Rolle im
// Markup, damit jede Fertigungsausgabe sie generisch auslassen kann.
export const roleAttribute=o=>o?.role==='guide'?' data-role="guide"':'';
function selectionMarkup(o,units){
 const u=Number.isFinite(units)&&units>0?units:.4,grip=12*u,hit=24*u,offset=4*u;
 return '<rect x="'+(-o.w/2)+'" y="'+(-o.h/2)+'" width="'+o.w+'" height="'+o.h+'" fill="none" stroke="#16845d" stroke-width="'+u+'" pointer-events="none"/>'+[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,y])=>'<g data-resize="'+esc(o.id)+'" transform="translate('+(x*(o.w/2+offset))+' '+(y*(o.h/2+offset))+')" style="cursor:'+(x===y?'nwse':'nesw')+'-resize"><title>Ziehen zum Vergrößern oder Verkleinern</title><rect x="'+(-hit/2)+'" y="'+(-hit/2)+'" width="'+hit+'" height="'+hit+'" fill="transparent" pointer-events="all"/><rect x="'+(-grip/2)+'" y="'+(-grip/2)+'" width="'+grip+'" height="'+grip+'" rx="'+2*u+'" fill="#fff" stroke="#196347" stroke-width="'+1.5*u+'" pointer-events="none"/></g>').join('');
}
export function studioSvg(profile,design,fonts,{selected='',frameKey='',mountingKey='K00',motifs=[],media=[],guides=false,id='studio',color='schwarz',handles=true,handleUnits,photoExampleMarkup}={}){
 if(profile.kind==='universal-product')return universalSvg(profile,design,fonts,{selected,motifs,media,guides,id,handles,handleUnits,photoExampleMarkup});
 const {width:w=160,height:h=280}=profile.geometry;
 const a=(profile.frames.find(f=>f.key===frameKey)||profile.frames[0]).acrylic,b=profile.geometry.bellImageBounds||profile.geometry.bell;
 const native=profile.doorbellSchema==='gravuru-doorbell/v1';
 const steelStops=native?'<stop stop-color="#f1f2f2"/><stop offset=".25" stop-color="#b6bcc0"/><stop offset=".6" stop-color="#f5f5f5"/><stop offset="1" stop-color="#a5adb2"/>':'<stop stop-color="#eaedef"/><stop offset=".27" stop-color="#aeb3b6"/><stop offset=".51" stop-color="#f4f5f5"/><stop offset="1" stop-color="#969fa6"/>';
 const acrylicStops=native?(color==='anthrazit'?'<stop stop-color="#474b50"/><stop offset=".7" stop-color="#33383e"/><stop offset="1" stop-color="#3e444a"/>':'<stop stop-color="#222426"/><stop offset=".7" stop-color="#111214"/><stop offset="1" stop-color="#1a1c1e"/>'):'<stop stop-color="'+(color==='anthrazit'?'#454a50':'#242629')+'"/><stop offset="1" stop-color="'+(color==='anthrazit'?'#34393f':'#101113')+'"/>';
 const image=profile.admin?.imageUrl;
 const items=designPaintOrder(design).map(o=>{let inside='';
  if(o.type==='text')inside=textPaths(o,fonts);
  if(o.type==='motif')inside=universalMotif(motifs.find(m=>m.key===o.motif),o,'#ffffff',{method:'engraving'},id+'-ink-'+o.id);
  if(o.type==='graphic')inside=graphicMarkup(o,'#ffffff');
  if(o.type==='image'||o.type==='photoSlot')inside=(o.type==='photoSlot'&&photoExampleMarkup?.(o))||photoMarkup(profile,o,media,id+'-photo-'+o.id,getProcessingProfile(profile),.3);
  const select=handles&&o.id===selected?selectionMarkup(o,handleUnits??(w+16)/365):'';
  return '<g data-object="'+esc(o.id)+'"'+roleAttribute(o)+' transform="translate('+o.x+' '+o.y+') rotate('+(o.rotation||0)+')" fill="white" style="cursor:move"><rect x="'+(-o.w/2)+'" y="'+(-o.h/2)+'" width="'+o.w+'" height="'+o.h+'" fill="transparent"/>'+inside+select+'</g>';
 }).join('');
 const screws=profile.mounting.options.find(m=>m.key===mountingKey)?.visibleScrews?profile.mounting.holes.map(h=>'<circle data-mounting-screw="true" cx="'+h.x+'" cy="'+h.y+'" r="'+profile.mounting.screwHeadPreviewDiameterMm/2+'" fill="#d1d5d7" stroke="#687078" stroke-width=".3"/>').join(''):'';
 const material=native?doorbellMaterialPreview(profile,a,id):null;
 const surface=material?.steel||(profile.admin?.steelImageUrl?'<image href="'+esc(profile.admin.steelImageUrl)+'" width="'+w+'" height="'+h+'" preserveAspectRatio="none" pointer-events="none"/>':'');
 const glass=material?.glass||'<rect x="'+(a.x+.75)+'" y="'+(a.y+1.15)+'" width="'+a.width+'" height="'+a.height+'" fill="#080b0c"/><rect x="'+a.x+'" y="'+a.y+'" width="'+a.width+'" height="'+a.height+'" fill="url(#'+id+'-acrylic)" filter="url(#'+id+'-shadow)"/>';
 const marks=(design.marks||[]).map(m=>'<path d="'+esc(m.d)+'" stroke-width="'+m.width+'"/>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 '+(w+16)+' '+(h+16)+'" role="img" aria-label="'+esc(design.name)+'"><defs><linearGradient id="'+id+'-steel" x2=".15" y2="1">'+steelStops+'</linearGradient><linearGradient id="'+id+'-acrylic" x2="1" y2="1">'+acrylicStops+'</linearGradient><filter id="'+id+'-shadow"><feDropShadow dx=".8" dy="1.2" stdDeviation=".8" flood-opacity=".3"/></filter></defs><rect x=".4" y=".7" width="'+w+'" height="'+h+'" fill="#7c848a"/><rect width="'+w+'" height="'+h+'" fill="url(#'+id+'-steel)"/>'+surface+glass+'<g stroke="#fff" fill="none" stroke-linecap="round">'+marks+'</g>'+items+(image?'<image href="'+esc(image)+'" x="'+b.x+'" y="'+b.y+'" width="'+b.width+'" height="'+b.height+'" pointer-events="none"/>':'<rect x="'+b.x+'" y="'+b.y+'" width="'+b.width+'" height="'+b.height+'" fill="#454c51" pointer-events="none"/>')+screws+(guides?'<g pointer-events="none" stroke="#8fc9c2" stroke-width=".3" stroke-dasharray="1 2"><path d="M'+w/2+' 10V'+(h-10)+'M10 '+h/2+'H'+(w-10)+'"/></g>':'')+'</svg>';
}
// Universal previews are pure: referenced originals and their crops are never rewritten.
function safeMediaUrl(value){
 try{const u=new URL(value);return ['https:','blob:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
function objectShape(o){return photoShape(o);}
function placeholder(o,label,stroke){return objectShape(o)+' fill="#e2ebe3" stroke="#719783" stroke-width="'+stroke+'"/><text text-anchor="middle" dominant-baseline="central" fill="#42604e" font-family="Arial" font-size="'+Math.min(o.w/Math.max(label.length*.6,7),o.h/5)+'">'+esc(label)+'</text>';}
function inkMatrix(ink,alpha='0 0 0 1 0'){const rgb=ink.slice(1).match(/../g).map(h=>parseInt(h,16)/255);return rgb.map(n=>'0 0 0 0 '+n).join(' ')+' '+alpha;}
function universalMotif(item,o,ink,processing,filterId){
 if(!item)return placeholder(o,'Motiv fehlt',.3);
 const box=item.bounds||[0,0,100,100];
 // Paint is flattened by a filter, including named colors, styles and strokes;
 // transparent areas remain transparent. Print keeps the sanitized source paints.
 const flatten=processing.method==='engraving'||o.preserveColors===false;
 // An imported PDF/SVG can contain an opaque photograph. Keep its tonal
 // information instead of turning every nontransparent pixel into solid ink.
 const tonal=processing.method==='engraving'&&Boolean(item.artwork);
 // Solid steel vectors use black ink; white knockout areas stay unengraved.
 // Raster/mixed artwork keeps its photo tones. This never rewrites the source.
 const solid=tonal&&processing.materialKind==='steel'&&item.vectorOnly===true;
 const threshold=solid?'<feComponentTransfer><feFuncA type="discrete" tableValues="0 '+Array(255).fill('1').join(' ')+'"/></feComponentTransfer>':'';
 const paint=tonal?'<feColorMatrix type="matrix" values="'+inkMatrix(ink,'-0.2126 -0.7152 -0.0722 0 1')+'"/>'+threshold+'<feComposite in2="SourceAlpha" operator="in"/>':'<feColorMatrix type="matrix" values="'+inkMatrix(ink)+'"/>';
 return '<svg x="'+(-o.w/2)+'" y="'+(-o.h/2)+'" width="'+o.w+'" height="'+o.h+'" viewBox="'+box.join(' ')+'" preserveAspectRatio="xMidYMid meet" color="'+ink+'">'+(flatten?'<defs><filter id="'+filterId+'" color-interpolation-filters="sRGB">'+paint+'</filter></defs>':'')+'<g'+(flatten?' filter="url(#'+filterId+')"':'')+'>'+item.svgFragment+'</g></svg>';
}
function photoMarkup(p,o,media,key,processing,stroke){
 const asset=o.media&&media.find(m=>m.mediaId===o.media.mediaId&&m.revisionId===o.media.revisionId);
 const url=asset&&safeMediaUrl(asset.url);
 if(!url||!(asset.width>0&&asset.height>0))return placeholder(o,o.media?'Bild nicht verfügbar':o.type==='photoSlot'?'Dein Foto':'Bild fehlt',stroke);
 const crop=o.crop||{x:0,y:0,width:1,height:1};
 if(![crop.x,crop.y,crop.width,crop.height].every(Number.isFinite)||crop.x<0||crop.y<0||crop.width<=0||crop.height<=0||crop.x+crop.width>1.000001||crop.y+crop.height>1.000001)return placeholder(o,'Bildausschnitt ungültig',stroke);
 const {brightness=1,contrast=1,invert=false}=o.photoProcessing||{};
 // Display-only tone controls; the source file stays unchanged. Alpha is retained.
 const slope=brightness*contrast*(invert?-1:1),intercept=(.5-.5*contrast)*(invert?-1:1)+(invert?1:0);
 const adjustment='<feComponentTransfer>'+['R','G','B'].map(c=>'<feFunc'+c+' type="linear" slope="'+slope+'" intercept="'+intercept+'"/>').join('')+'</feComponentTransfer>';
 const engraving=processing.method==='engraving'?'<feColorMatrix type="saturate" values="0"/>'+adjustment+'<feColorMatrix type="matrix" values="'+inkMatrix(elementColor(p,o),'-0.2126 -0.7152 -0.0722 0 1')+'"/><feComposite in2="SourceAlpha" operator="in"/>':'';
 const mask=photoClip(o,key+'-clip');
 return '<defs>'+mask.defs+'<filter id="'+key+'-photo" color-interpolation-filters="sRGB">'+engraving+'</filter></defs><g '+mask.attribute+'><svg x="'+(-o.w/2)+'" y="'+(-o.h/2)+'" width="'+o.w+'" height="'+o.h+'" viewBox="'+[crop.x*asset.width,crop.y*asset.height,crop.width*asset.width,crop.height*asset.height].join(' ')+'" preserveAspectRatio="xMidYMid slice" overflow="hidden"><image href="'+esc(url)+'" width="'+asset.width+'" height="'+asset.height+'" preserveAspectRatio="none"'+(processing.method==='engraving'?' filter="url(#'+key+'-photo)"':'')+'/></svg></g>';
}
export function graphicMarkup(o,ink){
 const stroke=o.strokeWidth||.5,w=Math.max(0,o.w-stroke),h=Math.max(0,o.h-stroke);
 const attrs=' fill="'+(o.filled&&o.shape!=='line'?ink:'none')+'" stroke="'+ink+'" stroke-width="'+stroke+'"';
 if(o.shape==='line')return '<line x1="'+(-w/2)+'" y1="0" x2="'+w/2+'" y2="0"'+attrs+'/>';
 if(o.shape==='ellipse')return '<ellipse rx="'+w/2+'" ry="'+h/2+'"'+attrs+'/>';
 if(o.shape==='rect')return '<rect x="'+(-w/2)+'" y="'+(-h/2)+'" width="'+w+'" height="'+h+'"'+attrs+'/>';
 return placeholder(o,'Unbekannte Grafik',.3);
}
export function universalPreviewViewport(p,{working=false}={}){const w=p.geometry.width,h=working&&p.workingArea?p.workingArea.previewHeightMm:p.geometry.height,pad=Math.max(Math.max(w,h)*.035,(p.backingPreview?.offsetMm||0)+Math.max(w,h)*.02);return [-pad,-pad,w+2*pad,h+2*pad];}

function universalSvg(p,d,fonts,{selected,motifs,media,guides,id,handles,handleUnits,photoExampleMarkup}){
 const {width:w,height:h,shape,cornerRadiusMm:radius=0}=p.geometry,pad=Math.max(Math.max(w,h)*.035,(p.backingPreview?.offsetMm||0)+Math.max(w,h)*.02),stroke=Math.max(w,h)*.002;
 const safeId='studio-'+String(id).replace(/[^a-zA-Z0-9_-]/g,'_');
 const processing=getProcessingProfile(p),ink=processing.ink;
 const contour=shape==='contour'?contourPathWithHoles(p.geometry):null;
 const safe=contour&&guides?contourSafeAreaSvg(p.geometry,safeId+'-design-area'):null;
 const plate=contour?'<path d="'+esc(contour)+'" fill-rule="evenodd"':shape==='ellipse'?'<ellipse cx="'+w/2+'" cy="'+h/2+'" rx="'+w/2+'" ry="'+h/2+'"':'<rect width="'+w+'" height="'+h+'" rx="'+radius+'"';
 const glass=acrylicPlatePreview(p,plate,safeId);
 const objects=designPaintOrder(d).map((o,index)=>{
  const key=safeId+'-element-'+index,color=elementColor(p,o);let content;
  if(o.type==='text')content=textPaths(o,fonts)||placeholder(o,'Schrift fehlt',stroke);
  else if(o.type==='motif')content=universalMotif(motifs.find(m=>m.key===o.motif),o,color,processing,key+'-ink');
  else if(o.type==='image'||o.type==='photoSlot')content=(o.type==='photoSlot'&&photoExampleMarkup?.(o))||photoMarkup(p,o,media,key,processing,stroke);
  else if(o.type==='graphic')content=graphicMarkup(o,color);
  else content=placeholder(o,'Unbekanntes Element: '+o.type,stroke);
  if(glass)content=glass.artwork(content);
  if(handles&&o.id===selected)content+=selectionMarkup(o,handleUnits??(w+pad*2)/365);
  return '<g data-object="'+esc(o.id)+'"'+roleAttribute(o)+' transform="translate('+o.x+' '+o.y+') rotate('+(o.rotation||0)+')" fill="'+color+'" style="cursor:move"><rect x="'+(-o.w/2)+'" y="'+(-o.h/2)+'" width="'+o.w+'" height="'+o.h+'" fill="transparent"/>'+content+'</g>';
 }).join('');
 const surface=/^#[a-fA-F0-9]{6}$/.test(p.material.color)?p.material.color:'#eeeeee';
 const contourBlend=p.material.kind==='slate'&&typeof photoExampleMarkup==='function'?' style="mix-blend-mode:lighten"':'';
 const familyAcrylic=p.material.kind==='acrylic'&&['anthrazit','schwarz','satiniert'].includes(p.material.variant),middle=p.material.kind==='steel'?'#e3e8e7':familyAcrylic?({anthrazit:'#474c50',schwarz:'#303336',satiniert:'#858788'}[p.material.variant]):surface;
 const backing=p.backingPreview,bg=backing?'<path data-m-backing="true" data-role="guide" aria-label="'+esc(backing.label)+'" d="'+esc(backing.geometry.outlinePath)+'" transform="translate('+(-backing.offsetMm)+' '+(-backing.offsetMm)+')" fill="#17191b" stroke="#5b5f61" stroke-width="'+stroke+'" pointer-events="none"/>':'';
 return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+esc(d.name)+'" viewBox="'+[-pad,-pad,w+pad*2,h+pad*2].join(' ')+'"><defs><linearGradient id="'+safeId+'-surface" x2=".2" y2="1"><stop stop-color="'+surface+'"/><stop offset=".5" stop-color="'+middle+'"/><stop offset="1" stop-color="'+surface+'"/></linearGradient><filter id="'+safeId+'-ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="'+inkMatrix(ink)+'"/></filter>'+(contour?'<clipPath id="'+safeId+'-plate-clip"><path d="'+esc(contour)+'" clip-rule="evenodd"/></clipPath>':'')+(safe?.defs||'')+'</defs>'+bg+(glass?.back||plate+' fill="url(#'+safeId+'-surface)" stroke="#8c9991" stroke-width="'+stroke+'"/>')+(contour?'<g data-contour-artwork="true"'+contourBlend+' clip-path="url(#'+safeId+'-plate-clip)">':'')+objects+'<g fill="none" stroke="'+ink+'">'+(d.marks||[]).map(m=>'<path d="'+esc(m.d)+'" stroke="'+elementColor(p,m)+'" stroke-width="'+m.width+'"/>').join('')+'</g>'+(contour?'</g>':'')+(glass?.front||'')+(contour?[]:p.geometry.holes||[]).map(hole=>'<circle cx="'+hole.x+'" cy="'+hole.y+'" r="'+hole.diameter/2+'" fill="#f4f5f3" stroke="#84958c" stroke-width="'+stroke+'" pointer-events="none"/>').join('')+(guides?'<path '+(safe?safe.attribute+' ':'')+'d="M'+w/2+' 0V'+h+'M0 '+h/2+'H'+w+'" fill="none" stroke="#5da894" stroke-width="'+stroke+'" stroke-dasharray="'+stroke*3+' '+stroke*5+'" pointer-events="none"/>':'')+'</svg>';
}




