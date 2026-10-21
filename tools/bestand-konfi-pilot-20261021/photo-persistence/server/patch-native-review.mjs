import {createHash} from 'node:crypto';
export const UPSTREAM_NATIVE_REVIEW_SHA256='27d9f10e80c1ec31da1407ca7769cb604b95e02210297ce7066305a2950f7bc2';
export function patchNativeReview(source){
  if(createHash('sha256').update(source).digest('hex')!==UPSTREAM_NATIVE_REVIEW_SHA256)throw Error('Unrecognized native review source; re-review before patching.');
  const once=(from,to)=>{if(source.split(from).length!==2)throw Error('Native-review patch anchor is missing or ambiguous.');source=source.replace(from,to);};
  once("import {acrylicPhotoResolution", "import {snapshotNativeInput} from './photo-persistence/server/native-input-binding.mjs';\nimport {acrylicPhotoResolution");
  once("export async function prepareAcrylicReview({record,config,input,assets,preparePhoto=prepareCustomerPhoto}){\n const state=",
    "export async function prepareAcrylicReview({record,config,input,assets,preparePhoto=prepareCustomerPhoto}){\n const boundInput=snapshotNativeInput(input);input=boundInput.input;\n const state=");
  once("source:{draftId:'acrylic_'+randomUUID(),draftRevision:1,designId:state.design.id}",
    "source:{draftId:'acrylic_'+randomUUID(),draftRevision:1,designId:state.design.id,nativeInputSha256:boundInput.sha256}");
  return source;
}
