// Settled search terms only: no keystroke history, customer IDs or cookies.
export function createMotifSearchReporter({send,schedule=setTimeout,cancel=clearTimeout,delay=1200}){
 let timer=null,pending=null;const sent=new Set();
 const flush=()=>{if(timer!==null)cancel(timer);timer=null;if(!pending)return;const item=pending;pending=null;if(sent.has(item.query))return;sent.add(item.query);Promise.resolve(send(item)).catch(()=>{});};
 return {observe(query,resultCount){query=String(query||'').trim().toLocaleLowerCase('de').replace(/\s+/g,' ');if(timer!==null)cancel(timer);timer=null;pending=query.length>=2&&query.length<=80?{query,resultCount}:null;if(pending&&!sent.has(query))timer=schedule(flush,delay);},flush};
}
export function installMotifSearchAnalytics({el,config}){
 const productId=config?.profile?.binding?.productId;if(!productId||config.workbench)return;
 const reporter=createMotifSearchReporter({send:payload=>fetch('/api/workshop/motif-search-events',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',redirect:'error',keepalive:true,body:JSON.stringify({...payload,productId})})});
 el.uxReportMotifSearch=(query,count)=>reporter.observe(query,count);
 window.addEventListener('pagehide',reporter.flush,{once:true});
}
