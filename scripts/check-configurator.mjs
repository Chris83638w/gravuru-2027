import assert from 'node:assert/strict'
import {validateConfiguration,baseGeometry,configurationSummary,plates} from '../src/lib/configuration.ts'
const input={material:'edelstahl',method:'gravur',geometry:{...baseGeometry},quantity:25,marking:'BAUTEIL 001',x:50,y:50,fontSize:10,repeat:'gleich'}
assert.equal(validateConfiguration(input).quantity,25)
for(const patch of [{quantity:0},{quantity:1.5},{material:'unbekannt'},{marking:''},{x:Infinity},{geometry:{...baseGeometry,widthMm:0}},{geometry:{...baseGeometry,edgeMm:1,holeDiameterMm:10}},{geometry:{...baseGeometry,holeOverrides:[{x:30,y:30,locked:false},{x:30,y:30,locked:false},null,null]}}])assert.throws(()=>validateConfiguration({...input,...patch}))
const layered=validateConfiguration({...input,geometry:{...baseGeometry,assembly:{reference:plates.bellReference.revision,bell:null,acrylic:{x:25,y:25,width:250,height:150,shape:'rect',cornerRadiusMm:0,thicknessMm:3,color:'anthrazit'}}}})
assert.match(configurationSummary(layered),/Acrylebene/)
console.log('PASS: Maße, kollidierende Bohrungen, Stückzahl, Material, Beschriftung und Acrylebene geprüft.')
