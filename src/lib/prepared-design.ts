import {mkdir,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {randomBytes} from 'node:crypto'
import {makeDesignLink,readDesignLink} from './design-link.ts'
import {validateConfiguration} from './configuration.ts'

const folder=()=>path.resolve('data/design-links')
export async function storePreparedDesign(data:{reference:string;name?:string;email?:string;configuration:unknown}){
 const configuration=validateConfiguration(data.configuration,{allowEmptyDesign:true})
 const preparedId=randomBytes(32).toString('hex'),expires=Date.now()+90*86400000
 await mkdir(folder(),{recursive:true,mode:0o700})
 await writeFile(path.join(folder(),preparedId+'.json'),JSON.stringify({version:1,expires,...data,configuration}),{flag:'wx',mode:0o600})
 return makeDesignLink({reference:data.reference,preparedId,purpose:configuration.purpose})
}
export async function readPreparedDesign(token:string){
 const link=readDesignLink(token)
 if(!link.preparedId)return link // Existing geometry-only links remain valid.
 try{
  if(!/^[a-f0-9]{64}$/.test(link.preparedId))throw Error()
  const record=JSON.parse(await readFile(path.join(folder(),link.preparedId+'.json'),'utf8'))
  if(record.version!==1||record.reference!==link.reference||!Number.isFinite(record.expires)||record.expires<Date.now())throw Error()
  const configuration=validateConfiguration(record.configuration,{allowEmptyDesign:true})
  if(configuration.purpose!==link.purpose)throw Error()
  return {...link,configuration}
 }catch{throw Error('Bitte einen neuen persönlichen Gestaltungslink bei Gravuru anfordern.')}
}

export async function readPreparedDesignForSubmission(token:string,purpose:string){
 const link=await readPreparedDesign(token)
 if(purpose!==(link.purpose||'gestaltung'))throw Error('Bitte den Gestaltungslink prüfen.')
 return link
}
