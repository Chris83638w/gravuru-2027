import {aiFail} from './ai-design-plan.mjs';
import {AI_CENTS_PER_USD,AI_RESERVE_CENTS} from './openai-design-provider.mjs';

export const AI_IMAGE_MODEL='gpt-image-1.5';
// Same conservative reservation and monthly ledger as native design jobs.
// Fixed n=1, medium quality, at most 1536x1024; no tools or automatic retries.
export const imageCost=(text,image,output)=>Math.ceil((text*5+image*8+output*32)*AI_CENTS_PER_USD/1e6);
export function imagePrompt(context){
 const prefix=context.kind==='photo_edit'
  ? 'Bearbeite nur dieses einzelne Musterfoto nach dem Auftrag. Erhalte Personen, Motiv und Bildaufbau soweit nicht ausdrücklich anders verlangt. Keine Beschriftung, Produktplatte oder Bedienhinweise hinzufügen. '
  : 'Erzeuge ein einzelnes freistehendes Motiv auf transparentem Hintergrund für eine Produktgestaltung. Keine Produktplatte, Szene, Beschriftung, Bedienhinweise, Schatten oder Leuchteffekte. Klare deckende Motivflächen; außerhalb des Motivs vollständig transparent. Das Motiv soll vollständig sichtbar sein. ';
 const prompt=prefix+context.instruction;
 if(Buffer.byteLength(prompt)>16384)throw aiFail(422,'ai_context_large','Der Bildauftrag ist zu lang.');
 return prompt;
}
export function createOpenAiImageProvider({apiKey,fetchImpl=fetch}){
 if(typeof apiKey!=='string'||apiKey.length<20||/[\s\x00-\x1f]/.test(apiKey))throw aiFail(503,'ai_key_invalid','Der geschützte OpenAI-Zugang ist nicht eingerichtet.');
 return async(context,{signal})=>{
  const editing=context.kind==='photo_edit';
  const fields={model:AI_IMAGE_MODEL,prompt:imagePrompt(context),n:1,size:context.size||'1024x1024',quality:'medium',output_format:'png',background:editing?'auto':'transparent',moderation:'auto'};
  if(!['1024x1024','1024x1536','1536x1024'].includes(fields.size))throw aiFail(422,'ai_image_size','Ungültige Bildgröße.');
  const headers={Authorization:'Bearer '+apiKey};let body;
  if(editing){
   if(!Buffer.isBuffer(context.image)||context.image.length>15*1024*1024)throw aiFail(422,'ai_image_missing','Das ausgewählte Musterfoto fehlt.');
   body=new FormData();for(const [key,value] of Object.entries(fields))body.set(key,String(value));
   body.set('input_fidelity','high');body.set('image[]',new Blob([context.image],{type:'image/png'}),'musterfoto.png');
  }else{headers['Content-Type']='application/json';body=JSON.stringify(fields);}
  let response;
  try{response=await fetchImpl('https://api.openai.com/v1/images/'+(editing?'edits':'generations'),{method:'POST',headers,body,redirect:'error',signal});}
  catch{throw aiFail(502,'ai_response_uncertain','Keine bestätigte Bildantwort. Kostenreserve bleibt erhalten.');}
  if(!response.ok)throw aiFail(502,'ai_provider_rejected','OpenAI hat den Bildauftrag nicht bestätigt. Bitte Modellzugriff und Auftrag prüfen.');
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>24*1024*1024){await reader.cancel();throw Error();}chunks.push(Buffer.from(r.value));}}
  catch{throw aiFail(502,'ai_response_uncertain','Die Bildantwort konnte nicht vollständig gelesen werden.');}
  let value;try{value=JSON.parse(Buffer.concat(chunks).toString());}catch{throw aiFail(502,'ai_response_uncertain','Ungültige Bildantwort.');}
  const u=value.usage,t=u?.input_tokens_details?.text_tokens,i=u?.input_tokens_details?.image_tokens,o=u?.output_tokens;
  // Use the higher image output tariff for all output tokens, including text.
  if(![t,i,o,u?.input_tokens,u?.total_tokens].every(n=>Number.isSafeInteger(n)&&n>=0)||t+i!==u.input_tokens||u.input_tokens+o!==u.total_tokens||t>20000||i>20000||o>10000||imageCost(t,i,o)>AI_RESERVE_CENTS)throw aiFail(502,'ai_usage_unconfirmed','Der Verbrauch des Bildauftrags muss geprüft werden.');
  const bytes=value.data?.length===1?value.data[0].b64_json:null;
  const valid=typeof bytes==='string'&&bytes.length<=20*1024*1024&&Buffer.from(bytes,'base64').toString('base64')===bytes;
  return {image:valid?bytes:null,chargedCents:imageCost(t,i,o),usage:{inputTokens:u.input_tokens,textTokens:t,imageTokens:i,outputTokens:o,model:AI_IMAGE_MODEL},model:AI_IMAGE_MODEL};
 };
}
