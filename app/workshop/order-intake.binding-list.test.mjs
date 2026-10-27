import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createOrderIntake} from './order-intake.mjs';
import {createShopProductBindingCheck} from './shop-product-binding-check.mjs';

const SHOP='gravuru-synthetic.myshopify.com';
const cfg=n=>'cfg_00000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
const bindingId=n=>'binding_00000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');

function fixture(t){
 const db=new DatabaseSync(':memory:'),reads=[];
 let count=false;
 const instrumented=new Proxy(db,{get(target,key){
  if(key==='prepare')return sql=>{
   const statement=target.prepare(sql);
   if(!/^\s*SELECT\b/i.test(sql))return statement;
   return new Proxy(statement,{get(stmt,method){
    const value=Reflect.get(stmt,method,stmt);
    if(typeof value!=='function')return value;
    return (...args)=>{if(count&&['all','get','iterate'].includes(method))reads.push(sql);return value.apply(stmt,args);};
   }});
  };
  const value=Reflect.get(target,key,target);
  return typeof value==='function'?value.bind(target):value;
 }});
 const intake=createOrderIntake({database:instrumented,tenantId:'gravuru',snapshot:()=>{throw Error('not used');}});
 t.after(()=>db.close());
 const insert=db.prepare('INSERT INTO form_shop_bindings(id,shop,variant_id,product_id,product_revision,unit_cents,created_at,tenant_id) VALUES(?,?,?,?,?,?,?,?)');
 const selection=db.prepare('INSERT INTO form_shop_binding_selections(binding_id,options,tenant_id) VALUES(?,?,?)');
 function add({n,tenant='gravuru',shop=SHOP,variant=String(57000000000000+n),product=cfg(Math.floor(n/120)),options,selectionTenant=tenant}){
  const id=bindingId(n);insert.run(id,shop,variant,product,1,4999,'2026-10-27T00:00:00.000Z',tenant);
  if(options!==undefined)selection.run(id,JSON.stringify(options),selectionTenant);
  return {id,shopDomain:shop,variantId:variant,productId:product,productRevision:1,unitCents:4999,...(options&&selectionTenant===tenant?{options}:{})};
 }
 return {db,intake,add,reads,start(){reads.length=0;count=true;},stop(){count=false;}};
}

test('15,120 bindings use one query and preserve exact ordering, options, all tenant shops and tenant isolation',t=>{
 const f=fixture(t),expected=[];
 f.db.exec('BEGIN');
 for(let n=0;n<15120;n++)expected.push(f.add({n,shop:n%2?SHOP:'second-synthetic.myshopify.com',
  ...(n===0?{}:n===1?{options:{mounting:'foreign'},selectionTenant:'other'}:n===2?{options:null}:{options:{color:n%2?'black':'anthracite',format:'16x28',frame:'round',mounting:'K00'}})}));
 f.add({n:16000,tenant:'other',options:{mounting:'other'}});
 f.db.exec('COMMIT');
 f.start();const rows=f.intake.bindings();f.stop();
 assert.equal(f.reads.length,1,'one scoped query must replace per-binding selection queries');
 assert.deepEqual(rows,expected.reverse());
 assert.equal(rows.length,15120);
 assert.equal(Object.hasOwn(rows.at(-1),'options'),false);
 assert.equal(Object.hasOwn(rows.at(-2),'options'),false,'a foreign-tenant selection must not join');
 assert.equal(Object.hasOwn(rows.at(-3),'options'),false,'stored JSON null preserves the absent options contract');
 assert.equal(new Set(rows.map(r=>r.shopDomain)).size,2,'the full tenant list must retain other shops');
 rows[0].options.mounting='modified outside';
 f.start();assert.equal(f.intake.bindings()[0].options.mounting,'K00');f.stop();
 assert.equal(f.reads.length,1,'repeat reads must also remain one query and return fresh data');
});

test('full binding list retains cross-product variant conflicts for the existing binding checker',async t=>{
 const f=fixture(t),id=cfg(1),other=cfg(2),variant='57000000001234';
 f.add({n:1,product:id,variant,options:{}});
 f.add({n:2,product:other,variant,options:{}});
 const record={id,revision:1,status:'draft',document:{schema:'gravuru-product/v1',kind:'product',config:{profile:{optionGroups:[]}}}};
 const adapter={tenantId:'gravuru',shopDomain:SHOP,storeId:'acryl',
  getCurrentProduct:()=>structuredClone(record),resolveSelection:()=>({options:{},unitCents:4999}),
  resolveProductionProfile:()=>null,getBindings:()=>f.intake.bindings(),
  readiness:()=>({sourceReady:true,blockers:[]})};
 const input={shopifyProductId:'gid://shopify/Product/16000000001234',shopifyVariantId:'gid://shopify/ProductVariant/'+variant,productId:id,productRevision:1,options:{}};
 const reader={async inspectVariants(){return {installation:{shopDomain:SHOP,currency:'EUR',scope:'admin-readonly'},variants:[{id:input.shopifyVariantId,found:true,productId:input.shopifyProductId,status:'ACTIVE',priceCents:4999}]};}};
 const result=await createShopProductBindingCheck({adapter,reader}).check({selections:[input]});
 assert.equal(result.status,'blocked');assert.equal(result.plan,null);
 assert.ok(result.entries[0].readiness.bindingBlockers.some(v=>v.code==='variant_config_conflict'));
 assert.equal(f.intake.bindings().length,2);
});
