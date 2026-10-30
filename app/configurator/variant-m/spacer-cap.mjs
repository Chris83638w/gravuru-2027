// Native 12 mm preview geometry. Visual reference: Christopher's attachment, 2026-09-27.
export const SPACER_FINISHES=[{id:'silver',label:'Silber',base:'#55595b',face:'#a6abad',shine:'#f2f4f5'},{id:'black',label:'Schwarz',base:'#101214',face:'#363a3d',shine:'#767d81'},{id:'rose-gold',label:'Roségold',base:'#81544b',face:'#c59082',shine:'#f9ddd1'},{id:'bronze',label:'Bronze',base:'#67442c',face:'#a78051',shine:'#e7c997'},{id:'white',label:'Weiß',base:'#b7b9b7',face:'#e6e7e3',shine:'#ffffff'}];
function blend(a,b,t){const rgb=v=>[1,3,5].map(i=>parseInt(v.slice(i,i+2),16));return '#'+rgb(a).map((v,i)=>Math.round(v+(rgb(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');}
export function spacerCap(finishId='silver'){
 const finish=SPACER_FINISHES.find(f=>f.id===finishId)||SPACER_FINISHES[0];let sectors='';const n=180,r=5.7;
 for(let i=0;i<n;i++){const a=i*2*Math.PI/n,b=(i+1.12)*2*Math.PI/n;
  const light=Math.max(0,Math.min(1,.5+.36*Math.cos(2*a-.7)+.1*Math.cos(6*a+1.2)+.04*Math.sin(i*17)));
  const color=light<.5?blend(finish.base,finish.face,light*2):blend(finish.face,finish.shine,(light-.5)*2);
  sectors+=`<path d="M0 0L${(r*Math.cos(a)).toFixed(4)} ${(r*Math.sin(a)).toFixed(4)}A${r} ${r} 0 0 1 ${(r*Math.cos(b)).toFixed(4)} ${(r*Math.sin(b)).toFixed(4)}Z" fill="${color}"/>`;
 }
 const rings=Array.from({length:27},(_,i)=>`<circle r="${(.4+i*.19).toFixed(2)}" fill="none" stroke="${i%2?finish.shine:finish.base}" stroke-width=".018" opacity=".15"/>`).join('');
 return `<circle cy=".55" r="6" fill="#000" opacity=".2"/><circle r="6" fill="${finish.base}"/><circle r="5.85" fill="${finish.face}"/>${sectors}${rings}<circle r="5.78" fill="none" stroke="${finish.shine}" stroke-width=".08" opacity=".55"/>`;
}


// Customer-confirmed head diameter: 3.6 mm. Preview only; drilling stays source-bound.
export function screwHead(diameterMm=3.6){
 const r=diameterMm/2;let face='';
 for(let i=0;i<100;i++){
  const a=i*Math.PI/50,b=(i+1.12)*Math.PI/50,light=.5+.33*Math.cos(a*2-.7)+.09*Math.cos(a*6);
  const color=light<.5?blend('#777d82','#c7cccf',light*2):blend('#c7cccf','#f8fafb',(light-.5)*2);
  face+='<path d="M0 0L'+(r*.91*Math.cos(a)).toFixed(4)+' '+(r*.91*Math.sin(a)).toFixed(4)+'A'+r*.91+' '+r*.91+' 0 0 1 '+(r*.91*Math.cos(b)).toFixed(4)+' '+(r*.91*Math.sin(b)).toFixed(4)+'Z" fill="'+color+'"/>';
 }
 const cross='M-.13 -.55L.13 -.55 .1 -.16 .16 -.1 .55 -.13 .55 .13 .16 .1 .1 .16 .13 .55 -.13 .55 -.1 .16 -.16 .1 -.55 .13 -.55 -.13 -.16 -.1 -.1 -.16Z';
 return '<g data-screw-head-mm="'+diameterMm+'"><circle cy="'+r*.06+'" r="'+r+'" fill="#000" opacity=".22"/><circle r="'+r+'" fill="#6c747a"/><circle r="'+r*.96+'" fill="#e9edef"/>'+face
  +'<circle r="'+r*.9+'" fill="none" stroke="#fff" stroke-width="'+r*.025+'" opacity=".45"/>'
  +'<g transform="scale('+r+') rotate(28)"><path d="'+cross+'" fill="#3a4147" stroke="#929ba1" stroke-width=".055" stroke-linejoin="round"/><path d="M-.08 -.45L-.06 -.08 -.45 -.06M.08 .45L.06 .08 .45 .06" fill="none" stroke="#151c22" stroke-width=".04"/><path d="M.1 -.43L.08 -.13 .43 -.1" fill="none" stroke="#f4f6f8" stroke-width=".025"/></g></g>';
}
