// Operator-only proof exports. No RIP/ICC or production approval is implied.
import {validateContourGeometry,contourContainsPoint,flattenContourPath,contourNearestBoundaryPoint} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {contourPdfPath} from './contour-pdf-path.mjs';
const enc=new TextEncoder();
const b=s=>enc.encode(s), n=v=>Number(v.toFixed(6)), PT=72/25.4;
export function exportSettings(geometry,input={}){
 const {width,height,shape='rect',cornerRadiusMm=0,holes=[]}=geometry;
 if(![width,height].every(v=>Number.isFinite(v)&&v>0&&v<=500)||!['rect','ellipse','contour'].includes(shape)||!Number.isFinite(cornerRadiusMm)||cornerRadiusMm<0||cornerRadiusMm>Math.min(width,height)/2||!Array.isArray(holes)||holes.length>100)throw Error('Kontur oder Format wird vom Druckexport noch nicht unterstützt.');
 for(const h of holes)if(![h.x,h.y,h.diameter].every(Number.isFinite)||h.diameter<=0||h.x-h.diameter/2<0||h.y-h.diameter/2<0||h.x+h.diameter/2>width||h.y+h.diameter/2>height)throw Error('Ungültiges Bohrbild.');
 if(shape==='contour')validateContourGeometry(geometry);
 const o={profile:'roland',bleedMm:0,white:'motif',whiteBleedMm:0,mirror:false,dpi:300,...input};
 if(![300,600].includes(o.dpi)||!['roland','mimaki'].includes(o.profile)||![0,1].includes(o.bleedMm)||![0,1].includes(o.whiteBleedMm)||!['motif','full','none'].includes(o.white)||typeof o.mirror!=='boolean'||o.whiteBleedMm>o.bleedMm)throw Error('Ungültige Exporteinstellungen. Weißüberdruck darf den Farbüberdruck nicht überschreiten.');
 if(shape==='contour'&&(o.bleedMm||o.whiteBleedMm))throw Error('Randüberdruck für freie Konturen bitte über die Werkstatt-Fertigungsprüfung erzeugen.');
 return {...o,geometry:{width,height,shape,cornerRadiusMm,holes,...(shape==='contour'?{outlinePath:geometry.outlinePath}: {})},pageWidthMm:width+2*o.bleedMm,pageHeightMm:height+2*o.bleedMm,colorSpace:'DeviceCMYK'};
}
// Generic maximum-black separation. No measured printer/ink/media ICC transform.
export function rgbToCmyk(rgb){
 if(!(rgb instanceof Uint8Array)||rgb.length%3)throw Error('Ungültige RGB-Daten.');
 const out=new Uint8Array(rgb.length/3*4);
 for(let i=0,j=0;i<rgb.length;i+=3,j+=4){
  const m=Math.max(rgb[i],rgb[i+1],rgb[i+2]);
  out[j]=m?Math.round((m-rgb[i])*255/m):0;
  out[j+1]=m?Math.round((m-rgb[i+1])*255/m):0;
  out[j+2]=m?Math.round((m-rgb[i+2])*255/m):0;
  out[j+3]=255-m;
 }
 return out;
}
// Advisory, not a complete fine-detail analysis of imported bitmap artwork.
export function resolutionAdvice(objects,scale=1,marks=[]){
 const smallText=objects.some(o=>!o.uxHidden&&o.role!=='guide'&&o.type==='text'&&o.text?.trim()&&o.size*scale<5);
 const thinLine=marks.some(m=>Number.isFinite(m.width)&&m.width>0&&m.width*scale<.25)||objects.some(o=>!o.uxHidden&&o.role!=='guide'&&Number.isFinite(o.strokeWidth)&&o.strokeWidth>0&&o.strokeWidth*scale<.25);
 return smallText||thinLine?'Kleine Schrift oder feine Linien erkannt: 600 dpi empfohlen. 300 dpi bleiben der Standard.':'';
}
// Closed physical contours, shared by clipping, white fill and cutting. Coordinates are mm, y down.
export function contourPath(g,offset=0){
 const {width:w,height:h,shape,cornerRadiusMm:r=0}=g,k=.5522847498307936;
 const ellipse=(cx,cy,rx,ry)=>`${n(cx+rx)} ${n(cy)} m ${n(cx+rx)} ${n(cy+ry*k)} ${n(cx+rx*k)} ${n(cy+ry)} ${n(cx)} ${n(cy+ry)} c ${n(cx-rx*k)} ${n(cy+ry)} ${n(cx-rx)} ${n(cy+ry*k)} ${n(cx-rx)} ${n(cy)} c ${n(cx-rx)} ${n(cy-ry*k)} ${n(cx-rx*k)} ${n(cy-ry)} ${n(cx)} ${n(cy-ry)} c ${n(cx+rx*k)} ${n(cy-ry)} ${n(cx+rx)} ${n(cy-ry*k)} ${n(cx+rx)} ${n(cy)} c h`;
 let outer;
 if(shape==='contour'){if(offset!==0)throw Error('Freie Kontur: Offset benötigt die Werkstatt-Fertigungsprüfung.');validateContourGeometry(g);outer=contourPdfPath(g.outlinePath);}
 else if(shape==='ellipse')outer=ellipse(w/2,h/2,w/2+offset,h/2+offset);
 else if(r+offset===0)outer=`0 0 ${n(w)} ${n(h)} re`;
 else{
  const a=-offset,z=w+offset,t=-offset,u=h+offset,R=r+offset,c=R*(1-k);
  outer=`${n(a+R)} ${n(t)} m ${n(z-R)} ${n(t)} l ${n(z-c)} ${n(t)} ${n(z)} ${n(t+c)} ${n(z)} ${n(t+R)} c ${n(z)} ${n(u-R)} l ${n(z)} ${n(u-c)} ${n(z-c)} ${n(u)} ${n(z-R)} ${n(u)} c ${n(a+R)} ${n(u)} l ${n(a+c)} ${n(u)} ${n(a)} ${n(u-c)} ${n(a)} ${n(u-R)} c ${n(a)} ${n(t+R)} l ${n(a)} ${n(t+c)} ${n(a+c)} ${n(t)} ${n(a+R)} ${n(t)} c h`;
 }
 return [outer,...(g.holes||[]).map(h=>ellipse(h.x,h.y,h.diameter/2,h.diameter/2))].join('\n');
}
// Point containment in physical mm. Used before vectorization so the motif white
// layer contains only closed ink paths, not a full-page clipping container.
export function insideContour(g,x,y,offset=0){
 if(g.shape==='contour'){
  if(offset<=0)return contourContainsPoint(g,x,y,{marginMm:-offset,keepoutMm:0});
  const near=contourNearestBoundaryPoint(g,x,y);return (near.inside||near.distance<=offset)&&!(g.holes||[]).some(h=>(x-h.x)**2+(y-h.y)**2<(h.diameter/2)**2);
 }
 const w=g.width,h=g.height;
 if(x < -offset || x > w+offset || y < -offset || y > h+offset)return false;
 let inside;
 if(g.shape==='ellipse')inside=((x-w/2)/(w/2+offset))**2+((y-h/2)/(h/2+offset))**2<=1;
 else {const r=Math.max(0,(g.cornerRadiusMm||0)+offset),cx=Math.max(-offset+r,Math.min(w+offset-r,x)),cy=Math.max(-offset+r,Math.min(h+offset-r,y));inside=!r||(x-cx)**2+(y-cy)**2<=r*r;}
 return inside&&!(g.holes||[]).some(h=>(x-h.x)**2+(y-h.y)**2<(h.diameter/2)**2);
}
// Check pixels at the actual outer contour, including round corners and ellipses.
export function hasContourInk(rgba,w,h,g){
 const sx=w/g.width,sy=h/g.height;
 if(g.shape==='contour'){
  const points=flattenContourPath(g.outlinePath);
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],steps=Math.max(1,Math.ceil(Math.hypot((b[0]-a[0])*sx,(b[1]-a[1])*sy)*2));
   for(let j=0;j<=steps;j++){const x=Math.floor((a[0]+(b[0]-a[0])*j/steps)*sx),y=Math.floor((a[1]+(b[1]-a[1])*j/steps)*sy);
    for(const dx of [-1,0])for(const dy of [-1,0])if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h&&rgba[((y+dy)*w+x+dx)*4+3]>0)return true;
   }
  }return false;
 }
 const ink=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&rgba[(y*w+x)*4+3]>0;
 for(let y=0;y<h;y++){
  const mm=(y+.5)/sy,r=g.cornerRadiusMm||0;
  let left=0;
  if(g.shape==='ellipse')left=g.width/2*(1-Math.sqrt(Math.max(0,1-((mm-g.height/2)/(g.height/2))**2)));
  else if(r&&mm<r)left=r-Math.sqrt(Math.max(0,r*r-(mm-r)**2));
  else if(r&&mm>g.height-r)left=r-Math.sqrt(Math.max(0,r*r-(mm-(g.height-r))**2));
  const first=Math.max(0,Math.ceil(left*sx-.5)),last=Math.min(w-1,Math.floor((g.width-left)*sx-.5));
  if(ink(first,y)||ink(last,y))return true;
  if(y===0||y===h-1)for(let x=first;x<=last;x++)if(ink(x,y))return true;
 }
 return false;
}
// Project an exterior pixel to the corresponding outer-contour ink sample.
export function boundarySample(g,x,y){
 if(g.shape==='contour'){const p=contourNearestBoundaryPoint(g,x,y);return [p.x,p.y];}
 if(g.shape==='ellipse'){const cx=g.width/2,cy=g.height/2,f=1/Math.sqrt(((x-cx)/cx)**2+((y-cy)/cy)**2);return [cx+(x-cx)*f,cy+(y-cy)*f];}
 const r=g.cornerRadiusMm||0,cx=Math.max(r,Math.min(g.width-r,x)),cy=Math.max(r,Math.min(g.height-r,y)),d=Math.hypot(x-cx,y-cy);
 return d?[cx+(x-cx)*r/d,cy+(y-cy)*r/d]:[x,y];
}
export function whiteMask(pixels,s){
 const {width:w,height:h,alpha}=pixels,mask=new Uint8Array(w*h);
 if(s.white==='none')return mask;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x;if(s.white==='motif'&&(pixels.whiteAlpha||alpha)[i]<128)continue;
  if(pixels.whiteAllowed){if(pixels.whiteAllowed.length!==w*h)throw Error('Ungültige Konturmaske.');if(pixels.whiteAllowed[i]>=128)mask[i]=255;continue;}
  let mx=(x+.5)*s.pageWidthMm/w-s.bleedMm;const my=(y+.5)*s.pageHeightMm/h-s.bleedMm;
  if(s.mirror)mx=s.geometry.width-mx;
  if(insideContour(s.geometry,mx,my,s.whiteBleedMm))mask[i]=255;
 }
 return mask;
}
// Binary output-resolution silhouette, merged into closed vector rectangles. Not source vector reconstruction.
export function maskRectangles(alpha,w,h){
 if(alpha.length!==w*h)throw Error('Ungültige Weißmaske.');
 const result=[],active=new Map();
 for(let y=0;y<h;y++){
  const next=new Map();
  for(let x=0;x<w;){if(alpha[y*w+x]<128){x++;continue;}const start=x;while(x<w&&alpha[y*w+x]>=128)x++;const key=start+':'+x,old=active.get(key);if(old){old.h++;next.set(key,old);active.delete(key);}else next.set(key,{x:start,y,w:x-start,h:1});}
  result.push(...active.values());if(result.length>400000)throw Error('Weißmaske ist zu komplex. Bitte Motiv vereinfachen.');active.clear();for(const [key,v]of next)active.set(key,v);
 }
 return result.concat([...active.values()]);
}
async function deflate(bytes){const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));return new Uint8Array(await new Response(stream).arrayBuffer());}
class PDF{
 constructor(){this.objects=[];} add(value){this.objects.push(value);return this.objects.length;} set(id,value){this.objects[id-1]=value;}
 async stream(dict,bytes){const data=await deflate(bytes);return this.add(new Blob([`<< ${dict} /Filter /FlateDecode /Length ${data.length} >>\nstream\n`,data,'\nendstream']));}
 finish(root){const parts=[b('%PDF-1.7\n')],offsets=[0];let count=parts[0].length;this.objects.forEach((value,i)=>{const blob=value instanceof Blob?value:new Blob([value]);const head=b(`${i+1} 0 obj\n`),tail=b('\nendobj\n');offsets.push(count);parts.push(head,blob,tail);count+=head.length+blob.size+tail.length;});parts.push(b(`xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map(v=>String(v).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${offsets.length} /Root ${root} 0 R >>\nstartxref\n${count}\n%%EOF`));return new Blob(parts,{type:'application/pdf'});}
}
export async function printPDF({settings,pixels,kind='combined',paths=null,artwork=null}){
 const s=exportSettings(settings.geometry,settings),{width:w,height:h,rgb,alpha}=pixels;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>50000000||rgb.length!==w*h*3||alpha.length!==w*h||!['combined','color','color-cut','white','white-spot','white-spot-cut','cut'].includes(kind))throw Error('Ungültige Druckdaten.');
 if(paths){for(const key of ['cut','color','white'])if(typeof paths[key]!=='string'||paths[key].length>1000000||!paths[key].trim()||paths[key].replace(/-?\d+(?:\.\d+)?|[mlch]|\s/g,''))throw Error('Ungültige freie PDF-Kontur.');if(!pixels.whiteAllowed||pixels.whiteAllowed.length!==w*h)throw Error('Freie Kontur benötigt ihre Weißmaske.');}
 if(artwork){
  const validPath=p=>typeof p==='string'&&p.length<=1000000&&p.trim()&&!p.replace(/-?\d+(?:\.\d+)?|[mlch]|\s/g,'');
  if(!paths||!Array.isArray(artwork)||artwork.length>100||!pixels.whiteAlpha||pixels.whiteAlpha.length!==w*h)throw Error('Ungültige Gestaltungsebenen.');
  for(const l of artwork){
   if(l.type==='text'){if(!Array.isArray(l.paths)||l.paths.length>20000||l.paths.some(p=>!validPath(p.path)||!Array.isArray(p.rgb)||p.rgb.length!==3||p.rgb.some(v=>!Number.isInteger(v)||v<0||v>255)))throw Error('Ungültige Schriftpfade.');}
   else if(l.type!=='raster'||![l.x,l.y,l.widthMm,l.heightMm].every(Number.isFinite)||l.widthMm<=0||l.heightMm<=0||!Number.isInteger(l.width)||!Number.isInteger(l.height)||l.width<1||l.height<1||l.width*l.height>32000000||l.rgb.length!==l.width*l.height*3||l.alpha.length!==l.width*l.height)throw Error('Ungültige Bildebene.');
  }
 }
 const pdf=new PDF(),catalog=pdf.add(''),pages=pdf.add(''),page=pdf.add('');
 const W=s.pageWidthMm,H=s.pageHeightMm,bleed=s.bleedMm;
 const transform=`${PT} 0 0 ${-PT} 0 ${n(H*PT)} cm`;
 const geo=`${s.mirror?-1:1} 0 0 1 ${n(bleed+(s.mirror?s.geometry.width:0))} ${bleed} cm`;
 const fn=pdf.add('<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 0 0 0] /N 1 >>');
 const cutFn=pdf.add('<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 1 0 0] /N 1 >>');
 const props=[],streams=[],refs=[];
 const layer=(name,body)=>{const id=pdf.add(`<< /Type /OCG /Name (${name}) >>`);props.push(`/L${id} ${id} 0 R`);refs.push(`${id} 0 R`);streams.push(`/OC /L${id} BDC\nq\n${transform}\n${body}\nQ\nEMC`);};
 let image='';
 if(kind==='combined'||kind==='color'||kind==='color-cut'){
  if(artwork){
   const images=[],paint=[];
   for(const l of artwork){
    if(l.type==='text'){
     // Same-color glyphs of each text field become one compound vector
     // path. Avoid nested Form wrappers that importers may flatten.
     const runs=[];for(const p of l.paths){const color=[...rgbToCmyk(new Uint8Array(p.rgb))].map(v=>n(v/255)).join(' '),last=runs.at(-1);if(last?.color===color)last.paths.push(p.path);else runs.push({color,paths:[p.path]});}
     const ink=runs.map(r=>`${r.color} k\n${r.paths.join('\n')} f`).join('\n');
     if(ink)paint.push(`q /GSArt gs ${geo}\n${paths.cut} W* n\n${ink} Q`);
    }else{
     const mask=await pdf.stream(`/Type /XObject /Subtype /Image /Width ${l.width} /Height ${l.height} /ColorSpace /DeviceGray /BitsPerComponent 8`,l.alpha);
     const im=await pdf.stream(`/Type /XObject /Subtype /Image /Width ${l.width} /Height ${l.height} /ColorSpace /DeviceCMYK /BitsPerComponent 8 /SMask ${mask} 0 R`,rgbToCmyk(l.rgb)),name='Art'+images.length;images.push(`/${name} ${im} 0 R`);
     paint.push(`q /GSArt gs ${geo}\n${paths.color} W* n\n${n(l.widthMm)} 0 0 ${n(-l.heightMm)} ${n(l.x)} ${n(l.y+l.heightMm)} cm /${name} Do Q`);
    }
   }
   // Isolate process artwork: text/photos knock out each other, while the group
   // overprints the separate spot-white underbase as one composite.
   const group=await pdf.stream(`/Type /XObject /Subtype /Form /BBox [0 0 ${n(W)} ${n(H)}] /Group << /S /Transparency /I true /CS /DeviceCMYK >> /Resources << /XObject << ${images.join(' ')} >> /ExtGState << /GSArt << /Type /ExtGState /OP false /op false >> >> >>`,b(paint.join('\n')));
   image=`/Artwork ${group} 0 R`;layer('Farbmotiv','/GSWhite gs /Artwork Do');
  }else{
  const mask=await pdf.stream(`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceGray /BitsPerComponent 8`,alpha);
  const im=await pdf.stream(`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceCMYK /BitsPerComponent 8 /SMask ${mask} 0 R`,rgbToCmyk(rgb));image=`/Art ${im} 0 R`;
  // Bitmap is already mirrored. Clip contour uses the same mirrored mechanical geometry.
  layer('Farbmotiv',`/GSWhite gs q ${geo}\n${paths?.color||contourPath(s.geometry,bleed)} W* n\n${s.mirror?-1:1} 0 0 1 ${s.mirror?s.geometry.width+bleed:-bleed} ${-bleed} cm\n${W} 0 0 ${-H} 0 ${H} cm /Art Do Q`);
  }
 }
 if((kind==='combined'||kind==='white'||kind==='white-spot'||kind==='white-spot-cut')&&s.white!=='none'){
  let white;
  if(s.white==='full')white=`${geo}\n${paths?.white||contourPath(s.geometry,s.whiteBleedMm)} f*`;
  else{
   const rects=maskRectangles(whiteMask(pixels,s),w,h); // Already mirrored and geometrically clipped.
   white=`q ${W/w} 0 0 ${H/h} 0 0 cm\n${rects.map(r=>`${r.x} ${r.y} ${r.w} ${r.h} re`).join('\n')}\nf Q`;
   if(artwork)white+=`\nq ${geo}\n${paths.cut} W* n\n${artwork.filter(l=>l.type==='text').filter(l=>l.paths.length).map(l=>l.paths.map(p=>p.path).join('\n')+' f').join('\n')}\nQ`;
  }
  const mimaki=s.profile==='mimaki'&&!['white-spot','white-spot-cut'].includes(kind);
  layer(kind==='white'||mimaki?'Weissersatz Vektor':'RDG_WHITE',(kind==='white'?'0 0 0 1 k':mimaki?'0 0 0 0 k':'/GSWhite gs /White cs 1 scn')+'\n'+white);
  if(kind==='combined'){const last=streams.pop();streams.unshift(last);} // Underprint before color; both use overprint, RIP validation remains required.
 }
 if(kind==='combined'||kind==='color-cut'||kind==='white-spot-cut'||kind==='cut')layer('CutContour',`${geo}\n/Cut CS 1 SCN 0.05 w\n${paths?.cut||contourPath(s.geometry)} S`);
 const content=await pdf.stream('',b(streams.join('\n'))),box=`[0 0 ${n(W*PT)} ${n(H*PT)}]`,trim=`[${n(bleed*PT)} ${n(bleed*PT)} ${n((W-bleed)*PT)} ${n((H-bleed)*PT)}]`;
 pdf.set(page,`<< /Type /Page /Parent ${pages} 0 R /MediaBox ${box} /BleedBox ${box} /TrimBox ${trim} /Resources << /XObject << ${image} >> /ColorSpace << ${((s.profile==='roland'&&kind==='combined'&&s.white!=='none')||['white-spot','white-spot-cut'].includes(kind))?`/White [/Separation /RDG_WHITE /DeviceCMYK ${fn} 0 R]`:''} ${['combined','color-cut','white-spot-cut','cut'].includes(kind)?`/Cut [/Separation /CutContour /DeviceCMYK ${cutFn} 0 R]`:''} >> /ExtGState << /GSWhite << /Type /ExtGState /OP true /op true /OPM 1 >> >> /Properties << ${props.join(' ')} >> >> /Contents ${content} 0 R >>`);
 pdf.set(pages,`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`);pdf.set(catalog,`<< /Type /Catalog /Pages ${pages} 0 R /OCProperties << /OCGs [${refs.join(' ')}] /D << /Order [${refs.join(' ')}] /ON [${refs.join(' ')}] >> >> >>`);return pdf.finish(catalog);
}
const crcTable=Array.from({length:256},(_,v)=>{for(let k=0;k<8;k++)v=v&1?0xedb88320^(v>>>1):v>>>1;return v>>>0;});
export async function zipFiles(files){
 const chunks=[],directory=[];let offset=0;
 for(const {name,blob}of files){const data=new Uint8Array(await blob.arrayBuffer()),filename=b(name);let crc=0xffffffff;for(const v of data)crc=crcTable[(crc^v)&255]^(crc>>>8);crc=(crc^0xffffffff)>>>0;
  const head=new Uint8Array(30),h=new DataView(head.buffer);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,filename.length,true);
  const dir=new Uint8Array(46),d=new DataView(dir.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,filename.length,true);d.setUint32(42,offset,true);directory.push(dir,filename);chunks.push(head,filename,data);offset+=head.length+filename.length+data.length;
 }
 const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,directory.reduce((a,x)=>a+x.length,0),true);e.setUint32(16,offset,true);return new Blob([...chunks,...directory,end],{type:'application/zip'});
}
