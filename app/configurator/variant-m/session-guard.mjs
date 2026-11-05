// Ü8.1 Sitzungsschutz ohne Konto (K7): Der Stand des Kundeneditors wird
// entprellt im Browser (localStorage) gehalten und beim Neuladen desselben
// Produkts auf demselben Gerät wiederhergestellt. Das ist kein Entwurf: nichts
// davon liegt auf dem Server. localStorage enthält nur Upload-Referenzen;
// session-uploads.mjs hält die zugehörigen Bilddateien separat in IndexedDB.
// Jeder Speicherzugriff ist abgesichert; ein
// ungültiger, fremder oder abgelaufener Stand wird still verworfen.
export const SESSION_GUARD_SCHEMA='gravuru-session-guard/v1';
export const SESSION_GUARD_TTL_MS=7*24*60*60*1000;
export const SESSION_GUARD_DELAY_MS=1500;
export const sessionGuardKey=(productId,profileRevision)=>'gravuru-session:'+productId+':'+profileRevision;
// Upload-Referenzen ohne Bilddaten: Objekt, Upload-ID, Art und Dateiname.
export const uploadReferences=(objects,files)=>objects.filter(o=>o.uxUploadId).map(o=>({objectId:o.id,uploadId:o.uxUploadId,kind:o.uxUploadKind==='logo'?'logo':'photo',name:files?.get?.(o.uxUploadId)?.file?.name||''}));

export function createSessionGuard({storage,productId,profileRevision,payload,restore,clock=Date.now,delayMs=SESSION_GUARD_DELAY_MS,schedule=(fn,ms)=>globalThis.setTimeout(fn,ms),cancel=id=>globalThis.clearTimeout(id)}){
  if(typeof productId!=='string'||!productId||typeof profileRevision!=='string'||!profileRevision)throw Error('Sitzungsschutz braucht Produkt-ID und Profilrevision.');
  const key=sessionGuardKey(productId,profileRevision);
  let timer=null,armed=false,busy=false;
  const clear=()=>{try{storage?.removeItem(key);}catch{}};
  const valid=data=>data&&typeof data==='object'&&!Array.isArray(data)&&data.schema===SESSION_GUARD_SCHEMA&&data.productId===productId&&data.profileRevision===profileRevision&&
    Number.isSafeInteger(data.savedAt)&&data.savedAt<=clock()+60_000&&clock()-data.savedAt<=SESSION_GUARD_TTL_MS&&data.draft&&typeof data.draft==='object'&&!Array.isArray(data.draft)&&
    (data.uploads===undefined||Array.isArray(data.uploads)&&data.uploads.every(u=>u&&typeof u==='object'&&typeof u.uploadId==='string'&&typeof u.objectId==='string'));
  function read(){
    let raw;try{raw=storage?.getItem(key);}catch{return null;}
    if(typeof raw!=='string'||!raw)return null;
    let data;try{data=JSON.parse(raw);}catch{clear();return null;}
    if(!valid(data)){clear();return null;}
    return data;
  }
  function write(){
    timer=null;if(!armed||busy)return false;
    let data;
    try{const current=payload();data={schema:SESSION_GUARD_SCHEMA,productId,profileRevision,savedAt:clock(),draft:current.draft,uploads:(current.uploads||[]).map(u=>({objectId:u.objectId,uploadId:u.uploadId,kind:u.kind,name:u.name||''}))};}
    catch{return false;} // Ungültiger Zwischenstand: der letzte gültige bleibt gespeichert.
    try{storage.setItem(key,JSON.stringify(data));return true;}catch{return false;}
  }
  return {
    key,
    arm(){armed=true;},
    touch(){if(!armed||busy)return;if(timer!==null)cancel(timer);timer=schedule(write,delayMs);},
    flush(){if(timer!==null){cancel(timer);timer=null;}return write();},
    clear,read,
    pending:()=>timer!==null,
    // Wiederherstellung: liefert Upload-Referenzen und Zeitpunkt oder null; Fehler verwerfen den Stand.
    recover(){
      const data=read();if(!data)return null;
      busy=true;
      try{restore(data.draft);return {uploads:data.uploads||[],savedAt:data.savedAt};}
      catch{clear();return null;}
      finally{busy=false;}
    },
    // Für „Neu beginnen“: Speicher leeren und den Startzustand ohne Zwischenspeicherung setzen.
    reset(fn){if(timer!==null){cancel(timer);timer=null;}clear();busy=true;try{return fn();}finally{busy=false;}},
  };
}
