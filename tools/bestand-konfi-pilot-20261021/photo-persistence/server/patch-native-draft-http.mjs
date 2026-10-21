// Proposed patch only. Does not write, deploy or start an HTTP server.
import {createHash} from 'node:crypto';
export const UPSTREAM_HTTP_SHA256='77d92b9c85acad2f34c1609a613a38566fb7303e6a545e23d29d493085f07942';
export function patchNativeDraftHttp(source){
  if(createHash('sha256').update(source).digest('hex')!==UPSTREAM_HTTP_SHA256)throw Error('Unrecognized HTTP source; re-review current authorization and body contract.');
  const once=(from,to)=>{if(source.split(from).length!==2)throw Error('HTTP patch anchor is missing or ambiguous.');source=source.replace(from,to);};
  once("import {prepareAcrylicReview}","import {hydratePhotoReopeningTransport} from './photo-persistence/photo-reopening-transport.mjs';\nimport {prepareAcrylicReview}");
  once("        if(draft&&method==='GET')return json(res,200,{draft,review:customerDrafts.review(draft.snapshotId).manifest});",
    "        if(!draft&&method==='GET'&&url.searchParams.get('capabilities')==='1')return json(res,200,{photoPersistence:customerDrafts.acrylicDrafts.photoReopeningCapability()});\n"+
    "        if(draft&&method==='GET')return json(res,200,{draft,review:customerDrafts.review(draft.snapshotId).manifest,...(url.searchParams.get('reopening')==='1'?{reopening:customerDrafts.acrylicDrafts.reopening(draft.id,token)}:{})});");
  once("const data=await body(req,100*1024*1024),allowed=draft?['input','expectedRevision']:['input'];",
    "const data=await body(req,100*1024*1024),allowed=draft?['input','expectedRevision','reopening']:['input','reopening'];");
  once("          const saved=draft?customerDrafts.acrylicDrafts.save(draft.id,token,data.expectedRevision,bundle):customerDrafts.acrylicDrafts.create(bundle);",
    "          const reopeningTicket=data.reopening===undefined?undefined:await customerDrafts.acrylicDrafts.preparePhotoReopening({packet:hydratePhotoReopeningTransport({reopening:data.reopening,input}),model:model(record.id,record.revision),input,bundle,preparePhoto:prepareCustomerPhoto});\n"+
    "          const saved=draft?customerDrafts.acrylicDrafts.save(draft.id,token,data.expectedRevision,bundle,reopeningTicket):customerDrafts.acrylicDrafts.create(bundle,reopeningTicket);");
  return source;
}
