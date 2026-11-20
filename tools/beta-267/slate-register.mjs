import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {buildSlateFamilies,slateSizeKey} from '../../scripts/build-slate-families.mjs';
import {familyProductConfig} from '../../app/workshop/product-families.mjs';

export function loadSlateRegister(filename) {
  const bytes=fs.readFileSync(filename);
  const gitObject=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(gitObject!=='1ddec8c099fa770a120da11a18291d9c4fd18016')throw Error('Originalregister aus ff1ea99 erforderlich.');
  const source=JSON.parse(bytes);
  const families=buildSlateFamilies(source,['Montserrat'],{sha256:createHash('sha256').update(bytes).digest('hex')});
  function productFor(blank){
    const family=families.find(f=>f.id==='schiefer-tafeln-'+blank.familie);
    const size=family.sizes.find(s=>s.key===slateSizeKey(blank));
    const view={...family,sizes:[size],groups:family.groups.filter(g=>g.key===size.groupKey),mountingRules:family.mountingRules.filter(r=>size.mounting.includes(r.id))};
    return familyProductConfig(view,size,1);
  }
  return {gitObject,source,productFor};
}
