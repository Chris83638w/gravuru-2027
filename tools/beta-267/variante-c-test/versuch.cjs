const {randomBytes} = require('node:crypto');

const shop = 'https://gravuru-design.myshopify.com';
const app = 'https://app-2027.gravuru-designwerkstatt.de';
const start = shop+'/apps/konfigurator/start?product=16190784438652&variant=58104606556540&format=json';
const editor = app+'/konfi-demo/variante-c-warenkorb-267/auswahl.html';
const cookieName = 'gravuru_c267_pilot';

// The existing beta gateway authenticates this GET. The cookie only identifies the
// current tester tab's pilot items on its return to the official Shopify storefront.
module.exports = async function variantCTest(req,res,url) {
  const headers = {'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','Vary':'Authorization, Cookie'};
  if(req.method!=='GET'||url.pathname!=='/variante-c/') {
    res.writeHead(404,{...headers,'Content-Type':'text/plain; charset=utf-8'}).end('Diese Testseite gibt es nicht.');
    return;
  }
  try {
    const response=await fetch(start,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('Shopify-Einstieg');
    const ticket=await response.json(), destination=new URL(ticket.url);
    const token=new URLSearchParams(destination.hash.slice(1)).get('s');
    if(destination.origin!==app||destination.pathname!=='/konfigurator/shop/'||!/^gse1\.[\w-]+\.[\w-]+$/.test(token||''))throw Error('Ungültiger Einstieg');
    let test=(req.headers.cookie||'').split(';').map(c=>c.trim()).find(c=>c.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    if(!/^[a-f0-9]{48}$/.test(test||'')) {
      test=randomBytes(24).toString('hex');
      headers['Set-Cookie']=cookieName+'='+test+'; Path=/variante-c/; Max-Age=7200; HttpOnly; Secure; SameSite=Lax';
    }
    headers.Location=editor+'#'+new URLSearchParams({s:token,test});
    res.writeHead(302,headers).end();
  } catch {
    res.writeHead(503,{...headers,'Content-Type':'text/plain; charset=utf-8'}).end('Der geschützte Einstieg ist gerade nicht erreichbar. Bitte erneut öffnen.');
  }
};
