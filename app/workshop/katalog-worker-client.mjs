// Paket 1c: Hauptprozess-Seite des Katalog-Arbeiters. Startet den Worker erst beim ersten Aufruf, legt gleiche
// laufende Aufrufe zusammen, begrenzt die Warteschlange und beendet wartende Aufrufe sauber, wenn der Worker abbricht.
// Kein stiller Rückfall auf die Rechnung im Hauptprozess.
import {Worker} from 'node:worker_threads';

const failure=(status,code,message)=>Object.assign(new Error(message),{status,code});
const BUSY_TEXT='Die Designliste rechnet gerade. Bitte in einer Minute erneut laden.';

/** Schreibt eine fertige Worker-Antwort mit denselben Kopfzeilen wie json()/jsonMaybeGzip() in http.mjs. */
export function writeJsonResult(res,status,result){
  const bytes=result.bytes;
  if(!result.gzip)return res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);
  return res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Encoding':'gzip','Vary':'Accept-Encoding','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);
}

// Leichte Aufrufe (einzelne Vorschaubilder/Zielvorschauen): eine Werkstattseite fragt davon viele gleichzeitig ab. Sie zählen
// nicht gegen die enge Grenze der schweren Listenrechnungen, sondern haben eine eigene, weite Grenze.
const LIGHT_OPS=new Set(['designs.svg','designs.targetPreview']);

export function createKatalogWorker({dbFile,tenantId,available={},logger=null,maxPending=6,maxLightPending=400,testOps=false}){
  let worker=null,nextId=1,epoch=0,fontsVersion=0,closed=false;
  const inflight=new Map();// id → {key,resolve,reject}
  const pending=new Map();// key → {promise,id,light}
  const waiting=light=>{let n=0;for(const entry of pending.values())if(entry.light===light)n+=1;return n;};
  let seenFonts=new Map();
  const log=entry=>{if(typeof logger==='function'){try{logger(entry);}catch{}}};

  // Die Schriftliste ändert sich im Betrieb (Schrift-Import ersetzt Einträge in derselben Tabelle). Referenzvergleich genügt:
  // jeder Import legt neue Objekte an. Nur bei einer Änderung geht die Liste erneut an den Worker.
  function fontsChanged(){
    const keys=Object.keys(available);let changed=keys.length!==seenFonts.size;
    if(!changed)for(const key of keys)if(seenFonts.get(key)!==available[key]){changed=true;break;}
    if(changed){seenFonts=new Map(keys.map(key=>[key,available[key]]));fontsVersion+=1;}
    return changed;
  }

  function endAll(error){
    const waiting=[...inflight.values()];inflight.clear();
    for(const entry of waiting)entry.reject(error);
  }
  function start(){
    fontsChanged();
    const instance=new Worker(new URL('./katalog-worker.mjs',import.meta.url),{workerData:{dbFile,tenantId,available:{...available},testOps},name:'katalog-worker'});
    instance.unref();
    sentFontsVersion=fontsVersion;
    instance.on('message',message=>{
      const entry=inflight.get(message.id);if(!entry)return;
      inflight.delete(message.id);
      if(message.ok){
        const bytes=Buffer.from(message.bytes);
        entry.resolve(message.kind==='file'?{type:message.type,bytes,warnings:message.warnings||[]}:{bytes,gzip:Boolean(message.gzip)});
      }else{
        entry.reject(Object.assign(new Error(message.message),{status:message.status,code:message.code,actualRevision:message.actualRevision}));
      }
    });
    const lost=reason=>{
      if(worker===instance)worker=null;
      endAll(failure(503,'designs_worker',reason));
    };
    instance.on('error',error=>lost('Der Katalog-Arbeiter ist ausgefallen: '+(error?.message||'unbekannter Fehler')));
    instance.on('exit',code=>lost('Der Katalog-Arbeiter wurde beendet (Code '+code+'). Bitte erneut laden.'));
    instance.on('messageerror',()=>lost('Der Katalog-Arbeiter lieferte eine unlesbare Antwort.'));
    return instance;
  }
  let sentFontsVersion=0;

  function call(op,root,args={},{acceptGzip=false}={}){
    if(closed)return Promise.reject(failure(503,'designs_worker','Der Katalog-Arbeiter ist beendet.'));
    const changed=fontsChanged();
    const key=JSON.stringify([op,root,args,Boolean(acceptGzip),epoch,fontsVersion]);
    const shared=pending.get(key);
    const started=performance.now();
    const note=(sharedCall,ok,result,error)=>log({event:'katalog_worker',op,ms:Math.round(performance.now()-started),bytes:result?.bytes?.length??0,gzip:Boolean(result?.gzip),pending:pending.size,shared:sharedCall,ok});
    if(shared){
      return shared.promise.then(result=>{note(true,true,result);return result;},error=>{note(true,false,null,error);throw error;});
    }
    const light=LIGHT_OPS.has(op);
    if(waiting(light)>=(light?maxLightPending:maxPending)){
      const error=failure(503,'designs_busy',BUSY_TEXT);
      note(false,false,null,error);
      return Promise.reject(error);
    }
    const id=nextId++;
    const promise=new Promise((resolve,reject)=>{
      try{
        if(!worker){worker=start();}
        inflight.set(id,{resolve,reject});
        const message={id,op,root,args,acceptGzip:Boolean(acceptGzip),epoch,fontsVersion};
        if(sentFontsVersion!==fontsVersion||changed){message.available={...available};sentFontsVersion=fontsVersion;}
        worker.postMessage(message);
      }catch(error){
        inflight.delete(id);
        reject(error.status?error:failure(503,'designs_worker','Der Katalog-Arbeiter konnte nicht gestartet werden: '+error.message));
      }
    });
    const entry={promise,id,light};
    pending.set(key,entry);
    const done=()=>{if(pending.get(key)===entry)pending.delete(key);};
    promise.then(done,done);
    return promise.then(result=>{note(false,true,result);return result;},error=>{note(false,false,null,error);throw error;});
  }

  return {
    call,
    /** Nach Schreibvorgängen am Katalog: der Worker verwirft seinen kurz gemerkten geöffneten Katalog; neue Aufrufe
     *  legen sich nicht an laufende (ältere) Rechnungen an. */
    invalidate(){epoch+=1;},
    pendingCount:()=>pending.size,
    started:()=>worker!==null,
    close(){
      closed=true;
      const instance=worker;worker=null;
      endAll(failure(503,'designs_worker','Der Katalog-Arbeiter ist beendet.'));
      if(instance)return instance.terminate();
      return Promise.resolve();
    },
  };
}
