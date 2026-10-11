import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root=path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), 'theme')); const errors=[];
const err=(k,p,m)=>errors.push(`${k}: ${p}: ${m}`);
const files=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(path.join(d,x.name)):[path.join(d,x.name)]);
const rel=p=>path.relative(root,p).replaceAll('\\','/');
const jsonFiles=files(root).filter(p=>p.endsWith('.json')); const parsed=new Map();
for(const p of jsonFiles)try{parsed.set(p,JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')))}catch(e){err('JSON',rel(p),e.message)}
const dup=(arr,key,scope)=>{const seen=new Set(); for(const x of arr??[]){const v=x?.[key]; if(v==null)continue; if(seen.has(v))err('DUPLICATE',scope,`${key}=${JSON.stringify(v)}`); seen.add(v)}};
const checkSetting=(s,scope)=>{if(s?.type==='range'){const {min,max,step,default:d}=s; if(![min,max,step].every(Number.isFinite)||step<=0||min>max)err('RANGE',scope,`invalid ${min}/${max}/${step}`); else if(d!=null&&(!Number.isFinite(d)||d<min||d>max||Math.abs((d-min)/step-Math.round((d-min)/step))>1e-8))err('RANGE',scope,`default ${d} outside bounds or off step ${step}`)} if(['select','radio'].includes(s?.type)&&'default'in s&&!s.options?.some(o=>o.value===s.default))err('OPTION',scope,`default ${JSON.stringify(s.default)} not in options`)};
const schemas={};
for(const p of files(path.join(root,'sections')).filter(p=>p.endsWith('.liquid'))){const txt=fs.readFileSync(p,'utf8'); const m=txt.match(/{%[- ]*schema[- ]*%}([\s\S]*?){%[- ]*endschema[- ]*%}/); if(!m)continue; let s; try{s=JSON.parse(m[1])}catch(e){err('SCHEMA JSON',rel(p),e.message);continue} const name=path.basename(p,'.liquid'); schemas[name]=s; const sc=rel(p); dup(s.settings,'id',sc); dup(s.blocks,'type',sc); for(const a of s.settings??[])checkSetting(a,`${sc} setting ${a.id}`); for(const b of s.blocks??[]){dup(b.settings,'id',`${sc} block ${b.type}`); for(const a of b.settings??[])checkSetting(a,`${sc} block ${b.type} setting ${a.id}`)} const ids=new Set((s.settings??[]).map(x=>x.id)); for(const [i,pr] of (s.presets??[]).entries())for(const k of Object.keys(pr.settings??{}))if(!ids.has(k))err('PRESET',sc,`preset[${i}] setting ${k} absent from section settings`)}
const sp=parsed.get(path.join(root,'config/settings_schema.json')); const globalIds=[]; if(Array.isArray(sp)){sp.forEach((g,i)=>{dup(g.settings,'id',`config/settings_schema.json group[${i}]`); for(const s of g.settings??[]){globalIds.push(s.id);checkSetting(s,`config/settings_schema.json group[${i}] setting ${s.id}`)}}); const counts={}; for(const id of globalIds)if(id)counts[id]=(counts[id]??0)+1; for(const [id,n] of Object.entries(counts))if(n>1)err('DUPLICATE','config/settings_schema.json',`${id} repeats across groups`)}
const gids=new Set(globalIds), sectionNames=new Set(files(path.join(root,'sections')).filter(p=>p.endsWith('.liquid')).map(p=>path.basename(p,'.liquid')));
function checkValue(def,v,p,w){if(def.type==='range'&&Number.isFinite(v)&&Number.isFinite(def.min)&&Number.isFinite(def.max)&&Number.isFinite(def.step)&&(v<def.min||v>def.max||def.step<=0||Math.abs((v-def.min)/def.step-Math.round((v-def.min)/def.step))>1e-8))err('CONFIG RANGE',p,`${w}=${v}, bounds ${def.min}..${def.max}, step ${def.step}`); if(['select','radio'].includes(def.type)&&!(def.options??[]).some(o=>o.value===v))err('CONFIG OPTION',p,`${w}=${JSON.stringify(v)} not allowed`)}
function checkSections(d,p){const secs=d?.sections;if(!secs||typeof secs!=='object')return;for(const [key,inst] of Object.entries(secs)){if(!inst||typeof inst!=='object')continue;const typ=inst.type;if(typ&&!sectionNames.has(typ)&&typ!=='@app')err('MISSING SECTION',p,`${key}: sections/${typ}.liquid absent`);const sc=schemas[typ]??{},defs=Object.fromEntries((sc.settings??[]).map(x=>[x.id,x]));for(const [id,v] of Object.entries(inst.settings??{})){if(!defs[id])err('UNKNOWN SETTING',p,`${key}/${typ}: ${id}`);else checkValue(defs[id],v,p,`${key}.${id}`)}const bdefs=Object.fromEntries((sc.blocks??[]).map(x=>[x.type,x]));for(const [bid,b] of Object.entries(inst.blocks??{})){if(b.type&&!bdefs[b.type]&&b.type!=='@app'&&!b.type.startsWith('shopify://apps/'))err('MISSING BLOCK',p,`${key}/${bid}: ${b.type} absent from ${typ}`);if(b.type?.startsWith('shopify://apps/')){if(!bdefs['@app'])err('APP BLOCK',p,typ+' does not allow @app blocks');continue}const sd=Object.fromEntries(((bdefs[b.type]??{}).settings??[]).map(x=>[x.id,x]));for(const [id,v] of Object.entries(b.settings??{})){if(!sd[id])err('UNKNOWN BLOCK SETTING',p,`${key}/${bid}: ${id}`);else checkValue(sd[id],v,p,`${key}/${bid}.${id}`)}}}if(Array.isArray(d.order))for(const id of d.order)if(!(id in secs))err('ORDER',p,`${id} absent from sections`)}
for(const p of jsonFiles.filter(p=>/[/\\](templates|sections)[/\\].*\.json$/.test(p)))checkSections(parsed.get(p),rel(p));
const data=parsed.get(path.join(root,'config/settings_data.json'));const cur=data?.current;if(cur&&typeof cur==='object'){for(const [id,v] of Object.entries(cur)){if(['sections','blocks'].includes(id))continue;if(!gids.has(id))err('UNKNOWN THEME SETTING','config/settings_data.json',`current.${id}`)}checkSections(cur,'config/settings_data.json current')}
const globalDefs = Object.fromEntries((sp ?? []).flatMap(group => group.settings ?? []).filter(setting => setting.id).map(setting => [setting.id, setting]));
for (const [id, value] of Object.entries(cur ?? {})) if (globalDefs[id]) checkValue(globalDefs[id], value, 'config/settings_data.json', id);
for (const [file, data] of parsed) {
  if (!/[/\\](templates|sections)[/\\].*\.json$/.test(file)) continue;
  for (const [id, section] of Object.entries(data.sections ?? {})) {
    const blocks = Object.keys(section.blocks ?? {}), order = section.block_order ?? [];
    if (blocks.length !== order.length || new Set(order).size !== order.length || order.some(key => !blocks.includes(key))) err('BLOCK ORDER', rel(file), id);
  }
}
function leafKeys(value, prefix='') { return Object.entries(value ?? {}).flatMap(([key, item]) => typeof item === 'object' && item !== null ? leafKeys(item, `${prefix}${key}.`) : [`${prefix}${key}`]); }
const expectedCustomKeys = leafKeys(parsed.get(path.join(root, 'locales/en.default.json'))?.gravuru);
for (const [file, data] of parsed) {
  if (!file.includes(`${path.sep}locales${path.sep}`) || file.endsWith('.schema.json')) continue;
  const actual = new Set(leafKeys(data.gravuru));
  for (const key of expectedCustomKeys) if (!actual.has(key)) err('MISSING CUSTOM TRANSLATION', rel(file), key);
}
console.log(`JSON files: ${jsonFiles.length}; section schemas: ${Object.keys(schemas).length}; issues: ${errors.length}`); for(const e of errors)console.log(e);
process.exitCode = errors.length ? 1 : 0;
