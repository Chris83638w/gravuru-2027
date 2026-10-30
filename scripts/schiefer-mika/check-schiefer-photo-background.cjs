const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/Mikail Erdem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve(__dirname,'../outputs/schiefer-foto-alle-groessen/fotorand-korrektur');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const p=await browser.newPage({viewport:{width:1500,height:1050}});const key='H-rechteck-D221';
 const before=fs.readFileSync(path.join(out,key+'-vorher.svg'),'utf8'),after=fs.readFileSync(path.join(out,key+'-nachher.svg'),'utf8');
 const results=[];
 for(const surface of ['#242627','#454c50','#171b1e']){
  const urls=[before,after].map(s=>'data:image/svg+xml;base64,'+Buffer.from(s.replace('fill="#242627"','fill="'+surface+'"')).toString('base64'));
  const result=await p.evaluate(async({urls,surface})=>{
   async function pixels(url){const i=new Image();i.src=url;await i.decode();const c=document.createElement('canvas');c.width=880;c.height=560;const ctx=c.getContext('2d');ctx.drawImage(i,0,0,880,560);return ctx.getImageData(0,0,880,560).data}
   const a=await pixels(urls[0]),b=await pixels(urls[1]),rgb=surface.slice(1).match(/../g).map(x=>parseInt(x,16));let black=0,matched=0,details=0,detailsKept=0;
   for(let n=0;n<a.length;n+=4){if(a[n]===0&&a[n+1]===0&&a[n+2]===0&&a[n+3]===255){black++;if(rgb.every((v,j)=>Math.abs(b[n+j]-v)<=1))matched++}const x=(n/4)%880,y=Math.floor(n/4/880);if(x>80&&x<480&&y>80&&y<540&&a[n]>120){details++;if(b[n]>=a[n]&&b[n+1]>=a[n+1]&&b[n+2]>=a[n+2])detailsKept++}}
   return {surface,blackPixels:black,blackPixelsNowMaterial:matched,lightPhotoDetailPixels:details,lightPhotoDetailPixelsVisible:detailsKept};
  },{urls,surface});
  if(result.blackPixels<1000||result.blackPixelsNowMaterial!==result.blackPixels||result.lightPhotoDetailPixels<1000||result.lightPhotoDetailPixelsVisible!==result.lightPhotoDetailPixels)throw Error(JSON.stringify(result));results.push(result);
 }
 const keys=['H-rechteck-D221','K-rechteck-D217','H-rechteck-D236','K-herz-D9'];
 const html='<!doctype html><meta charset="utf-8"><style>body{font:20px Segoe UI;background:#eee;margin:0;padding:24px}h1{font-size:28px}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{background:white;padding:12px;margin:0}img{width:100%;display:block}figcaption{margin:8px}</style><h1>Fotohintergrund in der Schiefervorschau</h1><p>Links vorher · rechts jetzt. Originalfoto und Maske unverändert; Upload-Hinweis bleibt sichtbar.</p><main>'+keys.map(k=>['vorher','nachher'].map(v=>'<figure><img src="'+k+'-'+v+'.svg"><figcaption>'+k+' · '+v+'</figcaption></figure>').join('')).join('')+'</main>';
 fs.writeFileSync(path.join(out,'VERGLEICH.html'),html);await p.goto(pathToFileURL(path.join(out,'VERGLEICH.html')).href);await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await p.screenshot({path:path.join(out,'vergleich.png'),fullPage:true});
 await p.locator('figure').nth(1).locator('img').screenshot({path:path.join(out,'kira-ohne-schwarzen-fotorand.png')});
 fs.writeFileSync(path.join(out,'pixel-pruefung.json'),JSON.stringify({browser:'Chrome',results,errors:[]},null,2));console.log(JSON.stringify(results));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
