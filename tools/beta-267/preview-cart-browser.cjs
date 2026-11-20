// Preserve the existing loopback command for the shared browser acceptance.
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const port=Number(process.argv[2]||18267);
if (!Number.isSafeInteger(port)||port<1024||port>65535) throw Error('Lokalen Port angeben.');
const out=path.resolve(process.argv[3]||'warenkorb-belege');
const result=spawnSync(process.execPath,[path.join(__dirname,'check-hosted.cjs'),'http://127.0.0.1:'+port,out],{stdio:'inherit',env:process.env});
if(result.error)throw result.error;
process.exitCode=result.status??1;
