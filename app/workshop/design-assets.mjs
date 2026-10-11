import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {dirname,join,delimiter} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {artworkFragment,isArtworkResource} from '../configurator/variant-m/artwork-resource.mjs';

export const MAX_DESIGN_BYTES=15*1024*1024;
const MAX_OUTPUT=30*1024*1024;
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const worker=fileURLToPath(new URL('./design-converter.py',import.meta.url));
const localPython= fileURLToPath(new URL('../../.local-data/python',import.meta.url));
const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python',process.platform==='win32'?'python.exe':'bin/python3');
export const importEnvironment=()=>({...process.env,PYTHONPATH:[localPython,process.env.PYTHONPATH].filter(Boolean).join(delimiter)});

export function convertDesign(input){
  return new Promise((resolve,reject)=>{
    const binary=process.env.GRAVURU_PYTHON||(existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
    const child=spawn(binary,[worker],{windowsHide:true,env:importEnvironment(),stdio:['pipe','pipe','pipe']});
    let count=0,done=false;const chunks=[];
    const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(result);};
    const timer=setTimeout(()=>{child.kill();finish(Object.assign(Error('Die Designprüfung dauert zu lange. Bitte eine kleinere Datei verwenden.'),{status:422,code:'conversion_timeout'}));},45000);
    child.on('error',()=>finish(Object.assign(Error('Für den Designimport fehlt Python 3. GRAVURU_PYTHON muss auf die Python-Installation zeigen.'),{status:503,code:'converter_unavailable'})));
    child.stdout.on('data',chunk=>{count+=chunk.length;if(count>MAX_OUTPUT){child.kill();finish(Object.assign(Error('Die umgewandelte Datei ist zu groß.'),{status:413,code:'preview_limit'}));}else chunks.push(chunk);});
    child.stderr.on('data',()=>{}); // Diagnostics must not expose document content.
    child.stdin.on('error',()=>{});
    child.on('close',code=>{
      if(done)return;
      try{const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(result.error)finish(Object.assign(Error(result.error.message),{status:422,code:result.error.code}));
        else if(code!==0||typeof result.svg!=='string')throw Error();else finish(null,result);
      }catch{finish(Object.assign(Error('Die Design-Datei konnte nicht sicher gelesen werden.'),{status:422,code:'conversion_failed'}));}
    });
    child.stdin.end(JSON.stringify(input));
  });
}

/** Byte-identical originals and validated previews, addressed immutably by hash. */
export function createDesignAssetStore({filename,converter=convertDesign}){
  if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
  const db=new DatabaseSync(filename);let converting=false;
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS design_sources (sha256 TEXT PRIMARY KEY, bytes BLOB NOT NULL);
    CREATE TABLE IF NOT EXISTS design_assets (id TEXT PRIMARY KEY, source_sha256 TEXT NOT NULL REFERENCES design_sources(sha256), preview BLOB NOT NULL, metadata TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS design_source_immutable BEFORE UPDATE ON design_sources BEGIN SELECT RAISE(ABORT,'immutable source'); END;
    CREATE TRIGGER IF NOT EXISTS design_asset_immutable BEFORE UPDATE ON design_assets BEGIN SELECT RAISE(ABORT,'immutable asset'); END;
    CREATE TABLE IF NOT EXISTS material_surfaces (sha256 TEXT PRIMARY KEY, original BLOB NOT NULL, preview BLOB NOT NULL);
    CREATE TABLE IF NOT EXISTS photo_example_sources (asset_id TEXT NOT NULL REFERENCES design_assets(id), source_sha256 TEXT NOT NULL REFERENCES design_sources(sha256), PRIMARY KEY (asset_id,source_sha256));
    CREATE TRIGGER IF NOT EXISTS photo_example_source_immutable BEFORE UPDATE ON photo_example_sources BEGIN SELECT RAISE(ABORT,'immutable photo original'); END;
    CREATE TRIGGER IF NOT EXISTS material_surface_immutable BEFORE UPDATE ON material_surfaces BEGIN SELECT RAISE(ABORT,'immutable surface'); END;`);
  function row(id){if(!/^[a-f0-9]{64}$/.test(id||''))fail(404,'asset_missing','Designressource nicht gefunden.');const r=db.prepare('SELECT * FROM design_assets WHERE id=?').get(id);if(!r)fail(404,'asset_missing','Designressource nicht gefunden.');return r;}
  function get(id){return JSON.parse(row(id).metadata);}
  function resource(id){const a=get(id);return {key:'artwork-'+id,name:'Importiertes Design',category:'Vorlagen',bounds:[0,0,a.widthMm,a.heightMm],embeddedOnly:true,svgFragment:artworkFragment(id,a.widthMm,a.heightMm),artwork:a};}
  return {
    async importPhotoExample({bytes,widthMm,heightMm}){
      if(![widthMm,heightMm].every(n=>Number.isFinite(n)&&n>0&&n<=2000))fail(422,'photo_size','Ungültige Fotofeldmaße.');
      const {prepareCustomerPhoto}=await import('./customer-photo.mjs');
      const photo=await prepareCustomerPhoto(bytes),originalHash=sha256(photo.original);
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}"><image href="data:image/png;base64,${photo.preview.toString('base64')}" width="${widthMm}" height="${heightMm}" preserveAspectRatio="xMidYMid slice"/></svg>`;
      const asset=await this.import({name:'Beispielfoto.svg',bytes:Buffer.from(svg).toString('base64')});
      db.exec('BEGIN IMMEDIATE');try{
        db.prepare('INSERT OR IGNORE INTO design_sources VALUES (?,?)').run(originalHash,photo.original);
        db.prepare('INSERT OR IGNORE INTO photo_example_sources VALUES (?,?)').run(asset.assetId,originalHash);db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
      return asset;
    },
    async importMaterialSurface(bytes){
      const {prepareCustomerPhoto}=await import('./customer-photo.mjs');
      const image=await prepareCustomerPhoto(bytes),id=sha256(image.original);
      db.prepare('INSERT OR IGNORE INTO material_surfaces VALUES (?,?,?)').run(id,image.original,image.preview);
      return {sha256:id,url:'/api/workshop/material-surfaces/'+id+'.png'};
    },
    materialSurface(id,original=false){
      if(!/^[a-f0-9]{64}$/.test(id||''))fail(404,'surface_missing','Materialoberfläche fehlt.');
      const r=db.prepare('SELECT original,preview FROM material_surfaces WHERE sha256=?').get(id);
      if(!r)fail(404,'surface_missing','Materialoberfläche fehlt.');
      return Buffer.from(original?r.original:r.preview);
    },
    async import({name,bytes,page=1}){
      if(typeof name!=='string'||name.length>200||/[\x00-\x1f\\/]/.test(name)||!/\.(svg|pdf)$/i.test(name))fail(422,'file_type','Bitte eine SVG- oder PDF-Datei auswählen.');
      if(typeof bytes!=='string'||!bytes.length||bytes.length>Math.ceil(MAX_DESIGN_BYTES/3)*4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(bytes))fail(413,'file_limit','Ungültige oder zu große Datei. Höchstens 15 MB sind möglich.');
      const original=Buffer.from(bytes,'base64');if(original.length>MAX_DESIGN_BYTES)fail(413,'file_limit','Höchstens 15 MB sind möglich.');
      if(!Number.isInteger(page)||page<1||page>1000)fail(422,'page_invalid','Bitte eine gültige Seitennummer wählen.');
      if(converting)fail(409,'converter_busy','Ein Design wird gerade geprüft. Bitte kurz danach erneut versuchen.');
      converting=true;let result;const format=name.toLowerCase().endsWith('.pdf')?'pdf':'svg';
      try{result=await converter({kind:format,bytes,page});}finally{converting=false;}
      if(![result.widthMm,result.heightMm].every(v=>Number.isFinite(v)&&v>0&&v<=2000)||!Number.isInteger(result.pageCount)||result.page!==page)fail(422,'invalid_conversion','Die Abmessungen oder Seiten der Datei sind ungültig.');
      const sourceSha256=sha256(original),preview=Buffer.from(result.svg,'utf8'),previewSha256=sha256(preview),assetId=sha256([sourceSha256,previewSha256,page].join(':'));
      if(preview.length>MAX_OUTPUT)fail(413,'preview_limit','Die umgewandelte Datei ist zu groß.');
      const metadata={schema:'gravuru-imported-artwork/v1',assetId,sourceSha256,previewSha256,format,page,pageCount:result.pageCount,widthMm:result.widthMm,heightMm:result.heightMm,widthSource:result.widthSource,hasText:result.hasText,warnings:result.warnings||[]};
      db.exec('BEGIN IMMEDIATE');
      try{db.prepare('INSERT OR IGNORE INTO design_sources VALUES (?,?)').run(sourceSha256,original);db.prepare('INSERT OR IGNORE INTO design_assets VALUES (?,?,?,?)').run(assetId,sourceSha256,preview,JSON.stringify(metadata));db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
      return {...get(assetId),originalName:name};
    },get,resource,
    list(){return db.prepare('SELECT metadata FROM design_assets ORDER BY rowid DESC LIMIT 300').all().map(r=>JSON.parse(r.metadata));},
    read(id,original=false){const r=row(id);return Buffer.from(original?db.prepare('SELECT bytes FROM design_sources WHERE sha256=?').get(r.source_sha256).bytes:r.preview);},
    validateDocument(document){
      const surface=document.config?.materialSurface?.match(/^\/api\/workshop\/material-surfaces\/([a-f0-9]{64})\.png$/);
      if(surface&&!db.prepare('SELECT 1 FROM material_surfaces WHERE sha256=?').get(surface[1]))fail(422,'surface_missing','Die gespeicherte Materialoberfläche fehlt.');
      for(const example of document.config?.localResources?.photoExamples||[]){
        const asset=get(example.assetId);
        if(asset.format!=='svg')fail(422,'asset_mismatch','Beispielfoto muss als geprüfte SVG-Vorschau vorliegen.');
      }
      for(const d of document.config?.profile?.designs||[])for(const o of d.objects||[])if(o.photoMaskAssetId&&get(o.photoMaskAssetId).format!=='svg')fail(422,'mask_missing','Original-Fotomaske fehlt.');
      const motifs=document.config?.localResources?.motifs||[];
      for(const item of motifs)if(item.artwork){const expected=resource(item.artwork.assetId);if(!isArtworkResource(item)||JSON.stringify(item.artwork)!==JSON.stringify(expected.artwork))fail(422,'asset_mismatch','Die Originaldatei des importierten Designs fehlt oder wurde verändert.');}
      for(const design of document.config?.profile?.designs||[])if(design.importedSource){
        const item=motifs.find(m=>m.artwork?.assetId===design.importedSource.assetId);
        if(!item||!design.objects.some(o=>o.motif===item.key&&o.locked===true&&o.customerEditable===false))fail(422,'asset_mismatch','Die Zuordnung zum importierten Design ist unvollständig.');
      }
      for(const design of document.config?.profile?.designs||[])if(design.editableSource)get(design.editableSource.assetId);
      return document;
    },close:()=>db.close()
  };
}
