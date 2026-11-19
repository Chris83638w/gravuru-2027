import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {makeProductDocument} from './product-model.mjs';
import {quote,selectedProfile} from '../configurator/variant-m/contract.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {createCartLedger,renderCustomerCart} from './beta-267-cart.mjs';
import {png} from './beta-267-cart.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const glyph=()=>({a:500,d:'M0 0H400V700H0Z'});
const chars=[...'Haus Nord 12Süd37'];
const font={regular:{units:1000,glyphs:Object.fromEntries(chars.map(c=>[c,glyph()]))}};
const options={format:'16x28',frame:'FK-RUNDUM',color:'schwarz',mounting:'SIL',position:'standard'};

function product(){
 const fixture=doorbellFixture();
 fixture.localResources.fonts={Probe:font};
 // The fixture price for an extra photo is already 0. Enabling the existing
 // switch exercises the photo path; it does not add a new surcharge.
 fixture.photo={...fixture.photo,enabled:true};
 const text={id:'inschrift',type:'text',text:'Haus Nord 12',font:'Probe',size:6,x:90,y:36,w:50,h:8,rotation:0,color:'#ffffff',customerEditable:true,templateOrigin:true,bold:false};
 const photo={id:'foto',type:'photoSlot',fieldKey:'photo-kunde',x:120,y:70,w:18,h:14,rotation:0,photoShape:'rect',required:false,customerEditable:true,templateOrigin:true};
 for(const profile of [fixture.profile,...fixture.doorbell.formats.map(f=>f.profile)]){
  const motif=profile.designs[0].objects.find(o=>o.id==='name');
  const mark=profile.designs[0].objects.find(o=>o.id==='mark-0');
  motif.x=36;motif.y=70;motif.w=12;motif.h=12;mark.x=70;mark.y=90;mark.w=20;mark.h=1;
  profile.designs[0].objects=[structuredClone(text),structuredClone(photo),motif,mark];
 }
 const document=makeProductDocument(fixture);
 return {document,config:document.config};
}

async function review(config,document,personal){
 const design=selectedProfile(config,options).designs[0];
 const objects=structuredClone(design.objects);
 const inscription=objects.find(o=>o.id==='inschrift');
 inscription.text=personal.text;
 const slot=objects.find(o=>o.id==='foto');
 slot.uxUploadId='photo-1';slot.x=personal.photoX;
 const price=quote(config,objects,design.id,options,1);
 const input={productId:config.profile.id,productRevision:1,designId:design.id,objects,options,quantity:1,media:[{id:'photo-1',original:personal.photo.toString('base64')}],preview:personal.photo.toString('base64')};
 const record={id:config.profile.id,revision:1,document,metadata:{productionProfile:null}};
 const bundle=await prepareAcrylicReview({record,config,input,assets:{get(){throw Error('keine zusätzliche Quelle');},read(){throw Error('keine zusätzliche Quelle');}}});
 return {objects,price,bundle,design};
}

test('design, photo, text and options become distinct cart revisions and the same production files',async()=>{
 const {document,config}=product();
 const nord=png(40,30,(x,y)=>y<15?[20,80,60]:[230,230,220]);
 const sued=png(40,30,(x,y)=>x<20?[140,60,30]:[250,240,230]);
 const a=await review(config,document,{text:'Haus Nord 12',photoX:120,photo:nord});
 const b=await review(config,document,{text:'Haus Süd 27',photoX:100,photo:sued});
 assert.equal(a.price.unitCents,5498);assert.equal(b.price.unitCents,5498);
 assert.equal(a.bundle.manifest.selection.price.unitCents,a.price.unitCents);
 assert.equal(b.bundle.manifest.selection.price.unitCents,b.price.unitCents);
 assert.deepEqual(a.bundle.manifest.selection.options,b.bundle.manifest.selection.options);
 assert.notEqual(a.bundle.manifest.packageSha256,b.bundle.manifest.packageSha256);
 const artA=await acrylicArtwork(a.bundle.package,a.bundle.manifest.packageSha256,{engraving:true});
 const artA2=await acrylicArtwork(a.bundle.package,a.bundle.manifest.packageSha256,{engraving:true});
 const artB=await acrylicArtwork(b.bundle.package,b.bundle.manifest.packageSha256,{engraving:true});
 assert.equal(artA.svg,artA2.svg);assert.notEqual(artA.svg,artB.svg);
 assert.equal(artA.geometry.widthMm,artB.geometry.widthMm);
 assert.deepEqual(artA.textFields,['native-0']);assert.deepEqual(artA.photoFields,['native-1']);
 assert.deepEqual(artA.geometry.contours.filter(part=>part.role==='hole'),artB.geometry.contours.filter(part=>part.role==='hole'),'fixed drill contours stay with the variant, not the personal text');
 const savedA=readReviewPackage(a.bundle.package,a.bundle.manifest.packageSha256,['gravuru-native-review/v1']);
 const savedB=readReviewPackage(b.bundle.package,b.bundle.manifest.packageSha256,['gravuru-native-review/v1']);
 assert.deepEqual(savedA.files.get('fotos/1-original.png'),nord);
 assert.deepEqual(savedB.files.get('fotos/1-original.png'),sued);
 const proofA=await createAcrylicEngravingProof(a.bundle.package,a.bundle.manifest.packageSha256,{mode:'raster'});
 const proofB=await createAcrylicEngravingProof(b.bundle.package,b.bundle.manifest.packageSha256,{mode:'raster'});
 const filesA=readReviewPackage(proofA.archive,digest(proofA.archive),['gravuru-native-review/v1']).files;
 const filesB=readReviewPackage(proofB.archive,digest(proofB.archive),['gravuru-native-review/v1']).files;
 for(const name of ['gravur-fertigung.svg','technische-gravurpruefung.pdf','gravur-kontur-1zu1.pdf']){
  assert.ok(filesA.has(name),name);assert.ok(filesB.has(name),name);
 }
 assert.notEqual(sha(filesA.get('gravur-fertigung.svg')),sha(filesB.get('gravur-fertigung.svg')));
 assert.equal(proofA.metadata.productionReady,false);assert.equal(proofB.metadata.productionReady,false);
 const variantId='9001';
 const ledger=createCartLedger();
 const lineA=ledger.commit({variantId,productTitle:'Funkklingel Fixture',designName:'Beispiel',options:[{label:'Format',value:'16x28'},{label:'Befestigung',value:'SIL'}],gravurtext:'Haus Nord 12',unitCents:a.price.unitCents,quantity:1,currency:'EUR',designSha256:sha(Buffer.from(JSON.stringify(a.objects))),previewPng:nord,snapshotId:a.bundle.manifest.id});
 const lineB=ledger.commit({variantId,productTitle:'Funkklingel Fixture',designName:'Beispiel',options:[{label:'Format',value:'16x28'},{label:'Befestigung',value:'SIL'}],gravurtext:'Haus Süd 27',unitCents:b.price.unitCents,quantity:1,currency:'EUR',designSha256:sha(Buffer.from(JSON.stringify(b.objects))),previewPng:sued,snapshotId:b.bundle.manifest.id});
 assert.equal(lineA.variantId,lineB.variantId);assert.notEqual(lineA.configuration.id,lineB.configuration.id);assert.notEqual(lineA.previewSha256,lineB.previewSha256);
 const html=renderCustomerCart([lineA,lineB]);
 assert.equal(html.includes('Haus Nord 12')&&html.includes('Haus Süd 27'),true);
 assert.equal(/<a\b|gravuru-cart-edit|_gravuru_bearbeiten/.test(html),false);
 const accepted=ledger.acceptOrder({financialStatus:'paid',cancelledAt:null,lines:[lineA,lineB]});
 assert.equal(accepted.accepted,true);assert.equal(accepted.productionReady,false);
 assert.throws(()=>ledger.acceptOrder({financialStatus:'paid',cancelledAt:null,lines:[{...lineA,previewSha256:lineB.previewSha256},lineB]}),{code:'order_manipulated'});
});
