// Lokaler Bau der Eingaben für sg-plaene.mjs aus dem v9-Transport (Commit b2a0a19d / fc3780e), nichts wird verändert.
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import crypto from 'node:crypto';
const T=process.argv[2],OUT=process.argv[3];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const canonical=v=>Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const csha=v=>sha(JSON.stringify(canonical(v)));
const ORDNER=['Tuerschild-Acrylglas-3mm-5x2_v2','Tuerschild-Acrylglas-3mm-6x2_v2','Tuerschild-Acrylglas-3mm-8x2_v2','Tuerschild-Edelstahl-5x2_v1','Tuerschild-Edelstahl-6x2_v1','Tuerschild-Edelstahl-8x2_v1'];
const pinsBytes=fs.readFileSync(path.join(T,'motif-profile-pins.json')),pins=JSON.parse(pinsBytes).profiles[0];
const teile=[],gruppen=[];let offset=0,modul=null;
for(const o of ORDNER){
 const d=path.join(T,o),gz=fs.readFileSync(path.join(d,'source-document.json.gz')),roh=zlib.gunzipSync(gz);
 const pair=JSON.parse(fs.readFileSync(path.join(d,'pair.json'),'utf8')),tpl=JSON.parse(fs.readFileSync(path.join(d,'template.json'),'utf8')),plan=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d,'plan.json.gz'))));
 const doc=JSON.parse(roh),p=plan.products[0],t=tpl.document.targets[0],prof=p.document.config.profile;
 if(plan.requestedProducts.length!==1||plan.products.length!==1||tpl.document.targets.length!==1)throw Error('Unerwartete Form: '+o);
 modul??={id:p.moduleProfile.id,revision:p.moduleProfile.revision,name:p.moduleProfile.name,modules:p.moduleProfile.modules,sha256:p.moduleProfile.sha256};
 if(csha({name:modul.name,modules:modul.modules})!==modul.sha256||p.moduleProfile.sha256!==modul.sha256)throw Error('Modulprofil-Hash: '+o);
 gruppen.push({ordner:o,workbook:pair.workbook,excelSha256:pair.excelSha256,dokument:{offset,bytes:roh.length,sha256:sha(roh),gzSha256:sha(gz),kanonischSha256:csha(doc)},quelleName:doc.name,
  motivprofilVerweis:doc.profileAssignments?.motifs??null,
  v9:{quelle:pair.source,vorlage:pair.template,planId:pair.planId,planHash:pair.planHash,scope:tpl.document.scope,vorlagenName:tpl.document.name},
  produkt:{key:plan.requestedProducts[0].key,name:plan.requestedProducts[0].name},
  erwartet:{kombinationen:p.combinationCount,variantReview:p.variantReview.length,variantReviewSha256:csha(p.variantReview),optionen:p.options,preis:p.price,
   zielInhaltSha256:csha({material:t.material,optionGroups:t.optionGroups,optionFields:t.optionFields}),optionGroupsSha256:csha(p.optionGroups),
   designs:prof.designs.length,designIdsSha256:csha(prof.designs.map(x=>x.id)),defaultDesignId:prof.defaultDesignId,themeId:prof.themeId,
   foto:p.document.config.photo?.enabled??null,logo:p.document.config.logo?.enabled??null,module:p.document.config.moduleProfile?.modules??null,
   kompiliertOhneKennungenSha256:csha({...p.document,profileAssignments:{...p.document.profileAssignments,motifs:{...p.document.profileAssignments.motifs,profileId:null}},config:{...p.document.config,moduleProfile:{...p.document.config.moduleProfile,id:null}}}),fingerprint:p.fingerprint,creationKey:plan.creationKey}});
 teile.push(roh);offset+=roh.length;
}
const alle=Buffer.concat(teile);
const br=zlib.brotliCompressSync(alle,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:Number(process.env.Q||9),[zlib.constants.BROTLI_PARAM_LGWIN]:30,[zlib.constants.BROTLI_PARAM_LARGE_WINDOW]:1,[zlib.constants.BROTLI_PARAM_SIZE_HINT]:alle.length}});
const TEIL=3_400_000,namen=[];
for(let i=0,n=1;i<br.length;i+=TEIL,n++){const name='sg-dokumente.br.teil'+String(n).padStart(2,'0');fs.writeFileSync(path.join(OUT,name),br.subarray(i,i+TEIL));namen.push({name,bytes:Math.min(TEIL,br.length-i),sha256:sha(br.subarray(i,i+TEIL))});}
const eingaben={schema:'gravuru-sechsgruppen-eingaben/v1',quelle:{repoCommit:'b2a0a19d00e2465bf4fafe523d0a7d63c412d0a9',transport:'docs/reviews/2026-11-11-issue230-native-plans-v9/transport',manifestSha256:sha(fs.readFileSync(path.join(T,'manifest.json'))),excelCommit:'bf8824c80347f63ffeb2c05cc9a34a9ffed6f9bd'},
 modulprofil:{...modul,actor:'Astra recording explicit upload decision, 11.11.2026'},
 motivprofil:{id:pins.profile_id,revision:pins.revision,name:pins.document.name,type:pins.document.type,items:pins.document.items,documentSha256:pins.documentSha256,pinsDateiSha256:sha(pinsBytes)},
 dokumente:{bytes:alle.length,sha256:sha(alle),brBytes:br.length,brSha256:sha(br),teile:namen},gruppen};
fs.writeFileSync(path.join(OUT,'sg-eingaben.json'),JSON.stringify(eingaben,null,1));
console.log(JSON.stringify({manifestSha256:eingaben.quelle.manifestSha256,roh:alle.length,br:br.length,teile:namen.length,eingabenSha256:sha(fs.readFileSync(path.join(OUT,'sg-eingaben.json'))),gruppen:gruppen.map(g=>[g.ordner,g.erwartet.kombinationen,g.erwartet.designs,g.erwartet.preis.unitCents,g.erwartet.foto,g.erwartet.logo])}));
