import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {createSlateReviewComments} from './lib/slate-review-comments.mjs';
import {createSlateGalleryHandler, slateGalleryHtml} from './lib/slate-review-gallery.mjs';

function temporaryDirectory(t) {
  const parent=path.resolve(os.tmpdir()),dir=fs.mkdtempSync(path.join(parent,'gravuru-slate-comments-'));
  t.after(()=>{
    assert.equal(path.dirname(path.resolve(dir)),parent);
    assert(path.basename(dir).startsWith('gravuru-slate-comments-'));
    fs.rmSync(dir,{recursive:true,force:true});
  });
  return dir;
}
const row={id:'GTSK-S-30x20-D2',group:'Sternenkinder',subcategory:'Sternenkind',process:'UV',files:[{name:'preview.png'}],targets:[],reason:'Druckaufbereitung offen'};
const pack={originals:[row]},imported={products:[]};

test('notes persist across restart, stay separate by original ID, and clearing retains history',t=>{
 const dir=temporaryDirectory(t),file=path.join(dir,'comments.sqlite');
 let store=createSlateReviewComments(file,['D2','D4']);
 const note='\nNur 22 × 14: Sterne gelb lassen.\nGröße prüfen ⭐';
 store.save('D2',note,0);store.close();
 store=createSlateReviewComments(file,['D2','D4']);
 assert.equal(store.get('D2').text,note);assert.equal(store.get('D4').revision,0);
 assert.throws(()=>store.save('D2','stale overwrite',0),{status:409});
 assert.equal(store.get('D2').text,note);
 assert.equal(store.save('D2','',1).revision,2);store.close();
 const db=new DatabaseSync(file);try{assert.equal(db.prepare('SELECT text FROM review_comments WHERE design_id=? AND revision=1').get('D2').text,note);}finally{db.close();}
});

test('unknown originals and invalid comments cannot create records',()=>{
 const store=createSlateReviewComments(':memory:',['D2']);
 try{
  assert.throws(()=>store.save('invented','text',0),{status:404});
  assert.throws(()=>store.save('D2','a'.repeat(10001),0),{status:422});
  assert.throws(()=>store.save('D2',{},0),{status:422});
  assert.throws(()=>store.save('D2','text',-1),{status:422});
  assert.equal(store.get('D2').revision,0);
 }finally{store.close();}
});

test('even incomplete print originals have a note field; stored HTML stays text',()=>{
 const html=slateGalleryHtml(pack,imported,{comments:{[row.id]:{revision:1,text:'</textarea><script>alert(1)</script>'}}});
 assert.match(html,/Kommentar zu GTSK-S-30x20-D2/);
 assert.match(html,/&lt;\/textarea&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
 assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
 assert.match(html,/data-revision="1"/);
 assert.doesNotMatch(html,/class="edit"/);
});

test('local HTTP save/readback rejects cross-origin writes and stale revisions',async t=>{
 const dir=temporaryDirectory(t),importsFile=path.join(dir,'local-review-import.json');
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(pack));fs.writeFileSync(importsFile,JSON.stringify(imported));
 const handler=createSlateGalleryHandler(dir,importsFile);
 const server=http.createServer((req,res)=>{if(!handler(req,res))res.writeHead(404).end();});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const html=await fetch(base+'/originale/').then(r=>r.text());
  const token=html.match(/name="slate-review-csrf" content="([a-f0-9]+)"/)[1];
  assert.equal((await fetch(base+'/originale/comments.js')).status,200);
  const send=(data,headers={})=>fetch(base+'/originale/comments',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Slate-Review-CSRF':token,...headers},body:JSON.stringify(data)});
  const data={designId:row.id,text:'22 × 14: Sterne gelb lassen',expectedRevision:0};
  assert.equal((await send(data,{'X-Slate-Review-CSRF':'wrong'})).status,403);
  assert.equal((await send(data,{Origin:'https://foreign.example'})).status,403);
  assert.equal((await send({...data,designId:'missing'})).status,404);
  const simultaneous=await Promise.all([send(data),send({...data,text:'anderer Kommentar'})]);
  assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);
  const readback=await fetch(base+'/originale/comments').then(r=>r.json());
  assert.equal(readback.comments[row.id].revision,1);
  assert.match(await fetch(base+'/originale/').then(r=>r.text()),/data-revision="1"/);
  assert.equal((await send({...data,text:'',expectedRevision:1})).status,200);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'))),pack);
  assert.deepEqual(JSON.parse(fs.readFileSync(importsFile)),imported);
 }finally{await new Promise(r=>server.close(r));handler.close();}
});
