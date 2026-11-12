// NUR LESEN: Schema-Introspektion der Admin-API 2026-07 für alle Mutationen der beiden Operatorpakete.
// Keine Mutation wird ausgeführt. Zugang wie die App (Client-Credentials), Netz nur zum Shop.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,P=path.resolve(hier,'..'),RT=path.join(P,'kandidat-f85390b-20261112'),SHOP='gravuru-design.myshopify.com';let geheim=[];const out={event:'schema_pruefung',zeit:new Date().toISOString(),nurLesend:true};
try{
 const {ADMIN_READONLY_IDENTITY:I}=await import(pathToFileURL(path.join(RT,'app/workshop/shopify-admin-readonly.mjs')).href);
 const appText=fs.readFileSync(path.join(P,'..','gravuru-2027-merchant','app.cjs'),'utf8'),cfgFile=(appText.match(/process\.env\.GRAVURU_SHOPIFY_CONFIG_FILE\s*=\s*(["'])(.*?)\1/)||[])[2];
 const secret=fs.readFileSync(JSON.parse(fs.readFileSync(cfgFile,'utf8')).values.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE,'utf8').trim();geheim.push(secret);
 const hole=async(url,o)=>{if(new URL(url).host!==SHOP)throw new Error('Netz gesperrt');const r=await fetch(url,{...o,redirect:'error',cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return r.json();};
 const tk=await hole(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({grant_type:'client_credentials',client_id:I.clientId,client_secret:secret}).toString()});geheim.push(tk.access_token);
 const T='kind name ofType{kind name ofType{kind name ofType{kind name}}}',typ=t=>!t?null:t.kind==='NON_NULL'?typ(t.ofType)+'!':t.kind==='LIST'?'['+typ(t.ofType)+']':t.name;
 const namen=['UserError','ProductUpdatePayload','ProductUpdateUserError','ProductVariantsBulkUpdatePayload','ProductVariantsBulkUpdateUserError','MetafieldsSetPayload','MetafieldsSetUserError','ProductSetPayload','ProductSetUserError','ProductVariantsBulkInput','VariantOptionValueInput','MetafieldsSetInput','ProductUpdateInput'];
 const q='query S{'+namen.map((n,i)=>`t${i}:__type(name:"${n}"){name kind fields{name type{${T}}} inputFields{name type{${T}}}}`).join(' ')+` m:__type(name:"Mutation"){fields{name args{name type{${T}}}}}}`;
 const j=await hole(`https://${SHOP}/admin/api/${I.apiVersion}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tk.access_token},body:JSON.stringify({query:q})});
 if(j.errors?.length)out.graphqlFehler=j.errors.map(e=>String(e.message).slice(0,140)).slice(0,3);
 out.apiVersion=I.apiVersion;out.typen={};namen.forEach((n,i)=>{const t=j.data?.['t'+i];out.typen[n]=t?(t.fields||t.inputFields||[]).map(f=>f.name+':'+typ(f.type)).filter(s=>/^(field|code|message|userErrors|product|productVariants|metafields|id|price|optionValues|optionName|name|ownerId|namespace|key|type|value|compareDigest|templateSuffix):/.test(s)):null;});
 out.mutationen=Object.fromEntries((j.data?.m?.fields||[]).filter(f=>['productUpdate','productVariantsBulkUpdate','metafieldsSet','productSet'].includes(f.name)).map(f=>[f.name,f.args.map(a=>a.name+':'+typ(a.type))]));
 const hat=(n,f)=>(out.typen[n]||[]).some(s=>s.startsWith(f+':')),ue=n=>((out.typen[n]||[]).find(s=>s.startsWith('userErrors:'))||'').replace(/^userErrors:|[\[\]!]/g,'');
 out.befund={productUpdate_userErrors_typ:ue('ProductUpdatePayload'),productUpdate_userErrors_hat_code:hat(ue('ProductUpdatePayload'),'code'),bulk_userErrors_typ:ue('ProductVariantsBulkUpdatePayload'),bulk_userErrors_hat_code:hat(ue('ProductVariantsBulkUpdatePayload'),'code'),metafieldsSet_userErrors_typ:ue('MetafieldsSetPayload'),metafieldsSet_userErrors_hat_code:hat(ue('MetafieldsSetPayload'),'code'),productSet_userErrors_typ:ue('ProductSetPayload'),productSet_userErrors_hat_code:hat(ue('ProductSetPayload'),'code'),bulkInput_hat_id_price_optionValues:['id','price','optionValues'].every(f=>hat('ProductVariantsBulkInput',f)),optionValue_hat_optionName_name:['optionName','name'].every(f=>hat('VariantOptionValueInput',f)),metafieldsSetInput_hat_compareDigest:hat('MetafieldsSetInput','compareDigest')};
 const t=JSON.stringify(out);if(geheim.some(g=>t.includes(g)))throw new Error('Ausgabe gesperrt');console.log(t);
}catch(e){let m=String(e?.message||e);for(const g of geheim)if(g)m=m.replaceAll(g,'[entfernt]');console.log(JSON.stringify({...out,fehler:m.slice(0,300)}));process.exitCode=1;}
