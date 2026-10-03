import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';

const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python',process.platform==='win32'?'python.exe':'bin/python3');
const python=process.env.GRAVURU_PYTHON||(existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
const worker=fileURLToPath(new URL('./design-converter.py',import.meta.url));
const localPython=fileURLToPath(new URL('../../.local-data/python',import.meta.url));
const env={...process.env,PYTHONPATH:[localPython,process.env.PYTHONPATH].filter(Boolean).join(delimiter)};
const available=spawnSync(python,['-c','import sys'],{windowsHide:true,env}).status===0;
const pdfAvailable=available&&spawnSync(python,['-c','import pymupdf; assert callable(pymupdf.open)'],{windowsHide:true,env}).status===0;
function convert(source,kind='svg',page=1){
  const result=spawnSync(python,[worker],{input:JSON.stringify({kind,bytes:Buffer.from(source).toString('base64'),page}),encoding:'utf8',maxBuffer:32*1024*1024,timeout:15000,windowsHide:true,env});
  assert.ifError(result.error);
  assert.equal(result.stderr,'');
  const data=JSON.parse(result.stdout);
  assert.equal(result.status,data.error?1:0);
  return data;
}
const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="150mm" height="200mm" viewBox="0 0 150 200">${body}</svg>`;
const svgTest=(name,fn)=>test(name,{skip:!available?'Python 3 unavailable':false},fn);

svgTest('SVG preserves color, transparency, paths, gradients and local reuse',()=>{
  const result=convert(svg('<defs><linearGradient id="paint"><stop offset="0" stop-color="#123456"/><stop offset="1" stop-color="#abcdef" stop-opacity=".2"/></linearGradient><path id="outline" d="M0 0L100 0L0 100Z"/></defs><use href="#outline" style="fill:url(#paint);opacity:0.45"/>'));
  assert.equal(result.error,undefined);
  assert.equal(result.widthMm,150);assert.equal(result.heightMm,200);
  assert.match(result.svg,/#123456/);assert.match(result.svg,/fill="url\(#paint\)"/);
  assert.match(result.svg,/opacity="0.45"/);assert.match(result.svg,/href="#outline"/);
  assert.equal(result.hasText,false);assert.equal(result.pageCount,1);
});

svgTest('SVG dimensions support units and explicit 96dpi conversion',()=>{
  for(const [width,height,w,h] of [['2.54cm','1in',25.4,25.4],['72pt','6pc',25.4,25.4],['96','192px',25.4,50.8]]){
    const result=convert(`<svg width="${width}" height="${height}" viewBox="0 0 96 96"/>`);
    assert.ok(Math.abs(result.widthMm-w)<1e-8);assert.ok(Math.abs(result.heightMm-h)<1e-8);
  }
  const inferred=convert('<svg viewBox="-10 -20 192 96"/>');
  assert.ok(Math.abs(inferred.widthMm-50.8)<1e-8);assert.ok(Math.abs(inferred.heightMm-25.4)<1e-8);
  assert.equal(inferred.widthSource,'viewBox-96dpi');assert.equal(inferred.warnings.length,1);
  const derived=convert('<svg width="10cm" viewBox="0 0 2 1"/>');
  assert.equal(derived.widthMm,100);assert.equal(derived.heightMm,50);
});

svgTest('SVG embedded raster bytes stay byte-identical',()=>{
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/R8AAAAASUVORK5CYII=';
  const result=convert(svg(`<image width="1" height="1" href="data:image/png;base64,${png}"/>`));
  assert.equal(result.error,undefined);assert.ok(result.svg.includes(png));
});

svgTest('SVG rejects executable/external content and unsupported visual features',()=>{
  for(const body of ['<script>alert(1)</script>','<rect onload="alert(1)"/>','<foreignObject/>','<image href="https://example.org/a.png"/>','<use href="file:///a.svg#b"/>','<rect fill="url(https://example.org/a.svg#x)"/>','<rect style="fill:u\\72l(https://example.org)"/>','<rect style="fill:&#117;rl(https://example.org)"/>','<style>rect{fill:red}</style>','<rect class="a"/>','<filter/>','<animate/>','<rect filter="url(#f)"/>','<rect style="mix-blend-mode:multiply"/>','<image href="data:image/svg+xml;base64,PHN2Zy8+"/>']){
    assert.ok(convert(svg(body)).error,body);
  }
  assert.ok(convert('<!DOCTYPE svg [<!ENTITY x "bad">]>'+svg('')).error);
  assert.ok(convert('<?xml-stylesheet href="https://example.org/x"?>'+svg('')).error);
  assert.equal(convert(svg('<text x="2" y="3">Name</text>')).error.code,'text_requires_outlines');
});

svgTest('SVG rejects cycles, duplicate IDs, expansion bombs and missing references',()=>{
  for(const body of ['<g id="a"><use href="#a"/></g>','<defs><g id="a"><use href="#b"/></g><g id="b"><use href="#a"/></g></defs>','<g id="x"/><g id="x"/>','<use href="#missing"/>'])assert.ok(convert(svg(body)).error);
  const groups=['<g id="g0"><rect width="1" height="1"/></g>'];
  for(let i=1;i<19;i++)groups.push(`<g id="g${i}"><use href="#g${i-1}"/><use href="#g${i-1}"/></g>`);
  assert.equal(convert(svg('<defs>'+groups.join('')+'</defs><use href="#g18"/>')).error.code,'complexity_limit');
  assert.equal(convert(svg('<g>'.repeat(65)+'</g>'.repeat(65))).error.code,'complexity_limit');
});

svgTest('SVG rejects invalid dimensions and malformed XML rather than guessing',()=>{
  for(const source of ['<svg width="100%" height="10mm"/>','<svg width="NaN" height="10mm"/>','<svg viewBox="0 0 0 10"/>','<svg viewBox="0 0 10 10"><path></svg>','<svg width="0mm" height="5mm"/>'])assert.ok(convert(source).error);
  assert.equal(convert(svg(''),'svg',2).error.code,'invalid_page');
});

test('PDF preserves vector paths, text outlines, images and selected page size',{skip:!pdfAvailable?'PyMuPDF optional dependency unavailable':false},()=>{
  const source=spawnSync(python,['-c',`import pymupdf,sys,base64
doc=pymupdf.open()
page=doc.new_page(width=72,height=144)
page.draw_rect(pymupdf.Rect(2,3,50,90),color=(1,0,0),fill=(0,1,0),fill_opacity=.4)
page.insert_text((5,20),'Hello')
page.insert_image(pymupdf.Rect(5,100,15,110),stream=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/R8AAAAASUVORK5CYII='))
doc.new_page(width=144,height=72)
sys.stdout.buffer.write(doc.tobytes())`],{windowsHide:true,env});
  assert.equal(source.status,0,source.stderr.toString());
  const first=convert(source.stdout,'pdf');
  assert.equal(first.error,undefined);assert.equal(first.widthMm,25.4);assert.equal(first.heightMm,50.8);
  assert.equal(first.pageCount,2);assert.equal(first.page,1);assert.equal(first.hasText,true);
  assert.match(first.svg,/<path/);assert.doesNotMatch(first.svg,/<text/);
  const opacities=[...first.svg.matchAll(/(?:fill-|stroke-)?opacity="([^"]+)"/g)].map(match=>Number(match[1]));
  assert.ok(opacities.some(value=>Math.abs(value-.4)<1e-6),'PDF fill transparency is preserved numerically');
  assert.match(first.svg,/<image/);assert.match(first.svg,/data:image\/png;base64,/);
  const second=convert(source.stdout,'pdf',2);
  assert.equal(second.widthMm,50.8);assert.equal(second.heightMm,25.4);assert.equal(second.page,2);
  assert.equal(convert(source.stdout,'pdf',3).error.code,'invalid_page');
});

test('PDF rejects nonstandard fonts without embedded glyph programs',{skip:!pdfAvailable?'PyMuPDF optional dependency unavailable':false},()=>{
  const source=spawnSync(python,['-c',`import pymupdf,sys
doc=pymupdf.open()
page=doc.new_page(width=72,height=72)
page.insert_text((5,20),'Hello')
font=page.get_fonts()[0][0]
doc.xref_set_key(font,'BaseFont','/MissingCustomFace')
sys.stdout.buffer.write(doc.tobytes())`],{windowsHide:true,env});
  assert.equal(source.status,0,source.stderr.toString());
  const result=convert(source.stdout,'pdf');
  assert.equal(result.error?.code,'pdf_font_not_embedded');
  assert.match(result.error.message,/Text in Pfade/);
});
