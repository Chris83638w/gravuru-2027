import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {workshopResources} from '../app/workshop/catalog.mjs';
import {validateFamily,familyProductConfig} from '../app/workshop/product-families.mjs';
import {katalogDesignToTemplate,templateFit} from '../app/workshop/katalog-convert.mjs';
import {productPreview} from '../app/workshop/product-preview.mjs';
import {selectedProfile,variantCombinations,quote} from '../app/configurator/variant-m/contract.mjs';
const flag=process.argv.indexOf('--katalog');if(flag<0||!process.argv[flag+1])throw Error('Aufruf: node scripts/build-house-number-pilot-20261101.mjs --katalog <pfad>');
const catalog=path.resolve(process.argv[flag+1]),out=path.join(catalog,'auftraege/2026-11-01-hausnummern-pilot');
fs.mkdirSync(out,{recursive:true});
const fonts=workshopResources().fonts;
const families=['aa','as','ss'].map(k=>validateFamily(JSON.parse(fs.readFileSync(path.join(catalog,'familien/acryl/acryl-'+k+'-abstandshalter.json'),'utf8'))));
const ref='designs/bestand/hausnummern/Allgemein/Allgemein/HNRLED-A-D1';
const layouts=[
 {no:1,prefix:'HNRLED-A',name:'Hausnummer pur',mode:'Referenz',source:ref,fields:[{key:'hausnummer',label:'Hausnummer',text:'24',font:'Roboto Condensed',size:83,x:75,y:79,required:true}],note:'Bahnschrift → Roboto Condensed ausdrücklich erlaubt in Issue 45 Nachricht 10. Gesamtaufbau als Referenz erhalten; Schriftgröße für die bestehende 100-mm-Grenze der Laufzeit reduziert. Bogenkennungen außerhalb der Platte nicht als Kundenfelder übernommen.'},
 {no:100,prefix:'HN-A',name:'Hausnummer mit Straße',mode:'neu',source:'ohne Vorlage',fields:[{key:'hausnummer',label:'Hausnummer',text:'12a',font:'Oswald',size:63,x:75,y:64,required:true},{key:'strasse',label:'Straße',text:'Lindenstraße',font:'Raleway',size:8,x:75,y:83,required:false}],note:'Neuer typografischer Entwurf: dominante schmale Hausnummer, ruhige Straßenzeile. Keine neuen Motive.'},
 {no:101,prefix:'HN-A',name:'Hausnummer mit Familienname',mode:'neu',source:'ohne Vorlage',fields:[{key:'hausnummer',label:'Hausnummer',text:'8',font:'Cinzel',size:68,x:50,y:74,required:true},{key:'name',label:'Name',text:'Familie\nWagner',font:'Allura',size:12,x:106,y:45,required:false}],note:'Neuer typografischer Entwurf: Hausnummer links, geschwungener Familienname rechts. Keine neuen Motive.'}
];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const writeDesign=(file,content)=>{if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')!==content)throw Error('Bestehende Designfassung weicht ab; nicht überschrieben: '+file);fs.writeFileSync(file,content);};
const checks=[],entries=[],contact=[];
for(const [w,h]of [[150,100],[180,120]]){
 const scale=w/150,series='acryl-aa-re-'+w+'x'+h,folder=path.join(catalog,'designs',series),idx=[];
 for(const l of layouts){
  const id=l.prefix+'-'+w/10+'x'+h/10+'-D'+l.no,fields=l.fields.map(f=>({...f,size:f.size*scale,x:f.x*scale,y:f.y*scale}));
  const meta={id,name:l.name,themes:['hausnummern'],plateMm:[w,h],movable:true,fonts:[...new Set(fields.map(f=>f.font))],motifs:[],source:l.source,freigabe:null,ziele:families.map(f=>({familie:f.id,freigabe:null})),sizes:families.map(f=>f.sizes.find(s=>s.groupKey==='RE'&&s.widthMm===w&&s.heightMm===h).key),katalog:{key:series+'-D'+l.no,series,zielgruppe:'Allgemein',unterkategorie:'Hausnummern',themen:['hausnummern']},fields:Object.fromEntries(fields.map((f,i)=>['text-'+(i+1),{label:f.label,required:f.required}])),review:{mode:l.mode,note:l.note,status:'offen',preview:'Originaler Konfigurator-Renderer; Browser-Abnahme offen'},...(w===180?{varianteVon:l.prefix+'-15x10-D'+l.no,transfer:{from:l.prefix+'-15x10-D'+l.no,scale,offsetMm:[0,0],deviationPercent:0,decided:'2026-11-01',by:'Astra Mika; Pilot laut Issue 45'}}:{}),...(l.no===1?{masterSheet:{base:'HNRLED-A-18x12',key:'HNRLED-A-18x12-D1',plateMm:[180,120]},fontsOriginal:['Bahnschrift'],fontReplacement:{from:'Bahnschrift',to:'Roboto Condensed',source:'gravuru-2027 Issue 45 Nachricht 10'}}:{})};
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'mm" height="'+h+'mm" viewBox="0 0 '+w+' '+h+'">\n'+fields.map((f,i)=>'<g id="text-'+(i+1)+'" data-feld="'+f.key+'"><text data-feld="'+f.key+'" x="'+f.x+'" y="'+f.y+'" font-family="'+esc(f.font)+'" font-size="'+f.size+'" text-anchor="middle" fill="#000000">'+f.text.split('\n').map((line,j)=>'<tspan x="'+f.x+'" dy="'+(j?f.size*1.2:0)+'">'+esc(line)+'</tspan>').join('')+'</text></g>').join('\n')+'\n</svg>\n';
  const dir=path.join(folder,id);fs.mkdirSync(dir,{recursive:true});writeDesign(path.join(dir,'design.svg'),svg);writeDesign(path.join(dir,'design.json'),JSON.stringify(meta,null,2)+'\n');
  const master={...meta,json:meta,svg:()=>svg};
  for(const fam of families){
   const size=fam.sizes.find(s=>meta.sizes.includes(s.key)),converted=katalogDesignToTemplate(master,fam,{id:'hausnummern'},{fonts,svgText:svg});
   const fit=templateFit(converted.template,fam,size,fonts,{motifs:converted.motifs});
   if(fit.status!=='passt')throw Error(id+' '+fam.id+': '+JSON.stringify(fit));
   const config=familyProductConfig(fam,size,1);config.localResources={scope:'local-review-only',fonts:Object.fromEntries(meta.fonts.map(n=>[n,fonts[n]])),motifs:converted.motifs};config.profile.designs=[converted.template];config.profile.defaultDesignId=converted.template.id;config.extraMotifCents=169;
   const profile=selectedProfile(config),options=variantCombinations(config),prices=options.map(o=>quote(config,converted.template.objects,converted.template.id,o).unitCents);
   if(fam.id.includes('-ss-')&&(profile.backingPreview.geometry.width!==w+20||profile.backingPreview.geometry.height!==h+20))throw Error('Backing size mismatch');
   if(!profile.mountingPreview?.spacers||profile.mountingPreview.finish!=='silver'||profile.geometry.holes.length!==2)throw Error('Standard mounting mismatch');
   const rendered=productPreview({universal:config},{keepout:false,designArea:false});
   const file=id+'-'+fam.id;
   fs.writeFileSync(path.join(out,file+'.svg'),rendered);
   fs.writeFileSync(path.join(out,file+'.preview.json'),JSON.stringify({universal:config},null,2)+'\n');
   checks.push({id,family:fam.id,size:size.key,fit,engravingSide:profile.material.engravingSide,holes:profile.geometry.holes,defaultMounting:'AH02',defaultFinish:profile.mountingPreview.finish,backing:profile.backingPreview?{width:profile.backingPreview.geometry.width,height:profile.backingPreview.geometry.height,offsetMm:profile.backingPreview.offsetMm}:null,validCombinations:options.length,prices,fields:converted.template.objects.map(o=>({id:o.id,key:o.fieldKey,text:o.text,font:o.font,size:o.size,required:o.required})),notes:converted.notes,renderSha256:createHash('sha256').update(rendered).digest('hex'),preview:file+'.svg'});
   contact.push({id,family:fam.id,width:w,height:h,file:file+'.svg',mode:l.mode});
  }
  idx.push({key:id,name:l.name,pfad:id,quelle:l.source,plateMm:[w,h],themen:['hausnummern'],groessen:meta.sizes,texte:fields.length,motive:0,schriften:meta.fonts,modus:l.mode,freigabe:null});entries.push({id,series,path:'designs/'+series+'/'+id,mode:l.mode,source:l.source,note:l.note});
 }
 writeDesign(path.join(folder,'index.json'),JSON.stringify(idx,null,2)+'\n');
}
fs.writeFileSync(path.join(out,'pruefung.json'),JSON.stringify({date:'2026-11-01',masterCount:entries.length,targetCount:checks.length,browserAcceptance:false,matteHardwareImplemented:false,checks},null,2)+'\n');
fs.writeFileSync(path.join(out,'designliste.json'),JSON.stringify(entries,null,2)+'\n');
fs.writeFileSync(path.join(out,'kontaktbogen.json'),JSON.stringify(contact,null,2)+'\n');
console.log(JSON.stringify({designs:entries.length,targets:checks.length,passed:checks.filter(c=>c.fit.status==='passt').length,combinations:checks.reduce((n,c)=>n+c.validCombinations,0),out}));
