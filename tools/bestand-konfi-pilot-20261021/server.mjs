import http from 'node:http';
import {pathToFileURL} from 'node:url';

// Isolated transport probe. No editor, database, uploads, proxy or outbound calls.
export function createPilotServer(){
  return http.createServer((req,res)=>{
    const port=res.socket.localPort, origin=`http://127.0.0.1:${port}`;
    const send=(status,value)=>{const bytes=Buffer.from(JSON.stringify(value));res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);};
    if(req.headers.host!==`127.0.0.1:${port}` || (req.headers.origin && req.headers.origin!==origin) || req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'origin_rejected'});
    if(req.method!=='GET')return send(405,{error:'read_only_probe'});
    if(req.url==='/pilot/health')return send(200,{schema:'gravuru-integration-pilot/v1',mode:'synthetic-only',externalNetwork:false,privateData:false});
    if(req.url==='/pilot/model')return send(200,{schema:'gravuru-pilot-probe/v1',synthetic:true,label:'Transportprobe ohne Produktdaten',objects:Array.from({length:25},(_,i)=>({id:`probe-${i}`,type:'text',text:`Test ${i}`,x:i,y:i}))});
    return send(404,{error:'probe_route_missing'});
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const port=Number(process.argv.find(v=>v.startsWith('--port='))?.slice(7)||0);
  if(!Number.isInteger(port)||port<0||port>65535)throw Error('Ungültiger lokaler Port.');
  const server=createPilotServer();server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${server.address().port}`,scope:'transport-probe-only'})));
}
