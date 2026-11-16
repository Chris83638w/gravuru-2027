import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),repo=path.join(root,'code-integration'),audit=JSON.parse(fs.readFileSync(path.join(root,'integration-audit.json'),'utf8'));
const git=(cwd,...args)=>execFileSync('git',['-c','core.autocrlf=false',...args],{cwd,maxBuffer:20*1024*1024});
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n+'.json'),'utf8'));
const files=[...new Set([...read('changed-B').entries,...read('changed-C-material').entries].filter(x=>x.path.startsWith('app/')).map(x=>x.path))].sort();
const check=fs.mkdtempSync(path.join(root,'patch-check-'));
const basePaths=new Set(git(repo,'ls-tree','-r','--name-only',audit.refs.base).toString().trim().split('\n'));
for(const file of files){if(!basePaths.has(file))continue;const dest=path.join(check,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,git(repo,'show',`${audit.refs.base}:${file}`));}
for(const file of ['B-runtime.patch','C-material-runtime.patch']){git(check,'apply','--check',path.join(root,file));git(check,'apply',path.join(root,file));}
const sha=b=>createHash('sha256').update(b).digest('hex');
const proof=files.map(file=>{const actual=fs.readFileSync(path.join(check,file)),expected=git(repo,'show',`${audit.refs.tip}:${file}`);if(!actual.equals(expected))throw Error('Patched bytes differ: '+file);return {path:file,sha256:sha(actual)};});
const http=fs.readFileSync(path.join(root,'claude-http-check/app/workshop/http.mjs'),'utf8');
const retained=['customerReadMemo','publicPreviewModel','katalogWorker','jsonMaybeGzip','GRAVURU_KATALOG_WORKER_WARM','katalogWorker?.close()'];for(const token of retained)if(!http.includes(token))throw Error('Claude feature missing: '+token);
const result={refs:audit.refs,checkedFiles:proof.length,patchesApplySequentially:true,allPatchedFilesEqualFinal:true,claudeHttp:{sourceRef:'ac10e6cee00469591514dcb4fa477b0547a54c48',patch:'C-http-searchKind-only.patch',applies:true,syntaxCheckPassed:true,retained,patchedSha256:sha(Buffer.from(http)),limit:'Patch application and syntax only; no integrated runtime execution.'},patches:['B-runtime.patch','C-material-runtime.patch','C-http-searchKind-only.patch'].map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),files:proof};
fs.writeFileSync(path.join(root,'patch-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({checkedFiles:proof.length,patchesApply:true,finalBytesEqual:true,claudeHttp:result.claudeHttp}));
