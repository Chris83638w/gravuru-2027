// Bounded authenticated target previews. Reuse only the checksum advertised by the current catalogue.
export function createTargetPreviewCache({limit=3,maxEntries=120}={}){
 const entries=new Map(),queue=[];let active=0,sequence=0;
 const discard=task=>{if(entries.get(task.key)===task)entries.delete(task.key);};
 const prune=()=>{for(const [key,entry]of entries){if(entries.size<=maxEntries)break;if(entry.done)entries.delete(key);}};
 const cancel=task=>{task.cancelled=true;task.controller.abort();if(!task.done)task.reject(Object.assign(Error('Vorschau wurde verworfen.'),{name:'AbortError'}));discard(task);};
 function run(){
  while(active<limit&&queue.length){
   const task=queue.shift();if(task.cancelled)continue;active++;
   Promise.resolve().then(()=>task.load(task.controller.signal)).then(value=>{
    if(task.cancelled)return;task.done=true;
    if(!task.revision||value.checksum!==task.revision)discard(task);
    task.resolve(value);
   },error=>{discard(task);task.reject(error);}).finally(()=>{active--;prune();run();});
  }
 }
 return {
  get(identity,revision,load){
   // Identity includes the family and requested size (the tile requests the default size).
   const key=JSON.stringify([identity,revision||'uncached:'+sequence++]);
   const existing=entries.get(key);if(existing){entries.delete(key);entries.set(key,existing);return existing.promise;}
   const task={key,identity,revision,load,controller:new AbortController(),done:false,cancelled:false};
   task.promise=new Promise((resolve,reject)=>Object.assign(task,{resolve,reject}));entries.set(key,task);queue.push(task);run();return task.promise;
  },
  invalidate(identity){for(const task of entries.values())if(identity===undefined||task.identity===identity)cancel(task);},
  // Switching page/filter must not keep obsolete requests ahead of visible tiles.
  cancelPending(){for(const task of entries.values())if(!task.done)cancel(task);for(let index=queue.length-1;index>=0;index--)if(queue[index].cancelled)queue.splice(index,1);},
  get active(){return active;},get size(){return entries.size;}
 };
}
export function reviewPage(rows,page=1,size=24){const pages=Math.max(1,Math.ceil(rows.length/size)),current=Math.max(1,Math.min(pages,page));return {page:current,pages,total:rows.length,rows:rows.slice((current-1)*size,current*size)};}
