// Warenkorbprüfung Ebene C – Preisfunktion mit den TATSÄCHLICHEN Preisfeldern der sieben Produkte (Main + sechs DRAFTs).
// NUR LESEND bei Shopify (Eigentümer-App-Lesetransport, keine Mutation), keine Datenbank, kein Warenkorb, keine Bestellung.
// Ausgeführt wird die JS-QUELLE der Preisfunktion aus der laufenden Runtime (ops/shopify/master-release, gepinnt) – das ist
// ausdrücklich KEIN Nachweis des kompilierten WASM-Builds und keine Instruktionsmessung. Erwartungswerte werden unabhängig
// aus dem Shopify-Variantenpreis (bzw. dem historischen Mappingpreis für R1-Zeilen) und der bestätigten Regel berechnet:
// Einheit = Basis + Motive×169 + Fotos×999 + Logos×1299 (Kleinprodukte: Foto/Logo AUS), Staffel 3/5/10 → 5/10/15 % auf die
// komplette Einheit, einmal kaufmännisch auf ganze Cent gerundet.
//   node wk-funktion.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {pathToFileURL,fileURLToPath} from 'node:url';
const hier=import.meta.dirname,P=fs.realpathSync(process.env.WK_P||path.resolve(hier,'..')),RT=path.join(P,process.env.WK_RT||'kandidat-f85390b-20261112'),BASIS=path.join(P,'sicherungen-db');
const SHOP='gravuru-design.myshopify.com',TEST=process.env.WK_TEST?await import(pathToFileURL(process.env.WK_TEST).href):null;
const PINS={'ops/shopify/master-release/cart_transform_run.mjs':'b9ca53a432f938072b627b72dcf73382b5f685d65d45f1c8c360977b5bef54fc','ops/shopify/master-release/pricing-history.mjs':'9f563d2107d4644b46e0b8f02831a176fbc8800173e1325b2cf00111a7c34c91','ops/shopify/master-release/price-v1.mjs':'0e32c3b58a264416a330779aa32209424495214c628945bde6be095200332205','ops/shopify/master-release/legacy-price.mjs':'d07c74608897adf61343572c6b3756d51d21bf6c2a2c94862f2a654427815b17','ops/shopify/master-release/priced-options.mjs':'3f38552c2b8cc74c35f454c83f6431f44781c05b931da740e629ac90eccd7b33','ops/shopify/checkout-image/cart-image.mjs':'7a8476fdd5c17dd2a14cd4d2102b7c8aee6211c016e62a14405a296e9dca64ef','ops/shopify/master-release/pricing-storage.mjs':'fb67492a30a4e208328b2aa84110b533f560bcb9f3534b65535ba2f581876ca8'};
const MAIN='gid://shopify/Product/16190784602492',MAIN_PREIS_SHA='37ef02c6f98f6b463179093aca38a715a153141d8281203a158ddbc3e49b0705';
const KLEIN={A5:['16203675074940','58189617660284'],A6:['16203715281276','58190005666172'],A8:['16203716100476','58190008156540'],S5:['16203716854140','58190010614140'],S6:['16203717804412','58190020608380'],S8:['16203718459772','58190028734844']};
const KLEIN_K00={A5:699,A6:799,A8:849,S5:799,S6:879,S8:949};
// Main-Testvarianten (Astra-Matrix #168 6833123859): AB 12×8 Schwarz K00/KGL/KRA/B02/B02S, RE 30×20 Schwarz B04/B04S, eine R1-Restvariante, eine migrierte Variante mit Altpreis
const MAIN_V={AB_K00:['58104626479484',1499],AB_KGL:['58104626512252',1798],AB_KRA:[null,1898],AB_B02:[null,1748],AB_B02S:[null,1768],RE300_B04:['58104631230844',4788],RE300_B04S:['58104631263612',4828]};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
let geheim=[];const sauber=s=>{let t=String(s);for(const g of geheim)if(g)t=t.replaceAll(g,'[entfernt]');return t.replace(/\/var\/www\/vhosts\/[^/]+/g,'~');};
const zeige=o=>{const t=JSON.stringify({event:'wk_funktion',...o});if(geheim.some(g=>g&&t.includes(g)))throw new Error('Ausgabe enthielte einen Zugangswert');console.log(t);};
const halfUp=(cents,pct)=>pct?Math.floor((2*cents*(10000-pct*100)+10000)/20000):cents;
const staffel=q=>q>=10?15:q>=5?10:q>=3?5:0;
const out={schema:'gravuru-warenkorb-ebene-c/v1',kennzeichnung:'Preisfunktion (JS-Quelle der laufenden Runtime) mit den tatsächlichen Preisfeldern; nur Lesen bei Shopify; KEIN WASM-/Instruktionsnachweis, KEIN Shopify-Warenkorb',zeit:new Date().toISOString()};let schritt='start';
try{
 schritt='pins';for(const [f,h] of Object.entries(PINS))if(sha(fs.readFileSync(path.join(RT,f)))!==h)throw new Error('Prüfsumme weicht ab: '+f);
 const imp=f=>import(pathToFileURL(path.join(RT,f)).href);
 const {cartTransformRun}=await imp('ops/shopify/master-release/cart_transform_run.mjs');
 // Mapping (gepinnt im Main-Operatorpaket) für die restlichen Main-IDs und historische Altpreise
 const mp=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(BASIS,'mainanschluss-20261112T105018Z','paket','variant-mapping.preview.json.gz'))));
 const bySku=new Map(mp.matches.map(r=>[r.sku,r]));
 for(const [k,s] of [['AB_KRA','156-TS-Acryl-AB-120X80-T30-SW-KRA'],['AB_B02','156-TS-Acryl-AB-120X80-T30-SW-B02'],['AB_B02S','156-TS-Acryl-AB-120X80-T30-SW-B02S']]){const r=bySku.get(s);if(!r)throw new Error('Mapping fehlt: '+s);MAIN_V[k][0]=r.shopifyVariantId.split('/').pop();}
 const migriert=mp.matches.find(r=>r.currentShopUnitCents!==r.targetUnitCents&&r.sku.includes('120X80')),rest=mp.residualVariants[0];
 // Shopify lesen
 schritt='shopify';const ro=await imp('app/workshop/shopify-admin-readonly.mjs'),I=ro.ADMIN_READONLY_IDENTITY;if(I.shopDomain!==SHOP)throw new Error('Shopidentität');
 let lesen=0,fremd=0;const fetchEcht=TEST?null:globalThis.fetch;
 const anfrage=async(url,o)=>{let h='';try{h=new URL(url).host;}catch{}if(h!==SHOP){fremd++;throw new Error('Netz gesperrt außer Shop-Host');}const c=new AbortController(),t=setTimeout(()=>c.abort(),30000);try{const r=await fetchEcht(url,{...o,redirect:'error',cache:'no-store',signal:c.signal});if(!r.ok)throw Object.assign(new Error('HTTP '+r.status),{code:'wk_http_'+r.status});return r.json();}finally{clearTimeout(t);}};
 let gql;
 if(TEST)gql=async(q,v)=>{lesen++;return TEST.antwort(q,v);};
 else{
  const appText=fs.readFileSync(path.join(P,'..','gravuru-2027-merchant','app.cjs'),'utf8'),cfgFile=(appText.match(/process\.env\.GRAVURU_SHOPIFY_CONFIG_FILE\s*=\s*(["'])(.*?)\1/)||[])[2];if(!cfgFile)throw new Error('Konfiguration fehlt');
  const secretFile=JSON.parse(fs.readFileSync(cfgFile,'utf8')).values?.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE,st=fs.statSync(secretFile);if(!st.isFile()||st.mode&0o077||st.size<16||st.size>1024)throw new Error('Secretdatei');
  const secret=fs.readFileSync(secretFile,'utf8').trim();geheim.push(secret);
  const tk=await anfrage(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({grant_type:'client_credentials',client_id:I.clientId,client_secret:secret}).toString()});
  if(typeof tk.access_token!=='string'||tk.access_token.length<16)throw new Error('Token');geheim.push(tk.access_token);
  gql=async(query,variables)=>{if(/\bmutation\b/.test(query))throw new Error('Nur Lesen');lesen++;const j=await anfrage(`https://${SHOP}/admin/api/${I.apiVersion}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tk.access_token},body:JSON.stringify({query,variables})});if(j.errors?.length)throw new Error('GraphQL: '+String(j.errors[0]?.message).slice(0,120));return j.data;};
 }
 const produktIds=['16190784602492',...Object.values(KLEIN).map(x=>x[0])].map(i=>'gid://shopify/Product/'+i);
 const variantIds=[...Object.values(MAIN_V).map(x=>x[0]),migriert.shopifyVariantId.split('/').pop(),rest.id.split('/').pop(),...Object.values(KLEIN).map(x=>x[1])];
 const Q=`query WkFelder($p:[ID!]!,$v:[ID!]!){products:nodes(ids:$p){... on Product{id status pricing:metafield(namespace:"$app",key:"personalization"){value} variants(first:20){nodes{id price}}}} variants:nodes(ids:$v){... on ProductVariant{id price product{id}}}}`;
 const d=await gql(Q,{p:produktIds,v:variantIds.map(i=>'gid://shopify/ProductVariant/'+i)});
 const felder=new Map(),preise=new Map(),klVar=new Map();
 for(const p of d.products){if(!p?.pricing?.value)throw new Error('Preisfeld fehlt: '+p?.id);felder.set(p.id,p.pricing.value);if(p.id!==MAIN)klVar.set(p.id,p.variants.nodes.map(v=>({id:v.id.split('/').pop(),cents:Math.round(Number(v.price)*100)})));if(p.status!=='DRAFT')throw new Error('Nicht DRAFT: '+p.id);}
 for(const v of d.variants){if(!v)throw new Error('Variante fehlt');preise.set(v.id.split('/').pop(),Math.round(Number(v.price)*100));}
 out.felder=[...felder].map(([id,v])=>({produkt:id.split('/').pop(),bytes:Buffer.byteLength(v),sha256:sha(v)}));
 out.mainFeldGepinnt=sha(felder.get(MAIN))===MAIN_PREIS_SHA;
 // Fälle
 schritt='faelle';let n=0;const faelle=[];
 const line=(produkt,variant,{q=1,rev,m=0,u=0,l=null,design=true}={})=>{n++;const L={id:'gid://shopify/CartLine/'+n,quantity:q,revision:rev==null?null:{value:String(rev)},designFile:design?{value:'wk-pruef-'+n}:null,motifs:{value:String(m)},uploads:{value:String(u)},merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/'+variant,product:{id:produkt,pricing:{value:felder.get(produkt)}}}};if(l!==null)L.logos={value:String(l)};return L;};
 const lauf=(name,lines,erwartet)=>{let res,fehler=null;try{res=cartTransformRun({presentmentCurrencyRate:'1',cart:{lines}});}catch(e){fehler=String(e.message).slice(0,120);}
  const ist=lines.map(L=>{const op=res?.operations.find(o=>o.lineUpdate?.cartLineId===L.id&&o.lineUpdate.price);return op?Math.round(Number(op.lineUpdate.price.adjustment.fixedPricePerUnit.amount)*100):null;});
  const ok=erwartet==='fehler'?fehler!==null:fehler===null&&ist.every((c,i)=>c===erwartet[i]);
  faelle.push({name,ok,erwartet,ist:fehler?null:ist,fehler,summeIst:fehler?null:ist.reduce((a,c,i)=>a+c*lines[i].quantity,0)});};
 const unit=(base,{m=0,u=0,l=0,q=1})=>halfUp(base+m*169+u*999+l*1299,staffel(q));
 const Q4=[1,3,5,10];
 // Main R2: Befestigungen × Mengen
 for(const [k,[vid,soll]] of Object.entries(MAIN_V)){const base=preise.get(vid);if(base!==soll)faelle.push({name:'main-shoppreis-'+k,ok:false,erwartet:soll,ist:base});for(const q of Q4)lauf(`main-r2-${k}-x${q}`,[line(MAIN,vid,{rev:2,q,l:0})],[unit(base,{q})]);}
 // Main R2 Zusätze auf AB K00
 const abK=MAIN_V.AB_K00[0],abBase=preise.get(abK);
 for(const [k,z] of Object.entries({motiv1:{m:1},motiv2:{m:2},foto:{u:1},logo:{l:1},fotoLogo:{u:1,l:1},alles:{m:2,u:1,l:1}}))for(const q of Q4)lauf(`main-r2-AB_K00-${k}-x${q}`,[line(MAIN,abK,{rev:2,q,m:z.m||0,u:z.u||0,l:z.l||0})],[unit(abBase,{...z,q})]);
 // Main historisch (R1-Vertrag): migrierte Variante mit Altpreis, R1-Restvariante
 const migV=migriert.shopifyVariantId.split('/').pop(),restV=rest.id.split('/').pop();
 for(const q of [1,10]){lauf(`main-r1-historisch-${migriert.sku}-x${q}`,[line(MAIN,migV,{rev:1,q})],[unit(migriert.currentShopUnitCents,{q})]);lauf(`main-r1-rest-${rest.sku}-x${q}`,[line(MAIN,restV,{rev:1,q,m:1})],[unit(preise.get(restV),{m:1,q})]);}
 // Kleinprodukte: alle Varianten × Mengen, mit/ohne Motiv
 for(const [k,[pid]] of Object.entries(KLEIN)){const P_='gid://shopify/Product/'+pid,vs=klVar.get(P_);
  const k00=Math.min(...vs.map(v=>v.cents));if(k00!==KLEIN_K00[k])faelle.push({name:'klein-k00-'+k,ok:false,erwartet:KLEIN_K00[k],ist:k00});
  for(const v of vs)for(const q of Q4)for(const m of [0,1])lauf(`klein-${k}-${v.id}-m${m}-x${q}`,[line(P_,v.id,{rev:1,q,m})],[unit(v.cents,{m,q})]);
  // Foto/Logo AUS: Logo-Zeile muss abgewiesen werden; Foto-Zähler darf nichts kosten (Vertrag 0 c)
  lauf(`klein-${k}-logo-manipulation`,[line(P_,vs[0].id,{rev:1,l:1})],'fehler');
  lauf(`klein-${k}-foto-zaehler`,[line(P_,vs[0].id,{rev:1,u:1})],[unit(vs[0].cents,{})]);
  lauf(`klein-${k}-falsche-revision`,[line(P_,vs[0].id,{rev:2})],'fehler');
 }
 // Main Manipulationen
 lauf('main-zu-viele-logos',[line(MAIN,abK,{rev:2,l:5})],'fehler');
 lauf('main-unbekannte-revision',[line(MAIN,abK,{rev:7})],'fehler');
 lauf('main-ohne-entwurf',[line(MAIN,abK,{rev:2,design:false})],'fehler');
 // Gemischter Warenkorb: je Produkt eine Zeile (7 verschiedene Zeilen)
 const mix=[line(MAIN,abK,{rev:2,q:3,m:1,u:1,l:1}),...Object.entries(KLEIN).map(([k,[pid,vid]])=>line('gid://shopify/Product/'+pid,vid,{rev:1,q:5,m:1}))];
 lauf('gemischt-7-zeilen',mix,[unit(abBase,{m:1,u:1,l:1,q:3}),...Object.entries(KLEIN).map(([k,[pid,vid]])=>unit(KLEIN_K00[k],{m:1,q:5}))]);
 const rot=faelle.filter(f=>!f.ok);
 out.faelle=faelle.length;out.gruen=faelle.length-rot.length;out.rot=rot.slice(0,20);
 out.beispiele=['main-r2-AB_K00-x1','main-r2-AB_B02S-x10','main-r2-AB_K00-alles-x10','main-r2-RE300_B04S-x5',`main-r1-historisch-${migriert.sku}-x1`,'klein-A5-'+KLEIN.A5[1]+'-m1-x10','gemischt-7-zeilen'].map(nm=>{const f=faelle.find(x=>x.name===nm);return f?{name:nm,ist:f.ist,summe:f.summeIst}:{name:nm,fehlt:true};});
 out.leseabfragen=lesen;out.fremdeNetzversuche=fremd;out.bestanden=rot.length===0&&out.mainFeldGepinnt&&fremd===0;
 schritt='beleg';const U=path.join(BASIS,'warenkorb-ebene-c-'+out.zeit.replace(/[-:]/g,'').slice(0,15)+'Z');fs.mkdirSync(U,{mode:0o700});
 const text=JSON.stringify({...out,alleFaelle:faelle},null,1);if(geheim.some(g=>g&&text.includes(g)))throw new Error('Beleg enthielte einen Zugangswert');fs.writeFileSync(path.join(U,'WARENKORB-ebene-c.json'),text,{flag:'wx',mode:0o600});
 out.ordner=path.basename(U);out.belegSha256=sha(text);out.belegBytes=Buffer.byteLength(text);out.skriptSha256=sha(fs.readFileSync(fileURLToPath(import.meta.url)));
 zeige(out);if(!out.bestanden)process.exitCode=1;
}catch(e){try{zeige({...out,schritt,fehler:sauber(e?.message||e).slice(0,300),bestanden:false});}catch{console.log(JSON.stringify({event:'wk_funktion',schritt,bestanden:false}));}process.exitCode=1;}
