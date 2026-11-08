// Local synthetic timing probe only. No production module imports this file.
import {DatabaseSync} from 'node:sqlite';
export function installActivationProbe(workshop){
 const metrics={transactionMs:0,rawRead:{calls:0,ms:0,characters:0},byteComparison:{calls:0,ms:0},sql:{calls:0,ms:0},methods:{}};
 const nativePrepare=DatabaseSync.prototype.prepare,queries=new WeakMap();
 const scratch=new DatabaseSync(':memory:'),statement=scratch.prepare('SELECT 1'),prototype=Object.getPrototypeOf(statement);
 const original={get:prototype.get,all:prototype.all,run:prototype.run};
 let active=false,finished=false;
 DatabaseSync.prototype.prepare=function(sql,...args){const result=nativePrepare.call(this,sql,...args);queries.set(result,sql);return result;};
 for(const name of Object.keys(original))prototype[name]=function(...args){
  if(!active)return original[name].apply(this,args);
  const start=performance.now();let value;
  try{return value=original[name].apply(this,args);}finally{
   const ms=performance.now()-start;metrics.sql.calls++;metrics.sql.ms+=ms;
   if(queries.get(this)?.includes('CAST(document AS BLOB)')){metrics.byteComparison.calls++;metrics.byteComparison.ms+=ms;}
   if(queries.get(this)?.includes('p.revision AS head')&&queries.get(this)?.includes('r.document')){
    metrics.rawRead.calls++;metrics.rawRead.ms+=ms;metrics.rawRead.characters+=typeof value?.document==='string'?value.document.length:0;
   }
  }
 };
 const restorers=[];
 for(const name of ['bindVariants','bindingPricing','catalogLiveApprovals','approveCatalogLiveProducts']){
  const fn=workshop.orderIntake[name];restorers.push(()=>workshop.orderIntake[name]=fn);
  workshop.orderIntake[name]=function(...args){if(!active)return fn.apply(this,args);const start=performance.now();try{return fn.apply(this,args);}finally{const row=metrics.methods[name]??={calls:0,ms:0};row.calls++;row.ms+=performance.now()-start;}};
 }
 const transact=workshop.orderIntake.withBindingTransaction;
 workshop.orderIntake.withBindingTransaction=function(work){const start=performance.now();active=true;try{return transact.call(this,work);}finally{metrics.transactionMs+=performance.now()-start;active=false;}};
 return {finish(){if(finished)return metrics;finished=true;active=false;workshop.orderIntake.withBindingTransaction=transact;restorers.forEach(fn=>fn());DatabaseSync.prototype.prepare=nativePrepare;for(const name of Object.keys(original))prototype[name]=original[name];scratch.close();return metrics;}};
}
