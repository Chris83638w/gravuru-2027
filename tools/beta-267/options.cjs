// Compare the projected physical profile to the unchanged selector after every
// merchant-supported option change and the return to the original Ring design.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME267?{executablePath:process.env.CHROME267}:{})});
  try {
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:18267/?produkt=ring');
    await page.frameLocator('iframe').locator('[data-demo-section=options]:visible').click();
    const frame=page.frames().find(f=>f!==page.mainFrame());
    const tested=await frame.evaluate(async()=>{
      const el=document.querySelector('gravuru-configurator'),root=el.shadowRoot;
      const {selectedProfile}=await import('/configurator/variant-m/contract.mjs');
      const names=['format','position','frame','mounting','color'];
      const digest=p=>JSON.stringify([p.geometry,p.frames,p.mounting,p.designs,p.material,p.doorbellSelection]);
      const first=digest(el.uxSelectedProfile()),count={};
      const original=JSON.stringify(window.parent.UniversalConfig);
      for(const key of names){
        const control=root.querySelector('select[data-m-option="'+key+'"],select[data-m-field="'+key+'"]');
        if(!control)throw Error('Ausführungswahl fehlt: '+key);
        const choices=[...control.options].map(option=>option.value).filter(Boolean);
        const initial=el.state.mOptions[key];
        for(const value of [...choices.filter(v=>v!==initial),initial]){
          control.value=value;
          control.dispatchEvent(new Event('change',{bubbles:true}));
          const selected=el.uxSelectedProfile();
          if(el.state.mOptions[key]!==value || digest(selected)!==digest(selectedProfile(window.parent.UniversalConfig,el.state.mOptions)))throw Error('Abweichendes Profil: '+key);
        }
        count[key]=choices.length;
      }
      if(digest(el.uxSelectedProfile())!==first || original!==JSON.stringify(window.parent.UniversalConfig))throw Error('Originalprofil wurde verändert.');
      return count;
    });
    assert.ok(Object.values(tested).every(n=>n>1));
    console.log(JSON.stringify(tested));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
