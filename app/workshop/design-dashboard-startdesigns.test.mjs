import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,createHmac} from 'node:crypto';
import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {designDashboard,designDashboardWithFit,forgetKatalog,patchDesign} from './design-dashboard.mjs';
import {openKatalog} from './katalog-source.mjs';
import {createWorkshop} from './http.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {assignSeries,applyPriceOverrides,priceGaps,katalogDesignToTemplate,scaleTemplate,templateFit} from './katalog-convert.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const FAMILY='familien/edelstahl/test-schilder.json',LINE='test-linie';
const LARGE='TS-RE-120X80',REGULAR='TS-RE-90X60',SMALL='TS-RE-60X40';
const FONT={regular:{units:1000,glyphs:Object.fromEntries([...new Set('TestX ')].map(c=>[c,{a:400,d:''}]))}};
const write=(root,relative,value)=>{const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');};
const hashTree=root=>fs.readdirSync(root,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(item=>item.isDirectory()?hashTree(path.join(root,item.name)).map(([file,sha])=>[item.name+'/'+file,sha]):[[item.name,createHash('sha256').update(fs.readFileSync(path.join(root,item.name))).digest('hex')]]);
function fixture(t,{mains=[{id:'1000',startDesign:'T-D1',sizesOffered:[REGULAR],externalIds:{customizationId:'C1000'}}],priceOverrides={}}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-start-designs-'));
 t.after(()=>{forgetKatalog();fs.rmSync(root,{recursive:true,force:true});});
 for(const item of ['familien','themen.json','schriften'])fs.cpSync(path.join(FIXTURE,item),path.join(root,item),{recursive:true});
 const line={schema:'gravuru-line/v2',id:LINE,name:'Test Linie',families:['test-schilder'],subcategories:[{id:'namensschilder',name:'Namensschilder',themeId:'namensschilder',fontSet:'tuerschilder',priceOverrides,sizesOffered:null,mainProducts:mains}]};
 write(root,'linien/'+LINE+'.json',line);
 const design=(id,{plateMm=[90,60],sizes,transfer,themes=['namensschilder'],fonts=[],svg=null,hidden=false}={})=>{
  write(root,'designs/test/'+id+'/design.json',{id,name:id,plateMm,material:'Edelstahl',process:'Gravur',themes,fonts,hidden,...(sizes?{sizes}:{}),...(transfer?{transfer}: {})});
  write(root,'designs/test/'+id+'/design.svg',svg??'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+plateMm.join(' ')+'"><g id="motiv-1"><path d="M20 20 H30 V30 H20 Z"/></g></svg>');
 };
 design('T-D1');design('T-D2');
 return {root,line,design,read:(options={})=>designDashboard(root,{linie:LINE,...options})};
}
const codes=entry=>entry.blockers.map(blocker=>blocker.code);

test('one design retains every main product and size binding, using distinct main and customization IDs',t=>{
 const f=fixture(t,{mains:[{id:'1000',name:'Erstes Produkt',startDesign:'T-D1',sizesOffered:[REGULAR,LARGE],externalIds:{customizationId:'C1000'}},{id:'2000',name:'Zweites Produkt',startDesign:'T-D1',sizesOffered:[REGULAR]}]});
 const before=hashTree(f.root),result=f.read(),row=result.rows.find(row=>row.id==='T-D1');
 assert.equal(row.isStartDesign,true);
 assert.deepEqual(row.mainProducts.map(p=>[p.id,p.customizationId,p.sizeKey]),[['1000','C1000',REGULAR],['1000','C1000',LARGE],['2000',null,REGULAR]]);
 assert.ok(row.mainProducts.every(p=>p.lineId===LINE&&p.subcategoryId==='namensschilder'&&p.startDesign==='T-D1'&&p.familyId==='test-schilder'));
 assert.ok(row.mainProducts.every(p=>p.fit.status==='nicht geprüft'),'no font/fit evaluation is implied by the synchronous listing');
 assert.equal(result.startDesignSummary.references,2);assert.equal(result.startDesignSummary.assignments,3);
 assert.deepEqual(hashTree(f.root),before,'listing never changes the catalog');
});

test('explicit size constraints and out-of-line referenced designs remain visible with blockers',t=>{
 const f=fixture(t,{mains:[{id:'1000',startDesign:'T-D1',sizesOffered:[REGULAR,LARGE]},{id:'2000',startDesign:'SQUARE',sizesOffered:[REGULAR]},{id:'3000',startDesign:'T-D1',sizesOffered:['unknown-size']}]});
 f.design('T-D1',{sizes:[REGULAR]});f.design('SQUARE',{plateMm:[80,80],themes:['hundeschilder']});
 const result=f.read({startDesigns:true}),first=result.rows.find(row=>row.id==='T-D1'),square=result.rows.find(row=>row.id==='SQUARE');
 assert.equal(first.mainProducts.length,3);assert.ok(!codes(first.mainProducts[0]).includes('size_mismatch'));
 assert.ok(codes(first.mainProducts[1]).includes('size_mismatch'));assert.ok(codes(first.mainProducts[2]).includes('size_unknown'));
 assert.ok(square.isStartDesign);assert.ok(codes(square.mainProducts[0]).includes('size_mismatch'));assert.ok(codes(square.mainProducts[0]).includes('theme_mismatch'));
 const catalog=openKatalog(f.root),family=catalog.families.get('test-schilder'),source=catalog.designs.masters.find(d=>d.id==='T-D1');
 assert.deepEqual(assignSeries(family,[source])[0].sizes,[REGULAR]);
 assert.equal(result.startDesignSummary.references,3);assert.equal(result.startDesignSummary.assignments,4);
});

test('prices use the shared override/gap functions: zero is known, null and mounting prices remain open',t=>{
 const f=fixture(t,{mains:[{id:'1000',startDesign:'T-D1',sizesOffered:[REGULAR,SMALL]}],priceOverrides:{sizes:{[REGULAR]:0}}});
 let result=f.read(),entries=result.rows.find(row=>row.id==='T-D1').mainProducts;
 assert.equal(entries[0].basePriceCents,0);assert.ok(!codes(entries[0]).includes('price_open'));
 assert.equal(entries[1].basePriceCents,null);assert.ok(codes(entries[1]).includes('price_open'));
 const family=JSON.parse(fs.readFileSync(path.join(f.root,FAMILY),'utf8'));family.mountingRules[0].priceCents=null;write(f.root,FAMILY,family);forgetKatalog();
 result=f.read();entries=result.rows.find(row=>row.id==='T-D1').mainProducts;
 const priced=applyPriceOverrides(openKatalog(f.root).families.get('test-schilder'),f.line.subcategories[0]);
 assert.deepEqual(entries[0].blockers.filter(b=>b.code==='price_open').map(b=>b.message),priceGaps(priced,priced.sizes.find(s=>s.key===REGULAR)));
 assert.equal(entries[0].basePriceCents,0);assert.match(entries[0].blockers[0].message,/Befestigung/);
});

test('start-design filter excludes non-start designs but preserves broken references as explicit rows',t=>{
 const f=fixture(t,{mains:[{id:'1000',startDesign:'T-D1',sizesOffered:[REGULAR]},{id:'2000',name:'Fehlendes Design',startDesign:'MISSING',sizesOffered:[REGULAR]}]});
 const all=f.read(),filtered=f.read({startDesigns:true});
 assert.equal(all.rows.find(row=>row.id==='T-D2').isStartDesign,false);assert.deepEqual(all.rows.find(row=>row.id==='T-D2').mainProducts,[]);
 assert.deepEqual(filtered.rows.map(row=>row.id),['MISSING','T-D1']);
 const missing=filtered.rows[0];assert.equal(missing.source,'missing');assert.equal(missing.status,'fehlt');assert.equal(missing.isStartDesign,true);
 assert.equal(missing.mainProducts[0].id,'2000');assert.ok(codes(missing.mainProducts[0]).includes('design_missing'));
 assert.equal(filtered.startDesignSummary.references,2);assert.equal(filtered.startDesignSummary.missingReferences,1);
 assert.equal(filtered.counts.total,all.counts.total,'existing overall counts are not replaced by filtered row counts');
 assert.throws(()=>f.read({startDesigns:'yes'}),{status:422,code:'designs_query'});
});

test('only explicit transfer metadata links Bestand aliases, and an alias never silently becomes an import-ready ID',t=>{
 const f=fixture(t,{mains:[{id:'1000',startDesign:'LEGACY-D1',sizesOffered:[REGULAR]},{id:'2000',startDesign:'T-D1-nearly',sizesOffered:[REGULAR]}]});
 f.design('T-D1',{transfer:{fromKey:'LEGACY-D1'}});
 const result=f.read({startDesigns:true}),row=result.rows.find(row=>row.id==='T-D1');
 assert.equal(row.mainProducts[0].startDesign,'LEGACY-D1');assert.equal(row.mainProducts[0].resolvedDesignId,'T-D1');assert.ok(codes(row.mainProducts[0]).includes('design_alias'));
 assert.equal(result.rows.find(row=>row.id==='T-D1-nearly').source,'missing','similar text is never a match');
});

test('actual geometry fit is checked through the import helpers even when the size is explicitly allowed',async t=>{
 const f=fixture(t);f.design('T-D1',{sizes:[REGULAR],svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><g id="motiv-1"><path d="M80 20 H110 V30 H80 Z"/></g></svg>'});
 const before=hashTree(f.root),result=await designDashboardWithFit(f.root,{linie:LINE,converter:()=>{throw Error('no fonts required');}}),entry=result.rows.find(row=>row.id==='T-D1').mainProducts[0];
 const catalog=openKatalog(f.root),family=catalog.families.get('test-schilder'),source=catalog.designs.masters.find(d=>d.id==='T-D1'),size=family.sizes.find(s=>s.key===REGULAR);
 const template=katalogDesignToTemplate(source,family,catalog.theme('namensschilder'),{fonts:{}}).template;
 const expected=templateFit(scaleTemplate(template,source.plateMm,[size.widthMm,size.heightMm],{}),family,size,{});
 assert.deepEqual(entry.fit,expected);assert.equal(entry.fit.status,'passt nicht');assert.ok(codes(entry).includes('size_fit'));
 assert.ok(!codes(entry).includes('size_mismatch'),'declared size and actual fit are distinct checks');
 assert.equal(result.startDesignSummary.fitChecked,true);assert.deepEqual(hashTree(f.root),before);
});

test('real font resources feed fit checks; scaled text over 100 mm remains blocked by the existing text validator',async t=>{
 const f=fixture(t,{mains:[{id:'1000',startDesign:'T-D1',sizesOffered:[LARGE]}]});
 f.design('T-D1',{fonts:['Michroma'],svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><text id="text-1" x="45" y="30" font-family="Michroma" font-size="80" text-anchor="middle">X</text></svg>'});
 const result=await designDashboardWithFit(f.root,{linie:LINE,available:{Michroma:FONT},converter:()=>{throw Error('available font must be reused');}}),entry=result.rows.find(row=>row.id==='T-D1').mainProducts[0];
 assert.equal(entry.fit.status,'passt nicht');assert.ok(codes(entry).includes('design_invalid'));assert.match(entry.fit.issues.join(' '),/1 bis 100 mm/);
});

test('missing font metrics do not claim a successful fit or a missing release',async t=>{
 const f=fixture(t);f.design('T-D1',{fonts:['Unavailable'],svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><text id="text-1" x="45" y="30" font-family="Unavailable" font-size="5">Test</text></svg>'});
 const result=await designDashboardWithFit(f.root,{linie:LINE}),row=result.rows.find(row=>row.id==='T-D1'),entry=row.mainProducts[0];
 assert.equal(row.released,false);assert.equal(entry.fit.status,'nicht geprüft');assert.ok(codes(entry).includes('fit_unavailable'));
 assert.ok(!entry.blockers.some(blocker=>/Freigabe/.test(blocker.message)),'release status remains separate from technical blockers');
 assert.ok(result.notes.some(note=>note.includes('Unavailable')));
});

test('ambiguous aliases stay explicit for every referencing product; exact IDs take precedence',t=>{
 const f=fixture(t,{mains:[{id:'1000',startDesign:'LEGACY',sizesOffered:[REGULAR]},{id:'2000',startDesign:'LEGACY',sizesOffered:[LARGE]},{id:'3000',startDesign:'T-D1',sizesOffered:[REGULAR]}]});
 f.design('T-D1',{transfer:{fromKey:'LEGACY'}});f.design('T-D2',{transfer:{fromKey:'LEGACY'}});f.design('OTHER',{transfer:{fromKey:'T-D1'}});
 const result=f.read({startDesigns:true}),ambiguous=result.rows.find(row=>row.id==='LEGACY'),exact=result.rows.find(row=>row.id==='T-D1');
 assert.equal(ambiguous.source,'missing');assert.equal(ambiguous.mainProducts.length,2);assert.ok(ambiguous.mainProducts.every(entry=>codes(entry).includes('design_ambiguous')));
 assert.equal(exact.mainProducts[0].resolvedDesignId,'T-D1');assert.ok(!codes(exact.mainProducts[0]).includes('design_alias'));assert.equal(result.startDesignSummary.references,3);
});

test('HTTP start-design filter keeps merchant authentication and PATCH/CSRF rules unchanged',async t=>{
 const f=fixture(t),resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
 // Existing workshop glyphs are valid inputs even when there is no catalog font binary.
 const fontName='Garamond Acryl',registry=JSON.parse(fs.readFileSync(path.join(f.root,'schriften/schriften.json'),'utf8'));registry.fonts.push({name:fontName,inPlatform:true});write(f.root,'schriften/schriften.json',registry);
 f.design('T-D1',{fonts:[fontName],svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><text id="text-1" x="45" y="30" font-family="Garamond Acryl" font-size="5" text-anchor="middle">X</text></svg>'});
 const before=hashTree(f.root);
 const seed=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
 for(const object of seed.profile.designs[0].objects.filter(o=>o.type==='text')){measureText(object,resources.fonts);if(object.id==='names'){object.size*=118/object.w;measureText(object,resources.fonts);}}
 const auth={shopDomain:'startdesign-test.myshopify.com',clientId:'startdesign-fixture',secret:'synthetic-test-secret-only',mode:'test-only'},csrf='a'.repeat(64);
 const now=Math.floor(Date.now()/1000),payload={aud:auth.clientId,dest:'https://'+auth.shopDomain,iss:'https://'+auth.shopDomain+'/admin',sub:'123',exp:now+60,nbf:now,iat:now,jti:'startdesign-test'},input=[{alg:'HS256',typ:'JWT'},payload].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
 const token='Bearer '+input+'.'+createHmac('sha256',auth.secret).update(input).digest('base64url');
 const workshop=createWorkshop({filename:':memory:',seedConfig:seed,legacy:{purchasing:{},features:{}},katalogDir:f.root,shopifySessions:auth,merchantCsrfToken:csrf});
 const request=async(query='',{authorization=token,method='GET',data=null,csrfToken=null}={})=>{
  const req=Readable.from(data===null?[]:[Buffer.from(JSON.stringify(data))]);req.method=method;req.headers={authorization,'content-type':'application/json',...(csrfToken?{'x-gravuru-csrf':csrfToken}:{})};
  const res={headersSent:false,writeHead(status){this.status=status;this.headersSent=true;return this;},end(bytes){this.body=JSON.parse(Buffer.from(bytes).toString());}};
  try{await workshop.handle(req,res,new URL('/api/workshop/designs'+query,'http://127.0.0.1'));return res;}finally{req.destroy();}
 };
 try{
  assert.equal((await request('?linie='+LINE+'&startDesigns=true',{authorization:''})).status,401);
  assert.equal((await request('?linie='+LINE+'&startDesigns=true',{authorization:'Bearer invalid'})).status,401);
  const filtered=await request('?linie='+LINE+'&startDesigns=true');assert.equal(filtered.status,200);assert.deepEqual(filtered.body.rows.map(r=>r.id),['T-D1']);assert.equal(filtered.body.rows[0].mainProducts[0].fit.status,'passt');
  const all=await request('?linie='+LINE+'&startDesigns=false');assert.equal(all.status,200);assert.deepEqual(all.body.rows.map(r=>r.id),['T-D1','T-D2']);assert.equal(all.body.filter.startDesigns,false);
  for(const invalid of ['yes','1',''])assert.equal((await request('?linie='+LINE+'&startDesigns='+invalid)).status,422,invalid);
  assert.deepEqual(hashTree(f.root),before,'GET and rejected authentication never mutate the catalog');
  const data={reihe:'test',designId:'T-D1',name:'Explizit geändert'};
  assert.equal((await request('',{method:'PATCH',data,csrfToken:'invalid'})).status,403);assert.deepEqual(hashTree(f.root),before);
  const changed=await request('',{method:'PATCH',data,csrfToken:csrf});assert.equal(changed.status,200);assert.equal(changed.body.design.name,data.name);
  assert.equal((await request('',{method:'PATCH',data:{...data,mainProducts:[]},csrfToken:csrf})).status,422,'main product references remain read-only through PATCH');
  const fresh=await request('?linie='+LINE+'&startDesigns=true');assert.equal(fresh.body.rows[0].name,data.name);assert.equal(fresh.body.rows[0].mainProducts[0].id,'1000');
 }finally{workshop.close();}
});

test('catalog font metrics are reused across filter reloads and an explicit PATCH cache invalidation',async t=>{
 const f=fixture(t),fontName='StartdesignCacheFixture',registryFile=path.join(f.root,'schriften/schriften.json'),registry=JSON.parse(fs.readFileSync(registryFile,'utf8'));
 registry.fonts.push({name:fontName,file:'schriften/startdesign-cache-fixture.ttf'});write(f.root,'schriften/schriften.json',registry);write(f.root,'schriften/startdesign-cache-fixture.ttf','synthetic converter input');
 f.design('T-D1',{fonts:[fontName],svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><text id="text-1" x="45" y="30" font-family="'+fontName+'" font-size="5" text-anchor="middle">X</text></svg>'});
 let calls=0;const converter=async bytes=>{assert.equal(Buffer.from(bytes,'base64').toString(),'synthetic converter input');calls++;return {font:FONT};};
 const first=await designDashboardWithFit(f.root,{linie:LINE,converter,startDesigns:true});
 const second=await designDashboardWithFit(f.root,{linie:LINE,converter,startDesigns:false});
 assert.equal(calls,1,'the shared glyph cache prevents repeated font parsing');assert.equal(first.rows[0].mainProducts[0].fit.status,'passt');assert.equal(second.rows[0].mainProducts[0].fit.status,'passt');
 patchDesign(f.root,{reihe:'test',designId:'T-D1',name:'Nach Änderung'});
 const third=await designDashboardWithFit(f.root,{linie:LINE,converter,startDesigns:true});assert.equal(calls,1,'PATCH invalidates catalog metadata, not unchanged glyphs');assert.equal(third.rows[0].name,'Nach Änderung');assert.equal(third.rows[0].mainProducts[0].fit.status,'passt');
});
