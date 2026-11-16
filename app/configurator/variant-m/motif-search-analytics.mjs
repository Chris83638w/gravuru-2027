// Settled search terms only: no keystroke history, customer IDs or cookies.
export function createMotifSearchReporter({send,schedule=setTimeout,cancel=clearTimeout,delay=1200}){
 let timer=null,pending=null;const sent=new Set();
 const flush=()=>{if(timer!==null)cancel(timer);timer=null;if(!pending)return;const item=pending;pending=null;if(sent.has(item.query))return;sent.add(item.query);Promise.resolve(send(item)).catch(()=>{});};
 return {observe(query,resultCount){query=String(query||'').trim().toLocaleLowerCase('de').replace(/\s+/g,' ');if(timer!==null)cancel(timer);timer=null;pending=query.length>=2&&query.length<=80?{query,resultCount}:null;if(pending&&!sent.has(query))timer=schedule(flush,delay);},flush};
}
export function installMotifSearchAnalytics({el,config}){
 const productId=config?.profile?.binding?.productId;if(!productId||config.workbench)return;
 const reporters=Object.fromEntries(['motif','design'].map(searchKind=>[searchKind,createMotifSearchReporter({send:payload=>fetch('/api/workshop/motif-search-events',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',redirect:'error',keepalive:true,body:JSON.stringify({...payload,productId,searchKind})})})]));
 el.uxReportMotifSearch=(query,count)=>reporters.motif.observe(query,count);
 // The gallery calls this only for a completed current result, with its total.
 // An empty observation cancels the previous pending result when typing resumes.
 el.uxReportDesignSearch=(query,count)=>reporters.design.observe(query,count);
 window.addEventListener('pagehide',()=>{reporters.motif.flush();reporters.design.flush();},{once:true});
}
