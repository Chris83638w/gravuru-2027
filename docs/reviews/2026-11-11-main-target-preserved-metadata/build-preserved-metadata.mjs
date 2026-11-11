// Pure preview transform over the immutable reviewed label preview. No database/API.
// node build-preserved-metadata.mjs CODE_ROOT INPUT_PREVIEW_GZ NEW_OUTPUT_DIRECTORY
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const [code,input,out]=process.argv.slice(2);assert.equal(process.argv.length,5);
const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const group=v=>sha(JSON.stringify(canonical(v)));
const bindingJson=v=>Array.isArray(v)?'['+v.map(bindingJson).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+bindingJson(v[k])).join(',')+'}':JSON.stringify(v);
const binding=v=>sha(bindingJson(v));
const sourceBytes=fs.readFileSync(input),source=JSON.parse(gunzipSync(sourceBytes));
assert.equal(sha(sourceBytes),'6b2d5989b1dd4859f4a6923faab2cbf9f25102f1f3e95edd77dad48b386c52cc');
assert.equal(group(source),'2da2130230341917f7a99d2a12889c1e2f10e408f64d3532e9c5ea6bae65713c');
assert.equal(binding(source),'deb2ce71bf57d5ff85e5f186378d94f58edeecc1ce4d7c4151bebf6e8072886f');
const doc=structuredClone(source),name='Türschild Acrylglas 3 mm – Form und Größe selbst wählen';
doc.name=name;doc.seo={title:name,description:''};
doc.categoryIds=['extern-shopifyproductid-16190784602492','linie-acryl-tuerschilder'];
const model=path.join(code,'app/workshop/product-model.mjs');
const {validateProductDocument}=await import(pathToFileURL(model));
const target=validateProductDocument(doc);
assert.equal(target.config.profile.name,name);
const changed=[];
function diff(a,b,p=[]){
 if(JSON.stringify(a)===JSON.stringify(b))return;
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
  assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort());for(const key of Object.keys(a))diff(a[key],b[key],[...p,key]);
 }else changed.push({path:p,before:a,after:b});
}
diff(source,target);
assert.deepEqual(changed.map(x=>x.path.join('.')).sort(),['categoryIds','config.profile.name','name','seo.title']);
assert.equal(group(source.elementRights),group(target.elementRights));
const c=target.config,f=c.familyFormats,starter=f.designs.find(d=>d.id===c.profile.defaultDesignId);
assert.equal(starter.id,'katalog-TAE-V2A-8x5-D1');assert.equal(f.source.shopProduct.defaultDesignId,'TAE-V2A-8x5-D1');
const objects=f.designs.flatMap(d=>d.objects),motifs=objects.filter(o=>o.type==='motif');
const blocked=[];for(const design of f.designs)for(const o of design.objects)if(o.type==='motif'&&(!target.elementRights[design.id][o.id].replace||!target.elementRights[design.id][o.id].delete))blocked.push([design.id,o.id]);
assert.equal(blocked.length,0);
const bytes=Buffer.from(JSON.stringify(canonical(target))),compressed=gzipSync(bytes,{level:9});
const pins={productGroupDocumentSha256:group(target),idBindingDocumentSha256:binding(target),transportSerializedSha256:sha(bytes),gzipSha256:sha(compressed)};
const proof={previewOnly:true,readyForImport:false,nativeProductValidation:true,sqlOrRegistryOpened:false,importCalled:false,
 source:{gzipSha256:sha(sourceBytes),productGroupDocumentSha256:group(source),idBindingDocumentSha256:binding(source)},target:pins,
 evidence:'https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6807404988',changes:changed,
 preserved:{elementRightsProductGroupSha256:group(target.elementRights),familyFormatsProductGroupSha256:group(f),profileAssignments:target.profileAssignments,moduleProfile:target.config.moduleProfile,productionProfile:target.productionProfile??null},
 rights:{designs:f.designs.length,objects:objects.length,text:objects.filter(o=>o.type==='text').length,nativeMotifObjects:motifs.length,allNativeMotifsReplaceDelete:true,blocked},
 start:{profileDefaultDesignId:c.profile.defaultDesignId,shopProduct:f.source.shopProduct,defaultSize:f.defaultSize,defaultColor:f.defaultColor,katalog:starter.katalog,texts:starter.objects.filter(o=>o.type==='text').map(o=>o.text)},
 limits:['Resource inheritance must be checked using the actual preserved categories and actual private library.','This is a new preview document, not a new native plan, an import entry or a confirmation.','All frozen v9 documents and the prior published preview remain unchanged.'],
 validator:{path:'app/workshop/product-model.mjs',sha256:sha(fs.readFileSync(model))}};
fs.mkdirSync(out,{recursive:true});
for(const name of ['target-document.preview.json.gz','metadata-changes.json','verification.json'])assert.equal(fs.existsSync(path.join(out,name)),false,'Refuse overwrite '+name);
fs.writeFileSync(path.join(out,'target-document.preview.json.gz'),compressed,{flag:'wx'});
fs.writeFileSync(path.join(out,'metadata-changes.json'),JSON.stringify({previewOnly:true,source:proof.source,target:pins,evidence:proof.evidence,changes:changed},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
assert.equal(sha(fs.readFileSync(input)),sha(sourceBytes));
console.log(JSON.stringify({passed:true,target:pins,changes:changed.map(x=>x.path.join('.')),rights:proof.rights,start:proof.start},null,2));
