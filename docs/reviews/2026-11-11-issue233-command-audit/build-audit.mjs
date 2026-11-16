// Local evidence packaging only. Never invokes any recovered server script.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url)),workspace=path.resolve(out,'../../..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const entries=[];
function preserve(original,destination,kind,notes){
 const bytes=fs.readFileSync(path.join(workspace,original)),dest=path.join(out,destination);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 if(fs.existsSync(dest))assert.deepEqual(fs.readFileSync(dest),bytes,'refuse to replace different evidence: '+destination);
 else fs.writeFileSync(dest,bytes,{flag:'wx'});
 const item={file:destination,original,bytes:bytes.length,sha256:sha(bytes),kind,notes};
 const encoded=path.join(workspace,original+'.b64');
 if(fs.existsSync(encoded)){
  const b64=fs.readFileSync(encoded),decoded=Buffer.from(b64.toString('utf8'),'base64');assert.deepEqual(decoded,bytes);
  item.localBase64Evidence={original:original+'.b64',encodedBytes:b64.length,encodedSha256:sha(b64),decodedSha256:sha(decoded),byteEqual:true,serverInvocationIdentityEstablished:false};
 }
 entries.push(item);return bytes;
}
const common='work/catalog-final/';
preserve(common+'catalog-ff.cjs','sources/catalog-ff-v1.cjs','historical-runner','Mika V1: inspect failed with ENOBUFS; do not execute. No V1 apply documented.');
const v2=preserve(common+'catalog-ff-v2.cjs','sources/catalog-ff-v2.cjs','applied-runner','Astra V2 runner; SHA pinned before documented server apply. Exact outer node -e transport not retained here.');
preserve(common+'catalog-ff.test.cjs','sources/catalog-ff.test.cjs','local-test-source','Local isolated Git tests only; not a server command. Depends on catalog-ff-v2.cjs.');
preserve(common+'writer-preflight.cjs','sources/writer-preflight.cjs','read-only-helper','Reads same-UID /proc metadata/cmdline and named lock paths; prints only counts, pid/comm and lock basenames, never command lines/environment.');
preserve(common+'catalog-config-check.cjs','sources/catalog-config-check.cjs','read-only-helper','Reads app.cjs as text, never executes it; prints only GRAVURU_KATALOG and match classification. argv[2] is a standalone-file convention.');
preserve(common+'postcheck.cjs','sources/postcheck-original.cjs','original-read-only-helper','Original saved source, not asserted byte-identical to successful eval payload. Successful invocation used createRequire(runner), package cwd and argv adaptation; exact final bytes not retained.');
for(const name of ['writer-preflight','catalog-config-check','postcheck'])preserve(common+name+'.command.sh','historical-command-templates/'+name+'.command.sh','prepared-shell-template','As-found quoted node -e template. Not an execution transcript; postcheck still contains the old require(runner) and placeholder backup argument.');
preserve(common+'manifest.json','inputs/manifest.json','pinned-input','552 target paths and three preserved local differences; fixed catalog scope, no database payload.');
preserve(common+'proof.json','historical/proof-v1.json','historical-local-proof','Earlier local preparation summary; not a fresh server receipt.');
preserve(common+'proof-v2.json','historical/proof-v2.json','historical-local-proof','V2 correction summary before takeover; serverStatus is historical.');
preserve(common+'README.md','historical/README-package-as-found.md','historical-instructions','Contains obsolete V1 examples and pre-apply state; evidence only, not current operator instructions.');
preserve(common+'review-20261111.md','historical/review-20261111.md','independent-review','Pre-apply V2 review and fixed paths/hashes.');
preserve('outputs/Katalog-Uebernahme/Pruefbeleg.json','evidence/Pruefbeleg.json','acceptance-summary','Summarizes observed server results; not a raw server log or complete command history.');
preserve('outputs/Katalog-Uebernahme/Server-Nachpruefung.txt','evidence/Server-Nachpruefung.txt','saved-ui-output-extract','Four saved Plesk result entries; some output is truncated by UI. Contains no executable payload transcript.');
preserve('outputs/Katalog-Uebernahme/Ergebnis.md','evidence/Ergebnis-Katalog.md','result-report','Historical catalog takeover result.');
const pin=JSON.parse(fs.readFileSync(path.join(out,'remote-source-pin.json')));
const gitBlob=crypto.createHash('sha1').update(Buffer.from('blob '+v2.length+'\0')).update(v2).digest('hex');assert.equal(gitBlob,pin.gitBlobSha);
assert.equal(sha(v2),'7104c52f22138ffae40d1f1a774674fe3ab7bc44a5d82c167955198a47001935');
const acceptance=JSON.parse(fs.readFileSync(path.join(out,'evidence/Pruefbeleg.json')));
const evidenceVerification=acceptance.evidenceFiles.map(ref=>{const b=fs.readFileSync(path.join(workspace,'outputs/Katalog-Uebernahme',ref.file));const actual=sha(b);assert.equal(actual,ref.sha256);return {original:'outputs/Katalog-Uebernahme/'+ref.file,bytes:b.length,sha256:actual,acceptancePinMatches:true,copied:entries.some(x=>x.original==='outputs/Katalog-Uebernahme/'+ref.file)};});
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({schema:'gravuru/server-command-audit/v1',scope:'local evidence only; no server actions',unattributedReportedInvocationCount:55,fullReportedCountIndependentlyVerified:false,exactSuccessfulPostcheckPayloadAvailable:false,remoteRunner:{...pin,computedGitBlobSha:gitBlob,matches:true},entries,evidenceVerification},null,2)+'\n');
console.log(JSON.stringify({filesPreserved:entries.length,runnerGitBlobMatches:true,acceptanceEvidenceHashesChecked:evidenceVerification.length,serverActions:0,full55Mapping:false}));
