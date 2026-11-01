// Offline editorial draft only. No Shopify API, importer, catalogue mutation or publication.
// Input is a byte-read Git snapshot: {commit,files:[{path,oid,data}]}.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {assignTargetSeries} from '../../../app/workshop/design-targets.mjs';

const input=process.argv[2],out=process.argv[3];
if(!input||!out)throw Error('Usage: node build-drafts.mjs <catalog-source.json> <output-directory>');
const source=JSON.parse(fs.readFileSync(input,'utf8'));
const familyFile=source.files.find(f=>f.path==='familien/edelstahl/steel-door-signs.json');
const lineFile=source.files.find(f=>f.path==='linien/edelstahl-tuerschilder.json');
const family=familyFile.data,line=lineFile.data;
assert.equal(family.id,'steel-door-signs');
const all=source.files.filter(f=>/^designs\/edelstahl-[^/]+\/[^/]+\/design.json$/.test(f.path));
const approved=all.filter(f=>f.data.ziele?.some(t=>t.familie===family.id&&t.freigabe?.status==='freigegeben'));
const masters=approved.map(f=>({...f.data,json:f.data,path:f.path,sourceBlob:f.oid,seriesFolder:f.path.split('/')[1]}));
// Reuse the current app's shape/size assignment. This is NOT a glyph/production fit check.
const assigned=assignTargetSeries(family,masters,{families:new Map([[family.id,family]])});
const forms={RE:['Rechteck','rechteckig'],AB:['Abgerundete Ecken','mit abgerundeten Ecken'],QU:['Quadrat','quadratisch'],OV:['Oval','oval'],EL:['Oval','oval'],R:['Rund','rund'],RT1:['Retro eckig','mit eckiger Retro-Kontur'],RT2:['Retro geschwungen','mit geschwungener Retro-Kontur']};
const norm=s=>s.normalize('NFKC').toLocaleLowerCase('de').replace(/\s+/g,' ').trim();
const de=n=>Number(n.toFixed(4)).toLocaleString('de-DE',{maximumFractionDigits:4,useGrouping:false});
const slug=s=>s.toLowerCase().replaceAll('ä','ae').replaceAll('ö','oe').replaceAll('ü','ue').replaceAll('ß','ss').replaceAll(',','-').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const html=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const money=n=>(n/100).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const pinnedSize='GR-ES-RE-80X35-T15',pinnedId='TRE-V2A-8x3,5-D4';
const pinned=masters.find(d=>d.id===pinnedId);assert(pinned,'Reserved line design must exist and be approved');
const baseCandidates=new Map(family.sizes.map(s=>[s.key,assigned.filter(a=>!a.oldSize&&a.sizes.includes(s.key)&&a.design.texts?.length&&a.design.themes?.some(t=>['namensschilder','familienschilder'].includes(t))).map(a=>a.design).sort((a,b)=>{
 const exact=d=>Math.abs(d.plateMm[0]-s.widthMm)<.01&&Math.abs(d.plateMm[1]-s.heightMm)<.01;
 return Number(exact(b))-Number(exact(a))||a.designNo-b.designNo||a.id.localeCompare(b.id,'de');
})]));
assert(baseCandidates.get(pinnedSize).some(d=>d.id===pinnedId));
// Reserve the requested design globally. Matching names are only a duplicate precheck;
// the later contact sheet must catch visual duplicates with different catalogue names.
const owners=new Map([[norm(pinned.name),pinnedSize]]),chosen=new Map([[pinnedSize,pinned]]);
function place(key,seen){
 for(const d of baseCandidates.get(key)){
  const n=norm(d.name);if(n===norm(pinned.name)||seen.has(n))continue;seen.add(n);
  const owner=owners.get(n);
  if(!owner||owner!==pinnedSize&&place(owner,seen)){owners.set(n,key);chosen.set(key,d);return true;}
 }
 return false;
}
for(const s of [...family.sizes].sort((a,b)=>baseCandidates.get(a.key).length-baseCandidates.get(b.key).length))if(s.key!==pinnedSize)place(s.key,new Set());
const currentProducts=line.subcategories.flatMap(sub=>(sub.mainProducts||[]).map(p=>({...p,subcategory:sub.id})));
const shapeCopy={
 RE:'Gerade Kanten geben Namen und kurzen Botschaften einen klaren Rahmen.',
 AB:'Die abgerundeten Ecken mit 5 mm Radius schließen die rechteckige Form weich ab.',
 QU:'Gleiche Seitenlängen bieten eine kompakte Fläche für deine persönliche Beschriftung.',
 OV:'Die ovale Außenform umschließt die Gestaltung ohne Ecken.',
 EL:'Das langgezogene Oval bietet Platz für eine Gestaltung entlang der Breite.',
 R:'Die kreisrunde Kontur setzt die Beschriftung in eine gleichmäßig gerundete Fläche.',
 RT1:'Die eckige Retro-Kontur gibt der Beschriftung eine markante Einfassung.',
 RT2:'Die geschwungene Retro-Kontur umrahmt die Beschriftung mit einem bewegten Rand.'
};
const articles=family.sizes.map(s=>{
 const [form,adjective]=forms[s.groupKey],size=s.groupKey==='R'?'Ø '+de(s.widthMm/10)+' cm':de(s.widthMm/10)+' × '+de(s.heightMm/10)+' cm';
 const mm=s.groupKey==='R'?'Ø '+de(s.widthMm)+' mm':de(s.widthMm)+' × '+de(s.heightMm)+' mm';
 const handle='tuerschild-edelstahl-'+slug(form)+'-'+slug(size.replace(' × ','x'));
 const title='Türschild Edelstahl '+size+' – '+form;
 const seoTitle=title.length+10<=60?title+' | gravuru':title;
 const seoDescription=`Edelstahl-Türschild ${size}, ${adjective}: Wunschtext gravieren lassen. Wähle Design und passende Befestigung bei gravuru.`;
 const design=chosen.get(s.key);
 const options=[{id:'K00',label:'Ohne Befestigung',priceCents:0},...s.mounting.map(id=>family.mountingRules.find(m=>m.id===id))];
 assert(options.every(Boolean),'Mounting reference missing '+s.key);
 assert(Number.isInteger(s.baseCents)&&s.baseCents>=0,'Open price '+s.key);
 const bullets=[`${form}, ${size} (${mm})`,`${de(family.material.thicknessMm)} mm starker, gebürsteter Edelstahl`,'Mit deinem Namen oder Wunschtext graviert','Befestigung passend zu diesem Format auswählbar'];
 const subtitle=`${form} · ${size} · ${de(family.material.thicknessMm)} mm Edelstahl · mit Wunschtext`;
 const section=(h,p)=>'<h2>'+html(h)+'</h2><p>'+html(p)+'</p>';
 const bodyHtml=section('Dein persönliches Türschild',`Gestalte dein Türschild aus gebürstetem Edelstahl in ${size}. ${shapeCopy[s.groupKey]}`)
  +section('Form und Maße',`${form}, Außenmaß ${mm}. Die Materialstärke beträgt ${de(family.material.thicknessMm)} mm. Prüfe vor der Bestellung den verfügbaren Platz am gewünschten Montageort.`)
  +section('Edelstahl mit Gravur','Deine Beschriftung wird auf dem gebürsteten Edelstahl graviert. Wähle einen Namen oder einen eigenen Text, der zu deinem Schild passt.')
  +section('Deine Gestaltung','Öffne den Konfigurator, wähle ein passendes Design und passe die Texte an. Prüfe Schreibweise, Anordnung und Lesbarkeit in der Vorschau.')
  +section('Befestigung wählen','Für dieses Format stehen zur Auswahl: '+options.map(m=>m.label).join('; ')+'. Wähle die Ausführung passend zu deiner Montagefläche.')
  +section('Personalisieren und bestellen','Beginne mit „Jetzt personalisieren“. Kontrolliere deine Gestaltung und die gewählte Befestigung, bevor du das Schild in den Warenkorb legst.')
  +section('Was du erhältst','Du bestellst ein personalisiertes Edelstahl-Türschild in '+size+'. Maßgeblich sind deine gespeicherte Gestaltung und die im Warenkorb ausgewählte Befestigung.')
  +section('Vor dem Befestigen','Vergleiche das Außenmaß mit dem verfügbaren Platz. Beachte die Montagehinweise der gewählten Befestigung.')
  +section('Dein Entwurf zählt','Die abgebildeten Namen zeigen eine Beispielgestaltung. Prüfe deinen eigenen Text vor dem Absenden der Bestellung sorgfältig.');
 const description=design?`${design.name}; Beispieltext: ${design.texts.map(t=>t.text.replaceAll('\n',' ')).join(' / ')}`:null;
 const imagePlan=[
  {role:'hauptbild',fileName:handle+'-front.webp',shot:'Echte Konfigurator-Vorschau dieser Größe mit dem festgelegten Startdesign, ohne Bediengriffe oder Befestigung.',altDraft:description?`Edelstahl-Türschild ${adjective}, ${size}, ${design.name}`:null,captionDraft:description?`${form} ${size}: ${description}`:null},
  {role:'materialdetail',fileName:handle+'-edelstahl-detail.webp',shot:'Freigegebenes echtes Detailbild der gebürsteten Oberfläche und der Gravur, zum Artikel passend.',altDraft:`Detail der Gravur auf gebürstetem Edelstahl am Türschild ${size}`,captionDraft:'Gebürstete Edelstahloberfläche mit gravierter Beschriftung.'},
  {role:'masse',fileName:handle+'-abmessungen.webp',shot:'Maßbild aus der tatsächlichen Kontur dieser Größe; Maßangaben '+mm+' und Stärke '+de(family.material.thicknessMm)+' mm.',altDraft:`Maße des Edelstahl-Türschilds ${adjective}: ${mm}, Stärke ${de(family.material.thicknessMm)} mm`,captionDraft:`Außenmaß ${mm}; Materialstärke ${de(family.material.thicknessMm)} mm.`}
 ].map(v=>({...v,sourceImage:null,status:'Bild noch nicht erstellt oder am Original geprüft; Textentwurf nicht hochladen'}));
 const bindings=currentProducts.filter(p=>p.sizesOffered?.includes(s.key)).map(p=>({catalogProductId:p.id,subcategory:p.subcategory,startDesign:p.startDesign,...p.externalIds}));
 return {
  sizeKey:s.key,groupKey:s.groupKey,form,dimensionsMm:{width:s.widthMm,height:s.heightMm,thickness:family.material.thicknessMm},catalogLabel:s.label,displaySize:size,
  title,subtitle,handleProposal:handle,seoTitle,seoDescription,bullets,bodyHtml,
  proposedTags:['Edelstahl-Türschilder',form,size,'personalisiert'],collectionSuggestion:'Edelstahl-Türschilder',
  sourcePriceCents:s.baseCents,mounting:options.map(m=>({sourceRuleId:m.id,skuSuffix:m.skuSuffix??'K00',label:m.label,surchargeCents:m.priceCents,totalCents:s.baseCents+m.priceCents})),
  startDesignProposal:design?{id:design.id,path:design.path,sourceBlob:design.sourceBlob,name:design.name,exampleTexts:design.texts.map(t=>t.text),sourceTargetApproved:true,selectionStatus:s.key===pinnedSize?'Strich-Design von Chris gewünscht; D4 als zuletzt vereinbarte Fassung vorgesehen':'Redaktioneller Vorschlag; Kontaktbogen und Originalvergleich offen',glyphAndProductionFitChecked:false}:null,
  approvedCandidatesBeforeGlyphFit:baseCandidates.get(s.key).length,
  designAssignmentStatus:design?'Vorschlag; keine neue Freigabe oder Bindung':'Offen: kein duplikatfreier Vorschlag aus den derzeit zugeordneten Quellen',
  existingCatalogBindings:bindings,shopifyProductId:null,sku:null,customizationId:null,
  entryContract:{familyId:family.id,sizeKey:s.key,defaultMounting:'K00',startDesignId:design?.id??null},
  imagePlan,status:'Redaktioneller Entwurf; nicht import- oder veröffentlichungsbereit'
 };
});
const uniq=(key)=>new Set(articles.map(a=>a[key])).size;
assert.equal(articles.length,family.sizes.length);
assert(articles.every(a=>a.seoTitle.length<=70&&a.seoDescription.length<=160),'SEO field review length');
for(const key of ['sizeKey','handleProposal','title','seoTitle','seoDescription'])assert.equal(uniq(key),articles.length,'Duplicate '+key);
assert.equal(new Set(articles.map(a=>[a.form,a.dimensionsMm.width,a.dimensionsMm.height].join(':'))).size,articles.length,'Duplicate customer shape/size');
const picks=articles.filter(a=>a.startDesignProposal);
assert.equal(new Set(picks.map(a=>norm(a.startDesignProposal.name))).size,picks.length,'Duplicate design name');
assert.equal(picks.filter(a=>norm(a.startDesignProposal.name)===norm(pinned.name)).length,1);
assert.equal(articles.find(a=>a.sizeKey===pinnedSize).startDesignProposal.id,pinnedId);
assert(articles.every(a=>a.shopifyProductId===null&&a.sku===null&&a.customizationId===null));
const report={catalogCommit:source.commit,appBaseline:'b3b0886',familySource:{path:familyFile.path,blob:familyFile.oid},lineSource:{path:lineFile.path,blob:lineFile.oid},
 counts:{articles:articles.length,uniqueTitles:uniq('title'),uniqueHandles:uniq('handleProposal'),uniqueMetaDescriptions:uniq('seoDescription'),sourceDesignFiles:all.length,sourceTargetApprovalFlags:approved.length,designProposals:picks.length,unassigned:articles.length-picks.length,imageSlots:articles.length*3,verifiedImages:0,existingMainProductBindings:currentProducts.length,articlesWithExistingCandidates:articles.filter(a=>a.existingCatalogBindings.length).length,pricesOpen:0,newShopifyIds:0,shopifyWrites:0},
 checks:{everySourceSizeOnce:true,customerShapeSizeUnique:true,uniqueSeoFields:true,uniqueProposedDesignNames:true,reserved80x35LineDesign:true,sourcePricesAndMountingCopied:true,noInventedIdentifiers:true,allImagesMarkedUnverified:true},
 boundaries:['Design-name deduplication is a precheck; visual duplicates with different names require contact-sheet review.','Assignment uses current app shape/size rules only; no font/glyph/production fit or browser acceptance claimed.','Source target flags are raw metadata, not live workshop, gallery or customer counts.','Existing catalogue IDs are candidates only; Shopify state and handle conflicts were not refreshed.','No new approval, catalogue mutation, app change, import, merge or live step.'],
 unassigned:articles.filter(a=>!a.startDesignProposal).map(a=>a.sizeKey),longSeoTitles:articles.filter(a=>a.seoTitle.length>60).map(a=>a.sizeKey),longMetaDescriptions:articles.filter(a=>a.seoDescription.length>160).map(a=>a.sizeKey)};
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'artikel-entwuerfe.json'),JSON.stringify({status:'DRAFT_ONLY',sourceCommit:source.commit,articles},null,2)+'\n');
fs.writeFileSync(path.join(out,'pruefung.json'),JSON.stringify(report,null,2)+'\n');
const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const rows=[['Groessenkennung','Form','Katalogbezeichnung','Exaktes Aussenmass','Titel','Untertitel','URL-Vorschlag','SEO-Titel','Meta-Beschreibung','Startdesign-Vorschlag','Designname','Grundpreis','Katalog-Altreferenzen','Status'],...articles.map(a=>[a.sizeKey,a.form,a.catalogLabel,a.displaySize,a.title,a.subtitle,a.handleProposal,a.seoTitle,a.seoDescription,a.startDesignProposal?.id,a.startDesignProposal?.name,money(a.sourcePriceCents),a.existingCatalogBindings.map(b=>b.catalogProductId).join(', '),a.designAssignmentStatus])];
fs.writeFileSync(path.join(out,'artikel-uebersicht.csv'),rows.map(r=>r.map(cell).join(';')).join('\n')+'\n');
fs.writeFileSync(path.join(out,'seo-vorschau.html'),'<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Edelstahl-Einzelartikel – Textprüfung</title><style>body{font:17px/1.5 system-ui;background:#f4f5f7;color:#252a30;margin:0;padding:24px}main{max-width:1100px;margin:auto}h1{font-size:28px}details{background:white;border:1px solid #ced2d8;border-radius:12px;margin:14px 0;padding:18px}summary{font-weight:650;cursor:pointer}h2{font-size:20px}code{overflow-wrap:anywhere}li{margin:7px 0}.note{padding:16px;border-left:4px solid #697484;background:#fff}small{color:#555}table{border-collapse:collapse}td{border:1px solid #ccc;padding:8px}</style><main><h1>80 Edelstahl-Artikel: Texte zur Prüfung</h1><p class="note">Redaktionelle Entwürfe auf Katalog '+html(source.commit.slice(0,7))+'. Kein Shopify-Import, keine Live-Änderung. Je Form und Größe ein Artikel. Bildtexte gelten erst nach Prüfung am tatsächlichen Bild. Unterschiedliche Designnamen sind noch kein Nachweis unterschiedlicher Gestaltung.</p>'+articles.map(a=>'<details'+(a.sizeKey===pinnedSize?' open':'')+'><summary>'+html(a.title)+'</summary><p><small>'+html(a.sizeKey)+' · Katalogbezeichnung: '+html(a.catalogLabel)+'</small></p><p>'+html(a.designAssignmentStatus)+'</p><p><strong>Startdesign: </strong>'+html(a.startDesignProposal?a.startDesignProposal.id+' – '+a.startDesignProposal.name:'noch offen')+'</p><p><strong>SEO-Titel: </strong>'+html(a.seoTitle)+'</p><p><strong>Meta: </strong>'+html(a.seoDescription)+'</p><p><code>/products/'+html(a.handleProposal)+'</code></p><p>'+html(a.subtitle)+'</p><ul>'+a.bullets.map(b=>'<li>'+html(b)+'</li>').join('')+'</ul>'+a.bodyHtml+'<h2>Bildplanung – noch kein geprüftes Bild</h2>'+a.imagePlan.map(i=>'<p><strong>'+html(i.role)+'</strong>: '+html(i.shot)+'<br>Alt-Entwurf: '+html(i.altDraft??'Nach Design- und Bildauswahl ergänzen')+'<br>Bildbeschreibung: '+html(i.captionDraft??'noch offen')+'</p>').join('')+'</details>').join('')+'</main></html>\n');
console.log(JSON.stringify(report,null,2));
