import test from 'node:test';import assert from 'node:assert/strict';import {createMotifSearchReporter,installMotifSearchAnalytics} from './motif-search-analytics.mjs';
test('only settled unique searches count, never every keystroke, category rerender or cleared input',()=>{
 const sent=[],timers=new Map();let serial=0;const reporter=createMotifSearchReporter({send:x=>sent.push(x),schedule:fn=>{timers.set(++serial,fn);return serial;},cancel:id=>timers.delete(id)});
 for(const q of ['k','kr','kre','kreuz'])reporter.observe(q,18);assert.equal(timers.size,1);reporter.flush();assert.deepEqual(sent,[{query:'kreuz',resultCount:18}]);
 reporter.observe(' KREUZ ',18);reporter.flush();assert.equal(sent.length,1);
 reporter.observe('dinosaurier',0);reporter.flush();assert.deepEqual(sent.at(-1),{query:'dinosaurier',resultCount:0});
 reporter.observe('probe',0);reporter.observe('',44);reporter.flush();assert.equal(sent.length,2);
});
test('design and motif hooks count separately and a changed query cancels an unfinished result',t=>{
 const sent=[],events={};t.mock.method(globalThis,'fetch',async(url,init)=>{sent.push({url,...JSON.parse(init.body)});return {ok:true};});
 const old=globalThis.window;globalThis.window={addEventListener:(name,fn)=>events[name]=fn};t.after(()=>{if(old===undefined)delete globalThis.window;else globalThis.window=old;});
 const el={};installMotifSearchAnalytics({el,config:{profile:{binding:{productId:'cfg-test'}}}});
 el.uxReportMotifSearch('Haus',8);el.uxReportDesignSearch('Haus',41);events.pagehide();
 assert.deepEqual(sent.map(x=>[x.searchKind,x.query,x.resultCount]),[['motif','haus',8],['design','haus',41]]);
 el.uxReportDesignSearch('Haus',1);events.pagehide();assert.equal(sent.length,2,'paging does not count again');
 el.uxReportDesignSearch('D23',2);el.uxReportDesignSearch('',0);events.pagehide();assert.equal(sent.length,2,'typing cancels the previous pending result');
 el.uxReportDesignSearch('D24',0);events.pagehide();assert.equal(sent.at(-1).query,'d24');assert.equal(sent.at(-1).resultCount,0);
});
