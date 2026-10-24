// B1 „Werkstatt einheitlich“: Klarnamen-Ableitung, Konfi-Status (Freigeben/Pausieren, Ereignisprotokoll,
// Kundenroute gesperrt), Mandantentrennung, Mandantenliste und gemeinsame Kopfzeile aller Werkstattseiten.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {Readable} from 'node:stream';
import {DatabaseSync} from 'node:sqlite';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {categoryLabels} from './category-labels.mjs';
import {createKonfiStatus,isCustomerCapable,PAUSED_MESSAGE} from './konfi-status.mjs';
import {WORKSHOP_PAGES,MAIN_NAVIGATION,MANAGEMENT_NAVIGATION,topbarMarkup,withTopbar,SHELL_START} from './workshop-shell-markup.mjs';
import {createWorkshop} from './http.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';

function fixture(t,prefix){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),prefix)),resources=[];
  // Close dependants before their stores, and every handle before deleting SQLite files.
  t.after(async()=>{for(const resource of [...resources].reverse())await resource.close();fs.rmSync(dir,{recursive:true,force:true});});
  return {dir,own(resource){resources.push(resource);return resource;}};
}
const steelFamily=()=>JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url),'utf8'));

test('Klarnamen: Familie und Formgruppen aus den Familiendaten, unbekannte Kürzel bleiben sichtbar mit Hinweis',()=>{
  const families=[{id:'steel-door-signs',name:'Edelstahl-Türschilder',groups:[{key:'RE',name:'Rechteck'},{key:'QU',name:'Quadrat'},{key:'AB',name:'Abgerundete Ecken R5'},{key:'EL',name:'Ellipse'},{key:'OV',name:'Oval'}]},
    {id:'gedenktafel',name:'Gedenktafel 30 × 20',groups:[{key:'RE',name:'Rechteck'}]},{id:'andere',name:'Andere Reihe',groups:[{key:'AB',name:'Abgeschrägt'}]}];
  const labels=categoryLabels(['familie-steel-door-signs','form-re','form-qu','form-ab','form-el','form-ov','form-xy','familie-geloescht','hausschilder','form-re'],families);
  assert.deepEqual(labels['familie-steel-door-signs'],{label:'Edelstahl-Türschilder',kind:'family',known:true});
  assert.equal(labels['form-re'].label,'Rechteck');assert.equal(labels['form-qu'].label,'Quadrat');assert.equal(labels['form-el'].label,'Ellipse');assert.equal(labels['form-ov'].label,'Oval');
  // Gleiches Kürzel in zwei Familien mit unterschiedlichen Namen: beide Namen, nichts geraten.
  assert.equal(labels['form-ab'].label,'Abgerundete Ecken R5 / Abgeschrägt');
  for(const id of ['form-xy','familie-geloescht']){assert.equal(labels[id].known,false);assert.equal(labels[id].label,id.replaceAll('-',' '));assert.match(labels[id].hint,/Kürzel ohne Klarnamen/);}
  // Vom Händler vergebene Kategorien sind keine Kürzel.
  assert.deepEqual(labels.hausschilder,{label:'hausschilder',kind:'category',known:true});
  assert.equal(Object.keys(labels).length,9);
  assert.equal(categoryLabels(['form-re'],[])['form-re'].known,false);
});

test('Kundenfähig: aktives Produkt; Formprodukt nur mit Design; Mastervorlagen und Archiv nicht',()=>{
  assert.equal(isCustomerCapable({kind:'product',status:'draft',overview:{}}),true);
  assert.equal(isCustomerCapable({kind:'product',status:'draft',overview:{formProduct:true,designCount:0}}),false);
  assert.equal(isCustomerCapable({kind:'product',status:'active',overview:{formProduct:true,designCount:2}}),true);
  assert.equal(isCustomerCapable({kind:'master',status:'draft',overview:{}}),false);
  assert.equal(isCustomerCapable({kind:'product',status:'archived',overview:{}}),false);
});

test('Konfi-Status-Store: Übergänge, Konflikte, unveränderliches Protokoll, je Mandant getrennt',t=>{
  const f=fixture(t,'g27-konfi-'),file=path.join(f.dir,'workshop.sqlite'),a=f.own(createKonfiStatus({filename:file})),b=f.own(createKonfiStatus({filename:file,tenantId:'zweiter'}));
  const id='cfg_'+randomUUID();
  assert.equal(a.get(id).status,'draft');assert.equal(a.paused(id),false);assert.equal(a.paused('kein-produkt'),false);
  assert.throws(()=>a.set(id,{to:'draft',expectedStatus:'draft',productRevision:1,actor:'test'}),{code:'konfi_status_invalid'});
  assert.throws(()=>a.set(id,{to:'released',expectedStatus:'paused',productRevision:1,actor:'test'}),{status:409,code:'konfi_status_conflict'});
  assert.equal(a.set(id,{to:'released',expectedStatus:'draft',productRevision:3,actor:'test'}).status,'released');
  assert.throws(()=>a.set(id,{to:'released',expectedStatus:'released',productRevision:3,actor:'test'}),{code:'konfi_status_unchanged'});
  assert.equal(a.set(id,{to:'paused',expectedStatus:'released',productRevision:3,actor:'test'}).status,'paused');assert.equal(a.paused(id),true);
  assert.deepEqual(a.events(id).map(e=>[e.from,e.to]),[['released','paused'],['draft','released']]);
  // Anderer Mandant: dieselbe Produktkennung ist dort ein Entwurf ohne Verlauf.
  assert.equal(b.get(id).status,'draft');assert.equal(b.paused(id),false);assert.deepEqual(b.events(id),[]);assert.equal(b.all().size,0);
  const db=f.own(new DatabaseSync(file));
  assert.throws(()=>db.exec("UPDATE konfi_status_events SET to_status='released'"),/immutable/);
  assert.throws(()=>db.exec('DELETE FROM konfi_status_events'),/immutable/);
  assert.deepEqual(db.prepare('SELECT DISTINCT tenant_id FROM konfi_status_events').all().map(r=>r.tenant_id),['gravuru']);
});

const jwt=(config,sub='123')=>{
  const now=Math.floor(Date.now()/1000),p={aud:config.clientId,dest:'https://'+config.shopDomain,sub,iss:'https://'+config.shopDomain+'/admin',exp:now+60,nbf:now,iat:now,jti:randomUUID()};
  const input=[{alg:'HS256',typ:'JWT'},p].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
  return 'Bearer '+input+'.'+createHmac('sha256',config.secret).update(input).digest('base64url');
};

test('Konfis über HTTP: Liste mit Klarnamen, Freigeben/Pausieren, Kundenroute mit Meldung gesperrt, Mandanten getrennt',async t=>{
  const f=fixture(t,'g27-konfi-http-'),directory=f.dir;build({outputDirectory:directory});
  const seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0];
  const a={shopDomain:'a-shop.myshopify.com',clientId:'fixture-a',secret:randomBytes(32).toString('hex'),mode:'test-only'},b={shopDomain:'b-shop.myshopify.com',clientId:'fixture-b',secret:randomBytes(32).toString('hex'),mode:'test-only'};
  const w=f.own(createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,shopifySessions:a,tenantOptions:tenant=>tenant.id==='zweiter'?{shopifySessions:b}:null}));
  w.tenants.ensure({id:'zweiter',shopDomain:b.shopDomain,name:'Zweiter Händler'});
  const request=async(pathname,{auth=jwt(a),method='GET',body}={})=>{
    const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);req.method=method;req.headers={'content-type':'application/json',authorization:auth};
    if(method!=='GET'){const s=await request('/api/workshop/session',{auth});req.headers['x-gravuru-csrf']=s.body.csrfToken;}
    const res={headersSent:false,writeHead(status){this.status=status;this.headersSent=true;return this;},end(bytes){this.body=JSON.parse(Buffer.from(bytes).toString());}};
    try {await w.handle(req,res,new URL(pathname,'http://127.0.0.1'));return res;} finally {req.destroy();}
  };
  // Familie „Edelstahl-Türschilder“ übernehmen und zwei Produkte erzeugen (wie über die Schaltfläche).
  const family=(await request('/api/workshop/families',{method:'POST',body:{bundled:'steel-door-signs'}})).body;
  assert.equal(family.name,'Edelstahl-Türschilder');
  const sizes=steelFamily().sizes,wanted=[sizes.find(s=>s.groupKey==='RE'),sizes.find(s=>s.groupKey==='OV')];
  const generated=w.families.generate(family.id,{expectedRevision:family.revision,sizeKeys:wanted.map(s=>s.key)});assert.equal(generated.created,2);
  const [rect,oval]=generated.products.map(p=>p.productId);
  // Produktliste: Klarnamen statt „familie steel door signs“ / „form re“; Kennungen unverändert gespeichert.
  const catalog=(await request('/api/workshop/products?catalog=1&kind=product')).body;
  assert.equal(catalog.categoryLabels['familie-steel-door-signs'].label,'Edelstahl-Türschilder');
  assert.equal(catalog.categoryLabels['form-re'].label,'Rechteck');assert.equal(catalog.categoryLabels['form-ov'].label,'Oval');
  assert.deepEqual(w.repository.get(rect).document.categoryIds,['familie-steel-door-signs','form-re']);
  // Konfis: beide Produkte, die Mastervorlage nicht; alle als Entwurf, nicht mit dem Shop verknüpft.
  let list=(await request('/api/workshop/konfis')).body;
  assert.deepEqual(list.counts,{all:2,draft:2,released:0,paused:0});
  assert.ok(list.konfis.every(k=>k.shop.state==='unlinked'&&k.family.label==='Edelstahl-Türschilder'&&k.customerPath==='/?configuration='+k.id));
  assert.ok(!list.konfis.some(k=>k.id===w.defaultId));
  assert.equal((await request('/api/workshop/konfis/'+w.defaultId+'/status',{method:'POST',body:{status:'released',expectedStatus:'draft'}})).body.error.code,'konfi_not_capable');
  assert.equal((await request('/api/workshop/konfis/'+rect+'/status',{method:'POST',body:{status:'released',expectedStatus:'draft',extra:1}})).status,422);
  // Freigeben, dann Pausieren (mit erwartetem Status), Verlauf mit Akteur der Händlersitzung.
  const released=await request('/api/workshop/konfis/'+rect+'/status',{method:'POST',body:{status:'released',expectedStatus:'draft'}});
  assert.equal(released.status,200);assert.equal(released.body.status.status,'released');
  assert.equal((await request('/api/workshop/konfis/'+rect+'/status',{method:'POST',body:{status:'paused',expectedStatus:'draft'}})).status,409);
  const paused=await request('/api/workshop/konfis/'+rect+'/status',{method:'POST',body:{status:'paused',expectedStatus:'released'}});
  assert.equal(paused.body.status.status,'paused');
  const events=(await request('/api/workshop/konfis/'+rect+'/events')).body.events;
  assert.deepEqual(events.map(e=>e.to),['paused','released']);assert.equal(events[0].actor,'merchant:123');assert.equal(events[0].productRevision,1);
  list=(await request('/api/workshop/konfis?status=paused')).body;assert.deepEqual(list.konfis.map(k=>k.id),[rect]);assert.deepEqual(list.counts,{all:2,draft:1,released:0,paused:1});
  // Kundenrouten: pausiert → 423 mit verständlicher Meldung; der andere Konfi bleibt erreichbar.
  assert.throws(()=>w.model(rect),{status:423,code:'konfi_paused',message:PAUSED_MESSAGE});
  assert.equal(w.model(oval).configuration.id,oval);
  const acrylic=await request('/api/workshop/acrylic-drafts',{method:'POST',body:{input:{productId:rect,productRevision:1}}});
  assert.equal(acrylic.status,423);assert.equal(acrylic.body.error.message,PAUSED_MESSAGE);
  // Werkstatt bleibt nutzbar: Produkt lesen, Vorschau der Werkstatt.
  assert.equal((await request('/api/workshop/products/'+rect)).status,200);
  // Mandantentrennung: der zweite Mandant sieht weder Konfis noch Status noch die Mandantenliste.
  const other=jwt(b);
  assert.deepEqual((await request('/api/workshop/konfis',{auth:other})).body.counts,{all:0,draft:0,released:0,paused:0});
  assert.equal((await request('/api/workshop/konfis/'+oval+'/status',{auth:other,method:'POST',body:{status:'paused',expectedStatus:'draft'}})).status,404);
  assert.equal((await request('/api/workshop/konfis/'+rect+'/events',{auth:other})).status,404);
  assert.equal((await request('/api/workshop/tenants',{auth:other})).status,404);
  assert.equal(w.forTenant('zweiter').konfis.paused(rect),false);assert.equal(w.konfis.get(oval).status,'draft');
  // Mandantenliste (nur Standardmandant): Name, Anzahl Konfis/Produkte; Anlegen folgt mit dem Abo-Modell.
  const tenants=(await request('/api/workshop/tenants')).body;
  const own=tenants.tenants.find(x=>x.id==='gravuru');
  assert.deepEqual({konfis:own.konfis,products:own.products,paused:own.paused,released:own.released,primary:own.primary},{konfis:2,products:2,paused:1,released:0,primary:true});
  assert.deepEqual(tenants.tenants.find(x=>x.id==='zweiter'),{...tenants.tenants.find(x=>x.id==='zweiter'),konfis:0,products:0});
  assert.deepEqual(tenants.create,{available:false,reason:'Mandant anlegen folgt mit dem Abo-Modell.'});
  assert.equal((await request('/api/workshop/tenants',{method:'POST',body:{}})).status,405);
});

test('Kundenseite: pausierter Konfi zeigt Hinweis statt Editor, models.json liefert die Meldung als JSON',async t=>{
  const f=fixture(t,'g27-konfi-page-'),directory=f.dir;build({outputDirectory:directory});
  const seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0];
  const w=f.own(createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy}));
  const server=createPreviewServer({outputDirectory:directory,workshop:w});
  f.own({async close(){if(server.listening)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const port=server.address().port;
  const get=url=>new Promise((resolve,reject)=>{http.get({host:'127.0.0.1',port,path:url},res=>{const c=[];res.on('data',b=>c.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(c).toString()}));}).on('error',reject);});
  const product=w.repository.copy(w.defaultId,{expectedRevision:1,name:'Acrylglas · Pausentest',kind:'product'});
  assert.equal((await get('/?configuration='+product.id)).status,200);
  assert.equal((await get('/models.json?configuration='+product.id)).status,200);
  w.konfis.set(product.id,{to:'paused',expectedStatus:'draft',productRevision:product.revision,actor:'test'});
  const page=await get('/?configuration='+product.id);
  assert.equal(page.status,423);assert.match(page.headers['content-type'],/text\/html/);assert.match(page.body,/Acrylglas · Pausentest ist gerade pausiert/);assert.ok(page.body.includes(PAUSED_MESSAGE));assert.ok(!page.body.includes('<script'));
  for(const route of ['/form-editor.html','/konfigurator/form'])assert.equal((await get(route+'?configuration='+product.id)).status,423);
  const model=await get('/models.json?configuration='+product.id);
  assert.equal(model.status,423);assert.deepEqual(JSON.parse(model.body).error,{code:'konfi_paused',message:PAUSED_MESSAGE});
  // Ohne Konfigurations-ID oder für andere Produkte: unverändert.
  assert.equal((await get('/')).status,200);assert.equal((await get('/models.json')).status,200);
  for(const route of ['/werkstatt/konfis/','/werkstatt/mandanten/','/workshop-ui/konfis-ui.mjs','/workshop-ui/tenants-ui.mjs','/workshop-ui/konfis.css','/workshop-ui/editor-icons/adjustments-horizontal.svg'])assert.equal((await get(route)).status,200,route);
});

test('Werkstatt einheitlich: jede Werkstattseite trägt dieselbe erzeugte Kopfzeile und das gemeinsame Raster',()=>{
  const ui=new URL('./ui/',import.meta.url),files=new Set(fs.readdirSync(ui).filter(f=>f.endsWith('.html')));
  // Kundenseiten bekommen bewusst keine Werkstatt-Kopfzeile.
  const customerPages=new Set(['form-customer.html','form-variant-picker.html','customer-preview.html','shop-entry.html']);
  assert.deepEqual([...files].filter(f=>!customerPages.has(f)).sort(),WORKSHOP_PAGES.map(p=>p.file).sort());
  for(const page of WORKSHOP_PAGES){
    const html=fs.readFileSync(new URL(page.file,ui),'utf8');
    assert.equal(withTopbar(html,page),html,page.file+' ist nicht mit workshop-shell-markup.mjs abgeglichen (node scripts/workshop-shell-sync.mjs).');
    assert.equal(html.split(SHELL_START).length,2,page.file);
    assert.match(html,/<body class="[^"]*\bws-page\b/,page.file);assert.match(html,/<main id="main"/,page.file);
    assert.ok(html.includes('/workshop-ui/workshop-shell.css')&&html.includes('/workshop-ui/workshop-shell.mjs'),page.file);
    assert.ok(!html.includes('class="sidebar"'),page.file+' hat noch die alte Seitenleiste.');
    for(const n of [...MAIN_NAVIGATION,...MANAGEMENT_NAVIGATION])assert.ok(html.includes(n.label.replace('&','&amp;')),page.file+': '+n.label);
  }
  for(const file of customerPages)assert.ok(!fs.readFileSync(new URL(file,ui),'utf8').includes(SHELL_START),file);
  const nav=topbarMarkup('konfis');assert.match(nav,/href="\/werkstatt\/konfis\/" aria-current="page"/);assert.ok(nav.includes('gravuru</em> werkstatt'));
  assert.match(topbarMarkup('mandanten'),/<summary class="ws-current">Verwaltung<\/summary>/);
  assert.match(topbarMarkup('produkte',{spa:true}),/data-view="products" aria-pressed="true"/);
  assert.throws(()=>topbarMarkup('unbekannt'),TypeError);
});
