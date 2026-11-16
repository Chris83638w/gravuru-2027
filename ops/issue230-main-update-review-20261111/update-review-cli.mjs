// File preparation/verification only. Deliberately no execute/live command.
import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {prepareUpdateReview,verifyUpdateReview,makeApprovalEvidence,verifyApprovalEvidence,writeNewJson,sha256} from './update-review.mjs';
const argv=process.argv.slice(2),mode=argv[0]?.startsWith('--')?'prepare':argv.shift()||'prepare';
if(!['prepare','verify','approval-evidence'].includes(mode))throw Error('Only prepare, verify and approval-evidence are supported; no execution CLI.');
const args={};for(let i=0;i<argv.length;i+=2){if(!argv[i]?.startsWith('--')||!argv[i+1]||Object.hasOwn(args,argv[i]))throw Error('Unique named paths required.');args[argv[i]]=argv[i+1];}
const required=mode==='prepare'?['--target','--observation','--origin','--output']:mode==='approval-evidence'?['--target','--review','--decision','--excel','--output']:['--target','--review'];
const allowed=mode==='verify'?[...required,'--approval','--excel']:required;
if(required.some(k=>!args[k])||Object.keys(args).some(k=>!allowed.includes(k)))throw Error('Required paths: '+required.join(' '));
const json=(key,large=false)=>{const f=args[key],s=fs.statSync(f);if(!s.isFile()||s.size>(large?80:2)*1024*1024)throw Error('Unexpected input file size.');const b=fs.readFileSync(f);return JSON.parse(f.endsWith('.gz')?gunzipSync(b):b);};
const target=json('--target',true);
if(mode==='prepare'){const review=prepareUpdateReview({target,observation:json('--observation'),origin:json('--origin')});console.log(JSON.stringify({prepared:true,reviewHash:review.reviewHash,output:args['--output'],...writeNewJson(args['--output'],review),executed:false}));}
if(mode==='approval-evidence'){
 const review=json('--review'),decision=json('--decision'),excel=fs.readFileSync(args['--excel']);
 const approval=makeApprovalEvidence({review,acceptedReviewHash:decision.acceptedReviewHash,excelAddendum:{file:args['--excel'].replaceAll('\\','/').split('/').at(-1),sha256:sha256(excel)},decision:decision.decision},target);
 console.log(JSON.stringify({recordedOnly:true,approvalHash:approval.approvalHash,reviewHash:approval.reviewHash,...writeNewJson(args['--output'],approval),executed:false}));
}
if(mode==='verify'){
 const review=json('--review');verifyUpdateReview(review,target);
 if(!!args['--approval']!==!!args['--excel'])throw Error('Approval verification requires both --approval and --excel.');
 if(args['--approval'])verifyApprovalEvidence(json('--approval'),review,target,fs.readFileSync(args['--excel']));
 console.log(JSON.stringify({verified:true,reviewHash:review.reviewHash,approvalVerified:!!args['--approval'],executed:false}));
}
