// Review the actual vector motifs independently of their sign compositions.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(process.env.GRAVURU_NODE_MODULES?path.join(process.env.GRAVURU_NODE_MODULES,'package.json'):import.meta.url),sharp=require('sharp');
const arg=n=>process.argv.find(a=>a.startsWith('--'+n+'='))?.split('=').slice(1).join('=');
const katalog=path.resolve(arg('katalog')||'../gravuru-katalog'),out=path.resolve(arg('out')||'../../outputs/katzen-motive');
const partial=process.argv.includes('--partial'),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const order=path.join(katalog,'auftraege/rasse-schilder-20261029'),base=path.join(katalog,'motive-eigene/rasse-schilder-20261029');
const manifest=read(path.join(order,'manifest.json'));
const sources=[...read(path.join(base,'herkunft.json')).map(p=>({...p,variant:1})),...read(path.join(base,'varianten/herkunft.json'))];
const names=['Originalporträt','Dreiviertelblick links','Dreiviertelblick rechts','Linke Kopfansicht','Rechte Kopfansicht','Geneigter Kopf','Blick nach oben','Gesicht und Pfote','Sitzende Katze','Liegende Katze','Verspielte Pfoten','Zwei Katzenköpfe'];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const label=(text,width,height,size)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/><text x="18" y="${size+10}" font-family="Arial" font-size="${size}" fill="#203d34">${esc(text)}</text></svg>`);
fs.mkdirSync(out,{recursive:true});
const index=[];
for(const breed of manifest.breeds.filter(b=>b.animal==='cat')){
 const motifs=sources.filter(p=>p.breed===breed.breed).sort((a,b)=>a.variant-b.variant);
 if(motifs.length!==12){if(partial)continue;throw Error(breed.breed+': twelve motifs required');}
 if(new Set(motifs.map(p=>p.svgSha256)).size!==12)throw Error(breed.breed+': repeated motif');
 const width=1600,height=1410,overlays=[{input:label(breed.name+' · zwölf eigenständige Motive',width,65,34),left:0,top:0},{input:label('Originalzeichnungen als Vektor · Entwürfe zur Stil- und Gravurprüfung',width,45,19),left:0,top:65}];
 for(let i=0;i<motifs.length;i++){
  const p=motifs[i],left=i%4*400,top=120+Math.floor(i/4)*425;
  const rendered=await sharp(path.join(katalog,p.file),{density:150}).resize(360,350,{fit:'contain',background:'#ffffff'}).flatten({background:'#ffffff'}).png().toBuffer();
  overlays.push({input:rendered,left:left+20,top});
  overlays.push({input:label(String(p.variant).padStart(2,'0')+' · '+names[p.variant-1],400,50,18),left,top:top+360});
 }
 const file=breed.breed+'.png';await sharp({create:{width,height,channels:3,background:'#ffffff'}}).composite(overlays).png().toFile(path.join(out,file));
 index.push({breed:breed.breed,name:breed.name,file,motifs:motifs.map(p=>({variant:p.variant,file:p.file,sha256:p.svgSha256,sourceFile:p.sourceFile}))});
}
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(index,null,2));
const data=JSON.stringify(index.map(({breed,name,file})=>({breed,name,file}))).replaceAll('</','<\\/');
const html=`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>gravuru · Verschiedene Katzenmotive</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f3ee;color:#203d34;font:16px/1.5 system-ui,sans-serif}main{max-width:1450px;margin:auto;padding:24px}h1{font-size:clamp(27px,4vw,43px);line-height:1.1}p{max-width:850px}.bar{display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin:25px 0}select{font:inherit;padding:10px;min-width:240px;border:1px solid #a9b7ac;border-radius:7px;background:white;color:#203d34}img{width:100%;height:auto;background:white;border:1px solid #dfe5dc;border-radius:10px}a{color:inherit}.status{background:#e6eddf;padding:6px 12px;border-radius:20px;font-size:14px}</style><main><h1>Zwölf Motive. Zwölf eigene Gesichter.</h1><p>Jede Katzenrasse bekommt eine eigenständige Serie mit verschiedenen Gesichtern, Kopfansichten und Posen. Hier siehst du die gezeichneten und vektorisierten Motive vor dem Einsetzen in die Schilder.</p><span class="status">${partial?'Zwischenstand: ':''}${index.length} von 25 Rassen vollständig · ${index.length*12} Motive</span><div class="bar"><label>Rasse <select id="breed"></select></label><a id="full" target="_blank">Bild in voller Größe</a></div><a id="picture" target="_blank"><img id="sheet" alt="Zwölf verschiedene Katzenmotive"></a><p>Entwürfe zur Stilprüfung. Eine tatsächliche Gravurprobe und die Fertigungsfreigabe stehen aus.</p></main><script>const items=${data};const breed=document.getElementById('breed');for(const x of items)breed.add(new Option(x.name,x.breed));function show(){const x=items.find(x=>x.breed===breed.value);if(!x)return;document.getElementById('sheet').src=x.file;document.getElementById('full').href=x.file;document.getElementById('picture').href=x.file;history.replaceState(null,'','#'+x.breed);}if(items.some(x=>x.breed===location.hash.slice(1)))breed.value=location.hash.slice(1);breed.onchange=show;show();</script></html>`;
fs.writeFileSync(path.join(out,'index.html'),html);
console.log(JSON.stringify({completeBreeds:index.length,motifs:index.length*12,out}));
