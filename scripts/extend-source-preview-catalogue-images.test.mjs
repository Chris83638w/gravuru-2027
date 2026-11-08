import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourceGitObjectId,sourceGitTreeEntries,verifySourceGitMembership} from './extend-source-preview-catalogue-images.mjs';
const treeEntry=(mode,name,oid)=>Buffer.concat([Buffer.from(mode+' '+name+'\0'),Buffer.from(oid,'hex')]);
function fixture(mode='100644'){
 const png=Buffer.from('exact original image bytes'),blob=sourceGitObjectId('blob',png),leaf=treeEntry(mode,'preview.png',blob),leafId=sourceGitObjectId('tree',leaf),root=treeEntry('40000','Mensch ä',leafId),rootId=sourceGitObjectId('tree',root),commitBytes=Buffer.from('tree '+rootId+'\nauthor Test <test@example.invalid> 0 +0000\ncommitter Test <test@example.invalid> 0 +0000\n\nPinned test\n'),commit=sourceGitObjectId('commit',commitBytes);
 return {png,blob,commit,sourceFile:'Mensch ä/preview.png',objects:new Map([['commit:'+commit,commitBytes],['tree:'+rootId,root],['tree:'+leafId,leaf]]),rootId};
}
test('complete Git commit/tree chain proves exact PNG membership including UTF-8 path names',()=>{
 const f=fixture();assert.equal(verifySourceGitMembership(f),f.blob);assert.deepEqual(sourceGitTreeEntries(f.objects.get('tree:'+f.rootId)).get('Mensch ä').mode,'40000');
});
test('wrong PNG, path, missing tree and tampered object cannot pass the membership proof',()=>{
 const f=fixture();assert.throws(()=>verifySourceGitMembership({...f,png:Buffer.from('changed')}),/blob/);assert.throws(()=>verifySourceGitMembership({...f,sourceFile:'Mensch ä/other.png'}),/absent/);
 const missing=new Map(f.objects);missing.delete('tree:'+f.rootId);assert.throws(()=>verifySourceGitMembership({...f,objects:missing}),/hash/);
 const tampered=new Map(f.objects);tampered.set('tree:'+f.rootId,Buffer.from('changed'));assert.throws(()=>verifySourceGitMembership({...f,objects:tampered}),/hash/);
});
test('symlink blobs and malformed trees are never treated as image files',()=>{
 assert.throws(()=>verifySourceGitMembership(fixture('120000')),/blob/);assert.throws(()=>sourceGitTreeEntries(Buffer.from('100644 preview.png\0short')),/Malformed/);
 assert.throws(()=>sourceGitTreeEntries(Buffer.concat([treeEntry('100644','same','0'.repeat(40)),treeEntry('100644','same','1'.repeat(40))])),/Invalid/);
});
