import assert from 'node:assert/strict';
import {applySlateCustomerRules} from '../../app/workshop/slate-customer-rules.mjs';
import {loadSlateRegister} from './slate-register.mjs';

const {gitObject,source,productFor}=loadSlateRegister(process.argv[2]);
const stands=['staender-klar','staender-schwarz'];
const totals={plates:0,withBothStands:0,correctedLegacyAvailability:0,accessoryPricesChecked:0};
for(const blank of source.tafeln){
 const product=productFor(blank);
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
