// Ladefolge nach dem Start (Idee Chris 20.10.2026): erst steht die Seite (Platte, Texte, Bedienung),
// danach lädt eine Warteschlange im Leerlauf nacheinander und mit niedriger Priorität vor:
//   1. Bilder der Optionen (Schritt 1), 2. Schriften (Schritt 2), 3. Motivbibliothek (Schritt 3).
// Öffnet der Kunde vorher einen Schritt, die Schriftauswahl oder den Motivbereich, wird genau diese Aufgabe
// sofort vorgezogen (request). Doppelte Downloads verhindern die Lader selbst (laufende Anfrage wird
// wiederverwendet, lazy-resources.mjs/background-loading.mjs); die Warteschlange startet jede Aufgabe im
// Hintergrund höchstens einmal und überspringt erledigte. Datensparmodus/2G: Aufgaben mit `saveData:'skip'`
// laufen nicht im Hintergrund, nur auf Anforderung; `saveData:'never'` nie im Hintergrund (z. B. Handy
// mit Mobilfunk, background-loading.mjs preloadScope). Ohne DOM, in Node prüfbar.

// Datensparen: navigator.connection.saveData oder effectiveType 2g/slow-2g.
export function saveDataActive(connection){
  if(!connection)return false;
  return connection.saveData===true||/(^|-)2g$/.test(String(connection.effectiveType||''));
}

// Leerlauf: requestIdleCallback (mit Höchstwartezeit), sonst setTimeout.
export function idleScheduler(win=globalThis,{timeout=2000}={}){
  return callback=>typeof win.requestIdleCallback==='function'?win.requestIdleCallback(()=>callback(),{timeout}):win.setTimeout(callback,50);
}

export function createPreloadQueue({idle=idleScheduler(),connection=null,onEvent=()=>{}}={}){
  const tasks=new Map(),order=[];let started=false,running=false;
  const saving=saveDataActive(connection);
  const emit=(type,key,extra={})=>onEvent({type,key,...extra});
  function settle(task,promise,mode){
    task.pending=promise.then(value=>{task.state='done';emit('done',task.key,{mode});return value;},error=>{task.state='failed';emit('failed',task.key,{mode,error:error?.message});throw error;});
    return task.pending;
  }
  function next(){
    if(!started||running)return;
    const task=order.map(key=>tasks.get(key)).find(t=>t.state==='queued');
    if(!task)return emit('idle',null);
    running=true;
    idle(()=>{
      // Inzwischen vorgezogen oder erledigt: nichts doppelt starten.
      if(task.state!=='queued'){running=false;return next();}
      if(task.saveData==='never'||saving&&task.saveData==='skip'){task.state='skipped';emit('skipped',task.key,{reason:'saveData'});running=false;return next();}
      task.state='background';emit('start',task.key,{mode:'background'});
      settle(task,Promise.resolve().then(()=>task.background()),'background').catch(()=>{}).finally(()=>{running=false;next();});
    });
  }
  return {
    saveData:saving,
    add(key,{background,now=background,saveData='load'}){
      if(tasks.has(key))throw Error('Ladeaufgabe doppelt: '+key);
      tasks.set(key,{key,background,now,saveData,state:'queued',pending:null});order.push(key);next();
    },
    start(){if(!started){started=true;emit('started',null,{saveData:saving});next();}},
    // Sofort laden (Kunde öffnet den Bereich). Läuft die Aufgabe schon im Hintergrund, holt `now` den Rest
    // mit normaler Priorität; die Lader verwenden laufende Anfragen wieder. Erledigt: kein neuer Abruf.
    request(key){
      const task=tasks.get(key);if(!task)return Promise.resolve();
      if(task.state==='done')return task.pending;
      if(task.state==='requested')return task.pending;
      const wasBackground=task.state==='background';
      task.state='requested';emit('start',key,{mode:'request',promoted:wasBackground});
      return settle(task,Promise.resolve().then(()=>task.now()),'request');
    },
    state(key){return tasks.get(key)?.state;},
    get keys(){return [...order];}
  };
}
