import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {openStore,shopName} from './store.mjs';
import {here,inspectFile,importFiles} from './catalog.mjs';
import {createServer,DEMO_SHOP,DEMO_PRODUCT,DEMO_VARIANT} from './server.mjs';
import {readOrder,downloadShopifyFile} from './shopify.mjs';
const {values:a,positionals:[cmd,...files]}=parseArgs({allowPositionals:true,options:Object.fromEntries(['db','shop','variant','product','order','line','out','format','port'].map(k=>[k,{type:'string'}]))});
async function run(){
  if(cmd==='inspect'){if(files.length!==1) throw Error('Eine product.json, design.json oder FPD-ZIP angeben.');console.log(JSON.stringify(inspectFile(files[0]),null,2));return;}
  if(!['demo','serve','import','sync','export'].includes(cmd)) throw Error('Befehl: demo | serve | inspect DATEI | import DATEI ... | sync | export. Optionen im README.');
  const demo=cmd==='demo',shop=demo?DEMO_SHOP:a.shop;
  if(!shopName(shop)) throw Error('--shop mit dem kanonischen myshopify.com-Namen angeben.');
  const dest=path.resolve(a.db||process.env.STUDIO_DB||'.studio/'+(demo?'demo':'studio')+'.sqlite');
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  const store=openStore(dest);let serving=false;
  try{
    if(cmd==='import' || demo){
      const src=demo?[here('../designs/steel-heimathafen/source.json')]:files;
      if(!src.length)throw Error('Quelldatei fehlt.');
      const pack=importFiles(src);
      store.publish(shop,demo?DEMO_PRODUCT:a.product,demo?DEMO_VARIANT:a.variant,pack);
      console.log(JSON.parse(pack.index).length+' Vorlagen · Revision '+pack.revision);
    }
    if(cmd==='sync') console.log(store.receive(shop,await readOrder(shop,process.env.SHOPIFY_ADMIN_TOKEN,a.order))+' Bestellpositionen übernommen.');
    if(cmd==='export'){
      if(!a.out)throw Error('--out angeben.');
      const file=await downloadShopifyFile(store,shop,process.env.SHOPIFY_ADMIN_TOKEN,a.order,a.line,a.format||'pdf');
      fs.writeFileSync(a.out,file.bytes,{flag:'wx'});console.log(a.out);
    }
    if(demo || cmd==='serve'){
      if(!demo && (!process.env.SHOPIFY_API_SECRET || !process.env.STUDIO_OPS_TOKEN)) throw Error('Shopify-App-Schlüssel und Werkstatt-Token fehlen.');
      const port=Number(a.port||process.env.PORT||4391);
      const server=createServer(store,{demo,shop,secret:process.env.SHOPIFY_API_SECRET,opsToken:process.env.STUDIO_OPS_TOKEN,shopifyToken:process.env.SHOPIFY_ADMIN_TOKEN});
      await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
      serving=true;
      console.log('http://127.0.0.1:'+server.address().port);
      for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>{store.close();process.exit(0);}));
    }
  }finally{if(!serving)store.close();}
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
