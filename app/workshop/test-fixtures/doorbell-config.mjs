// Synthetic mechanics fixture; no live product IDs and no claimed source drawing.
export function doorbellFixture(){
 const frame=(key,x,y,width,height)=>({key,name:key,acrylic:{x,y,width,height,thicknessMm:3}});
 const formats=[['16x28',160,280,4999],['24x20',240,200,5999],['35x18',350,180,6999]].map(([key,width,height,basePriceCents])=>{
  const bell=width<height?{x:54,y:116,width:51,height:136}:{x:width-60,y:(height-136)/2,width:51,height:136};
  const x=bell.x+12,y=bell.y+24;
  const holes=[{x:5,y:5},{x:width-5,y:5},{x:width-5,y:height-5},{x:5,y:height-5}];
  const profile={
   geometry:{width,height,shape:'rect',safeMarginMm:0,holes:[],steelThicknessMm:1.5,acrylicThicknessMm:3,bell,bellImageBounds:{...bell},cutPaths:['M '+x+' '+y+' L '+(x+20)+' '+y+' L '+(x+20)+' '+(y+30)+' L '+x+' '+(y+30)+' Z'],cutBoundsMm:[{x,y,width:20,height:30}],optionalCornerPaths:holes.map(h=>'M '+(h.x-2)+' '+h.y+' A 2 2 0 1 0 '+(h.x+2)+' '+h.y+' A 2 2 0 1 0 '+(h.x-2)+' '+h.y+' Z')},
   frames:[frame('FK-RUNDUM',10,10,width-20,height-20),frame('FK-VERDECKT',0,0,width,height),frame('FK-SEITLICH',10,0,width-20,height),frame('FK-OBENUNTEN',0,10,width,height-20)],
   mounting:{holeDiameterMm:4,holeCenterEdgeMm:5,holes,screwHeadPreviewDiameterMm:7,options:[['K00',0],['GWS',599],['KRA',499],['SIL',499],['B04S',369]].map(([key,surchargeCents])=>({key,name:key,surchargeCents,visibleScrews:key==='B04S'}))},
   materials:{acrylic:{thicknessMm:3,colors:[{key:'schwarz',name:'Schwarz'},{key:'anthrazit',name:'Anthrazit'}]},steel:{widthMm:width,heightMm:height,thicknessMm:1.5}},
   manufacturing:{bellImage:false,positionGuide:false,innerCuts:{color:'#ff0000',operation:'cut'},outerContour:{color:'#0000ff',operation:'reference-only'},mountingHoles:{steel:'four-corners-for-B04S',acrylic:'only-where-full-hole-inside-acrylic',separateSteelExport:true}},
   designs:[{id:'example',name:'Beispiel',marks:[],objects:[{id:'name',type:'motif',motif:'example',x:40,y:40,w:20,h:20,rotation:0,color:'#ffffff',customerEditable:true,templateOrigin:true},{id:'mark-0',type:'motif',motif:'example',x:70,y:70,w:30,h:1,rotation:0,color:'#ffffff',customerEditable:false,templateOrigin:true,uxDecoration:true}]}]
  };
  return {key,label:key+' cm',basePriceCents,profile};
 });
 const profile={...structuredClone(formats[0].profile),id:'doorbell-fixture',revision:'1',schemaVersion:1,kind:'layered-doorbell',name:'Funkklingel Fixture',defaultDesignId:'example',binding:{kind:'local-review',productId:'local-doorbell-fixture'},features:{orderEnabled:false,productionConfirmed:false,motifsAllowed:true},material:{kind:'acrylic',color:'#17191b',thicknessMm:3},processing:{profileId:'acrylic-engraving'},admin:{imageUrl:'data:image/png;base64,AA=='}};
 const value=(id,label,priceCents)=>({id,label,priceCents,currency:'EUR'});
 profile.optionGroups=[
  {id:'format',name:'Format',required:true,defaultValueId:'16x28',values:formats.map(f=>value(f.key,f.label,f.basePriceCents))},
  {id:'frame',name:'Rahmen',required:true,defaultValueId:'FK-RUNDUM',values:profile.frames.map(f=>value(f.key,f.name,0))},
  {id:'color',name:'Acrylfarbe',required:true,defaultValueId:'schwarz',values:profile.materials.acrylic.colors.map(c=>value(c.key,c.name,0))},
  {id:'mounting',name:'Befestigung',required:true,defaultValueId:'K00',values:profile.mounting.options.map(m=>value(m.key,m.name,m.surchargeCents))}
 ];
 profile.optionFields=[{id:'position',kind:'select',label:'Klingelposition',required:true,choices:[{id:'standard',label:'Standard',priceCents:0},{id:'opposite',label:'Gegenüber',priceCents:0}]}];
 return {reviewOnly:true,basePriceCents:4999,extraMotifCents:0,logo:{enabled:false},photo:{enabled:false,mode:'upload-only',includedCount:0,extraPriceCents:0},localResources:{scope:'local-review-only',fonts:{},motifs:[{key:'example',bounds:[0,0,10,10],svgFragment:'<path d="M0 0H10V10H0Z" fill="currentColor" fill-rule="nonzero"/>'}]},profile,doorbell:{schema:'gravuru-doorbell/v1',modelKey:'fixture-model',defaultFormatKey:'16x28',defaultPosition:'standard',formats}};
}

