import {prepareConfig} from '../configurator/variant-m/contract.mjs';

// Explicit review adapter for the first approved execution example, not a second catalogue.
// All drawing coordinates are supplied from konturen-und-loecher.json. No live binding.
export function memorialReviewConfig({family,drawings,templates,fonts,motifs,rights,optionImages={},spacerImages={},materialSurface,photoExamples=[]}){
 const plate=diameter=>{
  const rows=drawings.filter(d=>d.w===220&&d.h===140&&d.holes.length===6&&d.holes.every(h=>h.d===diameter));
  if(rows.length!==1)throw Error('Zeichnung 22 × 14 cm für Ø '+diameter+' mm ist nicht eindeutig.');
  return rows[0].holes.map(h=>({x:h.x,y:h.y,diameter:h.d}));
 };
 const drill=plate(4),spacers=plate(8);
 const pair=holes=>holes.filter(h=>h.y===[...new Set(holes.map(h=>h.y))].sort((a,b)=>a-b)[1]);
 const corners=holes=>holes.filter(h=>!pair(holes).includes(h));
 const value=(id,label,holes,extra={})=>({id,label,holes,currency:'EUR',priceCents:null,...extra});
 const colors=[['silver','Edelstahl'],['gold','Gold'],['bronze','Bronze'],['white','Weiß'],['black','Schwarz']];
 if(family.id!=='gedenktafel-22x14-schiefer-natur'||family.material.kind!=='slate')throw Error('Die lokale Vorschau benötigt die Familie Naturschiefer 22 × 14.');
 const profile={schemaVersion:1,kind:'universal-product',id:'review-'+family.id,name:'Gedenktafel · Naturschiefer · 22 × 14 cm',revision:'20261030-ausfuehrungen-review-1',
  binding:{kind:'local-review',productId:'review-'+family.id},
  geometry:{width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:family.designArea.marginMm,holeKeepoutMm:0,holes:[]},
  material:{kind:family.material.kind,color:'#383b3a',thicknessMm:family.material.thicknessMm},processing:{profileId:family.material.processingProfileId},features:{orderEnabled:false,productionConfirmed:false,motifsAllowed:true},
  designs:templates,defaultDesignId:templates[0].id,
  optionGroups:[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'K00',values:[
   value('K00','Ohne Befestigung',[],{priceCents:0}),value('B02','2 Bohrlöcher · Ø 4 mm',pair(drill)),value('B04','4 Bohrlöcher · Ø 4 mm',corners(drill)),
   value('B02-AH02','2 Abstandshalter',pair(spacers),{spacers:true,priceCents:590}),value('B04-AH04','4 Abstandshalter',corners(spacers),{spacers:true,priceCents:990}),value('SIL','Silikonkleber',[])
  ]},{id:'spacer-color',name:'Farbe der Abstandshalter',required:true,defaultValueId:'silver',visibleIf:{groupId:'mounting',valueIds:['B02-AH02','B04-AH04']},values:colors.map(([id,label])=>({id,label,spacerFinish:id,priceCents:id==='silver'?0:null,currency:'EUR'}))}],
  optionFields:[{id:'stand',kind:'select',label:'Acrylglasständer',required:false,choices:[{id:'clear',label:'Klar',priceCents:null},{id:'black',label:'Schwarz',priceCents:null}]},{id:'protector',kind:'checkbox',label:'Imprägnierspray',required:false,priceCents:null}]
 };
 // Chris 30.10.: long memorial sayings are allowed. Use the existing text-rule
 // format's maximum budget; do not impose the door-sign 80-character rule.
 return prepareConfig({reviewOnly:true,basePriceCents:null,extraMotifCents:null,textRules:{maxCharsPerField:500},motifCharge:'additional',photo:{enabled:true,mode:'upload-only',allowOnAllDesigns:true},logo:{enabled:false},profile,materialSurface,optionImages,spacerImages,workshopElementRights:rights,localResources:{scope:'local-review-only',fonts,motifs,photoExamples}});
}
