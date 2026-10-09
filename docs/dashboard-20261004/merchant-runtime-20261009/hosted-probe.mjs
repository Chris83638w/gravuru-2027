import fs from 'node:fs';
import https from 'node:https';
import {createHmac,randomUUID,createHash} from 'node:crypto';
import {merchantConfig} from '/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-2027-merchant/ops/plesk/merchant-config.mjs';
const phase=process.argv[2],root='/var/www/vhosts/gravuru-designwerkstatt.de',proof=root+'/private/merchant-https-proof-20261009.json';
if(!['before','after'].includes(phase)||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')throw Error('probe_configuration');
const c=merchantConfig({}),origin=c.origin;
if(origin!=='https://app-2027.gravuru-designwerkstatt.de')throw Error('probe_target');
const sign=()=>{const now=Math.floor(Date.now()/1000),p={aud:c.runtime.shopifySessions.clientId,iss:'https://gravuru-design.myshopify.com/admin',dest:'https://gravuru-design.myshopify.com',sub:'123456',exp:now+60,nbf:now-1,iat:now-1,jti:'synthetic-host-check-'+randomUUID()};const s=[{alg:'HS256',typ:'JWT'},p].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');return 'Bearer '+s+'.'+createHmac('sha256',c.runtime.shopifySessions.secret).update(s).digest('base64url');};
async function call(path,{method='GET',auth=false,csrf,body,headers={}}={}){
 return await new Promise((resolve,reject)=>{const raw=body?JSON.stringify(body):undefined;const r=https.request(origin+path,{method,rejectUnauthorized:true,headers:{...(auth?{authorization:sign(),origin}:{}),...(csrf?{'x-gravuru-csrf':csrf}:{}),...(raw?{'content-type':'application/json','content-length':Buffer.byteLength(raw)}:{}),...headers}},res=>{let text='';res.on('data',b=>{text+=b;if(text.length>2e6)r.destroy(Error('response_limit'));});res.on('end',()=>{let json;try{json=JSON.parse(text)}catch{}resolve({status:res.statusCode,json,headers:res.headers,tls:res.socket?.authorized!==false});});});r.setTimeout(20000,()=>r.destroy(Error('timeout')));r.on('error',reject);r.end(raw);});
}
const report={merchantHttpsProbe:true,phase,at:new Date().toISOString(),origin,identity:'synthetic JWT signed in server memory; not a Shopify login',tlsVerification:true,followRedirects:false,checks:[]};
function check(name,result,expected){const pass=Array.isArray(expected)?expected.includes(result.status):result.status===expected;report.checks.push({name,status:result.status,expected,pass});if(!pass)throw Error('status_check_'+name);return result;}
try{
 if(phase==='before'){
  if(fs.existsSync(proof))throw Error('proof_already_exists');
  const shell=check('application shell',await call('/werkstatt/'),200);report.shopifyIframePolicy=String(shell.headers['content-security-policy']).includes('frame-ancestors https://gravuru-design.myshopify.com https://admin.shopify.com');
  for(const path of ['/api/workshop/products','/__shopify/health'])check('anonymous '+path,await call(path),401);
  for(const path of ['/.env','/private/gravuru-2027-merchant-shopify.json','/PACKAGE-MANIFEST.json','/app.cjs','/gravuru-2027-merchant-test.zip'])check('private '+path,await call(path),[403,404]);
  check('invalid bearer',await call('/api/workshop/products',{headers:{authorization:'Bearer invalid'}}),401);
  const health=check('authenticated health',await call('/__shopify/health',{auth:true}),200);report.shopMutationsEnabled=health.json.shopMutationsEnabled;report.checkoutEnabled=health.json.checkoutEnabled;
  const session=check('authenticated session',await call('/api/workshop/session',{auth:true}),200);
  check('write without csrf',await call('/api/workshop/profiles',{method:'POST',auth:true,body:{}}),403);
  const list=check('initial profiles',await call('/api/workshop/profiles',{auth:true}),200);
  const p=check('synthetic profile create',await call('/api/workshop/profiles',{method:'POST',auth:true,csrf:session.json.csrfToken,body:{name:'Synthetischer HTTPS-Neustarttest 2026-10-09',type:'colors',items:['#112233']}}),201);
  fs.writeFileSync(proof,JSON.stringify({profile:p.json,csrf:session.json.csrfToken,initial: list.json}),{mode:0o600,flag:'wx'});
  check('synthetic profile reopen',await call('/api/workshop/profiles/'+p.json.id,{auth:true}),200);
 }else{
  const p=JSON.parse(fs.readFileSync(proof,'utf8'));
  const reopened=check('profile after restart',await call('/api/workshop/profiles/'+p.profile.id,{auth:true}),200);
  report.persistedExactly=JSON.stringify(reopened.json)===JSON.stringify(p.profile);
  const session=check('session after restart',await call('/api/workshop/session',{auth:true}),200);report.openPageCsrfRetained=session.json.csrfToken===p.csrf;
  const save=check('continue after restart',await call('/api/workshop/profiles/'+p.profile.id,{method:'PATCH',auth:true,csrf:p.csrf,body:{document:{name:'Synthetischer HTTPS-Neustarttest – fortgesetzt',type:'colors',items:['#112233']},expectedRevision:p.profile.revision}}),200);
  report.sameProfileId=save.json.id===p.profile.id;report.nextRevision=save.json.revision===p.profile.revision+1;
  const list=check('profiles after continuation',await call('/api/workshop/profiles',{auth:true}),200);report.profileListShape=Array.isArray(list.json)?'array':Object.keys(list.json);
  if(!report.persistedExactly||!report.openPageCsrfRetained||!report.sameProfileId||!report.nextRevision)throw Error('persistence');
 }
 report.ok=true;
}catch(e){report.ok=false;report.errorCode=/^(status_check_|proof_|persistence)/.test(e.message)?e.message:'host_probe_failed';}
fs.writeFileSync(root+'/private/merchant-https-report-v2-'+phase+'-20261009.json',JSON.stringify(report),{mode:0o600,flag:'wx'});console.log(JSON.stringify(report));
