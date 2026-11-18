import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compile,here,importFiles,inspectFile} from '../catalog.mjs';
import {openStore} from '../store.mjs';
import {readOrder,proxyShop} from '../shopify.mjs';
import {merchantImport} from '../merchant-server.mjs';
import {DEMO_PRODUCT,DEMO_SHOP,DEMO_VARIANT,createServer} from '../server.mjs';

const sample=importFiles([here('../designs/steel-heimathafen/source.json')]);
const index=JSON.parse(sample.index), shop=DEMO_SHOP, variant=DEMO_VARIANT;
const first=JSON.parse(sample.assets.get(index[0].key)).design;
const context=()=>({variant,revision:sample.revision,design:first.id,edits:{[first.objects[1].key]:'Müller'},request:randomUUID()});
const setup=t=>{const db=openStore(':memory:');t.after(()=>db.close());db.publish(shop,DEMO_PRODUCT,variant,sample);return db;};
function order(job){return {id:'101',name:'#101',status:'PAID',lines:[{id:'11',product:DEMO_PRODUCT,variant,quantity:2,job}]};}

test('zwei Bestandsvorlagen, sechs Originaltexte, vier Schriften, Anker und Leuchtturm',()=>{
  const source=JSON.parse(fs.readFileSync(here('../designs/steel-heimathafen/source.json'),'utf8'));
  assert.equal(index.length,2);const faces=new Set();
  for(const [i,e] of index.entries()){
    const {design,faces:fontMap}=JSON.parse(sample.assets.get(e.key));
    assert.deepEqual([e.id,e.width,e.height],[source.designs[i].id,90,60]);
    assert.deepEqual(design.objects.filter(o=>o.type==='text').map(o=>[o.text,o.font,o.x,o.y]),source.designs[i].state.objects.filter(o=>o.type==='text').map(o=>[o.text,o.font,o.x,o.y]));
    assert.equal(design.objects[0].motif,source.designs[i].state.objects[0].motif);
    assert(design.objects[0].paths.length>0);Object.keys(fontMap).forEach(f=>faces.add(f));
  }
  assert.equal(faces.size,4);
});
test('wiederholtes Sichern, alte Revisionen, zwei Shops und Ungültigkeit einer falschen Variante',async t=>{
  const db=setup(t),data=context(),job=db.save(shop,data);
  assert.deepEqual(db.save(shop,data),job);
  assert.throws(()=>db.save(shop,{...data,edits:{}}),/belegt/);
  assert.throws(()=>db.save(shop,{...data,request:randomUUID(),edits:{fremd:'Text'}}),/Unbekannt/);
  assert.throws(()=>db.save(shop,{...data,request:randomUUID(),edits:{[first.objects[1].key]:'🧪'}}),/Zeichen/);
  assert.throws(()=>db.save(shop,{...data,photo:randomUUID(),request:randomUUID()}),/Fotofeld/);
  assert.throws(()=>db.asset('fremd.myshopify.com',index[0].key),/fehlt/);
  assert.equal(db.receive(shop,order(job.id)),1);
  const original=await db.download(shop,'101','11','pdf');
  const another=JSON.parse(sample.assets.get(index[0].key));another.design.name+=' – neu';
  for(const m of another.design.motifs)m.paths=JSON.parse(sample.assets.get(m.key));
  const fonts=Object.fromEntries(Object.entries(another.faces).map(([k,v])=>[k,{regular:JSON.parse(sample.assets.get(v.regular.full))}]));
  const changed=compile([another.design],{fonts});
  db.publish(shop,DEMO_PRODUCT,variant,changed);db.publish('fremd.myshopify.com',DEMO_PRODUCT,variant,sample);
  assert.throws(()=>db.receive('fremd.myshopify.com',order(job.id)),/passen/);
  const wrong=order(job.id);wrong.lines[0].variant='999';
  assert.throws(()=>db.receive(shop,wrong),/passen/);
  assert.equal(db.orders(shop).length,1);
  assert.deepEqual((await db.download(shop,'101','11','pdf')).bytes,original.bytes);
  assert.throws(()=>db.save(shop,{...data,request:randomUUID()}),/aktualisiert/);
  assert.equal(db.receive(shop,order(job.id)),1);assert.equal(db.orders(shop).length,1);
  const cancelled=order(job.id);cancelled.cancelled=true;cancelled.updatedAt='2026-11-18T10:00:00Z';db.receive(shop,cancelled);
  assert.throws(()=>db.receive(shop,{...order(job.id),updatedAt:'2026-11-18T09:58:00Z'}),/neuerer/);
  await assert.rejects(db.download(shop,'101','11','pdf'),/Keine aktive/);
});
test('Corel-kompatibles mm-SVG mit Kurvenkontur, Loch, Originalfont und gebundenem Foto',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-svg-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'Eigener-Entwurf.svg');
  const content='<svg xmlns="http://www.w3.org/2000/svg" id="bogen" width="70mm" height="40mm" viewBox="0 0 70 40"><g id="CutContour"><path d="M2 0 H68 Q70 0 70 2 V38 Q70 40 68 40 H2 Q0 40 0 38 V2 Q0 0 2 0 Z"/><path d="M4 15 A2 2 0 1 0 8 15 A2 2 0 1 0 4 15 Z"/></g><rect data-studio-photo="true" x="12" y="5" width="19" height="25"/><text id="name" x="44" y="19" font-size="4" font-family="Lora" text-anchor="middle">Anna</text></svg>';
  fs.writeFileSync(file,content);const pack=importFiles([file]),db=setup(t);
  db.publish(shop,'888','777',pack);
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const base={variant:'777',revision:pack.revision,design:'bogen'},photo=await db.upload(shop,{...base,original:png});
  const {id}=db.save(shop,{...base,photo:photo.id,edits:{name:'Müller'},request:randomUUID()});
  const o=order(id);o.lines[0].variant='777';o.lines[0].product='888';db.receive(shop,o);
  const svg=(await db.download(shop,'101','11','svg')).bytes.toString();
  assert.match(svg,/data:image\/png;base64,/);assert.match(svg,/Q70 0 70 2/);assert.match(svg,/A2 2/);
  assert.equal((await db.download(shop,'101','11','original')).bytes.toString('base64'),png.split(',')[1]);
  assert.match((await db.download(shop,'101','11','pdf')).bytes.toString('latin1'),/\/CutContour/);
  db.publish(shop,'888','778',pack);
  assert.throws(()=>db.save(shop,{...base,variant:'778',photo:photo.id,edits:{},request:randomUUID()}),/Foto/);
  fs.writeFileSync(file,content.replace('CutContour','Unklar'));assert.throws(()=>importFiles([file]),/Schnittpfad fehlt|Schnittpfad.*fehlt/);
  fs.writeFileSync(file,content.replace('Q0 0 2 0 Z','Q0 0 2 0'));assert.throws(()=>importFiles([file]),/geschlossen/);
});
test('FPD-Vorstufe unterscheidet Originaltexte, Motivbilder und kundenseitige Fotozone',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-fpd-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'product.json');
  fs.writeFileSync(file,JSON.stringify({title:'Altarchiv',views:[{title:'Vorderseite',elements:[{type:'text',title:'Name',source:'Anna',parameters:{fontFamily:'Lora'}},{type:'image',title:'Foto',source:'file.png',parameters:{uploadZone:true}},{type:'image',title:'Druckmotiv',source:'art.png',parameters:{}}]}]}));
  const data=inspectFile(file);
  assert.equal(data.status,'review');assert.deepEqual(data.views[0].texts[0],{title:'Name',text:'Anna',font:'Lora'});
  assert.deepEqual(data.views[0].layers.map(l=>l.photo),[true,false]);
});
test('Motiv kann ersetzt, verschoben und entfernt werden; die gekaufte Platzierung erreicht die Produktion',async t=>{
  const db=setup(t),id=first.objects[0].id,other=first.motifs.find(m=>m.id!==first.objects[0].motif).id;
  const moved=db.save(shop,{...context(),motifs:{[id]:{choice:other,x:33,y:25}}});
  db.receive(shop,order(moved.id));const chosen=await db.download(shop,'101','11','svg');
  const meta=JSON.parse((await db.download(shop,'101','11','json')).bytes);
  assert.equal(meta.motifs[id].choice,other);assert.equal(meta.motifs[id].x,33);
  const skipped=db.save(shop,{...context(),motifs:{[id]:{choice:'none'}}});
  const next=order(skipped.id);next.id='102';db.receive(shop,next);
  assert(chosen.bytes.length>(await db.download(shop,'102','11','svg')).bytes.length);
  assert.throws(()=>db.save(shop,{...context(),motifs:{[id]:{choice:'unbekannt'}}}),/Originalmotiv/);
});
test('Händlerprüfung führt den Import außerhalb des Kundenprozesses aus und bindet nur die geprüfte Revision',async t=>{
  const db=setup(t);
  const file={name:'Heimathafen.json',bytes:fs.readFileSync(here('../designs/steel-heimathafen/source.json')).toString('base64')};
  const staged=await merchantImport(db,shop,file,false);
  assert.equal(staged.count,2);assert.equal(staged.revision,sample.revision);
  const data={...file,product:'999',variant:'998',expected:'alt'};
  await assert.rejects(merchantImport(db,shop,data,true),/erneut prüfen/);
  assert.throws(()=>db.binding(shop,'998'),/keine Gestaltung/);
  await merchantImport(db,shop,{...data,expected:staged.revision},true);
  assert.equal(db.binding(shop,'998').revision,staged.revision);
});
test('GraphQL paginiert, prüft Revisionen und schreibt erst nach einem vollständigen Abruf',async()=>{
  const gid=(kind,id)=>'gid://shopify/'+kind+'/'+id;
  let n=0;
  const call=async(url,options)=>{
    const vars=JSON.parse(options.body).variables;
    assert.equal(url,'https://'+shop+'/admin/api/2026-10/graphql.json');assert.equal(vars.after,n?'next':null);
    const id=String(++n);
    return Response.json({data:{order:{id:gid('Order','101'),name:'#101',updatedAt:'v1',cancelledAt:null,displayFinancialStatus:'PAID',lineItems:{nodes:[{id:gid('LineItem',id),currentQuantity:2,product:{id:gid('Product',DEMO_PRODUCT)},variant:{id:gid('ProductVariant',variant)},customAttributes:[{key:'_gravuru_studio',value:'design'+id}]}],pageInfo:{hasNextPage:n===1,endCursor:n===1?'next':'last'}}}}});
  };
  const result=await readOrder(shop,'test','101',call);assert.deepEqual(result.lines.map(x=>x.job),['design1','design2']);
  await assert.rejects(readOrder(shop,'test','101',async()=>Response.json({errors:[{}]})),/Abfragefehler/);
});
test('Proxy und Werkstatt-API trennen öffentliche Gestaltung von privatem Export',async t=>{
  const secret='fixture',now=1777000000000;
  const params=new URLSearchParams({timestamp:String(now/1000),shop,path_prefix:'/apps/gravuru-studio',logged_in_customer_id:''});
  const sign=[...params].map(([k,v])=>k+'='+v).sort().join('');
  params.set('signature',createHmac('sha256',secret).update(sign).digest('hex'));
  assert.equal(proxyShop(params,secret,now),shop);params.set('shop','zweiter.myshopify.com');
  assert.throws(()=>proxyShop(params,secret,now),/Signatur/);
  const db=setup(t);const server=createServer(db,{shop,opsToken:'werkstatt',secret});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>new Promise(r=>server.close(r)));
  const base='http://127.0.0.1:'+server.address().port;
  assert.equal((await fetch(base+'/api/orders')).status,401);
  assert.equal((await fetch(base+'/studio/catalog?variant=90002')).status,403);
  assert.deepEqual(await (await fetch(base+'/api/orders',{headers:{Authorization:'Bearer werkstatt'}})).json(),[]);
});
