import {createHash} from 'node:crypto';
import {aosuSpecimen,steelSpecimen} from './specimen-product.mjs';
import {makeProductDocument} from './product-model.mjs';

// Explicit maintenance action, never a startup migration. Source-derived keys
// make a interrupted/repeated import resume without replacing merchant edits.
export async function importSpecimens({repository,assets}){
 const results=[];
 for(const [key,factory] of [['aosu-labrador',aosuSpecimen],['steel-heimathafen',steelSpecimen]]){
  const config=await factory(assets);
  const put=(suffix,document)=>repository.importBatch([{key:'specimens-20261011:'+key+':'+suffix,fingerprint:createHash('sha256').update(JSON.stringify(document)).digest('hex'),document}])[0];
  const master=put('master',makeProductDocument(config,{kind:'master'}));
  const product=put('product',makeProductDocument(config,{kind:'product',masterId:master.id}));
  results.push({key,master,product});
 }
 return results;
}
