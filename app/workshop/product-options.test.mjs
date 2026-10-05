import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {createWorkshop} from './http.mjs';

test('M02 option settings preserve history and drive the customer model, physical size and shared price',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-options-'));build({outputDirectory:dir});
 const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json'),'utf8'))[0];
 const workshop=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy});
 const server=createPreviewServer({outputDirectory:dir,workshop});server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(r=>server.close(r));workshop.close();fs.rmSync(dir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`,initial=workshop.repository.get(workshop.defaultId),url='/api/workshop/products/'+initial.id;
 const {csrfToken}=await fetch(base+'/api/workshop/session').then(r=>r.json());
 const request=(path,method,body)=>fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrfToken},body:JSON.stringify(body)});
 const catalog=await fetch(base+'/api/workshop/variant-catalog').then(r=>r.json());assert.deepEqual(Object.keys(catalog),['groups']);assert.equal(catalog.groups.find(g=>g.id==='base').values.length,7);
 const document=structuredClone(initial.document),options={size:'large',base:'eiche',wall:'wall'};
 for(const g of document.config.profile.optionGroups){g.values=g.values.filter(v=>v.id===options[g.id]);g.defaultValueId=options[g.id];g.required=true;}
 const preview=await request(url+'/editor-preview','POST',{expectedRevision:initial.revision,document,options});assert.equal(preview.status,200);assert.equal((await preview.json()).price.unitCents,3697);
 assert.equal(workshop.repository.history(initial.id).length,1);
 const savedResponse=await request(url,'PATCH',{expectedRevision:initial.revision,document});assert.equal(savedResponse.status,200);const saved=await savedResponse.json();
 const customer=await fetch(base+'/models.json?configuration='+initial.id).then(r=>r.json());assert.deepEqual(customer[0].universal.profile.optionGroups,saved.document.config.profile.optionGroups);
 const resolve=await request(url+'/resolve','POST',{});const resolved=await resolve.json();assert.deepEqual(resolved.resolvedOptions,options);assert.equal(resolved.price.unitCents,3697);assert.equal(resolved.physical.widthMm,200);assert.equal(resolved.physical.heightMm,266.7);
 assert.equal((await request(url+'/resolve','POST',{options:{size:'small'}})).status,422);
 const bad=structuredClone(document);bad.config.profile.optionGroups[0].defaultValueId='missing';assert.equal((await request(url,'PATCH',{expectedRevision:saved.revision,document:bad})).status,422);
 const old=await fetch(base+'/models.json?configuration='+initial.id+'&revision='+initial.revision).then(r=>r.json());assert.equal(old[0].universal.profile.optionGroups.find(g=>g.id==='size').values.length,2);assert.equal(old[0].universal.profile.optionGroups.find(g=>g.id==='base').defaultValueId,'none');
 assert.equal(workshop.repository.history(initial.id).length,2);
 assert.equal((await fetch(base+'/workshop-ui/product-options-ui.mjs')).status,200);
});
