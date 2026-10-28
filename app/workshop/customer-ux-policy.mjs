import {validateProductDocument} from './product-model.mjs';
import {prepareConfig} from '../configurator/variant-m/contract.mjs';

// Chris, 28.10.2026. Applied only when preparing a new product revision.
// Never infer this policy while reading an existing order, draft or live product.
export function customerUxConfig(config){
 return prepareConfig({...structuredClone(config),textRules:{maxCharsPerLine:50},motifCharge:'all',extraMotifCents:169});
}
export function customerUxPlan(documents){
 const rows=documents.map((document,index)=>{
  try{const config=customerUxConfig(document.config);return {index,name:document.name,status:'ready',before:{textRules:document.config.textRules??null,motifCharge:document.config.motifCharge??'additional',extraMotifCents:document.config.extraMotifCents},after:{textRules:config.textRules,motifCharge:config.motifCharge,extraMotifCents:config.extraMotifCents},document:validateProductDocument({...structuredClone(document),config})};}
  catch(error){return {index,name:document?.name,status:'blocked',reason:error.message};}
 });
 return {schema:'gravuru-customer-ux-proposal/v1',decision:'2026-10-28',counts:{products:rows.length,ready:rows.filter(r=>r.status==='ready').length,blocked:rows.filter(r=>r.status==='blocked').length},rows};
}
