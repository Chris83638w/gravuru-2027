import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Place the original, newly drawn individual characters without distortion.
const katalogArg=process.argv.find(value=>value.startsWith('--katalog='));
if(!katalogArg)throw Error('Explizites --katalog=<Arbeitskopie> erforderlich; Originale werden nicht automatisch überschrieben.');
const root=path.resolve(katalogArg.slice('--katalog='.length));
const series='familie-mika-120x80';
const registry=JSON.parse(fs.readFileSync(path.join(root,'motive-eigene/motive-eigene.json'),'utf8')).motifs;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const round=v=>Number(v.toFixed(5));
function transformPath(d,scale,tx,ty){
 const tokens=d.match(/[a-df-zA-DF-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g);
 const count={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0};let i=0,cmd='',first=true,out=[];
 while(i<tokens.length){
  if(/^[a-z]$/i.test(tokens[i]))cmd=tokens[i++];
  const upper=cmd.toUpperCase(),relative=cmd!==upper,n=count[upper];if(n===undefined)throw Error('Unsupported SVG command '+cmd);
  if(!n){out.push(cmd);cmd='';continue;}
  const values=tokens.slice(i,i+n).map(Number);if(values.length!==n||values.some(v=>!Number.isFinite(v)))throw Error('Malformed original SVG');i+=n;
  const offset=!relative||first&&upper==='M';
  for(let k=0;k<n;k++){
   if(upper==='A'){if(k<2)values[k]*=scale;else if(k>4)values[k]=values[k]*scale+(offset?(k===5?tx:ty):0);}
   else if(upper==='H')values[k]=values[k]*scale+(offset?tx:0);
   else if(upper==='V')values[k]=values[k]*scale+(offset?ty:0);
   else values[k]=values[k]*scale+(offset?(k%2?ty:tx):0);
  }
  out.push(cmd+' '+values.map(round).join(' '));first=false;
  if(upper==='M')cmd=relative?'l':'L';
 }
 return out.join(' ');
}
function originalMotif(file,cx,bottom,box){
 const relative=file+'.svg',source=fs.readFileSync(path.join(root,'motive-eigene',relative),'utf8');
 if(/\btransform=/.test(source))throw Error('Original has transform: '+file);
 const vb=source.match(/viewBox="([^"]+)"/)[1].trim().split(/[ ,]+/).map(Number);
 const scale=box/Math.max(vb[2],vb[3]),w=vb[2]*scale,h=vb[3]*scale,tx=cx-w/2-vb[0]*scale,ty=bottom-h-vb[1]*scale;
 const ds=[...source.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*>/g)].map(m=>transformPath(m[1],scale,tx,ty));
 if(!ds.length)throw Error('Original has no paths: '+file);
 const reg=registry.find(m=>m.file===relative);if(!reg)throw Error('Missing registered motif '+file);
 return {svg:ds.map(d=>`<path fill="#000000" d="${d}"/>`).join(''),box:[cx-w/2,bottom-h,w,h],paths:ds.map(d=>({d,fill:'#000000',stroke:null,strokeMm:0,opacity:1})),source:'motive-eigene/'+relative,motifId:reg.key,sha256:crypto.createHash('sha256').update(source).digest('hex')};
}
const specifications=[
 {id:'01',name:'Das sind wir',family:'Neumann',shape:'RE',font:'Patrick Hand',style:'smile',names:['Anna','Ben','Nils','Lina','Sami']},
 {id:'02',name:'Unser kleines Wir',family:'Berger',shape:'OV',font:'Raleway',style:'slim',names:['Clara','Paul','Ida','Oskar','Leni']},
 {id:'03',name:'Die Nachtschwärmer',family:'Wendt',shape:'OV',font:'Josefin Sans',style:'owls',names:['Nora','Finn','Mila','Luca','Fiete']},
 {id:'04',name:'Hier summt das Leben',family:'Sommer',shape:'AB',font:'Raleway',style:'bees',names:['Marie','Jan','Ida','Theo','Emma']},
 {id:'05',name:'Unser kleines Glück',family:'Glück',shape:'RE',font:'Patrick Hand',style:'ladybirds',names:['Mara','Leon','Lotta','Noah','Juna']}
];
const report=[];
for(const spec of specifications)for(const persons of [3,5]){
 const id=`FAM-MIKA-${spec.id}-P${persons}`,layers=[],texts=[],motifs=[],fields={},members=[];
 function text(key,value,font,size,x,y,anchor='middle'){
  const tid='text-'+key;layers.push(`<text id="${tid}" data-feld="${key}" x="${x}" y="${y}" font-family="${font}" font-size="${size}" text-anchor="${anchor}" fill="#000000">${escape(value)}</text>`);
  texts.push({id:tid,text:value,font,sizeMm:size,sizePt:round(size*72/25.4),anchorMm:[x,y],align:anchor==='middle'?'center':anchor==='end'?'right':'left',color:'#000000',lineHeightMm:round(size*1.2),letterSpacingMm:0});
  fields[tid]={required:false,locked:false,label:key.startsWith('person-')?'Name der '+key.split('-')[1]+'. Person':key==='pet-1-name'?'Name des Haustiers':key==='family'?'Familienname':key==='motto'?'Familienspruch':'Überschrift'};
  return tid;
 }
 function member(index,file,x,bottom,box,name,nameY,isPet=false){
  const ownFile='familie-mika-atelier/'+(isPet?'mika-atelier-dog-balu':`mika-atelier-${spec.style}-${String(index+1).padStart(2,'0')}`);
  const key=isPet?'pet-1':`person-${index+1}`,mid='motiv-'+key,m=originalMotif(ownFile,x,bottom,box);
  layers.push(`<g id="${mid}" fill="#000000">${m.svg}</g>`);
  motifs.push({id:mid,box:m.box,paths:m.paths,source:m.source,motifId:m.motifId});
  const tid=text(key+'-name',name,spec.font,4.8,x,nameY);
  members.push({memberId:key,kind:isPet?'pet':'person',order:index,motifElementId:mid,nameElementId:tid,nameField:key+'-name',sourceMotifId:m.motifId,source:m.source,sourceSha256:m.sha256,boxMm:m.box,nameBaselineMm:[x,nameY],gapMotifToNameBaselineMm:round(nameY-bottom)});
 }
 const names=spec.names.slice(0,persons);
 const centers=persons===3?[30,60,90]:spec.shape==='OV'?[24,42,60,78,96]:[20,40,60,80,100];
 if(spec.style==='smile'){
  text('heading','FAMILIE','Josefin Sans',4.8,60,13);text('family',spec.family,'Dancing Script',10,60,25);
  const pets=persons===5, xs=pets?[16,34,52,70,88]:centers;
  names.forEach((n,i)=>member(i,null,xs[i],58,i<2?28:[25,23,21][i-2],n,65));
  if(pets)member(5,'figuren/hund',106,58,16,'Balu',65,true);
  text('motto','Zusammen ist unser Lieblingsort.','Patrick Hand',5,60,75);
 }else if(spec.style==='slim'){
  text('heading','Unser kleines Wir','Caveat',8,60,20);text('family','Familie '+spec.family,'Raleway',4.6,60,28);
  names.forEach((n,i)=>member(i,null,centers[i],58,i<2?28:[25,24,22][i-2],n,65));
 }else if(spec.style==='owls'){
  text('heading','DIE NACHTSCHWÄRMER','Josefin Sans',5.4,60,17);text('family','Familie '+spec.family,'Dancing Script',8.5,60,28);
  names.forEach((n,i)=>member(i,null,centers[i],58,i<2?(persons===3?28:24):(persons===3?22:i===2?18:21),n,65));
 }else if(spec.style==='bees'){
  text('heading','Hier summt das Leben','Caveat',8,11,18,'start');text('family','Familie '+spec.family,'Raleway',4.6,12,27,'start');
  names.forEach((n,i)=>{const bottom=persons===3?[55,53,56][i]:[55,53,55,53,56][i];member(i,null,centers[i],bottom,i<2?(persons===3?28:22):(persons===3?24:20),n,bottom+7);});
  text('motto','Kleiner Schwarm. Großes Glück.','Caveat',5.5,108,75,'end');
 }else{
  text('heading','UNSER','Josefin Sans',4.8,11,25,'start');text('heading2','kleines','Caveat',7,10,36,'start');text('heading3','Glück','Caveat',11,10,49,'start');text('family','Familie '+spec.family,'Josefin Sans',4.8,11,69,'start');
  const slots=persons===3?[[59,47,27],[84,53,25],[104,65,22]]:[[59,32,23],[83,32,23],[105,33,21],[68,66,23],[96,66,23]];
  names.forEach((n,i)=>member(i,'tiere/marienkafer',slots[i][0],slots[i][1],slots[i][2],n,slots[i][1]+8));
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80">\n${layers.join('\n')}\n</svg>\n`;
 const json={id,name:`${spec.name} · ${persons} Personen`,material:'Edelstahl',process:'Gravur',form:spec.shape==='OV'?'Oval':spec.shape==='AB'?'Rechteck abgerundete Ecken':'Rechteck',plate:{widthMm:120,heightMm:80},plateMm:[120,80],themes:['familienschilder'],movable:true,sizes:[`GR-ES-${spec.shape}-120X80-T15`],fonts:[...new Set(texts.map(t=>t.font))],fields,texts,motifs,photos:[],katalog:{key:id,series,themen:['familienschilder']},ziele:[{familie:'steel-door-signs',freigabe:null}],provenance:{mode:'neu',author:'Astra Mika',date:'2026-10-30',brief:'Issue75 Nachricht 6; Nutzer verwirft schematische Figuren und wählt die professionellen Bildrichtungen 1 und 3, kombiniert. Alle Mitglieder individuell und süß.',source:'26 eigene Illustrationen nach den vom Nutzer gewählten Bildrichtungen 1 und 3; mit Bildgenerierung entwickelt, mit Shapesoda vektorisiert und als einzelne schwarze Vektorflächen aufbereitet.'},familyMembers:{persons,pets:members.filter(m=>m.kind==='pet').length,maximumPersons:6,petsAdditionalOptional:true,members}};
 const dir=path.join(root,'designs',series,id);fs.mkdirSync(dir,{recursive:true});
 for(const item of members){item.sourceCopy=item.motifElementId+'.svg';fs.copyFileSync(path.join(root,item.source),path.join(dir,item.sourceCopy));}
 fs.writeFileSync(path.join(dir,'design.svg'),svg);fs.writeFileSync(path.join(dir,'design.json'),JSON.stringify(json,null,2)+'\n');
 report.push({id,name:json.name,shape:json.form,persons,pets:json.familyMembers.pets,fonts:json.fonts,dir:path.relative(root,dir).replaceAll('\\','/'),members});
}
fs.writeFileSync(path.join(root,'designs',series,'index.json'),JSON.stringify({schema:'gravuru-family-samples/v1',author:'Astra Mika',designs:report},null,2)+'\n');
console.log(JSON.stringify({created:report.length,series,persons:[3,5],individualFigures:report.reduce((n,r)=>n+r.members.length,0)}));
