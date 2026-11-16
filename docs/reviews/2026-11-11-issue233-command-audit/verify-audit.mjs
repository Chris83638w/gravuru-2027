// Read local evidence only; never import/execute the archived server sources.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
for(const entry of manifest.entries){const b=fs.readFileSync(path.join(root,entry.file));assert.equal(b.length,entry.bytes);assert.equal(sha(b),entry.sha256,entry.file);}
const v2=fs.readFileSync(path.join(root,'sources/catalog-ff-v2.cjs'));
assert.equal(crypto.createHash('sha1').update(Buffer.from('blob '+v2.length+'\0')).update(v2).digest('hex'),manifest.remoteRunner.gitBlobSha);
assert.equal(sha(v2),'7104c52f22138ffae40d1f1a774674fe3ab7bc44a5d82c167955198a47001935');
let sealed=0;
for(const line of fs.readFileSync(path.join(root,'SHA256SUMS.txt'),'utf8').trim().split('\n')){
 const match=/^([0-9a-f]{64})  (.+)$/.exec(line);assert.ok(match);const relative=match[2];assert.ok(!path.isAbsolute(relative)&&!relative.split('/').includes('..'));assert.equal(sha(fs.readFileSync(path.join(root,relative))),match[1],relative);sealed++;
}
console.log(JSON.stringify({ok:true,originalFilesVerified:manifest.entries.length,sealedFiles:sealed,remoteRunnerGitBlobMatches:true,serverActions:0,all55InvocationsMapped:false,exactFinalPostcheckPayloadAvailable:false}));
