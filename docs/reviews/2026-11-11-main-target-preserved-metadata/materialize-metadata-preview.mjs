// Pure file-only transform. No native import entry, DB, API or write callback.
// node materialize-metadata-preview.mjs PRIOR_PREVIEW_JSON_OR_GZ METADATA_CHANGES_JSON NEW_OUTPUT_JSON
import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const [input,changesFile,output]=process.argv.slice(2);assert.equal(process.argv.length,5);assert.equal(fs.existsSync(output),false);
const sha=b=>createHash('sha256').update(b).digest('hex');
const object=v=>Array.isArray(v)?v.map(object):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,object(v[k])])):v;
const group=v=>sha(JSON.stringify(object(v)));
const lexical=v=>Array.isArray(v)?'['+v.map(lexical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+lexical(v[k])).join(',')+'}':JSON.stringify(v);
const binding=v=>sha(lexical(v));
const bytes=fs.readFileSync(input),d=JSON.parse(input.endsWith('.gz')?gunzipSync(bytes):bytes),p=JSON.parse(fs.readFileSync(changesFile));
assert.equal(p.previewOnly,true);assert.equal(group(d),'2da2130230341917f7a99d2a12889c1e2f10e408f64d3532e9c5ea6bae65713c');assert.equal(binding(d),'deb2ce71bf57d5ff85e5f186378d94f58edeecc1ce4d7c4151bebf6e8072886f');
assert.equal(group(d),p.source.productGroupDocumentSha256);assert.equal(binding(d),p.source.idBindingDocumentSha256);
const allowed=['categoryIds','config.profile.name','name','seo.title'];assert.deepEqual(p.changes.map(x=>x.path.join('.')).sort(),allowed);
for(const ch of p.changes){let parent=d;for(const key of ch.path.slice(0,-1)){assert.ok(Object.hasOwn(parent,key));parent=parent[key];}const key=ch.path.at(-1);assert.deepEqual(parent[key],ch.before);parent[key]=structuredClone(ch.after);}
assert.equal(group(d),'ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407');assert.equal(binding(d),'f0bb7d95e89e3aae66ab04454d6476132fe197aaae7c1da48ce8209ced62d285');
assert.equal(group(d),p.target.productGroupDocumentSha256);assert.equal(binding(d),p.target.idBindingDocumentSha256);
const result=Buffer.from(JSON.stringify(object(d)));assert.equal(sha(result),p.target.transportSerializedSha256);fs.writeFileSync(output,result,{flag:'wx'});
assert.equal(sha(fs.readFileSync(input)),sha(bytes));
console.log(JSON.stringify({previewOnly:true,sourceUnchanged:true,productGroupDocumentSha256:group(d),idBindingDocumentSha256:binding(d),transportSerializedSha256:sha(result),output}));
