import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {familyExecution,executionKind,executionHeading,executionOptionGroups,executionTabLabel,MEMORIAL_FAMILIES,UV_CROSS_FAMILY} from './execution-registry.mjs';
import {stakeChoicesMarkup} from './stake-execution.mjs';
import {memorialChoicesMarkup} from './memorial-execution.mjs';
import {selectedFamilyProfile} from './family-formats.mjs';
import {buildProductEditorBundles,EXECUTION_ENTRIES} from './bundle-build.mjs';
import {uvCrossSizeMarkup,uvCrossGlassPreview} from './uv-cross-execution.mjs';
import {familyFormatOptions} from './family-formats.mjs';
import {summaryRows} from './mobile-steps.mjs';
import {studioSvg} from '../../platform/sources/app/shared/models/studio-svg.mjs';

test('execution selection uses catalogue/schema identity, never title, material or geometry',()=>{
 for(const source of ['steel-door-signs','acryl-3mm-tuerschilder-schwarz'])assert.equal(executionKind({productExecution:familyExecution(source)}),'door-sign');
 for(const source of MEMORIAL_FAMILIES)assert.equal(executionKind({productExecution:familyExecution(source)}),'memorial');
 assert.equal(executionKind({productExecution:familyExecution('grabstecker-edelstahl')}),'stake');
 assert.equal(executionKind({doorbell:{schema:'gravuru-doorbell/v1'}}),'doorbell');
 assert.equal(executionKind({profile:{name:'Grabstecker Gedenktafel Funkklingel',material:{kind:'steel'},workingArea:{headHeightMm:100,previewHeightMm:110}}}),'generic');
 assert.equal(executionKind({productExecution:{...familyExecution('steel-door-signs'),kind:'stake'}}),'generic');
 assert.equal(executionKind({productExecution:{...familyExecution(MEMORIAL_FAMILIES[0]),enabled:false}}),'generic','the deferred memorial UI stays off until the price round');
 assert.equal(executionKind({productExecution:{...familyExecution('grabstecker-edelstahl'),enabled:false}}),'stake','the memorial-only switch cannot weaken stake validation');
});

test('stake offers only current-form sizes and follows size-specific head/production geometry without source changes',()=>{
 const mount={id:'K00',priceCents:0,holes:[]};
 const format=(key,form,width,height,head,price)=>({key,form,label:key,geometry:{width,height,shape:'contour',outlinePath:'M0 0H'+width+'V'+height+'H0Z',holes:[]},workingArea:{headHeightMm:head,previewHeightMm:head+10},variants:[{color:'edelstahl',familyId:'grabstecker-edelstahl',sizeKey:key,material:{kind:'steel'},basePriceCents:price,mounting:[mount],designIds:['test']} ]});
 const c={productExecution:familyExecution('grabstecker-edelstahl'),profile:{defaultDesignId:'test',workingArea:{headHeightMm:100,previewHeightMm:110},optionGroups:[{id:'size'},{id:'mounting'},{id:'color'}]},familyFormats:{schema:'gravuru-family-formats/v1',defaultSize:'S',defaultColor:'edelstahl',formats:[format('S','GS-HERZ',100,300,100,1899),format('L','GS-HERZ',200,450,200,2999),format('cross','GS-KREUZ',200,450,200,2499)],designs:[{id:'test',katalog:{plateMm:[100,300]},objects:[]}]}};
 const before=JSON.stringify(c),markup=stakeChoicesMarkup(c,{size:'L'}),selected=selectedFamilyProfile(c,{size:'L'});
 assert.deepEqual(executionOptionGroups(c).map(g=>g.id),['size']);
 assert.match(markup,/data-stake-size="S"/);assert.match(markup,/data-stake-size="L" aria-pressed="true"/);assert.match(markup,/29,99/);
 assert.doesNotMatch(markup,/mounting|cross|Befestigung|Farbe|form/);
 assert.deepEqual(selected.workingArea,{headHeightMm:200,previewHeightMm:210});assert.equal(selected.geometry.height,450);
 assert.equal(JSON.stringify(c),before);
});

test('memorial shows bound accessory alternatives, K00 first, catalogue surcharges and no unrelated controls',()=>{
 const c={profile:{optionGroups:[{id:'mounting',values:[{id:'B02',label:'2 Bohrlöcher',priceCents:299,holes:[{x:12,y:50}]},{id:'STK',label:'Ständer klar',priceCents:1399,holes:[]},{id:'K00',label:'Ohne Bohrung',priceCents:0,holes:[]}]}]}};
 const before=JSON.stringify(c),html=memorialChoicesMarkup(c);
 assert.ok(html.indexOf('data-picture-option="K00"')<html.indexOf('data-picture-option="B02"'));
 assert.match(html,/Zubehör/);assert.match(html,/Alternativ/);assert.match(html,/13,99/);assert.match(html,/2,99/);
 assert.doesNotMatch(html,/Position|Gerät|data-stake-size|data-family-group/);assert.equal(JSON.stringify(c),before);
});

test('UV crosses detect existing catalogue records and offer native contour icons with base prices',()=>{
 const mount={id:'K00',label:'Ohne Bohrung',priceCents:0,holes:[]};
 const format=(key,label,width,height,basePriceCents)=>({
  key,label,geometry:{width,height,shape:'contour',outlinePath:`M40 0H70V36H${width}V73H70V160L55 ${height}L40 160V73H0V36H40Z`},
  variants:[{color:'klar',familyId:UV_CROSS_FAMILY,basePriceCents,mounting:[mount],designIds:['design']}]
 });
 const formats=[format('UV-KREUZ-11X20','11 × 20 cm',110,200,1499),format('UV-KREUZ-14X25','14 × 25 cm',140,250,2299),format('UV-KREUZ-22X40','22 × 40 cm',220,400,2799)];
 const profile={optionGroups:[{id:'mounting',name:'Befestigung',values:[mount],defaultValueId:'K00'},{id:'size',name:'Größe',values:formats.map(f=>({id:f.key,label:f.label})),defaultValueId:formats[0].key}]};
 const config={profile,familyFormats:{formats,defaultSize:formats[0].key,defaultColor:'klar',colors:[{id:'klar'}]}};
 const before=JSON.stringify(config),html=uvCrossSizeMarkup(config);
 assert.equal(executionKind(config),'uv-cross');
 assert.equal(executionKind({productExecution:familyExecution(UV_CROSS_FAMILY)}),'uv-cross');
 assert.equal(executionKind({profile:{name:'UV-Gedenkkreuze',material:{kind:'acrylic',variant:'klar',thicknessMm:5}}}),'generic');
 assert.equal(executionTabLabel(config),'Größe');
 assert.equal(executionHeading(config),'Größe');
 assert.deepEqual(executionOptionGroups(config).map(g=>g.id),['size']);
 assert.equal((html.match(/data-picture-group="size"/g)||[]).length,3);
 for(const f of formats){
  assert.ok(html.includes(`data-picture-option="${f.key}"`));
  assert.ok(html.includes(`d="${f.geometry.outlinePath}"`));
 }
 assert.match(html,/14,99[^]*22,99[^]*27,99/);
 assert.doesNotMatch(html,/select|Bohrung|Befestigung/);
 const options=familyFormatOptions(config,{size:formats[1].key});
 assert.deepEqual(options,{size:formats[1].key,mounting:'K00'});
 const summary=summaryRows({profile,config,state:{mOptions:options,fkMounting:'K00'},legacy:{mounting:{options:[{key:'K00',name:'Ohne Bohrung'}]}}});
 assert.deepEqual(summary[0],['Größe','14 × 25 cm']);
 assert.doesNotMatch(JSON.stringify(summary),/Bohrung|Befestigung/);
 assert.equal(JSON.stringify(config),before);
});

test('UV rear print keeps its geometry and paint between translucent glass layers',()=>{
 const outlinePath='M40 0H70V36H110V73H70V160L55 200L40 160V73H0V36H40Z';
 const profile={kind:'universal-product',geometry:{width:110,height:200,shape:'contour',outlinePath,holes:[]},material:{kind:'acrylic',variant:'klar',thicknessMm:5,engravingSide:'back',color:'#dbe6e3'},processing:{profileId:'color-print'}};
 const design={name:'Gedenkkreuz',objects:[{id:'print',type:'graphic',shape:'rect',x:55,y:50,w:10,h:5,color:'#274c51',filled:true}],marks:[]};
 const before=JSON.stringify({profile,design}),svg=studioSvg(profile,design,{},{platePreview:uvCrossGlassPreview});
 assert.match(svg,/data-preview-acrylic-glass="klar"[^]*fill-opacity=".07"[^]*data-object="print"[^]*data-preview-glass-finish="front"/);
 assert.ok(svg.includes(`d="${outlinePath}"`));
 assert.match(svg,/translate\(2 2.7\)/);
 assert.match(svg,/data-object="print" transform="translate\(55 50\) rotate\(0\)" fill="#274c51"/);
 assert.doesNotMatch(svg,/data-plate-shadow|scale\(-1/);
 assert.equal(JSON.stringify({profile,design}),before);
 assert.doesNotMatch(studioSvg(profile,design,{}),/-uv-gloss/);
});

test('each execution UI is a separate chunk with no other execution or duplicate common dependency',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-executions-'));
 try{
  const result=buildProductEditorBundles(dir),core=new Set(result.modules),seen=new Set(core);
  for(const [kind,entries] of Object.entries(EXECUTION_ENTRIES)){
   const chunk=result.executions[kind];for(const entry of entries){assert.ok(chunk.modules.includes(entry));assert.equal(core.has(entry),false);}
   for(const url of chunk.modules){assert.equal(seen.has(url),false,url);seen.add(url);assert.equal(result.chunks[url],chunk.url);}
   for(const [other,es] of Object.entries(EXECUTION_ENTRIES))if(other!==kind)for(const entry of es)assert.equal(chunk.modules.includes(entry),false);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
