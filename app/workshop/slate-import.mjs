import {createHash} from 'node:crypto';
import {makeProductDocument} from './product-model.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'slate_import'});};

// Administrative migration of an explicitly captured, immutable legacy source.
// Reuses the workshop's validated repository/import journal and private asset DB.
// It never edits an existing product, publishes a revision or contacts Shopify.
export async function importNativeSlate(workshop,{sourceBytes,sourceSha256,surfaceBytes}){
 if(!Buffer.isBuffer(sourceBytes)||sourceBytes.length>2*1024*1024||
    !/^[a-f0-9]{64}$/.test(sourceSha256||'')||hash(sourceBytes)!==sourceSha256)fail('Die bestätigte Quellprüfsumme stimmt nicht überein.');
 let config;try{config=JSON.parse(sourceBytes);}catch{fail('Die native Produktquelle ist kein gültiges JSON.');}
 const source=config.workbench;
 if(config.profile?.material?.kind!=='slate'||!source||!/^P-[a-f0-9-]{36}$/.test(source.productId)||
    !Number.isSafeInteger(source.revision)||source.revision<1||config.profile.id!==source.productId||
    config.profile.binding?.productId!==source.productId||config.profile.revision!==String(source.revision))fail('Die ursprüngliche Produktkennung und Revision sind nicht eindeutig.');
 let document=makeProductDocument(config);
 const expected=config.materialSurface?.match(/^\/api\/product-workbench\/assets\/([a-f0-9]{64})\.(png|jpg|webp)$/);
 if(config.materialSurface&&(!expected||!Buffer.isBuffer(surfaceBytes)||hash(surfaceBytes)!==expected[1]))fail('Die byteidentische Original-Materialoberfläche fehlt.');
 if(!config.materialSurface&&surfaceBytes)fail('Die Quelle enthält keine Zuordnung zu diesem Materialbild.');
 const fingerprint=hash(JSON.stringify({recipe:'native-slate-import/v1',sourceSha256,surfaceSha256:expected?.[1]||null}));
 const key='native-slate:'+source.productId+':'+source.revision,prior=workshop.repository.importItem(key);
 if(prior){
  if(prior.fingerprint!==fingerprint)fail('Diese Quellrevision wurde bereits mit anderen Inhalten übernommen.');
  return {id:prior.id,created:false,sourceSha256,sourceRevision:source.revision,published:false};
 }
 if(expected){const surface=await workshop.assets.importMaterialSurface(surfaceBytes.toString('base64'));document.config.materialSurface=surface.url;}
 const [result]=workshop.repository.importBatch([{key,fingerprint,document}]);
 return {...result,sourceSha256,sourceRevision:source.revision,published:false};
}
