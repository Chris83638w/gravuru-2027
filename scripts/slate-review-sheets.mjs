import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const safe=s=>String(s).replace(/[^\w.-]+/g,'_');
export async function renderReviewSheets({results,out,root,family,katalog,png,withPages,reuseSources=false}){
 const registry=JSON.parse(fs.readFileSync(path.join(root,'schriften/schriften.json'))).fonts,fontCache=new Map(),sources=new Map();
 for(const r of results){const key=r.reihe+'/'+r.id;if(!sources.has(key))sources.set(key,r);}
 fs.mkdirSync(path.join(out,'quellen'),{recursive:true});
 if(png)await withPages(4,{width:700,height:700},async pages=>{
  const queue=[...sources.entries()];
  await Promise.all(pages.map(async page=>{for(let item;(item=queue.shift());){
   const [key,r]=item,master=katalog.designs.masters.find(d=>d.seriesFolder===r.reihe&&d.id===r.id);
   try{
    const existing='quellen/'+safe(r.reihe+'__'+r.id)+'.png';
    if(reuseSources&&fs.existsSync(path.join(out,existing))){sources.set(key,{file:existing,plateMm:master.plateMm});continue;}
    let svg=master.svg(),css='';
    const names=[...new Set([...svg.matchAll(/font-family="([^"]+)"/g)].map(m=>m[1]))];
    for(const name of names){let data=fontCache.get(name);if(!data){const font=registry.find(f=>f.name===name);if(!font?.file)throw Error('Quellschrift fehlt: '+name);data=fs.readFileSync(path.join(root,font.file)).toString('base64');fontCache.set(name,data);}css+='@font-face{font-family:'+JSON.stringify(name)+';src:url(data:font/ttf;base64,'+data+')}';}
    svg=svg.replace(/((?:xlink:)?href)="([^"#][^"]*)"/g,(all,attr,href)=>{
     if(href.startsWith('data:'))return all;
     const file=path.resolve(path.dirname(master.svgFile),href),base=path.resolve(root)+path.sep;
     if(!file.startsWith(base))throw Error('Quellbild außerhalb des Katalogs');
     const ext=path.extname(file).slice(1),mime=ext==='jpg'?'jpeg':ext==='svg'?'svg+xml':ext;
     return attr+'="data:image/'+mime+';base64,'+fs.readFileSync(file).toString('base64')+'"';
    });
    svg=svg.replace('<svg ','<svg id="original" style="display:block;width:700px;height:auto" ');
    await page.setContent('<!doctype html><style>'+css+'body{margin:0;background:white}</style>'+svg,{waitUntil:'load'});
    await page.evaluate(()=>document.fonts.ready);
    const file='quellen/'+safe(r.reihe+'__'+r.id)+'.png';
    await page.locator('#original').screenshot({path:path.join(out,file)});sources.set(key,{file,plateMm:master.plateMm});
   }catch(e){sources.set(key,{error:e.message});}
  }}));
 });
 const groups=new Map();
 for(const r of results){const key=[r.format||r.reihe,r.group||'Gruppe offen',r.size].join('__');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 const sheets=[],pendingSheets=new Set();
 for(const [key,rows] of groups)for(let offset=0;offset<rows.length;offset+=24){
  const slice=rows.slice(offset,offset+24),first=slice[0],file='bogen-'+safe(key)+'-'+String(1+offset/24).padStart(2,'0');
  const cards=slice.map(r=>{const source=sources.get(r.reihe+'/'+r.id);return '<article><h2>'+esc(r.id)+'</h2><div class="pair"><div><small>Vorlage · '+esc(source?.plateMm?.join(' × ')||'Quelle')+' mm</small>'+(source?.file?'<img src="'+esc(source.file)+'">':'<p>'+esc(source?.error||'Quelle offen')+'</p>')+'</div><div><small>Ziel · '+esc(r.label)+'</small>'+(r.png?'<img src="'+esc(r.png)+'">':'<p>Keine gültige Zielvorschau</p>')+'</div></div><b>'+esc(r.status)+' · Freigabe durch Chris offen</b><ul>'+(r.issues??[]).slice(0,5).map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul></article>';}).join('');
  const html='<!doctype html><meta charset="utf-8"><title>'+esc(file)+'</title><style>body{font:14px Arial;margin:24px;color:#222;background:white}h1{font-size:22px}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}article{border:1px solid #bbb;padding:10px;break-inside:avoid}h2{font-size:13px;overflow-wrap:anywhere}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pair>div{height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fafafa}.pair img{width:100%;height:230px;object-fit:contain}small{font-size:12px}b{display:block;margin-top:8px;font-size:13px}ul{font-size:11px;padding-left:16px}</style><h1>'+esc(family.name)+' · '+esc(first.format||first.reihe)+' · '+esc(first.group)+'</h1><p>'+esc(first.label)+' · '+(offset+1)+'–'+(offset+slice.length)+' von '+rows.length+' · Vorhandene Gestaltung unverändert; keine Designfreigabe gesetzt.</p><main>'+cards+'</main>';
  const htmlFile=path.join(out,file+'.html');if(!reuseSources||!fs.existsSync(htmlFile)||fs.readFileSync(htmlFile,'utf8')!==html||!fs.existsSync(path.join(out,file+'.png')))pendingSheets.add(file+'.png');
  fs.writeFileSync(htmlFile,html);sheets.push({file:file+'.png',html:file+'.html',format:first.format,group:first.group,size:first.size,count:slice.length,designs:slice.map(r=>({id:r.id,status:r.status,issues:r.issues}))});
 }
 if(png&&pendingSheets.size)await withPages(4,{width:1400,height:900},async pages=>{const queue=sheets.filter(s=>pendingSheets.has(s.file));await Promise.all(pages.map(async page=>{for(let s;(s=queue.shift());){await page.goto(pathToFileURL(path.join(out,s.html)).href,{waitUntil:'load'});await page.screenshot({path:path.join(out,s.file),fullPage:true});}}));});
 fs.writeFileSync(path.join(out,'boegen.json'),JSON.stringify(sheets,null,2)+'\n');
}
