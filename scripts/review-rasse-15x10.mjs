// Local review fixture using the actual catalog converter and customer configurator.
// Never opens a database, imports to a server, approves a design or enables ordering.
// node scripts/review-rasse-schilder.mjs --katalog=../gravuru-katalog --out=../rasse-review
import fs from 'node:fs';
import {productPreview} from '../app/workshop/product-preview.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from '../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../app/configurator/variant-m/server.mjs';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {katalogDesignToTemplate,templateFit} from '../app/workshop/katalog-convert.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {prepareConfig} from '../app/configurator/variant-m/contract.mjs';

const arg=n=>process.argv.find(a=>a.startsWith('--'+n+'='))?.split('=').slice(1).join('=');
const katalog=path.resolve(arg('katalog')||'../gravuru-katalog'),out=path.resolve(arg('out')||'../rasse-review');
fs.mkdirSync(out,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const manifest=read(path.join(katalog,'auftraege/rasse-15x10-20261102/manifest.json'));
const family=read(path.join(katalog,'familien/edelstahl/steel-door-signs.json'));
const fontIndex=read(path.join(katalog,'schriften/schriften.json')).fonts;
const names=new Set(manifest.designs.flatMap(d=>read(path.join(katalog,d.folder,'design.json')).fonts));
const fonts={};
for(const name of names){
 const source=fontIndex.find(f=>f.name===name),file=path.join(katalog,source.file),bytes=fs.readFileSync(file),hash=createHash('sha256').update(bytes).digest('hex');
 const cache=path.join(out,'font-'+hash+'.json');
 const data=fs.existsSync(cache)?read(cache):await convertFont(bytes.toString('base64'));
 if(!data.font)throw Error('Font failed: '+name);if(!fs.existsSync(cache))fs.writeFileSync(cache,JSON.stringify(data));fonts[name]=data.font;
}
const built=build({outputDirectory:out}),seed=read(path.join(out,'models.json'))[0];
const entries=new Map(manifest.designs.map(d=>[d.id,d])),models=new Map(),report={kind:'local-native-configurator-review',built,fonts:[...names],designs:[],errors:[]};
function convert(entry){
 const meta=read(path.join(katalog,entry.folder,'design.json')),svg=fs.readFileSync(path.join(katalog,entry.folder,'design.svg'),'utf8');
 if(createHash('sha256').update(svg).digest('hex')!==entry.svgSha256)throw Error('Manifest checksum mismatch: '+entry.id);
 const converted=katalogDesignToTemplate(meta,family,null,{fonts,svgText:svg});
 const size=family.sizes.find(s=>s.key===entry.familySizeKey);
 if(!size||size.widthMm!==entry.plateMm[0]||size.heightMm!==entry.plateMm[1])throw Error('Size/source mismatch: '+entry.id);
 const fit=templateFit(converted.template,family,size,fonts,{motifs:converted.motifs});
 return {meta,converted,size,fit};
}
function model(id){
 if(models.has(id))return models.get(id);
 const entry=entries.get(id);if(!entry)throw Error('Review design not found');
 const {meta,converted,size}=convert(entry);
 let config=familyProductConfig(family,size,1,{previewOnly:true});
 const mounting=config.profile.optionGroups.find(g=>g.id==='mounting');if(mounting?.values.some(v=>v.id==='K00'))mounting.defaultValueId='K00';
 config.localResources={scope:'local-review-only',fonts,motifs:converted.motifs};
 config.profile.designs=[converted.template];config.profile.defaultDesignId=converted.template.id;
 config.profile.id=id;config.profile.name=meta.name;config.profile.features.orderEnabled=false;
 config.workshopElementRights={[converted.template.id]:converted.rights};
 config.workshopProfiles={selections:{fonts:null,motifs:null,colors:null,bestsellers:null},sources:{},settingsRevision:0};
 config=prepareConfig(config);
 const legacy=structuredClone(seed.legacy);legacy.designs=config.profile.designs;legacy.purchasing.basePriceCents=config.basePriceCents;legacy.purchasing.bellModel=meta.name;
 legacy.features={...legacy.features,orderEnabled:false,productionConfirmed:false};
 const result={key:'acryl',name:meta.name,legacy,universal:config};
 models.set(id,result);if(models.size>12)models.delete(models.keys().next().value);return result;
}
if(process.argv.includes('--export')){
 const previous=arg('changed-from')?new Map(read(arg('changed-from')).designs.map(e=>[e.id,e.svgSha256])):new Map();let count=0;
 for(const e of manifest.designs){const file=path.join(out,e.id+'.svg');if(previous.get(e.id)===e.svgSha256&&fs.existsSync(file))continue;fs.writeFileSync(file,productPreview(model(e.id),{keepout:false,designArea:false}));count++;}
 console.log('Exported '+count+' native product previews');
}else if(process.argv.includes('--validate')){
 for(const e of manifest.designs){
  try{const {converted,fit}=convert(e);const motives=converted.template.objects.filter(o=>o.type==='motif');
   if(!motives.every(o=>converted.rights[o.id].delete&&converted.rights[o.id].replace))throw Error('Motif rights missing');
   report.designs.push({id:e.id,svgSha256:e.svgSha256,motifSha256:e.motifSha256,fit,notes:converted.notes,texts:converted.template.objects.filter(o=>o.type==='text').length,motifs:motives.length});
  }catch(err){report.errors.push({id:e.id,message:err.message});}
 }
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({validated:report.designs.length,errors:report.errors.length,fitCounts:report.designs.reduce((o,d)=>(o[d.fit.status]=(o[d.fit.status]||0)+1,o),{})}));
 if(report.errors.length||report.designs.some(d=>d.fit.status==='passt nicht'))process.exitCode=1;
}else{
 const workshop={defaultId:manifest.designs[0].id,model,handle(_req,res){res.writeHead(404,{'Content-Type':'application/json'}).end(JSON.stringify({error:{message:'Lokaler Designprüfstand ohne gespeicherte Werkstattdaten.'}}));}};
 const server=createPreviewServer({workshop,outputDirectory:out});
 server.listen(Number(arg('port')||0),'127.0.0.1',()=>{
  const ready={url:'http://127.0.0.1:'+server.address().port,designs:manifest.designs,fonts:[...names]};
  fs.writeFileSync(path.join(out,'ready.json'),JSON.stringify(ready,null,2));console.log(ready.url);
 });
 process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
}
