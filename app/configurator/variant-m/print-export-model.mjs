// Operator-only proof exports. No RIP/ICC or production approval is implied.
const enc=new TextEncoder();
const b=s=>enc.encode(s), n=v=>Number(v.toFixed(6)), PT=72/25.4;
export function exportSettings(geometry,input={}){
 const {width,height,shape='rect',cornerRadiusMm=0,holes=[]}=geometry;
 if(![width,height].every(v=>Number.isFinite(v)&&v>0&&v<=500)||!['rect','ellipse'].includes(shape)||!Number.isFinite(cornerRadiusMm)||cornerRadiusMm<0||cornerRadiusMm>Math.min(width,height)/2||!Array.isArray(holes)||holes.length>100)throw Error('Kontur oder Format wird vom Druckexport noch nicht unterstützt.');
 for(const h of holes)if(![h.x,h.y,h.diameter].every(Number.isFinite)||h.diameter<=0||h.x-h.diameter/2<0||h.y-h.diameter/2<0||h.x+h.diameter/2>width||h.y+h.diameter/2>height)throw Error('Ungültiges Bohrbild.');
 const o={profile:'roland',bleedMm:0,white:'motif',whiteBleedMm:0,mirror:false,...input};
 if(!['roland','mimaki'].includes(o.profile)||![0,1].includes(o.bleedMm)||![0,1].includes(o.whiteBleedMm)||!['motif','full','none'].includes(o.white)||typeof o.mirror!=='boolean'||o.whiteBleedMm>o.bleedMm)throw Error('Ungültige Exporteinstellungen. Weißüberdruck darf den Farbüberdruck nicht überschreiten.');
 return {...o,geometry:{width,height,shape,cornerRadiusMm,holes},pageWidthMm:width+2*o.bleedMm,pageHeightMm:height+2*o.bleedMm,dpi:600};
}
// Closed physical contours, shared by clipping, white fill and cutting. Coordinates are mm, y down.
export function contourPath(g,offset=0){
 const {width:w,height:h,shape,cornerRadiusMm:r=0}=g,k=.5522847498307936;
 const ellipse=(cx,cy,rx,ry)=>`${n(cx+rx)} ${n(cy)} m ${n(cx+rx)} ${n(cy+ry*k)} ${n(cx+rx*k)} ${n(cy+ry)} ${n(cx)} ${n(cy+ry)} c ${n(cx-rx*k)} ${n(cy+ry)} ${n(cx-rx)} ${n(cy+ry*k)} ${n(cx-rx)} ${n(cy)} c ${n(cx-rx)} ${n(cy-ry*k)} ${n(cx-rx*k)} ${n(cy-ry)} ${n(cx)} ${n(cy-ry)} c ${n(cx+rx*k)} ${n(cy-ry)} ${n(cx+rx)} ${n(cy-ry*k)} ${n(cx+rx)} ${n(cy)} c h`;
 let outer;
 if(shape==='ellipse')outer=ellipse(w/2,h/2,w/2+offset,h/2+offset);
 else if(r+offset===0)outer=`0 0 ${n(w)} ${n(h)} re`;
 else{
  const a=-offset,z=w+offset,t=-offset,u=h+offset,R=r+offset,c=R*(1-k);
  outer=`${n(a+R)} ${n(t)} m ${n(z-R)} ${n(t)} l ${n(z-c)} ${n(t)} ${n(z)} ${n(t+c)} ${n(z)} ${n(t+R)} c ${n(z)} ${n(u-R)} l ${n(z)} ${n(u-c)} ${n(z-c)} ${n(u)} ${n(z-R)} ${n(u)} c ${n(a+R)} ${n(u)} l ${n(a+c)} ${n(u)} ${n(a)} ${n(u-c)} ${n(a)} ${n(u-R)} c ${n(a)} ${n(t+R)} l ${n(a)} ${n(t+c)} ${n(a+c)} ${n(t)} ${n(a+R)} ${n(t)} c h`;
 }
 return [outer,...(g.holes||[]).map(h=>ellipse(h.x,h.y,h.diameter/2,h.diameter/2))].join('\n');
}
// Binary 600-dpi silhouette, merged into closed vector rectangles. Not source vector reconstruction.
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
export async function printPDF({settings,pixels,kind='combined'}){
 const s=exportSettings(settings.geometry,settings),{width:w,height:h,rgb,alpha}=pixels;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>50000000||rgb.length!==w*h*3||alpha.length!==w*h||!['combined','color','white','cut'].includes(kind))throw Error('Ungültige Druckdaten.');
 const pdf=new PDF(),catalog=pdf.add(''),pages=pdf.add(''),page=pdf.add('');
 const W=s.pageWidthMm,H=s.pageHeightMm,bleed=s.bleedMm;
 const transform=`${PT} 0 0 ${-PT} 0 ${n(H*PT)} cm`;
 const geo=`${s.mirror?-1:1} 0 0 1 ${n(bleed+(s.mirror?s.geometry.width:0))} ${bleed} cm`;
 const fn=pdf.add('<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 0 0 0] /N 1 >>');
 const cutFn=pdf.add('<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 1 0 0] /N 1 >>');
 const props=[],streams=[],refs=[];
 const layer=(name,body)=>{const id=pdf.add(`<< /Type /OCG /Name (${name}) >>`);props.push(`/L${id} ${id} 0 R`);refs.push(`${id} 0 R`);streams.push(`/OC /L${id} BDC\nq\n${transform}\n${body}\nQ\nEMC`);};
 let image='';
 if(kind==='combined'||kind==='color'){
  const mask=await pdf.stream(`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceGray /BitsPerComponent 8`,alpha);
  const im=await pdf.stream(`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${mask} 0 R`,rgb);image=`/Art ${im} 0 R`;
  // Bitmap is already mirrored. Clip contour uses the same mirrored mechanical geometry.
  layer('Farbmotiv',`/GSWhite gs q ${geo}\n${contourPath(s.geometry,bleed)} W* n\n${s.mirror?-1:1} 0 0 1 ${s.mirror?s.geometry.width+bleed:-bleed} ${-bleed} cm\n${W} 0 0 ${-H} 0 ${H} cm /Art Do Q`);
 }
 if((kind==='combined'||kind==='white')&&s.white!=='none'){
  let white;
  if(s.white==='full')white=`${geo}\n${contourPath(s.geometry,s.whiteBleedMm)} f*`;
  else{
   const rects=maskRectangles(alpha,w,h); // alpha is already mirrored with the artwork.
   white=`q ${geo}\n${contourPath(s.geometry,s.whiteBleedMm)} W* n\n${s.mirror?-1:1} 0 0 1 ${s.mirror?s.geometry.width+bleed:-bleed} ${-bleed} cm\n${W/w} 0 0 ${H/h} 0 0 cm\n${rects.map(r=>`${r.x} ${r.y} ${r.w} ${r.h} re`).join('\n')}\nf Q`;
  }
  const mimaki=s.profile==='mimaki';
  layer(kind==='white'||mimaki?'Weissersatz Vektor':'RDG_WHITE',(kind==='white'?'0 0 0 1 k':mimaki?'0 0 0 0 k':'/GSWhite gs /White cs 1 scn')+'\n'+white);
  if(kind==='combined'){const last=streams.pop();streams.unshift(last);} // Underprint before color; both use overprint, RIP validation remains required.
 }
 if(kind==='combined'||kind==='cut')layer('CutContour',`${geo}\n/Cut CS 1 SCN 0.05 w\n${contourPath(s.geometry)} S`);
 const content=await pdf.stream('',b(streams.join('\n'))),box=`[0 0 ${n(W*PT)} ${n(H*PT)}]`,trim=`[${n(bleed*PT)} ${n(bleed*PT)} ${n((W-bleed)*PT)} ${n((H-bleed)*PT)}]`;
 pdf.set(page,`<< /Type /Page /Parent ${pages} 0 R /MediaBox ${box} /BleedBox ${box} /TrimBox ${trim} /Resources << /XObject << ${image} >> /ColorSpace << ${s.profile==='roland'?`/White [/Separation /RDG_WHITE /DeviceCMYK ${fn} 0 R]`:''} /Cut [/Separation /CutContour /DeviceCMYK ${cutFn} 0 R] >> /ExtGState << /GSWhite << /Type /ExtGState /OP true /op true /OPM 1 >> >> /Properties << ${props.join(' ')} >> >> /Contents ${content} 0 R >>`);
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
