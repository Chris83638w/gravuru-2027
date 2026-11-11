'use strict';
// Reads only the named config source, never executes it or prints other settings.
const fs=require('node:fs');
const file=process.argv[2],expected='/var/www/vhosts/gravuru-designwerkstatt.de/private/issue139-katalog-20261102';
try{
 const src=fs.readFileSync(file,'utf8');
 const direct=[...src.matchAll(/process\.env\.GRAVURU_KATALOG\s*=\s*(['"])([^'"\r\n]+)\1\s*(?:;|\r?$)/gm)];
 if(direct.length===1)console.log(JSON.stringify({source:'app.cjs',GRAVURU_KATALOG:direct[0][2],matchesExpected:direct[0][2]===expected,kind:'direct_literal'}));
 else{
  const fallbacks=[...src.matchAll(/process\.env\.GRAVURU_KATALOG\s*=\s*process\.env\.GRAVURU_KATALOG\s*\|\|\s*(['"])([^'"\r\n]+)\1/g)];
  console.log(JSON.stringify({source:'app.cjs',GRAVURU_KATALOG:fallbacks.length===1?fallbacks[0][2]:null,matchesExpected:null,kind:fallbacks.length===1?'fallback_only_not_runtime_proof':'dynamic_or_ambiguous',directMatches:direct.length}));
 }
}catch(e){console.log(JSON.stringify({ok:false,error:String(e.message).slice(0,360)}));process.exitCode=1;}
