import {validateDesign} from './design-state.ts'
import plates from './workshop/plate-geometry.cjs'
export {plates}
export const baseGeometry={shape:'rounded',widthMm:300,heightMm:200,cornerRadiusMm:5,holeCount:4,holeDiameterMm:4,edgeMm:12}
// Sonderanfertigung (Kunde gestaltet selbst): Auswahl entspricht den Leistungsseiten und dem bisherigen Anfrageformular.
export const customMaterials=['Edelstahl','Stahl','Acrylglas','Glas','Stein','Leder','Papier / Pappe']
export const customProcesses:Record<string,string>={gravur:'Gravur',druck:'Farbdruck (UV-Direktdruck)',zuschnitt:'Zuschnitt / Kontur',biegen:'Acryl biegen'}
export const customSupply:Record<string,string>={offen:'Noch offen',gravuru:'Material soll von Gravuru bereitgestellt werden',eigenes:'Eigenes Material / vorhandene Teile'}
export const customGeometry={shape:'rect',widthMm:200,heightMm:100,cornerRadiusMm:0,holeCount:0,holeDiameterMm:4,edgeMm:8}
const text=(v:unknown,max:number)=>{if(v!=null&&typeof v!=='string')throw Error('Bitte die Angaben zur Sonderanfertigung prüfen.');const t=String(v||'').replace(/[\u0000-\u0008\u000b-\u001f]/g,' ').trim();if(t.length>max)throw Error('Bitte die Angaben zur Sonderanfertigung kürzen.');return t}
export function validateCustom(raw:any){
 if(!raw||typeof raw!=='object')throw Error('Bitte das Vorhaben der Sonderanfertigung beschreiben.')
 const processes=Array.isArray(raw.processes)?([...new Set(raw.processes)] as unknown[]).filter((x):x is string=>typeof x==='string'&&x in customProcesses):[]
 if(!processes.length)throw Error('Bitte mindestens eine Bearbeitung wählen.')
 const material=text(raw.material,120)
 if(!material)throw Error('Bitte das Material angeben oder „Noch unsicher“ wählen.')
 return {material,processes,supply:typeof raw.supply==='string'&&raw.supply in customSupply?raw.supply as string:'offen',object:text(raw.object,160),topic:text(raw.topic,160),details:text(raw.details,2000)}
}
export function customMethod(processes:string[]){return processes.includes('druck')?'druck':processes.includes('gravur')?'gravur':'zuschnitt'}
export function validateConfiguration(raw:any,{allowEmptyDesign=false}={}):any{
 if(raw?.material==='sonder')return validateCustomConfiguration(raw,allowEmptyDesign)
 if(!raw||!['edelstahl','acryl'].includes(raw.material)||!['zuschnitt','gravur','druck'].includes(raw.method))throw Error('Bitte Material und Bearbeitung wählen.')
 if(raw.method==='druck'&&raw.material==='edelstahl'&&!['weiss-matt','klar-hochglanz'].includes(raw.geometry?.assembly?.acrylic?.color))throw Error('Bitte eine bedruckbare Acrylplatte vor der Edelstahl-Grundplatte hinzufügen.')
 const geometry=plates.validate(raw.material==='acryl'?{...raw.geometry,baseAcrylicThicknessMm:raw.geometry?.baseAcrylicThicknessMm??3,...(raw.method==='druck'?{baseAcrylicFinish:raw.geometry?.baseAcrylicFinish||'weiss-matt'}:{})}:raw.geometry)
 if(raw.material==='edelstahl'&&geometry.baseAcrylicThicknessMm!==undefined)throw Error('Bitte die Grundplatte und Materialstärke erneut auswählen.')
 if(plates.screwWarnings(geometry).length&&!plates.clearanceAccepted(geometry))throw Error('Bitte den Freiraum zwischen Bohrungen, Klingel und Plattenrand vergrößern.')
 const quantity=Number(raw.quantity);if(!Number.isSafeInteger(quantity)||quantity<1||quantity>100000)throw Error('Bitte eine Stückzahl von 1 bis 100000 angeben.')
 const marking=String(raw.marking||'').trim();if(marking.length>120)throw Error('Bitte höchstens 120 Zeichen für die Beschriftung eingeben.')
 const design=validateDesign(raw.design)
 if(!allowEmptyDesign&&raw.method!=='zuschnitt'&&!marking&&!design?.objects.length)throw Error('Bitte eine Beschriftung oder einen Hinweis zur Motivdatei eingeben.')
 const x=Number(raw.x),y=Number(raw.y),fontSize=Number(raw.fontSize)
 if(![x,y,fontSize].every(Number.isFinite)||x<0||x>100||y<0||y>100||fontSize<1||fontSize>50)throw Error('Bitte die Position und Schriftgröße prüfen.')
 const repeat=raw.repeat==='nummern'?'nummern':'gleich'
 return {purpose:raw.purpose==='gestaltung'?'gestaltung':'anfrage',version:3,design,material:raw.material,method:raw.method,geometry,quantity,marking,x,y,fontSize,repeat,template:typeof raw.template==='string'?raw.template.slice(0,120):'',note:raw.purpose==='gestaltung'?'Gestaltung zu einem vorab abgestimmten Vorhaben. Keine erneute Preisberechnung. Gravuru prüft die übermittelte Gestaltung.':'Anfrageentwurf. Machbarkeit und Gestaltung werden vor Fertigung geprüft.'}
}
export function configurationSummary(c:ReturnType<typeof validateConfiguration>){const g=c.geometry
 if(c.material==='sonder'){const x=c.custom;return [
  'Sonderanfertigung · vom Kunden selbst gestaltet',
  x.topic?`Bezug: ${x.topic}`:'',
  `Material: ${x.material}`,
  `Bearbeitung: ${x.processes.map((p:string)=>customProcesses[p]).join(', ')}`,
  `Materialbereitstellung: ${customSupply[x.supply]}`,
  x.object?`Gegenstand / Teil: ${x.object}`:'',
  `Gestaltungsfläche: ${({rect:'Rechteck',rounded:'Abgerundetes Rechteck',ellipse:'Oval / Kreis'} as Record<string,string>)[g.shape]}; ${g.widthMm} × ${g.heightMm} mm${g.shape==='rounded'?'; Eckenradius '+g.cornerRadiusMm+' mm':''}`,
  `Stückzahl: ${c.quantity}`,
  c.method!=='zuschnitt'?`Gestaltung: ${c.design?.objects.length||0} Elemente`:'Ohne Gestaltung (nur Zuschnitt / Bearbeitung)',
  x.details?`Beschreibung des Vorhabens:\n${x.details}`:'',
  c.note].filter(Boolean).join('\n')}
 ;return [`${c.purpose==='gestaltung'?'Gestaltung nach Absprache':'Konfigurator-Anfrage'}: ${c.material==='edelstahl'?'Edelstahl':'Acryl'}`,c.material==='acryl'||c.method==='druck'?`Acrylglasstärke: ${g.assembly?.acrylic?.thicknessMm||g.baseAcrylicThicknessMm||3} mm`:'',c.method==='druck'?`Druckausführung: ${(g.assembly?.acrylic?.color||g.baseAcrylicFinish)==='klar-hochglanz'?'Klares Acrylglas · hochglänzende Optik':'Weißes Acrylglas · matter Druck'}`:'',`Bearbeitung: ${c.method==='druck'?'Acrylglas bedrucken':c.method==='gravur'?'Zuschnitt mit Gravur':'Zuschnitt'}`,`Kontur: ${({rect:'Rechteck',rounded:'Abgerundetes Rechteck',ellipse:'Oval'} as Record<string,string>)[g.shape]}; ${g.widthMm} × ${g.heightMm} mm; Radius ${g.cornerRadiusMm} mm`,`${g.holeCount} Bohrungen Ø ${g.holeDiameterMm} mm, Randabstand zur Lochmitte ${g.edgeMm} mm`,g.holeOverrides?`Einzelpositionen: ${JSON.stringify(g.holeOverrides)}`:'',g.assembly?.acrylic?`Acrylebene: ${JSON.stringify(g.assembly.acrylic)}`:'',g.assembly?.bell?`Montage: ${g.assembly.acrylic?"auf Acrylplatte":"direkt auf "+(c.material==="edelstahl"?"Edelstahl":"Grundplatte")}; Funkklingel: ${plates.modelFor(g).name||"AOSU Pro · bisherige Vorlage"}; ${JSON.stringify(g.assembly.bell)}`:'',g.spacers?`Abstandshalter: ${g.spacers.count} Stück; Köpfe Ø 12 mm; Durchgangsbohrungen Ø 8 mm; Wandabstand ca. 10 mm; ${g.assembly?.acrylic?'durch beide Platten':'durch die Grundplatte'}`:'',`Stückzahl: ${c.quantity}`,c.method!=='zuschnitt'?`Gestaltung: ${c.design?.objects.length||0} Elemente; Beschriftung: ${c.marking}; Position ${c.x}% / ${c.y}%; Schriftgröße ${c.fontSize} mm; ${c.repeat==='nummern'?'fortlaufende Nummerierung nach Abstimmung':'gleiche Beschriftung'}`:'',c.template?`Vorlage: ${c.template}`:'',c.method==='druck'?'Hinweis zum Druckbild: Beim Druck können prozessbedingt leichte Streifenbildungen (Banding) auftreten. Die Farbdarstellung am Monitor kann je nach Bildschirm und Einstellungen vom tatsächlichen Druckergebnis abweichen. Auch Lichtquelle, Lichteinfall und Betrachtungswinkel beeinflussen die Farbwirkung des fertigen Produkts.':'',c.note].filter(Boolean).join('\n')}

export function printGeometry(raw:any,material:string){
 const g={...raw},a=g.assembly?.acrylic;
 if(material==='edelstahl'){
 const finish=g.baseAcrylicFinish||(['weiss-matt','klar-hochglanz'].includes(a?.color)?a.color:'weiss-matt'),thickness=g.baseAcrylicThicknessMm||a?.thicknessMm||3;
 delete g.baseAcrylicThicknessMm;delete g.baseAcrylicFinish;
 g.assembly={...(g.assembly||{reference:plates.bellReference.revision,bell:null}),acrylic:{...(a||plates.initialAcrylic(g)),color:finish,thicknessMm:thickness}};
 }else{g.baseAcrylicFinish=g.baseAcrylicFinish||(['weiss-matt','klar-hochglanz'].includes(a?.color)?a.color:'weiss-matt');g.baseAcrylicThicknessMm=g.baseAcrylicThicknessMm||a?.thicknessMm||3;if(g.assembly){g.assembly=g.assembly.bell?{...g.assembly,acrylic:null}:undefined;}}
 return g.spacers&&!raw.assembly?.acrylic&&g.assembly?.acrylic?plates.withSpacers(g,g.spacers.count):plates.validate(g)
}

function validateCustomConfiguration(raw:any,allowEmptyDesign:boolean){
 const custom=validateCustom(raw.custom),method=customMethod(custom.processes)
 const g=raw.geometry||{}
 if(!['rect','rounded','ellipse'].includes(g.shape))throw Error('Bitte eine Form für die Gestaltungsfläche wählen.')
 const geometry=plates.validate({shape:g.shape,widthMm:g.widthMm,heightMm:g.heightMm,cornerRadiusMm:g.shape==='rounded'?g.cornerRadiusMm:0,holeCount:0,holeDiameterMm:4,edgeMm:8})
 const quantity=Number(raw.quantity)
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>100000)throw Error('Bitte eine Stückzahl von 1 bis 100000 angeben.')
 const design=method==='zuschnitt'?undefined:validateDesign(raw.design)
 if(!allowEmptyDesign&&method!=='zuschnitt'&&!design?.objects.length&&!custom.details)throw Error('Bitte gestalten Sie die Fläche oder beschreiben Sie Ihren Wunsch unter „Ihr Vorhaben“.')
 return {purpose:raw.purpose==='gestaltung'?'gestaltung':'anfrage',version:3,design,material:'sonder',method,custom,geometry,quantity,marking:'',x:50,y:50,fontSize:10,repeat:raw.repeat==='nummern'?'nummern':'gleich',template:'',note:'Sonderanfertigung, vom Kunden selbst gestaltet. Material, Machbarkeit und Ausführung werden vor der Fertigung geprüft.'}
}
