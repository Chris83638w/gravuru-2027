import {createGalleryModuleManagementDemo,createGalleryModuleManagementDemoServer} from './fixtures/gallery-module-management.mjs';

const args=process.argv.slice(2),portArg=args.find(v=>v.startsWith('--port=')),port=portArg?Number(portArg.slice(7)):8209;
if(args.some(v=>v!==portArg)||!Number.isInteger(port)||port<1024||port>65535)throw Error('Use only --port=1024..65535');
const demo=await createGalleryModuleManagementDemo();
const server=createGalleryModuleManagementDemoServer(demo);
let closed=false;
const close=()=>{if(closed)return;closed=true;server.close(()=>{demo.close();process.exit(0);});};
process.on('SIGINT',close);process.on('SIGTERM',close);
server.once('error',error=>{demo.close();throw error;});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${port}/originale/verwaltung#synchronisieren`,mode:'isolated-synthetic-demo',liveShopifyRequests:0,temporaryData:demo.directory})));
