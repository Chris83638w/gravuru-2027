import {createHash} from 'node:crypto';
import {workshopCatalog,workshopResources} from './catalog.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'form_additions'});};
export const defaultAdditions=()=>({text:true,motifs:true,maxElements:8});
export const additionPolicy=design=>design.additions||{text:false,motifs:false,maxElements:0};
export function validateAdditionPolicy(design){
 if(design.additions===undefined)return;
 const p=design.additions;
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join(',')!=='maxElements,motifs,text'||typeof p.text!=='boolean'||typeof p.motifs!=='boolean'||!Number.isInteger(p.maxElements)||p.maxElements<0||p.maxElements>19)fail('Bitte Kundenfreigaben und höchstens 19 zusätzliche Elemente festlegen.');
}
let catalog;
export function formMotifs(){
 if(!catalog){
  const names=new Map(workshopCatalog().motifs.map(m=>[m.id,m.name]));
  catalog=new Map();
  for(const m of workshopResources().motifs){
   // Only bundled, passive vector resources. No user-supplied SVG/URLs are accepted here.
   if(!/^[a-zA-Z0-9][\w.:-]{0,119}$/.test(m.key)||typeof m.svgFragment!=='string'||!Array.isArray(m.bounds)||m.bounds.length!==4||!m.bounds.every(Number.isFinite)||m.bounds[2]<=0||m.bounds[3]<=0||/<(?:script|image|foreignObject|iframe|use|style)\b|\bon[a-z]+\s*=|(?:href|url\s*\()/i.test(m.svgFragment))continue;
   // The 18 original catalog fragments inherit this exact paint in editor-source.html.
   // The other bundled entries already contain their own complete SVG paint.
   const svgFragment=m.svgFragment.trim().startsWith('<svg')?m.svgFragment:`<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${m.svgFragment}</g>`;
   const sha256=createHash('sha256').update(JSON.stringify({key:m.key,bounds:m.bounds,svgFragment})).digest('hex');
   const translated={branch:'Zweig',wreath:'Kranz',mountain:'Berge',sun:'Sonne',infinity:'Unendlichkeit',frame:'Rahmen',line:'Linie',circle:'Kreis',flower:'Blume',moon:'Mond',wings:'Flügel',tree:'Baum',compass:'Kompass'};
   catalog.set(m.key,{key:m.key,name:translated[m.key]||names.get(m.key)||m.key,bounds:m.bounds,svgFragment,sha256});
  }
 }
 return [...catalog.values()];
}
export function formMotif(key,sha256){formMotifs();const m=catalog.get(key);if(!m||sha256!==undefined&&sha256!==m.sha256)fail('Das gewählte Motiv fehlt oder seine gesicherte Quelle wurde verändert.');return m;}
export function motifFieldMarkup(f){
 const m=formMotif(f.motifKey,f.motifSha256),[x,y,w,h]=m.bounds,angle=f.rotation*Math.PI/180;
 const scale=Math.min(f.widthMm/(Math.abs(w*Math.cos(angle))+Math.abs(h*Math.sin(angle))),f.heightMm/(Math.abs(w*Math.sin(angle))+Math.abs(h*Math.cos(angle))));
 const body=m.svgFragment.replace(/(fill|stroke)=(['"])([^'"]+)\2/gi,(all,key,q,value)=>value==='none'?all:`${key}=${q}${f.color}${q}`).replace(/((?:fill|stroke)\s*:\s*)([^;'"]+)/gi,(all,key,value)=>value.trim()==='none'?all:key+f.color);
 return `<g data-field="${f.id}" transform="translate(${f.xMm+f.widthMm/2} ${f.yMm+f.heightMm/2})" fill="${f.color}"><g transform="rotate(${f.rotation}) scale(${scale}) translate(${-x-w/2} ${-y-h/2})">${body}</g></g>`;
}
export function addedFieldDefinitions(design,state){
 const additions=state.additions??[];const p=additionPolicy(design);
 if(!Array.isArray(additions)||additions.length>p.maxElements||design.fields.length+additions.length>19)fail('Für dieses Design sind zu viele zusätzliche Elemente gewählt.');
 const ids=new Set(design.fields.map(f=>f.id));
 return additions.map(v=>{
  if(!v||typeof v!=='object'||Array.isArray(v)||!['text','motif'].includes(v.type)||!p[v.type==='text'?'text':'motifs']||!/^extra-[a-f0-9-]{16,64}$/.test(v.id)||ids.has(v.id))fail('Dieses zusätzliche Element ist nicht freigegeben oder seine Kennung ist ungültig.');
  ids.add(v.id);
  const keys=['id','type','deleted','xMm','yMm','widthMm','heightMm',...(v.type==='text'?['text','font','sizeMm','color','bold','italic']:['motifKey','motifSha256','color','rotation'])];
  if(Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k))||typeof v.deleted!=='boolean')fail('Unbekannte Eigenschaften am zusätzlichen Element.');
  const {deleted,type,...data}=v;
  return {...data,type,label:type==='text'?'Eigener Text':formMotif(v.motifKey,v.motifSha256).name,allowMove:true,allowScale:true,allowDelete:true,allowColor:true};
 });
}
