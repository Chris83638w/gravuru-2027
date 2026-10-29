// Local exported product documents only. No database, API, imports or live writes.
// Default is a dry-run with counts; --output creates a NEW proposal file.
import fs from 'node:fs';
import path from 'node:path';
import {customerUxPlan} from '../app/workshop/customer-ux-policy.mjs';
import {joinTemplateText} from '../app/workshop/join-template-text.mjs';
const arg=name=>{const i=process.argv.indexOf('--'+name);return i<0?null:process.argv[i+1];};
const input=arg('input'),output=arg('output');
if(!input)throw Error('Aufruf: node scripts/customer-ux-proposal.mjs --input export.json [--output neuer-vorschlag.json]');
if(output&&path.resolve(output)===path.resolve(input))throw Error('Der Originalexport darf nicht überschrieben werden.');
const source=JSON.parse(fs.readFileSync(input,'utf8')),plan=customerUxPlan(Array.isArray(source)?source:[source]);
// --join-text contains explicit {designId,ids} groups. No matching by name,
// no automatic catalog edits. An invalid join blocks the candidate.
const joinFile=arg('join-text');
if(joinFile){
 const groups=JSON.parse(fs.readFileSync(joinFile,'utf8'));if(!Array.isArray(groups))throw Error('Textgruppen müssen eine Liste sein.');
 for(const row of plan.rows.filter(row=>row.status==='ready'))try{for(const group of groups)row.document=joinTemplateText(row.document,group);}catch(error){row.status='blocked';row.reason=error.message;delete row.document;}
 plan.counts.ready=plan.rows.filter(row=>row.status==='ready').length;plan.counts.blocked=plan.rows.length-plan.counts.ready;
}
console.log(JSON.stringify({...plan,rows:plan.rows.map(({document,...row})=>row)},null,2));
if(output){fs.writeFileSync(output,JSON.stringify(plan,null,2)+'\n',{encoding:'utf8',flag:'wx'});console.log('Vorschlag gespeichert. Eine neue Produktrevision und Shopify-Preisbindung müssen vor der Bereitstellung getrennt geprüft werden.');}
else console.log('Dry-run: keine Datei und kein Produkt geändert.');
