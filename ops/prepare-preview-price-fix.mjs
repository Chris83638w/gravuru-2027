import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {patchPreviewPrice} from '../legacy-patches/preview-price-compat.mjs';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const out=path.join(root,'analysis/preview-price-fix-v1');
const rel='app/configurator/variant-m/ux.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
fs.mkdirSync(out);const files=[];
for(const kind of ['legacy','acryl']){
  const source=fs.readFileSync(path.join(root,'analysis/combined-id-release-03',kind,rel),'utf8');
  const updated=patchPreviewPrice(source);
  fs.mkdirSync(path.join(out,kind));
  fs.writeFileSync(path.join(out,kind,'ux.mjs'),updated,{flag:'wx'});
  files.push({store:kind,path:rel,before:sha(source),after:sha(updated)});
}
const canonical=path.join(root,rel),source=fs.readFileSync(canonical,'utf8');
fs.writeFileSync(path.join(out,'canonical-before.mjs'),source,{flag:'wx'});
fs.writeFileSync(canonical,patchPreviewPrice(source));
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({schema:'gravuru-preview-price-fix/v1',files},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,files}));
