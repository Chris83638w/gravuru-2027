import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {katalogFor} from '../../app/workshop/design-dashboard.mjs';
import {convertFont} from '../../app/workshop/font-library.mjs';
import {parseDesignSvg,pathBounds} from '../../app/workshop/katalog-convert.mjs';
const arg=name=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
if(!arg('katalog')||!arg('out'))throw Error('--katalog und --out sind erforderlich.');
const root=path.resolve(arg('katalog')),out=path.resolve(arg('out')),series='familie-mika-120x80';
const index=JSON.parse(fs.readFileSync(path.join(root,'designs',series,'index.json'),'utf8'));
const source=index.designs.map(e=>JSON.parse(fs.readFileSync(path.join(root,'designs',series,e.id,'design.json'),'utf8')));
const registry=JSON.parse(fs.readFileSync(path.join(root,'motive-eigene/motive-eigene.json'),'utf8')).motifs;
const fontNames=[...new Set(source.flatMap(d=>d.fonts))];
const katalog=katalogFor(root,{maxAgeMs:0});
const resources=await katalog.fontResources(fontNames,{converter:convertFont});
assert.deepEqual(resources.missing,[]);
const checks=[];
for(const d of source){
  const parsed=parseDesignSvg(fs.readFileSync(path.join(root,'designs',series,d.id,'design.svg'),'utf8'));
  assert.equal(parsed.layers.filter(l=>l.kind==='text').length,d.texts.length);
  assert.ok(d.fonts.length>=1&&d.fonts.length<=3);
  assert.equal(d.sizes.length,1);
  assert.ok(katalog.families.get('steel-door-signs').sizes.some(s=>s.key===d.sizes[0]));
  assert.equal(d.ziele[0].freigabe,null);
  assert.equal(d.familyMembers.maximumPersons,6);
  assert.equal(d.familyMembers.petsAdditionalOptional,true);
  assert.equal(d.motifs.length,d.familyMembers.persons+d.familyMembers.pets);
  assert.equal(new Set(d.familyMembers.members.map(m=>m.nameField)).size,d.familyMembers.members.length);
  assert.equal(new Set(d.familyMembers.members.map(m=>m.sourceMotifId)).size,d.familyMembers.members.length,'Figuren innerhalb eines Designs müssen verschieden sein.');
  let minVisible=Infinity;
  const heights=[];
  for(const t of d.texts){
    assert.ok(t.sizeMm>=3,t.id+' nominal kleiner als 3 mm');
    assert.ok(!/^(?:Name\s*\d*|Text\s*\d*|Max Mustermann|Mustername)$/i.test(t.text.trim()));
    const font=resources.fonts[t.font].regular;
    let low=Infinity,high=-Infinity;
    for(const c of t.text){
      const glyph=font.glyphs[c];assert.ok(glyph,'Zeichen fehlt: '+c);
      if(!glyph.d)continue;
      const b=pathBounds(glyph.d);low=Math.min(low,b[1]);high=Math.max(high,b[1]+b[3]);
    }
    const height=(high-low)*t.sizeMm/font.units;
    minVisible=Math.min(minVisible,height);heights.push({id:t.id,text:t.text,sizeMm:t.sizeMm,visibleHeightMm:Number(height.toFixed(4))});
    assert.ok(height>=3-.005,t.id+': sichtbare Glyphenhöhe '+height+' mm');
  }
  for(const m of d.familyMembers.members){
    const bytes=fs.readFileSync(path.join(root,m.source));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),m.sourceSha256);
    assert.equal(registry.find(e=>e.key===m.sourceMotifId)?.sha256,m.sourceSha256,'Register-Prüfsumme muss den tatsächlichen Dateibytes entsprechen.');
    assert.ok(m.source.startsWith('motive-eigene/familie-mika-atelier/'));
    assert.equal(fs.readFileSync(path.join(root,'designs',series,d.id,m.sourceCopy)).toString(),bytes.toString());
    const sourceSvg=bytes.toString('utf8'),vb=sourceSvg.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);
    assert.ok(Math.abs(m.boxMm[2]/m.boxMm[3]-vb[2]/vb[3])<1e-5,'Motivproportion verändert');
    assert.ok(d.texts.some(t=>t.id===m.nameElementId));
    assert.ok(d.motifs.some(t=>t.id===m.motifElementId));
  }
  checks.push({id:d.id,persons:d.familyMembers.persons,pets:d.familyMembers.pets,fonts:d.fonts,sizes:d.sizes,minNominalTextMm:Math.min(...d.texts.map(t=>t.sizeMm)),minVisibleGlyphHeightMm:Number(minVisible.toFixed(4)),textHeights:heights,sourceHashesMatch:true,proportionsPreserved:true,individualMotifsAndNames:true,release:null});
}
fs.mkdirSync(out,{recursive:true});
const result={checkedAt:new Date().toISOString(),designCount:checks.length,memberCount:checks.reduce((n,d)=>n+d.persons+d.pets,0),checks};
fs.writeFileSync(path.join(out,'qualitaetspruefung.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({designs:checks.length,members:result.memberCount,minVisibleGlyphHeightMm:Math.min(...checks.map(d=>d.minVisibleGlyphHeightMm)),sourceHashesMatch:true,individualElements:true}));
