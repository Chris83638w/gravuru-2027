import fs from 'node:fs';
import {inspectFile,importFiles} from './catalog.mjs';
const file=process.argv[2];
try{
  let review=file.endsWith('.zip');
  if(file.endsWith('.json')){const doc=JSON.parse(fs.readFileSync(file,'utf8'));review=!doc.product || !Array.isArray(doc.designs);}
  process.send(review?{review:inspectFile(file)}:{pack:importFiles([file])});
}catch(e){process.send({error:e.message});}
