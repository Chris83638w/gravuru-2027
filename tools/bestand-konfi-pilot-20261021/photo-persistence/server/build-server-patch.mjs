import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {patchAcrylicDraftStore} from './patch-acrylic-draft-store.mjs';
import {patchNativeDraftHttp} from './patch-native-draft-http.mjs';
import {patchNativeReview} from './patch-native-review.mjs';
const root=dirname(fileURLToPath(import.meta.url));
export function serverPatchFiles(){
  const changes=[['app/workshop/acrylic-draft-store.mjs',patchAcrylicDraftStore],['app/workshop/acrylic-review.mjs',patchNativeReview],['app/workshop/http.mjs',patchNativeDraftHttp]];
  return [...changes.map(([path,patch])=>{const before=readFileSync(join(root,'upstream',path),'utf8');return {path,before,after:patch(before)};}),
    ...[['app/workshop/photo-persistence/photo-reopening.mjs','../photo-reopening.mjs'],
      ['app/workshop/photo-persistence/photo-reopening-transport.mjs','../photo-reopening-transport.mjs'],
      ['app/workshop/photo-persistence/server/native-photo-reopening-store.mjs','native-photo-reopening-store.mjs'],
      ['app/workshop/photo-persistence/server/native-input-binding.mjs','native-input-binding.mjs']]
      .map(([path,source])=>({path,before:null,after:readFileSync(join(root,source),'utf8')}))];
}
export function buildServerPatch(){
  const temp=mkdtempSync(join(tmpdir(),'gravuru-photo-patch-build-'));let result='';
  try{
    for(const [i,file] of serverPatchFiles().entries()){
      const before=join(temp,'before-'+i),after=join(temp,'after-'+i);writeFileSync(before,file.before??'');writeFileSync(after,file.after);
      const diff=spawnSync('git',['-c','core.autocrlf=false','diff','--no-index','--',before,after],{encoding:'utf8',maxBuffer:5*1024*1024,windowsHide:true});
      if(diff.error||![0,1].includes(diff.status))throw Error('Git could not build the review patch: '+(diff.error?.message||diff.stderr));
      result+=diff.stdout.split('\n').filter(l=>!l.startsWith('diff --git ')&&!l.startsWith('index ')).map(l=>l.startsWith('--- ')?'--- '+(file.before===null?'/dev/null':'a/'+file.path):l.startsWith('+++ ')?'+++ b/'+file.path:l).join('\n');
    }
  }finally{const path=resolve(temp);if(dirname(path)!==resolve(tmpdir())||!path.split(/[\\/]/).at(-1).startsWith('gravuru-photo-patch-build-'))throw Error('Unsafe patch cleanup');rmSync(path,{recursive:true,force:true});}
  return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=join(root,'native-photo-persistence.patch');writeFileSync(output,buildServerPatch());console.log(output);
}
