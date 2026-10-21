export const ACRYLIC_BASES = [
  {id:'none',label:'Ohne Sockel',priceCents:0,insertionMm:0,asset:null},
  {id:'buche',label:'Massiver Holzsockel · Buche',priceCents:899,insertionMm:7,asset:'base-buche.png'},
  {id:'eiche',label:'Massiver Holzsockel · Eiche',priceCents:999,insertionMm:7,asset:'base-eiche.png'},
  {id:'nussbaum',label:'Massiver Holzsockel · Nussbaum',priceCents:1099,insertionMm:7,asset:'base-nussbaum.png'},
  {id:'klar',label:'Flacher Acrylglasständer · klar',priceCents:399,insertionMm:5,asset:'base-klar.png',flat:true},
  {id:'satiniert',label:'Flacher Acrylglasständer · satiniert',priceCents:499,insertionMm:5,asset:'base-satiniert.png',flat:true},
  {id:'holz-flach',label:'Flacher Holzständer · Nussbaumoptik',priceCents:599,insertionMm:5,asset:'base-holz-flach.png',flat:true}
];
export const ACRYLIC_SIZES={small:{width:150,height:200,basePriceCents:1499},large:{width:200,height:266.7,basePriceCents:1999}};
// Persisted with the product revision. Scene, contract and option labels consume
// this same rule; no second size-dependent surcharge belongs in a UI adapter.
export const ACRYLIC_PRICING = Object.freeze({
  schema:'gravuru-acrylic-pricing/v1',
  sizes:Object.freeze({small:1499,large:1999}),
  bases:Object.freeze(Object.fromEntries(ACRYLIC_BASES.map(base=>[base.id,base.priceCents]))),
  largeBaseExtraCents:100,
  wallCents:599
});
// Shared safe design area reserves the deepest base (7 mm) plus 3 mm clearance.
export const ACRYLIC_SAFE_AREA={left:4,right:146,top:4,bottom:190};
// Customer text may use the full glass, even the part inside a selected base.
export function acrylicTextArea(config){return {left:0,top:0,right:config.acrylic.designWidth,bottom:config.acrylic.designHeight};}
export function acrylicCoveredTextWarning(config,objects,options){
  if(!config?.acrylic)return '';
  const {base,size}=acrylicSelection(options,config.acrylic.pricing);
  if(!base.insertionMm)return '';
  const edge=config.acrylic.designHeight*(1-base.insertionMm/size.height);
  const covered=objects.some(o=>{const a=(o.rotation||0)*Math.PI/180;return o.type==='text'&&!o.uxHidden&&o.y+(Math.abs(o.w*Math.sin(a))+Math.abs(o.h*Math.cos(a)))/2>edge+.001;});
  return covered?'Hinweis: Der gewählte Sockel verdeckt einen Teil deines Textes am unteren Glasrand. Du kannst den Text nach oben verschieben oder ihn dort belassen.':'';
}
export function containAcrylicObject(o,area=ACRYLIC_SAFE_AREA){
  if(o.acrylicFixed)return o;
  const a=(o.rotation||0)*Math.PI/180;
  let w=Math.abs(o.w*Math.cos(a))+Math.abs(o.h*Math.sin(a)),h=Math.abs(o.w*Math.sin(a))+Math.abs(o.h*Math.cos(a));
  const scale=Math.min(1,(area.right-area.left)/w,(area.bottom-area.top)/h);
  if(scale<1){o.w*=scale;o.h*=scale;if(o.type==='text')o.size*=scale;w*=scale;h*=scale;}
  o.x=Math.min(area.right-w/2,Math.max(area.left+w/2,o.x));
  o.y=Math.min(area.bottom-h/2,Math.max(area.top+h/2,o.y));return o;
}
export function acrylicSelection(options={},pricing=ACRYLIC_PRICING) {
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>!['size','base','wall'].includes(key)))throw Error('Ungültige Acrylglas-Ausführung.');
  const sizeId=options.size??'small',baseId=options.base??'none',wallId=options.wall??'none';
  const size=Object.hasOwn(ACRYLIC_SIZES,sizeId)&&ACRYLIC_SIZES[sizeId],base=ACRYLIC_BASES.find(b=>b.id===baseId);
  if(!size||!base||!['none','wall'].includes(wallId))throw Error('Ungültige Acrylglas-Ausführung.');
  const prices=[...Object.keys(ACRYLIC_SIZES).map(id=>pricing?.sizes?.[id]),...ACRYLIC_BASES.map(b=>pricing?.bases?.[b.id]),pricing?.largeBaseExtraCents,pricing?.wallCents];
  if(pricing?.schema!=='gravuru-acrylic-pricing/v1'||prices.some(value=>!Number.isSafeInteger(value)||value<0)||pricing.bases.none!==0)throw Error('Ungültige Acrylglas-Centpreise.');
  const baseCents=pricing.bases[base.id]+(sizeId==='large'&&base.id!=='none'?pricing.largeBaseExtraCents:0);
  const wallCents=wallId==='wall'?pricing.wallCents:0,totalCents=pricing.sizes[sizeId]+baseCents+wallCents;
  if(!Number.isSafeInteger(totalCents))throw Error('Ungültiger Acrylglas-Gesamtpreis.');
  return {size:{...size,basePriceCents:pricing.sizes[sizeId]},base:{...base,priceCents:pricing.bases[base.id]},baseCents,wallCents,totalCents};
}
export function makeAcrylicConfig(reference,resources,sourceHash) {
  const c=structuredClone(reference),p=c.profile;
  const pricing=structuredClone(ACRYLIC_PRICING);
  c.reviewOnly=true;c.basePriceCents=pricing.sizes.small;c.extraMotifCents=0;c.logo={enabled:false};
  c.photo={enabled:true,mode:'upload-only',includedCount:1,extraPriceCents:0};
  c.acrylic={version:1,designWidth:150,designHeight:200,sourceHash,pricing,print:{side:'rear',mirror:true,process:'CMYK',white:'RDG_WHITE',cut:'CutContour',printInsertionArea:true,iccProfile:null}};
  c.localResources={scope:'local-review-only',fonts:resources.fonts,motifs:resources.motifs};
  p.id='acryl-unser-anfang';p.name='Acrylglasbild · Unser Anfang';p.revision='20260929-acryl-1';
  p.binding={kind:'local-review',productId:'local-acryl-unser-anfang'};
  p.geometry={width:150,height:200,shape:'rect',cornerRadiusMm:2,safeMarginMm:0,holes:[]};
  p.material={kind:'acrylic',color:'#f5f2eb',thicknessMm:3};p.processing={profileId:'color-print'};
  p.features={...p.features,orderEnabled:false,productionConfirmed:false};
  const value=(id,label,priceCents)=>({id,label,priceCents,currency:'EUR'});
  p.optionGroups=[
    {id:'size',name:'Größe',required:true,defaultValueId:'small',values:[value('small','15 × 20 cm',0),value('large','20 × 26,67 cm',pricing.sizes.large-pricing.sizes.small)]},
    {id:'base',name:'Sockel',required:true,defaultValueId:'none',values:ACRYLIC_BASES.map(b=>value(b.id,b.label,pricing.bases[b.id]))},
    {id:'wall',name:'Unsichtbare Wandhalterung',required:false,defaultValueId:'none',values:[value('none','Ohne Wandhalterung',0),value('wall','Mit Wandhalterung',pricing.wallCents)]}
  ];
  const common={rotation:0,templateOrigin:true,customerEditable:true};
  const text=(id,text,font,size,y,color='#731c19')=>({...common,id,type:'text',text,font,size,x:75,y,w:120,h:size*1.2,color,bold:false,fieldKey:id});
  p.designs=[{id:'acryl-unser-anfang-01',name:'Unser Anfang',category:'Liebe',collections:['Acrylglas'],marks:[],objects:[
    {...common,id:'photo-main',type:'photoSlot',x:75,y:66,w:135,h:115,photoShape:'rect',fieldKey:'photo-main',required:true,acrylicFixed:true},
    {...common,id:'photo-frame',type:'graphic',shape:'rect',filled:false,strokeWidth:.55,x:75,y:66,w:135.5,h:115.5,color:'#731c19',acrylicFixed:true},
    text('heading','U N S E R   A N F A N G','Garamond Acryl',4.5,131),
    text('names','Anna & Lukas','Freestyle Acryl',22,149),
    text('place','Am See in Hamburg','Garamond Acryl',5.4,165.5,'#25201e'),
    text('date','14.06.2020','Garamond Acryl',5.3,173,'#25201e'),
    text('slogan','Hier begann unser Wir.','Garamond Acryl',5.3,181.5,'#25201e'),
    {...common,id:'location-pin',type:'motif',motif:'acryl-pin',x:50,y:164.5,w:4.8,h:7,color:'#731c19',preserveColors:false,acrylicFixed:true},
    {...common,id:'heart',type:'motif',motif:'acryl-heart',x:75,y:187.5,w:4.8,h:4.7,color:'#731c19',preserveColors:false,acrylicFixed:true}
  ]}];
  p.designs[0].objects.find(o=>o.id==='place').x=81;
  p.defaultDesignId=p.designs[0].id;
  return c;
}
