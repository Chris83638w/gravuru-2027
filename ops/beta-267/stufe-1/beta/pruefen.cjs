const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createHash} = require('node:crypto');
const path = require('node:path');
const entry = require('./einstieg.cjs');

const beta = 'https://konfi-beta.gravuru-designwerkstatt.de';
const app = 'https://app-2027.gravuru-designwerkstatt.de';
const signer = 'https://gravuru-design.myshopify.com/apps/konfigurator/start?product=16190784438652&variant=58104606556540&format=json';
const ticket = `${app}/konfigurator/shop/#s=gse1.unit.signature`;
let nextURL = ticket;
let calls = 0;
global.fetch = async (url,opts)=>{
  calls++;
  assert.equal(String(url),signer);
  assert.deepEqual(opts.headers,{Accept:'application/json'});
  assert.equal(opts.redirect,'error');
  return {ok:true,json:async()=>({url:nextURL})};
};

async function request(method='GET',pathname='/prio-stufe-1/',cookie='') {
  const result = {};
  const res = {writeHead(status,headers){Object.assign(result,{status,headers});return this;},end(){}};
  await entry({method,headers:{cookie}},res,new URL(pathname,beta));
  return result;
}

(async()=>{
  assert.equal((await request('POST')).status,404);
  assert.equal((await request('GET','/variante-c/')).status,404);
  assert.equal(calls,0);
  const first = await request('GET','/prio-stufe-1/','gravuru_c267_pilot='+'a'.repeat(48));
  assert.equal(first.status,302);
  assert.equal(first.headers['Cache-Control'],'private, no-store');
  const dest = new URL(first.headers.Location);
  assert.equal(dest.origin+dest.pathname,app+'/konfi-demo/prio-claude-stufe1-267/prio.html');
  assert.equal(dest.search,'');
  const args = new URLSearchParams(dest.hash.slice(1));
  assert.deepEqual([...args.keys()],['s','test']);
  assert.equal(args.get('s'),'gse1.unit.signature');
  assert.match(args.get('test'),/^[a-f0-9]{48}$/);
  assert.notEqual(args.get('test'),'a'.repeat(48));
  const setCookie = first.headers['Set-Cookie'];
  assert.match(setCookie,/^gravuru_r15_stufe1=[a-f0-9]{48}; Path=\/prio-stufe-1\/; Max-Age=7200; HttpOnly; Secure; SameSite=Lax$/);
  const back = await request('GET','/prio-stufe-1/',setCookie.split(';')[0]);
  assert.equal(back.headers.Location,first.headers.Location);
  assert.equal(back.headers['Set-Cookie'],undefined);
  nextURL = app+'/wrong/#s=gse1.test.signature';
  assert.equal((await request()).status,503);
  nextURL = ticket.replace('gse1.unit.signature','ungueltig');
  assert.equal((await request()).status,503);

  const current = fs.readFileSync(path.join(__dirname,'hosted-stufe1.cjs'),'utf8');
  const added = current.split('\n').filter(line=>line.includes('./prio-claude-stufe1/einstieg.cjs'));
  assert.equal(added.length,1);
  const original = current.replace(added[0]+'\n','');
  assert.equal(createHash('sha256').update(original).digest('hex'),'7422443a01abb66e9a031bf00cc5361fdb7a5159a82498fdd00231d0bf567953');
  assert(current.indexOf('WWW-Authenticate')<current.indexOf(added[0]));
  console.log('Produkt, Sitzung, getrennte Cookies, Rückkehr, Fehlerfälle und unveränderte C-Route geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1;});
