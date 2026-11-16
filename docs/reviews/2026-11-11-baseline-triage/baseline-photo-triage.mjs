// Read-only triage. No product/config/test changes and no image transforms.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {acrylicPhotoResolution} from '../issue230-integration-candidate/app/workshop/acrylic-photo-resolution.mjs';
import {photoPlacement} from '../issue230-integration-candidate/app/configurator/variant-m/photo-position-model.mjs';
import {newPhotoBounds,fitUploadedPhoto} from '../issue230-integration-candidate/app/configurator/variant-m/photo-upload-geometry.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const plan=JSON.parse(fs.readFileSync(path.join(root,'../product-plans-run-v9/Tuerschild-Acrylglas-3mm_v4/plan.json'))),config=plan.products[0].document.config;
const summary=JSON.parse(fs.readFileSync(path.join(root,'../product-plans-run-v9/summary.json')));
const slots=config.profile.designs.flatMap(d=>d.objects.filter(o=>o.type==='photoSlot').map(o=>({designId:d.id,...o})));
const photo={uploadId:'synthetic',path:'synthetic.png',width:1200,height:600};
const cases=[
 ['plain square frame',{id:'photo',type:'photoSlot',w:50.8,h:50.8},photo],
 ['edited square in landscape frame',{id:'photo',type:'photoSlot',w:101.6,h:50.8},{...photo,edited:{path:'edited.png',width:200,height:200}}],
 ['plain large square frame',{id:'photo',type:'photoSlot',w:101.6,h:101.6},photo]
].map(([label,slot,media])=>({label,plain:acrylicPhotoResolution(slot,media,1),explicitCrop:acrylicPhotoResolution({...slot,uxPhotoCrop:{zoom:1,x:0,y:0,angle:0}},media,1),shapedMask:acrylicPhotoResolution({...slot,photoShape:'ellipse'},media,1)}));
const bounds={id:'synthetic-photo',type:'photoSlot',photoShape:'rect',...newPhotoBounds(120,80)};fitUploadedPhoto(bounds,photo);
const findings={schema:'gravuru/baseline-photo-triage/v1',mainPlanId:plan.id,mainPlanHash:plan.planHash,mainSource:summary.results[0].source,
 main:{schema:plan.products[0].document.schema,material:config.profile.material,photo:config.photo,logo:config.logo,moduleProfile:config.moduleProfile,hasLegacyAcrylicScene:!!config.acrylic,familyAcrylic:config.familyAcrylic,defaultDesignId:config.profile.defaultDesignId,designs:config.profile.designs.length,photoSlots:slots.length,plainPhotoSlots:slots.filter(o=>!o.uxPhotoCrop&&!o.photoMaskAssetId&&[undefined,'rect'].includes(o.photoShape)).length,defaultDesignPhotoSlots:slots.filter(o=>o.designId===config.profile.defaultDesignId).length,familyFormatsContainPhotoSlots:JSON.stringify(config.familyFormats).includes('photoSlot')},
 cases,newUpload120x80:{bounds,placement:photoPlacement(bounds,photo),measurement:acrylicPhotoResolution(bounds,photo,1)},otherProducts:summary.results.slice(1).map(p=>{const native=JSON.parse(fs.readFileSync(path.join(root,'../product-plans-run-v9',p.workbook.replace(/\.xlsx$/i,''),'plan.json'))).products[0].document.config;return {workbook:p.workbook,photoEnabled:native.photo.enabled,photoModule:native.moduleProfile.modules.photo};}),appChanges:false,testsChanged:false};
fs.writeFileSync(path.join(root,'baseline-photo-triage.json'),JSON.stringify(findings,null,2)+'\n');
console.log(JSON.stringify({main:findings.main,cases:cases.map(c=>({label:c.label,plainDpi:c.plain.effectiveDpi,plainCovered:c.plain.frameCovered,explicitCropDpi:c.explicitCrop.effectiveDpi,explicitCropCovered:c.explicitCrop.frameCovered})),newUpload120x80:findings.newUpload120x80}));
