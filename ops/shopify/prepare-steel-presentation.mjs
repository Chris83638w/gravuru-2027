// Local candidate only. Never contacts Shopify or the running server.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function prepareSteelPresentation(before,plan){
 const header=before.match(/^\s*\/\*[\s\S]*?\*\/\s*/)?.[0]||'',theme=JSON.parse(before.slice(header.length));
 const block=theme.sections?.main?.blocks?.custom_liquid_mTPWzc,original=block?.settings?.custom_liquid;
 const target=plan?.existingTarget,readback=plan?.nativeUpdate?.shopReadback,config=plan?.nativeUpdate?.document?.config;
 if(target?.shopifyProductId!=='16190784438652'||readback?.productId!=='gid://shopify/Product/'+target.shopifyProductId||!Array.isArray(readback.variants)||readback.variants.length!==404)throw Error('Expected the reviewed existing steel product and all404 variants.');
 const variants=readback.variants.map(row=>String(row.shopifyVariantId).replace(/^gid:\/\/shopify\/ProductVariant\//,''));
 if(variants.some(id=>!/^\d{1,20}$/.test(id))||new Set(variants).size!==404)throw Error('Variant identity list is incomplete or duplicated.');
 const start=readback.variants.find(row=>row.options?.size===plan.start.sizeKey&&row.options?.mounting===plan.start.mounting),startId=String(start?.shopifyVariantId||'').split('/').at(-1);
 if(startId!=='58104606556540'||plan.start.nativeDesignId!=='katalog-TAE-V2A-8x5-D1'||config?.profile?.id!=='katalog-formate-edelstahl-tuerschilder-familienschilder-eb5fe26624befe4a')throw Error('The approved main-image start has changed.');
 if(typeof original!=='string'||original.includes('gravuru-konfi-presentation')||!original.includes('{%- assign gv_back = product.url | split: \'?\' | first -%}')||(original.match(/\{\{ gv_variant.id \}\}/g)||[]).length!==2)throw Error('Theme source changed: review the current start block.');
 const marker='{%- assign gv_back = product.url | split: \'?\' | first -%}';
 const setup="{%- assign gv_start_variant_id = gv_variant.id -%}{%- assign gv_prio_ui = '' -%}"+
 "{%- if product.id == "+target.shopifyProductId+" and gv_konfi_id == '"+config.profile.id+"' -%}"+
 "{%- assign gv_prio_ui = 'prio-r15' -%}{%- assign gv_start_variant_id = product.selected_variant.id | default: "+startId+" -%}"+
 '<script type="application/json" id="gravuru-konfi-presentation">'+
 '{"schema":"gravuru-shop-presentation/v1","productId":"'+target.shopifyProductId+'","ui":"prio-r15","variantId":"{{ gv_start_variant_id }}","themeVariantId":"{{ gv_variant.id }}","back":{{ gv_back | json }},"variants":'+JSON.stringify(variants)+'}</script>{%- endif -%}';
 let liquid=original.replaceAll('{{ gv_variant.id }}','{{ gv_start_variant_id }}').replace(marker,marker+setup);
 const back='&amp;back={{ gv_back | url_encode }}"';
 if(!liquid.includes(back))throw Error('Expected the existing back link.');
 liquid=liquid.replace(back,'&amp;back={{ gv_back | url_encode }}{% if gv_prio_ui == \'prio-r15\' %}&amp;ui=prio-r15{% endif %}"');
 const oldImport="if(/[?&]fenster=1(&|$)/.test(location.search))import('/apps/konfigurator/shop-embed.mjs');";
 if(!liquid.includes(oldImport))throw Error('Theme embed initialization changed.');
 liquid=liquid.replace(oldImport,"{% if gv_prio_ui == 'prio-r15' %}import('/apps/konfigurator/shop-embed.mjs');{% else %}"+oldImport+'{% endif %}');
 block.settings.custom_liquid=liquid;
 return {text:header+JSON.stringify(theme,null,2)+'\n',liquid,manifest:{schema:'gravuru-steel-presentation-candidate/v1',productId:target.shopifyProductId,startVariantId:startId,variantCount:variants.length,variantIdsSha256:hash(JSON.stringify(variants)),sourceThemeSha256:hash(before),sourcePlanStart:plan.start,changedJsonPaths:['/sections/main/blocks/custom_liquid_mTPWzc/settings/custom_liquid'],shopWrites:false,serverWrites:false}};
}
export function run(argv){
 const arg=name=>argv[argv.indexOf('--'+name)+1],before=arg('theme'),plan=arg('plan'),out=arg('out');
 if(!argv.includes('--theme')||!argv.includes('--plan')||!argv.includes('--out'))throw Error('Usage: --theme current-theme.json --plan native-plan.json --out local-output-dir');
 const source=fs.readFileSync(before,'utf8'),planBytes=fs.readFileSync(plan),result=prepareSteelPresentation(source,JSON.parse(planBytes));
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'product.konfi.candidate.json'),result.text);fs.writeFileSync(path.join(out,'custom-liquid.candidate.liquid'),result.liquid+'\n');
 result.manifest.sourcePlanSha256=hash(planBytes);result.manifest.candidateThemeSha256=hash(result.text);fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(result.manifest,null,2)+'\n');return result.manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(run(process.argv.slice(2)),null,2));
