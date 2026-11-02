import pilot from './workshop/steel-pilot.cjs'
import {plates} from './configuration'
export function exportConstruction(raw:any,layer:string){
 const geometry=plates.validate(raw);if(!['steel','acrylic','overview'].includes(layer))throw Error('Ungültige Ebene.');if(layer!=='steel'&&!geometry.assembly?.acrylic)throw Error('Keine Acrylebene vorhanden.')
 const product=plates.product(geometry,'web-export','Konstruktion');const engine:any={svgBody:()=>''};pilot.apply(engine,product)
 const svg=geometry.assembly?engine.productionLayerSvg(layer):engine.svg(false,true);const thickness=layer==='acrylic'?geometry.assembly.acrylic.thicknessMm:geometry.baseAcrylicThicknessMm||1.5;const material=layer==='acrylic'||geometry.baseAcrylicThicknessMm?'Acryl':'Edelstahl';return svg.replace(/(<svg[^>]*>)/,'$1'+`<metadata>Material: ${material}; Staerke: ${thickness} mm${geometry.baseAcrylicFinish?'; Druckausfuehrung: '+(geometry.baseAcrylicFinish==='weiss-matt'?'Weisses Acrylglas - matter Druck':'Klares Acrylglas - hochglaenzende Optik'):''}</metadata>`)
}
