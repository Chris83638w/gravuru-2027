import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateFamily,familyProductConfig} from './product-families.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {renderEngraving} from './form-engraving-proof.mjs';
import {clientOutputSettings} from './output-orientation.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {productPreview} from './product-preview.mjs';
import {studioSvg} from '../platform/sources/app/shared/models/studio-svg.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {selectedProfile} from '../configurator/variant-m/contract.mjs';
import {importEnvironment} from './design-assets.mjs';

const load=name=>JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/'+name+'.json',import.meta.url)));
const forms=['RE','AB','QU','OV','EL','R','RT1','RT2'];
function configFor(name,form){
 const f=validateFamily(load(name)),s=f.sizes.find(s=>Number.isInteger(s.baseCents)&&(form==='EL'?s.widthMm===s.heightMm*3&&['EL','OV'].includes(s.groupKey):form==='OV'?s.groupKey==='OV'&&s.widthMm!==s.heightMm*3:s.groupKey===form));assert(s,name+' '+form);
 f.sizes=[s];f.groups=f.groups.filter(g=>g.key===s.groupKey);f.mountingRules=f.mountingRules.filter(r=>s.mounting.includes(r.id));f.options=[];
 const c=familyProductConfig(f,s,1),o=c.profile.designs[0].objects[0];o.text='F';o.x=s.widthMm*.32;o.y=s.heightMm*.4;measureText(o,c.localResources.fonts);
 return c;
}
const python=(source,input)=>execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',source],{input,env:importEnvironment(),maxBuffer:16*1024*1024});
let preview;
const png=()=>preview??=python("from PIL import Image;import sys;Image.new('RGBA',(2,2)).save(sys.stdout.buffer,format='PNG')").toString('base64');
function pdfBounds(pdf){return JSON.parse(python("import sys,pymupdf as p,json\nwith p.open(stream=sys.stdin.buffer.read(),filetype='pdf') as d:\n r=[x['rect'] for x in d[0].get_drawings()]\n assert r\n print(json.dumps({'x0':min(x.x0 for x in r),'x1':max(x.x1 for x in r),'width':d[0].rect.width,'fonts':len(d[0].get_fonts()),'images':len(d[0].get_images())}))",pdf));}

test('three pinned catalogue families: only confirmed prices and explicit rear engraving; all 240 size geometries load',()=>{
 const p=load('provenance');let count=0;
 for(const source of p.sources){const bytes=fs.readFileSync(new URL('./test-fixtures/acryl3-rear/'+source.fixture,import.meta.url));assert.equal(bytes.includes(13),false);assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);const f=validateFamily(JSON.parse(bytes));count+=f.sizes.length;if(f.material.kind==='acrylic')assert.equal(f.material.engravingSide,'back');}
 assert.equal(count,240);
});
for(const name of ['schwarz','anthrazit','steel'])for(const form of forms){
 test(name+' '+form+': readable customer/workshop preview and exactly one manufacturing reflection',async()=>{
  const c=configFor(name,form),design=c.profile.designs[0],options={mounting:c.profile.optionGroups[0].values.find(v=>v.holes?.length)?.id??'K00'},profile=selectedProfile(c,options),rear=name!=='steel';
  const front=studioSvg(profile,design,c.localResources.fonts,{handles:false}),workshop=productPreview({universal:c},{options,keepout:false,designArea:false});
  for(const svg of [front,workshop]){assert(!svg.includes('scale(-1'));assert(svg.includes('translate('+design.objects[0].x+' '+design.objects[0].y+')'));assert.equal(svg.includes('data-preview-rear-engraving'),rear);if(rear){assert(svg.indexOf('data-preview-acrylic-glass')<svg.indexOf('data-object='));assert(svg.indexOf('data-preview-glass-finish')>svg.indexOf('data-object='));}}
  const document=makeProductDocument(c),record={id:document.config.profile.id,revision:1,document},bundle=await prepareAcrylicReview({record,config:document.config,input:{productId:record.id,productRevision:1,designId:design.id,objects:structuredClone(design.objects),options,quantity:1,media:[],preview:png()}});
  const requested=clientOutputSettings(bundle.manifest,{mode:'vector',mirror:!rear});assert.equal(requested.settings.mirror,rear,'client cannot override material orientation');
  const artwork=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256,{engraving:true,surfaceId:'front'});
  assert(!artwork.svg.includes('rear-frost'));assert(!artwork.svg.includes('glass-light'));assert.deepEqual(artwork.surfaces,['front'],'rear engraving is not a second customer surface');
  const output=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,requested.settings),{files}=readReviewPackage(output.archive,digest(output.archive),'gravuru-native-review/v1'),production=files.get('gravur-fertigung.svg').toString();
  assert.equal((production.match(/scale\(-1 1\)/g)||[]).length,rear?1:0);assert(!files.get('gesicherte-gravurgestaltung.svg').toString().includes('scale(-1'));
  assert.equal(output.metadata.productionSvg[0].sha256,digest(files.get('gravur-fertigung.svg')));
  const raw=await renderEngraving({svg:artwork.svg,geometry:artwork.geometry,settings:{mode:'vector',dpi:300,mirror:false},photoFields:[],photos:[]}),a=pdfBounds(Buffer.from(raw.pdf,'base64')),b=pdfBounds(output.pdf);
  assert.equal(b.fonts,0);assert.equal(b.images,0);assert(Math.abs(a.width-b.width)<.01);assert(Math.abs(b.x0-(rear?a.width-a.x1:a.x0))<.02);assert(Math.abs(b.x1-(rear?a.width-a.x0:a.x1))<.02);
 });
}
