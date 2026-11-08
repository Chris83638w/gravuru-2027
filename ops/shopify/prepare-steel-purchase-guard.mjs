// Local candidate only. No Shopify/server/DB calls. The CLI accepts only the
// reviewed PR198 candidate and exact exported MAIN-theme source bytes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const STEEL_PRODUCT='16190784438652';
export const STEEL_PROFILE='katalog-formate-edelstahl-tuerschilder-familienschilder-eb5fe26624befe4a';
export const GUARD_BASE_SHA='42ab2208695ba263e687cc80cd5a38e06f9241e4eb5bb3a533c833fbbd8f85d0';
export const GUARD_SOURCE_MARKUP={
 'main-product-before.liquid':'ae06f843f82979cb99ac0ccd9b3651122cbb8947948dc2f2f260464e7fb1023d',
 'buy-buttons-before.liquid':'adf798f8c2baf4f70dbd9ffa546d35aceabca6d1a24fba1f787e80f9b52e04e0',
 'sticky-atc-bar-before.liquid':'abe8ae7bf7619cda2b77745476674e90a2863031b52638c463a43de215973958',
 'product-information-blocks-before.liquid':'d7ec7ca5a341a322648102ae6d50da9577549566eccc0f5c73cdec166906918b',
};
const main=`[id="MainProduct-{{ section.id }}"][data-product-id="${STEEL_PRODUCT}"] .product__block--buy_buttons`;
const sticky=tag=>`${tag}[data-product-id="${STEEL_PRODUCT}"][data-section="{{ section.id }}"]`;
export const STEEL_GUARD_SELECTORS=[
 `${main} button[name="add"]`,`${main} .shopify-payment-button`,
 `${sticky('sticky-atc-bar-minimalist')} button[name="add"]`,`${sticky('sticky-atc-bar-minimalist')} .shopify-payment-button`,
 `${sticky('sticky-atc-bar')} button[name="add"]`,`${sticky('sticky-atc-bar')} .shopify-payment-button`,
];
export const STEEL_PURCHASE_GUARD=`<style id="gravuru-steel-config-required-{{ section.id }}">${STEEL_GUARD_SELECTORS.join(',\n')}{display:none!important}</style>`;
const gate=`{%- if product.id == ${STEEL_PRODUCT} and gv_konfi_id == '${STEEL_PROFILE}' -%}`;
const marker='<script type="application/json" id="gravuru-konfi-presentation">';
export function prepareSteelPurchaseGuard(before){
 const header=before.match(/^\s*\/\*[\s\S]*?\*\/\s*/)?.[0]||'',theme=JSON.parse(before.slice(header.length));
 const setting=theme.sections?.main?.blocks?.custom_liquid_mTPWzc?.settings,original=setting?.custom_liquid;
 if(typeof original!=='string'||original.includes('gravuru-steel-config-required')||original.split(marker).length!==2||original.split(gate).length!==2)throw Error('Reviewed steel opt-in block missing or ambiguous.');
 const gateAt=original.indexOf(gate),markerAt=original.indexOf(marker);
 if(gateAt>=markerAt||original.slice(gateAt+gate.length,markerAt).includes('endif'))throw Error('Presentation marker is not inside the exact product/profile gate.');
 const liquid=original.replace(marker,STEEL_PURCHASE_GUARD+marker);setting.custom_liquid=liquid;
 const text=header+JSON.stringify(theme,null,2)+'\n';
 return {text,liquid,patch:{schema:'gravuru-theme-string-insert/v1',sourceThemeSha256:sha(before),jsonPath:'/sections/main/blocks/custom_liquid_mTPWzc/settings/custom_liquid',insertBefore:marker,value:STEEL_PURCHASE_GUARD},
  manifest:{schema:'gravuru-steel-buy-control-guard/v1',productId:STEEL_PRODUCT,customizationId:STEEL_PROFILE,sourceThemeSha256:sha(before),candidateThemeSha256:sha(text),sourceMarkupSha256:GUARD_SOURCE_MARKUP,
   changedJsonPaths:['/sections/main/blocks/custom_liquid_mTPWzc/settings/custom_liquid'],selectors:STEEL_GUARD_SELECTORS,styleRenderedOnlyInsideProductProfileGate:true,worksWithoutShopEmbedJavaScript:true,
   configuratorLinkUnchanged:true,pricesVariantsAndProductDataUnchanged:true,externalWrites:false,
   limits:['This hides normal purchase controls; it is not an API/checkout security boundary.','CartTransform/blockOnFailure remains the existing independent checkout gate.','Theme initial price still follows its selected variant; use explicit AB12x8 variant URL until separately synchronized.']}};
}
export function run(argv){
 const arg=name=>argv[argv.indexOf('--'+name)+1];
 if(!['theme','markup-root','out'].every(name=>argv.includes('--'+name)&&arg(name)&&!arg(name).startsWith('--')))throw Error('Usage: --theme PR198-candidate.json --markup-root verified-export-dir --out local-output-dir');
 const before=fs.readFileSync(arg('theme'),'utf8');
 if(sha(before)!==GUARD_BASE_SHA)throw Error('Pinned PR198 candidate changed; review before preparing.');
 for(const [filename,hash] of Object.entries(GUARD_SOURCE_MARKUP))if(sha(fs.readFileSync(path.join(arg('markup-root'),filename)))!==hash)throw Error('Actual theme markup changed: '+filename);
 const result=prepareSteelPurchaseGuard(before),out=arg('out');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'product.konfi.candidate.json'),result.text);
 fs.writeFileSync(path.join(out,'custom-liquid.candidate.liquid'),result.liquid+'\n');
 fs.writeFileSync(path.join(out,'patch.json'),JSON.stringify(result.patch,null,2)+'\n');
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(result.manifest,null,2)+'\n');
 return result.manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(run(process.argv.slice(2)),null,2));
