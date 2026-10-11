// Synthetic paint samples; no customer files or persistent database.
import fs from 'node:fs';
import {createDesignAssetStore} from '../../app/workshop/design-assets.mjs';
import {studioSvg} from '../../app/platform/sources/app/shared/models/studio-svg.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),assets=createDesignAssetStore({filename:':memory:'});
try{
 const out={};
 for(const [key,source] of Object.entries(input)){
  const bytes=Buffer.from(source,'base64'),asset=await assets.import({name:key.endsWith('pdf')?'Sample.pdf':'Sample.svg',bytes:source}),resource=assets.resource(asset.assetId);
  if(!assets.read(asset.assetId,true).equals(bytes))throw Error('Original changed');
  const profile={kind:'universal-product',geometry:{width:100,height:60,shape:'rect',holes:[]},material:{kind:'steel',color:'#ffffff'},processing:{profileId:'steel-engraving'}};
  const design={id:'sample',name:key,objects:[{id:'sample',type:'motif',motif:resource.key,x:50,y:30,w:100,h:60,rotation:0,preserveColors:true}]};
  const render=()=>studioSvg(profile,design,{}, {motifs:[resource],handles:false}).replace(/href="\/api\/workshop\/design-assets\/[a-f0-9]+\/preview.svg"/g,'href="data:image/svg+xml;base64,'+assets.read(asset.assetId).toString('base64')+'"');
  out[key]={svg:render(),vectorOnly:resource.vectorOnly};
  profile.processing.profileId='color-print';out[key+'-print']={svg:render()};
 }
 fs.writeFileSync(process.argv[3],JSON.stringify(out));
}finally{assets.close();}
