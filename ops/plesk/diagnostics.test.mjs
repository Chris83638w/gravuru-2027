import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startupDiagnostic} from './diagnostics.cjs';
test('startup diagnostics expose only fixed codes and known source locations',()=>{
  const error={code:'EACCES',stack:'Error: synthetic-secret\n    at fail (file:///private/synthetic-secret/config.mjs:8:29)\n    at file:///private/unknown.js:3:4'};
  assert.deepEqual(startupDiagnostic(error),{code:'EACCES',frames:[{file:'config.mjs',line:8,column:29}]});
  assert.equal(JSON.stringify(startupDiagnostic(error)).includes('synthetic-secret'),false);
});
test('arbitrary codes, messages and absent errors are not reflected',()=>{
  assert.deepEqual(startupDiagnostic({code:'synthetic-secret',message:'synthetic-secret'}),{code:'UNKNOWN',frames:[]});
  assert.deepEqual(startupDiagnostic(null),{code:'UNKNOWN',frames:[]});
});
