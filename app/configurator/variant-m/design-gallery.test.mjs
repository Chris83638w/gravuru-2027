import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {galleryOrder,productTheme,themeDefinition,orderMotifCategories,customerTexts,thumbnailSignature,thumbnailDesign,parseDirectLink,resolveLinkSize,sanitizeLinkText,applyLinkText,linkTextTarget,designLink,withoutDirectLinkParams} from './design-gallery-model.mjs';
import {motifScore} from './customer-tools-model.mjs';
import {parseThemeCatalog,findTheme} from '../../workshop/theme-catalog.mjs';

const themen=JSON.parse(fs.readFileSync(new URL('./fixtures/themen.json',import.meta.url),'utf8'));
const text=(id,fieldKey,sample,extra={})=>({id,type:'text',fieldKey,text:sample,font:'Montserrat',size:10,x:50,y:30,w:40,h:8,rotation:0,customerEditable:true,...extra});
const designs=[
 {id:'d-neu',name:'Neu ohne Thema',objects:[text('t1','name','Beispiel')]},
 {id:'d-tier-2',name:'Tier 2',themes:['tiergedenktafeln'],objects:[text('t1','name','Bello',{required:true}),text('t2','date','2010 – 2024')]},
 {id:'d-firma',name:'Firma',themes:['firmenschilder'],objects:[text('t1','heading','Praxis Muster')]},
 {id:'d-tier-best',name:'Tier Bestseller',themes:['tiergedenktafeln','namensschilder'],bestseller:true,objects:[text('t1','name','Luna')]},
 {id:'d-firma-best',name:'Firma Bestseller',themes:[{id:'Firmenschilder'}],bestseller:true,objects:[text('t1','heading','Firma')]}
];
const profile=themeId=>({id:'p',themeId,designs:structuredClone(designs),optionGroups:[{id:'size',name:'Schildgröße',defaultValueId:'GR-ES-S-200X100-T15',values:[{id:'GR-ES-S-200X100-T15',label:'200 × 100 mm',priceCents:1000},{id:'GR-ES-S-300X150-T15',label:'300 × 150 mm',priceCents:1500}]},{id:'mounting',name:'Befestigung',defaultValueId:'OHNE',values:[{id:'OHNE',priceCents:0}]}]});

test('Galerie: Designs des Produktthemas zuerst, Bestseller vorn, ohne Thema sichtbar, andere Themen unter „Weitere Designs“',()=>{
 const order=galleryOrder(designs,productTheme(profile('tiergedenktafeln')));
 assert.equal(order.theme,'tiergedenktafeln');
 assert.deepEqual(order.primary,['d-tier-best','d-neu','d-tier-2']);
 assert.deepEqual(order.more,['d-firma-best','d-firma']);
});
test('Galerie: Themen-IDs ohne Groß/Klein, Mehrfachthemen zählen, Produkt ohne Thema zeigt alle Designs ohne zweite Gruppe',()=>{
 assert.deepEqual(galleryOrder(designs,'FIRMENSCHILDER').primary,['d-firma-best','d-neu','d-firma']);
 assert.deepEqual(galleryOrder(designs,'namensschilder').primary,['d-tier-best','d-neu']);
 const none=galleryOrder(designs,productTheme(profile(undefined)));
 assert.equal(none.theme,null);assert.deepEqual(none.more,[]);
 assert.deepEqual(none.primary,['d-tier-best','d-firma-best','d-neu','d-tier-2','d-firma']);
 assert.deepEqual(galleryOrder([],'x'),{theme:'x',primary:[],more:[]});
});
test('themen.json: Fixture wird geprüft, Themen-Definition des Produkts aus config.themes, Motivkategorien des Themas zuerst',()=>{
 const themes=parseThemeCatalog(themen);
 assert.equal(themes.length,3);assert.deepEqual(findTheme(themes,'Tiergedenktafeln').motifCategories,['Tiere','Gedenken']);
 assert.equal(findTheme(themes,'unbekannt'),null);
 assert.throws(()=>parseThemeCatalog({}),/themes/);
 assert.throws(()=>parseThemeCatalog({themes:[{id:'a',name:'A'},{id:'A',name:'B'}]}),/doppelt/);
 assert.throws(()=>parseThemeCatalog({themes:[{id:'a',name:'A',motifCategories:'Tiere'}]}),/motifCategories/);
 const theme=themeDefinition({themes},profile('tiergedenktafeln'));
 assert.equal(theme.name,'Tiergedenktafeln');
 assert.equal(themeDefinition({themes:themen},profile('firmenschilder')).id,'firmenschilder');
 assert.equal(themeDefinition({themes},profile(undefined)),null);
 assert.deepEqual(orderMotifCategories(['Liebe','Gedenken','Tiere','Natur'],theme),['Tiere','Gedenken','Liebe','Natur']);
 assert.deepEqual(orderMotifCategories(['Liebe','Natur'],null),['Liebe','Natur']);
});
test('Motivsuche: Themenkategorien liegen bei gleicher Trefferqualität vorn, Nicht-Treffer bleiben 0',()=>{
 const theme={motifCategories:['Tiere']};
 assert(motifScore({name:'Pfote',category:'Tiere'},'',theme)>motifScore({name:'Anker',category:'Maritim'},'',theme));
 assert(motifScore({name:'Labrador',category:'Tiere'},'Hund',theme)>motifScore({name:'Labrador',category:'Sonstiges'},'Hund',theme));
 assert.equal(motifScore({name:'Anker',category:'Tiere'},'Katze',theme),0);
 assert.equal(motifScore({name:'Hund'},'Hund'),motifScore({name:'Hund'},'Hund',null));
});
test('Miniaturen: nur geänderte Kundentexte werden per Feldschlüssel übernommen, Original bleibt unverändert',()=>{
 const template=designs[1],objects=structuredClone(template.objects);
 assert.deepEqual(customerTexts(objects,template),[]);
 objects[0].text='Rex';objects[0].uxCustomerText=true;
 const source=customerTexts(objects,template);
 assert.deepEqual(source.map(o=>o.fieldKey),['name']);
 assert.equal(thumbnailSignature(source),JSON.stringify([['name','Rex']]));
 const measured=[];const copy=thumbnailDesign(designs[3],source,o=>measured.push(o.id));
 assert.notEqual(copy,designs[3]);assert.equal(copy.objects[0].text,'Rex');assert.equal(designs[3].objects[0].text,'Luna');assert.deepEqual(measured,['t1']);
 assert.equal(thumbnailDesign(designs[2],source),designs[2]);
 assert.equal(thumbnailDesign(designs[3],[]),designs[3]);
});
test('Direktlink: gültiges Design, Größe als SKU/ID (auch ohne Groß/Klein) und Text werden erkannt',()=>{
 const p=profile('tiergedenktafeln');
 const link=parseDirectLink('?design=d-tier-2&size=gr-es-s-300x150-t15&text=Bello',p);
 assert.equal(link.present,true);assert.equal(link.designId,'d-tier-2');assert.equal(link.sizeId,'GR-ES-S-300X150-T15');assert.equal(link.text,'Bello');assert.deepEqual(link.notes,[]);
 assert.equal(resolveLinkSize(p,'GR-ES-S-200X100-T15'),'GR-ES-S-200X100-T15');
 assert.equal(resolveLinkSize({optionGroups:[{id:'size',values:[{id:'s1',sku:'SKU-1'}]}]},'SKU-1'),'s1');
 assert.equal(parseDirectLink(new URLSearchParams('configuration=cfg_1'),p).present,false);
});
test('Direktlink: ungültiges Design oder Größe wird ignoriert und gemeldet, Text bleibt reiner Text',()=>{
 const p=profile('tiergedenktafeln');
 const link=parseDirectLink('?design=gibt-es-nicht&size=XXL&text=%3Cb%3EMax%3C%2Fb%3E%00',p);
 assert.equal(link.designId,null);assert.equal(link.sizeId,null);assert.equal(link.text,'<b>Max</b>');
 assert.equal(link.notes.length,2);assert.match(link.notes[0],/Design/);assert.match(link.notes[1],/Größe/);
 assert.equal(sanitizeLinkText('  \r\n '),null);assert.equal(sanitizeLinkText(' Anna\r\nLuis\t '),'Anna\nLuis');
 assert.equal([...sanitizeLinkText('x'.repeat(800))].length,500);
 assert.equal(parseDirectLink('?text=%20',p).notes[0],'Der verlinkte Text ist leer und wurde nicht übernommen.');
});
test('Direktlink-Text: erstes Pflichtfeld, sonst Namensfeld; Zeichen- und Zeilenlimit der Vorlage (K1) gelten',()=>{
 const p=profile('tiergedenktafeln');
 const design=p.designs.find(d=>d.id==='d-tier-2'),objects=structuredClone(design.objects);
 assert.equal(linkTextTarget(objects,design).id,'t1');
 const result=applyLinkText(objects,design,p,'Bello\nunser Freund\n2010\n2024\nfünfte Zeile');
 assert.equal(result.id,'t1');assert.equal(result.truncated,true);
 assert.equal(result.text.split('\n').length,4);assert.equal(objects[0].text,result.text);assert.equal(objects[0].uxCustomerText,true);
 const long=applyLinkText(structuredClone(design.objects),design,p,'A'.repeat(120));
 assert.equal([...long.text].length,78);
 const firma=p.designs.find(d=>d.id==='d-firma');const firmaObjects=structuredClone(firma.objects);
 assert.equal(applyLinkText(firmaObjects,firma,p,'Zahnarztpraxis Dr. Muster').text,'Zahnarztpraxis Dr. Muster');
 const noTemplate={id:'x',objects:[text('t1','slogan','Hallo'),text('t2','name','Name')]};const noObjects=structuredClone(noTemplate.objects);
 assert.equal(linkTextTarget(noObjects,noTemplate).id,'t2');
 assert.equal(applyLinkText([text('t1','name','x',{customerEditable:false})],design,p,'Max'),null);
 assert.equal(applyLinkText(structuredClone(design.objects),design,p,'   '),null);
});
test('Share-Link: enthält Design und Größe, nie den Kundentext; Parameter werden nach dem Laden entfernt',()=>{
 const href='https://shop.example/produkt?configuration=cfg_1&design=alt&text=Geheim&size=alt';
 const link=designLink(href,{designId:'d-tier-2',sizeId:'GR-ES-S-300X150-T15'});
 const url=new URL(link);
 assert.equal(url.origin+url.pathname,'https://shop.example/produkt');
 assert.equal(url.searchParams.get('configuration'),'cfg_1');assert.equal(url.searchParams.get('design'),'d-tier-2');assert.equal(url.searchParams.get('size'),'GR-ES-S-300X150-T15');
 assert.equal(url.searchParams.has('text'),false);
 assert.equal(designLink('https://shop.example/p',{designId:'d-neu'}),'https://shop.example/p?design=d-neu');
 assert.equal(withoutDirectLinkParams(link),'https://shop.example/produkt?configuration=cfg_1');
 assert.equal(withoutDirectLinkParams('https://shop.example/produkt?configuration=cfg_1'),null);
});

test('direct link uses the same versioned field and line rules as editor input',()=>{
 const p=profile('tiergedenktafeln'),d=p.designs[1];
 for(const max of [80,500]){
  const input='Name\n'+('Langer Spruch\n'.repeat(45));
  const result=applyLinkText(structuredClone(d.objects),d,p,input,{textRules:{maxCharsPerField:max}});
  assert.equal(result.text,[...sanitizeLinkText(input)].slice(0,max).join(''));
  assert.ok(result.text.split('\n').length>4,'no obsolete four-line limit');
 }
 const lines=applyLinkText(structuredClone(d.objects),d,p,'x'.repeat(60)+'\n'+'y'.repeat(60),{textRules:{maxCharsPerLine:50}});
 assert.equal(lines.text,'x'.repeat(50)+'\n'+'y'.repeat(50),'historical per-line policy stays distinct');
});
