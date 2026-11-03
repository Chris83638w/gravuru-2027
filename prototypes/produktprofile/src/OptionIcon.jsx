import React from 'react';
import {mountingTileIcon} from '../../../app/configurator/variant-m/option-media.mjs';

// Interface illustrations for these local fixtures, never manufacturing geometry.
export function OptionIcon({group,value}){
 if(group==='mounting'){
  const count=/4/.test(value)?4:/2|Abstandshalter/.test(value)?2:0;
  const holes=count===4?[{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}]:count===2?[{x:0,y:0},{x:1,y:0}]:[];
  const id=value==='Silikon'?'SIL':value==='Selbstklebend'?'KGL':'OHNE';
  return <span className="option-icon" dangerouslySetInnerHTML={{__html:mountingTileIcon({id,holes,spacers:value==='Abstandshalter',mountingRule:{accessory:/Schrauben/.test(value)?'screws':undefined}})}}/>;
 }
 // Same neutral colour swatch as doorbellChoicePreview; no editor runtime import.
 if(group==='color')return <svg className="option-icon" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="21" fill={value==='Anthrazit'?'#3b4046':'#151719'}/><path d="M8 14A17 17 0 0 1 34 10" fill="none" stroke="#fff" strokeOpacity=".22"/></svg>;
 return <svg className="option-icon" viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
  {group==='position'?<><rect x="7" y="5" width="50" height="38" rx="3" fill="#e6e9ec"/><rect x={value==='Links'?12:41} y="10" width="11" height="28" rx="2" fill="#343c44"/><circle cx={value==='Links'?17.5:46.5} cy="17" r="2.5" fill="#99a3ad"/><path d={value==='Links'?'M29 20h20M29 26h15':'M15 20h20M15 26h15'}/></>:
  group==='frame'?<><rect x="7" y="5" width="50" height="38" rx="2" fill="#c7cdd2"/><rect x={value==='Rundum'?12:7} y={value==='Rundum'?10:5} width={value==='Rundum'?40:50} height={value==='Rundum'?28:38} fill="#333a42"/></>:
  group==='stand'?<path d="m9 35 31-17 15 13-32 12Z M40 18v17M9 35v-5" fill={value==='Schwarz'?'#30353a':value==='Klar'?'#eef2f5':'none'}/>:
  <><rect x="24" y="15" width="16" height="27" rx="3"/><path d="M28 15V7h8v8M28 7h13"/><path d="M24 24h16"/></>}
  {/Ohne/.test(value)&&<path d="m12 40 40-32" strokeWidth="2"/>}
 </svg>;
}
