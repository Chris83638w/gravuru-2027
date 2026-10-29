// A real-browser smoke check: edit the name, remove the portrait, undo removal.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(process.env.GRAVURU_NODE_MODULES?path.join(process.env.GRAVURU_NODE_MODULES,'package.json'):import.meta.url),{chromium}=require('playwright');
const arg=n=>process.argv.find(a=>a.startsWith('--'+n+'='))?.split('=').slice(1).join('=');
const out=path.resolve(arg('out')||'../rasse-interaction');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.GRAVURU_BROWSER?{executablePath:process.env.GRAVURU_BROWSER}:{})});
const checks=[];
try{
 for(const id of ['TO-V2A-12x8-D1001','TRE-V2A-12x8-D1061']){
  const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((arg('url')||'http://127.0.0.1:4317')+'/?configuration='+id);
  const frame=page.frameLocator('iframe'),element=frame.locator('gravuru-configurator');
  await frame.locator('svg.scene:visible').first().waitFor({state:'visible'});
  await frame.locator('[data-ux-tab="text"]').click();
  await frame.locator('[data-ux-text="text-2"]').fill('Maja');
  await frame.locator('[data-ux-text="text-2"]').blur();
  assert.equal(await element.evaluate(el=>el.state.objects.find(o=>o.id==='text-2').text),'Maja');
  await frame.locator('[data-ux="contents"]').click();
  await frame.locator('[data-ux="remove-content"][data-id="motiv-1"]').click();
  assert.equal(await element.evaluate(el=>el.state.objects.some(o=>o.id==='motiv-1')),false);
  await page.screenshot({path:path.join(out,id+'-portrait-entfernt.png')});
  await page.keyboard.press('Escape');
  await frame.locator('[data-ux="undo"]:visible').first().click();
  assert.equal(await element.evaluate(el=>el.state.objects.some(o=>o.id==='motiv-1')),true);
  assert.equal(await element.evaluate(el=>el.state.objects.find(o=>o.id==='text-2').text),'Maja');
  const rights=await element.evaluate(el=>{const o=el.state.objects.find(o=>o.id==='motiv-1');return {replace:el.uxCanEdit(o,'replace'),delete:el.uxCanEdit(o,'delete')};});
  assert.deepEqual(rights,{replace:true,delete:true});assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(out,id+'-name-geaendert.png')});
  checks.push({id,nameEdit:true,portraitDeletion:true,undoRestoresPortrait:true,replacementRight: rights.replace,browserErrors:errors});
  await page.close();
 }
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'interaction.json'),JSON.stringify(checks,null,2));console.log(JSON.stringify(checks));
