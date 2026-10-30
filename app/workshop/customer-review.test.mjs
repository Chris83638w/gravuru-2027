import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {textLimits,textLimitCount,textLimitIssue,clampText} from './theme-limits.mjs';
import {joinTemplateText} from './join-template-text.mjs';
import {makeProductDocument} from './product-model.mjs';
import {customerUxConfig} from './customer-ux-policy.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {prepareConfig,quote} from '../configurator/variant-m/contract.mjs';
import {measureText,textPaths} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
function native(){
 const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
 for(const object of config.profile.designs[0].objects.filter(o=>o.type==='text')){measureText(object,resources.fonts);if(object.id==='names'){object.size*=118/object.w;measureText(object,resources.fonts);}}
 return config;
}
test('80 characters across the whole field: Unicode, CRLF and more than two lines',()=>{
 const limits=textLimits({text:'Example',maxLength:32,maxLines:2},{},{},{textRules:{maxCharsPerField:80}});
 const text=Array.from({length:27},()=> 'AB').join('\n');assert.equal(textLimitCount(text,limits),80);
 assert.equal(textLimitIssue(text,limits),'');assert.match(textLimitIssue(text+'C',limits),/80/);
 assert.equal(clampText(text+'C',limits),text);assert.equal(clampText(text.replaceAll('\n','\r\n'),limits),text);
 assert.equal(textLimitCount('😀'.repeat(80),limits),80);assert.equal(clampText('😀'.repeat(81),limits),'😀'.repeat(80));
 assert.match(textLimitIssue(' '.repeat(81),limits),/80/);
 assert.deepEqual(textLimits({maxLength:32,maxLines:2},{},{}),{maxLength:32,maxLines:2});
 assert.match(textLimitIssue('A\nB\nC',textLimits({maxLines:2},{},{})),/2 Zeilen/);
});
test('server contract accepts the new versioned field rule and rejects ambiguous/malformed rules',()=>{
 const config=native();assert.deepEqual(prepareConfig({...config,textRules:{maxCharsPerField:80}}).textRules,{maxCharsPerField:80});
 assert.deepEqual(prepareConfig({...config,textRules:{maxCharsPerLine:50}}).textRules,{maxCharsPerLine:50});
 for(const textRules of [{maxCharsPerField:80,maxCharsPerLine:50},{maxCharsPerField:0},{maxCharsPerField:80.5},{maxCharsPerField:'80'},{unknown:80}])assert.throws(()=>prepareConfig({...config,textRules}),/Zeichenregel/);
});
test('explicit join preserves glyphs, baselines, remaining IDs and source; mismatches fail closed',()=>{
 const config=customerUxConfig(native()),design=config.profile.designs[0],first=design.objects.find(o=>o.type==='text');
 first.text='A';first.rotation=0;first.italic=false;first.y=25;delete first.lineHeight;measureText(first,resources.fonts);
 const second={...first,id:first.id+'-second',fieldKey:first.fieldKey+'-second',text:'B',y:35};measureText(second,resources.fonts);design.objects.splice(design.objects.indexOf(first)+1,0,second);
 const source=makeProductDocument(config),before=structuredClone(source),group={designId:design.id,ids:[first.id,second.id]};
 const result=joinTemplateText(source,group),joined=result.config.profile.designs[0].objects.find(o=>o.id===first.id);
 assert.deepEqual(source,before);assert.equal(joined.text,'A\nB');assert.equal(joined.lineHeight,10);assert.equal(joined.y,30);
 for(const [i,row]of [first,second].entries())assert.equal(joined.y+(i-.5)*joined.lineHeight+joined.size*.35,row.y+row.size*.35);
 const paths=s=>[...s.matchAll(/<path d="([^"]*)"/g)].map(m=>m[1]);
 assert.deepEqual(paths(textPaths(joined,resources.fonts)),[...paths(textPaths(first,resources.fonts)),...paths(textPaths(second,resources.fonts))]);
 assert.equal(joined.w,Math.max(first.w,second.w));assert(!result.elementRights[design.id][second.id]);
 assert.deepEqual(result.config.profile.designs[0].objects.filter(o=>o.id!==first.id),source.config.profile.designs[0].objects.filter(o=>!group.ids.includes(o.id)));
 const mismatch=structuredClone(source);mismatch.config.profile.designs[0].objects.find(o=>o.id===second.id).size+=1;
 assert.throws(()=>joinTemplateText(mismatch,group),/unterschiedliche Gestaltung/);
 const forbidden=structuredClone(source);forbidden.elementRights[design.id][second.id].move=false;
 assert.throws(()=>joinTemplateText(forbidden,group),/Elementrechte/);
 assert.throws(()=>joinTemplateText(source,{...group,ids:[first.id,'missing']}),/vorhandene/);
});
test('new revision charges 169 cents for replacements and additions, original motif stays included',()=>{
 const config=customerUxConfig(native()),design=config.profile.designs[0],original={id:'motif-review',type:'motif',motif:'original',x:20,y:20,w:10,h:10,rotation:0};
 design.objects.push(original);const base=quote(config,design.objects,design.id,{},1).totalCents;
 const other=design.objects.map(o=>o.id===original.id?{...o,motif:'other'}:o);
 assert.equal(quote(config,other,design.id,{},1).totalCents,base+169);
 assert.equal(quote(config,[...design.objects,{...original,id:'new',motif:'other'}],design.id,{},1).totalCents,base+169);
 assert.equal(quote(config,[...other,{...original,id:'new',motif:'other'}],design.id,{},2).totalCents,(base+338)*2);
});
