const {randomBytes,createHash} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

const shop = 'https://gravuru-design.myshopify.com', app = 'https://app-2027.gravuru-designwerkstatt.de';
const beta = 'https://konfi-beta.gravuru-designwerkstatt.de';
const product = '16190784438652', variant = '58104606556540';
const editor = app+'/konfi-demo/variante-c-warenkorb-267/auswahl.html';
const localClient = path.join(__dirname,'native-theme-cart.mjs');
const client = import(pathToFileURL(fs.existsSync(localClient) ? localClient : path.join(__dirname,'../../../app/workshop/ui/theme-cart-client.mjs')).href);
const visits = new Map();
const ttl = 2*60*60*1000;
function expect(ok,msg,status=409){if(!ok)throw Object.assign(Error(msg),{status});}
function send(res,code,body,type='application/json; charset=utf-8'){
  res.writeHead(code,{'Content-Type':type,'Cache-Control':'private, no-store','Vary':'Authorization, Cookie','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'});
  res.end(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body));
}
async function body(req){
  const pieces=[];let bytes=0;
  for await(const piece of req){bytes+=piece.length;expect(bytes<=1536,'Zu viele Angaben.',413);pieces.push(piece);}
  try{return JSON.parse(Buffer.concat(pieces).toString());}catch{throw Object.assign(Error('Die Testangaben sind unvollständig.'),{status:400});}
}
function session(req,res,create){
  const now=Date.now();for(const [id,v] of visits)if(!v.busy&&v.until<now)visits.delete(id);
  const user=createHash('sha256').update(req.headers.authorization||'').digest('hex');
  const cookieName='gravuru_c267=';
  const key=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName))?.slice(cookieName.length);
  let value=key&&visits.get(key);
  if(!value||value.user!==user){
    expect(create,'Dein Test ist abgelaufen. Bitte starte erneut über die geschützte Testseite.',401);
    expect(visits.size<160,'Der Prüfstand ist ausgelastet. Bitte kurz warten.',429);
    const id=randomBytes(32).toString('hex');value={user,test:randomBytes(24).toString('hex'),cookies:new Map(),offers:new Map()};visits.set(id,value);
    res.setHeader('Set-Cookie','gravuru_c267='+id+'; Path=/variante-c/; Max-Age=7200; HttpOnly; Secure; SameSite=Lax');
  }
  value.until=now+ttl;return value;
}
async function shopFetch(visit,resource,options={}){
  const headers=new Headers(options.headers);headers.set('Accept','application/json');
  const cookies=[...visit.cookies].map(([k,v])=>k+'='+v).join('; ');if(cookies)headers.set('Cookie',cookies);
  const response=await fetch(shop+resource,{...options,headers,redirect:'error',signal:AbortSignal.timeout(55000)});
  for(const line of response.headers.getSetCookie()){
    const pair=line.split(';',1)[0],cut=pair.indexOf('=');if(cut<1)continue;
    const name=pair.slice(0,cut),value=pair.slice(cut+1);
    if(!/^[A-Za-z0-9_-]{1,90}$/.test(name)||/[\r\n;]/.test(value))continue;
    if(!value||/;\s*max-age=0(?:;|$)/i.test(line))visit.cookies.delete(name);else visit.cookies.set(name,value);
  }
  return response;
}
async function readJson(res){
  const data=await res.json();expect(res.ok,data.error?.message||data.description||'Shopify hat diesen Schritt nicht bestätigt.',res.status);
  return data;
}
function summary(cart){
  expect(Array.isArray(cart.items)&&cart.currency==='EUR'&&cart.items.every(i=>String(i.product_id)===product&&i.sku&&i.properties?._gravuru_config&&/^https:\/\/cdn\.shopify\.com\//.test(i.properties._gravuru_checkout_image||'')),'Dieser Testwarenkorb enthält eine unerwartete Position.');
  return {currency:cart.currency,total:cart.total_price,items:cart.items.map(i=>({key:i.key,product:i.product_title,productId:String(i.product_id),variant:String(i.variant_id),sku:i.sku,amount:i.final_line_price,quantity:i.quantity,design:i.properties.Design,format:i.properties.Format,configuration:i.properties._gravuru_config,revision:i.properties._gravuru_rev,image:i.properties._gravuru_checkout_image,texts:Object.entries(i.properties).filter(([k])=>/^Gravurtext/.test(k)).map(([,v])=>v)}))};
}
async function add(visit,token){
  const {createThemeCartClient,hostedPreview}=await client;
  const handoff=(action,method='GET')=>shopFetch(visit,'/apps/konfigurator/cart/'+action,{method,headers:{'X-Gravuru-Cart-Handoff':token,...(action==='data'?{'X-Gravuru-Cart-Preview':'hosted'}:{})}}).then(readJson);
  let operation=visit.offers.get(token);
  if(!operation){
    const payload=await handoff('data');
    expect(payload.productId===product&&payload.shopDomain==='gravuru-design.myshopify.com'&&payload.mode==='create'&&hostedPreview(payload),'Die Übergabe gehört nicht zu diesem Edelstahl-Test.');
    const transport=createThemeCartClient({fetchImpl:(route,opts)=>shopFetch(visit,route,opts),claim:()=>handoff('claim','POST')});
    operation={payload,transport};visit.offers.set(token,operation);
  }
  const result=await operation.transport.submit(operation.payload);
  return summary(result.cart);
}
module.exports=async function variantCTest(req,res,url){
  try{
    const route=url.pathname.slice('/variante-c/'.length);
    if(route===''&&req.method==='GET'){
      const visit=session(req,res,true);
      const ticket=await shopFetch(visit,'/apps/konfigurator/start?product='+product+'&variant='+variant+'&format=json').then(readJson);
      const destination=new URL(ticket.url),token=new URLSearchParams(destination.hash.slice(1)).get('s');
      expect(destination.origin===app&&destination.pathname==='/konfigurator/shop/'&&/^gse1\.[\w-]+\.[\w-]+$/.test(token||''),'Der signierte Testeinstieg ist nicht verfügbar.');
      res.writeHead(302,{Location:editor+'#'+new URLSearchParams({s:token,test:visit.test}),'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}).end();return;
    }
    if(req.method==='GET'&&['warenkorb','warenkorb.mjs','auswahl.css'].includes(route)){
      const file=route==='warenkorb'?'warenkorb.html':route;
      const type=route==='warenkorb'?'text/html':route.endsWith('mjs')?'text/javascript':'text/css';
      return send(res,200,fs.readFileSync(path.join(__dirname,file)),type+'; charset=utf-8');
    }
    const visit=session(req,res,false);
    if(route==='positionen'&&req.method==='GET')return send(res,200,summary(await shopFetch(visit,'/cart.js').then(readJson)));
    expect(req.method==='POST'&&['uebernehmen','entfernen'].includes(route),'Diese Funktion gehört nicht zum Test.',404);
    expect(req.headers.origin===beta&&req.headers['x-variante-c-test']==='1','Bitte direkt aus deinem Testwarenkorb öffnen.',403);
    const input=await body(req);expect(!visit.busy,'Eine Position wird gerade geprüft.');visit.busy=true;
    try{
      if(route==='uebernehmen'){
        expect(input.test===visit.test&&/^[a-f0-9]{64}$/.test(input.handoff||''),'Die Übergabe gehört nicht zu deiner Testsitzung.',403);
        return send(res,200,await add(visit,input.handoff));
      }
      const before=summary(await shopFetch(visit,'/cart.js').then(readJson));
      expect(before.items.some(i=>i.key===input.key),'Diese Position ist nicht in deinem Testwarenkorb.');
      const after=summary(await shopFetch(visit,'/cart/change.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:input.key,quantity:0})}).then(readJson));
      expect(!after.items.some(i=>i.key===input.key)&&after.items.length===before.items.length-1,'Shopify hat das Entfernen nicht bestätigt.');return send(res,200,after);
    }finally{visit.busy=false;}
  }catch(e){send(res,Number.isInteger(e.status)&&e.status>=400&&e.status<600?e.status:503,{message:e.message?.replace(/https?:\/\/\S+/g,'[Shop]').slice(0,250)||'Der Testwarenkorb ist gerade nicht erreichbar.'});}
};
