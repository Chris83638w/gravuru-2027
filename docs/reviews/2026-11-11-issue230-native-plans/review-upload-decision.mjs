import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [runArg,codeArg,outArg]=process.argv.slice(2);if(!runArg||!codeArg||!outArg)throw Error('RUN CODE OUT required');
const code=path.resolve(codeArg),run=path.resolve(runArg),imp=p=>import(pathToFileURL(path.join(code,p)).href);
const {vectorLogoAllowed,prepareConfig,saveDraft,readDraft}=await imp('app/configurator/variant-m/contract.mjs');
const {nativeModuleAvailability}=await imp('app/configurator/variant-m/module-profile.mjs');
const {uploadAllowed,photoAvailableForDesign}=await imp('app/configurator/variant-m/ux-model.mjs');
const {decisionHelp}=await imp('app/configurator/variant-m/decision-help.mjs');
const {familyFormatSelection}=await imp('app/configurator/variant-m/family-formats.mjs');
const summary=JSON.parse(fs.readFileSync(path.join(run,'summary.json'))),rows=[];
for(const pair of summary.results){
 const plan=JSON.parse(fs.readFileSync(path.join(run,pair.workbook.replace(/\.xlsx$/,''),'plan.json'))),original=plan.products[0].document.config,before=JSON.stringify(original),c=prepareConfig(original),main=pair.workbook==='Tuerschild-Acrylglas-3mm_v4.xlsx',native=nativeModuleAvailability(c);
 const checks={exactModuleDecision:c.moduleProfile.modules.photo===main&&c.moduleProfile.modules.logo===main,configUploads:c.photo.enabled===main&&c.logo.enabled===main,vectorLogoAllowed:vectorLogoAllowed(c)===main,photoCapability:native.photo===main,uiPhoto:uploadAllowed(c,'photo')===main,uiLogo:uploadAllowed(c,'logo')===main,defaultPhoto:photoAvailableForDesign(c,c.profile.defaultDesignId)===main,pricePhoto:!main||c.photo.includedCount===0&&c.photo.extraPriceCents===999,priceSvg:!main||c.logo.vectorUpload===true&&c.logo.extraPriceCents===1299,uploadDecisionNotOpen:!pair.openQuestions.some(q=>q.startsWith('Offene Module')||q.includes('Foto/Logo')&&!q.includes('ausdrücklich bestätigt')),inputUnchanged:before===JSON.stringify(original)};
 rows.push({workbook:pair.workbook,planId:plan.id,checks,allPassed:Object.values(checks).every(Boolean),help:main?decisionHelp('photo',c):null,capabilities:native});
}
const files=['contract.mjs','module-profile.mjs','ux-model.mjs','ux.mjs','decision-help.mjs','logo-upload.mjs'].map(name=>{const p='app/configurator/variant-m/'+name;return {path:p,sha256:createHash('sha256').update(fs.readFileSync(path.join(code,p))).digest('hex')};});
const output={schema:'issue230-independent-upload-decision/v1',readOnly:true,rows,allPassed:rows.every(x=>x.allPassed),codeFiles:files,limit:'Checks the specified native persisted configurations and actual contract/UI model functions; no browser, checkout, deployment or production acceptance inferred.'};fs.writeFileSync(outArg,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));if(!output.allPassed)process.exitCode=1;
