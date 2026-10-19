// Legt in der lokalen Werkstatt-DB ein synthetisches Prüfprodukt für die K14-Sichtprüfung an
// (Acryl-Seed mit Staffel, Zusatzfeldern und Rückseite). Nur lokaler Prüfstand.
import fs from 'node:fs';import path from 'node:path';
const root=process.argv[2],out=process.argv[3];
const {build}=await import(root+'/app/configurator/variant-m/build.mjs');
const {createWorkshop}=await import(root+'/app/workshop/http.mjs');
const {makeProductDocument}=await import(root+'/app/workshop/product-model.mjs');
const dir=path.join(root,'app/configurator/variant-m/.preview');
const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
const w=createWorkshop({filename:path.join(root,'.local-data/workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
const c=structuredClone(seed.universal);
c.quantityTiers=[{minQuantity:5,percentOff:10},{minQuantity:10,percentOff:15},{minQuantity:25,percentOff:20}];
c.profile.optionFields=[{id:'widmung',kind:'text',label:'Widmung auf der Grußkarte',maxLength:60,required:true},{id:'kordel',kind:'select',label:'Kordel',choices:[{id:'rot',label:'Rot',priceCents:200},{id:'natur',label:'Natur'}],visibleIf:{groupId:'base',valueIds:['none']}},{id:'termin',kind:'date',label:'Wunschtermin'},{id:'karte',kind:'checkbox',label:'Grußkarte beilegen',priceCents:250}];
c.profile.surfaces=[{id:'front'},{id:'back',priceCents:500}];
const record=w.repository.create(makeProductDocument(c,{name:'K14 Sichtprüfung · zweiseitig',kind:'product'}));
fs.writeFileSync(out,JSON.stringify({id:record.id,revision:record.revision}));
w.close();console.log(JSON.stringify({id:record.id,revision:record.revision}));
