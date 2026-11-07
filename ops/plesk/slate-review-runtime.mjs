import fs from 'node:fs';
import path from 'node:path';
import {verifyDirectory,markerValue,fail} from './config.mjs';
import {createSlateGalleryHandler} from '../../scripts/lib/slate-review-gallery.mjs';

export const SLATE_REVIEW_MARKER='.gravuru-slate-review.json';

export function validateSlateReviewMapping(pack,imported){
  if(!['gravuru-slate-original-review/v1','gravuru-design-original-review/v1'].includes(pack?.schema)||pack.reviewOnly!==true||pack.released!==false||!Array.isArray(pack.originals)||!Array.isArray(pack.products))fail('Kein vorbereitetes Design-Prüfpaket.');
  const ids=new Set(pack.originals.map(row=>row.id));
  const blankOnly=pack.schema==='gravuru-design-original-review/v1'&&pack.blankOnly===true&&pack.contentKind==='catalogue-blanks-only'&&
    /^[a-f0-9]{64}$/.test(pack.sourceManifestSha256||'')&&pack.originals.length===0&&pack.products.length===0&&Array.isArray(pack.blanks)&&pack.blanks.length>0&&
    pack.blanks.every(b=>b&&typeof b.key==='string'&&b.key&&typeof b.familyId==='string'&&b.familyId&&typeof b.sizeKey==='string'&&b.sizeKey&&
      Array.isArray(b.mm)&&b.mm.length===2&&b.mm.every(n=>Number.isFinite(n)&&n>0)&&b.reviewOnly===true&&b.released===false&&
      (/^[a-f0-9]{64}$/.test(b.sourceVersion||'')||b.status==='open'&&Array.isArray(b.sourceIssues)&&b.sourceIssues.length>0));
  if(pack.blankOnly===true&&!blankOnly||!ids.size&&!blankOnly||ids.size!==pack.originals.length||[...ids].some(id=>typeof id!=='string'||!id))fail('Ungültige Schiefer-Originalkennungen.');
  if(imported?.localOnly!==true||imported.published!==false||imported.shopifyWrites!==0||!Array.isArray(imported.products)||imported.products.length!==pack.products.length)fail('Die unveröffentlichte lokale Schiefer-Zuordnung fehlt.');
  const expected=new Map(pack.products.map(row=>[row.key,row]));
  const seen=new Set(),products=new Set();
  for(const row of imported.products){
    const original=expected.get(row.key);
    if(!original||seen.has(row.key)||products.has(row.productId)||!/^cfg_[A-Za-z0-9_-]+$/.test(row.productId)||row.reviewOnly!==true||!Array.isArray(row.designIds)||row.designIds.some(id=>!ids.has(id))||JSON.stringify([...row.designIds].sort())!==JSON.stringify([...original.designIds].sort()))fail('Schiefer-Zuordnung passt nicht zum Prüfpaket.');
    seen.add(row.key);products.add(row.productId);
  }
  return {originals:ids.size,products:products.size};
}

export function verifySlateReviewDirectory(config){
  verifyDirectory(config.slateReviewPackage,SLATE_REVIEW_MARKER,markerValue(config,'slate-review-gallery'));
  const importsFile=path.join(config.data,'local-review-import.json');
  const pack=JSON.parse(fs.readFileSync(path.join(config.slateReviewPackage,'manifest.json'),'utf8'));
  const imported=JSON.parse(fs.readFileSync(importsFile,'utf8'));
  return validateSlateReviewMapping(pack,imported);
}

export function attachSlateReviewGallery(server,config,{csrfToken,workshop}){
  verifySlateReviewDirectory(config);
  const importsFile=path.join(config.data,'local-review-import.json');
  // Native products and their revision history are already in the copied
  // database. Never re-import catalogue baselines over the user's edits.
  const gallery=createSlateGalleryHandler(config.slateReviewPackage,importsFile,{csrfToken,workshop});
  const handlers=server.listeners('request');server.removeAllListeners('request');
  server.on('request',(req,res)=>{if(!gallery(req,res))for(const handler of handlers)handler.call(server,req,res);});
  return gallery;
}
