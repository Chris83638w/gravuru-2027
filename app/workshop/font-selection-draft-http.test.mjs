import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Readable} from 'node:stream';
import {build} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';
import {workshopResources} from './catalog.mjs';
import {measureText} from '../platform/sources/app/shared/models/text-paths.mjs';

async function request(workshop, pathname, method='GET', input, headers={}) {
 const req=Readable.from(input===undefined?[]:[Buffer.from(JSON.stringify(input))]);
 req.method=method;req.headers={'content-type':'application/json',...headers};
 const res={headersSent:false,writeHead(status){this.status=status;this.headersSent=true;return this;},end(bytes){this.body=JSON.parse(Buffer.from(bytes).toString());}};
 await workshop.handle(req,res,new URL(pathname,'http://127.0.0.1'));return res;
}

for(const managed of [false,true])test('real native drafts keep group-plus-design choices and pinned revisions; catalog-managed='+managed,async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'g27-font-draft-'));
 build({outputDirectory:directory});
 const seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0];
 const w=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
 t.after(()=>{w.close();assert.equal(path.dirname(directory),path.resolve(os.tmpdir()));fs.rmSync(directory,{recursive:true,force:true});});
 const list=managed?w.profiles.syncCatalogFontSet('synthetische-testgruppe',['Montserrat']):w.profiles.create({name:'Synthetische Schriftgruppe',type:'fonts',items:['Montserrat']});
 w.profiles.setDefault('fonts',{mode:'override',profileId:list.id},1);
 const record=w.repository.copy(w.defaultId,{expectedRevision:1,name:'Synthetische Schriftprüfung',kind:'product'});
 const config=w.model(record.id,record.revision).universal,source=config.profile.designs[0];
 assert.deepEqual(config.workshopProfiles.selections.fonts,['Montserrat']);
 const fonts=workshopResources(seed.universal.localResources).fonts;
 const png='iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
 const input={productId:record.id,productRevision:record.revision,designId:source.id,objects:structuredClone(source.objects),options:Object.fromEntries(config.profile.optionGroups.map(g=>[g.id,g.defaultValueId])),quantity:1,media:[{id:'synthetic-photo',original:png}],preview:png};
 Object.assign(input.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'synthetic-photo',uxUploadKind:'photo'});
 const a=input.objects.find(o=>o.type==='text'),original=a.font,other=source.objects.find(o=>o.type==='text'&&o.font!==original).font;
 const edit=(font)=>{a.font=font;a.text='Mia';a.size=5;measureText(a,fonts);};
 const credentials=(await request(w,'/api/workshop/session')).body,headers={'x-gravuru-csrf':credentials.csrfToken};
 edit('Montserrat');
 const first=await request(w,'/api/workshop/acrylic-drafts','POST',{input},headers);
 assert.equal(first.status,201,JSON.stringify(first.body));
 const endpoint='/api/workshop/acrylic-drafts/'+first.body.id,privateHeaders={...headers,'x-gravuru-draft':first.body.token};
 const oldPackage=w.customerDrafts.downloadSnapshot(first.body.snapshotId,'package');
 edit(original);
 const back=await request(w,endpoint,'POST',{input,expectedRevision:1},privateHeaders);
 assert.equal(back.status,200,JSON.stringify(back.body));
 edit(other);
 const extra={id:'additional-font-proof',type:'text',font:other,x:75,y:100,text:'Test',size:5,bold:false,italic:false,rotation:0,color:a.color};measureText(extra,fonts);input.objects.push(extra);
 const shared=await request(w,endpoint,'POST',{input,expectedRevision:2},privateHeaders);
 assert.equal(shared.status,200,JSON.stringify(shared.body));
 edit('Lora');
 const denied=await request(w,endpoint,'POST',{input,expectedRevision:3},privateHeaders);
 assert.equal(denied.status,422);assert.match(denied.body.error.message,/Schrift.*nicht freigegeben/);
 // A later backend edit changes the live workbench selection, not the pinned
 // model/metadata or the existing draft's immutable input and checkout offer.
 if(managed)w.profiles.syncCatalogFontSet('synthetische-testgruppe',['Lora']);else w.profiles.save(list.id,{name:list.name,type:'fonts',items:['Lora']},list.revision);
 assert.deepEqual(w.model(record.id).universal.workshopProfiles.selections.fonts,['Lora']);
 assert.deepEqual(w.model(record.id,record.revision).universal.workshopProfiles.selections.fonts,['Montserrat']);
 edit('Montserrat');
 const retained=await request(w,endpoint,'POST',{input,expectedRevision:3},privateHeaders);
 assert.equal(retained.status,200,JSON.stringify(retained.body));
 assert.deepEqual(w.customerDrafts.downloadSnapshot(first.body.snapshotId,'package'),oldPackage);
 const binding=w.orderIntake.bind({shopDomain:'gravuru-synthetic.myshopify.com',variantId:'301',record,snapshotId:retained.body.snapshotId});
 const offer=w.orderIntake.offer({bindingId:binding.id,snapshotId:retained.body.snapshotId,quantity:1});
 assert.ok(offer.id);assert.ok(offer.property.value);
 assert.deepEqual(w.repository.get(record.id,{revision:record.revision}).metadata.profiles.selections.fonts,['Montserrat']);
});
