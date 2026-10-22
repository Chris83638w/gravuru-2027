import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {patchPreviewPhotoLimit} from '../legacy-patches/preview-price-compat.mjs';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),out=path.join(root,'analysis/photo-15mb-v1');
const sha=b=>createHash('sha256').update(b).digest('hex');
const expected={legacy:'afb6913dbba94039cdcd9f7f988d8ad49057ba61d5b5e536c06053c0e12a83c3',acryl:'ce8a67af166134158bcda55821b7c620114ce14c5023f59f61b1a4f824d85ac8'};
if(sha(fs.readFileSync(path.join(root,'app/configurator/variant-m/ux.mjs')))!==expected.acryl)throw Error('Canonical editor changed; compare before replacing');
fs.mkdirSync(out);const files=[];
for(const store of ['legacy','acryl']){
 const before=fs.readFileSync(path.join(root,'analysis/preview-photo-limit-v1',store,'ux.mjs'));
 if(sha(before)!==expected[store])throw Error('Installed baseline differs');
 const updated=patchPreviewPhotoLimit(fs.readFileSync(path.join(root,'analysis/preview-price-fix-v1',store,'ux.mjs'),'utf8'));
 fs.mkdirSync(path.join(out,store));fs.writeFileSync(path.join(out,store,'ux.mjs'),updated,{flag:'wx'});
 files.push({store,path:'app/configurator/variant-m/ux.mjs',member:store+'/ux.mjs',before:sha(before),after:sha(updated)});
 const old=fs.readFileSync(path.join(root,'analysis/combined-id-release-03',store,'app/workshop/photo-import.py'));
 if(sha(old)!=='dfc4784f7ed70b0b78e8e955879e273641a01e3eb86575bde055656f6c6d1e64')throw Error('Photo baseline differs');
 files.push({store,path:'app/workshop/photo-import.py',member:'photo-import.py',before:sha(old),after:sha(fs.readFileSync(path.join(root,'app/workshop/photo-import.py')))});
}
for(const file of ['photo-import.py','photo-import.test.py'])fs.copyFileSync(path.join(root,'app/workshop',file),path.join(out,file),fs.constants.COPYFILE_EXCL);
fs.copyFileSync(path.join(root,'ops/install-photo-15mb.py'),path.join(out,'install.py'),fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({schema:'gravuru-photo-15mb/v1',files},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(root,'app/configurator/variant-m/ux.mjs'),fs.readFileSync(path.join(out,'acryl/ux.mjs')));
console.log(JSON.stringify(files));
