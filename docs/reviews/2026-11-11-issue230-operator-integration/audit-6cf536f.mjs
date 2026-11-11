import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const repo = resolve(process.argv[2] || 'work/restabschluss/code-integration');
const out = resolve(process.argv[3] || 'work/restabschluss/claude-answer-a-6cf.json');
const git = args => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 100 * 1024 * 1024 });
const sha = '6cf536f206cd3b50e77bd2bbb1df9be390c35e8f';
const reported = {
 'app/workshop/batch.mjs':'07b1ea0',
 'app/workshop/product-model.mjs':'1993bc3',
 'app/workshop/shop-entry.mjs':'ab2dfbc',
 'app/workshop/shop-preparation.mjs':'4410b6a',
 'app/configurator/variant-m/acrylic-scene.css':'372bf86',
 'app/configurator/variant-m/acrylic-scene.mjs':'9dc52c5',
 'app/configurator/variant-m/contract.mjs':'c8a6eb1',
 'app/configurator/variant-m/scalable-size-state.mjs':'149e44a',
 'app/configurator/variant-m/ux.mjs':'a001817',
 'app/configurator/variant-m/workshop-review.mjs':'4248d55',
 'app/configurator/variant-m/scalable-acrylic-scene.mjs':'e83864e',
};
const files = Object.entries(reported).map(([path, serverPrefix]) => {
 const bytes = git(['show', `${sha}:${path}`]);
 const sha256 = createHash('sha256').update(bytes).digest('hex');
 return { path, bytes: bytes.length, sha256, serverPrefix, prefixMatches: sha256.startsWith(serverPrefix) };
});
const changedFiles = git(['diff-tree','--no-commit-id','--name-status','-r',sha]).toString('utf8').trim().split('\n').map(line => {const [status,path]=line.split('\t');return {status,path};});
const entries = git(['ls-tree','-rt',sha]).toString('utf8').trim().split('\n').map(line => {
 const match = line.match(/^(\d+) (\w+) ([a-f0-9]+)\t(.+)$/); return {type:match[2], sha:match[3], path:match[4]};
});
const objects = [...new Set([sha,...git(['show','-s','--format=%T%n%P',sha]).toString().trim().split(/\s+/),...entries.map(x=>x.sha)])];
const checked = execFileSync('git',['-C',repo,'cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],{input:objects.join('\n')+'\n',maxBuffer:100*1024*1024}).toString().trim().split('\n');
const missingObjects = checked.filter(line=>line.endsWith(' missing'));
const scanPatterns = [
 ['private_key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
 ['known_token',/(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|shpat_[A-Za-z0-9]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16})/],
 ['url_credentials',/https?:\/\/[^\s/:"']+:[^\s/@"']+@/],
 ['credential_literal',/(?:password|api_?key|secret|access_?token|auth_?token)\s*[:=]\s*["'][^"'\n]{8,}["']/i],
 ];
const scanHits = [];
for(const {path} of changedFiles){
 const content = git(['show',`${sha}:${path}`]).toString('utf8');
 content.split('\n').forEach((line,index)=>{ for(const [kind,re]of scanPatterns) if(re.test(line)) scanHits.push({path,line:index+1,kind}); });
}
const result = {
 commit:sha, localRef:'refs/remotes/origin/dev/acryl-original18-konfi-20261110',
 metadata:git(['show','-s','--format=%H%n%T%n%P%n%cI%n%s',sha]).toString().trim().split('\n'),
 diffstat:git(['diff','--stat',`${sha}^`,sha]).toString().trim(),
 changedFiles, files, all11PrefixesMatch:files.every(f=>f.prefixMatches),
 objectCompleteness:{checkedUniqueObjects:objects.length,snapshotEntries:entries.length,missingObjects,completeSnapshotAndDirectParent:missingObjects.length===0,fullAncestryClaimed:false},
 boundedSecretScan:{scope:'35 complete changed files only, not full history or repository; common hardcoded credential patterns; hits omit values',scanHits},
 limits:['7-character matches corroborate only the server prefixes quoted by Claude; no independent full server hashes available.','Existing remote-tracking ref is local evidence, not evidence that GitHub still contains or serves the commit.','A complete commit snapshot does not imply complete transitive history or a proven safe direct push.'],
};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({out,all11PrefixesMatch:result.all11PrefixesMatch,files,objectCompleteness:result.objectCompleteness,scanHits},null,2));
