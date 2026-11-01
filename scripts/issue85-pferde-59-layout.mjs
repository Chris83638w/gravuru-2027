// Recompose the 59 authorized references using the real editor's font/contour model.
import fs from 'node:fs';import path from 'node:path';
import {openKatalog,readDesignFolder} from '../app/workshop/katalog-source.mjs';
import {katalogDesignToTemplate,transformEmbeddedPath} from '../app/workshop/katalog-convert.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {measureText} from '../app/platform/sources/app/shared/models/doorbell-preview.mjs';
import {customerLayoutIssue} from '../app/configurator/variant-m/contract.mjs';
const root=process.argv[2],report=path.join(root,'auftraege/2026-11-01-issue85-pferde'),items=JSON.parse(fs.readFileSync(path.join(report,'schriftwechsel-59.json'))),k=openKatalog(root),family=k.families.get('steel-door-signs');
const names=[...new Set(items.flatMap(i=>i.fonts))],resources=await k.fontResources(names,{converter:convertFont});if(resources.missing.length)throw Error('Schrift fehlt: '+resources.missing.join(', '));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),evidence=[];
for(const [index,item] of items.entries()){
 const dir=path.join(root,'designs',item.series,item.id),master=readDesignFolder(dir),j=master.json,[W,H]=master.plateMm,oval=j.form==='Oval',cfg=j.review.sample;
 const c=katalogDesignToTemplate(master,family,null,{fonts:resources.fonts}),d=c.template,texts=d.objects.filter(o=>o.type==='text'),motifs=d.objects.filter(o=>o.type==='motif'),photos=d.objects.filter(o=>o.type==='photoSlot');
 const roles=new Map(j.roles.map((role,i)=>[role,texts[i]])),unwrapped=new Map(texts.map(o=>[o.id,o.text]));
 const set=(o,x,y,size,width,wrap=false)=>{
  o.x=x;o.y=y;o.size=size;o.textAnchor='middle';delete o.lineHeight;measureText(o,resources.fonts);
  if(wrap){o.text=unwrapped.get(o.id);measureText(o,resources.fonts);if(o.w>width){const lines=[];for(const paragraph of o.text.split('\n')){let line='';for(const word of paragraph.split(' ')){const test=line?line+' '+word:word;const probe={...o,text:test};measureText(probe,resources.fonts);if(line&&probe.w>width){lines.push(line);line=word;}else line=test;}lines.push(line);}o.text=lines.join('\n');}}
  measureText(o,resources.fonts);if(o.w>width){o.size*=width/o.w;measureText(o,resources.fonts);}return o;
 };
 const place=(role,...args)=>roles.has(role)?set(roles.get(role),...args):null;
 const frame=[],lines=[],figures=[];
 for(const m of motifs){if(!item.key.startsWith('BSS')&&m.w>W*.72&&m.h>H*.65)frame.push(m);else if(m.h<.8||m.w/m.h>16)lines.push(m);else figures.push(m);}
 const contactRoles=['owner','phone','vet','vet-phone','farrier','farrier-phone'];
 if(photos.length){
  const source=JSON.parse(fs.readFileSync(path.join(root,cfg.source,'design.json'))),main=source.texts.filter(t=>!t.hint).sort((a,b)=>(b.sizePt||0)-(a.sizePt||0))[0];
  const right=source.plate.widthMm>source.plate.heightMm&&main?.box&&main.box[0]+main.box[2]/2<source.plate.widthMm/2;
  const px=right?60:20,tx=right?21:59;
  place('name',figures.length===1?45.5:40,frame.length?10.5:8.5,frame.length?9:11,figures.length>1?50:figures.length===1?61:frame.length?59:73);
  if(photos.length===1){Object.assign(photos[0],{x:px,y:34,w:33,h:35});if(photos[0].photoShape==='circle'){photos[0].h=33;photos[0].y=34;}}
  else if(photos.length===2){for(const [i,p] of photos.entries())Object.assign(p,{x:(right?80:0)+(right?-1:1)*(i?31:12),y:i?40:25,w:19,h:23});}
  else if(photos.length===3){Object.assign(photos[0],{x:right?67:13,y:34,w:21,h:34});for(let i=1;i<3;i++)Object.assign(photos[i],{x:right?49:31,y:i===1?25:43,w:15,h:15});}
  else{for(const [i,p] of photos.entries())Object.assign(p,{x:right?80-(12+i%2*19):12+i%2*19,y:25+Math.floor(i/2)*19,w:17,h:17});}
  const body=texts.filter(o=>o!==roles.get('name')),width=33.5;
  // Measure line wrapping first, then distribute by actual height. Long warnings
  // and contact labels stay legible without crossing the photo panel.
  let size=3.7,total=0;
  for(let attempt=0;attempt<20;attempt++){
   total=0;for(const o of body){set(o,tx,20,size,width,true);total+=o.h;}
   total+=(body.length-1)*1.05;if(total<=34)break;size*=.96;
  }
  const gap=body.length>1?Math.max(.8,(34-body.reduce((n,o)=>n+o.h,0))/(body.length-1)):0;
  let y=17;for(const o of body){o.y=y+o.h/2;y+=o.h+gap;}
  if(item.key==='BSUV-A-D24')place('phone',26.5,49.5,3,25); // clear the source's lower corner flourish
  // Preserve additional source ornaments as compact header details. The filled
  // photographic field is the main visual element for these source layouts.
  for(const [i,m] of figures.entries()){const ratio=m.w/m.h;let h=8.5,w=h*ratio;if(w>13){w=13;h=w/ratio;}Object.assign(m,{x:i%2?73:7,y:8.5,w,h});}
  for(const [i,m] of lines.entries()){const ratio=m.w/m.h;const y=body[Math.min(i,body.length-1)]?.y??40;Object.assign(m,{x:tx,y:y+2.3,w:32,h:32/ratio});}
 }else{
  place('name',!oval&&figures.length===2?46:W/2,oval?15:frame.length?11:8.5,oval?23:frame.length?10:12,oval?110:figures.length>2?50:figures.length===2?60:72);
  const hero=figures.sort((a,b)=>b.w*b.h-a.w*a.h)[0];
  const body=texts.filter(o=>o!==roles.get('name')&&!contactRoles.some(role=>roles.get(role)===o));
  const onlyDate=body.length===1&&roles.get('date')===body[0];
  if(hero){const ratio=hero.w/hero.h,maxW=oval?(onlyDate?88:51):(onlyDate?56:32),maxH=oval?(onlyDate?25:36):25;let w=Math.min(maxW,maxH*ratio),h=w/ratio;Object.assign(hero,{x:onlyDate?W/2:(oval?34:19),y:onlyDate?(oval?47:29):(oval?44:29.5),w,h});}
  for(const [i,m] of figures.slice(1).entries()){const ratio=m.w/m.h;let h=oval?12:8,w=h*ratio;if(w>(oval?20:12)){w=oval?20:12;h=w/ratio;}Object.assign(m,{x:i%2?W-8:8,y:oval?17:8,w,h});}
  if(onlyDate){place('name',W/2,oval?14:8.5,oval?20:12,oval?110:72);place('date',W/2,oval?30:17,oval?5:3.5,oval?95:66);}
  else{
   const x=hero?(oval?106:58):W/2,width=hero?(oval?65:37):(oval?115:72),top=oval?29:18,bottom=oval?54:37;
   let sz=oval?6:4.2;
   for(let attempt=0;attempt<25;attempt++){for(const o of body)set(o,x,top,sz,width,true);if(body.reduce((n,o)=>n+o.h,0)+(body.length-1)*1<bottom-top)break;sz*=.96;}
   let y=top;const gap=Math.max(.8,(bottom-top-body.reduce((n,o)=>n+o.h,0))/Math.max(1,body.length-1));for(const o of body){o.y=y+o.h/2;y+=o.h+gap;}
  }
  const groups=[['owner','phone'],['vet','vet-phone'],['farrier','farrier-phone']].filter(g=>roles.has(g[0]));
  for(const [i,[label,phone]] of groups.entries()){
   const xs=oval?(groups.length===1?[75]:groups.length===2?[43,107]:[43,75,107]):groups.length===1?[40]:groups.length===2?[21,60]:[14,40,66];
   const width=oval?(groups.length===1?100:groups.length===2?50:31):(groups.length===1?72:groups.length===2?36:24),size=oval?(groups.length===3?3.7:4.8):(groups.length===3?2.5:3.1);
   const o=roles.get(label);if(groups.length===3)o.text=o.text.replace(': ',':\n');
   set(o,xs[i],oval?63:44.5,size,width,true);place(phone,xs[i],oval?72:51,oval?4:2.8,width);
  }
  for(const [i,m] of lines.entries()){const ratio=m.w/m.h;Object.assign(m,{x:W/2,y:oval?(onlyDate?60:57)+i*.8:39.7+i*.45,w:W*.84,h:W*.84/ratio});}
 }
 if(item.key==='BS-V2A-D15')for(const [i,m] of figures.entries()){const ratio=m.w/m.h;Object.assign(m,{x:37.5+i*25,y:47,h:15,w:15*ratio});}
 for(const m of frame){const ratio=m.w/m.h,w=Math.min(W-2,(H-2)*ratio);Object.assign(m,{x:W/2,y:H/2,w,h:w/ratio});}
 const product={kind:'universal-product',geometry:{width:W,height:H,shape:oval?'ellipse':'rect',safeMarginMm:0,holes:[]}},corrections=[];
 for(const o of d.objects){let steps=0;while(customerLayoutIssue(o,product,{fonts:resources.fonts,motifs:c.motifs})&&steps++<100){if(o.type==='text'){o.size*=.98;measureText(o,resources.fonts);}else{o.w*=.98;o.h*=.98;}}
  const issue=customerLayoutIssue(o,product,{fonts:resources.fonts,motifs:c.motifs});if(issue)throw Error(j.id+' '+o.id+': '+issue);if(steps)corrections.push({element:o.id,steps});
 }
 let svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'mm" height="'+H+'mm" viewBox="0 0 '+W+' '+H+'">';
 for(const o of d.objects){
  if(o.type==='text'){const ls=o.text.split('\n'),lh=o.lineHeight||o.size*1.2,y=o.y+.35*o.size-(ls.length-1)/2*lh;svg+='<g id="'+o.id+'"><text x="'+o.x+'" y="'+y+'" font-family="'+esc(o.font)+'" font-size="'+o.size+'" text-anchor="middle" fill="#000000">'+ls.map((l,i)=>'<tspan x="'+o.x+'"'+(i?' dy="'+lh+'"':'')+'>'+esc(l)+'</tspan>').join('')+'</text></g>';}
  else if(o.type==='photoSlot'){const placeholder=c.placeholders.find(p=>p.slotId===o.id),x=o.x-o.w/2,y=o.y-o.h/2;const mask=o.photoShape==='circle'?'<circle cx="'+o.x+'" cy="'+o.y+'" r="'+Math.min(o.w,o.h)/2+'" fill="none"/>':'<rect x="'+x+'" y="'+y+'" width="'+o.w+'" height="'+o.h+'" fill="none"/>';svg+='<g id="'+o.id+'">'+mask+'<image href="'+placeholder.file+'" x="'+x+'" y="'+y+'" width="'+o.w+'" height="'+o.h+'" preserveAspectRatio="xMidYMid slice"/></g>';}
  else{const m=c.motifs.find(m=>m.key===o.motif),b=m.bounds,s=o.w/b[2],dx=o.x-o.w/2-b[0]*s,dy=o.y-o.h/2-b[1]*s;svg+='<g id="'+o.id+'">'+m.svgFragment.replace(/ d="([^"]+)"/g,(_,v)=>' d="'+transformEmbeddedPath(v,s,dx,dy)+'"').replace(/stroke-width="([^"]+)"/g,(_,v)=>'stroke-width="'+Number(v)*s+'"').replaceAll('currentColor','#000000')+'</g>';}
 }
 svg+='</svg>';fs.writeFileSync(dir+'/design.svg',svg);j.sourceMotifs=j.motifs;delete j.motifs;j.texts=texts.map(o=>({text:o.text,font:o.font,sizePt:o.size*72/25.4,anchorMm:[o.x,o.y+.35*o.size],align:'center'}));j.review.layout='Großer Name; Motive gleichproportional; gefüllte Fotofelder; unterschiedliche Beispieldaten; native Konturprüfung';j.review.contourCorrections=corrections;fs.writeFileSync(dir+'/design.json',JSON.stringify(j,null,1)+'\n');
 evidence.push({id:j.id,texts:texts.length,photos:photos.length,motifPaths:motifs.reduce((n,o)=>n+c.motifs.find(m=>m.key===o.motif).svgFragment.match(/<path /g).length,0),contourErrors:0,corrections});
 console.log(j.id,'fertig',corrections.length?'('+corrections.length+' Konturkorrekturen)':'');
}
fs.writeFileSync(path.join(report,'layout-59-pruefung.json'),JSON.stringify(evidence,null,1)+'\n');
