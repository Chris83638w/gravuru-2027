import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {createWorkshop} from './http.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
async function request(w,route,method='GET',body,headers={}){
 const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);req.method=method;req.headers={'content-type':'application/json',...headers};
 const res={headersSent:false,writeHead(status){this.status=status;this.headersSent=true;return this;},end(bytes){this.body=JSON.parse(Buffer.from(bytes).toString());}};
 await w.handle(req,res,new URL(route,'http://127.0.0.1'));return res;
}
test('fontset HTTP routes enforce CSRF, accept their declared PUT, protect managed profiles and retain files on rejection',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-fontset-http-'));fs.cpSync(new URL('./fixtures/katalog/',import.meta.url),dir,{recursive:true});
 const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
 const w=createWorkshop({filename:':memory:',seedConfig:makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'b'.repeat(64)),legacy:{purchasing:{},features:{}},katalogDir:dir});
 t.after(()=>{w.close();assert.equal(path.dirname(dir),path.resolve(os.tmpdir()));fs.rmSync(dir,{recursive:true,force:true});});
 const base='/api/workshop/catalog-fontsets',first=await request(w,base);assert.equal(first.status,200);assert.equal(first.body.sets.length,3);
 const input={setId:'tuerschilder',fonts:['Michroma','Lato'],sourceSha256:'stale'};
 assert.equal((await request(w,base,'PUT',input)).status,403);
 const session=(await request(w,'/api/workshop/session')).body,headers={'x-gravuru-csrf':session.csrfToken};
 const rejected=await request(w,base,'PUT',input,headers);assert.equal(rejected.status,409);assert.equal(rejected.body.error.code,'catalog_fontset_stale');
 assert.equal((await request(w,base+'/extra/impact','POST',input,headers)).status,405);
 assert.equal((await request(w,base)).body.sourceSha256,first.body.sourceSha256);
 const legacy=w.profiles.create({name:'Schrift-Set tuerschilder (Katalog)',type:'fonts',items:['Montserrat']});
 const adopted=await request(w,base+'/adopt','POST',{setId:'tuerschilder',profileId:legacy.id,expectedRevision:1,sourceSha256:first.body.sourceSha256,confirmOrigin:true},headers);
 assert.equal(adopted.status,200);assert.equal(adopted.body.revision,1);
 const update=await request(w,'/api/workshop/profiles/'+legacy.id,'PATCH',{expectedRevision:1,document:{name:'Freie Liste',type:'fonts',items:['Lora']}},headers);
 assert.equal(update.status,409);assert.equal(update.body.error.code,'catalog_profile_managed');
 assert.equal((await request(w,'/api/workshop/profiles/'+legacy.id,'DELETE',undefined,headers)).status,405);
});
