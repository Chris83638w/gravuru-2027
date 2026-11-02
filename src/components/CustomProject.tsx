'use client'
import {useEffect,useState} from 'react'
import {customMaterials,customProcesses,customSupply,plates} from '@/lib/configuration'

type Custom={material:string;processes:string[];supply:string;object:string;topic:string;details:string}
const shapes:[string,string][]=[['rect','Rechteck'],['rounded','Abgerundet'],['ellipse','Oval / Kreis']]

// Zahlenfeld: während des Tippens nur Entwurf, Übernahme bei Enter oder Verlassen (Vorgabe Issue 135).
function MmField({label,value,onCommit}:{label:string;value:number;onCommit:(v:number)=>void}){
 const [draft,setDraft]=useState(String(value))
 useEffect(()=>{setDraft(String(value))},[value])
 const commit=()=>{const n=Number(draft.replace(',','.'));if(Number.isFinite(n)&&n>0&&n!==value)onCommit(Math.round(n*10)/10);else setDraft(String(value))}
 return <label>{label}<input inputMode="decimal" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit()}if(e.key==='Escape')setDraft(String(value))}}/></label>
}

export function SurfacePreview({geometry}:{geometry:any}){
 const w=geometry.widthMm,h=geometry.heightMm,pad=Math.max(w,h)*.12,r=geometry.shape==='rounded'?geometry.cornerRadiusMm:0
 const shape=geometry.shape==='ellipse'?<ellipse cx={w/2} cy={h/2} rx={w/2} ry={h/2}/>:<rect width={w} height={h} rx={r}/>
 const fs=Math.max(w,h)*.045
 return <svg viewBox={`${-pad} ${-pad} ${w+pad*2} ${h+pad*2}`} role="img" aria-label={`Gestaltungsfläche ${w} × ${h} mm`}>
  <g fill="#fff" stroke="#15211c" strokeWidth={Math.max(w,h)*.006}>{shape}</g>
  <g stroke="#1f6b50" strokeWidth={Math.max(w,h)*.004} fill="none"><path d={`M0 ${h+pad*.45}H${w}M0 ${h+pad*.3}v${pad*.3}M${w} ${h+pad*.3}v${pad*.3}`}/><path d={`M${w+pad*.45} 0V${h}M${w+pad*.3} 0h${pad*.3}M${w+pad*.3} ${h}h${pad*.3}`}/></g>
  <g fill="#1f6b50" fontFamily="Manrope, system-ui, sans-serif" fontWeight="700" fontSize={fs} textAnchor="middle"><text x={w/2} y={h+pad*.45+fs*1.2}>{w} mm</text><text transform={`translate(${w+pad*.45+fs*1.2} ${h/2}) rotate(90)`}>{h} mm</text></g>
 </svg>
}

export default function CustomProject({value,geometry,onChange,onGeometry}:{value:Custom;geometry:any;onChange:(v:Custom)=>void;onGeometry:(g:any)=>void}){
 const [error,setError]=useState('')
 const known=customMaterials.includes(value.material)||value.material==='Noch unsicher'
 const [other,setOther]=useState(known?'':value.material)
 const set=(patch:Partial<Custom>)=>onChange({...value,...patch})
 function geo(patch:any){
  const next={...geometry,...patch};if(next.shape!=='rounded')next.cornerRadiusMm=0;else if(!next.cornerRadiusMm)next.cornerRadiusMm=Math.min(10,Math.min(next.widthMm,next.heightMm)/2)
  try{plates.validate({...next,holeCount:0});setError('');onGeometry(next)}catch(e){setError((e as Error).message)}
 }
 function toggleProcess(key:string){const has=value.processes.includes(key);const next=has?value.processes.filter(p=>p!==key):[...value.processes,key];set({processes:next})}
 return <div className="custom-step">
  <aside className="custom-preview" aria-label="Vorschau der Gestaltungsfläche">
   <div className="custom-preview-stage"><SurfacePreview geometry={geometry}/></div>
   <p><strong>{value.object||'Ihre Sonderanfertigung'}</strong> · {value.material||'Material offen'} · {value.processes.map(p=>customProcesses[p]).join(', ')||'Bearbeitung offen'}</p>
   <p>Im nächsten Schritt gestalten Sie diese Fläche mit Texten, Motiven, Fotos oder Ihrem Logo. Gravuru prüft Material und Machbarkeit und meldet sich mit einem Angebot.</p>
  </aside>
  <div className="custom-form">
   <div><p className="workspace-eyebrow">Sonderanfertigung</p><h2>Beschreiben Sie Ihr Vorhaben.</h2><p>Was Sie nicht wissen, lassen Sie einfach offen – wir klären es mit Ihnen.</p></div>
   <label><span className="label-row">Was soll entstehen? <em>(optional)</em></span><input value={value.object} maxLength={160} onChange={e=>set({object:e.target.value})} placeholder="z. B. Lederlabel, Glasplatte, Werkzeugmarke, Aufsteller"/></label>
   <fieldset className="custom-group"><legend>Material</legend><div className="chips">
    {[...customMaterials,'Noch unsicher'].map(m=><label className="chip" key={m}><input type="radio" name="custom-material" checked={value.material===m} onChange={()=>{setOther('');set({material:m})}}/><span>{m}</span></label>)}
    <label className="chip"><input type="radio" name="custom-material" checked={!known&&value.material!==''} onChange={()=>set({material:other||'Anderes Material'})}/><span>Anderes</span></label>
   </div>{!known&&value.material!==''&&<label className="custom-other">Welches Material?<input value={other} maxLength={120} autoFocus onChange={e=>{setOther(e.target.value);set({material:e.target.value||'Anderes Material'})}} placeholder="z. B. eloxiertes Aluminium"/></label>}</fieldset>
   <fieldset className="custom-group"><legend>Bearbeitung <span>(mehrere möglich)</span></legend><div className="chips">{Object.entries(customProcesses).map(([k,l])=><label className="chip" key={k}><input type="checkbox" checked={value.processes.includes(k)} onChange={()=>toggleProcess(k)}/><span>{l}</span></label>)}</div>{!value.processes.length&&<p className="custom-hint" role="alert">Bitte mindestens eine Bearbeitung wählen.</p>}</fieldset>
   <fieldset className="custom-group"><legend>Material wird …</legend><div className="chips">{Object.entries(customSupply).map(([k,l])=><label className="chip" key={k}><input type="radio" name="custom-supply" checked={value.supply===k} onChange={()=>set({supply:k})}/><span>{k==='offen'?'Noch offen':k==='gravuru'?'von Gravuru gestellt':'von mir mitgebracht'}</span></label>)}</div></fieldset>
   <fieldset className="custom-group"><legend>Gestaltungsfläche</legend><div className="chips">{shapes.map(([k,l])=><label className="chip" key={k}><input type="radio" name="custom-shape" checked={geometry.shape===k} onChange={()=>geo({shape:k})}/><span>{l}</span></label>)}</div>
    <div className="custom-fields" style={{marginTop:12}}><MmField label="Breite (mm)" value={geometry.widthMm} onCommit={v=>geo({widthMm:v})}/><MmField label="Höhe (mm)" value={geometry.heightMm} onCommit={v=>geo({heightMm:v})}/>{geometry.shape==='rounded'&&<MmField label="Eckenradius (mm)" value={geometry.cornerRadiusMm} onCommit={v=>geo({cornerRadiusMm:v})}/>}</div>
    {error?<p className="custom-hint error" role="alert">{error}</p>:<p className="custom-hint">Fläche für Ihre Gestaltung: 20 bis 600 mm. Größere Teile oder eine eigene Kontur? Beschreiben Sie es unten und hängen Sie im letzten Schritt eine Skizze oder Datei an.</p>}
   </fieldset>
   <label><span className="label-row">Ihr Vorhaben <em>(optional)</em></span><textarea value={value.details} maxLength={2000} onChange={e=>set({details:e.target.value})} placeholder="z. B. Gravur auf der Rückseite, gewünschte Stärke, Einsatzort, Termin oder besondere Wünsche"/></label>
  </div>
 </div>
}
