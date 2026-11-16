// The 48 source-bound native plans supply every variant price. No shop writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SLATE_COMMIT} from './build-slate-families.mjs';
const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n/100);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// Same suffix convention for the generic plates and explicitly mapped main products.
export const slateVariantSku=(base,options)=>base+(options.mounting==='K00'?'':'-'+Object.values(options).join('-').toUpperCase());
export function slateDraftInput(p){
 if(p.sourceCommit!==SLATE_COMMIT||!p.family.startsWith('schiefer-tafeln-')||p.handle!=='schiefer-2027-'+p.sizeKey.toLowerCase()||!p.variants.length||p.variants.some(v=>!Number.isSafeInteger(v.priceCents)||v.priceCents<0))throw Error('Unbestätigter Schiefer-Entwurfsplan.');
 return {title:p.title,handle:p.handle,status:'DRAFT',vendor:'Gravuru',productType:'Schiefertafel',tags:['gravuru-schiefer-2027',p.family,p.sizeKey,'quelle-ff1ea99ef'],
  descriptionHtml:`<p>${esc(p.title)} – individuell gestalten und gravieren lassen.</p><p>${p.photoDesignCents===undefined?'Diese Tafel ist für Gestaltungen ohne Foto vorgesehen.':`Gestaltung ohne Fotofeld ab ${money(p.baseCents)}. Fotodesign ab ${money(p.photoDesignCents)}, das erste Foto ist enthalten. Weitere Fotos kosten je ${money(999)}.`}</p><p>Befestigung und Zubehör nach Auswahl: Silikon ${money(699)}, Acrylständer klar ${money(1399)}, Acrylständer schwarz ${money(1599)}.</p>`,
  productOptions:[{name:'Befestigung',position:1,values:p.variants.map(v=>({name:v.label}))}],
  variants:p.variants.map(v=>({sku:slateVariantSku(p.sizeKey,v.options),price:(v.priceCents/100).toFixed(2),optionValues:[{optionName:'Befestigung',name:v.label}],inventoryItem:{requiresShipping:true,tracked:false}}))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];if(!args.includes('--plan')||!args.includes('--out'))throw Error('--plan und --out erforderlich.');
 const plans=JSON.parse(fs.readFileSync(get('--plan')));if(plans.length!==48||new Set(plans.map(p=>p.handle)).size!==48)throw Error('48 eindeutige Tafeln erforderlich.');
 fs.writeFileSync(get('--out'),JSON.stringify(plans.map(plan=>({plan,input:slateDraftInput(plan)})),null,2)+'\n');
 console.log(JSON.stringify({products:48,variants:plans.reduce((n,p)=>n+p.variants.length,0),status:'DRAFT',writes:false}));
}
