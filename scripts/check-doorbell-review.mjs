// Read-only real-catalogue production smoke check. Hydrated font paths are test-only.
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {workshopResources} from '../app/workshop/catalog.mjs';
import {selectedProfile} from '../app/configurator/variant-m/contract.mjs';
import {prepareAcrylicReview} from '../app/workshop/acrylic-review.mjs';
import {createAcrylicEngravingProof} from '../app/workshop/acrylic-engraving-proof.mjs';
import {readReviewPackage,digest} from '../app/workshop/review-package.mjs';
const directory=process.argv[2],model=process.argv[3]||'aosu-pro-v8p1ax11-16x28';
if(!directory)throw Error('Import-Prüfordner angeben.');
const document=JSON.parse(fs.readFileSync(path.join(directory,'documents',model+'--16x28.json'),'utf8'));
const db=new DatabaseSync(path.join(directory,'validation-assets.sqlite'),{readOnly:true});
const fonts=workshopResources().fonts;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==','base64');
let count=0;
try{
 for(const format of document.config.doorbell.formats)for(const position of ['standard','opposite']){
  const config=structuredClone(document.config),options={format:format.key,frame:'FK-RUNDUM',color:'schwarz',mounting:'B04S',position};
  const selected=selectedProfile(config,options),design=selected.designs[0];
  for(const o of design.objects)if(o.type==='text'){if(!fonts[o.font])throw Error('Schrift fehlt: '+o.font);config.localResources.fonts[o.font]=fonts[o.font];}
  const meta=new Map(config.localResources.motifs.filter(m=>m.artwork).map(m=>[m.artwork.assetId,m.artwork]));
  const assets={get:id=>meta.get(id),read:(id,original=false)=>original?Buffer.from(db.prepare('SELECT bytes FROM design_sources WHERE sha256=?').get(meta.get(id).sourceSha256).bytes):fs.readFileSync(path.join(directory,'assets',id+'.svg'))};
  const record={id:config.profile.id,revision:1,document};
  const input={productId:record.id,productRevision:1,designId:design.id,objects:structuredClone(design.objects),options,quantity:1,media:[],preview:png.toString('base64')};
  const bundle=await prepareAcrylicReview({record,config,input,assets,preparePhoto:async()=>({original:png,preview:png,width:40,height:60})});
  const proof=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'vector'});
  const output=readReviewPackage(proof.archive,digest(proof.archive),['gravuru-native-review/v1']).files;
  for(const name of ['edelstahltraeger-schnitt-1zu1.pdf','acrylauflage-schnitt-1zu1.pdf','gesicherte-gravurgestaltung.svg'])if(!output.has(name))throw Error('Ausgabe fehlt: '+name);
  if(proof.metadata.productionReady!==false||proof.metadata.layered.cutMirror!==false)throw Error('Unbelegte Freigabe oder gespiegelte Schnittlage.');
  count++;
 }
}finally{db.close();}
console.log(JSON.stringify({model,realFormats:document.config.doorbell.formats.length,positions:2,vectorEngravingPackages:count,passed:true}));

