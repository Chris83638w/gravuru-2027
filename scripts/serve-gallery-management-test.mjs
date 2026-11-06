// Explicit local acceptance server. It cannot connect to the real Shopify shop.
import fs from 'node:fs';
import path from 'node:path';
import {createGalleryManagementFixture} from './fixtures/gallery-management.mjs';
import {createGallerySyncTestFixture} from '../app/workshop/gallery-shop-sync-test-fixture.mjs';
import {createGalleryShopSync} from '../app/workshop/gallery-shop-sync.mjs';
const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1];
if(!args.includes('--synthetic-only')||!args.includes('--data'))throw Error('Use --synthetic-only --data NEW_DIRECTORY [--port PORT]');
const root=path.resolve(value('--data')),port=Number(args.includes('--port')?value('--port'):8203);
if(fs.existsSync(root)||!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a new directory and valid port');
const synthetic=await createGallerySyncTestFixture({directory:path.join(root,'isolated-shop')});
const fixture=await createGalleryManagementFixture(path.join(root,'gallery'),{extraDocument:synthetic.source.document,syncFactory:({workshop,extraSource})=>({service:sourceApproval=>createGalleryShopSync({...synthetic.args,sourceWorkshop:workshop,targets:[{...synthetic.mapping,source:{...synthetic.mapping.source,productId:extraSource.id}}],sourceApproval})})});
const base=await fixture.listen(port);
console.log(JSON.stringify({url:base+'/originale/verwaltung',gallery:base+'/originale/',live:false,shopifyWrites:0,syntheticOnly:true}));
let stopping=false;
async function close(){if(stopping)return;stopping=true;await fixture.close();synthetic.close();process.exit(0);}
process.on('SIGINT',close);process.on('SIGTERM',close);
