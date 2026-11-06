import test from 'node:test';import assert from 'node:assert/strict';import {createMotifSearchReporter} from './motif-search-analytics.mjs';
test('only settled unique searches count, never every keystroke, category rerender or cleared input',()=>{
 const sent=[],timers=new Map();let serial=0;const reporter=createMotifSearchReporter({send:x=>sent.push(x),schedule:fn=>{timers.set(++serial,fn);return serial;},cancel:id=>timers.delete(id)});
 for(const q of ['k','kr','kre','kreuz'])reporter.observe(q,18);assert.equal(timers.size,1);reporter.flush();assert.deepEqual(sent,[{query:'kreuz',resultCount:18}]);
 reporter.observe(' KREUZ ',18);reporter.flush();assert.equal(sent.length,1);
 reporter.observe('dinosaurier',0);reporter.flush();assert.deepEqual(sent.at(-1),{query:'dinosaurier',resultCount:0});
 reporter.observe('probe',0);reporter.observe('',44);reporter.flush();assert.equal(sent.length,2);
});
