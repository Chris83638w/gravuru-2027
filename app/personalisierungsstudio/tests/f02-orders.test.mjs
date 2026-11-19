import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile,here,importFiles,nativeDesigns} from '../catalog.mjs';
import {workshopResources} from '../../workshop/catalog.mjs';
import {F02_SHOP} from '../f02-line.mjs';
import {openStore} from '../store.mjs';
import {downloadShopifyFile,readOrder,syncF02Orders} from '../shopify.mjs';
import {createServer} from '../server.mjs';

const pack=importFiles([here('../designs/steel-heimathafen/source.json')]);
const binding={shop:F02_SHOP,product:'70001',variant:'90002',sku:'T260-TEST',revision:pack.revision,unitCents:1099};
const catalog=JSON.parse(pack.index);
const gid=(type,id)=>'gid://shopify/'+type+'/'+id;
const orderId='1001';
const stamp='2026-11-18T10:00:00Z';
const later='2026-11-18T10:01:00Z';
const pageInfo={hasNextPage:false,endCursor:null};

function lineProperties(design,name,ref) {
  const value={version:1,revision:binding.revision,design:design.id,edits:{[design.field]:name},motifs:{}};
  const parts=Buffer.from(JSON.stringify(value)).toString('base64').match(/.{1,176}/g);
  return [{key:'_gravuru_ref',value:ref},{key:'_gravuru_parts',value:String(parts.length)},
    ...parts.map((part,i)=>({key:'_gravuru_data_'+i,value:part}))];
}
const designs=catalog.map(item=>{
  const {design}=JSON.parse(pack.assets.get(item.key));
  return {id:design.id,field:design.objects.find(o=>o.type==='text').key};
});
const names=['Küstenhochzeit','Grüße vom Leuchtturm'];
function order() {
  return {id:gid('Order',orderId),name:'#Probe',test:true,cancelledAt:null,updatedAt:stamp,displayFinancialStatus:'PAID',
    lineItems:{pageInfo,nodes:designs.map((design,i)=>({
      id:gid('LineItem',String(11+i)),currentQuantity:i+1,product:{id:gid('Product',binding.product)},
      variant:{id:gid('ProductVariant',binding.variant)},originalUnitPriceSet:{shopMoney:{amount:'10.99',currencyCode:'EUR'}},
      customAttributes:lineProperties(design,names[i],randomUUID())
    }))}};
}
const response=o=>Response.json({data:{order:o}});
function reader(read) {
  let calls=0;
  return async(url,options)=>{
    assert.equal(url,'https://'+F02_SHOP+'/admin/api/2026-10/graphql.json');
    assert.equal(options.method,'POST');
    assert.equal(options.redirect,'error');
    assert.equal(options.cache,'no-store');
    const {variables}=JSON.parse(options.body);
    assert.equal(variables.id,gid('Order',orderId));
    return read(++calls,variables.after);
  };
}
function setup(t) {
  const store=openStore(':memory:');
  store.publish(F02_SHOP,binding.product,binding.variant,pack);
  t.after(()=>store.close());
  return store;
}
const get=(store,id,format,call)=>downloadShopifyFile(store,F02_SHOP,'test',orderId,id,format,call,binding);

test('F02 ordnet zwei Version-1-Gestaltungen positionsgenau zu, auch nach neuer Freigabe und Neustart',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'studio-p1-'));
  const database=join(dir,'test.sqlite');
  let store=openStore(database);
  try {
    store.publish(F02_SHOP,binding.product,binding.variant,pack);
    const original=order();
    const call=reader(()=>response(original));
    const paid=await readOrder(F02_SHOP,'test',orderId,call,binding);
    const pending=structuredClone(paid);
    pending.status='PENDING';
    pending.updatedAt='2026-11-18T09:59:00Z';
    assert.equal(store.receive(F02_SHOP,pending,binding),0);
    assert.deepEqual(store.orders(F02_SHOP),[]);

    // The first paid import happens after this variant has received another catalog.
    const source=JSON.parse(readFileSync(here('../designs/steel-heimathafen/source.json'),'utf8'));
    for(const item of source.designs){
      const text=item.state.objects.find(o=>o.type==='text');
      text.text='Neue Vorlage';
      text.x+=5;
    }
    const resources=workshopResources();
    const next=compile(nativeDesigns(source,resources),resources);
    assert.notEqual(next.revision,pack.revision);
    store.publish(F02_SHOP,binding.product,binding.variant,next);
    const files=[];
    for(const [i,id] of ['11','12'].entries()){
      const json=JSON.parse((await get(store,id,'json',call)).bytes);
      assert.equal(json.design,designs[i].id);
      assert.equal(json.edits[designs[i].field],names[i]);
      assert.equal(json.positionReference,original.lineItems.nodes[i].customAttributes[0].value);
      assert.equal(json.revision,pack.revision);
      assert.equal(json.product,binding.product);
      assert.equal(json.quantity,i+1);
      const svg=(await get(store,id,'svg',call)).bytes;
      const pdf=(await get(store,id,'pdf',call)).bytes;
      assert.match(svg.toString(),/id="CutContour"/);
      assert.match(pdf.toString('latin1'),/\/CutContour/);
      files.push({svg,pdf});
    }
    assert.notDeepEqual(files[0].svg,files[1].svg);
    assert.notDeepEqual(files[0].pdf,files[1].pdf);
    store.close();
    store=openStore(database);
    for(const [i,id] of ['11','12'].entries()){
      for(const fmt of ['svg','pdf']) assert.deepEqual((await get(store,id,fmt,call)).bytes,files[i][fmt]);
    }
    assert.equal(store.orders(F02_SHOP).length,2);
    const swapped=structuredClone(original);
    swapped.lineItems.nodes.reverse().forEach((node,i)=>{node.id=gid('LineItem',String(11+i));});
    await assert.rejects(get(store,'11','pdf',reader(()=>response(swapped))),/Gestaltung der Bestellposition/);
  } finally {
    store.close();
    for(const suffix of ['','-wal','-shm']) rmSync(database+suffix,{force:true});
    rmdirSync(dir);
  }
});

test('F02 gibt auch schon erzeugte Dateien nur nach zwei vollständigen Bestätigungen zurück',async t=>{
  const store=setup(t),stable=order();
  let call=reader(()=>response(stable));
  const cached=await get(store,'11','pdf',call);
  assert.ok(cached.bytes.length>0);
  const cases=[
    ['ausstehend',o=>o.displayFinancialStatus='PENDING'],
    ['erstattet',o=>o.displayFinancialStatus='REFUNDED'],
    ['teilweise erstattet',o=>o.displayFinancialStatus='PARTIALLY_REFUNDED'],
    ['storniert',o=>o.cancelledAt=later],
    ['entfernt',o=>o.lineItems.nodes.splice(0,1)],
    ['Menge null',o=>o.lineItems.nodes[0].currentQuantity=0],
    ['Menge geändert',o=>o.lineItems.nodes[0].currentQuantity=3],
    ['weitere Bestelländerung',o=>o.updatedAt=later],
    ['Preis abweichend',o=>o.lineItems.nodes[0].originalUnitPriceSet.shopMoney.amount='10.98'],
    ['andere Währung',o=>o.lineItems.nodes[0].originalUnitPriceSet.shopMoney.currencyCode='USD'],
    ['Livebestellung',o=>o.test=false],
    ['Stornostatus fehlt',o=>delete o.cancelledAt],
    ['Seitenstatus fehlt',o=>delete o.lineItems.pageInfo.hasNextPage],
    ['fehlendes Datenstück',o=>o.lineItems.nodes[0].customAttributes.pop()],
    ['gleiche Positionsreferenz',o=>o.lineItems.nodes[1].customAttributes[0].value=o.lineItems.nodes[0].customAttributes[0].value],
    ['falsche Variante',o=>o.lineItems.nodes[0].variant.id=gid('ProductVariant','100')],
    ['doppelte Shopify-Zeile',o=>o.lineItems.nodes[1].id=o.lineItems.nodes[0].id],
    ['vermischte Formate',o=>o.lineItems.nodes[0].customAttributes.push({key:'_gravuru_studio',value:randomUUID()})]
  ];
  for(const [label,change] of cases){
    await t.test(label,async t=>{
      const db=setup(t);
      assert.deepEqual((await get(db,'11','pdf',reader(()=>response(stable)))).bytes,cached.bytes);
      let reads=0;
      const fault=reader(n=>{
        reads++;
        const current=structuredClone(stable);
        if(n===2) change(current);
        return response(current);
      });
      await assert.rejects(get(db,'11','pdf',fault));
      assert.equal(reads,2);
    });
  }
  for(const [label,error] of [
    ['HTTP 403',()=>new Response(null,{status:403})],
    ['HTTP 429',()=>new Response(null,{status:429})],
    ['GraphQL-Teilantwort',()=>Response.json({data:{order:stable},errors:[{message:'Test'}]})],
    ['Netzfehler',()=>{throw Error('offline');}]
  ]){
    await t.test(label,async()=> {
      await assert.rejects(get(store,'11','pdf',reader(n=>n===1?response(stable):error())));
    });
  }
  let called=false;
  await assert.rejects(readOrder('other.myshopify.com','test',orderId,async()=>{called=true;},binding),/F02-Freigabe/);
  assert.equal(called,false);
});

test('Werkstatt-HTTP liefert nach einer Erstattung vor Ausgabe keine Datei; beide Shopify-Seiten gehören zum selben Stand',async t=>{
  const store=setup(t),original=order();
  let checks=0,denied=false;
  const call=reader((_n,cursor)=>{
    if(!cursor) checks++;
    const head=structuredClone(original);
    if(denied && checks>=2){head.displayFinancialStatus='REFUNDED';head.updatedAt=later;}
    head.lineItems.nodes=[head.lineItems.nodes[cursor?1:0]];
    head.lineItems.pageInfo={hasNextPage:!cursor,endCursor:cursor?null:'zweite'};
    return response(head);
  });
  const server=createServer(store,{shop:F02_SHOP,opsToken:'local-qa',shopifyToken:'fake',shopifyFetch:call,f02:binding});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port+'/api/orders/'+orderId+'/lines/12/pdf';
  const options={headers:{authorization:'Bearer local-qa'}};
  const allowed=await fetch(url,options);
  assert.equal(allowed.status,200);
  assert.equal(allowed.headers.get('content-type'),'application/pdf');
  await allowed.arrayBuffer();
  assert.equal(checks,2);
  checks=0;denied=true;
  const refused=await fetch(url,options);
  assert.equal(refused.status,409);
  assert.equal(refused.headers.get('content-disposition'),null);
  assert.equal(refused.headers.get('cache-control'),'no-store');
  assert.equal(checks,2);
  const changed=reader((_n,cursor)=>{
    const result=structuredClone(original);
    result.lineItems.nodes=[result.lineItems.nodes[cursor?1:0]];
    result.lineItems.pageInfo={hasNextPage:!cursor,endCursor:cursor?null:'zweite'};
    if(cursor) result.displayFinancialStatus='PENDING';
    return response(result);
  });
  await assert.rejects(readOrder(F02_SHOP,'test',orderId,changed,binding),/geändert/);
});

test('Werkstatteinstieg findet passende Testbestellungen anhand der SKU und prüft verschwundene Positionen erneut',async t=>{
  const store=setup(t),original=order();
  let removed=false,details=0;
  const shopifyFetch=async(_url,options)=>{
    const {query,variables}=JSON.parse(options.body);
    if(query.includes('StudioTestOrders')){
      assert.equal(variables.filter,'test:true sku:"T260-TEST"');
      const nodes=removed || variables.after ? [] : [{id:original.id,test:true}];
      const pageInfo={hasNextPage:!variables.after,endCursor:variables.after?null:'weiter'};
      return Response.json({data:{orders:{nodes,pageInfo}}});
    }
    assert.equal(variables.id,original.id);
    details++;
    const current=structuredClone(original);
    if(removed){current.lineItems.nodes=[];current.updatedAt=later;}
    return response(current);
  };
  const server=createServer(store,{shop:F02_SHOP,opsToken:'test-w',shopifyToken:'test-s',f02:binding,shopifyFetch});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  assert.match(await (await fetch(base+'/werkstatt')).text(),/id="sync-f02"/);
  const url=base+'/api/orders/f02/sync',request={method:'POST',headers:{Authorization:'Bearer test-w'}};
  assert.equal((await fetch(url,{method:'POST'})).status,401);
  assert.deepEqual(await (await fetch(url,request)).json(),{orders:1,positions:2});
  assert.deepEqual(await (await fetch(url,request)).json(),{orders:1,positions:2});
  assert.equal(store.orders(F02_SHOP).length,2);
  removed=true;
  assert.deepEqual(await (await fetch(url,request)).json(),{orders:1,positions:0});
  assert.deepEqual(store.orders(F02_SHOP),[]);
  assert.equal(details,3);
});

test('Ein unsicherer Suchfilter, eine unvollständige Suchseite oder eine fremde Bestellung lösen keinen Detailabruf aus',async t=>{
  const store=setup(t);
  let calls=0;
  const rejectSearch=async()=>{calls++;throw Error('unerwartet');};
  await assert.rejects(syncF02Orders(store,F02_SHOP,'t',{...binding,sku:'*'},rejectSearch),/Artikelnummer/);
  assert.equal(calls,0);
  const cases=[
    {data:{orders:{nodes:[],pageInfo:{hasNextPage:true,endCursor:null}}}},
    {data:{orders:{nodes:[{id:gid('Order','5'),test:false}],pageInfo}}},
    {data:{orders:{nodes:[],pageInfo}},extensions:{search:[{warnings:[{message:'Test'}]}]}},
    {data:{orders:{nodes:[],pageInfo}},errors:[{message:'Try later'}]}
  ];
  for(const result of cases) await assert.rejects(syncF02Orders(store,F02_SHOP,'t',binding,async(_url,options)=>{
    assert.match(JSON.parse(options.body).query,/StudioTestOrders/);
    return Response.json(result);
  }));
  assert.deepEqual(store.orders(F02_SHOP),[]);
});

test('Eine veränderte Quelldatei verhindert die erste Freigabe einer historischen Gestaltung',async t=>{
  const store=openStore(':memory:');
  t.after(()=>store.close());
  const damaged={...pack,assets:new Map(pack.assets)};
  damaged.assets.set(catalog[0].key,'{}');
  store.publish(F02_SHOP,binding.product,binding.variant,damaged);
  const original=order();
  await assert.rejects(get(store,'11','pdf',reader(()=>response(original))),/Prüfsumme/);
  assert.deepEqual(store.orders(F02_SHOP),[]);
});

test('Ein unlesbarer Auftrag sperrt seine Datei und lässt die anderen Bestellungen im Abgleich zu',async t=>{
  const store=setup(t),good=order();
  const request=async(_url,options)=>{
    const {query,variables}=JSON.parse(options.body);
    if(query.includes('StudioTestOrders')) return Response.json({data:{orders:{
      nodes:[{id:gid('Order','777'),test:true},{id:good.id,test:true}],pageInfo}}});
    if(variables.id===good.id) return response(good);
    return new Response(null,{status:403});
  };
  assert.deepEqual(await syncF02Orders(store,F02_SHOP,'test',binding,request),
    {orders:2,positions:2,unverified:['777']});
  assert.equal(store.orders(F02_SHOP).length,2);
  await assert.rejects(downloadShopifyFile(store,F02_SHOP,'test','777','11','svg',request,binding),/403/);
});

test('Die F02-Freigabe prüft auch reguläre Studio-Aufträge gegen Artikelpreis und gespeicherte Revision',async t=>{
  const store=setup(t),ordinary=order();
  const job=store.save(F02_SHOP,{variant:binding.variant,revision:binding.revision,
    design:designs[0].id,edits:{},request:randomUUID()});
  const one=ordinary.lineItems.nodes[0];
  ordinary.lineItems.nodes=[one];
  one.customAttributes=[{key:'_gravuru_studio',value:job.id}];
  const call=reader(()=>response(ordinary));
  assert.equal((await get(store,'11','svg',call)).type,'image/svg+xml');
  await assert.rejects(downloadShopifyFile(store,F02_SHOP,'test',orderId,'11','svg',call,
    {...binding,revision:'f'.repeat(64)}),/Gestaltung passen/);
  one.originalUnitPriceSet.shopMoney.amount='11.99';
  await assert.rejects(get(store,'11','svg',call),/Preis/);
});
