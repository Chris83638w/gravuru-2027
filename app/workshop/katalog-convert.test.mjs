import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {openKatalog} from './katalog-source.mjs';
import {parseDesignSvg,pathBounds,katalogDesignToTemplate,formatSeries,seriesOf,assignSeries,scaleTemplate,scaleEmbeddedMotifs,templateFit,katalogFamilyToProduct,applyPriceOverrides,priceGaps} from './katalog-convert.mjs';
import {workshopResources} from './catalog.mjs';
import {resolveProduct,validateProductDesign,validateProductDocument} from './product-model.mjs';
import {installEdgeClamp} from '../configurator/variant-m/edge-clamp.mjs';
import {selectedProfile} from '../configurator/variant-m/contract.mjs';
import {localFontIds} from '../configurator/variant-m/local-pilot.mjs';
import {validateFamily,familyGaps} from './product-families.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const katalog=()=>openKatalog(FIXTURE);
const fonts=()=>workshopResources().fonts;// Laufzeitschriften der Werkstatt (Montserrat, Cinzel …)
const herz=k=>k.designs.masters.find(d=>d.id==='test-herz');

test('pathBounds: Hüllbox aus Stütz- und Kontrollpunkten, relative und absolute Befehle',()=>{
 assert.deepEqual(pathBounds('M10 10 L30 10 L30 20 Z'),[10,10,20,10]);
 assert.deepEqual(pathBounds('m10 10 l20 0 v10 h-20 z'),[10,10,20,10]);
 assert.deepEqual(pathBounds('M0 0 C0 10 10 10 10 0'),[0,0,10,10],'Kontrollpunkte zählen mit (konservativ)');
 assert.throws(()=>pathBounds('10 10'),/ohne Befehl/);
});

test('parseDesignSvg liest Lieferform 2: Textebenen mit Zeilen, Motiv-/Deko-Pfade, Fotomaske, Hilfsebene',()=>{
 const p=parseDesignSvg(herz(katalog()).svg());
 assert.equal(p.widthMm,90);assert.equal(p.heightMm,60);
 assert.deepEqual(p.layers.map(l=>[l.id,l.kind]),[['motiv-1','motiv'],['deko-1','deko'],['text-1','text'],['text-2','text'],['guide-1','guide']]);
 const t1=p.layers[2];assert.equal(t1.fieldKey,'name');assert.equal(t1.text,'Familie Muster');assert.equal(t1.font,'Montserrat');assert.equal(t1.size,9);assert.equal(t1.anchor,'middle');assert.equal(t1.x,55);assert.equal(t1.y,30);
 const t2=p.layers[3];assert.equal(t2.text,'Herzlich\nwillkommen');assert.equal(t2.lines,2);assert.equal(t2.y,50);
 assert.deepEqual(p.layers[1].bounds,[30,44,50,0.6]);assert.equal(p.layers[0].fill,'#000');
 const foto=parseDesignSvg(katalog().designs.masters.find(d=>d.id==='test-foto').svg()).layers[0];
 assert.equal(foto.kind,'foto');assert.equal(foto.shape,'circle');assert.deepEqual(foto.bounds,[4,14,32,32]);
 // Bestandsform: <text id="text-1"> und <path id="motiv-n"> direkt, Platte wird übersprungen.
 const b=parseDesignSvg(katalog().designs.bestand('test-bestand')[0].svg());
 assert.deepEqual(b.layers.map(l=>l.id),['motiv-1','motiv-2','text-1','text-2']);
 assert.throws(()=>parseDesignSvg('<svg xmlns="x" viewBox="0 0 10 10"><g id="text-1"><text font-family="A" x="1" y="1">x</text></g>'),/nicht geschlossen/);
 assert.throws(()=>parseDesignSvg('<svg viewBox="0 0 10 10"><g id="motiv-1" transform="skewX(3)"><path d="M0 0"/></g></svg>'),/Transformation „skewX“/);
 assert.match(parseDesignSvg('<svg viewBox="0 0 10 10"><g id="rand"><path d="M0 0 L1 1"/></g></svg>').notes[0],/ohne Lieferform-2-Kennung/);
});

test('Design → Vorlage: Kundenfelder aus text-Ebenen, gesperrte Motive, Rechte und Guide-Rolle',()=>{
 const k=katalog(),f=k.families.get('test-schilder'),theme=k.theme('namensschilder');
 const r=katalogDesignToTemplate(herz(k),f,theme,{fonts:fonts()});
 const t=r.template;
 assert.equal(t.id,'katalog-test-herz');assert.equal(t.name,'Herz mit Namen');assert.deepEqual(t.themes,['namensschilder','hundeschilder']);assert.equal(t.bestseller,true);
 assert.deepEqual(t.katalog,{designId:'test-herz',source:'lieferform2',plateMm:[90,60]});
 assert.deepEqual(t.objects.map(o=>[o.id,o.type]),[['motiv-1','motif'],['deko-1','motif'],['text-1','text'],['text-2','text'],['guide-1','text']]);
 const name=t.objects[2];
 assert.equal(name.fieldKey,'name');assert.equal(name.required,true,'Namensfeld ist Pflicht');assert.equal(name.customerEditable,true);assert.equal(name.font,'Montserrat');assert.equal(name.size,9);
 assert.equal(name.x,55);assert.equal(name.y,30-0.35*9,'Grundlinie → Kastenmitte');assert.ok(name.w>20&&name.h===9*1.2);
 assert.equal(name.color,'#000000','Gravur: Profiltinte statt SVG-Füllung');
 const zusatz=t.objects[3];
 assert.equal(zusatz.required,false);assert.equal(zusatz.maxLength,24);assert.equal(zusatz.maxLines,2);assert.equal(zusatz.text,'Herzlich\nwillkommen');
 assert.equal(zusatz.y,50-0.35*4+0.5*1.2*4,'zweizeilig: Mitte zwischen den Grundlinien');
 const motif=t.objects[0];
 assert.equal(motif.motif,'katalog-test-herz-motiv-1');assert.equal(motif.locked,true);assert.equal(motif.customerEditable,false);assert.deepEqual([motif.x,motif.y,motif.w,motif.h],[14,28,20,16],'Hüllbox aus Stütz- und Kontrollpunkten');
 assert.equal(t.objects[4].role,'guide');assert.equal(t.objects[4].locked,true);
 assert.deepEqual(r.rights['text-1'],{content:true,color:false,replace:false,move:true,scale:true,delete:false});
 assert.deepEqual(r.rights['text-2'],{content:true,color:false,replace:false,move:true,scale:true,delete:true});
 assert.deepEqual(r.rights['motiv-1'],{content:false,color:false,replace:false,move:false,scale:false,delete:false},'Gravur: nicht einmal Farbe');
 assert.deepEqual(r.rights['guide-1'],{content:false,color:false,replace:false,move:false,scale:false,delete:false});
 assert.equal(r.motifs.length,2);assert.equal(r.motifs[0].embeddedOnly,true);assert.deepEqual(r.motifs[0].bounds,[4,20,20,16]);
 assert.match(r.motifs[0].svgFragment,/^<path d="M14 36 L6 27 .* Z" fill="currentColor" fill-rule="nonzero"\/>$/);
 assert.deepEqual(r.fonts.sort(),['Cinzel','Montserrat']);assert.equal(r.photo,false);
 // Fotofeld → photoSlot mit Maske, Recht nur „ersetzen“.
 const foto=katalogDesignToTemplate(k.designs.masters.find(d=>d.id==='test-foto'),f,k.theme('hundeschilder'),{fonts:fonts()});
 const slot=foto.template.objects[0];
 assert.equal(slot.type,'photoSlot');assert.equal(slot.photoShape,'circle');assert.equal(slot.fieldKey,'photo-foto-1');assert.equal(slot.required,true);assert.deepEqual([slot.x,slot.y,slot.w,slot.h],[20,30,32,32]);
 assert.deepEqual(foto.rights['foto-1'],{content:false,color:false,replace:true,move:false,scale:false,delete:false});assert.equal(foto.photo,true);
 // Bestand: Plattenfläche übersprungen, erstes Namensfeld = größter Text, Zeichenlimit des Themas gilt.
 const b=katalogDesignToTemplate(k.designs.bestand('test-bestand')[0],f,theme,{fonts:fonts()});
 assert.deepEqual(b.template.objects.map(o=>o.id),['motiv-2','text-1','text-2']);assert.match(b.notes[0],/Plattenfläche/);
 assert.equal(b.template.objects[1].required,true);assert.equal(b.template.objects[2].required,false);
 assert.equal(b.template.katalog.source,'bestand');
 // Nichts erfinden: fehlende Schrift, offenes Verfahrensprofil, widersprüchliches Maß.
 assert.throws(()=>katalogDesignToTemplate(herz(k),f,theme,{fonts:{Montserrat:fonts().Montserrat}}),/Schrift fehlt: Cinzel \(Ebene „text-2“\)/);
 assert.throws(()=>katalogDesignToTemplate(herz(k),{...f,material:{...f.material,processingProfileId:null}},theme,{fonts:fonts()}),/Verfahrensprofil .* offen/);
 assert.throws(()=>katalogDesignToTemplate({...herz(k),plateMm:[100,60]},f,theme,{fonts:fonts()}),/widerspricht dem Plattenmaß/);
 assert.throws(()=>katalogDesignToTemplate({...herz(k),fields:{'text-1':{maxLength:3}}},f,theme,{fonts:fonts()}),/Mustertext „name“ – Text zu lang/);
 assert.throws(()=>katalogDesignToTemplate({...herz(k),fields:{'text-1':{farbe:1}}},f,theme,{fonts:fonts()}),/kennt „farbe“ nicht/);
});

test('Formatreihen ±1 %: Design nur in Größen seiner Reihe, alte Größe markiert',()=>{
 const k=katalog(),f=k.families.get('test-schilder');
 const series=formatSeries(f);
 assert.deepEqual(series.map(s=>[s.key,s.sizes]),[['60x40',['TS-RE-60X40','TS-RE-90X60','TS-RE-120X80']],['80x80',['TS-QU-80X80']]]);
 assert.equal(seriesOf(series,[90,60]).key,'60x40');assert.equal(seriesOf(series,[90.5,60]).key,'60x40','0,8 % Abweichung liegt in der Toleranz');
 assert.equal(seriesOf(series,[190,80]),null);assert.equal(seriesOf(series,null),null);
 const assigned=assignSeries(f,k.designs.masters);
 assert.deepEqual(assigned.map(a=>[a.design.id,a.series,a.oldSize]).sort(),[['test-alt',null,true],['test-foto','60x40',false],['test-herz','60x40',false]]);
 assert.deepEqual(assigned.find(a=>a.design.id==='test-herz').sizes,['TS-RE-60X40','TS-RE-90X60','TS-RE-120X80']);
 assert.equal(assigned.find(a=>a.design.id==='test-herz').explicitSizes,false);
 // design.json `sizes` (Corel-Bogen: grün = wählbar) gilt vor der Reihe; unbekannte Schlüssel fallen weg, leere Liste = keine Größe.
 const herzOnly={...k.designs.masters.find(d=>d.id==='test-herz'),json:{sizes:['TS-RE-90X60','TS-RE-120X80','TS-RE-999X1']}};
 const explicit=assignSeries(f,[herzOnly,{...herzOnly,id:'test-leer',json:{sizes:[]}}]);
 assert.deepEqual(explicit[0].sizes,['TS-RE-90X60','TS-RE-120X80']);assert.equal(explicit[0].explicitSizes,true);assert.equal(explicit[0].series,'60x40');
 assert.deepEqual(explicit[1].sizes,[]);assert.equal(explicit[1].oldSize,false);
});

test('Master → Zielgröße: reine Skalierung mit Schriftgröße, Bohrbild aus der Familie; passt / prüfen / passt nicht',()=>{
 const k=katalog(),f=k.families.get('test-schilder'),r=katalogDesignToTemplate(herz(k),f,k.theme('namensschilder'),{fonts:fonts()});
 const big=f.sizes.find(s=>s.key==='TS-RE-120X80'),scaled=scaleTemplate(r.template,[90,60],[120,80],fonts());
 assert.equal(scaled.katalog.scale,4/3);assert.equal(scaled.katalog.ratioDeviation,0);
 const name=scaled.objects.find(o=>o.id==='text-1');
 assert.equal(name.size,12);assert.equal(name.x,round(55*4/3));assert.equal(Math.round(name.w*1000),Math.round(r.template.objects[2].w*4/3*1000));
 const motifs=scaleEmbeddedMotifs(r.motifs,scaled.katalog.scale);
 assert.deepEqual(motifs[0].bounds,[round(4*4/3),round(20*4/3),round(20*4/3),round(16*4/3)]);assert.match(motifs[0].svgFragment,/^<path d="M 18.667 48 L 8 36 /);
 assert.deepEqual(templateFit(scaled,f,big,fonts()),{status:'passt',issues:[]});
 // Kleinere Größe: Texte unter 4 mm → prüfen; Übergroß → passt nicht (Element verlässt die Fläche).
 const small=f.sizes.find(s=>s.key==='TS-RE-60X40'),down=scaleTemplate(r.template,[90,60],[60,40],fonts());
 const fit=templateFit(down,f,small,fonts());assert.equal(fit.status,'prüfen');assert.match(fit.issues[0],/zusatz: 2.667 mm unter der Mindestgröße 3 mm/);
 const wide={...r.template,objects:r.template.objects.map(o=>o.id==='text-1'?{...o,size:40}:o)};
 const bad=templateFit(scaleTemplate(wide,[90,60],[90,60],fonts()),f,f.sizes[0],fonts());assert.equal(bad.status,'passt nicht');assert.match(bad.issues[0],/name: Element ragt über die Gestaltungsfläche hinaus/);
 // Eingepasst (Reihe ±1 %) → prüfen mit Hinweis; andere Reihe → Fehler.
 const fitted=scaleTemplate(r.template,[90.5,60],[120,80],fonts());assert.ok(fitted.katalog.ratioDeviation>0);assert.match(templateFit(fitted,f,big,fonts()).issues[0],/Seitenverhältnis weicht/);
 assert.throws(()=>scaleTemplate(r.template,[90,60],[80,80],fonts()),/gehört nicht zur Formatreihe/);
 // Bohrbild wird nicht skaliert: das Produkt rechnet es aus der Regel der Familie.
 const product=katalogFamilyToProduct(f,k.lines.get('test-linie'),k.lines.get('test-linie').subcategories[0],{size:big,fonts:fonts(),templates:[{template:scaled,motifs,rights:r.rights}]});
 assert.deepEqual(product.document.config.profile.optionGroups[0].values.find(v=>v.id==='B02').holes,[{x:6,y:40,diameter:4},{x:114,y:40,diameter:4}]);
});
const round=v=>Math.round(v*1000)/1000;

test('Familie → Produkt: Preise in Cent mit Überschreibung, Thema, Rechte, Vorlagen; offener Preis blockiert',()=>{
 const k=katalog(),f=k.families.get('test-schilder'),line=k.lines.get('test-linie'),[namen,hunde]=line.subcategories;
 assert.deepEqual(priceGaps(f,f.sizes[2]),['Preis offen: 6 × 4 cm']);
 const over=applyPriceOverrides(f,namen);assert.equal(over.sizes[0].baseCents,1199);assert.equal(over.mountingRules[1].priceCents,199);assert.equal(f.sizes[0].baseCents,1099,'Familie selbst bleibt unverändert');
 assert.throws(()=>applyPriceOverrides(f,{id:'x',priceOverrides:{sizes:{FREMD:1}}}),/unbekannte Größe „FREMD“/);
 const size=f.sizes[0],r=katalogDesignToTemplate(herz(k),f,k.theme('namensschilder'),{fonts:fonts()});
 const scaled=scaleTemplate(r.template,[90,60],[90,60],fonts());
 const p=katalogFamilyToProduct(f,line,namen,{size,theme:k.theme('namensschilder'),fontSet:{...k.fontSet(namen),available:['Cinzel','Montserrat']},fontProfileId:'prf_test',fonts:fonts(),templates:[{template:scaled,motifs:r.motifs,rights:r.rights}],revision:3});
 const d=p.document,c=d.config,pr=c.profile;
 assert.equal(d.name,'Test Linie – Namensschilder · Rechteck 9 × 6 cm');
 assert.equal(c.basePriceCents,1199,'Preis der Unterkategorie');assert.deepEqual(pr.optionGroups[0].values.map(v=>[v.id,v.priceCents]),[['K00',0],['KGL',299],['B02',199]]);
 assert.equal(pr.id,'katalog-test-linie-namensschilder-ts-re-90x60');assert.equal(pr.binding.productId,'local-katalog-test-linie-namensschilder-ts-re-90x60');assert.equal(pr.revision,'family-test-schilder-r3');
 assert.equal(pr.themeId,'namensschilder');assert.equal(pr.processing.profileId,'steel-engraving');assert.equal(pr.features.orderEnabled,false);
 assert.deepEqual(pr.designs.map(x=>x.id),['katalog-test-herz']);assert.equal(pr.defaultDesignId,'katalog-test-herz');
 assert.deepEqual(d.categoryIds,['familie-test-schilder','form-re','linie-test-linie','unterkategorie-test-linie-namensschilder','thema-namensschilder']);
 assert.deepEqual(d.profileAssignments.fonts,{mode:'override',profileId:'prf_test'});
 assert.deepEqual(Object.keys(c.localResources.fonts).sort(),['Cinzel','Montserrat'],'nur Vorlagenschriften eingebettet, das Set kommt als Profil');
 assert.deepEqual(p.fontsMissing,['Michroma','Lato']);
 assert.equal(c.localResources.motifs.length,2);assert.equal(c.photo.enabled,false);
 assert.deepEqual(d.elementRights['katalog-test-herz']['motiv-1'],{content:false,color:false,replace:false,move:false,scale:false,delete:false});
 assert.deepEqual(d.elementRights['katalog-test-herz']['text-1'].content,true);
 assert.equal(localFontIds(c).length,2);
 // Das Produkt ist über den Vertrag nutzbar: Preis, Pflichtfeld, gesperrtes Motiv.
 const resolved=resolveProduct(d,{options:{mounting:'B02'}});assert.equal(resolved.price.unitCents,1398);assert.equal(resolved.physical.widthMm,90);
 const design=structuredClone(resolved.design);
 assert.throws(()=>validateProductDesign(d,design,{options:{mounting:'B02'}}),/Bitte das Feld „Name“ ausfüllen/);
 design.objects[2].text='Familie Koch';validateProductDesign(d,design,{options:{mounting:'B02'}});
 design.objects[0].x+=5;assert.throws(()=>validateProductDesign(d,{...design},{options:{mounting:'B02'}}),/darf nicht verändert werden/);
 // Offener Preis blockiert, auch wenn die Größe angeboten wird; nicht angebotene Größe ebenso.
 assert.throws(()=>katalogFamilyToProduct(f,line,hunde,{size:f.sizes[2],fonts:fonts()}),/Preis offen: 6 × 4 cm$/);
 assert.throws(()=>katalogFamilyToProduct(f,line,hunde,{size:f.sizes[1],fonts:fonts()}),/wird in „Hundeschilder“ nicht angeboten/);
 assert.throws(()=>katalogFamilyToProduct(f,line,namen,{size,fonts:fonts(),templates:[{template:{...scaled,objects:scaled.objects.map(o=>o.id==='text-1'?{...o,font:'Lato'}:o)},motifs:r.motifs,rights:r.rights}]}),/Schrift fehlt: Lato/);
 // Fotovorlage schaltet die Fotofunktion ein; ohne Vorlagen bleibt das Startdesign der Familie.
 const foto=katalogDesignToTemplate(k.designs.masters.find(x=>x.id==='test-foto'),f,null,{fonts:fonts()});
 const withPhoto=katalogFamilyToProduct(f,line,hunde,{size,fonts:fonts(),templates:[{template:scaleTemplate(foto.template,[90,60],[90,60],fonts()),motifs:[],rights:foto.rights}]});
 assert.equal(withPhoto.document.config.photo.enabled,true);assert.equal(withPhoto.document.config.profile.designs[0].objects[0].type,'photoSlot');
 const plain=katalogFamilyToProduct(f,line,hunde,{size,fonts:fonts()});assert.deepEqual(plain.document.config.profile.designs.map(x=>x.id),['start']);assert.equal(plain.document.profileAssignments.fonts.mode,'inherit');
});

test('Gedenktafel 22 × 14 (20.10.2026): movable verschiebt alle Elemente, Fotofeld mit Platzhalterbild, Startdesign zuerst',()=>{
 const k=katalog(),f=k.families.get('test-schilder'),line=k.lines.get('test-linie'),[namen]=line.subcategories,size=f.sizes[0];
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 90 60" width="90mm" height="60mm"><rect id="platte" width="90" height="60" fill="none"/>`
  +`<g id="foto-1" class="foto" data-platzhalter="ja" data-gravur="nein"><rect x="5" y="10" width="30" height="40" fill="none"/><image x="5" y="10" width="30" height="40" preserveAspectRatio="none" xlink:href="foto-1.png"/></g>`
  +`<g id="motiv-1"><path d="M50 10 L60 10 L60 20 Z" fill="#b3b3b3"/><path d="M62 10 L70 10 L70 18 Z" fill="#b3b3b3"/></g>`
  +`<text id="text-1" x="65" y="40" font-family="Montserrat" font-size="8" fill="#b3b3b3" text-anchor="middle"><tspan x="65" dy="0">Bello</tspan></text></svg>`;
 const design=(id,movable)=>({id,name:id,source:'lieferform2',plateMm:[90,60],themes:['namensschilder'],json:{movable},svg:()=>svg});
 const r=katalogDesignToTemplate(design('pdf-a',true),f,k.theme('namensschilder'),{fonts:fonts()});
 assert.deepEqual(r.placeholders,[{slotId:'foto-1',file:'foto-1.png',widthMm:30,heightMm:40}]);
 assert.equal(r.rights['foto-1'].move,true);assert.equal(r.rights['foto-1'].replace,true);assert.equal(r.rights['foto-1'].scale,false);
 assert.equal(r.rights['motiv-1'].move,true);assert.equal(r.rights['motiv-1'].scale,true,'Ecken-Pfeile für verschiebbare Motive');const motif=r.template.objects.find(o=>o.type==='motif');assert.equal(motif.locked,undefined);assert.equal(motif.customerEditable,true);
 assert.equal(r.rights['text-1'].move,true);
 // Ohne movable bleibt alles wie bisher: Motiv gesperrt, Foto fest.
 const fixed=katalogDesignToTemplate(design('pdf-b',false),f,k.theme('namensschilder'),{fonts:fonts()});
 assert.equal(fixed.rights['foto-1'].move,false);assert.equal(fixed.rights['motiv-1'].move,false);assert.equal(fixed.rights['motiv-1'].scale,false);assert.equal(fixed.template.objects.find(o=>o.type==='motif').locked,true);
 // Startdesign der Unterkategorie steht vorn; Platzhalter wird Beispielfoto ohne eigenen Hinweis.
 const t=(res,examples)=>({template:scaleTemplate(res.template,[90,60],[90,60],fonts()),motifs:res.motifs,rights:res.rights,examples});
 const asset='a'.repeat(64),sub={...namen,startDesign:'pdf-a'};
 const p=katalogFamilyToProduct(f,line,sub,{size,fonts:fonts(),templates:[t(fixed),t(r,[{slotId:'foto-1',assetId:asset}])]});
 const c=p.document.config;assert.deepEqual(c.profile.designs.map(d=>d.id),['katalog-pdf-a','katalog-pdf-b']);assert.equal(c.profile.defaultDesignId,'katalog-pdf-a');
 assert.deepEqual(c.localResources.photoExamples,[{designId:'katalog-pdf-a',slotId:'foto-1',assetId:asset}]);
 assert.deepEqual(c.photo.hints,[{designId:'katalog-pdf-a',slotId:'foto-1',text:'Foto-Upload hier klicken',enabled:false}]);
 assert.throws(()=>katalogFamilyToProduct(f,line,{...namen,startDesign:'fehlt'},{size,fonts:fonts(),templates:[t(fixed)]}),/Startdesign „fehlt“/);
 // Ohne Fotopreis der Familie bleibt die bisherige Vorgabe; mit Fotopreis: 1. Foto inklusive, weiteres 8,99 €.
 assert.equal(c.photo.includedCount,0);assert.equal(c.photo.extraPriceCents,0);
 const priced={...f,photo:{includedCount:1,extraPriceCents:899}};
 const q=katalogFamilyToProduct(priced,line,sub,{size,fonts:fonts(),templates:[t(r,[{slotId:'foto-1',assetId:asset}])]}).document.config.photo;
 assert.equal(q.enabled,true);assert.equal(q.includedCount,1);assert.equal(q.extraPriceCents,899);
 assert.throws(()=>validateFamily({...f,photo:{includedCount:5,extraPriceCents:899}}),/Fotopreis/);
 assert.throws(()=>validateFamily({...f,photo:{includedCount:1,extraPriceCents:899,preis:1}}),/unbekannte Felder/);
 assert.ok(familyGaps({...f,photo:{includedCount:1,extraPriceCents:null}}).includes('Aufpreis weiteres Foto'));
});

function withContourGroup(family){
 const {_file,_material,...data}=family,f=structuredClone(data);
 f.groups.push({key:'RT',name:'Kontur (Fixture)',shape:'contour',cornerRadiusMm:0});
 f.mountingRules.push({id:'B02-KONTUR-D4',label:'Feste Bohrungen',layout:'left-right',count:2,diameterMm:4,edgeMm:null,priceCents:249,skuSuffix:'B02'});
 f.sizes.push({key:'TS-RT-90X60',groupKey:'RT',label:'Kontur 9 × 6 cm',widthMm:90,heightMm:60,baseCents:null,mounting:['B02-KONTUR-D4'],outlinePath:'M0 30L45 0L90 30L45 60Z',holesMm:[{x:6,y:30,diameterMm:4},{x:84,y:30,diameterMm:4}]});
 return validateFamily(f);
}
test('mixed contour family leaves existing rectangular products unchanged',()=>{
 const k=katalog(),original=k.families.get('test-schilder'),f=withContourGroup(original),line=k.lines.get('test-linie'),sub=line.subcategories[0];
 const before=katalogFamilyToProduct(original,line,sub,{size:original.sizes[0],fonts:fonts()});
 const after=katalogFamilyToProduct(f,line,sub,{size:f.sizes[0],fonts:fonts()});
 assert.deepEqual(after,before,'unselected contour group and its open price do not block or change a rectangle');
 assert.ok(!familyGaps(f).some(g=>g.includes('im Konfigurator')),'contour support is connected; only its price stays open');
});
test('contour conversion preserves open prices and requires an available source start design',()=>{
 const k=katalog(),f=withContourGroup(k.families.get('test-schilder')),line=k.lines.get('test-linie'),size=f.sizes.at(-1),sub={...line.subcategories[0],startDesign:'nicht-vorhanden'};
 const r=katalogDesignToTemplate(herz(k),f,k.theme('namensschilder'),{fonts:fonts()});
 assert.throws(()=>katalogFamilyToProduct(f,line,sub,{size,fonts:fonts(),templates:[r]}),/Preis offen: Kontur/);
 size.baseCents=1499;
 assert.throws(()=>katalogFamilyToProduct(f,line,sub,{size,fonts:fonts(),templates:[r]}),/Startdesign „nicht-vorhanden“/);
 assert.throws(()=>katalogFamilyToProduct(f,line,sub,{size,fonts:fonts(),templates:[]}),/Startdesign „nicht-vorhanden“/);
 assert.throws(()=>katalogFamilyToProduct(f,line,{...sub,startDesign:undefined},{size,fonts:fonts(),templates:[]}),/Keine passende Konturvorlage/);
 assert.equal(size.outlinePath,'M0 30L45 0L90 30L45 60Z','rejection preserves source contour');
});

test('contour templateFit respects the physical contour and never changes source geometry',()=>{
 const k=katalog(),f=withContourGroup(k.families.get('test-schilder')),size=f.sizes.at(-1),before=JSON.stringify(f);
 // This corner lies outside the diamond, but within its bounding rectangle.
 const template={objects:[{id:'corner',type:'motif',motif:'test',x:5,y:5,w:4,h:4,rotation:0}]};
 assert.equal(templateFit(template,f,size,fonts()).status,'passt nicht');
 const outside={objects:[{...template.objects[0],x:100}]};
 assert.equal(templateFit(outside,f,size,fonts()).status,'passt nicht');
 assert.equal(JSON.stringify(f),before,'stored path and holes stay untouched while fitting the actual contour');
});

test('proportional contour fitting centres objects without translating motif resource viewboxes twice',()=>{
 const template={id:'retro-resource',objects:[{id:'motif',type:'motif',motif:'source',x:20,y:25,w:10,h:8}]};
 const resource={key:'source',bounds:[15,21,10,8],svgFragment:'<path d="M15 21L25 21L25 29L15 29Z"/>'};
 const scaled=scaleTemplate(template,[90.6,61.3],[90,60],fonts(),{contain:true}),factor=60/61.3;
 const [motif]=scaleEmbeddedMotifs([resource],factor),o=scaled.objects[0];
 assert.equal(scaled.katalog.scale,factor);
 assert.deepEqual(scaled.katalog.offsetMm,[round((90-90.6*factor)/2),0]);
 assert.equal(o.x,round(20*factor+(90-90.6*factor)/2));assert.equal(o.y,round(25*factor));
 assert.deepEqual(motif.bounds,resource.bounds.map(v=>round(v*factor)));
 assert.deepEqual(pathBounds(/d="([^"]*)"/.exec(motif.svgFragment)[1]).map(round),motif.bounds);
 assert.equal(o.w,motif.bounds[2]);assert.equal(o.h,motif.bounds[3]);
 assert.deepEqual(resource.bounds,[15,21,10,8]);assert.equal(template.objects[0].x,20);
});

test('Große Motivpfade behalten Bogenflags, Winkel und Koordinaten über Tokenblockgrenzen',()=>{
 const repeated=Array.from({length:1200},()=> 'l1.5,-2.25').join(''),source='<path d="M.25 1.5A2 3 45 0 1 4 5'+repeated+'z" fill="currentColor"/>';
 const motifs=[{key:'large',bounds:[0.25,1.5,4,5],svgFragment:source,embeddedOnly:true}];
 const scaled=scaleEmbeddedMotifs(motifs,2);
 assert.equal(scaled[0].svgFragment,'<path d="M 0.5 3 A 4 6 45 0 1 8 10 '+Array.from({length:1200},()=> 'l 3 -4.5').join(' ')+' z" fill="currentColor"/>');
 assert.deepEqual(scaled[0].bounds,[0.5,3,8,10]);assert.equal(motifs[0].svgFragment,source,'Masterpfad unverändert');
 assert.equal(scaleEmbeddedMotifs([{key:'empty',bounds:[0,0,0,0],svgFragment:'<path d=""/>'}],1)[0].svgFragment,'<path d=""/>');
});


test('path-accurate imported motifs pass template, product and customer validation without changing the initial layout',()=>{
 const k=katalog(),line=k.lines.get('test-linie'),theme=k.theme('namensschilder');
 for(const shape of ['ellipse','contour']){
  const f=withContourGroup(k.families.get('test-schilder'));f.designArea.marginMm=.2;
  const size=shape==='contour'?f.sizes.at(-1):f.sizes[0];size.baseCents=1499;
  if(shape==='ellipse')f.groups.find(g=>g.key===size.groupKey).shape='ellipse';
  const master={id:'path-precise',name:'Original path motif',source:'lieferform2',plateMm:[90,60],themes:['namensschilder'],json:{movable:true},svg:()=>'<svg viewBox="0 0 90 60" width="90mm" height="60mm"><g id="motiv-1"><path d="M45 5L75 30L45 55L15 30Z" fill="#000"/></g></svg>'};
  const r=katalogDesignToTemplate(master,f,theme,{fonts:fonts()}),template=scaleTemplate(r.template,[90,60],[90,60],fonts()),motifs=scaleEmbeddedMotifs(r.motifs,template.katalog.scale);
  const before=structuredClone({template,motifs});
  assert.equal(templateFit(template,f,size,fonts()).status,'passt nicht');
  assert.equal(templateFit(template,f,size,fonts(),{motifs}).status,'passt');
  const sub={...line.subcategories[0],startDesign:master.id};delete sub.sizesOffered;
  const product=katalogFamilyToProduct(f,line,sub,{size,fonts:fonts(),templates:[{...r,template,motifs}]}).document;
  assert.doesNotThrow(()=>validateProductDocument(product));
  const config=product.config,design=config.profile.designs[0];
  assert.doesNotThrow(()=>validateProductDesign(product,design,{fonts:fonts(),template:true}));
  const el={state:{designId:design.id,width:90,height:60,objects:structuredClone(design.objects)},uxProfileGeometry:()=>selectedProfile(config).geometry,render(){}};
  installEdgeClamp(el,{profile:config.profile,motifs:config.localResources.motifs});el.render();
  assert.deepEqual(el.state.objects,design.objects,'initial editor render preserves imported coordinates');
  assert.deepEqual({template,motifs},before,'validation does not shrink bounds or adjust source objects');
  const outside=structuredClone(product);outside.config.profile.designs[0].objects[0].x+=100;
  assert.throws(()=>validateProductDocument(outside),/Gestaltungsfläche/);
 }
});
