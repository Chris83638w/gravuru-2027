// Reopen every generated variant and compare editor geometry to native scaling.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const arg=n=>process.argv.find(s=>s.startsWith('--'+n+'='))?.slice(n.length+3);
const root=path.resolve(arg('katalog')),code=path.resolve(arg('runtime-code'));
const mod=n=>import(pathToFileURL(path.join(code,'app/workshop/'+n+'.mjs')));
const {openKatalog}=await mod('katalog-source'),{convertFont}=await mod('font-library');
const {katalogDesignToTemplate,scaleTemplate}=await mod('katalog-convert');
const report=JSON.parse(fs.readFileSync(path.join(root,'groessen.json'),'utf8')),catalog=openKatalog(root),family=catalog.families.get('steel-door-signs');
const byId=new Map(catalog.designs.masters.map(m=>[m.id,m])),cache=new Map();let objects=0,maxDelta=0;
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const row of report.rows){
 const master=byId.get(row.sourceId),variant=byId.get(row.id);assert(master&&variant);
 for(const [ext,sha]of Object.entries(row.files))assert.equal(hash(fs.readFileSync(path.join(variant.dir,'design.'+ext))),sha);
 if(!cache.has(master.id)){
  const {fonts,missing}=await catalog.fontResources(master.fonts,{converter:convertFont});assert.deepEqual(missing,[]);
  cache.set(master.id,{fonts,source:katalogDesignToTemplate(master,family,catalog.theme(master.themes[0]),{fonts})});
 }
 const {fonts,source}=cache.get(master.id),expected=scaleTemplate(source.template,master.plateMm,variant.plateMm,fonts,{contain:true});
 const actual=katalogDesignToTemplate(variant,family,catalog.theme(variant.themes[0]),{fonts});
 assert.equal(actual.template.objects.length,expected.objects.length,row.id+' element count');
 for(const before of expected.objects){
  const after=actual.template.objects.find(o=>o.id===before.id);assert(after,row.id+' '+before.id);
  for(const key of ['type','text','font','photoShape','customerEditable','fieldKey'])assert.equal(after[key],before[key],row.id+' '+before.id+' '+key);
  for(const key of ['x','y','w','h','size','lineHeight','rotation'])if(typeof before[key]==='number'){
   const delta=Math.abs(after[key]-before[key]);maxDelta=Math.max(maxDelta,delta);
   // Native coordinates round to .001 mm; serialisation and glyph metrics
   // may accumulate a few rounding steps, but no visible geometry change.
   assert(delta<=.005,row.id+' '+before.id+' '+key+' delta '+delta);
  }
  objects++;
 }
 assert.equal(actual.motifs.length,source.motifs.length);
 assert.equal(variant.json.freigabe,null);assert(variant.json.ziele.every(t=>t.freigabe===null));
}
const result={variants:report.rows.length,retainedSourceIdentifiers:report.blocked.length,objects,maxCoordinateDeltaMm:maxDelta,assertedToleranceMm:.005,checks:['exported-file hashes','native converter reopening','editable text and photo fields','font/text identity','object geometry','motif count','null approvals']};
fs.writeFileSync(path.join(root,'groessen-pruefung.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
