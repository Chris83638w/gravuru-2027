import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const [codeRoot,outputPath]=process.argv.slice(2);
assert.ok(codeRoot&&outputPath,'node compare-gallery-memory.mjs CODE_ROOT NEW_OUTPUT.json');
assert.equal(fs.existsSync(outputPath),false,'do not overwrite evidence');
const sourceFile='app/workshop/shop-product-binding-store.mjs';
const testFile=path.join(codeRoot,'app/workshop/shop-product-binding-gallery-memory.test.mjs');
const original=execFileSync('git',['show','c6f9910:'+sourceFile],{cwd:codeRoot,encoding:'utf8',maxBuffer:1024*1024,windowsHide:true});
const current=fs.readFileSync(path.join(codeRoot,sourceFile));
const sha=x=>createHash('sha256').update(x).digest('hex');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-gallery-comparison-'));
const run=args=>{
 const child=spawnSync(process.execPath,args,{encoding:'utf8',timeout:45000,maxBuffer:1024*1024,windowsHide:true});
 assert.equal(child.error,undefined);assert.equal(child.signal,null);
 return {exit:child.status,report:JSON.parse(child.stdout.trim()),stderr:child.stderr.trim()};
};
try{
 const db=path.join(temp,'synthetic.sqlite');
 const seed=run([testFile,'--seed-memory-fixture',db]);assert.equal(seed.exit,0);
 // Only relative import specifiers are made absolute. The old store logic is
 // unchanged and exists in this new scratch directory, never in the worktree.
 const relocated=original.replace(/(from\s+['"])(\.\.?\/[^'"]+)(['"])/g,(_,a,b,c)=>a+pathToFileURL(path.resolve(codeRoot,'app/workshop',b)).href+c);
 const oldFile=path.join(temp,'original-store.mjs');fs.writeFileSync(oldFile,relocated,{flag:'wx'});
 const args=['--expose-gc','--max-old-space-size=128',testFile,'--memory-worker',db];
 const before=run([...args,pathToFileURL(oldFile).href]);
 const after=run([...args,pathToFileURL(path.join(codeRoot,sourceFile)).href]);
 assert.equal(before.exit,23,'baseline must stop at the controlled retained-heap threshold');
 assert.equal(before.report.outcome,'retained_heap_limit');assert.equal(before.report.sqliteChanges,0);
 assert.equal(after.exit,0);assert.equal(after.report.outcome,'pass');assert.equal(after.report.returnedBindings,40);assert.equal(after.report.sqliteChanges,0);
 const proof={schema:'gallery-binding-retention-comparison/v1',scope:'async listActiveForGallery without transaction/revisionReadScope or customer read memo; forced-GC retention samples, not full application RSS peak',synthetic:true,baselineCommit:execFileSync('git',['rev-parse','c6f9910'],{cwd:codeRoot,encoding:'utf8',windowsHide:true}).trim(),sourceFile,baselineSourceSha256:sha(original),relocatedSourceSha256:sha(relocated),patchedSourceSha256:sha(current),testSha256:sha(fs.readFileSync(testFile)),node:process.version,platform:process.platform,fixtureBytes:fs.statSync(db).size,seed:seed.report,before,after,allPassed:true};
 fs.writeFileSync(outputPath,JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({allPassed:true,before:{exit:before.exit,peakRetainedBytes:before.report.peakRetainedBytes,processed:before.report.samples.at(-1).processed},after:{exit:after.exit,peakRetainedBytes:after.report.peakRetainedBytes,bindings:after.report.returnedBindings},output:outputPath}));
}finally{
 assert.equal(path.dirname(fs.realpathSync(temp)),fs.realpathSync(os.tmpdir()));fs.rmSync(temp,{recursive:true,force:true});
}
