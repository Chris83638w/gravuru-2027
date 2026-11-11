// Local syntax/hash checks only. node --check parses but does not run the sources.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const sources=files(path.join(root,'sources')).filter(f=>f.endsWith('.cjs'));
for(const source of sources)cp.execFileSync(process.execPath,['--check',source],{stdio:'pipe'});
const secretPatterns=[/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{40,}/,/shpat_[A-Fa-f0-9]{24,}/];
const findings=[];
for(const file of files(root).filter(f=>!['seal-audit.mjs','SHA256SUMS.txt'].includes(path.basename(f)))){
 const text=fs.readFileSync(file,'utf8');if(secretPatterns.some(p=>p.test(text)))findings.push(path.relative(root,file));
}
if(findings.length)throw Error('Potential secret material found in '+findings.join(', '));
fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify({syntaxOnly:true,sourceFilesParsed:sources.map(f=>path.relative(root,f).replaceAll('\\','/')),secretPatternScan:{obviousCredentialPatternsFound:0,completeSecretDetectionClaimed:false},copiedSourceExecuted:false,serverActions:0,all55Mapping:false},null,2)+'\n');
const list=files(root).filter(f=>path.basename(f)!=='SHA256SUMS.txt').map(f=>({f,relative:path.relative(root,f).replaceAll('\\','/')})).sort((a,b)=>a.relative.localeCompare(b.relative,'en'));
fs.writeFileSync(path.join(root,'SHA256SUMS.txt'),list.map(({f,relative})=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')+'  '+relative).join('\n')+'\n');
console.log(JSON.stringify({syntaxParsed:sources.length,sealedFiles:list.length,bytes:list.reduce((s,{f})=>s+fs.statSync(f).size,0),serverActions:0}));
