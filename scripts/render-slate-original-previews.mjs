import fs from 'node:fs';
import path from 'node:path';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {originalPreview} from './lib/slate-original-preview.mjs';
const args=process.argv.slice(2),at=args.indexOf('--data');if(at<0)throw Error('--data required');
const root=path.resolve(args[at+1]),read=p=>JSON.parse(fs.readFileSync(p));
const report=read(path.join(root,'preparation-report.json')),assets=createDesignAssetStore({filename:path.join(root,'design-assets.sqlite')});let count=0;
try{for(const product of report.products){const d=read(path.join(root,product.file)),size=product.key.split(':')[0];for(const design of d.config.profile.designs){const r=report.originals.find(r=>r.id===design.katalog.originalId),target=r.targets.find(t=>t.sizeKey===size&&t.status==='prepared');if(!target)throw Error('Unknown prepared target');fs.writeFileSync(path.join(root,target.preview),originalPreview(d.config,design.id,assets));count++;}}console.log(JSON.stringify({nativePreviews:count,embeddedMasks:true}));}finally{assets.close();}
