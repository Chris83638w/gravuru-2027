import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {buildSlateFamilies,slateSizeKey} from '../../scripts/build-slate-families.mjs';
import {familyProductConfig} from '../../app/workshop/product-families.mjs';
import {applySlateCustomerRules} from '../../app/workshop/slate-customer-rules.mjs';

const bytes=fs.readFileSync(process.argv[2]);
const gitObject=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
assert.equal(gitObject,'1ddec8c099fa770a120da11a18291d9c4fd18016','Originalregister aus ff1ea99 erforderlich');
const source=JSON.parse(bytes);
const families=buildSlateFamilies(source,['Montserrat'],{sha256:createHash('sha256').update(bytes).digest('hex')});
const stands=['staender-klar','staender-schwarz'];
const totals={plates:0,withBothStands:0,correctedLegacyAvailability:0,accessoryPricesChecked:0};
for(const blank of source.tafeln){
 const family=families.find(f=>f.id==='schiefer-tafeln-'+blank.familie);
 const size=family.sizes.find(s=>s.key===slateSizeKey(blank));
 const view={...family,sizes:[size],groups:family.groups.filter(g=>g.key===size.groupKey),mountingRules:family.mountingRules.filter(r=>size.mounting.includes(r.id))};
 const product=familyProductConfig(view,size,1);
 const fits=['Rechteck','Quadrat'].includes(blank.form)&&((blank.widthMm<=400 && blank.heightMm<=300)||(blank.widthMm<=300 && blank.heightMm<=400));
 const expected=stands.filter(id=>blank.optionen[id]&&fits);
 product.profile.themeId='gedenken';
 for(const projected of [product,applySlateCustomerRules(product)]){
  const fields=projected.profile.optionFields||[];
  assert.deepEqual(fields.filter(f=>stands.includes(f.id)).map(f=>f.id),expected,blank.id);
  for(const id of ['silikon',...expected]){
   if(!blank.optionen[id])continue;
   assert.equal(fields.find(f=>f.id===id)?.priceCents,source.optionen[id].preisCents,blank.id+' '+id);
   totals.accessoryPricesChecked++;
  }
 }
 totals.plates++;
 if(expected.length===2)totals.withBothStands++;
 if(stands.some(id=>blank.optionen[id]&&!fits))totals.correctedLegacyAvailability++;
}
console.log(JSON.stringify({...totals,sourceGitBlob:gitObject},null,2));
