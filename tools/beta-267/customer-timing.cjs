// Test instrumentation only. Capture browser event times, never request headers, URLs with IDs or body data.
const round = value => Math.round(value * 10) / 10;
function route(path) {
  if (path.startsWith('/api/workshop/acrylic-drafts')) return 'Entwurf';
  if (path.includes('/design-assets/')) return 'Motiv';
  if (path.startsWith('/doorbell-assets/')) return 'Gerätefoto';
  if (path.includes('material-surface')||path.includes('edelstahl-feine-maserung')) return 'Oberfläche';
  return ({'/beta-warenkorb':'Warenkorb', '/beta/cart':'Warenkorbseite', '/beta-vorschau':'Positionsbild',
    '/beta-client.mjs':'Beta-Client', '/models.json':'Produktmodell', '/beta-produkt':'Produktbindung',
    '/api/workshop/session':'Prüfsitzung', '/editor.html':'Editor', '/':'Produktseite'})[path] || 'Ressource';
}

function installObserver(saveData) {
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  if (saveData && navigator.connection) Object.defineProperty(navigator.connection,'saveData',{get:()=>true});
  const clock = () => performance.timeOrigin + performance.now();
  const mark = (kind, start=clock(), end=start, detail,network) => window.betaRecord({kind,start,end,detail,network}).catch(()=>{});
  const twoFrames = cb => requestAnimationFrame(()=>requestAnimationFrame(cb));
  const waitPaint = (test, done) => {
    const deadline=clock()+12000;
    const check=()=>{
      if(test()) twoFrames(()=>{if(test()) done(); else if(clock()<deadline) check();});
      else if(clock()<deadline) requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  };
  if (window===top && location.pathname==='/') {
    mark('Einstieg',performance.timeOrigin);
    addEventListener('message',event=>{
      if(event.origin===location.origin && event.source===document.querySelector('iframe')?.contentWindow && event.data?.type==='gravuru-ux-ready') mark('Editor bereit');
    });
  }
  const decode=HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode=function(...args) {
    const start=clock();
    return decode.apply(this,args).then(value=>{mark('Bild dekodiert',start,clock());return value;});
  };
  const toBlob=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(callback,...args) {
    const start=clock();
    return toBlob.call(this,blob=>{mark('Raster kodiert',start,clock());callback(blob);},...args);
  };
  addEventListener('click',event=>{
    const path=event.composedPath(), start=clock();
    const clicked=selector=>path.find(n=>n.matches?.(selector));
    if(clicked('[data-shop-cart]')) return mark('Warenkorbklick',start);
    const host=document.querySelector('gravuru-configurator'), root=host?.shadowRoot;
    if(!root)return;
    if(clicked('.completion-finish')){
      return waitPaint(()=>!!root.querySelector('[data-shop-cart]')?.getClientRects().length,()=>mark('Übersicht bereit',start,clock()));
    }
    if(clicked('[data-demo-section="design"]')) {
      const visible=()=>Array.from(root.querySelectorAll('[data-c-design]')).some(card=>{
        const rect=card.getBoundingClientRect(), x=rect.left+rect.width/2,y=rect.top+rect.height/2;
        if(!rect.width || x<0 || y<0 || x>=innerWidth || y>=innerHeight || !card.contains(root.elementFromPoint(x,y)))return false;
        const svg=card.querySelector('svg');
        return svg?.getAttribute('aria-label')===card.getAttribute('aria-label')?.replace(/^Design /,'') && !!svg?.querySelector('path');
      });
      return waitPaint(visible,()=>{window.betaCardsPaint=clock();mark('Erste sichtbare Designkarte',start,window.betaCardsPaint);});
    }
    const card=clicked('[data-c-design]');
    if(card && card.getAttribute('aria-pressed')!=='true') {
      const id=card.dataset.cDesign;
      const count=()=>performance.getEntriesByType('resource').filter(r=>/^https?:/.test(r.name)).length;
      const initial=count();
      const painted=()=>host.state?.designId===id && root.querySelector('[data-c-design="'+id+'"]')?.getAttribute('aria-pressed')==='true'
        && !!root.querySelector('[data-ux-stage] svg [data-object]');
      waitPaint(painted,()=>mark('Designwechsel',start,clock(),id,count()-initial));
    }
  },true);
  if (window===top && location.pathname==='/beta/cart') {
    const ready=()=>{
      const items=Array.from(document.querySelectorAll('#items article'));
      return items.length>0 && items.every(row=>row.querySelector('.image-box img')?.naturalWidth>0);
    };
    // preview-client inserts each image only after decode() completes. Demand a rendering opportunity for every row.
    waitPaint(ready,()=>{window.betaCartPaint=clock();mark('Warenkorb gezeichnet',window.betaCartPaint);});
  }
}

async function captureCustomerTiming(context,page,{saveData=false}={}) {
  const marks=[], requests=[], pending=new Set();
  const transfers=[], pendingReads=[];
  if (process.env.BETA_TRANSFER_PHASES==='1') {
    const cdp=await context.newCDPSession(page);
    const watched=new Map();
    cdp.on('Network.requestWillBeSent',event=>{
      const name=route(new URL(event.request.url).pathname);
      if(event.request.method!=='POST' || !['Entwurf','Warenkorb'].includes(name))return;
      const start=event.wallTime*1000;
      watched.set(event.requestId,{route:name,start});
      if(name==='Entwurf' && process.env.BETA_SAVE_PROBE==='1') {
        // During an unusually slow save, ask the same worker for its normal, small product record once.
        setTimeout(async()=>{
          if(!watched.has(event.requestId))return;
          try {
            const result=await page.evaluate(async()=>{
              const before=performance.now();
              const response=await fetch('/beta-produkt?produkt=ring',{cache:'no-store'});
              const record=await response.json();
              return {startMs:performance.timeOrigin+before,elapsedMs:performance.now()-before,valid:response.ok && !!record.id && Number.isInteger(record.revision)};
            });
            pendingReads.push({start,afterMs:round(result.startMs-start),durationMs:round(result.elapsedMs),valid:result.valid});
          } catch {pendingReads.push({start,valid:false});}
        },2100);
      }
    });
    cdp.on('Network.responseReceived',({requestId,response})=>{
      const request=watched.get(requestId);
      if(!request)return;
      watched.delete(requestId);
      const t=response.timing;
      if(!t || t.sendStart<0 || t.sendEnd<t.sendStart || t.receiveHeadersStart<t.sendEnd)return;
      transfers.push({...request,status:response.status,protocol:response.protocol,connectionReused:response.connectionReused,
        sendMs:round(t.sendEnd-t.sendStart),afterSendToResponseMs:round(t.receiveHeadersStart-t.sendEnd)});
    });
    await cdp.send('Network.enable');
  }
  await context.exposeBinding('betaRecord',(_source,item)=>{marks.push(item);});
  await context.addInitScript(installObserver,saveData);
  page.on('requestfinished',req=>{
    if(!/^https?:/.test(req.url()))return;
    const job=(async()=>{
      const res=await req.response();
      if(!res)return;
      const time=req.timing();
      const phases=Object.fromEntries(Array.from((await res.headerValue('server-timing')||'').matchAll(/(?:^|,)\s*([a-z_]+);dur=([\d.]+)/g),m=>[m[1],Number(m[2])]));
      const sizes=await req.sizes().catch(()=>null);
      requests.push({route:route(new URL(req.url()).pathname),method:req.method(),start:time.startTime,
        sent:time.requestStart,firstByte:time.responseStart,end:time.responseEnd,serverMs:phases.beta_app??null,phases,
        responseBytes:sizes?.responseBodySize??null,requestBytes:sizes?.requestBodySize??null});
    })().catch(()=>{});
    pending.add(job);job.finally(()=>pending.delete(job));
  });
  return async function read() {
    const end=await page.evaluate(()=>window.betaCartPaint);
    await Promise.all([...pending]);
    const entry=marks.filter(m=>m.kind==='Einstieg' && m.start<end).at(-1);
    const click=marks.filter(m=>m.kind==='Warenkorbklick' && m.start>=(entry?.start??0) && m.start<end).at(-1);
    if(!entry||!click||!end)throw Error('Messgrenzen für die Warenkorbposition fehlen.');
    const between=(t,from)=>t>=from && t<=end+1;
    const events=marks.filter(m=>between(m.start,entry.start))
      .filter(m=>!['Bild dekodiert','Raster kodiert'].includes(m.kind)||between(m.start,click.start))
      .map(m=>({kind:m.kind,atMs:round(m.start-entry.start),ms:round(m.end-m.start),...(m.detail?{design:m.detail,requests:m.network,
        startedByRoute:requests.filter(r=>r.start>=m.start&&r.start<=m.end).map(r=>r.route)}:{})}));
    const all=requests.filter(r=>between(r.start,entry.start));
    const detail=r=>({route:r.route,method:r.method,atMs:round(r.start-click.start),queueMs:round(Math.max(0,r.sent)),
      firstByteMs:r.sent<0||r.firstByte<0?null:round(r.firstByte-r.sent),downloadMs:r.firstByte<0?null:round(r.end-r.firstByte),
      serverMs:r.serverMs,...(r.phases.total!==undefined?{serverPhases:r.phases}:{}),requestBytes:r.requestBytes,responseBytes:r.responseBytes});
    return {clickThroughPaintMs:round(end-click.start),events,requestsAfterClick:all.filter(r=>between(r.start,click.start)).map(detail).sort((a,b)=>a.atMs-b.atMs),
      ...(process.env.BETA_TRANSFER_PHASES==='1'?{transferPhases:transfers.filter(r=>between(r.start,click.start)).map(({start,...timing})=>timing)}:{}),
      ...(process.env.BETA_SAVE_PROBE==='1'?{readWhileSaving:pendingReads.filter(r=>between(r.start,click.start)).map(({start,...timing})=>timing)}:{}),
      entryRequests:all.filter(r=>r.start<click.start).reduce((acc,r)=>{const row=acc[r.route]??={count:0,responseBytes:0};row.count++;row.responseBytes+=r.responseBytes??0;return acc;},{})};
  };
}
module.exports={captureCustomerTiming};
