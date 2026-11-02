// Browser screenshots of byte-identical native productPreview SVGs.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.GRAVURU_NODE_MODULES,'package.json')),{chromium}=require('playwright');
const [input,out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const files=fs.readdirSync(input).filter(f=>/^TRE.*\.svg$/.test(f)).filter(f=>{const target=path.join(out,f.replace('.svg','.png'));return !fs.existsSync(target)||fs.statSync(target).mtimeMs<fs.statSync(path.join(input,f)).mtimeMs||fs.readFileSync(target).readUInt32BE(16)!==1560;});let next=0;
const browser=await chromium.launch({headless:true,executablePath:process.env.GRAVURU_BROWSER});
try{await Promise.all(Array.from({length:6},async()=>{
 const page=await browser.newPage({viewport:{width:800,height:550},deviceScaleFactor:2});
 while(next<files.length){const file=files[next++],svg=fs.readFileSync(path.join(input,file));
  await page.setContent('<style>body{margin:0;background:white}img{width:780px;height:520px}</style><img src="data:image/svg+xml;base64,'+svg.toString('base64')+'">');
  await page.locator('img').evaluate(i=>i.decode());await page.locator('img').screenshot({path:path.join(out,file.replace('.svg','.png'))});
  if(next%120===0)console.log(next+'/'+files.length);
 }await page.close();
}));}finally{await browser.close();}
console.log('Native preview screenshots: '+files.length);
