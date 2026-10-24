import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {createHash,createHmac} from 'node:crypto';
import {designPreviewGlyphs,clearDesignPreviewCache,designPreviewCacheInfo,PREVIEW_CACHE_ENTRIES,PREVIEW_CACHE_BYTES,PREVIEW_WARNING_HEADER,previewWarningHeader} from './design-preview-glyphs.mjs';
import {openKatalog} from './katalog-source.mjs';
import {forgetKatalog} from './design-dashboard.mjs';
import {createWorkshop} from './http.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {measureText,textPaths} from '../platform/sources/app/shared/models/doorbell-preview.mjs';

const FONT={regular:{units:1000,glyphs:{A:{a:600,d:'M0 0L400 700L600 0Z'},V:{a:500,d:'M0 700L250 0L500 700Z'},' ':{a:200,d:''},'&':{a:300,d:'M0 0L100 0'}}}};
const wrap=inner=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="none"/>'+inner+'</svg>';
const text=(content,attrs='')=>'<text id="text-1" font-family="Fixture" font-size="10" x="40" y="30" '+attrs+'>'+content+'</text>';
function fixture(t,source){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-glyphs-'));const file=path.join(dir,'design.svg');fs.writeFileSync(file,source);t.after(()=>{clearDesignPreviewCache();forgetKatalog();fs.rmSync(dir,{recursive:true,force:true});});return {dir,file,read:(available={Fixture:FONT})=>designPreviewGlyphs({file,katalog:{fontResources:async(names)=>({fonts:Object.fromEntries(names.filter(n=>available[n]).map(n=>[n,available[n]])),missing:names.filter(n=>!available[n])})}})};}
const sha=value=>createHash('sha256').update(value).digest('hex');

for(const [anchor,start] of [['start',40],['middle',34.5],['end',29]])test('glyph paths preserve '+anchor+' text anchor and production advances',async t=>{
 const source=wrap(text('AV','text-anchor="'+anchor+'" fill="#823456"')),f=fixture(t,source),result=await f.read();
 assert.equal(result.warnings.length,0);assert.equal(result.convertedTexts,1);const out=result.bytes.toString();
 assert.doesNotMatch(out,/<(?:text|tspan)\b/);assert.match(out,new RegExp('translate\\('+start+' 30\\)'));assert.match(out,/translate\(6 0\) scale\(0.01 -0.01\)/);assert.equal((out.match(/fill="#823456" d=/g)||[]).length,2);
 const measured=measureText({font:'Fixture',size:10,text:'AV'}, {Fixture:FONT});assert.equal(measured.w,11);assert.match(textPaths({font:'Fixture',size:10,text:'AV'},{Fixture:FONT}),/translate\(-550 0\)/,'production has no AV pair kerning');assert.equal(fs.readFileSync(f.file,'utf8'),source);
});

test('tspan x/dy lines, entities, inherited font and fill, and letter-spacing keep their positions',async t=>{
 const source=wrap('<g font-family="Fixture" font-size="10" transform="rotate(5)"><text id="multi" x="50" y="20" text-anchor="end" letter-spacing="2" fill="#123456"><tspan x="40" dy="0">AV</tspan><tspan x="60" dy="12" fill="#abcdef">A&amp;V</tspan></text></g>'),f=fixture(t,source),r=await f.read(),out=r.bytes.toString();
 assert.equal(r.convertedTexts,1);assert.deepEqual(r.warnings,[]);assert.match(out,/translate\(27 20\)/);assert.match(out,/translate\(42 32\)/);assert.match(out,/translate\(8 0\) scale\(0.01 -0.01\)/);assert.equal((out.match(/fill="#abcdef" d=/g)||[]).length,3);assert.match(out,/transform="rotate\(5\)"/);
 assert.equal(measureText({font:'Fixture',size:10,text:'AV',letterSpacing:2},{Fixture:FONT}).w,13);
});

test('negative catalogue letter-spacing is preserved, with no trailing spacing',async t=>{
 const f=fixture(t,wrap(text('AVA','text-anchor="end" letter-spacing="-0.258"'))),r=await f.read();assert.deepEqual(r.warnings,[]);assert.match(r.bytes.toString(),/translate\(23.516 30\)/);assert.match(r.bytes.toString(),/translate\(5.742 0\)/);assert.match(r.bytes.toString(),/translate\(10.484 0\)/);
});

test('inline tspans use one anchor chunk, numeric entities and inline style are preserved',async t=>{
 const f=fixture(t,wrap(text('A<tspan fill="#ff0000">&#86;</tspan>','text-anchor="middle" style="fill:#112233;letter-spacing:1"'))),r=await f.read();assert.deepEqual(r.warnings,[]);
 const out=r.bytes.toString();assert.match(out,/translate\(34 30\)/);assert.match(out,/translate\(7 0\)/);assert.match(out,/fill="#ff0000" d=/);assert.match(out,/fill="#112233" d=/);
});

test('one missing glyph preserves the WHOLE text including all tspans; another text can convert',async t=>{
 const original=text('<tspan x="40">AV</tspan><tspan x="40" dy="12">A☃</tspan>'),f=fixture(t,wrap(original+text('AV').replace('text-1','text-2'))),r=await f.read();
 assert.equal(r.convertedTexts,1);assert.ok(r.bytes.toString().includes(original));assert.equal((r.bytes.toString().match(/<text /g)||[]).length,1);assert.match(r.warnings[0],/☃.*Fixture/);assert.match(decodeURIComponent(previewWarningHeader(r.warnings)),/☃/);assert.doesNotMatch(r.bytes.toString(),/notdef|replacement/);
});

test('missing fonts never substitute available families; original element and warning survive',async t=>{
 const source=wrap(text('AV').replace('font-family="Fixture"','font-family="Missing, Fixture"')),f=fixture(t,source),r=await f.read();assert.equal(r.convertedTexts,0);assert.equal(r.bytes.toString(),source);assert.match(r.warnings[0],/Schrift fehlt: Missing/);
});

test('unsupported text layout, CSS and malformed XML fail closed without partial conversion',async t=>{
 for(const inner of [text('AV','textLength="80"'),text('A<tspan baseline-shift="super">V</tspan>'),text('A<tspan display="none">V</tspan>'),text('A<tspan visibility="hidden">V</tspan>'),text('A<tspan color="red" fill="currentColor">V</tspan>'),text('AV','word-spacing="4"'),text('AV','style="x:80;y:40"'),text('A<tspan style="transform:translate(5px)">V</tspan>'),text('<textPath href="#p">AV</textPath>'),text('AV','rotate="1 2"'),'<style>text { font-family: Other }</style>'+text('AV'),text('AV').replace('font-size="10"','font-size="3em"')]){const f=fixture(t,wrap(inner)),r=await f.read();assert.equal(r.bytes.toString(),wrap(inner));assert.equal(r.convertedTexts,0);assert.ok(r.warnings.length);}
 const f=fixture(t,'<svg><text>AV</svg>'),r=await f.read();assert.equal(r.bytes.toString(),'<svg><text>AV</svg>');assert.ok(r.warnings.length);
});

test('cache keys include SVG bytes and glyph resources, and bounded LRU evicts oldest previews',async t=>{
 clearDesignPreviewCache();const f=fixture(t,wrap(text('AV')));assert.equal((await f.read()).cacheHit,false);assert.equal((await f.read()).cacheHit,true);
 const modified=structuredClone(FONT);modified.regular.glyphs.A.a=700;const changed=await f.read({Fixture:modified});assert.equal(changed.cacheHit,false);assert.notEqual(changed.bytes.toString(),(await f.read()).bytes.toString());
 for(let i=0;i<PREVIEW_CACHE_ENTRIES+2;i++){fs.writeFileSync(f.file,wrap(text('AV').replace('x="40"','x="'+(i+100)+'"')));assert.equal((await f.read()).cacheHit,false);}
 const info=designPreviewCacheInfo();assert.equal(info.entries,PREVIEW_CACHE_ENTRIES);assert.ok(info.bytes<=PREVIEW_CACHE_BYTES);fs.writeFileSync(f.file,wrap(text('AV').replace('x="40"','x="100"')));assert.equal((await f.read()).cacheHit,false);
});

test('real embedded SVG route requires merchant token, returns paths and warnings, and leaves PNG/catalog untouched',async t=>{
 const f=fixture(t,wrap(text('AV'))),catalog=f.dir,sourceDir=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));for(const item of ['familien','themen.json','schriften'])fs.cpSync(path.join(sourceDir,item),path.join(catalog,item),{recursive:true});
 const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
 const folder=path.join(catalog,'designs/test/T-D1');fs.mkdirSync(folder,{recursive:true});const source=wrap(text('AV').replace('Fixture','Garamond Acryl'));fs.writeFileSync(path.join(folder,'design.svg'),source);fs.writeFileSync(path.join(folder,'design.json'),JSON.stringify({id:'T-D1',plateMm:[90,60]}));
 const png=Buffer.from('89504e470d0a1a0a','hex');fs.writeFileSync(path.join(folder,'original.png'),png);
 const seed=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));for(const o of seed.profile.designs[0].objects.filter(o=>o.type==='text')){measureText(o,resources.fonts);if(o.id==='names'){o.size*=118/o.w;measureText(o,resources.fonts);}}
 const auth={shopDomain:'glyphs-test.myshopify.com',clientId:'glyphs-fixture',secret:'synthetic-test-secret-only',mode:'test-only'},now=Math.floor(Date.now()/1000),claims={aud:auth.clientId,dest:'https://'+auth.shopDomain,iss:'https://'+auth.shopDomain+'/admin',sub:'123',exp:now+60,nbf:now,iat:now,jti:'glyphs-test'},input=[{alg:'HS256',typ:'JWT'},claims].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.'),token='Bearer '+input+'.'+createHmac('sha256',auth.secret).update(input).digest('base64url');
 const w=createWorkshop({filename:':memory:',seedConfig:seed,legacy:{purchasing:{},features:{}},katalogDir:catalog,shopifySessions:auth});t.after(()=>w.close());
 const request=async(name='design.svg',authorization=token)=>{const req=Readable.from([]);req.method='GET';req.headers={authorization};const res={headersSent:false,writeHead(status,headers){this.status=status;this.headers=headers;this.headersSent=true;return this;},end(bytes){this.bytes=Buffer.from(bytes);}};try{await w.handle(req,res,new URL('/api/workshop/designs/svg?reihe=test&id=T-D1&file='+name,'http://127.0.0.1'));return res;}finally{req.destroy();}};
 for(const authorization of ['', 'Bearer invalid'])assert.equal((await request('design.svg',authorization)).status,401);
 const response=await request();assert.equal(response.status,200);assert.doesNotMatch(response.bytes.toString(),/<text\b/);assert.match(response.bytes.toString(),/data-preview-text-paths="true"/);assert.equal(response.headers['Content-Security-Policy'],"default-src 'none'; style-src 'unsafe-inline'; img-src data:");assert.equal(response.headers['Content-Type'],'image/svg+xml; charset=utf-8');assert.equal(response.headers['Content-Length'],response.bytes.length);assert.equal(response.headers[PREVIEW_WARNING_HEADER],undefined);
 const image=await request('original.png');assert.equal(image.headers['Content-Type'],'image/png');assert.deepEqual(image.bytes,png);assert.equal(image.headers[PREVIEW_WARNING_HEADER],undefined);assert.equal(fs.readFileSync(path.join(folder,'design.svg'),'utf8'),source);
 const missing=source.replace('Garamond Acryl','Missing');fs.writeFileSync(path.join(folder,'design.svg'),missing);const warned=await request();assert.equal(warned.status,200);assert.equal(warned.bytes.toString(),missing);assert.match(decodeURIComponent(warned.headers[PREVIEW_WARNING_HEADER]),/Schrift fehlt: Missing/);assert.equal(sha(fs.readFileSync(path.join(folder,'original.png'))),sha(png));
});


test('warning headers are bounded valid JSON and never split astral characters',()=>{
 const header=previewWarningHeader(Array.from({length:30},(_,i)=>'text-'+i+': '+('A'.repeat(1499)+'☃😀').repeat(2)));assert.ok(header.length<6000);const decoded=JSON.parse(decodeURIComponent(header));assert.ok(decoded.length);assert.equal(decoded.at(-1),'Weitere Hinweise gekürzt.');const emoji=previewWarningHeader(['😀'.repeat(1000)]);assert.ok(emoji.length<6000);assert.ok(JSON.parse(decodeURIComponent(emoji))[0].startsWith('😀'));assert.equal(previewWarningHeader([]),null);
});
