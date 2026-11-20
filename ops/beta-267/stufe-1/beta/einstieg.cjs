const {randomBytes} = require('node:crypto');

const shopStart = new URL('https://gravuru-design.myshopify.com/apps/konfigurator/start');
shopStart.search = new URLSearchParams({product:'16190784438652', variant:'58104606556540', format:'json'});

const appOrigin = 'https://app-2027.gravuru-designwerkstatt.de';
const previewPath = '/konfi-demo/prio-claude-stufe1-267/prio.html';
const route = '/prio-stufe-1/';
const cookieName = 'gravuru_r15_stufe1';

// The common gateway has already authenticated the caller. Only the independent
// pilot marker is reused. Each entry obtains its own signed R15 shop session.
module.exports = async function openStageOne(req, res, url) {
  const headers = {
    'Cache-Control':'private, no-store',
    'Referrer-Policy':'no-referrer',
    'X-Robots-Tag':'noindex, nofollow',
    Vary:'Authorization, Cookie'
  };
  if (req.method !== 'GET' || url.pathname !== route) {
    res.writeHead(404,{...headers,'Content-Type':'text/plain; charset=utf-8'}).end('Diese Testseite gibt es nicht.');
    return;
  }

  try {
    const response = await fetch(shopStart,{
      headers:{Accept:'application/json'}, redirect:'error', signal:AbortSignal.timeout(30000)
    });
    if (!response.ok) throw Error('Shop-Einstieg fehlgeschlagen');
    const ticket = await response.json();
    const issued = new URL(ticket.url);
    const session = new URLSearchParams(issued.hash.slice(1)).get('s');
    if (issued.origin !== appOrigin || issued.pathname !== '/konfigurator/shop/' || !/^gse1\.[\w-]+\.[\w-]+$/.test(session || '')) {
      throw Error('Unerwartete Freigabe');
    }

    const prefix = cookieName+'=';
    const cookies = (req.headers.cookie || '').split(';').map(cookie=>cookie.trim());
    let test = cookies.find(cookie=>cookie.startsWith(prefix))?.slice(prefix.length);
    if (!/^[a-f0-9]{48}$/.test(test || '')) {
      test = randomBytes(24).toString('hex');
      headers['Set-Cookie'] = `${prefix}${test}; Path=${route}; Max-Age=7200; HttpOnly; Secure; SameSite=Lax`;
    }
    const target = new URL(previewPath,appOrigin);
    target.hash = new URLSearchParams({s:session,test}).toString();
    res.writeHead(302,{...headers, Location:target.href}).end();
  } catch {
    res.writeHead(503,{...headers,'Content-Type':'text/plain; charset=utf-8'}).end('Der geschützte Prio-Test ist gerade nicht erreichbar. Bitte erneut öffnen.');
  }
};
