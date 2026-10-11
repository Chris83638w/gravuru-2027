import fs from 'node:fs';
import path from 'node:path';
import {externalPath} from './config.mjs';
import {readPrivateFile} from './shopify-preflight.mjs';
import {createOpenAiDesignProvider,AI_MODEL,AI_MONTHLY_CENTS,AI_RESERVE_CENTS} from '../../app/workshop/openai-design-provider.mjs';
export function readAiDesignConfig(file,{now=Date.now()}={}){
 if(!file)return {config:null,provider:null};
 try{
  externalPath(file,'KI-Konfiguration');const parent=fs.lstatSync(path.dirname(file));if(!parent.isDirectory()||parent.mode&0o077||parent.uid!==process.getuid())throw Error();
  const c=JSON.parse(readPrivateFile(file,8192));
  const allowed=['schema','purpose','enabled','model','monthlyLimitCents','pricingValidUntil','apiKeyFile'];
  if(Object.keys(c).some(k=>!allowed.includes(k))||c.schema!==1||c.purpose!=='gravuru-openai-design'||typeof c.enabled!=='boolean')throw Error();
  if(!c.enabled)return {config:{enabled:false,disabledReason:'KI-Gestaltung ist noch nicht aktiviert.'},provider:null};
  const valid=Date.parse(c.pricingValidUntil);
  if(c.model!==AI_MODEL||!Number.isSafeInteger(c.monthlyLimitCents)||c.monthlyLimitCents<AI_RESERVE_CENTS||c.monthlyLimitCents>AI_MONTHLY_CENTS||!Number.isFinite(valid)||valid<=now||valid>now+31*86400000)throw Error();
  externalPath(c.apiKeyFile,'OpenAI-Schlüssel');const keyParent=fs.lstatSync(path.dirname(c.apiKeyFile));if(!keyParent.isDirectory()||keyParent.mode&0o077||keyParent.uid!==process.getuid())throw Error();
  const apiKey=readPrivateFile(c.apiKeyFile,4096).trim();
  return {config:{enabled:true,model:AI_MODEL,monthlyLimitCents:c.monthlyLimitCents,pricingValidUntil:c.pricingValidUntil},provider:createOpenAiDesignProvider({apiKey})};
 }catch{return {config:{enabled:false,disabledReason:'Der geschützte OpenAI-Zugang oder die befristete Kostenfreigabe muss geprüft werden.'},provider:null};}
}
