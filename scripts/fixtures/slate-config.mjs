export function syntheticSlate(seed){
 const c=structuredClone(seed);delete c.acrylic;
 const p=c.profile,text=structuredClone(p.designs[0].objects.find(o=>o.type==='text'));
 Object.assign(text,{id:'name',text:'Test',size:5,x:110,y:30,w:20,h:8,rotation:0,customerEditable:true,acrylicFixed:false});
 p.material={kind:'slate',color:'#41494b',thicknessMm:6};p.processing={profileId:'slate-engraving'};
 p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:2,holes:[]};
 p.features={...p.features,orderEnabled:false,productionConfirmed:false};
 const motif=c.localResources.motifs.find(m=>!m.artwork&&!m.embeddedOnly);
 p.designs=[{id:'slate-test',name:'Prüfdesign',objects:[text,...(motif?[{id:'motif',type:'motif',motif:motif.key,x:110,y:85,w:50,h:40,rotation:0,color:'#ffffff',customerEditable:true}]:[])]}];
 p.defaultDesignId='slate-test';
 p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[{id:'none',label:'Ohne',priceCents:0,currency:'EUR',holes:[]}]}];
 c.basePriceCents=2299;c.extraMotifCents=169;c.photo={enabled:true,mode:'upload-only',includedCount:0,extraPriceCents:999};
 c.localResources.photoExamples=[];c.localResources.photoPlaceholders=[];
 return c;
}
