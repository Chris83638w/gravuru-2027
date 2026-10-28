// Process-wide admission control: all stores and customer sessions share two
// preview slots and a bounded FIFO. Jobs yield before expensive SVG work.
export function createPreviewQueue({concurrency=2,maxPending=24}={}){
 let running=0;const waiting=[];
 const busy=()=>Object.assign(Error('Die Vorschauen werden gerade geladen. Bitte kurz warten.'),{status:429,code:'shop_gallery_busy'});
 function drain(){
  while(running<concurrency&&waiting.length){
   const job=waiting.shift();running++;
   setImmediate(async()=>{try{job.resolve(await job.work());}catch(error){job.reject(error);}finally{running--;drain();}});
  }
 }
 return work=>new Promise((resolve,reject)=>{
  if(running>=concurrency&&waiting.length>=maxPending){reject(busy());return;}
  waiting.push({work,resolve,reject});drain();
 });
}
export const queueGalleryPreview=createPreviewQueue();
