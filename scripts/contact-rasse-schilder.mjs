// Contact sheets use unscaled native scene screenshots, with source motif alongside.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(process.env.GRAVURU_NODE_MODULES?path.join(process.env.GRAVURU_NODE_MODULES,'package.json'):import.meta.url),sharp=require('sharp');
const arg=n=>process.argv.find(a=>a.startsWith('--'+n+'='))?.split('=').slice(1).join('=');
const katalog=path.resolve(arg('katalog')||'../gravuru-katalog'),captures=path.resolve(arg('captures')||'../rasse-captures'),out=path.resolve(arg('out')||'../../outputs/kontaktboegen');
fs.mkdirSync(out,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),manifest=read(path.join(katalog,'auftraege/rasse-schilder-20261029/manifest.json'));
const records=read(path.join(captures,'screenshots.json')).results;
const groups=Map.groupBy(records,r=>r.breed+'-'+r.form+'-'+r.plateMm.join('x'));
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const svgLabel=(text,width,height,size=18)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/><text x="12" y="${size+8}" font-family="Arial" font-size="${size}" fill="#183b32">${escape(text)}</text></svg>`);
const catalog=[];
for(const [key,entries]of groups){
 if(entries.some(e=>e.error))throw Error('Missing screenshot: '+key);
 if(entries.length!==12)throw Error('Expected 12 designs for contact sheet: '+key);
 entries.sort((a,b)=>a.layout-b.layout);
 const meta=read(path.join(katalog,entries[0].folder,'design.json'));
 const portrait=await sharp(path.join(katalog,meta.source),{density:100}).resize(120,150,{fit:'contain',background:'#ffffff'}).png().toBuffer();
 const dims=await Promise.all(entries.map(e=>sharp(path.join(captures,e.file)).metadata()));
 const cw=Math.max(...dims.map(d=>d.width))+152,ch=Math.max(...dims.map(d=>d.height))+74,cols=3,rows=Math.ceil(entries.length/cols),width=cw*cols,height=rows*ch+114;
 const breed=meta.name.split(' · ')[0],form={OV:'Oval',RE:'Rechteck',AB:'Rechteck abgerundet'}[entries[0].form],title=breed+' · '+form+' · '+entries[0].plateMm.join(' × ')+' mm';
 const placements=[];
 const overlays=[{input:svgLabel(title,width,52,29),left:0,top:0},{input:svgLabel('12 Entwürfe · Konfigurator-Screenshots in Originalpixeln · Motivquelle jeweils links · Freigabe offen',width,44,19),left:0,top:54}];
 for(let i=0;i<entries.length;i++){
  const e=entries[i],m=read(path.join(katalog,e.folder,'design.json')),left=(i%cols)*cw,top=114+Math.floor(i/cols)*ch;
  overlays.push({input:svgLabel(String(e.layout).padStart(2,'0')+'  '+m.rasseReview.layoutName,cw,32,18),left,top});
  overlays.push({input:portrait,left:left+10,top:top+62});
  overlays.push({input:svgLabel('Motivquelle',135,30,13),left,top:top+220});
  overlays.push({input:fs.readFileSync(path.join(captures,e.file)),left:left+140,top:top+35});
  placements.push({id:e.id,svgSha256:e.svgSha256,screenshotSha256:e.sha256,rect:{left:left+140,top:top+35,width:dims[i].width,height:dims[i].height},pixelSha256:createHash('sha256').update(await sharp(path.join(captures,e.file)).removeAlpha().raw().toBuffer()).digest('hex')});
  overlays.push({input:svgLabel(e.id+' · '+m.fonts.join(' / '),cw,30,13),left,top:top+ch-30});
 }
 const file=key+'.png';await sharp({create:{width,height,channels:3,background:'#ffffff'}}).composite(overlays).png().toFile(path.join(out,file));
 for(const p of placements){const actual=createHash('sha256').update(await sharp(path.join(out,file)).extract(p.rect).removeAlpha().raw().toBuffer()).digest('hex');if(actual!==p.pixelSha256)throw Error('Screenshot pixels changed in contact sheet: '+p.id);}
 catalog.push({breed,form,size:entries[0].plateMm,title,file,count:entries.length,placements});
}
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(catalog,null,2));
console.log(JSON.stringify({sheets:catalog.length,designs:records.length,out}));
