import {gzipSync} from 'node:zlib';

// Only mount behind the owning private handler's host/origin/session checks.
// Each instance grants access only to resources in an already opened model.
export function serveBrowserResource(req,res,url,resources){
 if(!resources.matches(url.pathname))return false;
 const fail=status=>res.writeHead(status,{'Cache-Control':'no-store'}).end();
 if(!['GET','HEAD'].includes(req.method)){fail(405);return true;}
 if(url.search){fail(404);return true;}
 const resource=resources.read(url.pathname);
 if(!resource){fail(404);return true;}
 const etag='"'+resource.hash+'"';
 const headers={'Content-Type':resource.contentType,'Cache-Control':'private, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin',ETag:etag,Vary:'Accept-Encoding'};
 if(req.headers['if-none-match']===etag){res.writeHead(304,headers).end();return true;}
 let body=resource.body;
 const gzip=String(req.headers['accept-encoding']||'').split(',').some(part=>{const [name,...options]=part.trim().toLowerCase().split(';').map(s=>s.trim());const q=options.find(s=>s.startsWith('q='));return (name==='gzip'||name==='*')&&(!q||Number(q.slice(2))>0);});
 if(body.length>1024&&gzip){body=gzipSync(body);headers['Content-Encoding']='gzip';}
 headers['Content-Length']=body.length;
 res.writeHead(200,headers).end(req.method==='HEAD'?undefined:body);return true;
}
