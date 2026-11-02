import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';import fs from 'node:fs';
Object.assign(process.env,{NODE_ENV:'production'});const {getPayload}=await import('payload');const {default:config}=await import('../src/payload.config.ts');const {plates,baseGeometry}=await import('../src/lib/configuration.ts');const p=await getPayload({config});const base='http://127.0.0.1:3087';const email='workshop-test-'+randomUUID()+'@example.invalid',password=randomUUID()+randomUUID();let user:any;const ids:number[]=[];
try{
 user=await p.create({collection:'users',data:{email,password,role:'admin',name:'Temporärer Integrationstest'},overrideAccess:true});const login=await p.login({collection:'users',data:{email,password}});const auth={authorization:'JWT '+login.token,origin:base,'content-type':'application/json'};
 const call=async(path:string,body:any,authorized=true)=>fetch(base+'/werkstatt-api/'+path,{method:'POST',headers:authorized?auth:{origin:base,'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await call('templates',{name:'Nicht erlaubt',geometry:baseGeometry},false)).status,403);
 assert.equal((await fetch(base+'/werkstatt-api/session')).status,200);
 const created=await call('templates',{name:'TEST Originalfunktionen',geometry:baseGeometry});assert.equal(created.status,201);const t=await created.json();ids.push(Number(t.id));
 let list=await fetch(base+'/werkstatt-api').then(r=>r.json());assert.ok(!list.templates.some((x:any)=>x.id===t.id));
 assert.equal((await call('templates/release',{templateId:t.id,enabled:true})).status,200);
 list=await fetch(base+'/werkstatt-api').then(r=>r.json());assert.ok(list.templates.some((x:any)=>x.id===t.id));
 const derived=await call('templates',{name:'TEST Ableitung',parentId:t.id,geometry:{...baseGeometry,widthMm:320}});assert.equal(derived.status,201);ids.push(Number((await derived.json()).id));
 assert.equal((await call('templates/remove',{templateId:t.id})).status,200);list=await fetch(base+'/werkstatt-api').then(r=>r.json());assert.ok(!list.templates.some((x:any)=>x.id===t.id));assert.equal((await call('templates/restore',{templateId:t.id})).status,200);
 const layer={...baseGeometry,assembly:{reference:plates.bellReference.revision,acrylic:{x:20,y:20,width:260,height:160,shape:'rounded',cornerRadiusMm:5,thicknessMm:3,color:'anthrazit'},bell:{x:124.5,y:32}}};
 for(const layerName of ['steel','acrylic','overview']){const r=await call('preview-export',{geometry:layer,layer:layerName,format:'svg'},false);assert.equal(r.status,200);const svg=await r.text();assert.match(svg,/<svg/);assert.ok(!svg.includes('<image'));assert.ok(!svg.includes('measurement-rulers'));if(layerName==='acrylic')assert.ok(svg.includes('#FF0000'));fs.writeFileSync('work/export-'+layerName+'.svg',svg)}
 const denied=await fetch(base+'/werkstatt-api/preview-export',{method:'POST',headers:{origin:'https://untrusted.invalid','content-type':'application/json'},body:'{}'});assert.equal(denied.status,403);
 assert.equal((await call('preview-export',{geometry:{...baseGeometry,widthMm:-1},layer:'steel'},false)).status,400);
 const source='C:/Users/Mikail Erdem/Documents/Codex/2026-09-22/github-plugin-github-openai-curated-remote-4/work/werkstatt/configurator/gravuru-edelstahl-feine-maserung-vorschau.png';assert.ok(fs.readFileSync(source).equals(fs.readFileSync('public/werkstatt/edelstahl-original.png')));
 console.log('PASS: Originaltextur bytegleich, Vorlagen anlegen/ableiten/freigeben/entfernen/wiederherstellen, Kundenzugriff, drei Exportebenen mit Klingelausschnitten und ungültige Geometrie geprüft.');
}finally{for(const id of ids.reverse())await p.delete({collection:'config-templates',id,overrideAccess:true});if(user)await p.delete({collection:'users',id:user.id,overrideAccess:true});await p.destroy()}
