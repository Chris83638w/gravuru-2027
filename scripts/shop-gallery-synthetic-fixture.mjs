// Explicit synthetic fixture for gallery load tests. No network or real shop IDs.
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {makeProductDocument} from '../app/workshop/product-model.mjs';
import {prepareShopProduct} from '../app/workshop/shop-preparation.mjs';
import {makeAcrylicConfig} from '../app/configurator/variant-m/acrylic-product.mjs';
import {openWorkshopDb,checkSelections} from './shop-bind.mjs';
const args=process.argv.slice(2);
if(args.length!==3||args[0]!=='--synthetic-only'||args[1]!=='--out'||fs.existsSync(args[2]))throw Error('Require --synthetic-only --out NEW.sqlite; existing files are never overwritten.');
const filename=args[2],shopDomain='synthetic.myshopify.com',tenantId='gravuru',storeId='synthetic';
const resources=JSON.parse(fs.readFileSync(new URL('../app/designs/acrylic-unser-anfang/resources.json',import.meta.url)));
const repo=createProductRepository({filename,tenantId}),ws=openWorkshopDb(filename,{tenantId,storeId,shopDomain});
try{
 const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
 config.materialSurface='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><!--'+'x'.repeat(6*1024*1024)+'--></svg>').toString('base64');
 const record=repo.create(makeProductDocument(config,{name:'Synthetic product',kind:'product'})),v=prepareShopProduct(record).variants[0];
 const selection={productId:record.id,productRevision:1,shopifyProductId:'gid://shopify/Product/17000000000000',shopifyVariantId:'gid://shopify/ProductVariant/58000000000000',options:v.options,expectedUnitCents:v.priceCents};
 const reader={async inspectVariants(ids){return {installation:{shopDomain,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>({id,found:true,productId:selection.shopifyProductId,status:'ACTIVE',priceCents:selection.expectedUnitCents}))};}};
 const block=(await checkSelections([selection],{adapter:ws.adapter,reader}))[0];if(block.error)throw Error(block.error);
 ws.orderIntake.idBindings({storeId,shopDomain,adapter:ws.adapter}).persist({plan:block.result.plan,expectedHeads:[{shopifyVariantId:selection.shopifyVariantId,revision:null}]});
}finally{ws.close();repo.close();}
// Repeat the same validated synthetic document under different local IDs. This
// deliberately stresses retained document bodies, not live catalogue diversity.
const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON');
try{
 const seed=db.prepare('SELECT * FROM shop_product_binding_revisions LIMIT 1').get();
 const copy=(table,where,args,changes)=>{
  const cols=db.prepare('PRAGMA table_info('+table+')').all().map(c=>c.name);
  db.prepare('INSERT INTO '+table+' ('+cols.join(',')+') SELECT '+cols.map(c=>Object.hasOwn(changes,c)?'?':c).join(',')+' FROM '+table+' WHERE '+where).run(...cols.filter(c=>Object.hasOwn(changes,c)).map(c=>changes[c]),...args);
 };
 db.exec('BEGIN');
 try{for(let n=1;n<65;n++){
  const cfg='cfg_synthetic_'+n,bid='binding_synthetic_'+n,pg='gid://shopify/Product/'+(17000000000000+n),vg='gid://shopify/ProductVariant/'+(58000000000000+n);
  copy('products','id=?',[seed.cfg_id],{id:cfg});copy('product_revisions','product_id=? AND revision=?',[seed.cfg_id,1],{product_id:cfg});
  if(n===64)continue; // One unbound product: fixture contains 65 documents / 64 bindings.
  copy('form_shop_bindings','id=?',[seed.binding_id],{id:bid,variant_id:vg.split('/').at(-1),product_id:cfg});
  copy('form_shop_binding_selections','binding_id=?',[seed.binding_id],{binding_id:bid});
  copy('shop_product_binding_revisions','variant_gid=? AND revision=?',[seed.variant_gid,1],{variant_gid:vg,product_gid:pg,binding_id:bid,cfg_id:cfg});
  copy('shop_product_binding_heads','variant_gid=?',[seed.variant_gid],{variant_gid:vg});
 }db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}finally{db.close();}
console.log(JSON.stringify({synthetic:true,products:65,bindings:64,bytes:fs.statSync(filename).size,liveData:false}));
