// NUR LESEN: Stand nach dem angehaltenen Sechs-DRAFT-Lauf klären. Keine Mutation, kein Operatoraufruf.
// Liest bei Shopify die Produkte zu den sechs geplanten Handles, das Schema der Template-Mutation (Introspektion)
// und in der Registry die Zähler. Zugang wie die App (Client-Credentials), Netz nur zum Shop.
//   node sdl-diagnose.mjs --ordner=sechsdraft-live-…
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,P=path.resolve(hier,'..'),RT=path.join(P,'kandidat-f85390b-20261112'),BASIS=path.join(P,'sicherungen-db'),LIVE=path.join(P,'acryl-employee-20261021-v1','data'),SHOP='gravuru-design.myshopify.com';
const ORDNER=(process.argv.find(a=>a.startsWith('--ordner='))||'').slice(9);let geheim=[];const out={event:'sdl_diagnose',zeit:new Date().toISOString(),nurLesend:true};
const zeige=o=>{const t=JSON.stringify(o);if(geheim.some(g=>g&&t.includes(g)))throw new Error('Ausgabe enthielte einen Zugangswert');console.log(t);};
try{
 if(!/^sechsdraft-live-\d{8}T\d{6}Z$/.test(ORDNER))throw new Error('--ordner ungültig');const U=path.join(BASIS,ORDNER);
 const beleg=JSON.parse(fs.readFileSync(path.join(U,'AUSFUEHRUNG-sechsdraft.json'),'utf8')),zustand=JSON.parse(fs.readFileSync(path.join(U,'zustand.json'),'utf8'));
 out.belegStand={operatorFehler:beleg.operatorFehler,phasen:beleg.phasen,aufrufe:beleg.shopifyAufrufe,bindungen:beleg.bindungen,gruppen:beleg.gruppen.map(g=>[g.gruppe,g.zielProduktId]),vorher:beleg.vorher,nachOperator:beleg.nachOperator};
 out.operatorLog=fs.readFileSync(path.join(U,'operator-log.jsonl'),'utf8').trim().split('\n').map(l=>{try{const e=JSON.parse(l);return [e.phase,e.group??null,e.shopifyProductId?String(e.shopifyProductId).split('/').pop():null];}catch{return ['?'];}});
 const {ADMIN_READONLY_IDENTITY:I}=await import(pathToFileURL(path.join(RT,'app/workshop/shopify-admin-readonly.mjs')).href);
 const appText=fs.readFileSync(path.join(P,'..','gravuru-2027-merchant','app.cjs'),'utf8'),cfgFile=(appText.match(/process\.env\.GRAVURU_SHOPIFY_CONFIG_FILE\s*=\s*(["'])(.*?)\1/)||[])[2];
 const secretFile=JSON.parse(fs.readFileSync(cfgFile,'utf8')).values.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE,secret=fs.readFileSync(secretFile,'utf8').trim();geheim.push(secret);
 const hole=async(url,o)=>{if(new URL(url).host!==SHOP)throw new Error('Netz gesperrt');const r=await fetch(url,{...o,redirect:'error',cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return r.json();};
 const tk=await hole(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({grant_type:'client_credentials',client_id:I.clientId,client_secret:secret}).toString()});geheim.push(tk.access_token);
 const gql=async(query,variables)=>{if(/\bmutation\b/.test(query))throw new Error('Nur Lesen');return hole(`https://${SHOP}/admin/api/${I.apiVersion}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tk.access_token},body:JSON.stringify({query,variables})});};
 // 1. Produkte zu den sechs geplanten Handles
 out.produkte=[];
 for(const r of beleg.review.jeGruppe){const j=await gql('query D($q:String!){products(first:3,query:$q){nodes{id handle title status publishedAt templateSuffix createdAt updatedAt variantsCount{count} pricing:metafield(namespace:"$app",key:"personalization"){compareDigest} customizationId:metafield(namespace:"custom",key:"customization_id"){value}}}}',{q:'handle:'+r.handle});
  out.produkte.push({titel:r.titel,cfg:r.productId,treffer:(j.data?.products?.nodes||[]).map(p=>({id:p.id.split('/').pop(),status:p.status,publishedAt:p.publishedAt,templateSuffix:p.templateSuffix,varianten:p.variantsCount?.count??null,preisfeld:!!p.pricing,customizationId:p.customizationId?.value??null,createdAt:p.createdAt,updatedAt:p.updatedAt})),fehler:j.errors?j.errors.map(e=>String(e.message).slice(0,120)).slice(0,2):null});}
 // 2. Schema der Template-Mutation in dieser API-Version (Introspektion, kein Schreiben)
 const s=await gql('query S{m:__type(name:"Mutation"){fields{name args{name type{kind name ofType{kind name ofType{kind name}}}}}} i:__type(name:"ProductUpdateInput"){inputFields{name}} j:__type(name:"ProductInput"){inputFields{name}}}');
 const pu=(s.data?.m?.fields||[]).find(f=>f.name==='productUpdate'),typ=t=>t?(t.name||typ(t.ofType)+(t.kind==='NON_NULL'?'!':'')):null;
 out.schema={apiVersion:I.apiVersion,productUpdateArgs:pu?pu.args.map(a=>a.name+':'+typ(a.type)):null,ProductUpdateInput:s.data?.i?{vorhanden:true,hatTemplateSuffix:s.data.i.inputFields.some(f=>f.name==='templateSuffix'),hatId:s.data.i.inputFields.some(f=>f.name==='id'),felder:s.data.i.inputFields.length}:{vorhanden:false},ProductInput:s.data?.j?{vorhanden:true,hatTemplateSuffix:s.data.j.inputFields.some(f=>f.name==='templateSuffix')}:{vorhanden:false},fehler:s.errors?s.errors.map(e=>String(e.message).slice(0,160)).slice(0,3):null};
 // 3. Registry-Zähler jetzt
 const db=new DatabaseSync(path.join(LIVE,'workshop.sqlite'),{readOnly:true});try{const n=q=>{try{return db.prepare(q).get()?.n??null;}catch{return null;}};out.registry={produkte:n("SELECT COUNT(*) AS n FROM products WHERE tenant_id='gravuru'"),bestaetigungen:n("SELECT COUNT(*) AS n FROM product_group_confirmations WHERE tenant_id='gravuru'"),ausfuehrungen:n("SELECT COUNT(*) AS n FROM product_group_creation_results WHERE tenant_id='gravuru'"),formbindungen:n("SELECT COUNT(*) AS n FROM form_shop_bindings WHERE tenant_id='gravuru'"),preisvertraege:n("SELECT COUNT(*) AS n FROM form_shop_binding_personalization WHERE tenant_id='gravuru'"),bindungskoepfe:n("SELECT COUNT(*) AS n FROM shop_product_binding_heads WHERE tenant_id='gravuru'"),katalogfreigaben:n('SELECT COUNT(*) AS n FROM catalog_live_order_approvals'),transfers:n('SELECT COUNT(*) AS n FROM shop_draft_transfers')};}finally{db.close();}
 out.zustandGruppen=zustand.gruppen.length;zeige(out);
}catch(e){let m=String(e?.message||e);for(const g of geheim)if(g)m=m.replaceAll(g,'[entfernt]');console.log(JSON.stringify({...out,fehler:m.replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,300)}));process.exitCode=1;}
