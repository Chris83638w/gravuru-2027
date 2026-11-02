import assert from 'node:assert/strict';
import {plates,baseGeometry} from '../src/lib/configuration.ts';
const model=plates.bellModels.find(m=>m.id==='ring-pro2-5at2s2-16x28');const geometry={...baseGeometry,assembly:{reference:model.revision,modelId:model.id,acrylic:null,bell:{x:127,y:44.75}}};
const origin='http://127.0.0.1:3087';
for(const [layer,status] of [['steel',200],['acrylic',400],['overview',400]]){
 const response=await fetch(origin+'/werkstatt-api/preview-export',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({geometry,layer,format:'svg'})});assert.equal(response.status,status,await response.clone().text());if(status===200){const svg=await response.text();for(const d of model.cutPaths)assert.ok(svg.includes(d));assert.ok(svg.includes('width="300mm"'));assert.ok(!svg.includes('<image'));}
}
console.log('PASS: Direct-on-steel API export contains exact model cutouts; absent acrylic exports rejected.');
