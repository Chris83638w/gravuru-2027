import {DatabaseSync} from 'node:sqlite';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256,importEnvironment,MAX_DESIGN_BYTES} from './design-assets.mjs';
import {tenantOption,ensureTenantColumn,tenantKey,TENANT_COLUMN} from './tenant.mjs';

const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const worker=fileURLToPath(new URL('./contour-converter.py',import.meta.url));
const error=(code,message,status=422)=>Object.assign(Error(message),{code,status});
export function convertContour(input){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.env.GRAVURU_PYTHON||(process.platform==='win32'?'python':'python3'),[worker],{env:importEnvironment(),windowsHide:true,stdio:['pipe','pipe','pipe']});
    let done=false,count=0;const chunks=[];
    const finish=(err,value)=>{if(done)return;done=true;clearTimeout(timer);err?reject(err):resolve(value);};
    const timer=setTimeout(()=>{child.kill();finish(error('contour_timeout','Die Konturprüfung dauert zu lange. Bitte die Datei vereinfachen.'));},45000);
    child.on('error',()=>finish(error('contour_unavailable','Python 3 ist für den Konturimport nicht verfügbar.',503)));
    child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});
    child.stdout.on('data',chunk=>{count+=chunk.length;if(count>4*1024*1024){child.kill();finish(error('contour_limit','Die Kontur ist zu komplex.'));}else chunks.push(chunk);});
    child.on('close',code=>{
      if(done)return;
      try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(value.error)finish(error(value.error.code,value.error.message));
        else if(code!==0)throw Error();else finish(null,value);
      }catch{finish(error('contour_failed','Die Kontur konnte nicht zuverlässig geprüft werden.'));}
    });
    child.stdin.end(JSON.stringify(input));
  });
}
function validateGeometry(g){
  if(g?.schema!=='gravuru-contour/v1'||g.unit!=='mm'||g.measurement!=='path-centerline'||
    ![g.widthMm,g.heightMm].every(n=>Number.isFinite(n)&&n>=.1&&n<=2000)||
    ![g.pageWidthMm,g.pageHeightMm].every(n=>Number.isFinite(n)&&n>0)||
    !Array.isArray(g.sourceOriginMm)||g.sourceOriginMm.length!==2||!g.sourceOriginMm.every(Number.isFinite)||
    !Array.isArray(g.contours)||g.contours.length<1||g.contours.length>128||g.holeCount!==g.contours.length-1||
    !g.contours.every((c,i)=>c.role===(i?'hole':'outer')&&typeof c.d==='string'&&c.d.length<=600000&&/^M[0-9eE+.,\sMmLlHhVvCcSsQqTtAaZz-]+$/.test(c.d))||
    !Array.isArray(g.warnings)||!g.warnings.every(w=>typeof w==='string'))fail(422,'contour_invalid','Die geprüfte Konturgeometrie ist ungültig.');
  return g;
}
export function contourSvg(g){
  validateGeometry(g);
  // Even-odd keeps all verified inner rings transparent. No source markup is embedded.
  const pad=Math.max(g.widthMm,g.heightMm)*.04;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${g.widthMm+2*pad} ${g.heightMm+2*pad}"><title>Formkontur mit ${g.holeCount} Ausschnitten</title><path d="${g.contours.map(c=>c.d+' Z').join(' ')}" fill="#e0e5e8" fill-rule="evenodd" stroke="#485660" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}
/** Independent immutable form templates in the existing private asset database. */
export function createContourStore({filename,converter=convertContour,tenantId}){
  if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
  // K13: Konturen je Mandant; die Kennung liegt im Schlüsselraum des Mandanten (tenantKey).
  const tenant=tenantOption({tenantId});
  const db=new DatabaseSync(filename);let busy=false;
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS form_contours (id TEXT PRIMARY KEY, original BLOB NOT NULL, metadata TEXT NOT NULL, ${TENANT_COLUMN});
    CREATE TRIGGER IF NOT EXISTS form_contour_immutable BEFORE UPDATE ON form_contours BEGIN SELECT RAISE(ABORT,'immutable contour'); END;`);
  ensureTenantColumn(db,'form_contours');
  function row(id){if(!/^[a-f0-9]{64}$/.test(id||''))fail(404,'contour_missing','Formkontur nicht gefunden.');const r=db.prepare('SELECT * FROM form_contours WHERE id=? AND tenant_id=?').get(id,tenant);if(!r)fail(404,'contour_missing','Formkontur nicht gefunden.');return r;}
  const get=id=>JSON.parse(row(id).metadata);
  const summary=({geometry,...rest})=>({...rest,widthMm:geometry.widthMm,heightMm:geometry.heightMm,holeCount:geometry.holeCount});
  return {
    async import({name,bytes}){
      if(typeof name!=='string'||name.length>200||/[\x00-\x1f\\/]/.test(name)||!/\.(svg|pdf)$/i.test(name))fail(422,'file_type','Bitte eine SVG- oder PDF-Konturdatei auswählen.');
      if(typeof bytes!=='string'||!bytes.length||bytes.length>Math.ceil(MAX_DESIGN_BYTES/3)*4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(bytes))fail(413,'file_limit','Ungültige oder zu große Datei. Höchstens 15 MB sind möglich.');
      const original=Buffer.from(bytes,'base64'),format=name.toLowerCase().endsWith('.pdf')?'pdf':'svg';
      if(!original.length||original.length>MAX_DESIGN_BYTES)fail(413,'file_limit','Die Konturdatei ist leer oder zu groß.');
      if(busy)fail(409,'contour_busy','Eine Kontur wird gerade geprüft. Bitte kurz warten.');
      busy=true;
      try{
        const sourceSha256=sha256(original),id=tenantKey(tenant,sha256('gravuru-contour/v1:'+format+':'+sourceSha256));
        if(db.prepare('SELECT id FROM form_contours WHERE id=? AND tenant_id=?').get(id,tenant))return {...get(id),alreadyExists:true};
        const geometry=validateGeometry(await converter({kind:format,bytes}));
        const metadata={id,name,format,sourceSha256,geometrySha256:sha256(JSON.stringify(geometry)),createdAt:new Date().toISOString(),geometry};
        db.prepare('INSERT INTO form_contours(id,original,metadata,tenant_id) VALUES(?,?,?,?)').run(id,original,JSON.stringify(metadata),tenant);
        return get(id);
      }finally{busy=false;}
    },get,tenantId:tenant,
    list:()=>db.prepare('SELECT metadata FROM form_contours WHERE tenant_id=? ORDER BY json_extract(metadata,\'$.createdAt\') DESC,id').all(tenant).map(r=>summary(JSON.parse(r.metadata))),
    original:id=>Buffer.from(row(id).original),
    preview:id=>Buffer.from(contourSvg(get(id).geometry)),
    close:()=>db.close()
  };
}
