import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
// A release-owned, pinned read-only family/line snapshot accompanies the review
// package. It is never a writable catalogue checkout or a browser-supplied path.
export function galleryAssignmentCatalogue(root){
  const file=path.join(root,'assignment-catalogue.json');
  if(!fs.existsSync(file))return ()=>({families:[],lines:[],issue:'Die Familienquellen sind für diese Galerie noch nicht verbunden.'});
  if(fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile())throw Error('Invalid gallery family source');
  const raw=fs.readFileSync(file),value=JSON.parse(raw);
  if(value.schema!=='gravuru-gallery-assignment-catalogue/v1'||!/^[a-f0-9]{40}$/.test(value.sourceCommit)||!Array.isArray(value.families)||!Array.isArray(value.lines))throw Error('Invalid gallery family snapshot');
  const sourceSha256=createHash('sha256').update(raw).digest('hex');
  const snapshot={...value,sourceSha256};
  return ()=>structuredClone(snapshot);
}
