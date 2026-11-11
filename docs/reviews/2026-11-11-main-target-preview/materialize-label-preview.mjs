// Pure file transform over the already delivered native v9 plan. No database/API.
// node materialize-label-preview.mjs PLAN_JSON_OR_GZ LABEL_CHANGES_JSON NEW_OUTPUT_JSON
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [input,changeFile,output]=process.argv.slice(2);
assert.equal(process.argv.length,5,'Exactly three paths required.');
assert.equal(fs.existsSync(output),false,'Output must be a new file.');
const sha=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>sha(JSON.stringify(canonical(v)));
// Native ID-binding digest is distinct from the product-group digest above.
const bindingJson=v=>Array.isArray(v)?'['+v.map(bindingJson).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+bindingJson(v[k])).join(',')+'}':JSON.stringify(v);
const bindingDigest=v=>sha(bindingJson(v));
const buffer=fs.readFileSync(input),plan=JSON.parse(input.endsWith('.gz')?gunzipSync(buffer):buffer),patch=JSON.parse(fs.readFileSync(changeFile));
assert.equal(plan.id,'pgp_80a0c3b9-b599-428f-8626-05e3ace880b6');
assert.equal(plan.planHash,'83cd95dc900fcbc9631086f54c26591e2dbab75d285cc80fa46d64673f63bb33');
const doc=structuredClone(plan.products[0].document);
assert.equal(patch.sourceProductGroupDocumentSha256,'746f682929262b9a127a8d0613155dfba790ca57c524d027aa99797c5b40e3f8');
assert.equal(patch.targetProductGroupDocumentSha256,'2da2130230341917f7a99d2a12889c1e2f10e408f64d3532e9c5ea6bae65713c');
assert.equal(patch.sourceIdBindingDocumentSha256,'d75c917483a5ddedd380ac48c02c4ec3aea36b46f688557b8b9769fc5536eda2');
assert.equal(patch.targetIdBindingDocumentSha256,'deb2ce71bf57d5ff85e5f186378d94f58edeecc1ce4d7c4151bebf6e8072886f');
assert.equal(digest(doc),patch.sourceProductGroupDocumentSha256);assert.equal(bindingDigest(doc),patch.sourceIdBindingDocumentSha256);assert.equal(patch.changes.length,6);
for(const change of patch.changes){
 assert.ok(Array.isArray(change.path)&&change.path.at(-1)==='label');
 assert.ok(change.path.every(k=>Number.isSafeInteger(k)&&k>=0||typeof k==='string'&&!['__proto__','constructor','prototype'].includes(k)));
 let parent=doc;for(const k of change.path.slice(0,-1)){assert.ok(Object.hasOwn(parent,k));parent=parent[k];}
 assert.equal(parent.label,change.before);parent.label=change.after;
}
assert.equal(digest(doc),patch.targetProductGroupDocumentSha256);
assert.equal(bindingDigest(doc),patch.targetIdBindingDocumentSha256);
// Stable transport serialization. The SQL stored-byte digest must be read after
// any future real save because the native validator can reorder object keys.
const bytes=Buffer.from(JSON.stringify(canonical(doc)));
assert.equal(sha(bytes),patch.targetProductGroupDocumentSha256);
fs.writeFileSync(output,bytes,{flag:'wx'});
console.log(JSON.stringify({previewOnly:true,sourceUnchanged:true,productGroupDocumentSha256:digest(doc),idBindingDocumentSha256:bindingDigest(doc),transportSerializedSha256:sha(bytes),output}));
