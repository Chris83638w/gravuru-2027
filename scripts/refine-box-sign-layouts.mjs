// Chris: larger names/motifs and fuller layouts, 29.10.2026. Review only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {measureText} from '../app/platform/sources/app/shared/models/doorbell-preview.mjs';
import {customerLayoutIssue} from '../app/configurator/variant-m/contract.mjs';
import {transformEmbeddedPath} from '../app/workshop/katalog-convert.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const root=process.argv.find(x=>x.startsWith('--katalog=')).slice(10),bundle=read(process.argv.find(x=>x.startsWith('--baseline=')).slice(11));
const manifest=read(root+'/auftraege/2026-10-29-pferdeschilder-astra/katalog-zuordnung.json'),fonts=bundle.sharedResources.fonts;
const results=[],writes=[];const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
for(const entry of manifest.designs){
 const original=bundle.configurations.find(c=>c.id===entry.id).config,c=structuredClone(original),p=c.profile,d=p.designs[0],s=p.geometry.height/80,wide=p.geometry.width/p.geometry.height>1.6,xs=wide?1.25:1,oval=entry.form==='OV';
 const before=structuredClone(d.objects);
 function tx(id,x,y,size,max){const o=d.objects.find(o=>o.id===id);assert(o);o.x=x*xs*s;o.y=y*s;o.size=size*s;measureText(o,fonts);if(o.w>max*xs*s){o.size*=max*xs*s/o.w;measureText(o,fonts);}if(o.lineHeight)o.lineHeight=o.size*1.25;measureText(o,fonts);}
 function mo(id,x,y,width){const o=d.objects.find(o=>o.id===id),r=o.w/o.h;o.x=x*xs*s;o.y=y*s;o.w=width*s;o.h=o.w/r;}
 function grow(ids,x,y,factor){for(const id of ids){const o=d.objects.find(o=>o.id===id);o.x=x*s+(o.x-x*s)*factor;o.y=y*s+(o.y-y*s)*factor;o.w*=factor;o.h*=factor;}}
 const n=entry.muster;
 if(n===1){
  mo('motiv-2',60,14,11.4);mo('motiv-3',60,5.5,11.7);mo('motiv-4',87,61,oval?39:46);
  tx('text-1',60,32,14.3,oval?92:106);tx('text-2',42,44,5.8,45);tx('text-3',29,57,5.8,52);tx('text-4',oval?40:30,oval?64:67,5.7,oval?40:56);
 }
 if(n===2){
  for(const o of d.objects.filter(o=>o.type==='motif'&&!['motiv-2','motiv-13'].includes(o.id))){const f=o.id==='motiv-11'?1.07:1.10;o.w*=f;o.h*=f;}
  const name=d.objects.find(o=>o.id==='text-1');tx('text-1',name.x/(xs*s),name.y/s,12.3,oval?58:78);
  const birth=d.objects.find(o=>o.id==='text-5');tx('text-5',birth.x/(xs*s),birth.y/s,8.6,60);
  for(const id of ['text-2','text-3','text-4']){const o=d.objects.find(o=>o.id===id);tx(id,o.x/(xs*s),o.y/s,o.size/s*1.12,id==='text-4'?(oval?67:90):oval?27:34);}
  if(oval){tx('text-5',60,45,7.1,60);for(const id of ['text-2','text-3']){const o=d.objects.find(o=>o.id===id);o.y=55*s;}tx('text-4',60,63,6.2,70);}
 }
 if(n===3){
  for(const id of ['motiv-4','motiv-5']){const o=d.objects.find(o=>o.id===id);o.w*=1.035;o.h*=1.035;}
  grow(['motiv-6','motiv-7','motiv-8'],60*xs,54,1.22);
  tx('text-1',60,27,12.4,oval?66:86);tx('text-2',60,13,4.2,45);
  tx('text-3',28,49,7.1,44);tx('text-4',94,49,7.1,44);tx('text-5',oval?33:28,oval?63:68,oval?3.8:4,oval?28:43);tx('text-6',oval?87:92,oval?63:68,oval?3.8:4.1,oval?34:45);
  if(oval){tx('text-2',60,17,3.4,40);tx('text-3',35,47,6.8,28);tx('text-4',86,47,6.8,28);tx('text-5',35,60,3.6,28);tx('text-6',87,61,3.6,27);}
 }
 if(n===4){mo('motiv-1',28,37,oval?39:46);tx('text-name',82,22,10.7,oval?46:58);tx('text-jahr',82,36,4.6,48);tx('text-vater',82,48,4.8,49);tx('text-mutter',82,59,4.8,49);tx('text-besitzer',60,72,4.8,82);}
 if(n===5){mo('motiv-1',60,20,50);tx('text-name',60,44,12.2,88);tx('text-jahr',60,55,4.5,55);tx('text-vater',32,64,4.6,48);tx('text-mutter',88,64,4.6,48);tx('text-besitzer',60,73,4.6,79);}
 if(n===6){mo('motiv-1',60,20,54);tx('text-1',60,45,11.3,96);tx('text-2',60,56,4.4,56);tx('text-3',32,65,4.5,48);tx('text-4',88,65,4.5,48);tx('text-5',60,74,4.4,80);}
 if(n===7){mo('motiv-1',28,39,oval?35:40);tx('text-1',83,23,15.5,oval?47:54);tx('text-2',83,39,4.5,47);tx('text-3',83,50,4.7,47);tx('text-4',83,60,4.7,47);tx('text-5',60,73,4.7,83);}
 if(n===8){mo('motiv-1',88,27,45);tx('text-1',35,23,10.5,oval?45:52);tx('text-2',35,38,4.5,46);tx('text-3',60,52,5.3,80);tx('text-4',60,63,5.3,82);tx('text-5',60,74,4.7,85);}
 // At curved edges, retain the chosen centre and uniformly reduce only the element.
 for(const o of d.objects){let count=0;while(customerLayoutIssue(o,p,{...c.localResources,fonts})&&count++<30){if(o.type==='text'){o.size*=.97;if(o.lineHeight)o.lineHeight*=.97;measureText(o,fonts);}else{o.w*=.97;o.h*=.97;}}assert(!customerLayoutIssue(o,p,{...c.localResources,fonts}),entry.id+' '+o.id);if(o.type==='motif'){const old=before.find(x=>x.id===o.id);assert(Math.abs(o.w/o.h-old.w/old.h)<1e-8);}}
 let svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+p.geometry.width+'mm" height="'+p.geometry.height+'mm" viewBox="0 0 '+p.geometry.width+' '+p.geometry.height+'">';
 for(const o of d.objects){if(o.type==='text'){const lines=o.text.split('\n'),leading=o.lineHeight||o.size*1.2,y=o.y+.35*o.size-(lines.length-1)*leading/2;svg+='<g id="'+o.id+'"><text x="'+o.x+'" y="'+y+'" text-anchor="middle" font-family="'+esc(o.font)+'" font-size="'+o.size+'" fill="#000000">'+lines.map((v,i)=>'<tspan x="'+o.x+'" dy="'+(i?leading:0)+'">'+esc(v)+'</tspan>').join('')+'</text></g>';}else{const m=c.localResources.motifs.find(m=>m.key===o.motif),b=m.bounds,k=o.w/b[2],dx=o.x-o.w/2-b[0]*k,dy=o.y-o.h/2-b[1]*k;svg+='<g id="'+o.id+'" fill="#000000">'+m.svgFragment.replace(/ d="([^"]+)"/g,(_,v)=>' d="'+transformEmbeddedPath(v,k,dx,dy)+'"').replace(/stroke-width="([^"]+)"/g,(_,v)=>'stroke-width="'+Number(v)*k+'"').replaceAll('currentColor','#000000')+'</g>';}}
 svg+='</svg>';
 const json=read(root+'/'+entry.path+'/design.json');json.layoutRevision={id:'20261029-fuller-v1',request:'Namen und Motive größer, weniger Leerraum und bessere Flächennutzung',model:'gpt-6.1-sol',sampleSetId:json.sampleData.setId,productionRelease:false};
 writes.push([root+'/'+entry.path+'/design.svg',svg],[root+'/'+entry.path+'/design.json',JSON.stringify(json,null,2)+'\n']);
 results.push({id:entry.id,layoutIssues:0,textChanges:d.objects.filter(o=>o.type==='text').map(o=>({id:o.id,beforeMm:before.find(x=>x.id===o.id).size,afterMm:o.size})),motifAspectRatiosPreserved:true});
}
for(const [file,data]of writes)fs.writeFileSync(file,data);
fs.writeFileSync(root+'/auftraege/2026-10-29-pferdeschilder-astra/technik/layout-pruefung.json',JSON.stringify({schema:'gravuru-layout-review/v1',variants:results.length,results},null,2)+'\n');
console.log(JSON.stringify({variants:results.length,layoutIssues:0}));
