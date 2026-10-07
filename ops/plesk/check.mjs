import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {testConfig,verifyStorage,verifyDirectory,PYTHON_MARKER,markerValue} from './config.mjs';

try{
  if(Number(process.versions.node.split('.')[0])<24)throw Error('Node.js 24 oder neuer erforderlich.');
  const config=testConfig(process.env);verifyStorage(config);
  verifyDirectory(config.pythonDir,PYTHON_MARKER,markerValue(config,'test-python'));fs.accessSync(config.python,fs.constants.X_OK);
  const db=new DatabaseSync(':memory:');try{db.exec('CREATE TABLE probe(value TEXT) STRICT');}finally{db.close();}
  const result=spawnSync(config.python,['-c','import sys, json, pymupdf, PIL, openpyxl, cairosvg, shapely, svgpathtools, numpy, scipy; assert sys.version_info >= (3,11); cairosvg.svg2png(bytestring=b\'<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2"/></svg>\'); print(json.dumps({"python":sys.version.split()[0],"dependencies":True,"cairo":True}))'],{encoding:'utf8',timeout:30000,env:{...process.env,PYTHONPATH:''}});
  if(result.status!==0)throw Error('Private Python-Umgebung oder Pakete/System-Cairo fehlen. plesk:prepare und Servervoraussetzungen prüfen.');
  const python=JSON.parse(result.stdout);
  console.log(JSON.stringify({configured:true,node:process.versions.node,sqlite:true,...python,credentialsVerified:false,httpsVerified:false,shopifyConnected:false}));
}catch(error){console.error(JSON.stringify({configured:false,error:error.message}));process.exitCode=1;}
