import test from 'node:test';
import assert from 'node:assert/strict';
import {isDesignSourcePath,indexDesignSources,designSourceName} from './design-source-path.mjs';

test('relative design references preserve exact names and reject ambiguous or external paths',()=>{
  for(const name of ['Design.svg','klein/Design.svg','groß/Familie Müller.PDF','a/b/c.svg'])assert.equal(isDesignSourcePath(name),true,name);
  for(const name of ['',null,{},'/Design.svg','../Design.svg','a/../Design.svg','./Design.svg','a//Design.svg','C:/Design.svg','a\\Design.svg','https://example.org/Design.svg','a/%2e%2e/Design.svg','Design.svg?x','Design.svg#x','a\n/Design.svg','a/ Design.svg',' Design.svg','a/Design.svg ','a/'.repeat(16)+'Design.svg','x'.repeat(201)+'.svg','a/'.repeat(10)+'x'.repeat(500)+'.svg'])assert.equal(isDesignSourcePath(name),false,String(name));
  assert.equal(designSourceName('groß/Familie Müller.PDF'),'Familie Müller.PDF');
});
test('selected folder strips only the chosen root and never resolves duplicate basenames implicitly',()=>{
  const small={name:'Design.svg',webkitRelativePath:'Auswahl/klein/Design.svg'},large={name:'Design.svg',webkitRelativePath:'Auswahl/gross/Design.svg'},other={name:'readme.txt',webkitRelativePath:'Auswahl/readme.txt'};
  const {sources,ignored}=indexDesignSources([],[small,large,other]);
  assert.deepEqual([...sources.keys()],['klein/Design.svg','gross/Design.svg']);assert.equal(sources.get('klein/Design.svg'),small);assert.equal(sources.get('gross/Design.svg'),large);assert.equal(sources.get('Design.svg'),undefined);assert.equal(sources.get('Klein/Design.svg'),undefined);assert.equal(ignored,1);
  const direct={name:'Design.svg'};assert.equal(indexDesignSources([direct],[small]).sources.get('Design.svg'),direct);
  assert.throws(()=>indexDesignSources([direct],[{...small,webkitRelativePath:'Auswahl/Design.svg'}]),/doppelt/);
  assert.throws(()=>indexDesignSources([],[small,{...large,webkitRelativePath:'Anderer/gross/Design.svg'}]),/eindeutigen Ordnerpfad/);
  assert.throws(()=>indexDesignSources([],[{name:'Design.svg'}]),/eindeutigen Ordnerpfad/);
  assert.throws(()=>indexDesignSources([],[{...small,webkitRelativePath:'Auswahl/../Design.svg'}]),/Ungültiger/);
});
test('source inventory has bounded size without reading any file contents',()=>{
  const files=Array.from({length:100},(_,i)=>({name:i+'.svg',arrayBuffer(){throw Error('must not read');}}));
  assert.equal(indexDesignSources(files).sources.size,100);
  assert.throws(()=>indexDesignSources([...files,{name:'extra.pdf'}]),/100 SVG/);
  assert.throws(()=>indexDesignSources([],Array(5001).fill({name:'readme.txt',webkitRelativePath:'root/readme.txt'})),/5000/);
});
