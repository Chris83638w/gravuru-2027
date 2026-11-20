// Load with node --import on the local measurement server. Import the measured worktree's timing scope.
import {Server} from 'node:http';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {withCartTiming,cartTimingHeaders}=await import(pathToFileURL(resolve('app/workshop/shop-cart-timing.mjs')));
const emit=Server.prototype.emit;
Server.prototype.emit=function(event,...args) {
  if(event!=='request')return emit.call(this,event,...args);
  const [req,res]=args,start=performance.now();
  const path=req.url.split('?')[0];
  const route=req.method==='POST' && (path.startsWith('/api/workshop/acrylic-drafts')?'acrylic-drafts':path==='/beta-warenkorb'?'theme-cart':null);
  const write=res.writeHead;
  res.writeHead=function(status,...more) {
    if(!res.headersSent){
      const phases=route && cartTimingHeaders(status)['Server-Timing'];
      res.setHeader('Server-Timing',['beta_app;dur='+(performance.now()-start).toFixed(1),phases].filter(Boolean).join(', '));
    }
    return write.call(this,status,...more);
  };
  if(!route)return emit.call(this,event,...args);
  void withCartTiming(route,()=>{},async()=>{
    const completed=new Promise(done=>res.once('close',done));
    emit.call(this,event,...args);
    await completed;
  });
  return true;
};
