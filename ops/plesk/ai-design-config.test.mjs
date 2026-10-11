import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import test from 'node:test';import assert from 'node:assert/strict';
import {AI_IMAGE_MODEL} from '../../app/workshop/openai-image-provider.mjs';
import {readAiDesignConfig} from './ai-design-config.mjs';import {AI_MODEL} from '../../app/workshop/openai-design-provider.mjs';
test('OpenAI is off by default; private config enables only a fixed, budgeted, expiring setup',t=>{
 assert.deepEqual(readAiDesignConfig(),{config:null,provider:null});const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-ai-config-'));fs.chmodSync(dir,0o700);t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const key=path.join(dir,'key'),file=path.join(dir,'config.json');fs.writeFileSync(key,'synthetic-api-key-never-valid',{mode:0o600});const now=Date.parse('2026-10-11T12:00:00Z');
 const c={schema:1,purpose:'gravuru-openai-design',enabled:true,model:AI_MODEL,monthlyLimitCents:10000,pricingValidUntil:'2026-11-01T00:00:00Z',apiKeyFile:key};
 const write=v=>fs.writeFileSync(file,JSON.stringify(v),{mode:0o600});write(c);const valid=readAiDesignConfig(file,{now});assert.equal(valid.config.enabled,true);assert.equal(typeof valid.provider,'function');assert(!JSON.stringify(valid.config).includes('synthetic'));
 write({...c,imagesEnabled:true,imageModel:AI_IMAGE_MODEL});const images=readAiDesignConfig(file,{now});assert.equal(images.config.imagesEnabled,true);assert.equal(typeof images.imageProvider,'function');
 for(const change of [{imagesEnabled:true,imageModel:'unapproved'},{imagesEnabled:'yes',imageModel:AI_IMAGE_MODEL},{monthlyLimitCents:10001},{monthlyLimitCents:0},{model:'other'},{pricingValidUntil:'2027-01-01'},{pricingValidUntil:'2026-10-01'},{endpoint:'https://untrusted.example'}]){write({...c,...change});assert.equal(readAiDesignConfig(file,{now}).config.enabled,false);}
 write(c);fs.chmodSync(key,0o644);assert.equal(readAiDesignConfig(file,{now}).config.enabled,false);fs.chmodSync(key,0o600);fs.chmodSync(file,0o644);assert.equal(readAiDesignConfig(file,{now}).config.enabled,false);
});
