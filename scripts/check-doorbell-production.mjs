// Read-only catalogue audit; synthetic unit tests remain separate.
import fs from 'node:fs';
import path from 'node:path';
import {doorbellSeparations,closedDoorbellCut} from '../app/workshop/doorbell-artwork.mjs';
import {contourPathBounds} from '../app/workshop/contour-path.mjs';
const directory=process.argv[2];
if(!directory)throw Error('Pfad zu den nativen Funkklingel-Eingaben angeben.');
let models=0,formats=0,selections=0;const errors=[];
for(const file of fs.readdirSync(directory).filter(f=>f.endsWith('.json')).sort()){
 const config=JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));models++;
 // Migration inputs keep choices at their root; native runtime documents nest
 // the same choices under profile. This adapter does not modify source geometry.
 if(config.optionGroups)config.profile={...config.profile,optionGroups:config.optionGroups.map(group=>({...group,defaultValueId:group.defaultValueId??group.defaultValue??group.values?.[0]?.id})),optionFields:config.optionFields??[]};
 for(const format of config.doorbell.formats){formats++;
  for(const frame of format.profile.frames)for(const position of ['standard','opposite'])for(const mounting of format.profile.mounting.options){
   const options={format:format.key,frame:frame.key,position,mounting:mounting.key,color:'schwarz'};
   try{
    const result=doorbellSeparations(config,options),source=format.profile.geometry,bell=source.bell;
    if(result.stock.width!==source.width||result.stock.height!==source.height)throw Error('Plattenmaß verändert.');
    const dx=position==='opposite'?source.width-2*bell.x-bell.width:0,dy=position==='opposite'?source.height-2*bell.y-bell.height:0;
    const paths=result.steel.paths.filter(p=>p.role==='device-cut');
    if(paths.length!==source.cutPaths.length)throw Error('Geräteausschnittanzahl verändert.');
    for(let i=0;i<paths.length;i++){
     const a=contourPathBounds(closedDoorbellCut(source.cutPaths[i])),b=contourPathBounds(closedDoorbellCut(paths[i].d)),expected=[a[0]+dx,a[1]+dy,a[2],a[3]];
     if(b.some((n,j)=>Math.abs(n-expected[j])>.000001))throw Error('Geräteausschnitt gedreht, gespiegelt oder skaliert.');
    }
    if(result.steel.paths.some(p=>p.role==='outer')||/<image|<text|#0000ff/i.test(result.steel.svg+result.acrylic.svg))throw Error('Referenz-/Bilddaten in Schnittausgabe.');
    if(result.productionReady!==false)throw Error('Unbelegte Maschinenfreigabe.');
    selections++;
   }catch(e){errors.push({file,options,error:e.message});}
  }
 }
}
console.log(JSON.stringify({models,formats,selections,expectedSelections:formats*4*2*5,errorCount:errors.length,errors:errors.slice(0,20)},null,2));
process.exitCode=errors.length?1:0;
