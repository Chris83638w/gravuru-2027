// Local browser evidence only: original catalogue geometry, in-memory products, no live or commit operation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from '../app/configurator/variant-m/build.mjs';
import {createWorkshop} from '../app/workshop/http.mjs';
import {createPreviewServer} from '../app/configurator/variant-m/server.mjs';
import {familyProductConfig,validateFamily} from '../app/workshop/product-families.mjs';
import {makeProductDocument,validateProductDocument} from '../app/workshop/product-model.mjs';
import {workshopResources} from '../app/workshop/catalog.mjs';
import {katalogDesignToTemplate,scaleTemplate,scaleEmbeddedMotifs} from '../app/workshop/katalog-convert.mjs';
const codeDirectory=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2);
if(args.includes('--help')){console.log('node scripts/preview-retro-contours.mjs --katalog <Katalogordner> [--output <Prüfordner>]');process.exit(0);}
let katalog=null,directory=path.join(codeDirectory,'.preview','retro-contours');
for(let i=0;i<args.length;i++){if(args[i]==='--katalog'&&args[i+1])katalog=path.resolve(args[++i]);else if(args[i]==='--output'&&args[i+1])directory=path.resolve(args[++i]);else throw Error('Unbekanntes oder unvollständiges Argument: '+args[i]);}
if(!katalog)throw Error('--katalog muss auf den geprüften Katalogstand zeigen.');
const outputDirectory=path.join(directory,'build');
fs.mkdirSync(directory,{recursive:true});
const familyFile=path.join(katalog,'familien/edelstahl/steel-door-signs.json'),raw=fs.readFileSync(familyFile),family=validateFamily(JSON.parse(raw));
const built=build({outputDirectory}),seed=JSON.parse(fs.readFileSync(path.join(outputDirectory,'models.json')))[0];
const samples=JSON.parse(fs.readFileSync(path.join(codeDirectory,'app/workshop/test-fixtures/retro-designs.json'))).samples;
const fonts={...workshopResources().fonts,...JSON.parse(fs.readFileSync(path.join(codeDirectory,'app/designs/aosu-labrador/assets/michroma-vectors.json')))};
const workshop=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy}),products=[];
for(const shape of ['RT1','RT2']){
 const key='GR-ES-'+shape+'-90X60-T15',size=family.sizes.find(s=>s.key===key);
 if(!size||size.baseCents!==1499)throw Error('Originalgröße/Preis fehlt: '+key);
 const view={...family,groups:family.groups.filter(g=>g.key===size.groupKey),sizes:[size],mountingRules:family.mountingRules.filter(r=>size.mounting.includes(r.id))};
 const config=familyProductConfig(view,size,1);
 const sample=samples.find(s=>s.json.id.startsWith(shape==='RT1'?'TR1-':'TR2-'));
 const source={id:sample.json.id,name:sample.json.name,source:'lieferform2',plateMm:sample.json.plateMm,json:sample.json,themes:sample.json.themes,svg:()=>sample.svg};
 const converted=katalogDesignToTemplate(source,view,null,{fonts}),template=scaleTemplate(converted.template,source.plateMm,[size.widthMm,size.heightMm],fonts,{contain:true});
 config.profile.designs=[template];config.profile.defaultDesignId=template.id;
 config.localResources.fonts=Object.fromEntries([...new Set(template.objects.filter(o=>o.type==='text').map(o=>o.font))].map(name=>[name,fonts[name]]));
 config.localResources.motifs=scaleEmbeddedMotifs(converted.motifs,template.katalog.scale,template.katalog.offsetMm);
 const document=makeProductDocument(config,{name:family.name+' – '+shape+' 9 × 6 cm · D1-Browsertest',kind:'product'});
 document.elementRights[template.id]=converted.rights;
 const record=workshop.repository.create(validateProductDocument(document));
 products.push({shape,id:record.id,revision:record.revision,sizeKey:key,baseCents:size.baseCents,geometry:config.profile.geometry,options:config.profile.optionGroups,template:config.profile.designs[0],note:'Original D1 template; source geometry/prices unchanged.'});
}
const server=createPreviewServer({workshop,outputDirectory});
server.listen(0,'127.0.0.1',()=>{
 const url='http://127.0.0.1:'+server.address().port;
 const ready={url,pid:process.pid,database:':memory:',familySha256:createHash('sha256').update(raw).digest('hex'),products:products.map(p=>({...p,url:url+'/?configuration='+p.id+'&revision='+p.revision})),built};
 fs.writeFileSync(path.join(directory,'ready.json'),JSON.stringify(ready,null,2)+'\n');
 console.log(JSON.stringify(ready,null,2));
});
server.on('error',error=>{console.error(error);workshop.close();process.exitCode=1;});
const close=()=>server.close(()=>{workshop.close();process.exit(0);});process.on('SIGTERM',close);process.on('SIGINT',close);
