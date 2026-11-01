// Stock horse layouts: native text metrics, preserved motif proportions, contour QA.
import fs from 'node:fs';
import path from 'node:path';
import {readDesignFolder,openKatalog} from '../app/workshop/katalog-source.mjs';
import {katalogDesignToTemplate,transformEmbeddedPath} from '../app/workshop/katalog-convert.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {measureText} from '../app/platform/sources/app/shared/models/doorbell-preview.mjs';
import {customerLayoutIssue} from '../app/configurator/variant-m/contract.mjs';
const root=process.argv[2],k=openKatalog(root),family=k.families.get('steel-door-signs');
const files=['boxenschilder-gravur-80x53','boxenschilder-gravur-oval-150x80'].flatMap(series=>{const base=path.join(root,'designs',series);return fs.readdirSync(base,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>path.join(base,e.name));});
const names=[...new Set(files.flatMap(p=>JSON.parse(fs.readFileSync(p+'/design.json')).fonts))],res=await k.fontResources(names,{converter:convertFont});
if(res.missing.length)throw Error('Schrift fehlt: '+res.missing.join(', '));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const evidence=[];
for(const [di,dir] of files.entries()){
 const master=readDesignFolder(dir),j=master.json,c=katalogDesignToTemplate(master,family,null,{fonts:res.fonts}),d=c.template;
 const texts=d.objects.filter(o=>o.type==='text'),motifs=d.objects.filter(o=>o.type==='motif');
 const text=(n,x,y,size,maxWidth=72)=>{const o=texts[n-1];Object.assign(o,{x,y,size,textAnchor:'middle'});delete o.lineHeight;measureText(o,res.fonts);if(o.w>maxWidth){o.size*=maxWidth/o.w;measureText(o,res.fonts);}return o;};
 const dates=['19.04.2015','23.06.2012','08.05.2016','14.09.2017','20.03.2018','12.08.2014','09.04.2019','16.05.2013','27.07.2016','02.04.2015','19.07.2017','05.08.2018','11.06.2016'];
 for(const [ti,o] of texts.entries()){
  o.text=o.text.replace(/\b\d{2}\.\d{2}\.\d{4}\b/g,dates[di]);
  o.text=o.text.replace(/030 23125 000/g,'030 23125 '+String(10+di*10+ti).padStart(3,'0'));
  measureText(o,res.fonts);
 }
 if(j.id==='BS-A-8x5-D13'){
  text(8,21,46,2.5,36);text(9,60,46,2.5,36);text(10,21,50,2.5,32);text(11,60,50,2.5,32);
 }
 if(j.id==='BS-A-8x5-D9'){
  text(3,40,15,9,57);text(5,40,22,3.4,30);
  text(4,67,46,1.7,23);
 }
 if(j.id==='BS-AV2A-8x5-D3'){
  text(1,40,10,11,68);text(2,40,19,3.8,36);text(3,40,25,3.5,65);text(4,40,29.5,3.5,63);
 }
 if(j.id==='BSUV-A-8x5-D28'){
  text(1,32,8,9,61);text(2,24,17,3,40);
  text(3,23,24,3.4,39);text(4,23,30,3.4,39);
  const horse=motifs[1],ratio=horse.w/horse.h;Object.assign(horse,{x:61,y:32,w:30,h:30/ratio});
  text(5,23,37,3.2,39);texts[5].text='morgens: Heu';texts[6].text='abends: Hafer';
  text(6,23,42,3,39);text(7,23,47,3,39);
  text(8,61,47,2.2,31);text(9,61,51,2.2,29);
 }
 if(/BSUV-A-8x5-D(29|30)$/.test(j.id)){
  text(1,27,10,11,49);text(2,27,20,3.2,48);
  const m=motifs[0],ratio=m.w/m.h;Object.assign(m,{x:64,y:13,w:22,h:22/ratio});
  text(3,40,31,4.3,72);
  texts[4].text=di===7?'Jona Wolf':'Nele Bach';texts[7].text=di===7?'Dr. Enno Tal':'Dr. Lio West';
  text(4,21,39,3,34);text(5,21,44,3,34);text(6,21,49,3,34);
  text(7,60,39,3,34);text(8,60,44,3,34);text(9,60,49,3,34);
 }
 if(j.id==='BS-V2A-15x8-D3'){
  texts[2].text='Jule Sand';
  text(1,75,17,18,110);text(5,75,34,7,80);text(2,75,49,5,75);text(3,75,57,6,75);text(4,75,65,5,70);
  for(const m of motifs){const ratio=m.w/m.h;Object.assign(m,{x:25,y:43,h:25,w:25*ratio});}
 }
 if(j.id==='BS-V2A-15x8-D6'){
  texts[4].text='Finn Falk';
  text(1,75,18,18,110);text(2,39,37,7,48);text(3,113,37,5,46);text(4,75,51,4.5,70);text(5,75,58,5,70);text(6,75,66,4.5,65);
  for(const m of motifs){const ratio=m.w/m.h;Object.assign(m,m.h/m.w<.1?{x:75,y:45,w:80,h:80/ratio}:{x:75,y:36,h:22,w:22*ratio});}
 }
 if(j.id==='BS-V2A-15x8-D7'){
  texts[2].text='Alina Stein';texts[5].text='Dr. Adrian Fels';
  text(1,75,17,17,115);text(2,36,40,4.5,43);text(3,36,49,5,43);text(4,36,59,4.5,43);text(5,115,40,4.5,43);text(6,115,49,5,43);text(7,115,59,4.5,43);
  for(const m of motifs)if(m.h/m.w>1.2){const ratio=m.w/m.h;Object.assign(m,{x:75,y:51,h:40,w:40*ratio});}
 }
 if(j.id==='BS-V2A-15x8-D9'){
  texts[3].text='Besitzerin: Lea König';
  text(1,75,20,17,110);text(2,101,39,5.5,58);text(3,101,49,5.5,58);text(4,75,65,5,100);
  for(const m of motifs){const ratio=m.w/m.h;Object.assign(m,{x:34,y:43,h:29,w:29*ratio});}
 }
 const [W,H]=master.plateMm;
 const product={kind:'universal-product',geometry:{width:W,height:H,shape:j.form==='Oval'?'ellipse':'rect',safeMarginMm:0,holes:[]}};
 const corrections=[];
 for(const o of d.objects){
  let n=0;
  while(customerLayoutIssue(o,product,{fonts:res.fonts,motifs:c.motifs})&&n++<80){
   if(o.type==='text'){o.size*=.98;measureText(o,res.fonts);}
   else{o.w*=.98;o.h*=.98;}
  }
  const issue=customerLayoutIssue(o,product,{fonts:res.fonts,motifs:c.motifs});if(issue)throw Error(j.id+' '+o.id+': '+issue);
  if(n)corrections.push({element:o.id,steps:n});
 }
 let svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'mm" height="'+H+'mm" viewBox="0 0 '+W+' '+H+'">';
 for(const o of d.objects){
  if(o.type==='text'){
   const lines=o.text.split('\n'),sz=o.size,lh=o.lineHeight||sz*1.2,y=o.y+.35*sz-(lines.length-1)/2*lh;
   svg+='<g id="'+o.id+'"><text x="'+o.x+'" y="'+y+'" font-family="'+esc(o.font)+'" font-size="'+sz+'" text-anchor="middle" fill="#000000">'+lines.map((l,i)=>'<tspan x="'+o.x+'"'+(i?' dy="'+lh+'"':'')+'>'+esc(l)+'</tspan>').join('')+'</text></g>';
  }else{
   const m=c.motifs.find(m=>m.key===o.motif),b=m.bounds,s=o.w/b[2],dx=o.x-o.w/2-b[0]*s,dy=o.y-o.h/2-b[1]*s;
   svg+='<g id="'+o.id+'">'+m.svgFragment.replace(/ d="([^"]+)"/g,(_,v)=>' d="'+transformEmbeddedPath(v,s,dx,dy)+'"').replace(/stroke-width="([^"]+)"/g,(_,v)=>'stroke-width="'+Number(v)*s+'"').replaceAll('currentColor','#000000')+'</g>';
  }
 }
 svg+='</svg>';fs.writeFileSync(dir+'/design.svg',svg);
 j.texts=texts.map(o=>({text:o.text,font:o.font,sizePt:o.size*72/25.4,align:'center',anchorMm:[o.x,o.y+.35*o.size],lineHeightMm:o.lineHeight||o.size*1.2}));
 // SVG is the editable canonical geometry; retain the original motif metadata only as provenance.
 j.sourceMotifs=j.motifs;delete j.motifs;
 j.review.layout='Native Textmessung; Kontaktzeilen getrennt; UV-Silhouette neben Text; Kontur ohne Befestigung geprüft.';
 j.review.contourCorrections=corrections;j.review.prototypeFeedPlan='Fiktive Beispieldaten, keine Fütterungsempfehlung.';
 fs.writeFileSync(dir+'/design.json',JSON.stringify(j,null,1)+'\n');
 evidence.push({id:j.id,texts:texts.length,motifs:motifs.length,contourErrors:0,corrections});
}
fs.writeFileSync(path.join(root,'auftraege/2026-11-01-issue85-pferde/layout-pruefung.json'),JSON.stringify(evidence,null,1)+'\n');
console.log(JSON.stringify(evidence));
