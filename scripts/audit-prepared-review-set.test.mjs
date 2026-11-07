import test from 'node:test';import assert from 'node:assert/strict';import {expandedNativeDocumentBytes} from './audit-prepared-review-set.mjs';
test('expanded byte count equals real JSON rehydration including Unicode font keys',()=>{
 const document={config:{localResources:{fonts:{},motifs:[]},profile:{name:'Test ä'}}},fonts={'Schrift ü':{glyphs:{A:{outline:'M0 0L1 1'},'ß':{width:23}}},Second:{regular:{a:1}}};
 const sizes=Object.entries(fonts).map(([name,font])=>({name,jsonBytes:Buffer.byteLength(JSON.stringify(font))}));const hydrated=structuredClone(document);hydrated.config.localResources.fonts=fonts;
 assert.equal(expandedNativeDocumentBytes(document,sizes),Buffer.byteLength(JSON.stringify(hydrated)));assert.deepEqual(document.config.localResources.fonts,{});
 assert.equal(expandedNativeDocumentBytes(document,[]),Buffer.byteLength(JSON.stringify(document)));
});
